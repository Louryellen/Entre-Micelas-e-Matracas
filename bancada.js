// =====================
// Utils
// =====================
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function fmt(n, d=2){ return Number(n).toFixed(d); }
function rand(a,b){ return a + Math.random()*(b-a); }
function mean(arr){ return arr.reduce((s,x)=>s+x,0)/Math.max(1,arr.length); }
function sd(arr){
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = mean(arr.map(x => (x-m)*(x-m)));
  return Math.sqrt(v);
}
function jitter(value, amp){
  return value + (Math.random()*2 - 1)*amp;
}

// =====================
// Ajustes finos (mexa aqui)
// =====================

// leitura um pouco mais lenta (sem exagero)
const SPEED_FACTOR = 1.22;

// menos sensível: precisa “permanecer” na zona para engatar
const ZONE_DWELL_MS = 180;

// PONTO ÚNICO na ponta da sonda (fração do bounding box do PNG)
// >>> PARA MOVER A “BOLINHA” (ponta), MUDE TIP_X e TIP_Y AQUI <<<
const TIP_X = 0.19;
const TIP_Y = 0.815;

// =====================
// Ficha final (referência + próxima cena)
// =====================
const NEXT_SCENE_URL = "cena (conversa)/conversa.html"; // <-- TROQUE para o arquivo da próxima cena

const REF_CARD = {
  corpo: "Igarapé",
  regiao: "Maranhão — Nordeste (clima tropical)"
};

// Faixas aceitáveis (da sua ficha)
const ACCEPT = {
  ph: [6.0, 9.0],
  ec: [50, 500],   // µS/cm
  t:  [24, 30]     // °C
};

// Escalas para desenhar a “barra de comparação”
const SCALE = {
  ph: [0, 14],
  ec: [0, 3000],
  t:  [0, 45]
};

// =====================
// “Mundo” (faixas)
// =====================
const SOL = {
  rinse:  { label:"Água destilada", kind:"rinse", ph:7.00, ec:5,    t:26.0 },
  ph7:    { label:"Padrão pH 7.00", kind:"ph",    ph:7.00, ec:80,   t:26.0 },
  ph4:    { label:"Padrão pH 4.01", kind:"ph",    ph:4.01, ec:140,  t:26.0 },
  ec1413: { label:"Padrão 1413",    kind:"ec",    ph:7.00, ec:1413, t:26.0 },

  sample1: { label:"Amostra 1", kind:"sample" },
  sample2: { label:"Amostra 2", kind:"sample" },
  sample3: { label:"Amostra 3", kind:"sample" },

  waste:  { label:"Descarte", kind:"waste" }
};

// pH variável e Amostra 3 tende a mais baixo
const SAMPLES = {
  sample1: { nome:"Amostra 1", faixas: { ph:[5.2,6.2],  ec:[1200,1800], t:[29.0,32.0] } },
  sample2: { nome:"Amostra 2", faixas: { ph:[5.0,5.9],  ec:[1700,2400], t:[30.0,33.5] } },
  sample3: { nome:"Amostra 3", faixas: { ph:[4.7,5.6],  ec:[2200,2900], t:[31.0,35.0] } },
};

const SAMPLE_ORDER = ["sample1","sample2","sample3"];

// =====================
// Elementos
// =====================
const headerEl = $("#appHeader") || document.querySelector("header");
const sceneEl  = $("#scene");
const stage    = $("#stage");
const bg       = $("#bg");

const probe    = $("#probe");
const zones    = $$(".zone");

const hintText  = $("#hintText");
const stepText  = $("#stepText");

const stabBar   = $("#stabBar");
const stabPct   = $("#stabPct");
const stabLabel = $("#stabLabel");

const outPH = $("#outPH");
const outEC = $("#outEC");
const outT  = $("#outT");

const repInfo     = $("#repInfo");
const btnAction   = $("#btnAction");
const btnReset    = $("#btnReset");
const btnRecenter = $("#btnRecenter");

const scoreText   = $("#scoreText");

const diagBox     = $("#diagBox");
const diagPrompt  = $("#diagPrompt");
const diagResult  = $("#diagResult");

const screenEl = document.querySelector(".device-screen");

// =====================
// Estado do jogo
// =====================
const state = {
  step: "rinse1",

  calib: {
    ph: { done:false, a:1, b:0, p1:null, p2:null, quality:0 },
    ec: { done:false, offset:0, quality:0 }
  },

  samples: {
    idx: 0,
    rep: 0,
    data: {
      sample1: { ph:[], ec:[], t:[], stats:null, diag:null, expected:null },
      sample2: { ph:[], ec:[], t:[], stats:null, diag:null, expected:null },
      sample3: { ph:[], ec:[], t:[], stats:null, diag:null, expected:null },
    }
  },

  score: 0,
  currentZone: null,

  // após DESCARTE + ENXÁGUE, para onde vai?
  postRinseNext: null, // "measure" | "diagnose" | null

  stability: {
    active:false,
    zone:null,
    start:0,
    dur:1200,
    stableAt:0,
    raf:0
  },

  drag: {
    active:false,
    pointerId:null,
    startX:0, startY:0,
    baseX:0, baseY:0,
    x:0, y:0
  },

  zoneDetect: {
    candidate: null,
    since: 0,
    raf: 0
  }
};

// =====================
// Layout helpers
// =====================
function syncHeaderH(){
  const h = headerEl?.offsetHeight || 86;
  document.documentElement.style.setProperty("--header-h", `${h}px`);
}

