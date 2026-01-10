/* sfx.js — efeitos sonoros (sem botão) */
(() => {
  "use strict";

  // Base relativo ao próprio sfx.js (robusto mesmo em subpastas)
  const scriptUrl = document.currentScript?.src;
  const base = scriptUrl ? new URL(".", scriptUrl) : new URL(".", location.href);

  const FILES = {
    notify: new URL("audios/notificação.mp3", base).href,
    email: new URL("audios/email.mp3", base).href,
  };

  function play(name, { volume = 1, rate = 1 } = {}) {
    const src = FILES[name];
    if (!src) return;

    // clone para permitir tocar repetido sem “engasgar”
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = Math.max(0, Math.min(1, volume));
    a.playbackRate = rate;

    // tenta tocar; se o browser bloquear, não trava o jogo
    const p = a.play();
    if (p?.catch) p.catch(() => {});
  }

  // Exponho globalmente
  window.EMM_SFX = { play };
})();
