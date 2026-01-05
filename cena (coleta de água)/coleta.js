document.getElementById("btnReset")?.addEventListener("click", () => location.reload());

const barco = document.getElementById("barco");
const stage = document.getElementById("stage");

const keys = {};
const SPEED = 4;

const DEBUG_ZONES = false;
const USE_ALLOWED_ZONES = false;

const NEXT_SCENE_URL = "../cena-multiparametro.html"; // ajuste aqui se mudar a estrutura

const NO_GO_ZONES = [
  { x: 15, y: 60, w: 28, h: 40, name: "madeira_esquerda" },
  { x: 78, y: 48, w: 30, h: 52, name: "margem_direita_baixo" },
  { x: 78.5, y: 11, w: 24, h: 35, name: "casas_direita" },
  { x: 0, y: 0, w: 22, h: 65, name: "margem_esquerda" },
  { x: 67.5, y: 0, w: 22, h: 25, name: "margem_direita2" },
  { x: 15, y: 0, w: 22, h: 29, name: "margem_esquerda2" },
  { x: 0, y: 0, w: 100, h: 6, name: "topo_fora_rio" },
];

const ALLOWED_ZONES = [];

const ui = {
  hintText: document.getElementById("hintText") || null,
  panel: null,
  sub: null,
  needle: null,
  zoneGood: null,
  tries: null,
  hits: null,
};

const SAMPLE_INFO = {
  p1: {
    name: "Amostra 1",
    img: "frasco1.png",
    tagline: "Água mais límpida (referência/controle).",
    props: [
      ["Cor", "Transparente a levemente azulada"],
      ["Turbidez", "Baixa (boa visibilidade)"],
      ["Indícios", "Pouca matéria em suspensão; aparência “limpa”"],
      ["Interpretação", "Ponto menos impactado (comparativo)."],
    ],
  },
  p2: {
    name: "Amostra 2",
    img: "frasco 2.png",
    tagline: "Água impactada / eutrofizada (alerta visual).",
    props: [
      ["Cor", "Verde eutrofizado / verde turvo"],
      ["Turbidez", "Média a alta (algas e partículas)"],
      ["Indícios", "Possível floração de algas; carga nutricional elevada"],
      ["Interpretação", "Risco de eutrofização e queda de O₂ dissolvido."],
    ],
  },
  p3: {
    name: "Amostra 3",
    img: "frasco3.png",
    tagline: "Água escura (matéria orgânica/sedimentos).",
    props: [
      ["Cor", "Marrom escuro / âmbar"],
      ["Turbidez", "Média (aspecto carregado)"],
      ["Indícios", "Sedimentos, matéria orgânica e possível contaminação"],
      ["Interpretação", "Sinal de degradação; requer análise complementar."],
    ],
  },
};

let pos = { x: 0, y: 0 };

function initPosition() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  pos.x = w * 0.52;
  pos.y = h * 0.70;
  applyPosition();
}

function applyPosition() {
  barco.style.left = pos.x + "px";
  barco.style.top = pos.y + "px";
}

function setHint(msg) {
  if (ui.hintText) ui.hintText.textContent = msg;
}

window.addEventListener(
  "keydown",
  (e) => {
    const k = e.key.toLowerCase();
    keys[k] = true;

    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
  },
  { passive: false }
);

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

function intersects(a, b) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

function containsRect(outer, inner) {
  return inner.left >= outer.left && inner.right <= outer.right && inner.top >= outer.top && inner.bottom <= outer.bottom;
}

function zoneToPxRect(zone) {
  const rect = stage.getBoundingClientRect();
  return {
    left: rect.width * (zone.x / 100),
    top: rect.height * (zone.y / 100),
    right: rect.width * ((zone.x + zone.w) / 100),
    bottom: rect.height * ((zone.y + zone.h) / 100),
  };
}