function fitStageToScene(){
  if (!stage || !sceneEl || !bg) return;

  const sr = sceneEl.getBoundingClientRect();
  const iw = bg.naturalWidth  || 0;
  const ih = bg.naturalHeight || 0;
  if (!iw || !ih) return;

  const ar = iw / ih;
  const W = sr.width;
  const H = W / ar;

  stage.style.width  = `${Math.ceil(W)}px`;
  stage.style.height = `${Math.ceil(H)}px`;
}

function viewRectInStage(){
  const sr = stage.getBoundingClientRect();
  const cr = sceneEl.getBoundingClientRect();

  const x0 = Math.max(sr.left,  cr.left);
  const y0 = Math.max(sr.top,   cr.top);
  const x1 = Math.min(sr.right, cr.right);
  const y1 = Math.min(sr.bottom,cr.bottom);

  const left   = (x0 - sr.left);
  const top    = (y0 - sr.top);
  const width  = Math.max(0, x1 - x0);
  const height = Math.max(0, y1 - y0);

  return { left, top, width, height };
}

// =====================
// UI helpers
// =====================
function setHint(msg){ if (hintText) hintText.textContent = msg; }

function updateReadout(ph, ec, t){
  if (outPH) outPH.textContent = (ph == null ? "—" : `${fmt(ph,2)}`);
  if (outEC) outEC.textContent = (ec == null ? "—" : `${Math.round(ec)}`);
  if (outT)  outT.textContent  = (t  == null ? "—" : `${fmt(t,1)} °C`);
}

function updateScore(delta=0){
  state.score += delta;
  if (scoreText) scoreText.textContent = `Pontuação: ${state.score}`;
}

function currentSampleKey(){
  return SAMPLE_ORDER[state.samples.idx] || "sample1";
}
function currentSampleName(){
  const k = currentSampleKey();
  return SOL[k]?.label || SAMPLES[k]?.nome || "Amostra";
}

function setStep(step){
  state.step = step;

  screenEl?.classList.toggle("mode-diagnose", step === "diagnose");

  if (diagBox) diagBox.hidden = (step !== "diagnose");
  if (diagResult) diagResult.textContent = "";

  // Texto do topo
  if (step === "rinse1") stepText.textContent = "1) Enxágue na água destilada.";
  if (step === "ph7")    stepText.textContent = "2) Calibre pH no padrão 7.00.";
  if (step === "rinse2") stepText.textContent = "3) Enxágue novamente (evita contaminação).";
  if (step === "ph4")    stepText.textContent = "4) Calibre pH no padrão 4.01.";
  if (step === "rinse3") stepText.textContent = "5) Enxágue novamente.";
  if (step === "ec")     stepText.textContent = "6) Calibre condutividade no padrão 1413 µS/cm.";
  if (step === "rinse4") stepText.textContent = "7) Enxágue antes de medir as amostras.";

  if (step === "measure") {
    const repN = state.samples.rep + 1;
    stepText.textContent = `8) Meça ${currentSampleName()}: réplica ${repN}/3.`;
  }

  if (step === "discard") stepText.textContent = "9) Descarte o resíduo no frasco de descarte.";
  if (step === "rinseBetween") stepText.textContent = "10) Enxágue após o descarte (evita contaminação).";
  if (step === "diagnose") stepText.textContent = `11) Diagnóstico — ${currentSampleName()}: classifique a amostra.`;

  // Botões (pedido seu)
  if (!btnAction) return;

  if (step === "discard") btnAction.textContent = "DESCARTAR";
  else if (step === "rinse1" || step === "rinse2" || step === "rinse3" || step === "rinse4" || step === "rinseBetween")
    btnAction.textContent = "ENXAGUAR";
  else if (step === "measure") btnAction.textContent = "MEDIR";
  else if (step === "diagnose") btnAction.textContent = "TRAVADO";
  else btnAction.textContent = "CONFIRMAR";

  updateActionEnabled();

  const base = stepText?.textContent || "";
  setHint(`Etapa: ${base} (Encoste a sonda numa zona, espere estabilizar e confirme.)`);
}

function requiredZone(){
  // enxágues
  if (state.step === "rinse1" || state.step === "rinse2" || state.step === "rinse3" || state.step === "rinse4" || state.step === "rinseBetween")
    return "rinse";

  // calibrações
  if (state.step === "ph7") return "ph7";
  if (state.step === "ph4") return "ph4";
  if (state.step === "ec")  return "ec1413";

  // medições
  if (state.step === "measure") return currentSampleKey();

  // descarte
  if (state.step === "discard") return "waste";

  // diagnóstico
  if (state.step === "diagnose") return null;

  return null;
}

function updateActionEnabled(){
  if (!btnAction) return;

  if (state.step === "diagnose"){
    btnAction.disabled = true;
    return;
  }

  const req = requiredZone();
  const okZone = (state.currentZone === req);
  const okStable = isStable();
  btnAction.disabled = !(okZone && okStable);
}

// =====================
// Estabilidade
// =====================
function stabilityDuration(zone){
  let base = 1100;

  if (zone === "rinse") base = 980;
  if (zone === "ph7" || zone === "ph4") base = 1450;
  if (zone === "ec1413") base = 1550;
  if (zone === "waste") base = 980;
  if (zone === "sample1" || zone === "sample2" || zone === "sample3") base = 1350;

  return Math.round(base * SPEED_FACTOR);
}

function stopStability(){
  if (state.stability.raf) cancelAnimationFrame(state.stability.raf);
  state.stability.active = false;
  state.stability.zone = null;
  if (stabBar) stabBar.style.width = "0%";
  if (stabPct) stabPct.textContent = "0%";
}

