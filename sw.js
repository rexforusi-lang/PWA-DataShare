/**
 * Basic Service Worker for PWA
 * Cache version should be updated when app files change.
 */
const CACHE_NAME = "drive-pwa-file-manager-v0.2-20260602";
const APP_SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./config.js", "./manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Google API 不快取，避免授權與資料同步問題。
  if (requestUrl.hostname.includes("googleapis.com") || requestUrl.hostname.includes("google.com")) return;

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => {
    if (event.request.mode === "navigate") return caches.match("./index.html");
  })));
});
