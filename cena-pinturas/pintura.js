/* pintura.js */
(() => {
  "use strict";

  const $ = (q) => document.querySelector(q);

  // =========================
  // ELEMENTOS
  // =========================
  const btnReiniciar = $("#btnReiniciar");
  const topbarText = $("#topbarText");

  const chipStep = $("#chipStep");
  const chipErrors = $("#chipErrors");

  const selPigmento = $("#selPigmento");
  const selMeio = $("#selMeio");
  const helpMeio = $("#helpMeio");
  const helpPigmento = $("#helpPigmento");

  const inpMassa = $("#inpMassa");
  const inpVolume = $("#inpVolume");

  const rngAcido = $("#rngAcido");
  const rngBase = $("#rngBase");

  const outConc = $("#outConc");
  const outAcido = $("#outAcido");
  const outBase = $("#outBase");
  const outPH = $("#outPH");
  const outCorNome = $("#outCorNome");
  const swatch = $("#swatch");
  const miniExp = $("#miniExp");

  // faixa ideal dinâmica
  const idealMassa = $("#idealMassa");
  const idealVolume = $("#idealVolume");
  const idealConc = $("#idealConc");

  // meta/pH perto do ajuste ácido-base
  const outGoal = $("#outGoal");
  const outTargetPH = $("#outTargetPH");
  const outStatus = $("#outStatus");
  const outPHBig = $("#outPHBig");

  const btnPintar = $("#btnPintar");

  const diaryList = $("#diaryList");
  const progressFill = $("#progressFill");
  const progressLabel = $("#progressLabel");
  const achievement = $("#achievement");

  const toast = $("#toast");
  const stagebar = $("#stagebar");
  const imgPreview = $("#imgPreview");

  // Canvas do vestido (preview)
  const fitCanvas = $("#fitCanvas");
  const fitWrap = $("#fitWrap");
  const fitBase = $("#fitBase"); // vestido.png
  const fitFallback = $("#fitFallback");
  const fitCtx = fitCanvas?.getContext("2d", { willReadFrequently: false });

  // =========================
  // CONSTANTES
  // =========================
  const DOSE_MAX = 10;                        // sliders 0..10 (passo 0.5 no HTML)
  const PH_RANGE_HALF = 5;                    // [-5, +5] em água; controlável
  const PH_FACTOR = PH_RANGE_HALF / DOSE_MAX; // 0.5
  const EPS = 1e-6;

  const PIGMENTS = ["repolho", "curcuma", "urucum"];

  // ===== FINAL VÍDEO =====
  const FINAL_VIDEO_SRC = "final.mp4"; // ajuste o caminho se necessário
  const NEXT_AFTER_VIDEO_URL = new URL("../relatorio/relatorio.html", window.location.href).href;

  // =========================
  // UTIL
  // =========================
  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function showToast(msg, type = "good") {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => (toast.hidden = true), 1900);
  }

  function logDiary(text) {
    if (!diaryList) return;
    const li = document.createElement("li");
    li.className = "diary-item";
    li.textContent = text;
    diaryList.appendChild(li);

    const container = diaryList.parentElement;
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }

  function setProgress(pct, label) {
    if (progressFill) progressFill.style.width = `${clamp(pct, 0, 100)}%`;
    if (progressLabel && label) progressLabel.textContent = label;
  }

  // rgb(a) -> #RRGGBB
  function rgbToHex(rgb) {
    const m = String(rgb).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return null;
    const r = Number(m[1]).toString(16).padStart(2, "0");
    const g = Number(m[2]).toString(16).padStart(2, "0");
    const b = Number(m[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`.toUpperCase();
  }

  function readHexFromSwatch() {
    if (!swatch) return null;
    const bg = getComputedStyle(swatch).backgroundColor;
    return rgbToHex(bg);
  }

  function fmtRange(a, b, unit, digits = 2) {
    const x = Number(a);
    const y = Number(b);
    if (!isFinite(x) || !isFinite(y)) return "—";
    return `${x.toFixed(digits)}–${y.toFixed(digits)} ${unit}`;
  }

  function prettyDose(n) {
    const v = Number(n);
    if (!isFinite(v)) return "0";
    const s = v.toFixed(1);
    return s.endsWith(".0") ? s.slice(0, -2) : s;
  }

  function phInRange(ph, min, max) {
    return (ph + EPS >= min) && (ph - EPS <= max);
  }

  // =========================
  // MAPAS DE COR (DIDÁTICOS)
  // =========================
  function repolhoColorByPH(ph) {
    if (ph <= 3.0) return { hex: "#b10f2e", name: "Vermelho" };
    if (ph <= 5.0) return { hex: "#7a1fa2", name: "Roxo" };
    if (ph <= 7.0) return { hex: "#7b5bbd", name: "Lilás" };
    if (ph <= 9.0) return { hex: "#2f63c8", name: "Azul" };
    return { hex: "#2a8a3a", name: "Verde" };
  }

  function curcumaColorByPH(ph) {
    if (ph >= 10.0) return { hex: "#f39c12", name: "Amarelo-alaranjado" };
    if (ph >= 8.5) return { hex: "#f1c40f", name: "Amarelo" };
    return { hex: "#e67e22", name: "Alaranjado" };
  }

  function urucumColor() {
    return { hex: "#c0392b", name: "Vermelho/alaranjado intenso" };
  }

  // =========================
  // ALVOS POR PIGMENTO (pH + concentração + meio)
  // =========================
  function getTargetsFor(pigment) {
    if (pigment === "repolho") {
      return {
        name: "REPOLHO ROXO",
        phMin: 6.0,
        phMax: 7.0,
        concMin: 25,
        concMax: 35,
        requireMeio: null,
        recommendedMeio: "agua",
        text: "pH 6,0–7,0 + C 25–35 g/L (repolho roxo)"
      };
    }

    if (pigment === "curcuma") {
      return {
        name: "CÚRCUMA",
        phMin: 10.0,
        phMax: 12.0,
        concMin: 15,
        concMax: 25,
        requireMeio: null,
        recommendedMeio: "agua",
        text: "pH 10–12 + C 15–25 g/L (cúrcuma)"
      };
    }

    // urucum
    return {
      name: "URUCUM",
      phMin: 4.0,
      phMax: 7.0,
      concMin: 15,
      concMax: 25,
      requireMeio: "oleo",
      recommendedMeio: "oleo",
      text: "Meio oleoso + pH 4,0–7,0 + C 15–25 g/L (urucum)"
    };
  }

  function targets() {
    return getTargetsFor(state.pigment);
  }

  // =========================
  // ESTADO DO MINI-JOGO
  // =========================
  const state = {
    errors: 0,
    step: "Seleção do pigmento",
    goal: "—",
    ph: 7.0,
    conc: 0,
    pigment: "repolho",
    meio: "agua",
    acido: 0,
    base: 0,
    tasksDone: { repolho: false, curcuma: false, urucum: false },

    winShown: false
  };

  // =========================
  // CÁLCULOS
  // =========================
  function estimatePH() {
    const delta = (state.base - state.acido) * PH_FACTOR;
    let ph = 7.0 + delta;

    if (state.meio === "oleo") ph = 7.0 + delta * 0.6;

    ph = clamp(ph, 0.0, 14.0);
    ph = Math.round(ph * 10) / 10;
    state.ph = ph;
    return ph;
  }

  function calcConc() {
    const m = parseFloat(inpMassa?.value || "0");
    const vml = parseFloat(inpVolume?.value || "0");
    const vl = vml / 1000;
    const conc = (vl > 0) ? (m / vl) : 0;
    state.conc = conc;
    return conc;
  }

  function alphaFromConc() {
    const t = targets();
    const a = state.conc / t.concMax;
    return clamp(a, 0.35, 1.0);
  }

  // =========================
  // UI: metas e dicas
  // =========================
  function updateGoalText() {
    const t = targets();

    if (state.pigment === "repolho") {
      state.goal = `Atingir a faixa do repolho roxo: pH ${t.phMin.toFixed(1)}–${t.phMax.toFixed(1)} e C ${t.concMin}–${t.concMax} g/L.`;
    } else if (state.pigment === "curcuma") {
      state.goal = `Atingir a faixa da cúrcuma: pH ${t.phMin.toFixed(1)}–${t.phMax.toFixed(1)} (bem básico) e C ${t.concMin}–${t.concMax} g/L.`;
    } else {
      state.goal = `Urucum: usar meio oleoso e atingir pH ${t.phMin.toFixed(1)}–${t.phMax.toFixed(1)} com C ${t.concMin}–${t.concMax} g/L.`;
    }
  }

  function updateExplanations() {
    const t = targets();
    if (!miniExp || !helpMeio) return;

    if (state.pigment === "repolho") {
      miniExp.textContent =
        `Repolho roxo: antocianinas mudam com pH. Meta: pH ${t.phMin.toFixed(1)}–${t.phMax.toFixed(1)} (neutro/lilás).`;
      helpMeio.textContent =
        "Dica: repolho roxo funciona melhor em água. Ajuste limão/bicarbonato até entrar no alvo.";
    } else if (state.pigment === "curcuma") {
      miniExp.textContent =
        `Cúrcuma: curcumina responde ao pH. Meta: pH ${t.phMin.toFixed(1)}–${t.phMax.toFixed(1)} (bem básico).`;
      helpMeio.textContent =
        "Dica: cúrcuma em água. Deixe o meio bem básico com bicarbonato (pH alvo 10–12).";
    } else {
      miniExp.textContent =
        `Urucum: bixina é apolar. Meta: meio oleoso + pH ${t.phMin.toFixed(1)}–${t.phMax.toFixed(1)}.`;
      helpMeio.textContent =
        "Dica: para urucum, selecione Óleo/resina (obrigatório) e ajuste pH 4–7.";
    }
  }

  function updateIdealBands() {
    const t = targets();

    if (idealConc) idealConc.textContent = `${t.concMin}–${t.concMax} g/L`;

    const m = parseFloat(inpMassa?.value || "0");
    const vml = parseFloat(inpVolume?.value || "0");
    const vl = vml / 1000;

    if (vl > 0) {
      const mMin = t.concMin * vl;
      const mMax = t.concMax * vl;
      if (idealMassa) idealMassa.textContent = fmtRange(mMin, mMax, "g", 2);
    } else {
      if (idealMassa) idealMassa.textContent = "—";
    }

    if (m > 0) {
      const vMinL = m / t.concMax;
      const vMaxL = m / t.concMin;
      const vMinML = vMinL * 1000;
      const vMaxML = vMaxL * 1000;
      if (idealVolume) idealVolume.textContent = fmtRange(vMinML, vMaxML, "mL", 0);
    } else {
      if (idealVolume) idealVolume.textContent = "—";
    }
  }

  function computeStatusText() {
    const t = targets();

    if (state.tasksDone[state.pigment]) {
      return "Cor já concluída. Selecione uma cor pendente para continuar.";
    }

    const concOk = state.conc >= t.concMin && state.conc <= t.concMax;
    if (!concOk) return `Concentração fora da faixa (${t.concMin}–${t.concMax} g/L). Ajuste massa/volume.`;

    const phOk = phInRange(state.ph, t.phMin, t.phMax);
    if (!phOk) return `pH fora do alvo (${t.phMin.toFixed(1)}–${t.phMax.toFixed(1)}). Limão ↓ pH | Bicarbonato ↑ pH.`;

    if (t.requireMeio && state.meio !== t.requireMeio) {
      return "Meio incorreto. Para URUCUM, use Óleo/resina (obrigatório).";
    }

    if (!t.requireMeio && t.recommendedMeio && state.meio !== t.recommendedMeio) {
      return "Dentro do alvo, mas recomenda-se Água para esta cor.";
    }

    return "Dentro da meta. Pode aplicar.";
  }

  // =========================
  // FIT: CANVAS + MÁSCARA (PINTAR SÓ A BLUSA)
  // =========================
  const fitState = {
    baseOk: false,
    w: 1,
    h: 1,
    lastHex: "#999999"
  };

  const dressMask = {
    ok: false,
    canvas: document.createElement("canvas"),
    ctx: null
  };
  dressMask.ctx = dressMask.canvas.getContext("2d", { willReadFrequently: true });

  const tmpLayer = {
    canvas: document.createElement("canvas"),
    ctx: null
  };
  tmpLayer.ctx = tmpLayer.canvas.getContext("2d", { willReadFrequently: false });

  function buildBlouseMaskFromImage() {
    if (!fitBase || !fitBase.naturalWidth) {
      dressMask.ok = false;
      return;
    }

    const iw = fitBase.naturalWidth;
    const ih = fitBase.naturalHeight;

    dressMask.canvas.width = iw;
    dressMask.canvas.height = ih;

    const mctx = dressMask.ctx;
    mctx.clearRect(0, 0, iw, ih);
    mctx.drawImage(fitBase, 0, 0);

    const img = mctx.getImageData(0, 0, iw, ih);
    const d = img.data;

    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a < 10) {
        d[i + 3] = 0;
        continue;
      }

      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);

      const v = max / 255;
      const sat = (max === 0) ? 0 : (max - min) / max;

      const isBlouse =
        (v >= 0.80 && sat <= 0.25) ||
        (v >= 0.70 && sat <= 0.14);

      if (isBlouse) {
        d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = 255;
      } else {
        d[i + 3] = 0;
      }
    }

    mctx.putImageData(img, 0, 0);
    dressMask.ok = true;
  }

  function resizeFitCanvas() {
    if (!fitCanvas || !fitWrap || !fitCtx) return;

    const rect = fitWrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    fitState.w = Math.max(1, Math.round(rect.width));
    fitState.h = Math.max(1, Math.round(rect.height));

    fitCanvas.width = Math.max(1, Math.round(rect.width * dpr));
    fitCanvas.height = Math.max(1, Math.round(rect.height * dpr));

    fitCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawFitCanvas(fitState.lastHex, 0.85);
  }

  function drawFitCanvas(hex, alpha = 0.85) {
    if (!fitCanvas || !fitCtx) return;
    fitState.lastHex = hex;

    const cw = fitState.w;
    const ch = fitState.h;

    fitCtx.clearRect(0, 0, cw, ch);

    if (!fitState.baseOk || !fitBase?.naturalWidth) {
      if (fitFallback) fitFallback.style.display = "grid";

      fitCtx.save();
      fitCtx.fillStyle = "rgba(255,255,255,.22)";
      fitCtx.fillRect(10, 10, cw - 20, ch - 20);

      fitCtx.globalAlpha = 0.95;
      fitCtx.fillStyle = hex;
      fitCtx.fillRect(28, 44, cw - 56, ch - 88);

      fitCtx.globalAlpha = 1;
      fitCtx.fillStyle = "rgba(43,36,23,.78)";
      fitCtx.font = "800 14px Inter, system-ui, sans-serif";
      fitCtx.textAlign = "center";
      fitCtx.fillText("Prévia local (carregue vestido.png)", cw / 2, ch - 18);
      fitCtx.restore();
      return;
    }

    if (fitFallback) fitFallback.style.display = "none";

    const iw = fitBase.naturalWidth;
    const ih = fitBase.naturalHeight;
    const scale = Math.min(cw / iw, ch / ih);
    const dw = Math.round(iw * scale);
    const dh = Math.round(ih * scale);
    const dx = Math.round((cw - dw) / 2);
    const dy = Math.round((ch - dh) / 2);

    fitCtx.globalCompositeOperation = "source-over";
    fitCtx.globalAlpha = 1;
    fitCtx.drawImage(fitBase, dx, dy, dw, dh);

    if (dressMask.ok) {
      tmpLayer.canvas.width = cw;
      tmpLayer.canvas.height = ch;

      const tctx = tmpLayer.ctx;
      tctx.clearRect(0, 0, cw, ch);

      tctx.globalCompositeOperation = "source-over";
      tctx.globalAlpha = 1;
      tctx.drawImage(fitBase, dx, dy, dw, dh);

      tctx.globalCompositeOperation = "multiply";
      tctx.globalAlpha = alpha;
      tctx.fillStyle = hex;
      tctx.fillRect(0, 0, cw, ch);

      tctx.globalCompositeOperation = "destination-in";
      tctx.globalAlpha = 1;
      tctx.drawImage(dressMask.canvas, dx, dy, dw, dh);

      fitCtx.globalCompositeOperation = "source-over";
      fitCtx.globalAlpha = 1;
      fitCtx.drawImage(tmpLayer.canvas, 0, 0);
      return;
    }

    fitCtx.globalCompositeOperation = "multiply";
    fitCtx.globalAlpha = alpha;
    fitCtx.fillStyle = hex;
    fitCtx.fillRect(0, 0, cw, ch);

    fitCtx.globalCompositeOperation = "destination-in";
    fitCtx.globalAlpha = 1;
    fitCtx.drawImage(dressMask.canvas, dx, dy, dw, dh);

    fitCtx.globalCompositeOperation = "source-over";
  }

  function updateColorUI() {
    const ph = estimatePH();

    let c;
    if (state.pigment === "repolho") c = repolhoColorByPH(ph);
    else if (state.pigment === "curcuma") c = curcumaColorByPH(ph);
    else c = urucumColor();

    if (swatch) swatch.style.background = c.hex;
    if (outCorNome) outCorNome.textContent = c.name;

    drawFitCanvas(c.hex, alphaFromConc());
  }

  // =========================
  // CONTROLES DE FLUXO
  // =========================
  function syncFromUI() {
    if (selMeio) state.meio = selMeio.value;
    if (rngAcido) state.acido = parseFloat(rngAcido.value);
    if (rngBase) state.base = parseFloat(rngBase.value);

    calcConc();
    estimatePH();
  }

  function decoratePigmentOptions() {
    if (!selPigmento) return;
    [...selPigmento.options].forEach((opt) => {
      const v = opt.value;
      if (!PIGMENTS.includes(v)) return;

      const baseText = opt.textContent.replace(/\s+\(conclu[ií]do\)$/i, "");
      const done = !!state.tasksDone[v];

      opt.textContent = done ? `${baseText} (concluído)` : baseText;
      opt.disabled = done;
    });
  }

  function applyRecommendedMediumForPigment(pigment) {
    const t = getTargetsFor(pigment);
    if (!selMeio) return;

    if (t.requireMeio === "oleo") {
      selMeio.value = "oleo";
      state.meio = "oleo";
      return;
    }

    if (selMeio.value === "oleo") {
      selMeio.value = "agua";
      state.meio = "agua";
    }
  }

  function setTopbarForCurrentPigment() {
    if (!topbarText) return;
    const t = targets();

    const doneCount = Object.values(state.tasksDone).filter(Boolean).length;
    const remain = 3 - doneCount;

    topbarText.textContent =
      `Escolha a cor que quer fazer e cumpra a meta: ${t.text}. ` +
      `Cores concluídas: ${doneCount}/3${remain ? ` (faltam ${remain})` : ""}.`;
  }

  // =========================
  // POPUP FINAL + FOGOS (CONTÍNUOS E LEVES)
  // =========================
  function injectWinStylesOnce() {
    if (document.getElementById("winPopupStyles")) return;

    const style = document.createElement("style");
    style.id = "winPopupStyles";
    style.textContent = `
      .win-overlay{
        position:fixed; inset:0;
        display:flex; align-items:center; justify-content:center;
        background: rgba(10,10,14,.35);
        z-index: 99999;
        overflow:hidden;
      }

      .win-fire{
        position:absolute; inset:0;
        width:100%; height:100%;
        z-index: 0;
        pointer-events:none;
      }

      .win-card{
        position:relative;
        z-index: 2;
        width:min(520px, calc(100vw - 28px));
        border-radius: 18px;
        padding: 18px 18px 16px;
        background: rgba(18,18,24,.92);
        border: 1px solid rgba(255,255,255,.10);
        box-shadow: 0 18px 60px rgba(0,0,0,.55);
        color:#fff;
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        overflow:hidden;
      }
      .win-title{
        margin: 6px 0 6px;
        font-size: 22px;
        font-weight: 900;
        letter-spacing: .2px;
      }
      .win-text{
        margin: 0 0 14px;
        font-size: 14.5px;
        line-height: 1.45;
        color: rgba(255,255,255,.88);
      }
      .win-actions{
        display:flex;
        gap:10px;
        justify-content:flex-end;
        margin-top: 10px;
      }
      .win-btn{
        appearance:none;
        border:0;
        border-radius: 12px;
        padding: 10px 14px;
        font-weight: 800;
        cursor:pointer;
      }
      .win-btn-primary{
        background: rgba(110,168,254, .95);
        color:#0a0a0f;
      }
      .win-close{
        position:absolute;
        top:10px; right:10px;
        width: 34px; height: 34px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.08);
        color:#fff;
        font-size: 18px;
        line-height: 1;
        cursor:pointer;
      }
      @media (max-width: 420px){
        .win-title{ font-size:20px; }
        .win-actions{ flex-direction: column; }
        .win-btn{ width:100%; }
      }
    `;
    document.head.appendChild(style);
  }

  function makeFireworks(canvas) {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const ctx = canvas.getContext("2d", { alpha: true });

    let raf = 0;
    let alive = true;

    let W = 0;
    let H = 0;
    let dpr = 1;

    const particles = [];
    const maxParticles = reduceMotion ? 260 : 440;

    const gravity = 0.040;
    const drag = 0.988;
    const alphaDecay = 0.986;

    let nextSpawn = 0;
    let lastDraw = 0;

    const fps = reduceMotion ? 20 : 30;
    const frameMS = 1000 / fps;

    function rand(a, b) { return a + Math.random() * (b - a); }
    function randi(a, b) { return Math.floor(rand(a, b + 1)); }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      W = window.innerWidth;
      H = window.innerHeight;

      canvas.width = Math.max(1, Math.floor(W * dpr));
      canvas.height = Math.max(1, Math.floor(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
    }

    function burst(x, y) {
      const hue = rand(0, 360);
      const count = reduceMotion ? randi(14, 20) : randi(26, 38);

      for (let i = 0; i < count; i++) {
        const ang = rand(0, Math.PI * 2);
        const spd = reduceMotion ? rand(1.6, 3.0) : rand(1.8, 3.8);

        particles.push({
          x, y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: reduceMotion ? randi(26, 34) : randi(36, 54),
          size: reduceMotion ? rand(1.3, 2.2) : rand(1.6, 2.8),
          hue: hue + rand(-18, 18),
          alpha: reduceMotion ? rand(0.70, 0.90) : rand(0.78, 0.98),
        });
      }

      if (particles.length > maxParticles) {
        particles.splice(0, particles.length - maxParticles);
      }
    }

    function spawn() {
      const x = rand(W * 0.14, W * 0.86);
      const y = rand(H * 0.14, H * 0.46);
      burst(x, y);
    }

    function step(ts) {
      if (!alive) return;
      raf = requestAnimationFrame(step);

      if (!lastDraw) {
        lastDraw = ts;
        nextSpawn = ts + rand(240, 520);
      }

      const elapsed = ts - lastDraw;
      if (elapsed < frameMS) return;

      const dt = Math.min(3, elapsed / 16.666);
      lastDraw = ts;

      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";

      if (ts >= nextSpawn) {
        spawn();
        nextSpawn = ts + (reduceMotion ? rand(700, 1050) : rand(360, 650));
      }

      const dragPow = Math.pow(drag, dt);
      const decayPow = Math.pow(alphaDecay, dt);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.vx *= dragPow;
        p.vy = p.vy * dragPow + gravity * dt;

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        p.life -= dt;
        p.alpha *= decayPow;

        if (p.life <= 0 || p.alpha <= 0.05 || p.y > H + 80 || p.x < -80 || p.x > W + 80) {
          particles.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = `hsla(${p.hue}, 92%, 62%, 1)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    resize();
    window.addEventListener("resize", resize);

    spawn();
    if (!reduceMotion) spawn();

    raf = requestAnimationFrame(step);

    return {
      stop() {
        if (!alive) return;
        alive = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        try { ctx.clearRect(0, 0, W, H); } catch (_) {}
      }
    };
  }

  // =========================
  // VÍDEO FINAL (estilo 2ª foto)
  // - mantém o HEADER (topbar)
  // - esconde stagebar + main
  // - cria uma “tela” grande com o vídeo
  // =========================
  function openFinalVideoScene() {
    // evita duplicar
    const existing = document.querySelector(".video-scene");
    if (existing) {
      const v = existing.querySelector("video");
      if (v) {
        v.currentTime = 0;
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => (v.controls = true));
      }
      return;
    }

    document.body.classList.add("video-mode");

    const wrap = document.createElement("div");
    wrap.className = "video-scene";
    wrap.innerHTML = `
      <div class="video-shell">
        <video class="final-video" id="finalVideo" playsinline preload="auto"></video>
      </div>
    `;
    document.body.appendChild(wrap);

    const video = wrap.querySelector("#finalVideo");
    video.src = FINAL_VIDEO_SRC;

    // visual limpo
    video.controls = false;

    // com clique do usuário, normalmente toca com som
    video.muted = false;
    video.volume = 1;

    video.addEventListener("ended", () => {
      window.location.href = NEXT_AFTER_VIDEO_URL;
    });

    const p = video.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        // fallback se o navegador implicar: libera controles
        video.controls = true;
      });
    }
  }

  function showWinPopup() {
    if (state.winShown) return;
    state.winShown = true;

    if (achievement) {
      achievement.hidden = true;
      achievement.textContent = "";
    }

    injectWinStylesOnce();

    const overlay = document.createElement("div");
    overlay.className = "win-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const fire = document.createElement("canvas");
    fire.className = "win-fire";

    const card = document.createElement("div");
    card.className = "win-card";
    card.innerHTML = `
      <button class="win-close" type="button" aria-label="Fechar">×</button>
      <div class="win-title">Parabéns!</div>
      <div class="win-text">Você coloriu o traje para festa do bumba meu boi.</div>
      <div class="win-actions">
        <button class="win-btn win-btn-primary" type="button" data-action="advance">Hora de aproveitar a festa do bumba</button>
      </div>
    `;

    overlay.appendChild(fire);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const fx = makeFireworks(fire);

    function cleanup() {
      fx?.stop?.();
      document.removeEventListener("keydown", onKey);
      overlay.remove();
    }

    function onKey(e) {
      if (e.key === "Escape") cleanup();
    }
    document.addEventListener("keydown", onKey);

    card.querySelector(".win-close")?.addEventListener("click", cleanup);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup();
    });

    card.querySelector('[data-action="advance"]')?.addEventListener("click", () => {
      cleanup();
      openFinalVideoScene();
    });

    card.querySelector('[data-action="advance"]')?.focus();
  }

  function render() {
    if (chipStep) chipStep.textContent = `Etapa: ${state.step}`;
    if (chipErrors) chipErrors.textContent = `Erros: ${state.errors}`;

    if (outAcido) outAcido.textContent = prettyDose(state.acido);
    if (outBase) outBase.textContent = prettyDose(state.base);

    if (outConc) outConc.textContent = state.conc ? state.conc.toFixed(1) : "—";
    if (outPH) outPH.textContent = state.ph.toFixed(1);
    if (outPHBig) outPHBig.textContent = state.ph.toFixed(1);

    updateIdealBands();
    updateColorUI();

    const t = targets();
    if (outGoal) outGoal.textContent = state.goal;
    if (outTargetPH) outTargetPH.textContent = t.text;
    if (outStatus) outStatus.textContent = computeStatusText();

    const doneCount = Object.values(state.tasksDone).filter(Boolean).length;
    const pct = (doneCount / 3) * 100;
    setProgress(pct, `Cores concluídas: ${doneCount}/3`);

    if (achievement) {
      achievement.hidden = true;
      achievement.textContent = "";
    }

    decoratePigmentOptions();
  }

  function validateAndApply() {
    if (state.tasksDone[state.pigment]) {
      const pending = PIGMENTS.filter((p) => !state.tasksDone[p]);
      if (pending.length > 0) {
        const msg = "Essa cor já foi concluída. Selecione uma cor pendente para continuar.";
        showToast(msg, "bad");
        if (topbarText) topbarText.textContent = msg;
        state.step = "Seleção do pigmento";
        render();
        return false;
      }
    }

    syncFromUI();

    const t = targets();

    const concOk = state.conc >= t.concMin && state.conc <= t.concMax;
    const phOk = phInRange(state.ph, t.phMin, t.phMax);
    const meioOk = !t.requireMeio || state.meio === t.requireMeio;

    if (!concOk || !phOk || !meioOk) {
      state.errors += 1;

      let msgBad = "";
      if (!concOk) {
        msgBad = `Concentração fora da faixa. Mantenha entre ${t.concMin} e ${t.concMax} g/L.`;
      } else if (!phOk) {
        msgBad = `pH fora do alvo. Busque pH ${t.phMin.toFixed(1)}–${t.phMax.toFixed(1)} com limão/bicarbonato.`;
      } else {
        msgBad = "Meio incorreto. Para URUCUM, use Óleo/resina (obrigatório).";
      }

      showToast(msgBad, "bad");
      logDiary(`Tentativa com falha (${t.name}): ${msgBad}`);

      if (topbarText) topbarText.textContent = "Ajuste os parâmetros (pH, concentração e/ou meio) e tente novamente.";
      state.step = "Ajuste de pH";
      render();
      return false;
    }

    state.step = "Aplicação";

    const alreadyDone = !!state.tasksDone[state.pigment];
    state.tasksDone[state.pigment] = true;

    logDiary(
      `${alreadyDone ? "Reaplicação" : "Etapa concluída"}: ${t.name} ` +
      `(pH ${state.ph.toFixed(1)}, C ${state.conc.toFixed(1)} g/L, meio: ${state.meio}).`
    );

    const hex = readHexFromSwatch() || "#999999";
    drawFitCanvas(hex, 0.98);

    const doneCount = Object.values(state.tasksDone).filter(Boolean).length;

    if (doneCount < 3) {
      const msg = "Cor aplicada com sucesso. Escolha outra cor pendente no seletor para continuar.";
      showToast(msg, "good");
      if (topbarText) topbarText.textContent = msg;
    } else {
      const msgFinal = "Parabéns! Você concluiu as 3 cores com sucesso.";
      showToast(msgFinal, "good");
      if (topbarText) topbarText.textContent = msgFinal;
      logDiary("Conclusão: repolho roxo, cúrcuma e urucum finalizados.");

      showWinPopup();
    }

    render();
    return true;
  }

  // =========================
  // AJUSTES VISUAIS (sem mexer no HTML)
  // =========================
  function applySliderLabels() {
    const fieldAcido = rngAcido?.closest(".field");
    const fieldBase = rngBase?.closest(".field");

    const lblAcido = fieldAcido?.querySelector(".label");
    const lblBase = fieldBase?.querySelector(".label");

    if (lblAcido) lblAcido.textContent = "Quantidade de Limão (Meio Ácido)";
    if (lblBase) lblBase.textContent = "Quantidade de Bicarbonato (Meio Básico)";
  }

  // =========================
  // INIT + EVENTOS
  // =========================
  function init() {
    btnReiniciar?.addEventListener("click", () => location.reload());

    applySliderLabels();

    if (fitBase) {
      fitBase.addEventListener("load", () => {
        fitState.baseOk = true;
        buildBlouseMaskFromImage();
        resizeFitCanvas();
      });
      fitBase.addEventListener("error", () => {
        fitState.baseOk = false;
        dressMask.ok = false;
        resizeFitCanvas();
      });

      if (fitBase.complete && fitBase.naturalWidth > 0) {
        fitState.baseOk = true;
        buildBlouseMaskFromImage();
      }
    }

    window.addEventListener("resize", () => resizeFitCanvas());

    if (helpPigmento) {
      helpPigmento.textContent =
        "Você pode escolher qualquer cor para começar. A meta e as dicas mudam conforme o pigmento selecionado.";
    }

    selPigmento?.addEventListener("change", () => {
      const v = selPigmento.value;
      if (!PIGMENTS.includes(v)) return;

      if (state.tasksDone[v]) {
        const msg = "Essa cor já foi concluída. Selecione uma cor pendente.";
        showToast(msg, "bad");
        if (topbarText) topbarText.textContent = msg;
        return;
      }

      state.pigment = v;

      state.acido = 0;
      state.base = 0;
      if (rngAcido) rngAcido.value = "0";
      if (rngBase) rngBase.value = "0";

      applyRecommendedMediumForPigment(v);

      state.step = "Seleção do pigmento";
      updateGoalText();
      updateExplanations();
      calcConc();
      estimatePH();
      setTopbarForCurrentPigment();
      render();
    });

    selMeio?.addEventListener("change", () => {
      state.meio = selMeio.value;
      state.step = "Ajuste de pH";
      render();
    });

    inpMassa?.addEventListener("input", () => {
      state.step = "Preparação da solução";
      calcConc();
      render();
    });

    inpVolume?.addEventListener("input", () => {
      state.step = "Preparação da solução";
      calcConc();
      render();
    });

    rngAcido?.addEventListener("input", () => {
      state.step = "Ajuste de pH";
      state.acido = parseFloat(rngAcido.value);
      render();
    });

    rngBase?.addEventListener("input", () => {
      state.step = "Ajuste de pH";
      state.base = parseFloat(rngBase.value);
      render();
    });

    btnPintar?.addEventListener("click", () => {
      const oldText = btnPintar.textContent;
      try {
        btnPintar.disabled = true;
        btnPintar.textContent = "Aplicando...";
        validateAndApply();
      } finally {
        btnPintar.disabled = false;
        btnPintar.textContent = oldText;
      }
    });

    state.pigment = selPigmento?.value && PIGMENTS.includes(selPigmento.value)
      ? selPigmento.value
      : "repolho";

    state.meio = selMeio?.value ?? "agua";
    state.acido = parseFloat(rngAcido?.value ?? "0");
    state.base = parseFloat(rngBase?.value ?? "0");

    applyRecommendedMediumForPigment(state.pigment);

    updateGoalText();
    updateExplanations();
    calcConc();
    estimatePH();
    updateIdealBands();

    logDiary("Início do preparo: escolha um pigmento, ajuste concentração e pH conforme a meta e aplique no vestido.");
    setTopbarForCurrentPigment();

    resizeFitCanvas();
    render();
  }

  init();

  function applyCompactMode() {
    const h = window.innerHeight;
    const compact = h < 820;
    document.documentElement.classList.toggle("ui-compact", compact);
  }

  window.addEventListener("resize", applyCompactMode);
  applyCompactMode();

})();
