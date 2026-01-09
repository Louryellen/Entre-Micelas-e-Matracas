// engine.js
const $ = (sel) => document.querySelector(sel);

function fitHeader() {
  const h = document.querySelector("header")?.offsetHeight || 86;
  document.documentElement.style.setProperty("--header-h", h + "px");
}
window.addEventListener("load", fitHeader);
window.addEventListener("resize", fitHeader);

export function typeInto(node, text, speed = 18, done) {
  node.textContent = "";
  let i = 0;
  (function tick() {
    if (i <= text.length) {
      node.textContent = text.slice(0, i++);
      setTimeout(tick, speed);
    } else {
      if (done) done();
    }
  })();
}

function isTouchDevice() {
  return (
    (window.matchMedia &&
      window.matchMedia("(hover: none) and (pointer: coarse)").matches) ||
    navigator.maxTouchPoints > 0 ||
    "ontouchstart" in window
  );
}

/* =========================================
   DEBUG (Cena 0) — tecla G mostra/oculta ícone
   ========================================= */
(function () {
  let show = false;
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "g") {
      show = !show;
      const icon = document.getElementById("emailIcon");
      if (!icon) return;
      icon.classList.toggle("active", show);
    }
  });
})();

// =====================
// CENA 0
// =====================
export function initCena0() {
  // ✅ garante que estilos de cena funcionem mesmo se você esquecer class no HTML
  document.body.classList.add("cena0");
  document.body.dataset.scene = "cena0";

  const hs = $("#hs-email");
  const icon = $("#emailIcon");
  const hint = $("#hint");
  const mail = $("#emailWin");
  const bg = $("#bg");
  const video = $("#introVideo");
  const scene = $("#scene");
  const btnAreas = document.getElementById("btnAreas");

  if (!hs || !icon || !hint || !mail || !bg || !scene) return;

  const touch = isTouchDevice();

  // ====== MAPA (RELATIVO À IMAGEM) ======
  // Ajuste fino se necessário, mas agora funciona em qualquer tela (contain).
  const MAP_EMAIL = {
    x: 0.59,
    y: 0.52,
    w: 0.06,
    h: 0.10,
    iconX: 0.595,
    iconY: 0.542,
  };

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function placeRelativeToImage(el, d, z = 50) {
    const sceneRect = scene.getBoundingClientRect();
    const imgRect = bg.getBoundingClientRect();

    const imgW = imgRect.width;
    const imgH = imgRect.height;

    const pxLeft = (imgRect.left - sceneRect.left) + d.x * imgW;
    const pxTop = (imgRect.top - sceneRect.top) + d.y * imgH;

    Object.assign(el.style, {
      position: "absolute",
      left: pxLeft + "px",
      top: pxTop + "px",
      width: d.w * imgW + "px",
      height: d.h * imgH + "px",
      zIndex: z,
    });
  }

  function placeEmail() {
    // hotspot
    placeRelativeToImage(hs, MAP_EMAIL, 50);

    // ícone (tamanho proporcional ao tamanho real da imagem)
    const sceneRect = scene.getBoundingClientRect();
    const imgRect = bg.getBoundingClientRect();
    const imgW = imgRect.width;

    const iconW = clamp(imgW * 0.065, 46, 82);
    const left = (imgRect.left - sceneRect.left) + MAP_EMAIL.iconX * imgW;
    const top = (imgRect.top - sceneRect.top) + MAP_EMAIL.iconY * imgRect.height;

    Object.assign(icon.style, {
      position: "absolute",
      left: left + "px",
      top: top + "px",
      width: iconW + "px",
      height: "auto",
      imageRendering: "pixelated",
      zIndex: 60,
      pointerEvents: "none",
    });
  }

  if (bg.complete && bg.naturalWidth > 0) placeEmail();
  else bg.addEventListener("load", placeEmail, { once: true });

  window.addEventListener("resize", placeEmail);

  // ====== AJUDA (celular): revelar áreas por um tempo ======
  function revelarAreasPorUmTempo(ms = 2200) {
    document.body.classList.add("help-hotspots");
    icon.classList.add("active"); // facilita muito no celular

    clearTimeout(revelarAreasPorUmTempo._t);
    revelarAreasPorUmTempo._t = setTimeout(() => {
      document.body.classList.remove("help-hotspots");
    }, ms);
  }

  if (touch) {
    hint.textContent =
      '💡 Toque no ícone próximo ao notebook para ler o e-mail. Toque em "Ver áreas" se precisar.';
    revelarAreasPorUmTempo(1400);
  }

  btnAreas?.addEventListener("click", () => revelarAreasPorUmTempo());

  // toque longo para mostrar áreas (fallback)
  let tHold = null;
  const startHold = () => {
    if (!touch) return;
    tHold = setTimeout(() => revelarAreasPorUmTempo(), 420);
  };
  const endHold = () => {
    if (tHold) clearTimeout(tHold);
    tHold = null;
  };

  // pointer events + fallback touch
  scene.addEventListener("pointerdown", startHold, { passive: true });
  scene.addEventListener("pointerup", endHold, { passive: true });
  scene.addEventListener("pointercancel", endHold, { passive: true });
  scene.addEventListener("touchstart", startHold, { passive: true });
  scene.addEventListener("touchend", endHold, { passive: true });
  scene.addEventListener("touchcancel", endHold, { passive: true });

  const mailText = `Olá, pesquisadora.
Moradores da comunidade entraram em contato relatando mudanças preocupantes no igarapé da região. Há sinais visíveis de poluição na água, além de odores incomuns.

A situação tem causado apreensão entre as famílias que utilizam o igarapé no dia a dia, especialmente por envolver atividades domésticas e possíveis riscos ambientais.

Diante da urgência, solicitamos uma visita técnica para observação e análise inicial da água, a fim de identificar possíveis impactos químicos e orientar a comunidade sobre os próximos passos.

Você pode assumir essa investigação?

Atenciosamente, 
Coordenação de Extensão – UFMA`;

  function openMail() {
    hint.style.display = "none";

    // ✅ responsivo (celular/pc) e centralizado (sem offset 460px)
    const W = Math.min(560, Math.floor(window.innerWidth * 0.92));
    const H = Math.min(460, Math.floor(window.innerHeight * 0.75));

    Object.assign(mail.style, {
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: W + "px",
      height: H + "px",
      display: "flex",
      overflowY: "auto",
    });

    const mailNode = document.getElementById("mailText");
    typeInto(mailNode, mailText, 18);
  }

  function closeMail() {
    mail.style.display = "none";
  }

  function goToLab() {
    window.location.href = "cena1.html";
  }

  function playIntroVideo() {
    if (bg) bg.style.display = "none";
    hs.style.pointerEvents = "none";

    if (!video) return;

    video.style.display = "block";
    video.currentTime = 0;
    video.playsInline = true;

    // tenta com som; se bloquear, cai para mutado
    video.muted = false;
    video.volume = 1;

    const p = video.play();
    if (p?.catch) {
      p.catch(() => {
        video.muted = true;
        video.play().catch(() => {});
        hint.style.display = "";
        hint.textContent =
          "🔊 Vídeo sem som por bloqueio do navegador. Toque no vídeo para ativar o áudio.";
        video.addEventListener(
          "click",
          async () => {
            video.muted = false;
            try {
              await video.play();
            } catch {}
          },
          { once: true }
        );
      });
    }

    video.addEventListener("ended", goToLab, { once: true });
  }

  // ✅ melhor para touch: pointerup (mas mantém click também)
  hs.addEventListener("pointerup", openMail);
  hs.addEventListener("click", openMail);

  $("#closeMail")?.addEventListener("click", closeMail);

  $("#acceptCase")?.addEventListener("click", () => {
    closeMail();
    playIntroVideo();
  });

  $("#btnReiniciar")?.addEventListener("click", () => {
    hint.style.display = "";
    hint.textContent =
      '💡 Clique/toque no ícone próximo ao notebook para ler o e-mail. (G para ver áreas)!!!';

    closeMail();
    icon.classList.remove("active");
    hs.style.pointerEvents = "auto";

    if (video) {
      video.pause();
      video.currentTime = 0;
      video.style.display = "none";
      video.muted = false;
      video.volume = 1;
    }
    if (bg) bg.style.display = "";
    placeEmail();
  });
}