function boatRectAt(x, y) {
  const bw = barco.offsetWidth;
  const bh = barco.offsetHeight;
  const padX = bw * 0.18;
  const padY = bh * 0.18;

  return {
    left: x - bw / 2 + padX,
    right: x + bw / 2 - padX,
    top: y - bh / 2 + padY,
    bottom: y + bh / 2 - padY,
  };
}

function collidesWithNoGo(x, y) {
  const b = boatRectAt(x, y);
  for (const z of NO_GO_ZONES) {
    const r = zoneToPxRect(z);
    if (intersects(b, r)) return true;
  }
  return false;
}

function isInsideAllowed(x, y) {
  if (!USE_ALLOWED_ZONES) return true;
  if (!ALLOWED_ZONES.length) return true;

  const b = boatRectAt(x, y);
  for (const z of ALLOWED_ZONES) {
    const r = zoneToPxRect(z);
    if (containsRect(r, b)) return true;
  }
  return false;
}

function clampToStage() {
  const rect = stage.getBoundingClientRect();
  const bw = barco.offsetWidth;
  const bh = barco.offsetHeight;

  const minX = bw * 0.5;
  const maxX = rect.width - bw * 0.5;
  const minY = bh * 0.5;
  const maxY = rect.height - bh * 0.5;

  pos.x = Math.max(minX, Math.min(maxX, pos.x));
  pos.y = Math.max(minY, Math.min(maxY, pos.y));
}

function ensureDebugLayer() {
  let layer = stage.querySelector(".debug-layer");
  if (layer) return layer;

  layer = document.createElement("div");
  layer.className = "debug-layer";
  Object.assign(layer.style, {
    position: "absolute",
    inset: "0",
    zIndex: "9",
    pointerEvents: "none",
  });
  stage.appendChild(layer);
  return layer;
}

function drawZones() {
  if (!DEBUG_ZONES) return;

  const layer = ensureDebugLayer();
  layer.innerHTML = "";

  const addRect = (z, color, label) => {
    const el = document.createElement("div");
    el.style.left = `${z.x}%`;
    el.style.top = `${z.y}%`;
    el.style.width = `${z.w}%`;
    el.style.height = `${z.h}%`;
    el.style.border = `2px dashed ${color}`;
    el.style.background = `${color}22`;
    el.style.borderRadius = "12px";
    el.style.position = "absolute";

    const tag = document.createElement("div");
    tag.textContent = label;
    Object.assign(tag.style, {
      position: "absolute",
      left: "8px",
      top: "8px",
      fontSize: "12px",
      fontWeight: "900",
      padding: "4px 8px",
      borderRadius: "999px",
      color: "#fff",
      background: "rgba(0,0,0,.45)",
      border: "1px solid rgba(255,255,255,.15)",
      backdropFilter: "blur(6px)",
      maxWidth: "90%",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });

    el.appendChild(tag);
    layer.appendChild(el);
  };

  for (const z of NO_GO_ZONES) addRect(z, "rgba(255,80,80,.95)", `BLOQUEIO: ${z.name ?? ""}`);
  if (USE_ALLOWED_ZONES) for (const z of ALLOWED_ZONES) addRect(z, "rgba(80,220,140,.95)", `PERMITIDO: ${z.name ?? ""}`);
}

const points = [
  { id: "p1", x: 38, y: 44, collected: false, label: "Ponto 1 — margem central" },
  { id: "p2", x: 58, y: 30, collected: false, label: "Ponto 2 — trecho médio" },
  { id: "p3", x: 70, y: 47.5, collected: false, label: "Ponto 3 — trecho superior" },
];

const pointEls = new Map();

/* =====================================================
   AQUI: troca do SVG antigo por "!" vermelho interativo
   ===================================================== */
