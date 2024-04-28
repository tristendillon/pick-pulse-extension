/* eslint-disable no-proto */
/* eslint-disable accessor-pairs */
/* eslint-disable no-global-assign */

const urlParams = new URLSearchParams(window.location.search);
const today = new Date();
const leagueId = urlParams.get('leagueId');

const BASE_URL = "https://pick-pulse.vercel.app"
const BASE_API_URL = `${BASE_URL}/api`


HitDraftInit();

var lockQueue = false;
const pickQueue = [];
var draftId = GetDraftId();

async function GetDraftId() {
  const response = await fetch(`${BASE_API_URL}/drafts?season=${today.getFullYear()}&leagueId=${leagueId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    console.log(await response.json());
    return;
  }

  const draft = await response.json();
  return draft.id;
}

async function CreatePick(data) {
  if (lockQueue) {
    console.log("Queue is locked, adding pick to queue");
    pickQueue.push(data);
    return;
  }

  const response = await fetch(`${BASE_API_URL}/picks/next`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      espnTeamId: Number(data.espnTeamId),
      playerId: Number(data.playerId),
      draftId: draftId,
      isKeeper: false,
    })
  })

  if (!response.ok) {
    console.log("Failed to create pick");
    return;
  }
  const pick = await response.json();
  console.log("Pick created successfully!", pick);
}

async function pushQueue() {
  while (pickQueue.length > 0) {
    const pick = pickQueue.shift();
    await CreatePick(pick);
  }
}

function InjectOpenButton() {
  const button = document.createElement("button");
  button.innerHTML = "Open Draft";
  button.onclick = function () {
    window.open(`${BASE_URL}/draftboard/${draftId}`, '_blank')
  }

  button.style = `

  `;

  document.querySelector(".icon-group").appendChild(button);
}

async function HitDraftInit() {
  const response = await fetch(`https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2024/segments/0/leagues/${leagueId}?filter=%7B%22players%22%3A%7B%22filterStatsForContainerIds%22%3A%7B%22value%22%3A%5B%22002023%22%2C%22102024%22%5D%7D%7D%7D&view=draftInit&view=mSettings`, {
    method: 'GET',
  });

  if (!response.ok) {
    console.log(await response.json());
    return;
  }

  const draftInit = await response.json();

  // const players = draftInit.players.map(player => {

  const teams = draftInit.teams.map(team => {
    return {
      name: team.name,
      logo: team.logo,
      espnTeamNumber: team.id,
    }
  });
  const lineupSlots = draftInit.settings.rosterSettings.lineupSlotCounts;
  const timePerSelection = draftInit.settings.draftSettings.timePerSelection;
  const pickOrder = draftInit.settings.draftSettings.pickOrder;
  const draftType = draftInit.settings.draftSettings.type.toLowerCase();
  const season = draftInit.seasonId;
  const id = draftInit.id;
  const name = draftInit.settings.name

  await CreateLeague({
    id: id,
    name: name,
    draft: {
      season: season,
      draftSettings: {
        pickOrder: pickOrder,
        draftType: draftType,
        timePerSelection: timePerSelection,
        lineupSlots: lineupSlots
      },
      teams: teams
    }
  })
}

async function CreateLeague(data) {
  const leagueResponse = await fetch(`${BASE_API_URL}/leagues?id=${data.id}`, {
    method: 'GET',
  });

  if (leagueResponse.ok) {
    const league = await leagueResponse.json();
    draftId = league.drafts[0].id;
    return
  };

  const response = await fetch(`${BASE_API_URL}/leagues/frominit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...data
    })
  })

  if (!response.ok) {
    console.log(await response.json());
  }

  const draft = await response.json();
  draftId = draft.id;
  window.open(`${BASE_URL}/draftboard/${draft.id}`, '_blank')
  return draft;
}

