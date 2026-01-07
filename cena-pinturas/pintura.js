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
  const chipGoal = $("#chipGoal");
  const chipInfo = $("#chipInfo");

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

  const btnPintar = $("#btnPintar");

  const diaryList = $("#diaryList");
  const progressFill = $("#progressFill");
  const progressLabel = $("#progressLabel");
  const achievement = $("#achievement");

  const toast = $("#toast");

  // Canvas do vestido (preview)
  const fitCanvas = $("#fitCanvas");
  const fitWrap = $("#fitWrap");
  const fitBase = $("#fitBase"); // vestido.png
  const fitFallback = $("#fitFallback");
  const fitCtx = fitCanvas?.getContext("2d", { willReadFrequently: false });

  // =========================
  // CONSTANTES DIDÁTICAS
  // =========================
  const CONC_MIN = 5;     // g/L (faixa ideal mínima)
  const CONC_MAX = 25;    // g/L (faixa ideal máxima)

  const DOSE_MAX = 10;                // sliders (0..10) = “dose”
  const PH_RANGE_HALF = 7;            // 7 unidades para cima/baixo do neutro
  const PH_FACTOR = PH_RANGE_HALF / DOSE_MAX; // 0.7

  const PIGMENT_ORDER = ["repolho", "curcuma", "urucum"];

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

  // =========================
  // MAPAS DE COR (DIDÁTICOS)
  // =========================
  function repolhoColorByPH(ph) {
    if (ph <= 3.0) return { hex: "#b10f2e", name: "Vermelho (ácido forte)" };
    if (ph <= 5.0) return { hex: "#7a1fa2", name: "Roxo (ácido)" };
    if (ph <= 7.0) return { hex: "#7b5bbd", name: "Lilás (próximo do neutro)" };
    if (ph <= 9.0) return { hex: "#2f63c8", name: "Azul (básico)" };
    return { hex: "#2a8a3a", name: "Verde (básico forte)" };
  }

  function curcumaColorByPH(ph) {
    if (ph < 7.5) return { hex: "#f1c40f", name: "Amarelo (ácido/neutro)" };
    if (ph < 9.0) return { hex: "#f39c12", name: "Amarelo-alaranjado (levemente básico)" };
    return { hex: "#e67e22", name: "Alaranjado (básico)" };
  }

  function urucumColor() {
    return { hex: "#c0392b", name: "Vermelho/alaranjado intenso (apolar)" };
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
    tasksDone: { repolho: false, curcuma: false, urucum: false }
  };

  function estimatePH() {
    // dose 0..10 (não é pH)
    const delta = (state.base - state.acido) * PH_FACTOR; // -7..+7
    let ph = 7.0 + delta;

    // em óleo/resina, efeito de ácido/base é amortecido (didático)
    if (state.meio === "oleo") ph = 7.0 + delta * 0.6;

    ph = clamp(ph, 0.0, 14.0);
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

  function updateIdealBands() {
    if (idealConc) idealConc.textContent = `${CONC_MIN}–${CONC_MAX} g/L`;

    const m = parseFloat(inpMassa?.value || "0");
    const vml = parseFloat(inpVolume?.value || "0");
    const vl = vml / 1000;

    // Massa ideal para o volume atual: m = C * V
    if (vl > 0) {
      const mMin = CONC_MIN * vl;
      const mMax = CONC_MAX * vl;
      if (idealMassa) idealMassa.textContent = fmtRange(mMin, mMax, "g", 2);
    } else {
      if (idealMassa) idealMassa.textContent = "—";
    }

    // Volume ideal para a massa atual: V = m / C
    if (m > 0) {
      const vMinL = m / CONC_MAX;
      const vMaxL = m / CONC_MIN;
      const vMinML = vMinL * 1000;
      const vMaxML = vMaxL * 1000;
      if (idealVolume) idealVolume.textContent = fmtRange(vMinML, vMaxML, "mL", 0);
    } else {
      if (idealVolume) idealVolume.textContent = "—";
    }
  }

  function updateGoalText() {
    if (state.pigment === "repolho") state.goal = "Roxo vivo (pH 5–6) + C 5–25 g/L";
    else if (state.pigment === "curcuma") state.goal = "Amarelo forte (pH < 7,5) + C 5–25 g/L";
    else state.goal = "Urucum em meio oleoso (óleo/resina) + C 5–25 g/L";
  }

  function updateExplanations() {
    if (!miniExp || !helpMeio) return;

    if (state.pigment === "repolho") {
      miniExp.textContent = "Repolho roxo: antocianinas mudam de cor com pH (indicador natural).";
    } else if (state.pigment === "curcuma") {
      miniExp.textContent = "Cúrcuma: curcumina tende a alaranjar em meio básico.";
    } else {
      miniExp.textContent = "Urucum: bixina é apolar; o meio oleoso melhora a extração e intensifica a cor.";
    }

    helpMeio.textContent = (state.pigment === "urucum")
      ? "Dica: para urucum, selecione Óleo/resina para melhor extração (apolar)."
      : "Dica: para repolho e cúrcuma, Água funciona bem como meio.";
  }

  function alphaFromConc() {
    // Mapeia conc para alpha: 0.35..1.0 (saturação visual didática)
    const a = state.conc / CONC_MAX;
    return clamp(a, 0.35, 1.0);
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

    // base
    fitCtx.globalCompositeOperation = "source-over";
    fitCtx.globalAlpha = 1;
    fitCtx.drawImage(fitBase, dx, dy, dw, dh);

    // colorir apenas blusa (máscara)
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

    // fallback (pinta tudo)
    fitCtx.globalCompositeOperation = "multiply";
    fitCtx.globalAlpha = alpha;
    fitCtx.fillStyle = hex;
    fitCtx.fillRect(0, 0, cw, ch);

    fitCtx.globalCompositeOperation = "destination-in";
    fitCtx.globalAlpha = 1;
    fitCtx.drawImage(fitBase, dx, dy, dw, dh);

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

  function lockPigmentSelect() {
    if (!selPigmento) return;
    selPigmento.disabled = true; // evita pular etapas
    if (helpPigmento) helpPigmento.textContent = "Etapas em sequência: conclua o pigmento atual para liberar o próximo.";
  }

  function render() {
    if (chipStep) chipStep.textContent = `Etapa: ${state.step}`;
    if (chipErrors) chipErrors.textContent = `Erros: ${state.errors}`;
    if (chipGoal) chipGoal.textContent = `Meta: ${state.goal}`;
    if (chipInfo) chipInfo.textContent = `pH: ${state.ph.toFixed(1)}`;

    if (outAcido) outAcido.textContent = String(state.acido);
    if (outBase) outBase.textContent = String(state.base);

    if (outConc) outConc.textContent = state.conc ? state.conc.toFixed(1) : "—";
    if (outPH) outPH.textContent = state.ph.toFixed(1);

    updateIdealBands();

    let pct = 10;
    if (state.step === "Preparação da solução") pct = 35;
    if (state.step === "Ajuste de pH") pct = 65;
    if (state.step === "Aplicação") pct = 90;
    setProgress(pct, "Progresso do preparo");

    updateColorUI();

    const allDone = Object.values(state.tasksDone).every(Boolean);
    if (achievement) achievement.hidden = !allDone;
  }

  function advanceToNextPigment() {
    const next = PIGMENT_ORDER.find(p => !state.tasksDone[p]);
    if (!next) return null;

    state.pigment = next;
    if (selPigmento) selPigmento.value = next;

    // reseta doses
    state.acido = 0;
    state.base = 0;
    if (rngAcido) rngAcido.value = "0";
    if (rngBase) rngBase.value = "0";

    // meio padrão volta para água; urucum exige o jogador trocar para óleo
    state.meio = "agua";
    if (selMeio) selMeio.value = "agua";

    state.step = "Seleção do pigmento";

    updateGoalText();
    updateExplanations();
    calcConc();
    estimatePH();
    render();

    return next;
  }

  function validateAndApply() {
    const ph = state.ph;
    const concOk = state.conc >= CONC_MIN && state.conc <= CONC_MAX;

    let ok = false;
    let msgBad = "";

    if (!concOk) {
      ok = false;
      msgBad = `Concentração fora da faixa. Mantenha entre ${CONC_MIN} e ${CONC_MAX} g/L.`;
    } else if (state.pigment === "repolho") {
      ok = (ph >= 5.0 && ph <= 6.2);
      msgBad = "Tom fora do alvo. Para roxo vivo, busque pH ~5–6 (ajuste a dose).";
    } else if (state.pigment === "curcuma") {
      ok = (ph < 7.5);
      msgBad = "A cúrcuma alaranjou. Reduza a base para pH < 7,5.";
    } else {
      ok = (state.meio === "oleo");
      msgBad = "Urucum precisa de meio oleoso (apolar). Troque o solvente para Óleo/resina.";
    }

    if (ok) {
      state.step = "Aplicação";
      state.tasksDone[state.pigment] = true;

      logDiary(
        `Etapa concluída: ${state.pigment.toUpperCase()} (pH ${ph.toFixed(1)}, C ${state.conc.toFixed(1)} g/L, meio: ${state.meio}).`
      );

      // aplica cor final com intensidade alta
      const hex = readHexFromSwatch() || "#999999";
      drawFitCanvas(hex, 0.98);

      const allDoneNow = Object.values(state.tasksDone).every(Boolean);

      if (!allDoneNow) {
        const msg = "Parabéns, etapa concluída com sucesso, faça o próximo pigmento.";
        showToast(msg, "good");
        if (topbarText) topbarText.textContent = msg;

        const next = advanceToNextPigment();
        if (next) logDiary(`Próximo desafio: preparar a cor com ${next.toUpperCase()}.`);
      } else {
        const msgFinal = "Parabéns! Você concluiu as 3 cores com sucesso.";
        showToast(msgFinal, "good");
        if (topbarText) topbarText.textContent = msgFinal;
        logDiary("Conclusão: repolho, cúrcuma e urucum finalizados.");
      }

      render();
      return true;
    }

    // falhou
    state.errors += 1;
    showToast(msgBad, "bad");
    logDiary(`Tentativa com falha: ${msgBad}`);
    if (topbarText) topbarText.textContent = "Ajuste os parâmetros (pH, concentração e/ou meio) e tente novamente.";
    state.step = "Ajuste de pH";
    render();
    return false;
  }

  // =========================
  // INIT + EVENTOS
  // =========================
  function init() {
    btnReiniciar?.addEventListener("click", () => location.reload());

    // imagem do vestido (cache/load)
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

    // trava o select de pigmento (sequencial)
    lockPigmentSelect();

    // meio pode mudar livremente
    selMeio?.addEventListener("change", () => {
      state.meio = selMeio.value;
      state.step = "Ajuste de pH";
      render();
    });

    // massa/volume
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

    // dose ácido/base
    rngAcido?.addEventListener("input", () => {
      state.step = "Ajuste de pH";
      state.acido = parseInt(rngAcido.value, 10);
      render();
    });

    rngBase?.addEventListener("input", () => {
      state.step = "Ajuste de pH";
      state.base = parseInt(rngBase.value, 10);
      render();
    });

    // aplicar
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

    // estado inicial (sempre começa no repolho)
    state.pigment = "repolho";
    if (selPigmento) selPigmento.value = "repolho";

    state.meio = selMeio?.value ?? "agua";
    state.acido = parseInt(rngAcido?.value ?? "0", 10);
    state.base = parseInt(rngBase?.value ?? "0", 10);

    updateGoalText();
    updateExplanations();
    calcConc();
    estimatePH();
    updateIdealBands();

    logDiary("Início do preparo: mantenha C entre 5 e 25 g/L e ajuste a dose (limão/bicarbonato).");
    if (topbarText) {
      topbarText.textContent =
        "Desafio 1/3: REPOLHO. Mantenha C entre 5–25 g/L e ajuste o pH (dose) para atingir a meta.";
    }

    resizeFitCanvas();
    render();
  }

  init();
})();
