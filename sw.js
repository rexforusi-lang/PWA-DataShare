/** Basic Service Worker for PWA - Version: V0.6 */
const CACHE_NAME = "drive-pwa-file-manager-v0.6-20260602";
const APP_SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./config.js", "./manifest.json", "./icons/icon-192.svg", "./icons/icon-512.svg", "./icons/maskable-icon.svg"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))); self.skipWaiting(); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))); self.clients.claim(); });
self.addEventListener("fetch", event => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.hostname.includes("googleapis.com") || requestUrl.hostname.includes("google.com")) return;
  if (requestUrl.pathname.endsWith("/version.json") || requestUrl.pathname.endsWith("version.json")) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).catch(() => { if (event.request.mode === "navigate") return caches.match("./index.html"); })));
});
