/**
 * CoopFlow Service Worker — PWA & Mode Hors-Ligne
 */

const CACHE_NAME = "coopflow-v1";
const STATIC_ASSETS = [
  "/offline.html",
  "/favicon.svg",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/icons/maskable-512.svg",
  "/manifest.json",
];

// Installation : mise en cache des ressources essentielles
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Interception des requêtes réseau
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et les requêtes vers d'autres origines
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Ne jamais mettre en cache les requêtes d'authentification ou API de session
  if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/api/")) {
    return;
  }

  // 1. Pages HTML / Navigation : Network First avec repli sur la page hors-ligne
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Copie de secours dans le cache si la réponse est valide
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          // Si hors-ligne, essayer le cache de la page demandée, sinon afficher offline.html
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const offlinePage = await caches.match("/offline.html");
          return offlinePage || new Response("Hors-ligne", { status: 503 });
        })
    );
    return;
  }

  // 2. Fichiers statiques (images, icônes, CSS Next.js) : Cache First avec mise à jour en tâche de fond
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/") ||
    STATIC_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Par défaut : réseau direct
  event.respondWith(fetch(request));
});

