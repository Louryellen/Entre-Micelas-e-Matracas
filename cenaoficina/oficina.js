(function () {
  // =========================
  // CONFIG: PRÓXIMA CENA
  // =========================
  const NEXT_SCENE_URL = "../cena-pinturas/pintura.html"; // troque para o arquivo/rota real da próxima cena

  // =========================
  // Helpers (robustez)
  // =========================
  const $ = (id) => document.getElementById(id);

  const btnReset = $("btnReiniciar");
  const btnStart = $("btnStart");
  const scrollBtn = $("scrollBtn");

  const hudSub = $("hudSub");
  const chipStep = $("chipStep");
  const chipErrors = $("chipErrors");
  const chipLot = $("chipLot");

  const targetsBox = $("targets");
  const tNaOH = $("tNaOH");
  const tWater = $("tWater");
  const mNaOH = $("mNaOH");
  const mWater = $("mWater");
  const hint = $("hint");

  const progressWrap = $("progress");
  const progressLabel = $("progressLabel");
  const progressFill = $("progressFill");

  const modal = $("modal");
  const modalTitle = $("modalTitle");
  const modalSub = $("modalSub");
  const modalBody = $("modalBody");
  const btnClose = $("btnClose");

  const toast = $("toast");
  let toastTimer = null;

  const topbarText = $("topbarText");
  const hudTitle = $("hudTitle");

  const bgScene = $("bgScene");
  const hudEl = $("hud");

  const finalFx = $("finalFx");
  const finalFw = $("finalFw");
  const btnAdvance = $("btnAdvance");

  // Se algo crítico estiver faltando, evita “quebrar silencioso”
  const REQUIRED = [
    btnReset, btnStart, scrollBtn,
    hudSub, chipStep, chipErrors, chipLot,
    targetsBox, tNaOH, tWater, mNaOH, mWater, hint,
    progressWrap, progressLabel, progressFill,
    modal, modalTitle, modalSub, modalBody, btnClose,
    toast, topbarText, bgScene, hudEl,
    finalFx, finalFw, btnAdvance
  ];

  if (REQUIRED.some((el) => !el)) {
    console.error("Faltam elementos no HTML. Confira IDs obrigatórios.");
    return;
  }

  function setTopbar(msg) { topbarText.textContent = msg; }

  function setHudTitle(text) {
    if (!hudTitle) return;
    hudTitle.textContent = text;
  }

  const hs = {
    naoh: $("hsNaOH"),
    agua: $("hsAgua"),
    panela: $("hsPanela"),
    fogao: $("hsFogao"),
    colheres: $("hsColheres"),
    oleo: $("hsOleo"),
    molde: $("hsMolde"),
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand = (min, max) => min + Math.random() * (max - min);

  // Ajuste do “balão” (toast): maior e um pouco mais alto
  function tuneToastUI() {
    toast.style.fontSize = "18px";
    toast.style.lineHeight = "1.25";
    toast.style.padding = "12px 16px";
    toast.style.bottom = "9%";
    toast.style.maxWidth = "78%";
  }

  function showToast(msg, type) {
    toast.hidden = false;
    toast.textContent = msg;
    toast.classList.remove("good", "bad");
    toast.classList.add(type === "good" ? "good" : "bad");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.hidden = true), 1900);
  }

  // Bloqueio opcional do modal (para final e para cooldown)
  let modalLocked = false;

  function openModal(title, sub, html) {
    modalTitle.textContent = title;
    modalSub.textContent = sub;
    modalBody.innerHTML = html;
    modal.hidden = false;
  }

  function closeModal() {
    if (modalLocked) return;

    // ✅ se fechar o modal durante aquecimento, para a simulação
    if (game?.heat?.active) game.stopHeat();

    // ✅ se fechar o modal durante resfriamento, para a simulação
    if (game?.cool?.active) game.stopCoolDown();

    modal.hidden = true;
    modalBody.innerHTML = "";
  }

  modal.addEventListener("click", (e) => {
    if (modalLocked) return;
    if (e.target && e.target.dataset && e.target.dataset.close === "1") closeModal();
  });
  btnClose.addEventListener("click", closeModal);

  // ---------------------------
  // FOGOS DE ARTIFÍCIO (Canvas)
  // ---------------------------
  function startFireworks(canvas) {
    const ctx = canvas.getContext("2d", { alpha: true });
    let raf = null;
    let running = true;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particles = [];
    const bursts = [];

    function randHue() {
      return Math.floor(rand(0, 360));
    }

    function spawnBurst() {
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;

      const x = rand(w * 0.15, w * 0.85);
      const y = rand(h * 0.15, h * 0.65);

      const hue = randHue();
      const count = Math.floor(rand(28, 48));
      const power = rand(1.8, 3.2);

      bursts.push({ x, y, hue, t: 0, count, power });
    }

    function emit(b) {
      for (let i = 0; i < b.count; i++) {
        const a = rand(0, Math.PI * 2);
        const s = rand(0.6, 1.0) * b.power;
        particles.push({
          x: b.x, y: b.y,
          vx: Math.cos(a) * s * rand(40, 90) / 60,
          vy: Math.sin(a) * s * rand(40, 90) / 60,
          life: rand(0.9, 1.4),
          age: 0,
          hue: b.hue + rand(-14, 14),
          size: rand(1.2, 2.4),
          drag: rand(0.985, 0.992),
        });
      }
    }

    // dispara fogos em intervalos
    let burstTimer = setInterval(() => {
      if (!running) return;
      spawnBurst();
    }, 520);

    // primeiro burst imediato
    spawnBurst();

    let last = performance.now();

    function loop(now) {
      if (!running) return;

      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.t += dt;
        if (b.t >= 0.02) {
          emit(b);
          bursts.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += dt;

        if (p.age >= p.life) {
          particles.splice(i, 1);
          continue;
        }

        p.vy += 0.035 * 60 * dt;

        p.vx *= Math.pow(p.drag, dt * 60);
        p.vy *= Math.pow(p.drag, dt * 60);

        p.x += p.vx * 60 * dt;
        p.y += p.vy * 60 * dt;

        const alpha = clamp(1 - p.age / p.life, 0, 1);
        ctx.fillStyle = `hsla(${p.hue}, 95%, 70%, ${alpha})`;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    return function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      clearInterval(burstTimer);
      window.removeEventListener("resize", onResize);
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
    };
  }

  // ---------------------------
  // ETAPAS
  // ---------------------------
  const STEPS = [
    "Preparos Iniciais",
    "Calcular quantidade necessária (pergaminho)",
    "Purificar e filtrar óleo (hipoclorito 2,5%)",
    "Aquecer para 55–60°C (não ferver)",
    "Mexer por 2 minutos",
    "Medir NaOH",
    "Medir Água",
    "Ordem segura (NaOH na água)",
    "Adicionar solução ao óleo lentamente",
    "Adicionar detergente (proporção por 1 L)",
    "Resfriar para 25–30°C (aguardar)",
    "Adicionar corante e óleo essencial (voláteis)",
    "Verter (molde)",
    "Finalizar",
  ];

  // Receita base:
  // 1 L (1000 mL) óleo → 100 g NaOH + 150 mL água
  const BASE = { oil: 1000, naoh: 100, water: 150 };

  const MEASURE = {
    speedMin: 0.16,
    speedMax: 0.34,
    phaseMul: 2.0,
    ampFracNaOH: 0.05,
    ampFracWater: 0.05,
    noiseNaOH: 0.18,
    noiseWater: 0.85,
    lerpFar: 0.16,
    lerpNear: 0.07,
    slowBandMul: 3.0,
  };

  const PURIFY = { tol: 2 }; // mL
  const DETERG = { perLiter: 40, tol: 2 }; // mL por 1 L

  function calcTargets(oilMl) {
    const naoh = (oilMl * BASE.naoh) / BASE.oil;
    const water = (oilMl * BASE.water) / BASE.oil;
    return {
      naoh: Math.round(naoh * 10) / 10,
      water: Math.round(water),
    };
  }

  // Placeholders que NÃO podem cair no valor correto
  function decoyNaOH(trueVal) { return (Number(trueVal) + 7.3).toFixed(1); }
  function decoyWater(trueVal) { return String(Math.round(Number(trueVal) + 17)); }
  function decoyMl(trueVal) { return String(Math.round(Number(trueVal) + 7)); }
  function decoyMlSmall(trueVal) { return String(Math.round(Number(trueVal) + 5)); }

  const game = {
    started: false,
    step: 0,
    errors: 0,

    lotOil: null,
    trueTargets: { naoh: 0, water: 0 },

    playerTargets: { naoh: null, water: null },
    measured: { naoh: null, water: null },

    purified: false,
    chosenColor: null,

    heat: {
      active: false,
      ambient: 25,
      trueTemp: 25,
      readTemp: 25,
      flame: 35,
      inBandSec: 0,
      overSec: 0,
      raf: null,
      last: 0,
    },

    // ✅ Resfriamento antes de corante/óleo essencial
    cool: {
      active: false,
      raf: null,
      last: 0,
      startTemp: 45,
      endTemp: 28,
      tempNow: 45,
      durationSec: 6.0, // “tempo de espera” do jogo (simula o resfriamento)
    },

    stir: { holding: false, progress: 0, raf: null, last: 0 },

    lotOptions: [650, 700, 850, 900, 1000, 1100],

    // fogos
    fireworksStop: null,

    setInstruction(stepTitle, msg) {
      hint.textContent = msg;
      setTopbar(`Etapa ${this.step}: ${stepTitle} — ${msg}`);
    },

    setEndScreen(active) {
      if (active) {
        bgScene.src = "final.jpeg";
        bgScene.alt = "Cena final (Sabões produzidos)";
        hudEl.style.display = "none";
        scrollBtn.style.display = "none";
        Object.values(hs).forEach((el) => { if (el) el.style.display = "none"; });
      } else {
        bgScene.src = "oficina.png";
        bgScene.alt = "Imagem da cena (Oficina)";
        hudEl.style.display = "";
        scrollBtn.style.display = "";
        Object.values(hs).forEach((el) => { if (el) el.style.display = ""; });
      }
    },

    stopFireworks() {
      if (this.fireworksStop) {
        this.fireworksStop();
        this.fireworksStop = null;
      }
    },

    stopCoolDown() {
      this.cool.active = false;
      if (this.cool.raf) cancelAnimationFrame(this.cool.raf);
      this.cool.raf = null;
    },

    // ✅ FINAL: Parabéns sem “caixa” e overlay bem transparente
    openCongratsPopup() {
      modalLocked = true;

      // Detecta elementos “chrome” do modal de forma tolerante ao seu HTML
      const modalCard =
        modal.querySelector(".modal-card") ||
        modal.querySelector(".modal") ||
        modal.firstElementChild ||
        modal;

      const modalHeader =
        modal.querySelector(".modal-head") ||
        modal.querySelector(".modal-header") ||
        modal.querySelector("header");

      // Guarda o estado anterior para restaurar
      const prev = {
        modalBg: modal.style.background,
        modalBackdrop: modal.style.backdropFilter,
        cardBg: modalCard ? modalCard.style.background : "",
        cardBorder: modalCard ? modalCard.style.border : "",
        cardShadow: modalCard ? modalCard.style.boxShadow : "",
        cardPadding: modalCard ? modalCard.style.padding : "",
        cardMaxW: modalCard ? modalCard.style.maxWidth : "",
        cardW: modalCard ? modalCard.style.width : "",
        headerDisplay: modalHeader ? modalHeader.style.display : "",
        closeDisplay: btnClose ? btnClose.style.display : "",
      };

      // Overlay bem transparente (pra ver os sabões atrás)
      modal.style.background = "rgba(0,0,0,.12)";
      modal.style.backdropFilter = "blur(1px)";

      // Remove “janela/caixa” do card do modal
      if (modalCard) {
        modalCard.style.background = "transparent";
        modalCard.style.border = "0";
        modalCard.style.boxShadow = "none";
        modalCard.style.padding = "0";
        modalCard.style.width = "min(980px, 96vw)";
        modalCard.style.maxWidth = "980px";
      }

      // Some cabeçalho e botão fechar
      if (modalHeader) modalHeader.style.display = "none";
      if (btnClose) btnClose.style.display = "none";
      if (modalTitle) modalTitle.textContent = "";
      if (modalSub) modalSub.textContent = "";

      const restoreCongratsStyles = () => {
        modalLocked = false;

        modal.style.background = prev.modalBg || "";
        modal.style.backdropFilter = prev.modalBackdrop || "";

        if (modalCard) {
          modalCard.style.background = prev.cardBg || "";
          modalCard.style.border = prev.cardBorder || "";
          modalCard.style.boxShadow = prev.cardShadow || "";
          modalCard.style.padding = prev.cardPadding || "";
          modalCard.style.maxWidth = prev.cardMaxW || "";
          modalCard.style.width = prev.cardW || "";
        }

        if (modalHeader) modalHeader.style.display = prev.headerDisplay || "";
        if (btnClose) btnClose.style.display = prev.closeDisplay || "";

        modal.hidden = true;
        modalBody.innerHTML = "";
      };

      // Corpo: fogos + texto central sem caixa + botões
      openModal(
        "",
        "",
        `
          <div style="position:relative; width:100%;">
            <canvas id="fwCanvas" style="width:100%; height:420px; display:block;"></canvas>

            <div style="
              position:absolute;
              inset:0;
              display:flex;
              align-items:center;
              justify-content:center;
              text-align:center;
              padding:18px;
              pointer-events:none;
            ">
              <div>
                <div style="
                  font-size:40px;
                  font-weight:900;
                  letter-spacing:.3px;
                  text-shadow: 0 8px 22px rgba(0,0,0,.55);
                ">Parabéns!</div>

                <div style="
                  margin-top:10px;
                  font-size:16px;
                  color: rgba(255,255,255,.92);
                  text-shadow: 0 6px 18px rgba(0,0,0,.55);
                ">As unidades de sabão foram produzidas.</div>
              </div>
            </div>

            <div class="actions" style="margin-top:14px">
              <button class="btn-secondary" id="btnAgain" type="button">Reiniciar</button>
              <button class="btn" id="btnNextScene" type="button">Avançar</button>
            </div>
          </div>
        `
      );

      // Fogos
      const canvas = document.getElementById("fwCanvas");
      this.stopFireworks();
      if (canvas) this.fireworksStop = startFireworks(canvas);

      const btnAgain = document.getElementById("btnAgain");
      const btnNext = document.getElementById("btnNextScene");

      if (btnAgain) {
        btnAgain.addEventListener("click", () => {
          this.stopFireworks();
          restoreCongratsStyles();
          this.reset();
        }, { once: true });
      }

      if (btnNext) {
        btnNext.addEventListener("click", () => {
          this.stopFireworks();
          restoreCongratsStyles();
          window.location.href = NEXT_SCENE_URL;
        }, { once: true });
      }
    },

    reset() {
      setHudTitle("Produção de Sabão");

      this.started = false;
      this.step = 0;
      this.errors = 0;

      this.lotOil = null;
      this.trueTargets = { naoh: 0, water: 0 };
      this.playerTargets = { naoh: null, water: null };
      this.measured = { naoh: null, water: null };
      this.purified = false;
      this.chosenColor = null;

      this.stopHeat();
      this.stopCoolDown();
      this.stopStir();
      this.stopFireworks();

      // garante que o modal volte ao normal, caso tenha sido alterado no final
      modalLocked = false;
      modal.style.background = "";
      modal.style.backdropFilter = "";
      btnClose.style.display = "";
      modal.hidden = true;
      modalBody.innerHTML = "";

      const modalCard =
        modal.querySelector(".modal-card") ||
        modal.querySelector(".modal") ||
        modal.firstElementChild ||
        modal;

      if (modalCard) {
        modalCard.style.background = "";
        modalCard.style.border = "";
        modalCard.style.boxShadow = "";
        modalCard.style.padding = "";
        modalCard.style.width = "";
        modalCard.style.maxWidth = "";
      }

      const modalHeader =
        modal.querySelector(".modal-head") ||
        modal.querySelector(".modal-header") ||
        modal.querySelector("header");

      if (modalHeader) modalHeader.style.display = "";

      this.setEndScreen(false);

      targetsBox.hidden = true;
      progressWrap.hidden = true;
      progressFill.style.width = "0%";

      btnStart.disabled = false;
      btnStart.textContent = "Começar";

      scrollBtn.disabled = false;
      scrollBtn.classList.remove("is-zoomed", "active-scroll");

      hudSub.textContent = "Clique em “Começar” para iniciar a produção.";
      setTopbar("Produção de Sabão — Clique em “Começar” para iniciar.");
      hint.textContent = "Dica: use EPIs (luva, avental e máscara) e use o pergaminho para escalar a receita da quantidade.";

      tNaOH.textContent = "—";
      tWater.textContent = "—";
      mNaOH.textContent = "Medido: —";
      mWater.textContent = "Medido: —";

      this.updateUI();
      this.lockHotspots();
      this.highlightStep();
    },

    start() {
      setHudTitle("Produção de Sabão");
      this.started = true;
      btnStart.disabled = true;
      btnStart.textContent = "Em jogo";
      this.newLot();
    },

    newLot() {
      this.playerTargets = { naoh: null, water: null };
      this.measured = { naoh: null, water: null };
      this.purified = false;
      this.chosenColor = null;

      this.lotOil = this.lotOptions[Math.floor(Math.random() * this.lotOptions.length)];
      this.trueTargets = calcTargets(this.lotOil);

      chipLot.textContent = `Quantidade: ${this.lotOil} mL`;
      targetsBox.hidden = false;

      tNaOH.textContent = "— (calcule)";
      tWater.textContent = "— (calcule)";
      mNaOH.textContent = "Medido: —";
      mWater.textContent = "Medido: —";

      this.step = 1;
      hudSub.textContent = `Quantidade do Dia: ${this.lotOil} mL de óleo. Escale a receita do pergaminho (base 1 L). (Use EPIs.)`;

      this.updateUI();
      this.lockHotspots();
      this.highlightStep();
      this.setInstruction(STEPS[this.step], "Clique no pergaminho e calcule as quantidades necessesárias (NaOH e água).");
    },

    updateUI() {
      chipStep.textContent = `Etapa: ${STEPS[this.step] || "—"}`;
      chipErrors.textContent = `Erros: ${this.errors}`;
    },

    fail(msg) { this.errors += 1; this.updateUI(); showToast(msg, "bad"); },
    ok(msg) { showToast(msg, "good"); },

    highlightStep() {
      Object.values(hs).forEach((el) => el && el.classList.remove("active"));
      if (!this.started) return;

      if (this.step === 1) scrollBtn.classList.add("active-scroll");
      else scrollBtn.classList.remove("active-scroll");

      if (this.step === 2) hs.panela.classList.add("active");
      if (this.step === 3) hs.fogao.classList.add("active");
      if (this.step === 4) hs.colheres.classList.add("active");
      if (this.step === 5) hs.naoh.classList.add("active");
      if (this.step === 6) hs.agua.classList.add("active");
      if (this.step === 7) hs.panela.classList.add("active");
      if (this.step === 8) hs.panela.classList.add("active");
      if (this.step === 9) hs.oleo.classList.add("active");
      if (this.step === 12) hs.molde.classList.add("active");
    },

    lockHotspots() {
      Object.values(hs).forEach((el) => el && el.classList.add("locked"));

      if (!this.started) {
        Object.values(hs).forEach((el) => el && el.classList.remove("locked"));
        return;
      }

      const unlock = (id) => hs[id]?.classList.remove("locked");

      if (this.step === 1) return;

      if (this.step === 2) unlock("panela");
      else if (this.step === 3) unlock("fogao");
      else if (this.step === 4) unlock("colheres");
      else if (this.step === 5) unlock("naoh");
      else if (this.step === 6) unlock("agua");
      else if (this.step === 7) unlock("panela");
      else if (this.step === 8) unlock("panela");
      else if (this.step === 9) unlock("oleo");
      else if (this.step === 12) unlock("molde");
    },

    // Etapa 1: Pergaminho
    openCalculator() {
      if (!this.started) { showToast("Clique em Começar para iniciar.", "bad"); return; }
      if (this.step !== 1) { showToast("O pergaminho é usado na Etapa 1 (calcular quantidade necessária).", "bad"); return; }

      const baseTargets = calcTargets(BASE.oil);

      openModal(
        "Pergaminho — Escalar a receita",
        `Sua quantidade: ${this.lotOil} mL de óleo. Use a receita padrão (1 L) e escale.`,
        `
          <div class="row">
            <div>
              <div class="mini">Receita padrão</div>
              <div class="big">1 L de óleo → NaOH ${baseTargets.naoh.toFixed(1)} g | Água ${baseTargets.water} mL</div>
            </div>
          </div>

          <div class="mini" style="margin-top:10px">
            Preencha a quantidade necessária de <b>${this.lotOil} mL</b>.
          </div>

          <div class="field">
            <label class="mini">NaOH quantidade necessária (g)</label>
            <input class="input" id="inNaOH" inputmode="decimal"
              placeholder="Ex.: ${decoyNaOH(this.trueTargets.naoh)}"
              value="${this.playerTargets.naoh ?? ""}">
          </div>

          <div class="field">
            <label class="mini">Água quantidade necessária (mL)</label>
            <input class="input" id="inWater" inputmode="numeric"
              placeholder="Ex.: ${decoyWater(this.trueTargets.water)}"
              value="${this.playerTargets.water ?? ""}">
          </div>

          <div class="mini" style="margin-top:10px">
            Segurança: use <b>luvas</b>, <b>avental</b> e <b>máscara</b>. Recipiente preferencialmente <b>plástico</b>.
          </div>

          <div class="actions">
            <button class="btn-secondary" id="btnCalcClose" type="button">Voltar</button>
            <button class="btn" id="btnCalcOk" type="button">Validar</button>
          </div>
        `
      );

      $("btnCalcClose").addEventListener("click", closeModal);

      $("btnCalcOk").addEventListener("click", () => {
        const inNaOH = $("inNaOH").value.replace(",", ".");
        const inWater = $("inWater").value.replace(",", ".");

        const naoh = Number(inNaOH);
        const water = Number(inWater);

        if (!Number.isFinite(naoh) || !Number.isFinite(water)) {
          this.fail("Preencha os dois valores corretamente.");
          return;
        }

        const okNa = Math.abs(naoh - this.trueTargets.naoh) <= 0.8;
        const okWa = Math.abs(water - this.trueTargets.water) <= 8;

        this.playerTargets.naoh = naoh;
        this.playerTargets.water = water;

        tNaOH.textContent = `${naoh.toFixed(1)} g`;
        tWater.textContent = `${Math.round(water)} mL`;

        if (!okNa || !okWa) {
          this.fail("Cálculo incorreto (fora da tolerância). Ajuste e valide novamente.");
          this.setInstruction(STEPS[this.step], "Ajuste as quantidades no pergaminho e valide novamente.");
          return;
        }

        closeModal();
        this.ok("Cálculo validado.");

        this.step = 2;
        this.updateUI();
        this.lockHotspots();
        this.highlightStep();
        this.setInstruction(STEPS[this.step], "Clique na panela para iniciar a purificação/filtragem.");
      });
    },

    // Etapa 2: Purificar
    openPurifyOil() {
      if (!this.started) return;

      const need = Math.round((this.lotOil / 1000) * 50);
      const tol = PURIFY.tol;

      openModal(
        "Purificação e filtragem do óleo",
        "Peneirar com Bombril + hipoclorito de sódio 2,5% (50 mL por 1 L).",
        `
          <div class="mini">
            <b>EPIs obrigatórios:</b> luvas, avental e máscara. Use <b>recipiente plástico</b>.
          </div>

          <div class="mini" style="margin-top:10px">
            1) <b>Peneire/filtre</b> o óleo com peneira e <b>Bombril</b>.<br>
            2) Adicione <b>hipoclorito de sódio 2,5%</b> usando a referência: <b>50 mL para 1 L de óleo</b>.
          </div>

          <div class="row" style="margin-top:10px">
            <div>
              <div class="mini">Sua quantidade</div>
              <div class="big">${this.lotOil} mL</div>
            </div>
            <div>
              <div class="mini">Hipoclorito de sódio necessário</div>
              <div class="big">— (calcule)</div>
            </div>
          </div>

          <div class="mini" style="margin-top:8px; color: var(--muted);">
            Dica de cálculo: (<b>quantidade</b> ÷ 1000) × 50
          </div>

          <div class="field">
            <label class="mini">Quanto de hipoclorito de sódio 2,5% (mL) você vai usar?</label>
            <input class="input" id="inBleach" inputmode="numeric" placeholder="Ex.: ${decoyMl(need)}" value="">
          </div>

          <div class="mini" style="margin-top:10px; color: var(--muted);">
            Depois: aquecer e manter <b>55–60°C</b> (não pode ferver) e mexer por <b>2 minutos</b>.
          </div>

          <div class="actions">
            <button class="btn-secondary" id="btnPurClose" type="button">Voltar</button>
            <button class="btn" id="btnPurOk" type="button">Validar</button>
          </div>
        `
      );

      $("btnPurClose").addEventListener("click", closeModal);

      $("btnPurOk").addEventListener("click", () => {
        const v = Number($("inBleach").value.replace(",", "."));
        if (!Number.isFinite(v)) {
          this.fail("Preencha um valor numérico (mL).");
          return;
        }

        closeModal();

        const ok = Math.abs(v - need) <= tol;
        if (!ok) {
          this.fail("Proporção incorreta. Refaça o cálculo e tente de novo.");
          this.setInstruction(STEPS[this.step], "Clique na panela e calcule novamente o hipoclorito de sódio.");
          return;
        }

        this.purified = true;
        this.ok("Purificação validada. Vamos controlar a temperatura.");

        this.step = 3;
        this.updateUI();
        this.lockHotspots();
        this.highlightStep();
        this.setInstruction(STEPS[this.step], "Clique no fogão e mantenha 55–60°C (não ferver).");
      });
    },

    // Etapa 3: Aquecer — mais estável
    openHeatGame() {
      if (!this.started) return;

      this.stopHeat();

      const massFactor = clamp(this.lotOil / 1000, 0.65, 1.25);
      const ambient = rand(23, 29);

      const THERMO = { min: 0, max: 80, physMax: 72 };

      const toPct = (t) => {
        const p = (t - THERMO.min) / (THERMO.max - THERMO.min);
        return clamp(p, 0, 1) * 100;
      };

      const NEED_SEC = 8.0;
      const OVER_LIMIT_SEC = 3.5;
      const BOIL_TEMP = 70.0;
      const LAG_SEC = 1.9;
      const DRIFT = 0.018;
      const K_RESPONSE = 0.55;

      this.heat.active = true;
      this.heat.ambient = ambient;
      this.heat.trueTemp = ambient;
      this.heat.readTemp = ambient;
      this.heat.flame = 35;
      this.heat.inBandSec = 0;
      this.heat.overSec = 0;
      this.heat.last = performance.now();

      progressWrap.hidden = false;
      progressLabel.textContent = "🔥 Aquecendo: mantenha 55–60°C continuamente. Não pode ferver.";
      progressFill.style.width = "0%";
      this.setInstruction(STEPS[this.step], "Ajuste a chama 🔥 e mantenha 55–60°C por tempo contínuo.");

      openModal(
        "Fogão — Controle de temperatura 🔥",
        "Use a barra do termômetro (0–80°C). O valor real tem inércia e o termômetro tem atraso.",
        `
          <div class="row">
            <div>
              <div class="mini">Faixa de Temperatura</div>
              <div class="big">55–60°C</div>
            </div>
            <div>
              <div class="mini">Leitura</div>
              <div class="big" id="tempNow">—</div>
            </div>
          </div>

          <div style="margin-top:12px">
            <div class="mini" style="margin-bottom:6px">Termômetro</div>

            <div style="position:relative; height:16px; border-radius:999px; overflow:hidden;
                        background: rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.14);">
              <div id="band"
                   style="position:absolute; top:0; bottom:0; opacity:.35; border-radius:999px; background: rgba(110,168,254,.8);">
              </div>

              <div id="thermoFill"
                   style="height:100%; width:0%; border-radius:999px; background: rgba(255,255,255,.85);">
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; margin-top:6px; color: var(--muted); font-size:12px">
              <span>0°C</span>
              <span>80°C</span>
            </div>
          </div>

          <div class="mini" style="margin-top:12px">Chama 🔥</div>
          <input class="input" id="flameRange" type="range" min="0" max="100" step="1" value="35" style="width:100%">

          <div class="row" style="margin-top:10px">
            <div>
              <div class="mini">Ambiente</div>
              <div class="big">${ambient.toFixed(0)}°C</div>
            </div>
            <div>
              <div class="mini">Progresso (contínuo)</div>
              <div class="big" id="holdNow">0.0s</div>
            </div>
          </div>

          <div class="mini" style="margin-top:10px; color: var(--muted);">
            Regra: acima de <b>60°C</b> por muito tempo conta erro.
            Se passar de <b>${BOIL_TEMP.toFixed(0)}°C</b>, “ferveu” (erro imediato).
          </div>
        `
      );

      const tempNow = $("tempNow");
      const holdNow = $("holdNow");
      const flameRange = $("flameRange");
      const thermoFill = $("thermoFill");
      const band = $("band");

      const bandLeftPct = toPct(55);
      const bandRightPct = toPct(60);
      band.style.left = `${bandLeftPct}%`;
      band.style.width = `${Math.max(0, bandRightPct - bandLeftPct)}%`;

      flameRange.addEventListener("input", () => {
        this.heat.flame = Number(flameRange.value);
      });

      const loop = (now) => {
        if (!this.heat.active) return;

        const dt = Math.min(0.06, (now - this.heat.last) / 1000);
        this.heat.last = now;

        const flame01 = clamp(this.heat.flame / 100, 0, 1);
        const eq = ambient + flame01 * (THERMO.physMax - ambient);

        const k = (K_RESPONSE / massFactor);
        this.heat.trueTemp += (eq - this.heat.trueTemp) * k * dt * 6.0;

        this.heat.trueTemp += (Math.random() - 0.5) * DRIFT;
        this.heat.trueTemp = clamp(this.heat.trueTemp, ambient - 2, 75);

        const alpha = clamp(dt / LAG_SEC, 0.02, 0.12);
        this.heat.readTemp += (this.heat.trueTemp - this.heat.readTemp) * alpha;
        this.heat.readTemp = clamp(this.heat.readTemp, ambient - 2, 75);

        const read = this.heat.readTemp;
        const inBand = read >= 55 && read <= 60;

        if (inBand) this.heat.inBandSec += dt;
        else this.heat.inBandSec = clamp(this.heat.inBandSec - dt * 1.10, 0, NEED_SEC);

        if (read > 60) this.heat.overSec += dt;
        else this.heat.overSec = clamp(this.heat.overSec - dt * 1.5, 0, 10);

        if (read >= BOIL_TEMP) {
          this.heat.active = false;
          closeModal();
          this.fail("Temperatura passou demais: ferveu. Controle a chama com mais calma.");
          this.setInstruction(STEPS[this.step], "Clique no fogão e tente manter 55–60°C.");
          return;
        }

        if (this.heat.overSec > OVER_LIMIT_SEC) {
          this.heat.active = false;
          closeModal();
          this.fail("Passou de 60°C por tempo demais. Ajuste a chama e tente novamente.");
          this.setInstruction(STEPS[this.step], "Clique no fogão e tente manter 55–60°C.");
          return;
        }

        tempNow.textContent = `${read.toFixed(1)}°C`;
        holdNow.textContent = `${this.heat.inBandSec.toFixed(1)}s`;

        thermoFill.style.width = `${toPct(read)}%`;

        const pctHold = clamp(this.heat.inBandSec / NEED_SEC, 0, 1);
        progressFill.style.width = `${Math.round(pctHold * 100)}%`;

        if (this.heat.inBandSec >= NEED_SEC) {
          this.heat.active = false;
          closeModal();
          this.ok("Temperatura estabilizada (55–60°C).");

          this.step = 4;
          this.updateUI();
          this.lockHotspots();
          this.highlightStep();
          this.setInstruction(STEPS[this.step], "Agora mexa: segure o clique nas colheres até completar.");
          this.startStir();
          return;
        }

        this.heat.raf = requestAnimationFrame(loop);
      };

      this.heat.raf = requestAnimationFrame(loop);
    },

    stopHeat() {
      this.heat.active = false;
      if (this.heat.raf) cancelAnimationFrame(this.heat.raf);
      this.heat.raf = null;
    },

    // Etapa 4: Mexer
    startStir() {
      this.stopStir();
      this.stir.progress = 0;
      this.stir.holding = false;
      this.stir.last = performance.now();

      progressWrap.hidden = false;
      progressLabel.textContent = "Mexendo (2 min): segure nas colheres até completar.";
      progressFill.style.width = "0%";

      const NEED = 12.0;

      const loop = (now) => {
        if (!this.started || this.step !== 4) return;

        const dt = Math.min(0.06, (now - this.stir.last) / 1000);
        this.stir.last = now;

        if (this.stir.holding) this.stir.progress = clamp(this.stir.progress + dt / NEED, 0, 1);
        else this.stir.progress = clamp(this.stir.progress - dt / (NEED * 2), 0, 1);

        progressFill.style.width = `${Math.round(this.stir.progress * 100)}%`;

        if (this.stir.progress >= 1) {
          this.stopStir();
          this.ok("Purificação concluída (mexido por 2 min).");

          this.step = 5;
          this.updateUI();
          this.lockHotspots();
          this.highlightStep();
          this.setInstruction(STEPS[this.step], "Agora prepare a solução: clique no pote de NaOH para medir.");
          return;
        }

        this.stir.raf = requestAnimationFrame(loop);
      };

      this.stir.raf = requestAnimationFrame(loop);
    },

    stopStir() {
      if (this.stir.raf) cancelAnimationFrame(this.stir.raf);
      this.stir.raf = null;
      this.stir.holding = false;
    },

    // Etapas 5/6: Medir
    openMeasureMini(type) {
      if (this.playerTargets.naoh == null || this.playerTargets.water == null) {
        this.fail("Você precisa calcular a quantidade necessária conforme o pergaminho primeiro.");
        this.step = 1;
        this.updateUI();
        this.lockHotspots();
        this.highlightStep();
        this.setInstruction(STEPS[this.step], "Clique no pergaminho e calcule as quantidades necessárias.");
        return;
      }

      if (!this.purified) {
        this.fail("Antes de medir, você precisa purificar/filtrar o óleo.");
        this.step = 2;
        this.updateUI();
        this.lockHotspots();
        this.highlightStep();
        this.setInstruction(STEPS[this.step], "Clique na panela para purificar/filtrar o óleo.");
        return;
      }

      const isNaOH = type === "naoh";
      const target = isNaOH ? this.playerTargets.naoh : this.playerTargets.water;

      const tol = isNaOH ? 0.6 : 6;
      const unit = isNaOH ? "g" : "mL";

      let attempts = 0;
      let running = true;
      let raf = null;

      let baseSpeed = rand(MEASURE.speedMin, MEASURE.speedMax);
      let baseAmp = isNaOH
        ? Math.max(2.0, target * MEASURE.ampFracNaOH)
        : Math.max(10, target * MEASURE.ampFracWater);

      let phase = rand(0, Math.PI * 2);
      let last = performance.now();

      let smooth = target + rand(-baseAmp, baseAmp) * 0.9;
      let value = smooth;

      openModal(
        isNaOH ? "Balança — Trave o NaOH" : "Proveta — Trave a Água",
        `Trave dentro da tolerância (±${tol}${unit}).`,
        `
          <div class="row">
            <div>
              <div class="mini">Quantidade Necessária</div>
              <div class="big">${isNaOH ? target.toFixed(1) : Math.round(target)} ${unit}</div>
            </div>
            <div>
              <div class="mini">Tolerância</div>
              <div class="big">± ${tol}${unit}</div>
            </div>
          </div>

          <div class="row" style="margin-top:10px">
            <div class="mini">Leitura atual</div>
            <div class="big" id="readNow">—</div>
          </div>

          <div class="mini" style="margin-top:8px">
            A leitura oscila e desacelera perto da faixa aceitável.
          </div>

          <div class="actions">
            <button class="btn-secondary" id="btnRetry" type="button">Reiniciar</button>
            <button class="btn" id="btnLock" type="button">TRAVAR</button>
          </div>

          <div class="mini" id="attempts" style="margin-top:10px">Tentativas: 0</div>
        `
      );

      const readNow = $("readNow");
      const attemptsEl = $("attempts");
      const btnRetry = $("btnRetry");
      const btnLock = $("btnLock");

      function setRead(v) {
        readNow.textContent = isNaOH ? `${v.toFixed(1)} ${unit}` : `${Math.round(v)} ${unit}`;
      }

      const retune = () => {
        baseSpeed = rand(MEASURE.speedMin, MEASURE.speedMax);
        baseAmp = isNaOH
          ? Math.max(2.0, target * MEASURE.ampFracNaOH)
          : Math.max(10, target * MEASURE.ampFracWater);

        phase = rand(0, Math.PI * 2);
        last = performance.now();

        smooth = target + rand(-baseAmp, baseAmp) * 0.9;
        value = smooth;
      };

      const loop = (now) => {
        if (!running) return;

        const dt = Math.min(0.06, (now - last) / 1000);
        last = now;

        const dist = Math.abs(smooth - target);
        const slowBand = tol * MEASURE.slowBandMul;

        const near = clamp(dist / slowBand, 0, 1);

        let speedFactor = 0.38 + 0.62 * near;
        let ampFactor = 0.55 + 0.45 * near;

        const inAssist = dist <= tol * 1.4;
        if (inAssist) {
          speedFactor *= 0.55;
          ampFactor *= 0.70;
        }

        const noiseRange = isNaOH ? MEASURE.noiseNaOH : MEASURE.noiseWater;
        const noise = (Math.random() - 0.5) * noiseRange * (0.35 + 0.65 * near);

        phase += dt * baseSpeed * speedFactor * MEASURE.phaseMul;

        const base = target + baseAmp * ampFactor * Math.sin(phase);
        const raw = base + noise;

        const lerp = MEASURE.lerpNear + (MEASURE.lerpFar - MEASURE.lerpNear) * near;
        smooth = smooth + (raw - smooth) * lerp;

        value = smooth;
        setRead(value);

        raf = requestAnimationFrame(loop);
      };

      btnRetry.addEventListener("click", () => {
        attempts += 1;
        attemptsEl.textContent = `Tentativas: ${attempts}`;
        this.fail("Reiniciou a medição (cuidado com os erros).");
        retune();
      });

      btnLock.addEventListener("click", () => {
        running = false;
        if (raf) cancelAnimationFrame(raf);

        const ok = Math.abs(value - target) <= tol;

        if (!ok) {
          this.fail("Fora da tolerância. Trave mais perto do aceitável.");
          running = true;
          raf = requestAnimationFrame(loop);
          return;
        }

        closeModal();
        this.ok("Medição concluída.");

        if (isNaOH) {
          this.measured.naoh = value;
          mNaOH.textContent = `Medido: ${value.toFixed(1)} g`;

          this.step = 6;
          this.updateUI();
          this.lockHotspots();
          this.highlightStep();
          this.setInstruction(STEPS[this.step], "Agora meça a água: clique no frasco de água.");
        } else {
          this.measured.water = value;
          mWater.textContent = `Medido: ${Math.round(value)} mL`;

          this.step = 7;
          this.updateUI();
          this.lockHotspots();
          this.highlightStep();
          this.setInstruction(STEPS[this.step], "Confirme a ordem segura: clique na panela.");
        }
      });

      setRead(value);
      raf = requestAnimationFrame(loop);
    },

    // Etapa 7: Ordem segura
    openSafetyOrder() {
      openModal(
        "Segurança — Preparar solução de NaOH",
        "Escolha o procedimento mais seguro.",
        `
          <div class="mini">
            A dissolução do NaOH é <b>exotérmica</b>. O procedimento errado aumenta o risco de <b>respingos</b>.
          </div>

          <div class="actions" style="margin-top:10px">
            <button class="btn" id="optSafe" type="button">Adicionar NaOH na água, aos poucos</button>
            <button class="btn-secondary" id="optWrong" type="button">Adicionar água sobre o NaOH</button>
          </div>
        `
      );

      $("optSafe").addEventListener("click", () => {
        closeModal();
        this.ok("Ordem segura confirmada.");

        this.step = 8;
        this.updateUI();
        this.lockHotspots();
        this.highlightStep();
        this.setInstruction(STEPS[this.step], "Agora adicione a solução ao óleo lentamente: clique na panela.");
      });

      $("optWrong").addEventListener("click", () => {
        closeModal();
        this.fail("Escolha insegura.");

        openModal(
          "Por que isso é incorreto?",
          "Risco de aquecimento súbito e respingos.",
          `
            <div class="mini">
              Colocar <b>água sobre NaOH</b> concentra o calor em um ponto. Isso pode causar
              <b>aquecimento rápido</b> e <b>respingos</b> de solução cáustica.
            </div>

            <div class="mini" style="margin-top:10px">
              Procedimento recomendado:
              <ul style="margin:8px 0 0 18px; color: var(--muted);">
                <li>Colocar a <b>água no recipiente</b> primeiro.</li>
                <li>Adicionar o <b>NaOH aos poucos</b>, mexendo sempre.</li>
              </ul>
            </div>

            <div class="actions">
              <button class="btn" id="btnExplainOk" type="button">Entendi</button>
            </div>
          `
        );

        $("btnExplainOk").addEventListener("click", () => {
          closeModal();
          this.setInstruction(STEPS[this.step], "Tente novamente: clique na panela e escolha a ordem segura.");
        });
      });
    },

    // Etapa 8: Adicionar solução ao óleo
    openAddLyeToOil() {
      openModal(
        "Panela — Adicionar solução ao óleo",
        "Escolha como fazer a adição.",
        `
          <div class="mini">
            Protocolo: adição influencia <b>segurança</b> e <b>controle do processo</b>.
          </div>

          <div class="actions" style="margin-top:10px">
            <button class="btn" id="optSlow" type="button">Adicionar lentamente</button>
            <button class="btn-secondary" id="optFast" type="button">Despejar de uma vez</button>
          </div>
        `
      );

      $("optSlow").addEventListener("click", () => {
        closeModal();
        this.ok("Adição realizada.");

        this.step = 9;
        this.updateUI();
        this.lockHotspots();
        this.highlightStep();
        this.setInstruction(STEPS[this.step], "Agora calcule e adicione o detergente: clique no frasco.");
      });

      $("optFast").addEventListener("click", () => {
        closeModal();
        this.fail("Procedimento inseguro.");

        openModal(
          "Por que isso é incorreto?",
          "Despejo rápido aumenta risco e perda de controle.",
          `
            <div class="mini">
              Despejar “de uma vez” pode causar <b>respingos</b>, <b>mistura irregular</b> e <b>instabilidade</b>.
              A adição lenta permite dissipar calor e manter o controle.
            </div>

            <div class="actions" style="margin-top:10px">
              <button class="btn" id="btnFastExplainOk" type="button">Entendi</button>
            </div>
          `
        );

        $("btnFastExplainOk").addEventListener("click", () => {
          closeModal();
          this.setInstruction(STEPS[this.step], "Tente de novo: clique na panela e escolha como adicionar.");
        });
      });
    },

    // Etapa 9: Detergente
    openAddDetergent() {
      const target = Math.round((this.lotOil / 1000) * DETERG.perLiter);

      openModal(
        "Detergente — Dosagem",
        "A proporção é 40 mL por 1 L de óleo. Calcule para a sua quantidade.",
        `
          <div class="mini">
            Proporção: <b>${DETERG.perLiter} mL</b> de detergente para <b>1 L</b> de óleo.
            <br>Sua quantidade: <b>${this.lotOil} mL</b>.
          </div>

          <div class="field" style="margin-top:10px">
            <label class="mini">Quanto de detergente (mL) você vai adicionar?</label>
            <input class="input" id="inDet" inputmode="numeric" placeholder="Ex.: ${decoyMlSmall(target)}" value="">
          </div>

          <div class="actions">
            <button class="btn-secondary" id="btnDetClose" type="button">Voltar</button>
            <button class="btn" id="btnDetOk" type="button">Validar</button>
          </div>
        `
      );

      $("btnDetClose").addEventListener("click", closeModal);

      $("btnDetOk").addEventListener("click", () => {
        const v = Number($("inDet").value.replace(",", "."));
        if (!Number.isFinite(v)) {
          this.fail("Preencha um valor numérico (mL).");
          return;
        }

        closeModal();

        const ok = Math.abs(v - target) <= DETERG.tol;
        if (!ok) {
          this.fail("Dosagem incorreta. Refaça o cálculo e tente novamente.");
          this.setInstruction(STEPS[this.step], "Clique no frasco e ajuste a dosagem do detergente.");
          return;
        }

        this.ok("Detergente adicionado.");

        // ✅ Agora vem o RESFRIAMENTO (25–30°C) antes de corante/óleo essencial
        this.step = 10;
        this.updateUI();
        this.lockHotspots();
        this.highlightStep();
        this.setInstruction(STEPS[this.step], "Aguarde resfriar para 25–30°C antes de adicionar corante e óleo essencial.");
        this.openCoolDownModal();
      });
    },

    // ✅ Etapa 10: Resfriamento (relógio analógico)
    openCoolDownModal() {
      if (!this.started || this.step !== 10) return;

      modalLocked = true;
      btnClose.style.display = "none";

      this.stopCoolDown();
      this.cool.active = true;
      this.cool.last = performance.now();
      this.cool.startTemp = rand(38, 52);
      this.cool.endTemp = rand(26, 30);
      this.cool.tempNow = this.cool.startTemp;

      openModal(
        "Atenção — Resfriamento antes dos voláteis",
        "Corante e óleo essencial devem entrar com a massa mais fria.",
        `
          <div class="mini">
            <b>Antes de adicionar corante e óleo essencial:</b> aguarde a massa chegar a
            <b>25–30°C</b>. Esses componentes são <b>voláteis</b> e, em temperatura alta,
            podem <b>evaporar</b> e <b>não aderir bem</b> ao sabão.
          </div>

          <div style="margin-top:12px; border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:12px; background:rgba(0,0,0,.04)">
            <div class="row">
              <div>
                <div class="mini">Temperatura atual</div>
                <div class="big" id="coolTemp">—</div>
              </div>
              <div>
                <div class="mini">Faixa de Temperatura</div>
                <div class="big">25–30°C</div>
              </div>
            </div>

            <div style="margin-top:10px; display:flex; justify-content:center;">
              <canvas id="coolClock" style="width:220px; height:220px; display:block;"></canvas>
            </div>

            <div class="mini" style="margin-top:8px; color: var(--muted); text-align:center;">
              (Relógio acelerado simulando o tempo de resfriamento)
            </div>
          </div>

          <div class="actions" style="margin-top:12px">
            <button class="btn" id="btnCoolOk" type="button" disabled>Continuar</button>
          </div>
        `
      );

      const tempEl = $("coolTemp");
      const canvas = $("coolClock");
      const btnOk = $("btnCoolOk");

      const ctx = canvas.getContext("2d", { alpha: true });
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();

      const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

      const drawClock = (progress01) => {
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) * 0.42;

        ctx.clearRect(0, 0, w, h);

        // aro
        ctx.beginPath();
        ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,.06)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,.14)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // marcações
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const x1 = cx + Math.cos(a) * (r * 0.86);
          const y1 = cy + Math.sin(a) * (r * 0.86);
          const x2 = cx + Math.cos(a) * (r * 0.98);
          const y2 = cy + Math.sin(a) * (r * 0.98);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = "rgba(255,255,255,.22)";
          ctx.lineWidth = (i % 3 === 0) ? 3 : 2;
          ctx.stroke();
        }

        // ponteiros acelerados
        const turns = 8;
        const secAng = (progress01 * turns) * Math.PI * 2 - Math.PI / 2;
        const minAng = (progress01 * (turns / 12)) * Math.PI * 2 - Math.PI / 2;

        // minutos
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(minAng) * (r * 0.62), cy + Math.sin(minAng) * (r * 0.62));
        ctx.strokeStyle = "rgba(255,255,255,.75)";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.stroke();

        // segundos
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(secAng) * (r * 0.80), cy + Math.sin(secAng) * (r * 0.80));
        ctx.strokeStyle = "rgba(110,168,254,.95)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.stroke();

        // centro
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,.85)";
        ctx.fill();
      };

      const start = performance.now();
      const loop = (now) => {
        if (!this.cool.active) return;

        const t = (now - start) / 1000;
        const raw = clamp(t / this.cool.durationSec, 0, 1);
        const p = easeOutCubic(raw);

        this.cool.tempNow = this.cool.startTemp + (this.cool.endTemp - this.cool.startTemp) * p;

        tempEl.textContent = `${this.cool.tempNow.toFixed(1)}°C`;
        drawClock(raw);

        if (raw >= 1) {
          this.cool.active = false;
          btnOk.disabled = false;
          btnOk.textContent = "Continuar (25–30°C)";
          return;
        }

        this.cool.raf = requestAnimationFrame(loop);
      };

      this.cool.raf = requestAnimationFrame(loop);

      btnOk.addEventListener("click", () => {
        this.stopCoolDown();
        modalLocked = false;
        btnClose.style.display = "";
        closeModal();

        this.ok("Temperatura adequada para adicionar os voláteis.");

        this.step = 11;
        this.updateUI();
        this.lockHotspots();
        this.highlightStep();
        this.setInstruction(STEPS[this.step], "Agora adicione corante e óleo essencial (massa em 25–30°C).");

        this.openColorPicker();
      });
    },

    // Etapa 11: Corante + Óleo essencial (modal)
    openColorPicker() {
      if (!this.started || this.step !== 11) return;

      const options = [
        { key: "Azul", sw: "#3b82f6" },
        { key: "Verde", sw: "#22c55e" },
        { key: "Amarelo", sw: "#f59e0b" },
        { key: "Rosa", sw: "#ec4899" },
        { key: "Roxo", sw: "#8b5cf6" },
      ];

      const buttons = options.map((o) => `
        <button class="btn" data-color="${o.key}" type="button" style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;margin-top:8px">
          <span style="display:inline-block;width:16px;height:16px;border-radius:4px;background:${o.sw}"></span>
          <span>${o.key}</span>
        </button>
      `).join("");

      openModal(
        "Corante e óleo essencial — Etapa dos voláteis",
        "Adicionar somente com a massa em 25–30°C.",
        `
          <div class="mini">
            <b>Aviso:</b> óleo essencial e corante são <b>voláteis</b>. Em temperatura alta podem evaporar e não aderir bem.
            <br>Com a massa em <b>25–30°C</b>, você pode adicionar e misturar com mais segurança.
          </div>

          <div class="mini" style="margin-top:10px; color: var(--muted);">
            Escolha a cor do sabão. (Considere adicionar o óleo essencial agora e misturar bem.)
          </div>

          <div style="margin-top:10px">
            ${buttons}
          </div>

          <div class="actions" style="margin-top:12px">
            <button class="btn-secondary" id="btnColorBack" type="button">Voltar</button>
          </div>
        `
      );

      $("btnColorBack").addEventListener("click", () => {
        closeModal();
        // volta para o resfriamento
        this.step = 10;
        this.updateUI();
        this.lockHotspots();
        this.highlightStep();
        this.setInstruction(STEPS[this.step], "Aguarde resfriar para 25–30°C antes de adicionar corante e óleo essencial.");
        this.openCoolDownModal();
      });

      modalBody.querySelectorAll("[data-color]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const picked = btn.getAttribute("data-color");
          this.chosenColor = picked;
          closeModal();

          this.ok(`Cor escolhida: ${picked}.`);

          this.step = 12;
          this.updateUI();
          this.lockHotspots();
          this.highlightStep();
          this.setInstruction(STEPS[this.step], "Agora verta no molde: clique no molde.");
        });
      });
    },

    // Etapa 12: Verter
    openPour() {
      openModal(
        "Molde — Verter a massa",
        "Pare o enchimento na faixa ideal (85% a 95%).",
        `
          <div class="row">
            <div><div class="mini">Faixa ideal</div><div class="big">85%–95%</div></div>
            <div><div class="mini">Enchimento</div><div class="big" id="pourVal">0%</div></div>
          </div>

          <input class="input" id="pourRange" type="range" min="0" max="100" step="1" value="0" style="margin-top:10px">

          <div class="actions">
            <button class="btn-secondary" id="pourNudge" type="button">Ajuste fino</button>
            <button class="btn" id="pourConfirm" type="button">Confirmar</button>
          </div>
        `
      );

      const r = $("pourRange");
      const v = $("pourVal");
      const nudge = $("pourNudge");
      const confirm = $("pourConfirm");

      const sync = () => (v.textContent = `${Number(r.value)}%`);
      r.addEventListener("input", sync);
      sync();

      nudge.addEventListener("click", () => {
        r.value = String(clamp(Number(r.value) + (Math.random() > 0.5 ? 2 : -2), 0, 100));
        sync();
      });

      confirm.addEventListener("click", () => {
        const val = Number(r.value);
        closeModal();

        if (val < 85 || val > 95) {
          this.fail("Enchimento fora da faixa.");
          this.setInstruction(STEPS[this.step], "Tente novamente: clique no molde.");
          return;
        }

        this.ok("Quantidade finalizada.");
        this.finish();
      });
    },

    finish() {
      this.step = 13;
      this.updateUI();
      this.lockHotspots();
      this.highlightStep();

      progressWrap.hidden = true;

      this.setEndScreen(true);

      const msg = "Parabéns as unidades de sabão foram produzidas.";
      setTopbar(`Produção de Sabão — ${msg}`);

      this.openCongratsPopup();
    },
  };

  // ---------------------------
  // Eventos
  // ---------------------------
  btnStart.addEventListener("click", () => game.start());
  btnReset.addEventListener("click", () => game.reset());

  scrollBtn.addEventListener("click", () => {
    if (scrollBtn.disabled) return;
    scrollBtn.classList.toggle("is-zoomed");
    game.openCalculator();
  });

  function onHotspotClick(id) {
    if (!game.started) {
      showToast("Clique em Começar.", "bad");
      return;
    }

    if (game.step === 2 && id === "panela") return game.openPurifyOil();
    if (game.step === 3 && id === "fogao") return game.openHeatGame();

    if (game.step === 5 && id === "naoh") return game.openMeasureMini("naoh");
    if (game.step === 6 && id === "agua") return game.openMeasureMini("water");

    if (game.step === 7 && id === "panela") return game.openSafetyOrder();
    if (game.step === 8 && id === "panela") return game.openAddLyeToOil();

    if (game.step === 9 && id === "oleo") return game.openAddDetergent();
    if (game.step === 12 && id === "molde") return game.openPour();

    if (game.step === 4 && id === "colheres") {
      showToast("Segure o clique nas colheres para mexer.", "good");
      return;
    }

    game.fail("Item errado para esta etapa.");
  }

  Object.entries(hs).forEach(([id, el]) => {
    if (!el) return;
    el.addEventListener("click", () => onHotspotClick(id));
  });

  // “Segurar” para mexer
  if (hs.colheres) {
    hs.colheres.addEventListener("pointerdown", () => {
      if (!game.started || game.step !== 4) return;
      game.stir.holding = true;
    });

    window.addEventListener("pointerup", () => {
      if (!game.started || game.step !== 4) return;
      game.stir.holding = false;
    });

    hs.colheres.addEventListener("pointerleave", () => {
      if (!game.started || game.step !== 4) return;
      game.stir.holding = false;
    });
  }

  // init
  tuneToastUI();
  game.reset();
})();
