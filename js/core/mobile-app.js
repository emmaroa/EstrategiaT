(function (global) {
  var capacitor = global.Capacitor;
  var isNative = Boolean(capacitor && typeof capacitor.isNativePlatform === "function" && capacitor.isNativePlatform());
  if (!isNative) return;
  if (global.etMobileReady) return;
  global.etMobileReady = true;

  document.documentElement.classList.add("et-native-app");
  document.documentElement.setAttribute("data-platform", capacitor.getPlatform());
  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[href]");
    if (!link) return;
    var href = link.getAttribute("href") || "";
    if (/^https?:\/\//i.test(href) && new URL(href, global.location.href).origin !== global.location.origin) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  });
})(window);