function startStability(zone){
  stopStability();
  state.stability.active = true;
  state.stability.zone = zone;
  state.stability.start = performance.now();
  state.stability.dur = stabilityDuration(zone);
  state.stability.stableAt = state.stability.start + state.stability.dur;

  const tick = () => {
    if (!state.stability.active) return;

    const elapsed = performance.now() - state.stability.start;
    const p = clamp(elapsed / state.stability.dur, 0, 1);

    const pct = Math.round(p*100);
    if (stabBar) stabBar.style.width = `${pct}%`;
    if (stabPct) stabPct.textContent = `${pct}%`;

    if (stabLabel){
      stabLabel.textContent = (p < 1)
        ? "Estabilizando..."
        : "ESTÁVEL — você pode confirmar/medir.";
    }

    updateActionEnabled();
    state.stability.raf = requestAnimationFrame(tick);
  };
  tick();
}

function isStable(){
  if (!state.stability.active) return false;
  return (performance.now() - state.stability.start) >= state.stability.dur;
}

function qualityFromConfirm(){
  const now = performance.now();
  const ideal = state.stability.stableAt;
  const dt = Math.abs(now - ideal);
  return clamp(1 - (dt / 950), 0.20, 1);
}

// =====================
// Drag + posição
// =====================
function setProbePos(x, y, {snap=false} = {}){
  const vr = viewRectInStage();

  const w = probe.offsetWidth || 160;
  const h = probe.offsetHeight || 160;
  const pad = 10;

  const minX = vr.left + pad;
  const minY = vr.top  + pad;
  const maxX = vr.left + vr.width  - w - pad;
  const maxY = vr.top  + vr.height - h - pad;

  x = clamp(x, minX, maxX);
  y = clamp(y, minY, maxY);

  state.drag.x = x;
  state.drag.y = y;

  probe.style.setProperty("--x", `${x}px`);
  probe.style.setProperty("--y", `${y}px`);

  if (snap) probe.classList.remove("dragging");
}

function placeProbeHome(){
  const vr = viewRectInStage();
  setProbePos(vr.left + vr.width * 0.42, vr.top + vr.height * 0.64, {snap:true});
  if (stabLabel) stabLabel.textContent = "Arraste a SONDA para uma zona.";
}

// =====================
// Zona sob a ponta da sonda (SÓ NA PONTA)
// =====================
function zoneUnderProbe(){
  const pr = probe.getBoundingClientRect();

  const tipX = pr.left + pr.width  * TIP_X;
  const tipY = pr.top  + pr.height * TIP_Y;

  for (const z of zones){
    const zr = z.getBoundingClientRect();
    const inside = tipX >= zr.left && tipX <= zr.right && tipY >= zr.top && tipY <= zr.bottom;
    if (inside) return z;
  }
  return null;
}

function commitZone(zone){
  if (zone === state.currentZone) return;

  state.currentZone = zone;

  if (zone){
    startStability(zone);
    probe.classList.add("dip");
  } else {
    stopStability();
    probe.classList.remove("dip");
    if (stabLabel) stabLabel.textContent = "Arraste a SONDA para uma zona.";
  }

  updateActionEnabled();
}

function updateZoneFromGeometry(){
  const now = performance.now();
  const zEl = zoneUnderProbe();
  const zone = zEl ? zEl.dataset.zone : null;

  if (zone !== state.zoneDetect.candidate){
    state.zoneDetect.candidate = zone;
    state.zoneDetect.since = now;
    return;
  }

  if ((now - state.zoneDetect.since) >= ZONE_DWELL_MS){
    commitZone(zone);
  }
}

function startZoneMonitor(){
  const loop = () => {
    updateZoneFromGeometry();
    state.zoneDetect.raf = requestAnimationFrame(loop);
  };
  state.zoneDetect.raf = requestAnimationFrame(loop);
}

// =====================
// Eventos pointer
// =====================
function onPointerDown(e){
  state.drag.active = true;
  state.drag.pointerId = e.pointerId;

  probe.setPointerCapture(e.pointerId);
  probe.classList.add("dragging");

  state.drag.startX = e.clientX;
  state.drag.startY = e.clientY;
  state.drag.baseX = state.drag.x;
  state.drag.baseY = state.drag.y;

  commitZone(null);
  e.preventDefault();
}

function onPointerMove(e){
  if (!state.drag.active || e.pointerId !== state.drag.pointerId) return;

  const dx = e.clientX - state.drag.startX;
  const dy = e.clientY - state.drag.startY;

  setProbePos(state.drag.baseX + dx, state.drag.baseY + dy);
  updateZoneFromGeometry();

  e.preventDefault();
}

function onPointerUp(e){
  if (!state.drag.active || e.pointerId !== state.drag.pointerId) return;

  state.drag.active = false;
  state.drag.pointerId = null;
  probe.classList.remove("dragging");

  updateZoneFromGeometry();
  e.preventDefault();
}

// =====================
// Calibração + amostras
// =====================
function generateStandardReading(zone){
  const s = SOL[zone];
  return {
    ph: jitter(s.ph, 0.02),
    ec: jitter(s.ec, 7),
    t:  jitter(s.t, 0.12)
  };
}

function setPhCalibration(p1, p2, q){
  let a = (p2.true - p1.true) / (p2.meas - p1.meas || 1e-6);
  let b = p1.true - a*p1.meas;

  const err = (1 - q);
  a += (Math.random()*2 - 1) * err * 0.03;
  b += (Math.random()*2 - 1) * err * 0.20;

  state.calib.ph = { done:true, a, b, p1, p2, quality:q };
}

