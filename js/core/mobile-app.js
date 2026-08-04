(function (global) {
  var capacitor = global.Capacitor;
  var isNative = Boolean(capacitor && typeof capacitor.isNativePlatform === "function" && capacitor.isNativePlatform());
  if (!isNative) return;

  document.documentElement.classList.add("et-native-app");
  document.documentElement.setAttribute("data-platform", capacitor.getPlatform());
  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[href]");
    if (!link) return;
    var href = link.getAttribute("href") || "";
    if (/^https?:\/\//i.test(href) && !href.includes(global.location.host)) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  });
})(window);
