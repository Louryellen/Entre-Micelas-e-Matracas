/* audio.js — BGM por página (sem botão) + LOCK durante vídeos */
(() => {
  "use strict";

  // Base relativo ao próprio audio.js (funciona mesmo em subpastas)
  const scriptUrl = document.currentScript?.src;
  const base = scriptUrl ? new URL(".", scriptUrl) : new URL(".", location.href);

  const TRACKS = {
    abertura: new URL("audios/abertura.mp3", base).href,
    trilha1:  new URL("audios/trilha1.mp3",  base).href,
    trilha2:  new URL("audios/trilha2.mp3",  base).href, // só onde você definir via data-bgm
    trilha3:  new URL("audios/trilha3.mp3",  base).href,
    trilha4: new URL("audios/trilha4.mp3", base).href,
 
  };

  const STORAGE_KEY = "emm_bgm_settings_v1";

  const state = {
    started: false,
    volume: 0.55,
    name: "",
    locked: false, // trava para não reiniciar durante vídeo/ranking
  };

  let bgm = null;

  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (typeof s.volume === "number") state.volume = s.volume;
    } catch {}
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume: state.volume }));
    } catch {}
  }

  /**
   * Regra:
   * - Se existir <body data-bgm="...">: usa isso (ex.: cena1 data-bgm="trilha2", cena2 data-bgm="trilha3")
   * - Senão:
   *   - index/capa: abertura
   *   - jogo.html: trilha1
   *   - outras: sem música (não generaliza)
   */
  function desiredTrackName() {
    const attr = document.body?.dataset?.bgm;
    if (attr) return attr;

    const file = (location.pathname.split("/").pop() || "").toLowerCase();
    if (file === "index.html" || file === "capa.html" || file === "") return "abertura";
    if (file === "jogo.html") return "trilha1";
    return "";
  }

  function ensureAudio(name) {
    if (!name || !TRACKS[name]) return null;

    if (bgm && state.name === name) return bgm;

    if (bgm) {
      try { bgm.pause(); } catch {}
      bgm = null;
    }

    state.name = name;
    bgm = new Audio(TRACKS[name]);
    bgm.loop = true;
    bgm.preload = "auto";
    bgm.volume = state.volume;
    bgm.playsInline = true;

    return bgm;
  }

  async function start() {
    if (state.locked) return;

    const name = desiredTrackName();
    const a = ensureAudio(name);
    if (!a) return;

    // se estava "started" mas a instância mudou, marca como false para permitir retomar
    if (state.started && (!bgm || state.name !== name)) state.started = false;

    if (state.started) return;

    try {
      await a.play();
      state.started = true;
    } catch {
      state.started = false;
    }
  }

  function stop() {
    if (bgm) {
      try { bgm.pause(); } catch {}
    }
    state.started = false;
  }

  function lock(on) {
    state.locked = !!on;
    if (state.locked) stop();
  }

  function setVolume(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    state.volume = Math.max(0, Math.min(1, n));
    if (bgm) bgm.volume = state.volume;
    saveSettings();
  }

  loadSettings();

  // Sem botão: inicia no primeiro gesto do usuário
  window.addEventListener("pointerdown", start, { capture: true });
  window.addEventListener("keydown", start, { capture: true });

  window.EMM_BGM = { start, stop, lock, setVolume };
})();
