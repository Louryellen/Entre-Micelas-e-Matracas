(() => {
  "use strict";

  const $ = (q) => document.querySelector(q);

  const btnReiniciar = $("#btnReiniciar");
  const topbarText = $("#topbarText");

  const chipStep = $("#chipStep");
  const chipErrors = $("#chipErrors");
  const chipGoal = $("#chipGoal");
  const chipInfo = $("#chipInfo");

  const selPigmento = $("#selPigmento");
  const selMeio = $("#selMeio");
  const helpMeio = $("#helpMeio");

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

  const btnPintar = $("#btnPintar");

  const diaryList = $("#diaryList");
  const progressFill = $("#progressFill");
  const progressLabel = $("#progressLabel");
  const achievement = $("#achievement");

  const colorOverlay = $("#colorOverlay");
  const dressTint = $("#dressTint");
  const dressFallback = $("#dressFallback");
  const imgDress = $("#imgDress");

  const toast = $("#toast");

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
    tasksDone: {
      repolho: false,
      curcuma: false,
      urucum: false
    }
  };

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function showToast(msg, type = "good"){
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => (toast.hidden = true), 1800);
  }

  function logDiary(text){
    const li = document.createElement("li");
    li.className = "diary-item";
    li.textContent = text;
    diaryList.appendChild(li);
    diaryList.scrollIntoView({ block: "end" });
  }

  function setProgress(pct, label){
    progressFill.style.width = `${clamp(pct, 0, 100)}%`;
    if (label) progressLabel.textContent = label;
  }

  // Mapas de cor (didáticos)
  function repolhoColorByPH(ph){
    // faixas típicas de antocianina (simplificado)
    if (ph <= 3.0) return { hex:"#b10f2e", name:"Vermelho (ácido forte)" };
    if (ph <= 5.0) return { hex:"#7a1fa2", name:"Roxo (ácido)" };
    if (ph <= 7.0) return { hex:"#7b5bbd", name:"Lilás (próximo do neutro)" };
    if (ph <= 9.0) return { hex:"#2f63c8", name:"Azul (básico)" };
    return { hex:"#2a8a3a", name:"Verde (básico forte)" };
  }

  function curcumaColorByPH(ph){
    // curcumina: amarelo → alaranjado em meio básico (simplificado)
    if (ph < 7.5) return { hex:"#f1c40f", name:"Amarelo (ácido/neutro)" };
    if (ph < 9.0) return { hex:"#f39c12", name:"Amarelo-alaranjado (levemente básico)" };
    return { hex:"#e67e22", name:"Alaranjado (básico)" };
  }

  function urucumColor(){
    // bixina (apolar): cor intensa, pouco dependente de pH
    return { hex:"#c0392b", name:"Vermelho/alaranjado intenso (apolar)" };
  }

  function estimatePH(){
    // Modelo didático: parte de 7.0 e desloca com (base - ácido).
    // Ajuste fino por pigmento só para feedback (sem “química pesada”).
    const delta = (state.base - state.acido) * 0.35; // 0..14 vira ~0..4.9
    let ph = 7.0 + delta;

    // O meio oleoso “diminui” efeito perceptível de pH no jogo (didático)
    if (state.meio === "oleo") ph = 7.0 + delta * 0.6;

    ph = clamp(ph, 2.0, 12.0);
    state.ph = ph;
    return ph;
  }

  function calcConc(){
    const m = parseFloat(inpMassa.value || "0");
    const vml = parseFloat(inpVolume.value || "0");
    const vl = vml / 1000;

    const conc = (vl > 0) ? (m / vl) : 0; // g/L
    state.conc = conc;
    return conc;
  }

  function updateGoalText(){
    if (state.pigment === "repolho"){
      state.goal = "Roxo vivo (pH 5–6)";
    } else if (state.pigment === "curcuma"){
      state.goal = "Amarelo forte (pH < 7,5)";
    } else {
      state.goal = "Urucum em meio oleoso";
    }
  }

  function updateExplanations(){
    if (state.pigment === "repolho"){
      miniExp.textContent = "Repolho roxo: antocianinas mudam de cor com pH (indicador natural).";
    } else if (state.pigment === "curcuma"){
      miniExp.textContent = "Cúrcuma: curcumina tende a mudar para tons alaranjados em meio básico.";
    } else {
      miniExp.textContent = "Urucum: bixina é apolar; a cor depende mais do meio (óleo/resina) do que do pH.";
    }

    helpMeio.textContent = (state.pigment === "urucum")
      ? "Dica: para urucum, selecione Óleo/resina para melhor extração (apolar)."
      : "Dica: para repolho e cúrcuma, Água funciona bem como meio.";
  }

  function updateColorUI(){
    const ph = estimatePH();

    let c;
    if (state.pigment === "repolho") c = repolhoColorByPH(ph);
    else if (state.pigment === "curcuma") c = curcumaColorByPH(ph);
    else c = urucumColor();

    swatch.style.background = c.hex;
    outCorNome.textContent = c.name;

    // overlays (visual)
    colorOverlay.style.background = c.hex;
    dressTint.style.background = c.hex;

    // aplica overlay com opacidade moderada
    const overlayStrength = (state.pigment === "urucum") ? 0.20 : 0.24;
    colorOverlay.style.opacity = String(overlayStrength);
    dressTint.style.opacity = String(overlayStrength);

    // fallback do vestido se imagem não carregar
    if (imgDress && imgDress.style.display === "none") {
      dressFallback.style.display = "grid";
    } else {
      dressFallback.style.display = "none";
    }
  }

  function render(){
    // chips
    chipStep.textContent = `Etapa: ${state.step}`;
    chipErrors.textContent = `Erros: ${state.errors}`;
    chipGoal.textContent = `Meta: ${state.goal}`;
    chipInfo.textContent = `pH: ${state.ph.toFixed(1)}`;

    // sliders
    outAcido.textContent = String(state.acido);
    outBase.textContent = String(state.base);

    // conc
    outConc.textContent = state.conc ? state.conc.toFixed(1) : "—";
    outPH.textContent = state.ph.toFixed(1);

    // progresso simples por etapa
    let pct = 10;
    if (state.step === "Preparação da solução") pct = 35;
    if (state.step === "Ajuste de pH") pct = 65;
    if (state.step === "Aplicação") pct = 90;
    setProgress(pct, "Progresso do preparo");

    updateColorUI();

    // conquista
    const allDone = Object.values(state.tasksDone).every(Boolean);
    achievement.hidden = !allDone;
  }

  function validateAndApply(){
    // regras didáticas (ajuste depois se quiser mais rígido)
    const ph = state.ph;
    const concOk = state.conc >= 5 && state.conc <= 25; // faixa “didática” de concentração

    let ok = false;
    let msgOk = "";
    let msgBad = "";

    if (!concOk){
      ok = false;
      msgBad = "Concentração fora da faixa. Ajuste massa/volume (g/L).";
    } else if (state.pigment === "repolho"){
      ok = (ph >= 5.0 && ph <= 6.2);
      msgOk = "Roxo obtido. Indicador natural bem ajustado.";
      msgBad = "Tom fora do alvo. Para roxo vivo, busque pH ~5–6.";
    } else if (state.pigment === "curcuma"){
      ok = (ph < 7.5);
      msgOk = "Amarelo preservado. Meio pouco básico.";
      msgBad = "A cúrcuma alaranjou. Reduza a base para pH < 7,5.";
    } else {
      // urucum: exige meio oleoso; pH pouco relevante
      ok = (state.meio === "oleo");
      msgOk = "Extração adequada: urucum em meio oleoso.";
      msgBad = "Urucum precisa de meio oleoso (apolar). Troque o solvente.";
    }

    if (ok){
      state.step = "Aplicação";
      state.tasksDone[state.pigment] = true;

      logDiary(`Aplicação concluída com sucesso: ${state.pigment.toUpperCase()} (pH ${ph.toFixed(1)}, C ${state.conc.toFixed(1)} g/L, meio: ${state.meio}).`);
      showToast(msgOk, "good");
      topbarText.textContent = "Aplicação realizada. Se quiser, escolha outro pigmento e repita para completar a conquista.";

      // feedback visual extra: aumenta um pouco a intensidade após aplicar
      dressTint.style.opacity = "0.32";
      colorOverlay.style.opacity = "0.28";

    } else {
      state.errors += 1;
      showToast(msgBad, "bad");
      logDiary(`Tentativa com falha: ${msgBad}`);
      topbarText.textContent = "Ajuste os parâmetros (pH, concentração e/ou meio) e tente novamente.";
      state.step = "Ajuste de pH";
    }

    render();
  }

  function onStartLike(){
    state.step = "Seleção do pigmento";
    updateGoalText();
    calcConc();
    estimatePH();
    updateExplanations();
    logDiary("Início do preparo: selecione pigmento, defina massa/volume e ajuste ácido/base.");
    topbarText.textContent = "Defina pigmento, solvente e concentração. Depois ajuste ácido/base para atingir a meta.";
    render();
  }

  // Eventos
  btnReiniciar?.addEventListener("click", () => location.reload());

  selPigmento?.addEventListener("change", () => {
    state.pigment = selPigmento.value;
    state.step = "Seleção do pigmento";
    updateGoalText();
    updateExplanations();
    render();
  });

  selMeio?.addEventListener("change", () => {
    state.meio = selMeio.value;
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
    state.acido = parseInt(rngAcido.value, 10);
    render();
  });

  rngBase?.addEventListener("input", () => {
    state.step = "Ajuste de pH";
    state.base = parseInt(rngBase.value, 10);
    render();
  });

  btnPintar?.addEventListener("click", () => validateAndApply());

  // init
  state.pigment = selPigmento.value;
  state.meio = selMeio.value;
  state.acido = parseInt(rngAcido.value, 10);
  state.base = parseInt(rngBase.value, 10);
  updateGoalText();
  updateExplanations();
  calcConc();
  estimatePH();
  onStartLike();
})();
