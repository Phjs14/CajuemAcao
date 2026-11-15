/* ============================================================
   PWA: registro do service worker, botão "Instalar" e aviso de
   nova versão. Service workers exigem HTTPS ou localhost
   (não funcionam abrindo o index.html direto do disco, file://).
   ============================================================ */
(function(){
  const $ = s => document.querySelector(s);
  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  function say(msg, ms){
    const t = $("#toast"); if(!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove("show"), ms || 2600);
  }

  /* ---------- Botão instalar ---------- */
  let deferred = null;
  const btn = $("#btnInstall");
  function showInstall(){ if(btn && !isStandalone()) btn.hidden = false; }
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; showInstall(); });
  window.addEventListener("appinstalled", () => { deferred = null; if(btn) btn.hidden = true; say("App instalado! Agora ele abre mesmo sem internet."); });
  if(isIOS && !isStandalone()) showInstall();   // iOS não dispara beforeinstallprompt
  if(btn) btn.addEventListener("click", async () => {
    if(deferred){ deferred.prompt(); await deferred.userChoice; deferred = null; btn.hidden = true; }
    else if(isIOS){ say("No iPhone/iPad: toque em Compartilhar e depois em “Adicionar à Tela de Início”.", 7000); }
    else { say("Use o menu do navegador e escolha “Instalar app”.", 5000); }
  });

  /* ---------- Service worker + atualização ---------- */
  if(!("serviceWorker" in navigator)) return;
  if(location.protocol === "file:"){ console.info("PWA: service worker desativado em file://. Publique em HTTPS ou use localhost."); return; }

  function offerUpdate(worker){
    if($("#updateBar")) return;
    const bar = document.createElement("div");
    bar.id = "updateBar"; bar.className = "update-bar"; bar.setAttribute("role","status");
    bar.innerHTML = '<span>🌱 Nova versão pronta.</span><button class="btn primary" id="btnUpdate">Atualizar agora</button>';
    document.body.appendChild(bar);
    $("#btnUpdate").onclick = () => worker.postMessage({ type: "SKIP_WAITING" });
  }

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if(reloading || !window.__hadController) return;   // não recarrega na 1ª instalação
    reloading = true; location.reload();
  });
  window.__hadController = !!navigator.serviceWorker.controller;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then(reg => {
      if(reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const w = reg.installing; if(!w) return;
        w.addEventListener("statechange", () => {
          if(w.state === "installed" && navigator.serviceWorker.controller) offerUpdate(w);
          if(w.state === "installed" && !navigator.serviceWorker.controller) say("Pronto! O app já funciona offline.");
        });
      });
    }).catch(err => console.warn("PWA: falha ao registrar o service worker", err));
  });
})();
