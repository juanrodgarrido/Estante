/*
 * Service worker de Estante. Sin dependencias.
 *
 * - Precache de la página /offline y los iconos.
 * - /_next/static (JS, CSS, fuentes): cache-first, es inmutable.
 * - Portadas (/_next/image y dominios de portadas): stale-while-revalidate con tope.
 * - Navegaciones: red primero; sin red, /offline. NUNCA se guarda el HTML de las páginas
 *   (lleva datos de la sesión).
 * - /api/*, Server Actions (POST), peticiones RSC y cualquier otra cosa: directo a la red.
 *
 * Al cambiar este archivo, sube VERSION para limpiar las cachés antiguas.
 */
const VERSION = "v1";
const STATIC_CACHE = `static-${VERSION}`;
const COVERS_CACHE = `covers-${VERSION}`;
const SHELL_CACHE = `shell-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icon.svg", "/icons/icon-192", "/apple-icon"];
const MAX_COVERS = 200;
const COVER_HOSTS = [
  "books.google.com",
  "books.googleusercontent.com",
  "covers.openlibrary.org",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [STATIC_CACHE, COVERS_CACHE, SHELL_CACHE];
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !keep.includes(n)).map((n) => caches.delete(n)));
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

function isCover(url) {
  if (url.origin === self.location.origin) return url.pathname === "/_next/image";
  return COVER_HOSTS.includes(url.hostname) || url.hostname.endsWith(".archive.org");
}

// Solo respuestas correctas y sin cookies; las opacas solo para portadas.
function cacheable(response, allowOpaque) {
  if (response.type === "opaque") return allowOpaque;
  return response.ok && !response.headers.has("set-cookie");
}

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (cacheable(response, false)) await cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(COVERS_CACHE);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then(async (response) => {
      if (cacheable(response, true)) {
        await cache.put(request, response.clone());
        await trimCache(COVERS_CACHE, MAX_COVERS);
      }
      return response;
    })
    .catch(() => undefined);
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  return (await refresh) ?? Response.error();
}

async function navigate(event) {
  try {
    const preloaded = await event.preloadResponse;
    return preloaded ?? (await fetch(event.request));
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    return (await cache.match(OFFLINE_URL)) ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin && (url.pathname.startsWith("/api/") || url.searchParams.has("_rsc"))) return;
  if (request.headers.has("rsc") || request.headers.has("next-action")) return;

  if (request.mode === "navigate") {
    event.respondWith(navigate(event));
    return;
  }
  if (sameOrigin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  if (request.destination === "image" && isCover(url)) {
    event.respondWith(staleWhileRevalidate(request, event));
    return;
  }
  if (sameOrigin && PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => hit ?? fetch(request)),
    );
  }
});
