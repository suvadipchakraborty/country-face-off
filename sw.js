const CACHE = 'face-off-v2';
const ASSETS = ['./','index.html','styles.css','app.js','manifest.json','icon.svg','icon-192.png','icon-512.png'];
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method!=='GET') return;
  const url = new URL(req.url);
  if(url.hostname==='api.worldbank.org') return; // always live data
  e.respondWith(
    fetch(req).then(res=>{
      if(res.ok && (url.origin===location.origin || url.hostname==='cdn.jsdelivr.net' || url.hostname.startsWith('fonts.g'))){
        const copy = res.clone(); caches.open(CACHE).then(c=>c.put(req, copy));
      }
      return res;
    }).catch(()=>caches.match(req).then(r=>r || caches.match('index.html')))
  );
});