// =====================
// CENA 1
// =====================
export function initCena1() {
  document.body.classList.add("cena1");
  document.body.dataset.scene = "cena1";

  const hint = $("#hint");
  const btnReiniciar = $("#btnReiniciar");

  const scene = $("#scene");
  const bgLab = $("#bg-lab");

  const jaleco = $("#hs-jaleco");
  const frascos = $("#hs-frascos");
  const reagentes = $("#hs-reagentes");
  const checklist = $("#hs-checklist");

  const equipPranch = $("#hs-equip-prancheta");
  const equipFrascos = $("#hs-equip-frascos");
  const equipMedidor = $("#hs-equip-medidor");
  const equipTermom = $("#hs-equip-termometro");

  const residuos = $("#hs-residuos");
  const micro = $("#hs-microondas");
  const cafe = $("#hs-cafe");
  const plantas = $("#hs-plantas");

  const backdrop = $("#infoBackdrop");
  const popup = $("#infoPopup");
  const infoTitle = $("#infoTitle");
  const infoGeneral = $("#infoGeneral");
  const infoUse = $("#infoUse");
  const btnClose = $("#infoClose");

  const btnLevar = $("#btnLevar");
  const btnNaoLevar = $("#btnNaoLevar");

  const overlayRes = $("#resultadoOverlay");
  const resPont = $("#resultadoPontuacao");
  const resRank = $("#resultadoRanking");
  const trofeuIcon = $("#trofeuIcon");
  const btnFecharRes = $("#btnFecharResultado");
  const btnIrInvestigacao = $("#btnIrInvestigacao");
  const btnRecomecarFase = $("#btnRecomecarFase");

  // vídeos (IDs do HTML)
  const videoViagem = $("#viagemVideo");
  const videoVilarejo = $("#vilarejoVideo");
  const fogosContainer = $("#fogosContainer");

  if (
    !hint ||
    !scene ||
    !bgLab ||
    !jaleco ||
    !frascos ||
    !reagentes ||
    !checklist ||
    !equipPranch ||
    !equipFrascos ||
    !equipMedidor ||
    !equipTermom ||
    !backdrop ||
    !popup ||
    !btnLevar ||
    !btnNaoLevar ||
    !residuos ||
    !micro ||
    !cafe ||
    !plantas
  ) {
    return;
  }

  const defaultHintText =
    "💡 Clique nos itens para conhecer cada material e montar o kit de análise.";
  hint.textContent = defaultHintText;

  const PONTOS_POR_ITEM = 10;
  let resultadoMostrado = false;

  let itemAtual = null;
  let fogosLoopId = null;

  const configItens = {
    jaleco: { tipo: "necessario" },
    frascos: { tipo: "necessario" },
    reagentes: { tipo: "necessario" },
    checklist: { tipo: "necessario" },
    equipPrancheta: { tipo: "necessario" },
    equipFrascos: { tipo: "necessario" },
    equipMedidor: { tipo: "necessario" },
    equipTermometro: { tipo: "necessario" },
    residuos: { tipo: "distracao" },
    microondas: { tipo: "distracao" },
    cafe: { tipo: "distracao" },
    plantas: { tipo: "distracao" },
  };

  const estado = {};
  const errados = {};
  Object.keys(configItens).forEach((k) => {
    estado[k] = false;
    errados[k] = false;
  });

  const hotspotsMap = {
    jaleco,
    frascos,
    reagentes,
    checklist,
    equipPrancheta: equipPranch,
    equipFrascos,
    equipMedidor,
    equipTermometro: equipTermom,
    residuos,
    microondas: micro,
    cafe,
    plantas,
  };

  function travarHotspot(chave) {
    const el = hotspotsMap[chave];
    if (!el) return;
    el.style.pointerEvents = "none";
  }

  function openInfo(obj) {
    const { title, general, use, key } = obj;
    if (key && (estado[key] || errados[key])) return;

    itemAtual = key || null;

    infoTitle.textContent = title;
    infoGeneral.textContent = general;
    infoUse.textContent = use;
    backdrop.classList.add("visible");
  }

  function closeInfo() {
    backdrop.classList.remove("visible");
  }

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeInfo();
  });
  btnClose.addEventListener("click", closeInfo);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeInfo();
  });

  function atualizarHint() {
    const total = Object.keys(estado).length;
    const acertos = Object.values(estado).filter((v) => v).length;
    const erros = Object.values(errados).filter((v) => v).length;
    const decididos = acertos + erros;
    const pontos = acertos * PONTOS_POR_ITEM;

    if (decididos === 0) {
      hint.textContent = defaultHintText;
      return;
    }

    if (decididos < total) {
      hint.textContent = `Itens decididos: ${decididos}/${total} — Pontos: ${pontos}.`;
    } else {
      hint.textContent = `Itens decididos: ${decididos}/${total} — Pontos finais: ${pontos}.`;
      mostrarResultado(pontos);
    }
  }

  function marcarAcerto(chave) {
    if (!estado[chave]) {
      estado[chave] = true;
      errados[chave] = false;
      travarHotspot(chave);
      atualizarHint();
    }
  }

  function marcarErro(chave) {
    if (!errados[chave] && !estado[chave]) {
      errados[chave] = true;
      travarHotspot(chave);
      atualizarHint();
    }
  }

  // DEBUG: tecla H liga/desliga hotspots na Cena 1
  function onKeyDebugCena1(e) {
    if (e.key.toLowerCase() === "h") {
      document.body.classList.toggle("debug-hotspots");
    }
  }
  document.addEventListener("keydown", onKeyDebugCena1);

  function dispararFogos() {
    if (!fogosContainer) return;

    const explosoes = 10;
    const particulas = 24;

    for (let e = 0; e < explosoes; e++) {
      const centroX = 10 + Math.random() * 80;
      const centroY = 15 + Math.random() * 50;
      const atraso = e * 120;

      setTimeout(() => {
        for (let i = 0; i < particulas; i++) {
          const p = document.createElement("div");
          p.className = "firework";

          const angulo = (Math.PI * 2 * i) / particulas;
          const dist = 90 + Math.random() * 90;

          const dx = Math.cos(angulo) * dist;
          const dy = Math.sin(angulo) * dist;

          p.style.left = centroX + "%";
          p.style.top = centroY + "%";
          p.style.setProperty("--dx", dx + "px");
          p.style.setProperty("--dy", dy + "px");

          const cores = ["#ffd54f", "#ff8a65", "#ce93d8", "#4fc3f7", "#a5d6a7"];
          p.style.backgroundColor = cores[Math.floor(Math.random() * cores.length)];

          fogosContainer.appendChild(p);
          p.addEventListener("animationend", () => p.remove());
        }
      }, atraso);
    }
  }

  function iniciarFogosLoop() {
    if (!fogosContainer) return;
    if (fogosLoopId !== null) return;

    dispararFogos();
    fogosLoopId = setInterval(dispararFogos, 2500);
  }

  function pararFogosLoop() {
    if (fogosLoopId !== null) {
      clearInterval(fogosLoopId);
      fogosLoopId = null;
    }
    if (fogosContainer) fogosContainer.innerHTML = "";
  }

  // ✅ NOVA MECÂNICA (70 bronze, 90 prata, 120 ouro; <70 refaz)
  function mostrarResultado(pontos) {
    if (!overlayRes || resultadoMostrado) return;
    resultadoMostrado = true;

    const total = Object.keys(estado).length;
    const maxPontos = total * PONTOS_POR_ITEM;

    const THRESH_BRONZE = 70;
    const THRESH_PRATA = 90;
    const THRESH_OURO = 120;

    let ranking = "";
    let texto = "";

    trofeuIcon?.classList.remove("trofeu-ouro", "trofeu-prata", "trofeu-bronze");

    const showRestart = (on) => {
      if (!btnRecomecarFase) return;
      btnRecomecarFase.style.display = on ? "" : "none";
    };

    const lockGo = (locked) => {
      if (!btnIrInvestigacao) return;
      btnIrInvestigacao.disabled = !!locked;
      btnIrInvestigacao.title = locked
        ? "Pontuação insuficiente. Recomece a fase para poder avançar."
        : "";
    };

    if (pontos >= THRESH_OURO) {
      ranking = "Ouro";
      texto = "Excelente! Você montou um kit perfeito para a investigação.";
      trofeuIcon?.classList.add("trofeu-ouro");
      iniciarFogosLoop();

      showRestart(false);
      lockGo(false);
    } else if (pontos >= THRESH_PRATA) {
      ranking = "Prata";
      texto = "Muito bom! Seu kit está muito bem montado para a investigação.";
      trofeuIcon?.classList.add("trofeu-prata");
      pararFogosLoop();

      showRestart(false);
      lockGo(false);
    } else if (pontos >= THRESH_BRONZE) {
      ranking = "Bronze";
      texto = "Você conseguiu o básico, mas pode melhorar o kit antes de avançar.";
      trofeuIcon?.classList.add("trofeu-bronze");
      pararFogosLoop();

      showRestart(true);  // bronze: aparece ao lado
      lockGo(false);
    } else {
      ranking = "Insuficiente";
      texto = "Pontuação abaixo de 70. Você precisa refazer a fase para avançar.";
      pararFogosLoop();

      showRestart(true);
      lockGo(true); // <70: bloqueia avançar
    }

    if (resPont) resPont.textContent = `Pontuação: ${pontos}/${maxPontos} pontos`;
    if (resRank) resRank.textContent = `Ranking: ${ranking}. ${texto}`;

    overlayRes.classList.add("visible");
  }

  btnFecharRes?.addEventListener("click", () => {
    overlayRes.classList.remove("visible");
    pararFogosLoop();
  });

  // ========= VÍDEOS EM SEQUÊNCIA (COM SOM + FALLBACK) =========
  async function playWithSound(videoEl) {
    if (!videoEl) return false;

    videoEl.playsInline = true;
    videoEl.muted = false;
    videoEl.volume = 1;

    try {
      await videoEl.play();
      return true;
    } catch (e) {
      videoEl.muted = true;
      try {
        await videoEl.play();
      } catch {}

      hint.textContent =
        "🔊 Vídeo tocando sem som por bloqueio do navegador. Clique no vídeo para ativar o áudio.";
      videoEl.addEventListener(
        "click",
        async () => {
          videoEl.muted = false;
          try {
            await videoEl.play();
            hint.textContent = defaultHintText;
          } catch {}
        },
        { once: true }
      );
      return false;
    }
  }

  function setVideoMode(isOn) {
    document.body.classList.toggle("is-video-playing", !!isOn);
  }

  async function tocarSequenciaDeVideos() {
    overlayRes?.classList.remove("visible");
    pararFogosLoop();

    setVideoMode(true);

    scene.style.pointerEvents = "none";
    Object.values(hotspotsMap).forEach((el) => {
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
    });

    if (!videoViagem) {
      setVideoMode(false);
      window.location.href = "cena2.html";
      return;
    }

    videoViagem.style.display = "block";
    videoViagem.currentTime = 0;
    await playWithSound(videoViagem);

    videoViagem.addEventListener(
      "ended",
      async () => {
        videoViagem.style.display = "none";

        if (!videoVilarejo) {
          setVideoMode(false);
          window.location.href = "cena2.html";
          return;
        }

        videoVilarejo.style.display = "block";
        videoVilarejo.currentTime = 0;
        await playWithSound(videoVilarejo);

        videoVilarejo.addEventListener(
          "ended",
          () => {
            setVideoMode(false);
            window.location.href = "cena2.html";
          },
          { once: true }
        );
      },
      { once: true }
    );
  }

  btnIrInvestigacao?.addEventListener("click", tocarSequenciaDeVideos);

  btnRecomecarFase?.addEventListener("click", () => {
    overlayRes?.classList.remove("visible");
    pararFogosLoop();
    btnReiniciar?.click();
  });

  // ========= HOTSPOTS RESPONSIVOS =========
  const mqSmall = window.matchMedia("(max-width: 1400px)");

  const MAP_LARGE = {
    jaleco: { x: 0.14, y: 0.2, w: 0.11, h: 0.41 },
    frascos: { x: 0.145, y: 0.63, w: 0.099, h: 0.15 },
    reagentes: { x: 0.257, y: 0.74, w: 0.157, h: 0.16 },
    checklist: { x: 0.46, y: 0.492, w: 0.102, h: 0.18 },
    prancheta: { x: 0.462, y: 0.733, w: 0.058, h: 0.198 },
    equipFrascos: { x: 0.56, y: 0.81, w: 0.019, h: 0.122 },
    medidor: { x: 0.604, y: 0.8233, w: 0.089, h: 0.111 },
    termometro: { x: 0.533, y: 0.765, w: 0.0119, h: 0.16 },
    residuos: { x: 0.28, y: 0.12, w: 0.14, h: 0.13 },
    microondas: { x: 0.34, y: 0.41, w: 0.094, h: 0.18 },
    cafe: { x: 0.641, y: 0.57, w: 0.041, h: 0.12 },
    plantas: { x: 0.735, y: 0.55, w: 0.09, h: 0.14 },
  };

  const MAP_SMALL = {
    ...MAP_LARGE,
    jaleco: { x: 0.195, y: 0.21, w: 0.094, h: 0.41 },
  };

  function getCurrentMap() {
    return mqSmall.matches ? MAP_SMALL : MAP_LARGE;
  }

  function applyHotspots() {
    const sceneRect = scene.getBoundingClientRect();
    const imgRect = bgLab.getBoundingClientRect();
    const imgW = imgRect.width;
    const imgH = imgRect.height;

    const MAP = getCurrentMap();

    function place(el, d) {
      const pxLeft = imgRect.left - sceneRect.left + d.x * imgW;
      const pxTop = imgRect.top - sceneRect.top + d.y * imgH;

      Object.assign(el.style, {
        position: "absolute",
        left: pxLeft + "px",
        top: pxTop + "px",
        width: d.w * imgW + "px",
        height: d.h * imgH + "px",
        zIndex: 50,
      });
    }

    place(jaleco, MAP.jaleco);
    place(frascos, MAP.frascos);
    place(reagentes, MAP.reagentes);
    place(checklist, MAP.checklist);

    place(equipPranch, MAP.prancheta);
    place(equipFrascos, MAP.equipFrascos);
    place(equipMedidor, MAP.medidor);
    place(equipTermom, MAP.termometro);

    place(residuos, MAP.residuos);
    place(micro, MAP.microondas);
    place(cafe, MAP.cafe);
    place(plantas, MAP.plantas);
  }

  if (bgLab.complete) applyHotspots();
  else bgLab.addEventListener("load", applyHotspots, { once: true });

  window.addEventListener("resize", applyHotspots);
  mqSmall.addEventListener("change", applyHotspots);

  // ========= BOTÕES POPUP =========
  btnLevar.addEventListener("click", () => {
    if (itemAtual) {
      const cfg = configItens[itemAtual];
      if (cfg && cfg.tipo === "distracao") marcarErro(itemAtual);
      else marcarAcerto(itemAtual);
    }
    itemAtual = null;
    closeInfo();
  });

  btnNaoLevar.addEventListener("click", () => {
    if (itemAtual) {
      const cfg = configItens[itemAtual];
      if (cfg && cfg.tipo === "distracao") marcarAcerto(itemAtual);
      else marcarErro(itemAtual);
    }
    itemAtual = null;
    closeInfo();
  });

  // ========= CLICKS / INFO =========
  jaleco.addEventListener("click", () =>
    openInfo({
      key: "jaleco",
      title: "Jaleco de laboratório",
      general:
        "É um EPI que protege o corpo contra respingos de reagentes, sujeira e contaminações.",
      use:
        "Na análise do igarapé, o jaleco evita contato direto com a água possivelmente contaminada e com os reagentes usados nos testes.",
    })
  );

  frascos.addEventListener("click", () =>
    openInfo({
      key: "frascos",
      title: "Frascos de coleta",
      general:
        "Frascos limpos, de vidro ou plástico adequado, usados para armazenar amostras de água.",
      use:
        "No igarapé, vão guardar a água coletada em vários pontos, preservando as características físico-químicas até a análise no laboratório.",
    })
  );

  reagentes.addEventListener("click", () =>
    openInfo({
      key: "reagentes",
      title: "Reagentes da análise",
      general: "Soluções químicas preparadas para reagir com substâncias presentes na água.",
      use:
        "Permitem determinar parâmetros como pH, alcalinidade, dureza ou DQO, revelando contaminações ou alterações na qualidade da água.",
    })
  );

  checklist.addEventListener("click", () =>
    openInfo({
      key: "checklist",
      title: "Notebook e checklist",
      general:
        "O notebook exibe uma lista com os materiais e passos necessários antes de sair para campo.",
      use:
        "Ajuda a verificar se EPIs, frascos, reagentes e equipamentos de campo foram separados corretamente antes de ir ao igarapé.",
    })
  );

  equipPranch.addEventListener("click", () =>
    openInfo({
      key: "equipPrancheta",
      title: "Prancheta e ficha de campo",
      general:
        "Usada para registrar informações durante a coleta: data, hora, ponto de amostragem e observações visuais.",
      use:
        "Relaciona os resultados laboratoriais com o contexto de cada ponto do igarapé, o que é essencial para interpretar os dados.",
    })
  );

  equipFrascos.addEventListener("click", () =>
    openInfo({
      key: "equipFrascos",
      title: "Frascos e recipientes de campo",
      general:
        "Recipientes menores que auxiliam na coleta, divisão e preservação das amostras diretamente no local.",
      use:
        "Permitem pegar a água no ponto exato desejado, fazer pré-divisões e adicionar conservantes quando necessário.",
    })
  );

  equipMedidor.addEventListener("click", () =>
    openInfo({
      key: "equipMedidor",
      title: "Medidor portátil (pH/condutividade)",
      general: "Equipamento eletrônico usado para medições rápidas diretamente em campo.",
      use:
        "No igarapé, será usado para medir pH/condutividade na hora da coleta, evitando mudanças que ocorreriam se a medição fosse feita apenas no laboratório.",
    })
  );

  equipTermom.addEventListener("click", () =>
    openInfo({
      key: "equipTermometro",
      title: "Termômetro / copo de amostra",
      general:
        "Instrumentos usados para medir a temperatura da água e realizar pequenas leituras ou testes rápidos.",
      use:
        "A temperatura influencia solubilidade de gases, atividade biológica e a toxicidade de poluentes, sendo um parâmetro importante na avaliação do igarapé.",
    })
  );

  residuos.addEventListener("click", () =>
    openInfo({
      key: "residuos",
      title: "Frascos com soluções e resíduos",
      general:
        "Conjunto de frascos que guardam soluções já utilizadas ou sobras de experimentos anteriores, organizados na bancada.",
      use:
        "Fazem parte da rotina de registro e armazenamento temporário de materiais já usados, enquanto outras atividades seguem acontecendo no laboratório.",
    })
  );

  micro.addEventListener("click", () =>
    openInfo({
      key: "microondas",
      title: "Forno de micro-ondas do laboratório",
      general:
        "Equipamento elétrico utilizado em alguns protocolos para aquecer soluções, vidrarias ou materiais.",
      use:
        "É acionado em procedimentos específicos que acontecem ali mesmo na bancada, integrado ao dia a dia das análises.",
    })
  );

  cafe.addEventListener("click", () =>
    openInfo({
      key: "cafe",
      title: "Caneca de café da pesquisadora",
      general:
        "Caneca pessoal que costuma acompanhar a pesquisadora nas pausas entre etapas do trabalho experimental.",
      use:
        "Ajuda a manter o foco e o bem-estar durante o planejamento e a interpretação dos resultados.",
    })
  );

  plantas.addEventListener("click", () =>
    openInfo({
      key: "plantas",
      title: "Plantas da bancada",
      general:
        "Vasos decorativos que deixam o ambiente mais agradável, trazendo um pouco de verde para perto dos equipamentos.",
      use:
        "Contribuem para tornar a rotina científica mais acolhedora, compondo o cenário ao redor das análises.",
    })
  );

  // ========= REINICIAR =========
  btnReiniciar?.addEventListener("click", () => {
    setVideoMode(false);

    Object.keys(estado).forEach((k) => (estado[k] = false));
    Object.keys(errados).forEach((k) => (errados[k] = false));

    Object.values(hotspotsMap).forEach((el) => {
      el.style.pointerEvents = "auto";
      el.style.opacity = "";
    });

    scene.style.pointerEvents = "auto";
    itemAtual = null;
    resultadoMostrado = false;

    overlayRes?.classList.remove("visible");
    hint.textContent = defaultHintText;
    closeInfo();
    applyHotspots();
    pararFogosLoop();

    if (videoViagem) {
      videoViagem.pause();
      videoViagem.currentTime = 0;
      videoViagem.style.display = "none";
      videoViagem.muted = false;
      videoViagem.volume = 1;
    }
    if (videoVilarejo) {
      videoVilarejo.pause();
      videoVilarejo.currentTime = 0;
      videoVilarejo.style.display = "none";
      videoVilarejo.muted = false;
      videoVilarejo.volume = 1;
    }
  });

  atualizarHint();
}

