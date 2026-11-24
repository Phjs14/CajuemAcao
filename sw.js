/* ============================================================
   Service Worker — Caju em Ação (PWA offline)
   Estratégia: pré-cache de todo o "app shell" na instalação e
   resposta cache-first. Para publicar uma nova versão, MUDE o
   número de CACHE_VERSION: o app avisa o usuário e atualiza.
   ============================================================ */
const CACHE_VERSION = "2.1.0-aracaju-pwa2";
const CACHE_NAME = "caju-em-acao-" + CACHE_VERSION;

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./data.js",
  "./custom.js",
  "./app.js",
  "./criar.js",
  "./pwa.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon-64.png",
  "./screenshot-wide.png",
  "./screenshot-narrow.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // cache:'reload' garante arquivos novos (ignora o cache HTTP do navegador)
      Promise.all(APP_SHELL.map(url => cache.add(new Request(url, { cache: "reload" }))))
    )
    // Sem skipWaiting automático: a página pergunta ao usuário (mensagem SKIP_WAITING abaixo)
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("caju-em-acao-") && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // só o próprio app; nada de rede externa

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(req).catch(() => {
        // Navegação sem rede e fora do cache: abre o app
        if (req.mode === "navigate") return caches.match("./index.html");
        return new Response("", { status: 504, statusText: "Offline" });
      });
    })
  );
});