function setEcCalibration(trueEc, measEc, q){
  let offset = trueEc - measEc;
  const err = (1 - q);
  offset += (Math.random()*2 - 1) * err * 45;
  state.calib.ec = { done:true, offset, quality:q };
}

function generateSampleTrue(sampleKey){
  const p = SAMPLES[sampleKey] || SAMPLES.sample3;

  let ph = rand(p.faixas.ph[0], p.faixas.ph[1]);
  if (sampleKey === "sample3"){
    ph = clamp(ph - rand(0.08, 0.28), p.faixas.ph[0], p.faixas.ph[1]);
  }

  return {
    ph,
    ec: rand(p.faixas.ec[0], p.faixas.ec[1]),
    t:  rand(p.faixas.t[0],  p.faixas.t[1])
  };
}

function applyCalibration(raw){
  let ph = raw.ph;
  let ec = raw.ec;
  let t  = raw.t;

  if (state.calib.ph.done) ph = state.calib.ph.a * ph + state.calib.ph.b;
  if (state.calib.ec.done) ec = ec + state.calib.ec.offset;

  ph = jitter(ph, 0.03);
  ec = jitter(ec, 14);
  t  = jitter(t, 0.22);

  return {
    ph: clamp(ph, 0, 14),
    ec: clamp(ec, 0, 3000),
    t:  clamp(t, 0, 45)
  };
}

function computeStats(arrPH, arrEC, arrT){
  return {
    phMean: mean(arrPH), phSd: sd(arrPH),
    ecMean: mean(arrEC), ecSd: sd(arrEC),
    tMean:  mean(arrT),  tSd:  sd(arrT),
  };
}

function expectedClass(stats){
  let sev = 0;
  if (stats.ecMean > 900) sev += 1;
  if (stats.ecMean > 1600) sev += 2;
  if (stats.ecMean > 2400) sev += 3;

  if (stats.phMean < 6.5 || stats.phMean > 8.5) sev += 1;
  if (stats.phMean < 6.0 || stats.phMean > 9.0) sev += 2;

  if (stats.tMean > 33.0) sev += 1;

  if (sev <= 1) return "ok";
  if (sev <= 3) return "suspeito";
  return "critico";
}

function classLabel(c){
  return c === "ok" ? "OK" : (c === "suspeito" ? "SUSPEITO" : "CRÍTICO");
}

