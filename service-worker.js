const CACHE_NAME = "snap-and-sell-v7";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./styles.css?v=clean-vibe",
  "./styles.css?v=clean-vibe2",
  "./styles.css?v=workflow1",
  "./styles.css?v=workflow2",
  "./config.js",
  "./config.js?v=workflow2",
  "./script.js",
  "./script.js?v=clean-vibe",
  "./script.js?v=clean-vibe2",
  "./script.js?v=workflow1",
  "./script.js?v=workflow2",
  "./manifest.json",
  "./manifest.json?v=clean-vibe",
  "./manifest.json?v=clean-vibe2",
  "./manifest.json?v=workflow1",
  "./manifest.json?v=workflow2",
  "./assets/icon.svg",
  "./assets/icon.svg?v=clean-vibe",
  "./assets/icon.svg?v=clean-vibe2",
  "./assets/icon.svg?v=workflow1",
  "./assets/icon.svg?v=workflow2",
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