// =====================
// CENA 2 (mantida)
// =====================
export function initCena2() {
  const hint = $("#hint");
  const scene = $("#scene");
  const bg = $("#bg");

  if (!hint || !scene || !bg) return;

  function onKeyDebug(e) {
    if (e.key.toLowerCase() === "h") {
      document.body.classList.toggle("debug-hotspots");
    }
  }
  document.addEventListener("keydown", onKeyDebug);

  const defaultHintText = "💡 Observe a cena e encontre os 7 erros químico-ambientais no igarapé.";
  hint.textContent = defaultHintText;

  const erroBackdrop = document.getElementById("erroBackdrop");
  const erroTitle = document.getElementById("erroTitle");
  const erroDesc = document.getElementById("erroDesc");
  const erroImpact = document.getElementById("erroImpact");
  const erroAcao = document.getElementById("erroAcao");
  const erroClose = document.getElementById("erroClose");
  const erroOk = document.getElementById("erroOk");

  const overlayRes = document.getElementById("resultadoOverlay");
  const resPont = document.getElementById("resultadoPontuacao");
  const resRank = document.getElementById("resultadoRanking");
  const trofeuIcon = document.getElementById("trofeuIcon");
  const btnFecharRes = document.getElementById("btnFecharResultado");
  const btnNext = document.getElementById("btnIrProximaFase");
  const fogosContainer = document.getElementById("fogosContainer");

  const PROXIMA_FASE_URL = "cena3.html";

  const INFO_ERROS = {
    erro1: {
      title: "Erro 1 — Óleo despejado no igarapé",
      desc: "A presença de óleo na água indica descarte irregular de resíduos oleosos, formando uma película superficial.",
      impact: "A película reduz a troca gasosa, intoxica organismos e agrava odores.",
      acao: "Conter/recolher o óleo, orientar descarte correto e acionar pontos de entrega.",
    },
    erro2: {
      title: "Erro 2 — Lavagem de roupas no igarapé",
      desc: "Lavar roupa lança tensoativos e aditivos diretamente na água.",
      impact: "Degrada a qualidade e favorece desequilíbrios no ecossistema.",
      acao: "Usar área adequada e reforçar educação ambiental/saneamento.",
    },
    erro3: {
      title: "Erro 3 — Eutrofização / alteração visível",
      desc: "Excesso de nutrientes (N e P) e crescimento intenso de algas/micro-organismos.",
      impact: "Decomposição consome O₂ e pode causar morte de peixes.",
      acao: "Investigar fontes e monitorar OD, pH, turbidez, DBO, N e P.",
    },
    erro4: {
      title: "Erro 4 — Banho em água possivelmente contaminada",
      desc: "Contato direto expõe a riscos químicos e microbiológicos.",
      impact: "Pode causar dermatites e doenças de veiculação hídrica.",
      acao: "Sinalizar risco e encaminhar ações de saneamento/análises.",
    },
    erro5: {
      title: "Erro 5 — Lixo/garrafas no curso d’água",
      desc: "Resíduos sólidos indicam descarte irregular.",
      impact: "Gera microplásticos e danos à fauna.",
      acao: "Remoção, pontos de coleta e ações educativas/fiscalização.",
    },
    erro6: {
      title: "Erro 6 — Resíduos no solo (próximo ao igarapé)",
      desc: "Resíduos lixiviam contaminantes para água/lençol freático.",
      impact: "Contamina solo e água ao longo do tempo.",
      acao: "Recolhimento, descarte correto/logística reversa.",
    },
    erro7: {
      title: "Erro 7 — Peixe morto/boiando",
      desc: "Bioindicador de estresse ambiental (OD baixo, toxicidade, pH etc.).",
      impact: "Sinaliza desequilíbrio ecológico.",
      acao: "Medir OD, pH, temperatura, condutividade e rastrear fontes.",
    },
  };

  const PESO_ERRO = { erro1: 1, erro2: 1, erro3: 1, erro4: 1, erro5: 1, erro6: 1, erro7: 1 };
  const TOTAL_ERROS = Object.keys(PESO_ERRO).length;
  const PONTOS_POR_ERRO = 10;

  let pontos = 0;
  let resultadoMostrado = false;
  let errosEncontrados = 0;

  let misclicks = 0;

  const errosClicados = new Set();
  const hotspots = {};

  const MAP_ERROS = {
    erro1: { x: 0.245, y: 0.47, w: 0.135, h: 0.24 },
    erro2: { x: 0.39, y: 0.58, w: 0.09, h: 0.21 },
    erro3: { x: 0.42, y: 0.44, w: 0.14, h: 0.07 },
    erro4: { x: 0.5, y: 0.59, w: 0.075, h: 0.21 },
    erro5: { x: 0.635, y: 0.55, w: 0.125, h: 0.145 },
    erro6: { x: 0.415, y: 0.85, w: 0.18, h: 0.14 },
    erro7: { x: 0.499, y: 0.505, w: 0.06, h: 0.05 },
  };

  function atualizarHint() {
    hint.textContent = `Erros encontrados: ${errosEncontrados}/${TOTAL_ERROS}. Clique nos pontos problemáticos do igarapé.`;
  }

  let erroPendente = null;
  let eventoPendente = null;

  function abrirModalErro(id, ev) {
    const info = INFO_ERROS[id];
    if (!erroBackdrop || !info) {
      marcarErro(id, ev);
      return;
    }

    erroPendente = id;
    eventoPendente = ev;

    erroTitle.textContent = info.title;
    erroDesc.textContent = info.desc;
    erroImpact.textContent = `Impacto: ${info.impact}`;
    erroAcao.textContent = `O que fazer: ${info.acao}`;

    erroBackdrop.classList.add("visible");
  }

  function fecharModalErro() {
    erroBackdrop?.classList.remove("visible");
    erroPendente = null;
    eventoPendente = null;
  }

  function confirmarErroModal() {
    if (!erroPendente) return;
    marcarErro(erroPendente, eventoPendente);
    fecharModalErro();
  }

  erroClose?.addEventListener("click", fecharModalErro);
  erroBackdrop?.addEventListener("click", (e) => {
    if (e.target === erroBackdrop) fecharModalErro();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fecharModalErro();
  });
  erroOk?.addEventListener("click", confirmarErroModal);

  function marcarErro(erroId, ev) {
    if (errosClicados.has(erroId)) return;

    errosClicados.add(erroId);
    errosEncontrados += 1;

    pontos += (PESO_ERRO[erroId] || 1) * PONTOS_POR_ERRO;

    const hs = hotspots[erroId];
    if (hs) {
      const xNode = document.createElement("div");
      xNode.className = "erro-x";
      xNode.textContent = "X";
      hs.appendChild(xNode);

      const rect = hs.getBoundingClientRect();
      const cx = ev ? ev.clientX - rect.left : rect.width / 2;
      const cy = ev ? ev.clientY - rect.top : rect.height / 2;

      requestAnimationFrame(() => {
        const w = xNode.offsetWidth || 0;
        const h = xNode.offsetHeight || 0;
        xNode.style.left = cx - w / 2 + "px";
        xNode.style.top = cy - h / 2 + "px";
      });

      hs.style.pointerEvents = "none";
    }

    atualizarHint();
    if (errosEncontrados >= TOTAL_ERROS) mostrarResultado();
  }

  function handleClick(erroId, ev) {
    if (errosClicados.has(erroId)) return;
    abrirModalErro(erroId, ev);
  }

  function onSceneClick(e) {
    if (resultadoMostrado) return;
    if (erroBackdrop?.classList.contains("visible")) return;

    const isHotspot = !!e.target.closest?.(".hs-erro");
    if (!isHotspot) misclicks += 1;
  }
  scene.addEventListener("click", onSceneClick);

  function aplicarHotspots() {
    const sceneRect = scene.getBoundingClientRect();
    const imgRect = bg.getBoundingClientRect();
    const imgW = imgRect.width;
    const imgH = imgRect.height;

    Object.entries(MAP_ERROS).forEach(([id, d]) => {
      let el = hotspots[id];
      if (!el) {
        el = document.createElement("div");
        el.className = "hotspot hs-erro";
        el.dataset.erroId = id;
        hotspots[id] = el;
        scene.appendChild(el);
        el.addEventListener("click", (ev) => handleClick(id, ev));
      }

      const pxLeft = imgRect.left - sceneRect.left + d.x * imgW;
      const pxTop = imgRect.top - sceneRect.top + d.y * imgH;

      Object.assign(el.style, {
        position: "absolute",
        left: pxLeft + "px",
        top: pxTop + "px",
        width: d.w * imgW + "px",
        height: d.h * imgH + "px",
        zIndex: 50,
        pointerEvents: errosClicados.has(id) ? "none" : "auto",
      });
    });
  }

  if (bg.complete && bg.naturalWidth > 0) aplicarHotspots();
  else bg.addEventListener("load", aplicarHotspots, { once: true });
  window.addEventListener("resize", aplicarHotspots);

  let fogosLoopId = null;

  function dispararFogos() {
    if (!fogosContainer) return;

    const explosoes = 10;
    const particulas = 24;

    for (let e = 0; e < explosoes; e++) {
      const centroX = 10 + Math.random() * 80;
      const centroY = 15 + Math.random() * 50;
      const atraso = e * 120;

      setTimeout(() => {
        for (let i = 0; i < particulas; i++) {
          const p = document.createElement("div");
          p.className = "firework";

          const angulo = (Math.PI * 2 * i) / particulas;
          const dist = 90 + Math.random() * 90;

          p.style.left = centroX + "%";
          p.style.top = centroY + "%";
          p.style.setProperty("--dx", Math.cos(angulo) * dist + "px");
          p.style.setProperty("--dy", Math.sin(angulo) * dist + "px");

          fogosContainer.appendChild(p);
          p.addEventListener("animationend", () => p.remove());
        }
      }, atraso);
    }
  }

  function iniciarFogosLoop() {
    if (!fogosContainer || fogosLoopId !== null) return;
    dispararFogos();
    fogosLoopId = setInterval(dispararFogos, 2500);
  }

  function pararFogosLoop() {
    if (fogosLoopId !== null) {
      clearInterval(fogosLoopId);
      fogosLoopId = null;
    }
    if (fogosContainer) fogosContainer.innerHTML = "";
  }

  function mostrarResultado() {
    if (!overlayRes || resultadoMostrado) return;
    resultadoMostrado = true;

    const maxPontos = TOTAL_ERROS * PONTOS_POR_ERRO;

    let ranking = "Bronze";
    let texto = `Cliques fora: ${misclicks}.`;

    trofeuIcon?.classList.remove("trofeu-ouro", "trofeu-prata", "trofeu-bronze");

    if (misclicks <= 2) {
      ranking = "Ouro";
      texto = `Excelente! ${texto}`;
      trofeuIcon?.classList.add("trofeu-ouro");
      iniciarFogosLoop();
    } else if (misclicks <= 5) {
      ranking = "Prata";
      texto = `Muito bom! ${texto}`;
      trofeuIcon?.classList.add("trofeu-prata");
      pararFogosLoop();
    } else {
      ranking = "Bronze";
      texto = `Concluído! ${texto}`;
      trofeuIcon?.classList.add("trofeu-bronze");
      pararFogosLoop();
    }

    if (resPont) resPont.textContent = `Pontuação: ${pontos}/${maxPontos} pontos`;
    if (resRank) resRank.textContent = `Ranking: ${ranking}. ${texto}`;

    overlayRes.classList.add("visible");
  }

  btnFecharRes?.addEventListener("click", () => {
    overlayRes.classList.remove("visible");
    pararFogosLoop();
  });

  btnNext?.addEventListener("click", () => {
    window.location.href = PROXIMA_FASE_URL;
  });

  atualizarHint();
}