// =====================
// Relatório por amostra (Modal)
// =====================
function ensureReportModal(){
  let modal = document.querySelector("#reportModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "reportModal";
  modal.innerHTML = `
    <div class="rm-backdrop"></div>
    <div class="rm-card" role="dialog" aria-modal="true">
      <div class="rm-head">
        <div class="rm-title" id="rmTitle">Relatório</div>
        <button class="rm-close" id="rmClose" type="button">×</button>
      </div>
      <div class="rm-body" id="rmBody"></div>
      <div class="rm-actions">
        <button class="rm-btn" id="rmOk" type="button">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const style = document.createElement("style");
  style.textContent = `
    #reportModal{ position:fixed; inset:0; display:none; z-index:9999; }
    #reportModal.show{ display:block; }
    #reportModal .rm-backdrop{ position:absolute; inset:0; background:rgba(0,0,0,.55); }
    #reportModal .rm-card{
      position:relative; width:min(760px,92vw); max-height:80vh; overflow:auto;
      margin:7vh auto; background:#0f1115; color:#fff; border-radius:16px;
      border:1px solid rgba(255,255,255,.12); box-shadow:0 20px 60px rgba(0,0,0,.55);
      padding:16px;
    }
    #reportModal .rm-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
    #reportModal .rm-title{ font-weight:800; font-size:18px; }
    #reportModal .rm-close{
      width:40px; height:40px; border-radius:10px; border:1px solid rgba(255,255,255,.14);
      background:transparent; color:#fff; font-size:22px; cursor:pointer;
    }
    #reportModal .rm-body{ margin-top:12px; line-height:1.45; color:#c7cde6; }
    #reportModal .rm-actions{ margin-top:14px; display:flex; justify-content:flex-end; }
    #reportModal .rm-btn{
      padding:10px 14px; border-radius:12px; border:1px solid rgba(255,255,255,.14);
      background:rgba(255,255,255,.06); color:#fff; cursor:pointer;
    }
    #reportModal .tag{ display:inline-block; padding:4px 10px; border-radius:999px; margin-right:8px;
      border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.06); color:#fff; font-size:12px;
    }
    #reportModal .grid{ display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px; }
    #reportModal .box{ padding:10px; border:1px solid rgba(255,255,255,.12); border-radius:12px; background:rgba(255,255,255,.04); }
    #reportModal b{ color:#fff; }
  `;
  document.head.appendChild(style);

  const close = () => modal.classList.remove("show");
  modal.querySelector("#rmClose").addEventListener("click", close);
  modal.querySelector(".rm-backdrop").addEventListener("click", close);
  modal.querySelector("#rmOk").addEventListener("click", close);

  return modal;
}

function reportTextFor(chosen, stats){
  const ph = stats.phMean, ec = stats.ecMean, t = stats.tMean;

  if (chosen === "ok"){
    return `
      <b>Atenção:</b> diagnóstico <b>OK</b>, mas registre os valores:
      pH <b>${fmt(ph,2)}</b>, EC <b>${Math.round(ec)}</b> µS/cm e T <b>${fmt(t,1)}</b> °C.
      Compare com o contexto do ponto e confirme ausência de contaminação cruzada.
    `;
  }
  if (chosen === "suspeito"){
    return `
      <b>Alerta:</b> diagnóstico <b>SUSPEITO</b>. Indícios de alteração:
      pH <b>${fmt(ph,2)}</b> e/ou EC <b>${Math.round(ec)}</b> µS/cm.
      Recomenda-se repetir a coleta/medida e investigar fonte de impacto.
    `;
  }
  return `
    <b>Diagnóstico Correto:</b> Crítico. Recomenda-se ação imediata e investigação de carga/nutrientes/esgoto.
  `;
}

function showReportModal({ sampleName, chosen, expected, stats }){
  const modal = ensureReportModal();
  const title = modal.querySelector("#rmTitle");
  const body  = modal.querySelector("#rmBody");

  title.textContent = `Relatório — ${sampleName}`;

  body.innerHTML = `
    <div>
      <span class="tag">Hipótese Sugerida: <b>${classLabel(chosen)}</b></span>
      <span class="tag">Esperado: <b>${classLabel(expected)}</b></span>
    </div>

    <div class="grid">
      <div class="box"><b>pH (média ± DP)</b><br>${fmt(stats.phMean,2)} ± ${fmt(stats.phSd,2)}</div>
      <div class="box"><b>EC (média ± DP)</b><br>${Math.round(stats.ecMean)} ± ${Math.round(stats.ecSd)} µS/cm</div>
      <div class="box"><b>T (média ± DP)</b><br>${fmt(stats.tMean,1)} ± ${fmt(stats.tSd,1)} °C</div>
      <div class="box"><b>Observação</b><br>${reportTextFor(chosen, stats)}</div>
    </div>
  `;

  modal.classList.add("show");
}

// =====================
// Ficha final (Modal)
// =====================
function inRange(v, [mn, mx]){ return v >= mn && v <= mx; }
function pctOnScale(v, [s0, s1]){
  const p = (v - s0) / (s1 - s0 || 1e-6);
  return clamp(p, 0, 1) * 100;
}

function verdictParam(key, v){
  const r = ACCEPT[key];
  if (!r) return { status:"—", note:"" };
  if (v < r[0]) return { status:"ABAIXO", note:causeParam(key, "low") };
  if (v > r[1]) return { status:"ACIMA", note:causeParam(key, "high") };
  return { status:"OK", note:"Dentro da faixa de referência." };
}

function causeParam(key, dir){
  if (key === "ec"){
    return (dir === "high")
      ? "Condutividade alta sugere excesso de íons dissolvidos (esgoto/efluentes, lixiviação urbana, sais, detergentes, fertilizantes)."
      : "Condutividade baixa pode ocorrer por diluição (chuva recente) ou baixa mineralização natural.";
  }
  if (key === "ph"){
    return (dir === "low")
      ? "pH baixo sugere acidificação: decomposição de matéria orgânica, aporte de efluentes ácidos, chuvas ácidas, drenagem com solos mais ácidos."
      : "pH alto sugere alcalinização: detergentes/limpeza, certas descargas industriais, intensa fotossíntese (algas) consumindo CO₂.";
  }
  if (key === "t"){
    return (dir === "high")
      ? "Temperatura alta pode indicar pouca sombra, pouca profundidade, aquecimento por área urbana e/ou lançamento de efluente mais quente."
      : "Temperatura baixa pode indicar sombra intensa, maior profundidade, ou coleta em horário mais frio.";
  }
  return "";
}

function barRow({label, unit, key, mean, sd}){
  const acc = ACCEPT[key];
  const sc  = SCALE[key];

  const pMin = pctOnScale(acc[0], sc);
  const pMax = pctOnScale(acc[1], sc);
  const pVal = pctOnScale(mean, sc);

  const ok = inRange(mean, acc);
  const tag = ok ? "ACEITÁVEL" : "FORA";
  const cls = ok ? "ok" : "bad";
  const vv = verdictParam(key, mean);

  const meanText = (key==="ec") ? `${Math.round(mean)}` : fmt(mean, (key==="t")?1:2);
  const sdText   = (key==="ec") ? `${Math.round(sd)}`   : fmt(sd,   (key==="t")?1:2);

  return `
  <div class="ff-row">
    <div class="ff-k">
      <div>
        <div class="ff-lab">${label}</div>
        <div class="ff-val"><b>${meanText}</b> ${unit} <span class="ff-sd">(±${sdText})</span></div>
      </div>
      <div class="ff-tag ${cls}">${tag}</div>
    </div>

    <div class="ff-bar">
      <div class="ff-track"></div>
      <div class="ff-acc" style="left:${pMin}%; width:${Math.max(2, pMax - pMin)}%;"></div>
      <div class="ff-mark" style="left:${pVal}%;"></div>

      <div class="ff-scale">
        <span>${acc[0]}</span>
        <span>${acc[1]}</span>
      </div>
    </div>

    <div class="ff-note">
      <b>Status:</b> ${vv.status}. ${vv.note}
    </div>
  </div>`;
}

function ensureFinalSheetModal(){
  let modal = document.querySelector("#finalSheetModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "finalSheetModal";
  modal.innerHTML = `
    <div class="ff-backdrop"></div>
    <div class="ff-card" role="dialog" aria-modal="true">
      <div class="ff-head">
        <div class="ff-title" id="ffTitle">Ficha Final — Resultados</div>
        <button class="ff-close" id="ffClose" type="button">×</button>
      </div>

      <div class="ff-sub" id="ffMeta"></div>
      <div class="ff-body" id="ffBody"></div>

      <div class="ff-actions">
        <button class="ff-btn" id="ffPrint" type="button">Imprimir</button>
        <button class="ff-btn primary" id="ffNext" type="button">Avançar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const style = document.createElement("style");
  style.textContent = `
    #finalSheetModal{ position:fixed; inset:0; display:none; z-index:10000; }
    #finalSheetModal.show{ display:block; }
    #finalSheetModal .ff-backdrop{ position:absolute; inset:0; background:rgba(0,0,0,.60); }
    #finalSheetModal .ff-card{
      position:relative; width:min(980px,94vw); max-height:86vh; overflow:auto;
      margin:6vh auto; background:#0f1115; color:#fff; border-radius:18px;
      border:1px solid rgba(255,255,255,.12); box-shadow:0 20px 70px rgba(0,0,0,.60);
      padding:16px 16px 14px;
    }
    #finalSheetModal .ff-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
    #finalSheetModal .ff-title{ font-weight:900; font-size:18px; letter-spacing:.2px; }
    #finalSheetModal .ff-close{
      width:40px; height:40px; border-radius:10px; border:1px solid rgba(255,255,255,.14);
      background:transparent; color:#fff; font-size:22px; cursor:pointer;
    }
    #finalSheetModal .ff-sub{ margin-top:8px; color:#c7cde6; font-size:13px; line-height:1.35; }
    #finalSheetModal .ff-body{ margin-top:12px; color:#c7cde6; }
    .ff-section{ border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.04); border-radius:14px; padding:12px; margin-top:12px; }
    .ff-secHead{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .ff-secTitle{ font-weight:800; color:#fff; }
    .ff-diag{ font-size:12px; padding:4px 10px; border-radius:999px; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.06); color:#fff; }
    .ff-rows{ margin-top:10px; display:grid; gap:10px; }
    .ff-row{ border:1px solid rgba(255,255,255,.10); background:rgba(0,0,0,.18); border-radius:12px; padding:10px; }
    .ff-k{ display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
    .ff-lab{ font-weight:700; color:#fff; }
    .ff-val{ color:#c7cde6; }
    .ff-sd{ opacity:.9; margin-left:6px; font-size:12px; }
    .ff-tag{ font-size:11px; padding:3px 8px; border-radius:999px; border:1px solid rgba(255,255,255,.14); }
    .ff-tag.ok{ background:rgba(80,200,120,.14); }
    .ff-tag.bad{ background:rgba(255,80,80,.14); }
    .ff-bar{ margin-top:8px; position:relative; padding-top:14px; }
    .ff-track{ height:8px; border-radius:999px; background:rgba(255,255,255,.08); }
    .ff-acc{ position:absolute; top:14px; height:8px; border-radius:999px; background:rgba(110,168,254,.22); border:1px solid rgba(110,168,254,.35); }
    .ff-mark{ position:absolute; top:10px; width:2px; height:16px; background:#fff; box-shadow:0 0 0 1px rgba(0,0,0,.3); }
    .ff-scale{ display:flex; justify-content:space-between; font-size:11px; opacity:.9; margin-top:6px; }
    .ff-note{ margin-top:8px; font-size:13px; line-height:1.35; }
    .ff-actions{ margin-top:14px; display:flex; justify-content:flex-end; gap:10px; }
    .ff-btn{
      padding:10px 14px; border-radius:12px; border:1px solid rgba(255,255,255,.14);
      background:rgba(255,255,255,.06); color:#fff; cursor:pointer;
    }
    .ff-btn.primary{
      background:rgba(110,168,254,.22);
      border-color:rgba(110,168,254,.45);
    }
  `;
  document.head.appendChild(style);

  const close = () => modal.classList.remove("show");
  modal.querySelector("#ffClose").addEventListener("click", close);
  modal.querySelector(".ff-backdrop").addEventListener("click", close);

  modal.querySelector("#ffPrint").addEventListener("click", () => window.print());

  modal.querySelector("#ffNext").addEventListener("click", () => {
    window.location.href = NEXT_SCENE_URL;
  });

  return modal;
}

