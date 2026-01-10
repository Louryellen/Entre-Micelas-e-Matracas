/* audio.js — Abertura (capa) sem botão */
(() => {
  "use strict";

  // ajuste o caminho se necessário
  const OPENING_URL = "audios/abertura.mp3";

  const bgm = new Audio(OPENING_URL);
  bgm.loop = true;         // se quiser só uma vez, troque para false
  bgm.preload = "auto";
  bgm.volume = 0.65;       // ajuste fino

  let started = false;

  async function startOnce() {
    if (started) return;
    started = true;
    try {
      await bgm.play();
    } catch (_) {
      // Se bloquear, a próxima interação costuma destravar.
      started = false;
    }
  }

  // Tenta iniciar na 1ª interação do usuário (sem botão)
  window.addEventListener("pointerdown", startOnce, { once: false, capture: true });
  window.addEventListener("keydown", startOnce, { once: false, capture: true });

  // Exponho caso você queira chamar manualmente no seu script da capa
  window.EMM_OPENING_AUDIO = { startOnce };
})();