function createPointElements() {
  for (const p of points) {
    const el = document.createElement("div");
    el.className = "collect-point";
    el.dataset.id = p.id;
    el.style.left = `${p.x}%`;
    el.style.top = `${p.y}%`;

    const icon = document.createElement("div");
    icon.className = "collect-excl";
    icon.textContent = "!";

    el.appendChild(icon);
    stage.appendChild(el);
    pointEls.set(p.id, el);
  }
}


function pointToPx(p) {
  const rect = stage.getBoundingClientRect();
  return { x: rect.width * (p.x / 100), y: rect.height * (p.y / 100) };
}

function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

const NEAR_RADIUS_PX = 78;

function getNearPoint() {
  const b = { x: pos.x, y: pos.y };
  let best = null;
  let bestD = Infinity;

  for (const p of points) {
    if (p.collected) continue;
    const pp = pointToPx(p);
    const d = dist(b.x, b.y, pp.x, pp.y);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }

  if (!best) return null;
  if (bestD <= NEAR_RADIUS_PX) return best;
  return null;
}

function setPointNearVisual(pointId, near) {
  const el = pointEls.get(pointId);
  if (!el) return;
  el.classList.toggle("near", !!near);
}

function setPointDone(pointId) {
  const el = pointEls.get(pointId);
  if (!el) return;
  el.classList.add("done");
  el.classList.remove("near");
}

function clampRiverByNoGoOnly() {
  return !collidesWithNoGo(pos.x, pos.y) && isInsideAllowed(pos.x, pos.y);
}

/* =========================
   MINI-PAINEL (UI)
   ========================= */
function ensureUIPanel() {
  if (ui.panel) return;

  const panel = document.createElement("div");
  panel.className = "mini-panel";

  const top = document.createElement("div");
  top.className = "mini-top";

  const title = document.createElement("div");
  title.className = "mini-title";
  title.textContent = "COLETA";

  const topRight = document.createElement("div");
  topRight.style.fontSize = "12px";
  topRight.style.opacity = ".9";
  topRight.textContent = "Segure E | Aperte Espaço";

  top.appendChild(title);
  top.appendChild(topRight);

  const sub = document.createElement("div");
  sub.className = "mini-sub";

  const track = document.createElement("div");
  track.className = "track";

  const good = document.createElement("div");
  good.className = "good-zone";

  const needle = document.createElement("div");
  needle.className = "needle";

  track.appendChild(good);
  track.appendChild(needle);

  const stats = document.createElement("div");
  stats.className = "mini-stats";

  const tries = document.createElement("div");
  tries.className = "chip";
  tries.textContent = "Tentativas: 3";

  const hits = document.createElement("div");
  hits.className = "chip";
  hits.textContent = "Acertos: 0/3";

  stats.appendChild(tries);
  stats.appendChild(hits);

  const hint = document.createElement("div");
  hint.className = "mini-hint";
  hint.textContent = "Dica: acerte Espaço na faixa verde (3 acertos).";

  panel.appendChild(top);
  panel.appendChild(sub);
  panel.appendChild(track);
  panel.appendChild(stats);
  panel.appendChild(hint);

  stage.appendChild(panel);

  ui.panel = panel;
  ui.sub = sub;
  ui.needle = needle;
  ui.zoneGood = good;
  ui.tries = tries;
  ui.hits = hits;
}

function openPanel(text) {
  ensureUIPanel();
  ui.sub.textContent = text;
  ui.panel.style.display = "grid";
}

function closePanel() {
  if (!ui.panel) return;
  ui.panel.style.display = "none";
}

/* =========================
   MODAL (POPUP) DE COLETA
   ========================= */
let modalEl = null;
let pendingFinalReport = false;