function buildFinalSheetHTML(){
  const lines = [];

  for (const k of SAMPLE_ORDER){
    const bucket = state.samples.data[k];
    if (!bucket.stats) continue;

    const s = bucket.stats;
    const chosen = bucket.diag || "—";
    const exp    = bucket.expected || expectedClass(bucket.stats);

    const diagText = `Diagnóstico: ${classLabel(chosen)} | Esperado: ${classLabel(exp)}`;

    const flags = [];
    if (!inRange(s.phMean, ACCEPT.ph)) flags.push("pH fora do aceitável");
    if (!inRange(s.ecMean, ACCEPT.ec)) flags.push("Condutividade fora do aceitável");
    if (!inRange(s.tMean,  ACCEPT.t))  flags.push("Temperatura fora do aceitável");

    const obs = flags.length
      ? `Principais desvios: <b>${flags.join(", ")}</b>.`
      : "Sem desvios frente à ficha de referência (ainda assim, registrar e contextualizar com o local/horário).";

    lines.push(`
      <div class="ff-section">
        <div class="ff-secHead">
          <div class="ff-secTitle">${SOL[k]?.label || k}</div>
          <div class="ff-diag">${diagText}</div>
        </div>

        <div class="ff-rows">
          ${barRow({ label:"pH", unit:"", key:"ph", mean:s.phMean, sd:s.phSd })}
          ${barRow({ label:"Condutividade elétrica", unit:"µS/cm", key:"ec", mean:s.ecMean, sd:s.ecSd })}
          ${barRow({ label:"Temperatura da água", unit:"°C", key:"t", mean:s.tMean, sd:s.tSd })}
        </div>

        <div class="ff-note">
          <b>Observações:</b> ${obs}
        </div>
      </div>
    `);
  }

  return lines.join("");
}

