/* eslint-disable no-proto */
/* eslint-disable accessor-pairs */
/* eslint-disable no-global-assign */

const urlParams = new URLSearchParams(window.location.search)
const today = new Date()
const leagueId = urlParams.get("leagueId")
var pickCount = 0
var keeperPickNumbers = []

const BASE_URL = "https://www.pick-pulse.com"
// const BASE_URL = "https://pick-pulse.vercel.app"
// const BASE_URL = "http://localhost:3000"
const BASE_API_URL = `${BASE_URL}/api`

var lockQueue = true
const pickQueue = []
var draftId

async function injected() {
  draftId = await GetDraftId()
}

async function GetDraftId() {
  const response = await fetch(
    `${BASE_API_URL}/drafts?season=${today.getFullYear()}&leagueId=${leagueId}`,
    {
      method: "GET"
    }
  )

  if (!response.ok) {
    console.log(await response.json())
    return
  }

  const draft = await response.json()
  return draft.id
}

async function CreatePick(data) {
  if (lockQueue) {
    pickQueue.push(data)
    return
  }
  pickCount++

  if (keeperPickNumbers.includes(pickCount)) {
    await CreatePick(data)
    return
  }

  const response = await fetch(`${BASE_API_URL}/picks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      espnTeamId: Number(data.espnTeamId),
      playerId: Number(data.playerId),
      draftId: draftId,
      isKeeper: false,
      pickNumber: pickCount,
      cost: data.cost || 0
    })
  })

  if (!response.ok) {
    console.log("Failed to create pick", await response.json())
    return
  }
  const pick = await response.json()
  // console.log("Pick created successfully!", pick);
}

async function pushQueue() {
  while (pickQueue.length > 0) {
    const pick = pickQueue.shift()
    await CreatePick(pick)
  }
}

function InjectOpenButton() {
  const button = document.createElement("button")
  button.innerHTML = "Open PickPulse"
  button.onclick = function () {
    window.open(`${BASE_URL}/draftboard/${draftId}`, "_blank")
  }

  button.style = `
    background-color: hsl(262.1, 83.3%, 55%);
    color: white;
    padding: 2px 9px;
    margin: 4px 10px;
    border-radius: 10px;
    box-shadow: none;
    border: none;
    cursor: pointer;
  `

  document.querySelector(".icon-group").appendChild(button)
}

async function draftInit(draftInit) {
  // const players = draftInit.players.map(player => {

  const teams = draftInit.teams.map((team) => {
    return {
      name: team.name,
      logo: team.logo,
      espnTeamNumber: team.id
    }
  })
  const lineupSlots = draftInit.settings.rosterSettings.lineupSlotCounts
  const timePerSelection = draftInit.settings.draftSettings.timePerSelection
  const pickOrder = draftInit.settings.draftSettings.pickOrder
  const auctionBudget = draftInit.settings.draftSettings.auctionBudget
  const draftType = draftInit.settings.draftSettings.type.toLowerCase()
  const season = draftInit.seasonId
  const id = draftInit.id
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
        lineupSlots: lineupSlots,
        auctionBudget: auctionBudget
      },
      teams: teams
    }
  })
}

async function CreateLeague(data) {
  console.log(data)
  // console.log("Checking if league exists")
  const leagueResponse = await fetch(`${BASE_API_URL}/leagues?id=${data.id}`, {
    method: "GET"
  })

  if (leagueResponse.ok) {
    const league = await leagueResponse.json()

    if (league.drafts.length === 0) {
      // console.log("League found, but no draft exists, creating new draft")
      const response = await fetch(`${BASE_API_URL}/drafts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          season: today.getFullYear(),
          leagueId: league.id,
          teams: data.teams,
          ...data.draft
        })
      })

      if (!response.ok) {
        const responseData = await response.json()
        if (responseData.draftId) draftId = responseData.draftId
        return console.log(await response.json())
      }

      draftId = (await response.json()).id
      return
    }

    draftId = league.drafts[0].id
    return
  }

  // console.log("League not found, creating new league")

  const response = await fetch(`${BASE_API_URL}/leagues/frominit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...data
    })
  })

  if (!response.ok) {
    const responseData = await response.json()
    if (responseData.draftId) draftId = responseData.draftId
    console.log(await response.json())
  }

  const draft = await response.json()
  draftId = draft.id
  window.open(`${BASE_URL}/draftboard/${draft.id}`, "_blank")
  return draft
}

async function LoadPickHistory(data) {
  lockQueue = true
  const response = await fetch(`${BASE_API_URL}/drafts/pickhistory`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...data
    })
  })

  if (!response.ok) {
    console.log(await response.json())
    alert("Failed to load pick history, please refresh the page and try again.")
    lockQueue = false
    return
  }
  const draftData = await response.json()
  pickCount = draftData.draft.totalPicks || 0
  keeperPickNumbers = draftData.draft.keeperPickNumbers
  // console.log("Pick history successfully loaded!");
  unlockQueue()
}

function unlockQueue() {
  setTimeout(async () => {
    const response = await fetch(
      `${BASE_API_URL}/drafts/isLocked?id=${draftId}`
    )

    if (!response.ok) {
      console.log(await response.json())
      return
    }

    const data = await response.json()
    const isLocked = data.locked
    lockQueue = Boolean(isLocked)
    // console.log("Queue unlocked!", lockQueue);
    // console.log(data)
    if (lockQueue) {
      return unlockQueue()
    }

    await pushQueue()
  }, 5000)
}

;(function () {
  const originalXhrOpen = XMLHttpRequest.prototype.open

  XMLHttpRequest.prototype.open = function () {
    this.addEventListener("readystatechange", function () {
      if (this.readyState === 4) {
        // 4 means the request is done
        if (!draftId && this.responseURL.includes("draftInit")) {
          const request = {
            method: arguments[0],
            url: this.responseURL,
            response: JSON.parse(this.responseText)
          }
          // console.log('XHR Request:', request);
          draftInit(request.response)
        }
      }
    })

    originalXhrOpen.apply(this, arguments)
  }
})()

var wsHook = {}
;(function () {
  function MutableMessageEvent(o) {
    this.bubbles = o.bubbles || false
    this.cancelBubble = o.cancelBubble || false
    this.cancelable = o.cancelable || false
    this.currentTarget = o.currentTarget || null
    this.data = o.data || null
    this.defaultPrevented = o.defaultPrevented || false
    this.eventPhase = o.eventPhase || 0
    this.lastEventId = o.lastEventId || ""
    this.origin = o.origin || ""
    this.path = o.path || new Array(0)
    this.ports = o.parts || new Array(0)
    this.returnValue = o.returnValue || true
    this.source = o.source || null
    this.srcElement = o.srcElement || null
    this.target = o.target || null
    this.timeStamp = o.timeStamp || null
    this.type = o.type || "message"
    this.__proto__ = o.__proto__ || MessageEvent.__proto__
  }

  var before = (wsHook.before = function (data, url, wsObject) {
    return data
  })
  var after = (wsHook.after = function (e, url, wsObject) {
    return e
  })
  var modifyUrl = (wsHook.modifyUrl = function (url) {
    return url
  })
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
    if (!this.protocols) {
      WSObject = new _WS(url)
    } else {
      WSObject = new _WS(url, protocols)
    }

    var _send = WSObject.send
    WSObject.send = function (data) {
      arguments[0] = wsHook.before(data, WSObject.url, WSObject) || data
      _send.apply(this, arguments)
    }

    // Events needs to be proxied and bubbled down.
    WSObject._addEventListener = WSObject.addEventListener
    WSObject.addEventListener = function () {
      var eventThis = this
      if (arguments[0] === "message") {
        arguments[1] = (function (userFunc) {
          return function instrumentAddEventListener() {
            arguments[0] = wsHook.after(
              new MutableMessageEvent(arguments[0]),
              WSObject.url,
              WSObject
            )
            if (arguments[0] === null) return
            userFunc.apply(eventThis, arguments)
          }
        })(arguments[1])
      }
      return WSObject._addEventListener.apply(this, arguments)
    }

    Object.defineProperty(WSObject, "onmessage", {
      set: function () {
        var eventThis = this
        var userFunc = arguments[0]
        var onMessageHandler = function () {
          arguments[0] = wsHook.after(
            new MutableMessageEvent(arguments[0]),
            WSObject.url,
            WSObject
          )
          if (arguments[0] === null) return
          userFunc.apply(eventThis, arguments)
        }
        WSObject._addEventListener.apply(this, [
          "message",
          onMessageHandler,
          false
        ])
      }
    })

    return WSObject
  }
})()

wsHook.before = function (data, url, wsObject) {
  // console.log("Sending message to " + url + " : " + data);
  ReadHookMessage(data)
}

// Make sure your program calls `wsClient.onmessage` event handler somewhere.
wsHook.after = function (messageEvent, url, wsObject) {
  // console.log("Received message from " + url + " : " + messageEvent.data);
  ReadHookMessage(messageEvent.data)
  return messageEvent
}

function ReadHookMessage(data) {
  const objects = data.split(" ")
  // console.log(data)
  switch (objects[0]) {
    case "SELECTED":
      CreatePick({
        playerId: objects[2],
        espnTeamId: objects[1]
      })
      break
    case "SOLD":
      CreatePick({
        playerId: objects[2],
        espnTeamId: objects[1],
        cost: Number(objects[4])
      })
      break
    case "INIT":
      setTimeout(() => {
        LoadPickHistory({
          data: data
        })
      }, 5000)

    default:
      break
  }
}

setTimeout(() => {
  InjectOpenButton()
}, 5000)
injected()