function ensureCollectModal() {
  if (modalEl) return modalEl;

  modalEl = document.createElement("div");
  modalEl.className = "collect-modal";
  modalEl.innerHTML = `
    <div class="backdrop" data-backdrop></div>
    <div class="card" role="dialog" aria-modal="true" aria-label="Amostra Coletada">
      <div class="top">
        <div class="title">Amostra Coletada 🎉</div>
        <button class="close" type="button" data-close>Fechar</button>
      </div>
      <div class="body">
        <div class="thumb"><img data-img alt="Amostra"/></div>
        <div>
          <div class="name" data-name></div>
          <div class="tagline" data-tagline></div>
          <div class="list" data-list></div>
        </div>
      </div>
      <div class="foot">
        <button class="btn2" type="button" data-ok>Continuar</button>
      </div>
    </div>
  `;

  stage.appendChild(modalEl);

  const close = () => closeCollectModal();
  modalEl.querySelector("[data-close]")?.addEventListener("click", close);
  modalEl.querySelector("[data-ok]")?.addEventListener("click", close);
  modalEl.querySelector("[data-backdrop]")?.addEventListener("click", close);

  window.addEventListener("keydown", (e) => {
    if (!modalEl?.classList.contains("show")) return;
    if (e.key === "Escape") closeCollectModal();
  });

  return modalEl;
}

function openCollectModal(pointId) {
  const m = ensureCollectModal();
  const data = SAMPLE_INFO[pointId];
  if (!data) return;

  const img = m.querySelector("[data-img]");
  const name = m.querySelector("[data-name]");
  const tagline = m.querySelector("[data-tagline]");
  const list = m.querySelector("[data-list]");

  img.src = data.img;
  name.textContent = data.name;
  tagline.textContent = data.tagline;

  list.innerHTML = "";
  for (const [k, v] of data.props) {
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `<div class="k">${k}</div><div class="v">${v}</div>`;
    list.appendChild(row);
  }

  m.classList.add("show");
  setHint(`${data.name} coletada. ESC ou "Continuar".`);
}

function closeCollectModal() {
  if (!modalEl) return;
  modalEl.classList.remove("show");

  if (pendingFinalReport) {
    pendingFinalReport = false;
    setTimeout(() => openReportModal(), 160);
    return;
  }

  setHint("Use WASD ou as setinhas para mover o barco e ir aos pontos de interesse.");
}

/* =========================
   RELATÓRIO GERAL (FINAL)
   ========================= */
let reportEl = null;

function ensureReportModal() {
  if (reportEl) return reportEl;

  reportEl = document.createElement("div");
  reportEl.className = "report-overlay";

  reportEl.innerHTML = `
    <div class="report-backdrop" data-backdrop></div>

    <div class="report-card" role="dialog" aria-modal="true" aria-label="Relatório Geral da Coleta">
      <div class="report-top">
        <div class="report-h1">Relatório Geral da Coleta</div>
        <button class="report-close" type="button" data-close>Fechar</button>
      </div>

      <div class="report-content">
        <div class="report-title" data-title></div>
        <div class="report-sub" data-sub></div>

        <div class="report-list" data-list></div>

        <div class="report-note">
          Próximo passo: usar o multiparâmetro para verificar indicadores e confirmar as suspeitas.
        </div>
      </div>

      <div class="report-actions">
        <button class="report-btn" type="button" data-start>Iniciar a análise</button>
      </div>
    </div>
  `;

  stage.appendChild(reportEl);

  const close = () => closeReportModal();
  reportEl.querySelector("[data-close]")?.addEventListener("click", close);
  reportEl.querySelector("[data-backdrop]")?.addEventListener("click", close);

  reportEl.querySelector("[data-start]")?.addEventListener("click", () => {
    setHint("Abrindo cena de análise...");
    window.location.href = NEXT_SCENE_URL;
  });

  window.addEventListener("keydown", (e) => {
    if (!reportEl?.classList.contains("show")) return;
    if (e.key === "Escape") closeReportModal();
  });

  return reportEl;
}

