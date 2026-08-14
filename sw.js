/* منظومة تقنين الأراضى المنزرعة — Service Worker */
var VERSION = "taqneen-v1.34";
var CORE = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE).catch(function(){}); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { if (k !== VERSION) return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var url = e.request.url;
  /* لا يُخزَّن مؤقتاً: القاعدة الحية وبلاطات الخرائط */
  if (url.indexOf("firebasedatabase.app") >= 0 || url.indexOf("tile.openstreetmap.org") >= 0) return;
  if (e.request.method !== "GET") return;
  /* المستند: الشبكة أولاً حتى تصل البيلدات الجديدة */
  if (e.request.mode === "navigate" || url.indexOf("index.html") >= 0) {
    e.respondWith(
      fetch(e.request).then(function (r) {
        var cp = r.clone();
        caches.open(VERSION).then(function (c) { c.put(e.request, cp); });
        return r;
      }).catch(function () { return caches.match(e.request).then(function (m) { return m || caches.match("./index.html"); }); })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function (m) {
      return m || fetch(e.request).then(function (r) {
        if (r && r.status === 200 && r.type === "basic") {
          var cp = r.clone();
          caches.open(VERSION).then(function (c) { c.put(e.request, cp); });
        }
        return r;
      }).catch(function () { return m; });
    })
  );
});