function showFinalSheetModal(){
  const modal = ensureFinalSheetModal();

  const meta = modal.querySelector("#ffMeta");
  const body = modal.querySelector("#ffBody");

  meta.innerHTML = `
    <b>FICHA DE REFERÊNCIA — PARÂMETROS ACEITÁVEIS</b><br>
    Corpo hídrico: <b>${REF_CARD.corpo}</b><br>
    Região: <b>${REF_CARD.regiao}</b><br>
    Faixas aceitáveis: pH <b>${ACCEPT.ph[0]}–${ACCEPT.ph[1]}</b>, Condutividade <b>${ACCEPT.ec[0]}–${ACCEPT.ec[1]} µS/cm</b>, Temperatura <b>${ACCEPT.t[0]}–${ACCEPT.t[1]} °C</b>.
  `;

  body.innerHTML = buildFinalSheetHTML();
  modal.classList.add("show");
}

// =====================
// Ação principal (com DESCARTE + ENXÁGUE entre medidas)
// =====================
function doAction(){
  if (!btnAction || btnAction.disabled) return;

  const req = requiredZone();
  if (state.currentZone !== req) return;
  if (!isStable()) return;

  const q = qualityFromConfirm();

  // ---------- ENXÁGUES (inclui rinseBetween) ----------
  if (state.step === "rinse1" || state.step === "rinse2" || state.step === "rinse3" || state.step === "rinse4"){
    updateScore(10);
    updateReadout(null, null, null);
    if (stabLabel) stabLabel.textContent = `Enxágue confirmado (${Math.round(q*100)}%).`;

    if (state.step === "rinse1") setStep("ph7");
    else if (state.step === "rinse2") setStep("ph4");
    else if (state.step === "rinse3") setStep("ec");
    else if (state.step === "rinse4") {
      state.samples.idx = 0;
      state.samples.rep = 0;
      if (repInfo) repInfo.textContent = "Réplica: 0/3";
      setStep("measure");
    }
    return;
  }

  // ---------- DESCARTE ----------
  if (state.step === "discard"){
    updateScore(6);
    updateReadout(null, null, null);
    if (stabLabel) stabLabel.textContent = `Descarte confirmado (${Math.round(q*100)}%).`;
    setStep("rinseBetween");
    return;
  }

  // ---------- ENXÁGUE pós-descarte ----------
  if (state.step === "rinseBetween"){
    updateScore(6);
    updateReadout(null, null, null);
    if (stabLabel) stabLabel.textContent = `Enxágue pós-descarte confirmado (${Math.round(q*100)}%).`;

    const next = state.postRinseNext || "measure";
    state.postRinseNext = null;

    if (next === "diagnose"){
      const skey = currentSampleKey();
      const bucket = state.samples.data[skey];
      const s = bucket.stats;

      if (diagPrompt && s){
        diagPrompt.textContent =
          `(${currentSampleName()}) Média: pH ${fmt(s.phMean,2)} (±${fmt(s.phSd,2)}), ` +
          `EC ${Math.round(s.ecMean)} (±${Math.round(s.ecSd)}), T ${fmt(s.tMean,1)} °C. Classifique:`;
      }

      setStep("diagnose");
      if (btnAction) btnAction.disabled = true;
      return;
    }

    setStep("measure");
    return;
  }

  // ---------- pH 7 ----------
  if (state.step === "ph7"){
    const raw = generateStandardReading("ph7");
    state.calib.ph.p1 = { true: 7.00, meas: raw.ph };
    updateReadout(raw.ph, raw.ec, raw.t);
    updateScore(Math.round(q*10));
    if (stabLabel) stabLabel.textContent = `pH 7 confirmado (qualidade ${Math.round(q*100)}%).`;
    setStep("rinse2");
    return;
  }

  // ---------- pH 4 ----------
  if (state.step === "ph4"){
    const raw = generateStandardReading("ph4");
    state.calib.ph.p2 = { true: 4.01, meas: raw.ph };
    setPhCalibration(state.calib.ph.p1, state.calib.ph.p2, q);

    updateReadout(raw.ph, raw.ec, raw.t);
    updateScore(Math.round(q*12));
    if (stabLabel) stabLabel.textContent = `pH calibrado (qualidade ${Math.round(q*100)}%).`;
    setStep("rinse3");
    return;
  }

  // ---------- EC ----------
  if (state.step === "ec"){
    const raw = generateStandardReading("ec1413");
    setEcCalibration(1413, raw.ec, q);

    updateReadout(raw.ph, raw.ec, raw.t);
    updateScore(Math.round(q*12));
    if (stabLabel) stabLabel.textContent = `EC calibrada (qualidade ${Math.round(q*100)}%).`;
    setStep("rinse4");
    return;
  }

  // ---------- MEDIR ----------
  if (state.step === "measure"){
    if (!state.calib.ph.done || !state.calib.ec.done){
      if (stabLabel) stabLabel.textContent = "Calibre pH e EC antes de medir a amostra.";
      return;
    }

    const skey = currentSampleKey();
    const bucket = state.samples.data[skey];

    const trueV = generateSampleTrue(skey);
    const read  = applyCalibration(trueV);

    bucket.ph.push(read.ph);
    bucket.ec.push(read.ec);
    bucket.t.push(read.t);

    state.samples.rep += 1;

    if (repInfo) repInfo.textContent = `Réplica: ${state.samples.rep}/3`;
    updateReadout(read.ph, read.ec, read.t);
    updateScore(8);

    // Após QUALQUER medição -> DESCARTE + ENXÁGUE (inclusive na 3ª)
    if (state.samples.rep < 3){
      state.postRinseNext = "measure";
      if (stabLabel) stabLabel.textContent = `Réplica ${state.samples.rep}/3 registrada. Agora descarte e enxágue.`;
      setStep("discard");
      return;
    }

    // Triplicata completa: calcula stats, mas exige DESCARTE+ENXÁGUE antes do diagnóstico
    bucket.stats = computeStats(bucket.ph, bucket.ec, bucket.t);
    bucket.expected = expectedClass(bucket.stats);

    const s = bucket.stats;
    updateReadout(s.phMean, s.ecMean, s.tMean);

    state.postRinseNext = "diagnose";
    if (stabLabel) stabLabel.textContent = `Triplicata completa — ${currentSampleName()}. Agora descarte e enxágue antes do diagnóstico.`;
    setStep("discard");
    return;
  }
}

