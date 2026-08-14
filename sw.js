/* ═══════════════════════════════════════════════════════════════
   التوأم الرقمى لترعة الإسماعيلية — عامل الخدمة
   VERSION 10.22
   ملاحظة مهمة: هذا الملف يخص مستودع ismailia-dt وحده.
   (فى ٦/٨/٢٠٢٦ رُفع هنا sw.js الخاص بمنصة مصلحة الرى بالخطأ —
    الملفان بنفس الاسم — فتوقف تحديث التطبيق عند المستخدمين.)
   ═══════════════════════════════════════════════════════════════ */
var VERSION = '10.22';
var CACHE_NAME = 'ismailia-dt-v' + VERSION; /* V162: اسم الكاش يواكب الإصدار تلقائياً */

var CORE = ['./', './index.html', './manifest.json'];
var EXTRA = [
  './icon-192.png', './icon-512.png',
  './firebase-sync.js', './firebase-sync.js?v=33'
];

/* نطاقات مكتبات ثابتة الإصدار: cacheFirst ليعمل التطبيق دون شبكة */
var CDN_ORIGINS = [
  'https://cdnjs.cloudflare.com',
  'https://unpkg.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://www.gstatic.com'
];

/* نطاقات بيانات حية أو مصادقة: لا تُخزَّن إطلاقاً */
var NEVER_CACHE = [
  'firebaseio.com',
  'firebasedatabase.app',
  'googleapis.com/identitytoolkit',
  'api.anthropic.com',
  'services.sentinel-hub.com',
  'sh.dataspace.copernicus.eu',
  'identity.dataspace.copernicus.eu',
  'shapps.dataspace.copernicus.eu',
  'catalogue.dataspace.copernicus.eu',
  'data.apps.fao.org',
  'overpass-api.de',
  'server.arcgisonline.com',
  'api.open-meteo.com',
  'api.jsonbin.io',
  'corsproxy.io',
  'tile.openstreetmap.org'
];

function isNeverCache(url) {
  for (var i = 0; i < NEVER_CACHE.length; i++) {
    if (url.indexOf(NEVER_CACHE[i]) !== -1) return true;
  }
  return false;
}

function isCdn(origin) {
  return CDN_ORIGINS.indexOf(origin) !== -1;
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (c) {
      return Promise.all(CORE.concat(EXTRA).map(function (u) {
        return c.add(u).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) {
        return k !== CACHE_NAME;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  if (e && e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  var u;
  try { u = new URL(e.request.url); } catch (x) { return; }
  if (e.request.method !== 'GET') return;
  if (isNeverCache(e.request.url)) return;          /* مباشرة للشبكة */

  /* مكتبات CDN: من الكاش أولاً ثم الشبكة */
  if (u.origin !== self.location.origin) {
    if (!isCdn(u.origin)) return;
    e.respondWith(
      caches.match(e.request).then(function (r) {
        return r || fetch(e.request).then(function (rr) {
          if (rr && (rr.ok || rr.type === 'opaque')) {
            var cp = rr.clone();
            caches.open(CACHE_NAME).then(function (c) { c.put(e.request, cp); });
          }
          return rr;
        });
      })
    );
    return;
  }

  /* صفحة التطبيق: الشبكة أولاً مع الرجوع للنسخة المخزنة */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function (r) {
        var cp = r.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put('./index.html', cp); });
        return r;
      }).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function (r) {
      return r || fetch(e.request).then(function (rr) {
        if (rr && rr.ok) {
          var cp = rr.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(e.request, cp); });
        }
        return rr;
      });
    })
  );
});
