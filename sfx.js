/* sfx.js — efeitos sonoros (sem botão) */
(() => {
  "use strict";

  // Base relativo ao próprio sfx.js (robusto mesmo em subpastas)
  const scriptUrl = document.currentScript?.src;
  const base = scriptUrl ? new URL(".", scriptUrl) : new URL(".", location.href);

  const FILES = {
    notify:  new URL("audios/notificação.mp3", base).href,
    email:   new URL("audios/email.mp3", base).href,

    // Cena 1
    check:   new URL("audios/check.mp3", base).href,

    // Cena 2 (7 erros)
    check2:  new URL("audios/check2.mp3", base).href,

    // Rankings (reaproveita)
    vitoria: new URL("audios/vitoria.mp3", base).href,
    derrota: new URL("audios/derrota.mp3", base).href,
  };

  function play(name, { volume = 1, rate = 1 } = {}) {
    const src = FILES[name];
    if (!src) return;

    const a = new Audio(src);
    a.preload = "auto";
    a.volume = Math.max(0, Math.min(1, volume));
    a.playbackRate = rate;

    const p = a.play();
    if (p?.catch) p.catch(() => {});
  }

  window.EMM_SFX = { play };
})();
