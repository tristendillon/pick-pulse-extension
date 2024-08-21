
chrome.webRequest.onCompleted.addListener(
  function(details)
  {
      console.log(details);
  },
  {urls: ["https://lm-api-reads.fantasy.espn.com/*", "https://fantasy.espn.com/*",]},
  ['responseHeaders', 'extraHeaders']
);