async function LoadPickHistory(data) {
  const response = await fetch(`${BASE_API_URL}/drafts/pickhistory`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...data
    })
  })

  if (!response.ok) {
    console.log(await response.json());
    alert("Failed to load pick history, please refresh the page and try again.")
    lockQueue = false;
    return;
  }
  console.log("Pick history successfully loaded!");
  lockQueue = false;
  pushQueue();
}

var wsHook = {};
(function () {
  function MutableMessageEvent (o) {
    this.bubbles = o.bubbles || false
    this.cancelBubble = o.cancelBubble || false
    this.cancelable = o.cancelable || false
    this.currentTarget = o.currentTarget || null
    this.data = o.data || null
    this.defaultPrevented = o.defaultPrevented || false
    this.eventPhase = o.eventPhase || 0
    this.lastEventId = o.lastEventId || ''
    this.origin = o.origin || ''
    this.path = o.path || new Array(0)
    this.ports = o.parts || new Array(0)
    this.returnValue = o.returnValue || true
    this.source = o.source || null
    this.srcElement = o.srcElement || null
    this.target = o.target || null
    this.timeStamp = o.timeStamp || null
    this.type = o.type || 'message'
    this.__proto__ = o.__proto__ || MessageEvent.__proto__
  }

  var before = wsHook.before = function (data, url, wsObject) {
    return data
  }
  var after = wsHook.after = function (e, url, wsObject) {
    return e
  }
  var modifyUrl = wsHook.modifyUrl = function(url) {
    return url
  }
  wsHook.resetHooks = function () {
    wsHook.before = before
    wsHook.after = after
    wsHook.modifyUrl = modifyUrl
  }

  var _WS = WebSocket
  WebSocket = function (url, protocols) {
    var WSObject
    url = wsHook.modifyUrl(url) || url
    this.url = url
    this.protocols = protocols
    if (!this.protocols) { WSObject = new _WS(url) } else { WSObject = new _WS(url, protocols) }

    var _send = WSObject.send
    WSObject.send = function (data) {
      arguments[0] = wsHook.before(data, WSObject.url, WSObject) || data
      _send.apply(this, arguments)
    }

    // Events needs to be proxied and bubbled down.
    WSObject._addEventListener = WSObject.addEventListener
    WSObject.addEventListener = function () {
      var eventThis = this
      if (arguments[0] === 'message') {
        arguments[1] = (function (userFunc) {
          return function instrumentAddEventListener () {
            arguments[0] = wsHook.after(new MutableMessageEvent(arguments[0]), WSObject.url, WSObject)
            if (arguments[0] === null) return
            userFunc.apply(eventThis, arguments)
          }
        })(arguments[1])
      }
      return WSObject._addEventListener.apply(this, arguments)
    }

    Object.defineProperty(WSObject, 'onmessage', {
      'set': function () {
        var eventThis = this
        var userFunc = arguments[0]
        var onMessageHandler = function () {
          arguments[0] = wsHook.after(new MutableMessageEvent(arguments[0]), WSObject.url, WSObject)
          if (arguments[0] === null) return
          userFunc.apply(eventThis, arguments)
        }
        WSObject._addEventListener.apply(this, ['message', onMessageHandler, false])
      }
    })

    return WSObject
  }
})()


wsHook.before = function(data, url, wsObject) {
  // console.log("Sending message to " + url + " : " + data);
  ReadHookMessage(data);
}

// Make sure your program calls `wsClient.onmessage` event handler somewhere.
wsHook.after = function(messageEvent, url, wsObject) {
  // console.log("Received message from " + url + " : " + messageEvent.data);
  ReadHookMessage(messageEvent.data);
  return messageEvent;
}


function ReadHookMessage(data) {
  const objects = data.split(" ");
  console.log(data)
  switch (objects[0]){
    case "SELECTED":
      CreatePick({
        playerId: objects[2],
        espnTeamId: objects[1],
      });
      break;
    case "INIT":
    lockQueue = true;
      setTimeout(() => {
        LoadPickHistory({
          data: data
        })
      }, 5000);

    default:
      break
  }

}

setTimeout(() => {
  InjectOpenButton();
}, 5000);