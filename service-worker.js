const CACHE_NAME = "snap-and-sell-v4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./styles.css?v=clean-vibe",
  "./styles.css?v=clean-vibe2",
  "./script.js",
  "./script.js?v=clean-vibe",
  "./script.js?v=clean-vibe2",
  "./manifest.json",
  "./manifest.json?v=clean-vibe",
  "./manifest.json?v=clean-vibe2",
  "./assets/icon.svg",
  "./assets/icon.svg?v=clean-vibe",
  "./assets/icon.svg?v=clean-vibe2",
  "./assets/logo-mark.png",
  "./assets/logo-mark.png?v=clean-vibe",
  "./assets/logo-mark.png?v=clean-vibe2",
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
