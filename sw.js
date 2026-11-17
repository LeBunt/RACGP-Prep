/* Offline support. Network first, so a new release is picked up as soon as the device is online;
   the cached copy is used when it is not. Unit data and saved audio live in their own caches,
   which survive app updates. Bump CACHE with every release. */
const CACHE="akt-practice-4.15", DATA="akt-data", AUDIO="akt-audio";
const CORE=["./","index.html","app.css","app.js","vendor/fsrs.js","data/index.js","manifest.webmanifest","icon.svg","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!==DATA&&k!==AUDIO).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET"||u.origin!==location.origin)return;
  /* Audio is streamed straight from the network (range requests); offline copies are read by the page from the audio cache. */
  if(u.pathname.indexOf("/audio/")>=0)return;
  const store=u.pathname.indexOf("/data/units/")>=0?DATA:CACHE;
  e.respondWith(fetch(e.request).then(r=>{if(r&&r.ok){const cp=r.clone();caches.open(store).then(c=>c.put(e.request,cp))}return r})
    .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(m=>m||(e.request.mode==="navigate"?caches.match("index.html"):Response.error()))));
});
