/**
 * Basic Service Worker for PWA
 * Version: V0.4
 */
const CACHE_NAME = "drive-pwa-file-manager-v0.4-20260602";
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

  // version.json 不快取，讓 Settings 的檢查更新可取得 GitHub 最新版本資訊。
  if (requestUrl.pathname.endsWith("/version.json") || requestUrl.pathname.endsWith("version.json")) return;

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => {
    if (event.request.mode === "navigate") return caches.match("./index.html");
  })));
});