function buildGeneralReportItems() {
  return [
    ["Comparativo visual", "As amostras apresentam um gradiente de impacto: da mais límpida (A1) para sinais fortes de alteração (A2 e A3)."],
    ["Amostra 1 (referência)", "Baixa turbidez e maior transparência sugerem menor carga de partículas/algas; útil como comparação para as demais leituras."],
    ["Amostra 2 (eutrofização)", "Cor verde turva indica possível floração de algas e excesso de nutrientes; pode estar associada à queda de oxigênio dissolvido e odores."],
    ["Amostra 3 (escurecida)", "Tonalidade marrom/âmbar sugere sedimentos e/ou matéria orgânica; pode indicar escoamento superficial, decomposição e aumento de carga orgânica."],
    ["Hipóteses principais", "A2 aponta para eutrofização; A3 aponta para aporte de sedimentos/matéria orgânica. A confirmação depende das medidas do multiparâmetro."],
    ["Prioridades na análise", "Comparar pH, condutividade e principalmente OD (oxigênio dissolvido) entre os pontos; diferenças grandes reforçam as hipóteses de impacto."],
  ];
}

function openReportModal() {
  const m = ensureReportModal();

  const title = m.querySelector("[data-title]");
  const sub = m.querySelector("[data-sub]");
  const list = m.querySelector("[data-list]");

  title.textContent = "Resumo das observações (3 amostras)";
  sub.textContent = "Relatório qualitativo consolidado para orientar a análise instrumental.";

  list.innerHTML = "";
  for (const [k, v] of buildGeneralReportItems()) {
    const row = document.createElement("div");
    row.className = "report-row";
    row.innerHTML = `<div class="rk">${k}</div><div class="rv">${v}</div>`;
    list.appendChild(row);
  }

  m.classList.add("show");
  setHint('Relatório pronto. Clique em "Iniciar a análise".');
}

function closeReportModal() {
  if (!reportEl) return;
  reportEl.classList.remove("show");
  setHint('Clique em "Iniciar a análise" para prosseguir.');
}

/* =========================
   MINIGAME (agulha)
   ========================= */
let activePointId = null;
let collecting = false;

let needleX = 0.12;
let needleV = 0.012;
let goodStart = 0.62;
let goodW = 0.16;

let triesLeft = 3;
let hitsNeed = 3;
let hitsNow = 0;

let spaceWasDown = false;

function resetMiniGame() {
  needleX = 0.12;
  needleV = 0.012 + Math.random() * 0.006;
  goodStart = 0.56 + Math.random() * 0.22;
  goodW = 0.12 + Math.random() * 0.10;

  triesLeft = 3;
  hitsNow = 0;

  ensureUIPanel();
  ui.zoneGood.style.left = goodStart * 100 + "%";
  ui.zoneGood.style.width = goodW * 100 + "%";
  ui.tries.textContent = `Tentativas: ${triesLeft}`;
  ui.hits.textContent = `Acertos: ${hitsNow}/${hitsNeed}`;
}

function updateNeedle() {
  needleX += needleV;

  if (needleX <= 0.06) {
    needleX = 0.06;
    needleV *= -1;
  }
  if (needleX >= 0.94) {
    needleX = 0.94;
    needleV *= -1;
  }

  const jitter = 0.92 + Math.random() * 0.16;
  needleV *= jitter;
  needleV = Math.max(0.006, Math.min(0.03, Math.abs(needleV))) * (needleV < 0 ? -1 : 1);

  ensureUIPanel();
  ui.needle.style.left = needleX * 100 + "%";
}

function isNeedleInGood() {
  return needleX >= goodStart && needleX <= goodStart + goodW;
}

function updatePanelText(point) {
  openPanel(`${point.label}. Segure [E] e acerte Espaço na faixa verde (${hitsNeed}x).`);
}

let collected = 0;

function finishCollect(point) {
  collecting = false;
  point.collected = true;
  collected += 1;

  setPointDone(point.id);

  setHint(`Coleta concluída (${collected}/${points.length}). Continue o percurso.`);
  closePanel();

  setTimeout(() => openCollectModal(point.id), 140);

  if (collected >= points.length) {
    pendingFinalReport = true;
    setHint("Todas as amostras coletadas. Feche o popup para ver o relatório geral.");
  }
}