// =====================
// Diagnóstico
// =====================
function bindDiagnosis(){
  const buttons = $$("#diagBox [data-diag]");
  buttons.forEach(b => {
    b.addEventListener("click", () => {
      const skey = currentSampleKey();
      const bucket = state.samples.data[skey];
      if (!bucket.stats) return;

      const chosen = b.getAttribute("data-diag");
      const exp = bucket.expected || expectedClass(bucket.stats);

      bucket.diag = chosen;

      const ok = (chosen === exp);
      updateScore(ok ? 25 : 8);

      if (diagResult){
        diagResult.textContent =
          `Seu diagnóstico: ${classLabel(chosen)}. Esperado: ${classLabel(exp)}. ${ok ? "Acertou." : "Atenção: revise o critério."}`;
      }

      // relatório por amostra (popup)
      showReportModal({
        sampleName: currentSampleName(),
        chosen,
        expected: exp,
        stats: bucket.stats
      });

      // próxima amostra
      state.samples.idx += 1;

      // FINAL: mostra ficha final
      if (state.samples.idx >= SAMPLE_ORDER.length){
        if (stabLabel) stabLabel.textContent = "Todas as amostras finalizadas. Gerando ficha final...";
        if (diagBox) diagBox.hidden = true;

        setTimeout(() => {
        showFinalSheetModal();
        // redireciona automaticamente após 2,5s (ajuste se quiser)
        setTimeout(() => window.location.href = cena/conversa.html, 2500);
      }, 120);

      setHint("Ficha final disponível. Indo para a conversa...");
return;

      }

      // reseta rep para a próxima amostra e vai direto medir (o descarte já foi feito antes do diagnóstico)
      state.samples.rep = 0;
      if (repInfo) repInfo.textContent = "Réplica: 0/3";
      updateReadout(null, null, null);

      if (diagBox) diagBox.hidden = true;

      setStep("measure");
      if (stabLabel) stabLabel.textContent = `Próxima: ${currentSampleName()}. Faça a réplica 1/3.`;
    });
  });
}

// =====================
// Reset / bind
// =====================
function recenterProbe(){
  commitZone(null);
  placeProbeHome();
}

function fullReset(){
  commitZone(null);

  state.step = "rinse1";
  state.calib = {
    ph: { done:false, a:1, b:0, p1:null, p2:null, quality:0 },
    ec: { done:false, offset:0, quality:0 }
  };

  state.samples.idx = 0;
  state.samples.rep = 0;
  for (const k of SAMPLE_ORDER){
    state.samples.data[k] = { ph:[], ec:[], t:[], stats:null, diag:null, expected:null };
  }

  state.postRinseNext = null;

  state.score = 0;

  if (repInfo) repInfo.textContent = "Réplica: 0/3";
  updateReadout(null, null, null);
  if (scoreText) scoreText.textContent = "Pontuação: 0";
  if (diagBox) diagBox.hidden = true;
  if (diagResult) diagResult.textContent = "";

  setStep("rinse1");
  if (stabLabel) stabLabel.textContent = "Reset feito. Encoste a SONDA na água destilada.";
  placeProbeHome();
}

function bind(){
  probe.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);

  btnAction?.addEventListener("click", doAction);
  btnReset?.addEventListener("click", fullReset);
  btnRecenter?.addEventListener("click", recenterProbe);

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "d") document.body.classList.toggle("debug");
    if (k === "m") document.body.classList.toggle("hide-ui");
    if (k === "t") {
      const dot = document.querySelector("#tipDot");
      if (dot) dot.style.display = (dot.style.display === "none") ? "block" : "none";
    }
  });
}

function init(){
  syncHeaderH();

  const start = () => {
    fitStageToScene();
    placeProbeHome();
    setStep("rinse1");
    bindDiagnosis();
    bind();
    startZoneMonitor();
  };

  if (bg && bg.complete) start();
  else bg?.addEventListener("load", start, { once:true });

  let raf = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      syncHeaderH();
      fitStageToScene();
      if (!state.drag.active) placeProbeHome();
    });
  });
}

window.addEventListener("load", init);

// =====================
// DEBUG: marcador visual da ponta da sonda (tecla "t")
// =====================
(function tipDebug(){
  if (!probe) return;

  const dot = document.createElement("div");
  dot.id = "tipDot";
  dot.style.cssText = `
    position:fixed; left:0; top:0;
    width:10px; height:10px; border-radius:999px;
    background:#ff3b3b; border:2px solid #fff;
    box-shadow:0 6px 18px rgba(0,0,0,.45);
    transform:translate(-50%,-50%);
    z-index:99999; pointer-events:none;
    display:none;
  `;
  document.body.appendChild(dot);

  function tick(){
    const pr = probe.getBoundingClientRect();
    const x = pr.left + pr.width  * TIP_X;
    const y = pr.top  + pr.height * TIP_Y;
    dot.style.left = x + "px";
    dot.style.top  = y + "px";
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
