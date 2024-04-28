
const init = function () {
  if (window.location.href.includes("draft")){
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('dataReader.js');
    s.type = "module";
    (document.head || document.documentElement).append(s);
  }
}
init();