function cancelCollect(msg) {
  collecting = false;
  openPanel(msg);
  setTimeout(() => {
    if (!collecting) closePanel();
  }, 650);
}

/* =========================
   LOOP PRINCIPAL
   ========================= */
function tick() {
  const prev = { x: pos.x, y: pos.y };

  // pausa gameplay quando algum modal estiver aberto
  if (modalEl?.classList.contains("show") || reportEl?.classList.contains("show")) {
    requestAnimationFrame(tick);
    return;
  }

  const near = getNearPoint();
  for (const p of points) setPointNearVisual(p.id, false);
  if (near && !near.collected) setPointNearVisual(near.id, true);

  const eKey = !!keys["e"];
  const spaceDown = !!keys[" "];

  if (!collecting) {
    const up = keys["w"] || keys["arrowup"];
    const down = keys["s"] || keys["arrowdown"];
    const left = keys["a"] || keys["arrowleft"];
    const right = keys["d"] || keys["arrowright"];

    if (up) pos.y -= SPEED;
    if (down) pos.y += SPEED;
    if (left) pos.x -= SPEED;
    if (right) pos.x += SPEED;

    clampToStage();

    const ok = clampRiverByNoGoOnly();
    if (!ok) {
      pos.x = prev.x;
      pos.y = prev.y;
    }

    if (near && !near.collected) {
      setHint("Encoste no ponto e segure [E] para iniciar a coleta.");
      if (eKey) {
        collecting = true;
        activePointId = near.id;
        resetMiniGame();
        updatePanelText(near);
        spaceWasDown = false;
      }
    } else {
      if (collected < points.length) setHint("Use WASD ou as setinhas para mover o barco e ir aos pontos de interesse.");
      else setHint('Coleta finalizada. Clique em "Iniciar a análise".');
    }

    applyPosition();
    requestAnimationFrame(tick);
    return;
  }

  const ap = points.find((p) => p.id === activePointId);
  if (!ap || ap.collected) {
    collecting = false;
    closePanel();
    requestAnimationFrame(tick);
    return;
  }

  const stillNear = getNearPoint();
  if (!stillNear || stillNear.id !== ap.id) {
    cancelCollect("Você saiu do ponto. Encoste novamente e segure [E].");
    requestAnimationFrame(tick);
    return;
  }

  if (!eKey) {
    cancelCollect("Você soltou [E]. Segure [E] para manter a coleta ativa.");
    requestAnimationFrame(tick);
    return;
  }

  updateNeedle();
  updatePanelText(ap);

  const justPressedSpace = spaceDown && !spaceWasDown;
  spaceWasDown = spaceDown;

  if (justPressedSpace) {
    if (isNeedleInGood()) {
      hitsNow += 1;
      ui.hits.textContent = `Acertos: ${hitsNow}/${hitsNeed}`;
      needleV *= 1.05;

      if (hitsNow >= hitsNeed) {
        finishCollect(ap);
        requestAnimationFrame(tick);
        return;
      }
    } else {
      triesLeft -= 1;
      ui.tries.textContent = `Tentativas: ${triesLeft}`;
      needleV *= 1.18;

      if (triesLeft <= 0) {
        cancelCollect("Falhou na coleta. Reposicione no ponto e tente de novo.");
        requestAnimationFrame(tick);
        return;
      }
    }
  }

  applyPosition();
  requestAnimationFrame(tick);
}

window.addEventListener("resize", () => {
  clampToStage();
  applyPosition();
  drawZones();
});

createPointElements();
initPosition();
drawZones();
ensureUIPanel();
setHint("Use WASD ou as setinhas para mover o barco e ir aos pontos de interesse");
tick();
