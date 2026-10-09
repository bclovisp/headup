/* Head Up service worker.
   HTML uses network-first so app updates appear when online; falls back to cache offline.
   Static assets (icons, manifest, fonts) are cache-first.
   Bump CACHE only if you change the asset list below. */
var CACHE = 'hu-cache-v1';
var ASSETS = ['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  var isDoc = req.mode === 'navigate' || req.destination === 'document' ||
              url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  if(isDoc){
    // network-first: get latest, fall back to cached app shell offline
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(r){ return r || caches.match('./index.html'); });
      })
    );
    return;
  }
  // cache-first for everything else (icons, fonts, etc.)
  e.respondWith(
    caches.match(req).then(function(cached){
      return cached || fetch(req).then(function(res){
        try{ var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }catch(_){}
        return res;
      }).catch(function(){ return cached; });
    })
  );
});
