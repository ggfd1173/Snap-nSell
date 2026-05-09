const CACHE_NAME = "snap-and-sell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./styles.css?v=snap-sell",
  "./script.js",
  "./script.js?v=snap-sell",
  "./manifest.json",
  "./manifest.json?v=snap-sell",
  "./assets/icon.svg",
  "./assets/icon.svg?v=snap-sell",
  "./assets/logo.png",
  "./assets/logo.png?v=snap-sell",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }

          return undefined;
        })
      );
    })
  );
});
