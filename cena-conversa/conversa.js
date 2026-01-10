/* conversa.js
   Cena: Conversa com a Comunidade
   Mecânica: diálogo com escolhas (boa / média / ruim), reputação e ramificações
   FIX: layout responsivo relativo à área útil da imagem (object-fit: contain)

   ALTERAÇÃO (pedido): embaralhar a ordem das escolhas (choices) aleatoriamente,
   sem mudar absolutamente nada nos diálogos.

   ALTERAÇÃO (pedido): inserir conversa.mp3 como trilha sonora (BGM) desta cena,
   com desbloqueio de áudio por gesto do usuário, e pausa/retorno durante o vídeo.
*/

(() => {
  "use strict";

  const state = {
    reputation: 0,
    repMin: -10,
    repMax: 10,
    currentNodeId: null,
    activeThread: null,
    activeChoiceIndex: 0,
    conversationOn: false,
    _choiceButtons: [],

    // ===== NOVO (controle de fluxo pós-gate, sem mexer nos diálogos)
    _inPostGateTintas: false,
    _pendingGotoUrl: "",
    _pendingTier: "",
  };

  const ICONS = {
    dialogo: `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M21 14a4 4 0 0 1-4 4H9l-4 3v-3H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v7Z"
          stroke="white" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `,
    livro: `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M4 19a2 2 0 0 1 2-2h14" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 3h14v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
          stroke="white" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `,
    raio: `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M13 2 3 14h8l-1 8 11-14h-8l0-6Z"
          stroke="white" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `,
    alerta: `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 9v4" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 17h.01" stroke="white" stroke-width="3" stroke-linecap="round"/>
        <path d="M10.3 3.7 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"
          stroke="white" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `,
    check: `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M20 7 10 17l-5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `,
    frasco: `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M10 2v6l-5 9a4 4 0 0 0 3.5 6h7A4 4 0 0 0 19 17l-5-9V2"
          stroke="white" stroke-width="2" stroke-linejoin="round"/>
        <path d="M8 14h8" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
  };

  /* ===== Diálogos com RESPOSTA DA PESQUISADORA por escolha ===== */
  const DIALOGUES = {
    agua: {
      start: "a1",
      nodes: {
        a1: {
          speaker: "Pesquisadora",
          text:
            "Gente, eu vim conversar sobre o que estamos observando no igarapé: mudança de cor, espuma, cheiro forte e mortandade de peixes. Isso pode indicar contaminação por óleo e excesso de nutrientes.",
          choices: [
            {
              repDelta: +2,
              icon: "dialogo",
              label: "Explicar com calma, sem assustar, e pedir exemplos do dia a dia.",
              sub: "Tom acolhedor e participativo.",
              feedback: "A comunidade se sentiu mais à vontade.",
              reply:
                "Vamos conversar com calma!\n\nQuero entender o dia a dia de vocês: quando começaram a notar cheiro forte, espuma, mudança de cor ou peixes mortos? Esses exemplos ajudam a gente a identificar a origem do problema.",
              next: "a2",
            },
            {
              repDelta: 0,
              icon: "raio",
              label: "Explicar rapidamente e já sugerir o que fazer.",
              sub: "Direto ao ponto, mas pode deixar dúvidas.",
              feedback: "O grupo entendeu, mas ficou com dúvidas.",
              reply:
                "Vou ser bem objetiva: esses sinais costumam indicar poluição por óleo e excesso de nutrientes.\n\nO primeiro passo é evitar jogar óleo e água de limpeza no igarapé e combinar um ponto de coleta. Depois a gente confirma com observação e, se possível, testes simples.",
              next: "a2",
            },
            {
              repDelta: -3,
              icon: "alerta",
              label: "Repreender a comunidade e dizer que a culpa é deles.",
              sub: "Confronto direto (tende a fechar o diálogo).",
              feedback: "A comunidade ficou na defensiva.",
              reply:
                "Gente, desse jeito não dá. Se continuarem jogando óleo e resíduos, o igarapé vai piorar.\n\nVamos entender o que está acontecendo e construir uma saída juntos.",
              next: "a2",
            },
          ],
        },

        a2: {
          speaker: "Moradores",
          text: "Mas a gente sempre limpou a roupa e jogou o óleo ali… isso faz tanta diferença assim?",
          choices: [
            {
              repDelta: +2,
              icon: "livro",
              label: "Explicar que o óleo forma uma película e reduz a oxigenação da água.",
              sub: "Explicação simples e visual.",
              feedback: "Resposta clara e acessível.",
              reply:
                "Faz diferença, sim.\n\nO óleo forma uma película na superfície, como se fosse uma “tampa”. Isso dificulta a entrada de oxigênio e atrapalha a respiração dos peixes e de outros seres vivos. Com menos oxigênio, aumenta a chance de mortandade.",
              next: "a3",
            },
            {
              repDelta: 0,
              icon: "dialogo",
              label: "Dizer que faz mal ao meio ambiente.",
              sub: "Mantém o diálogo, mas de forma rasa.",
              feedback: "O grupo falou mais, mas ainda faltou detalhe.",
              reply:
                "Sim, isso prejudica o igarapé e a saúde da água.\n\n Geralmente muda a cor, o cheiro e começa a formar espuma. O óleo presente na água impossibilita os peixes de respirarem.",
              next: "a3",
            },
            {
              repDelta: -2,
              icon: "alerta",
              label: "Dizer que é errado e que precisam parar imediatamente.",
              sub: "Tom duro e pouco educativo.",
              feedback: "O tom pesou e gerou resistência.",
              reply:
                "Isso precisa parar, porque faz mal.\n\nMas vamos fazer do jeito certo: eu explico o porquê e a gente combina alternativas práticas para o descarte do óleo, sem complicar a rotina de vocês.",
              next: "a3",
            },
          ],
        },

        a3: {
          speaker: "Moradores",
          text: "E essa espuma e cheiro forte… tem a ver com sabão e água de limpeza?",
          choices: [
            {
              repDelta: +2,
              icon: "frasco",
              label: "Explicar que detergentes aumentam espuma, pois possuem tensoativos.",
              sub: "Conecta a observação ao cotidiano.",
              feedback: "Agora fez sentido para o grupo.",
              reply:
                "Pode ter relação, sim.\n\nDetergentes aumentam a espuma porque contêm tensoativos, substâncias que reduzem a tensão da água e facilitam a formação de bolhas. Em excesso, esses tensoativos formam uma camada de espuma na superfície do igarapé, dificultam a entrada de oxigênio e podem prejudicar peixes e outros organismos. Além disso, a água de limpeza traz resíduos orgânicos e nutrientes, o que favorece algas, piora o cheiro e reduz ainda mais o oxigênio da água.",
              next: "a3b",
            },
            {
              repDelta: 0,
              icon: "livro",
              label: "Dizer que pode ser poluição em geral e que vocês vão observar mais sinais juntos.",
              sub: "Correto, mas menos direto.",
              feedback: "A comunidade entendeu parcialmente.",
              reply:
                "Pode ser poluição em geral, mas a gente consegue apurar melhor.\n\nVamos observar juntos: onde a espuma aparece mais, em que horários o cheiro é pior e se há descarte visível. Esse mapa de sinais ajuda a identificar as fontes.",
              next: "a3b",
            },
            {
              repDelta: -2,
              icon: "alerta",
              label: "Dizer que é sujeira e falta de cuidado das pessoas.",
              sub: "Generaliza e culpabiliza.",
              feedback: "Parte do grupo se sentiu atacada.",
              reply:
                "Quando há descarte errado, realmente piora.\n\nMas eu prefiro focar na solução: vamos ver o que é mais comum no dia a dia (óleo, água de limpeza, restos) e criar um jeito simples de reduzir isso.",
              next: "a3b",
            },
          ],
        },

        a3b: {
          speaker: "Moradores",
          text: "E os peixes mortos… por que isso acontece?",
          choices: [
            {
              repDelta: +3,
              icon: "livro",
              label: "Explicar sobre a eutrofização.",
              sub: "Explicação completa e fácil de visualizar.",
              feedback: "Agora a comunidade entendeu a causa dos peixes mortos.",
              reply:
                "Ótima pergunta. Muitas mortes de peixes acontecem por falta de oxigênio na água.\n\nIsso acontece por causa da eutrofização, que é quando entram nutrientes demais na água (principalmente nitrogênio e fósforo), por exemplo, de esgoto, restos orgânicos e até alguns detergentes. Isso faz as algas crescerem muito, deixando a água mais verde.\n\nDepois, quando essas algas morrem, as bactérias decompõem esse material e consomem muito oxigênio. Aí o oxigênio dissolve menos na água, ou seja, sobra menos oxigênio disponível e os peixes podem sufocar.\n\nVocês já perceberam a água mais esverdeada ou com “lodo”/algas perto da margem?",
              next: "a4",
            },
            {
              repDelta: +1,
              icon: "dialogo",
              label: "Explicar de uma forma bem simples o porquê isso acontece.",
              sub: "Explicação básica.",
              feedback: "O grupo participou e a explicação ficou clara.",
              reply:
                "Vamos ligar os sinais: vocês notaram água mais verde, lodo na margem ou muita espuma?\n\nQuando tem nutrientes demais na água, as algas aumentam. Só que isso pode reduzir o oxigênio, principalmente à noite e na decomposição. Sem oxigênio, os peixes ficam fracos e podem morrer.\n\n",
              next: "a4",
            },
            {
              repDelta: -2,
              icon: "alerta",
              label: "Responder de forma dura, sem explicar o processo direito.",
              sub: "Pode gerar resistência e cortar o diálogo.",
              feedback: "A comunidade ficou insegura e menos aberta.",
              reply:
                "Isso acontece porque vocês estão poluindo o igarapé.\n\nMas, para resolver de verdade, precisamos entender as fontes (óleo, esgoto, água de limpeza) e organizar ações simples para reduzir nutrientes e melhorar o oxigênio na água.",
              next: "a4",
            },
          ],
        },

        a4: {
          speaker: "Pesquisadora",
          text:
            "Se a gente quiser melhorar isso juntos, precisamos de ações simples e constantes. O que vocês acham mais viável começar ainda esta semana?",
          choices: [
            {
              repDelta: +3,
              icon: "check",
              label: "Propor uma campanha de conscientização + oficina de produção de sabão.",
              sub: "Ação concreta e comunitária.",
              feedback: "A ideia animou muita gente.",
              reply:
                "Minha sugestão é bem prática: fazer uma campanha de conscientização para que não se jogue mais lixo e óleo no igarapé. Podemos também, contactar o prefeito para pensarmos na possibilidade da criação de um ecoponto.\n\nPara além disso, se vocês toparem, a gente pode fazer uma oficina de reaproveitamento de óleo para produzir sabão, com segurança e orientação.",
              next: "a5",
            },
            {
              repDelta: +1,
              icon: "dialogo",
              label: "Começar com conversa nas casas e cartazes, sem cobrar muito no início.",
              sub: "Acolhe o ritmo da comunidade.",
              feedback: "Boa aceitação, com adesão gradual.",
              reply:
                "Acho ótimo começar leve: conversa nas casas, cartazes e combinados simples.\n\nO importante é todo mundo entender o porquê e ter uma alternativa fácil. Depois a gente fortalece com ponto de coleta e acompanhamento.",
              next: "a5",
            },
            {
              repDelta: -1,
              icon: "raio",
              label: "Dizer que a prefeitura é quem tem que resolver.",
              sub: "Terceiriza e reduz engajamento local.",
              feedback: "A conversa perdeu força.",
              reply:
                "Isso é responsabilidade da prefeitura, são eles que tem de resolver esse problema.\n\nMas enquanto isso, pequenas ações locais já reduzem muito o impacto: não jogar óleo na água, guardar em garrafa e combinar um ponto de entrega. Isso já muda o cenário.",
              next: "a5",
            },
          ],
        },

        a5: {
          speaker: "Moradores",
          text: "E como a gente vai saber se está melhorando? Só olhando a água?",
          choices: [
            {
              repDelta: +2,
              icon: "frasco",
              label: "Sugerir registro semanal + observações + testes simples quando possível.",
              sub: "Monitoramento básico e realista.",
              feedback: "O grupo gostou de acompanhar a evolução.",
              reply:
                "Dá para fazer um acompanhamento simples.\n\nUma vez por semana: registrar foto do mesmo ponto, anotar cheiro, cor e presença de espuma. Se der, a gente inclui testes básicos com orientação. Assim vocês enxergam a melhora ao longo do tempo.",
              next: "aEnd",
            },
            {
              repDelta: 0,
              icon: "dialogo",
              label: "Dizer que dá para observar sinais, mas que é melhor registrar mudanças em conjunto.",
              sub: "Ok, mas sem método claro.",
              feedback: "Ficou mais claro, porém ainda genérico.",
              reply:
                "Observar ajuda, mas registrar junto ajuda mais.\n\nSe vocês toparem, a gente combina um ponto e um dia fixo para comparar: foto, anotações e conversa rápida. Isso dá um “termômetro” do igarapé.",
              next: "aEnd",
            },
            {
              repDelta: -2,
              icon: "alerta",
              label: "Dizer que é complicado demais e não tem como saber.",
              sub: "Desanima e encerra o assunto.",
              feedback: "O grupo desanimou.",
              reply:
                "É verdade que medir com precisão pode ser difícil.\n\nMas dá para acompanhar com sinais simples e registro. Se vocês quiserem, eu ajudo a organizar um jeito bem fácil de fazer isso sem atrapalhar a rotina.",
              next: "aEnd",
            },
          ],
        },

        aEnd: {
          speaker: "Sistema",
          text: "A conversa terminou. A reputação influencia os próximos eventos da comunidade.",
          next: "goto:../cenaoficina/oficina.html",
        },

        /* ===== BLOCO TINTAS (APÓS O GATE FINAL, SEM ENTRAR NO FLUXO PRINCIPAL) ===== */
        aTintas: {
          speaker: "Moradores",
          text: "Não sei se você notou os enfeites, mas estamos em época de festa junina.", 
          next: "aTintasResp",
        },

        aTintasResp: {
          speaker: "Pesquisadora",
          text:
            "Ah, sim, eu notei. Está tudo muito bonito! Eu amo o Bumba Meu Boi.",
          next: "a6", 
        },
         a6: {
          speaker: "Moradores",
          text: "Então… é justamente por isso que a gente queria falar com você. Aqui na comunidade estamos sem tintas. E nós precisamos pintar e renovar as roupas do bumba meu boi, você poderia nos ajudar? E já que você ama o bumba meu boi, o que acha de participar?",
          next: "a7", // botão "Continuar" aparece automaticamente
        },

        a7: {
          speaker: "Pesquisadora",
          text: "Sério?!, eu adoraria participar! E sobre a tinta, dá pra fazer tinta usando pigmentos naturais do dia a dia, como urucum, cúrcuma e repolho roxo. A ideia é extrair a cor (com água morna, álcool ou água com um pouquinho de vinagre, dependendo do pigmento) e misturar com um “ligante” simples para fixar melhor (por exemplo: cola branca escolar, goma, ou uma mistura bem fina de farinha e água, dependendo do que vocês tiverem). Se vocês toparem, a gente organiza uma oficina rápida: separar os pigmentos, testar a intensidade da cor e ver qual mistura funciona melhor para o que vocês precisam.",
          next: "a4", // continua para o final normal (gate/vídeo)
        },
      },
    },
  };

  const el = {
    scene: document.getElementById("scene"),
    bg: document.querySelector("#scene .bg"),

    hint: document.getElementById("hint"),
    btnReiniciar: document.getElementById("btnReiniciar"),
    btnStartTalk: document.getElementById("btnStartTalk"),

    topbar: document.getElementById("topbar"),
    statusText: document.getElementById("statusText"),
    repFill: document.getElementById("repFill"),
    repText: document.getElementById("repText"),
    repTrack: document.querySelector(".rep-track"),
    repFace: document.getElementById("repFace"),

    subtitleCena: document.getElementById("subtituloCena"),

    bubbleNpc: document.getElementById("bubbleNpc"),
    bubblePlayer: document.getElementById("bubblePlayer"),
    npcName: document.getElementById("npcName"),
    npcText: document.getElementById("npcText"),
    playerChoices: document.getElementById("playerChoices"),
    toast: document.getElementById("toast"),

    hs1: document.getElementById("hs-1"),
    hs2: document.getElementById("hs-2"),

    // ===== VÍDEO COMO "CENA" (dentro do palco)
    videoLayer: document.getElementById("videoLayer"),
    endVideo: document.getElementById("endVideo"),
    btnSkipVideo: document.getElementById("btnSkipVideo"),
  };

  // ===== NOVO: subtítulo dinâmico durante o vídeo
  const SUBTITLE_DEFAULT = el.subtitleCena?.textContent || "Conversa com a Comunidade";
  const SUBTITLE_VIDEO   = "Campanha de conscientização e divulgação da oficina de sabão";

  // =========================
  // HOTSPOTS NORMALIZADOS (0..1) RELATIVOS À IMAGEM
  // =========================
  const HOTSPOTS_IMG = {
    "hs-1": { x: 0.10, y: 0.70, w: 0.14, h: 0.12 },
    "hs-2": { x: 0.30, y: 0.84, w: 0.18, h: 0.12 },
  };

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function repToPercent(rep) {
    const r = clamp(rep, state.repMin, state.repMax);
    return ((r - state.repMin) / (state.repMax - state.repMin)) * 100;
  }

  function repMood(rep) {
    if (rep >= 7) return { label: "Excelente", emoji: "😄" };
    if (rep >= 3) return { label: "Boa", emoji: "🙂" };
    if (rep >= 0) return { label: "Neutra", emoji: "😐" };
    if (rep >= -3) return { label: "Baixa", emoji: "😕" };
    return { label: "Crítica", emoji: "😠" };
  }

  // ===== rótulo final em 3 níveis
  function repTier3(rep) {
    if (rep >= 3) return "Excelente";
    if (rep >= 0) return "Regular";
    return "Péssima";
  }

  function updateRepUI() {
    const pctRaw = repToPercent(state.reputation);
    const pctFace = clamp(pctRaw, 4, 96);

    if (el.repFill) el.repFill.style.width = `${pctRaw}%`;
    el.repTrack?.setAttribute("aria-valuenow", String(state.reputation));

    const mood = repMood(state.reputation);

    if (el.repText) el.repText.textContent = `${mood.emoji} ${mood.label}`;
    if (el.repFace) el.repFace.textContent = mood.emoji;
    if (el.topbar) el.topbar.style.setProperty("--rep-pct", String(pctFace));
  }

  function showToast(msg) {
    if (!msg || !el.toast) return;

    el.toast.textContent = msg;
    el.toast.style.display = "block";
    el.toast.setAttribute("aria-hidden", "false");

    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      el.toast.style.display = "none";
      el.toast.setAttribute("aria-hidden", "true");
    }, 2300);
  }

  function setHint(text) {
    if (el.hint) el.hint.textContent = text;
  }

  // =====================
  // ÁUDIO — BGM (trilha da conversa)
  // =====================
  const AUDIO_BASE = (() => {
    // Base relativo ao próprio arquivo JS (robusto mesmo em subpastas)
    const url = document.currentScript?.src || location.href;
    return new URL(".", url);
  })();

  const AUDIO = {
    // Coloque o arquivo em: audios/conversa.mp3 (relativo ao conversa.js)
    bgm: new URL("../audios/conversa.mp3", AUDIO_BASE).href,
  };

  const EMM_AUDIO = {
    unlocked: false,
    bgmEl: null,
    wasPlaying: false, // usado para pausar/retomar durante o vídeo
  };

  function safePlay(audioEl) {
    const p = audioEl.play();
    if (p?.catch) p.catch(() => {});
  }

  function initBgm() {
    if (EMM_AUDIO.bgmEl) return;

    const a = new Audio(AUDIO.bgm);
    a.loop = true;
    a.preload = "auto";
    a.volume = 0.20; // ajuste aqui (0 a 1)

    EMM_AUDIO.bgmEl = a;

    // tenta autoplay (pode ser bloqueado; depois desbloqueia no primeiro gesto)
    safePlay(a);
  }

  function unlockAudioOnce() {
    if (EMM_AUDIO.unlocked) return;
    EMM_AUDIO.unlocked = true;

    if (EMM_AUDIO.bgmEl) safePlay(EMM_AUDIO.bgmEl);
  }

  // desbloqueia no primeiro gesto do usuário
  window.addEventListener("pointerdown", unlockAudioOnce, { once: true, capture: true });
  window.addEventListener("keydown", unlockAudioOnce, { once: true, capture: true });

  // =========================
  // VÍDEO FINAL COMO "CENA" (TELA CHEIA)
  // =========================
  function stopFinalVideo() {
    if (!el.endVideo) return;
    try { el.endVideo.pause(); } catch {}
    try { el.endVideo.currentTime = 0; } catch {}
    el.endVideo.controls = false;
  }

  function enterVideoMode() {
    // pausa o BGM para não competir com o áudio do vídeo
    if (EMM_AUDIO.bgmEl) {
      EMM_AUDIO.wasPlaying = !EMM_AUDIO.bgmEl.paused;
      try { EMM_AUDIO.bgmEl.pause(); } catch {}
    }

    document.body.classList.add("is-fullscreen-video");
    el.scene?.classList.add("video-mode");

    // ===== NOVO: muda o subtítulo durante o vídeo
    if (el.subtitleCena) el.subtitleCena.textContent = SUBTITLE_VIDEO;

    if (el.videoLayer) {
      el.videoLayer.style.display = "block";
      el.videoLayer.setAttribute("aria-hidden", "false");
    }

    if (el.topbar) {
      el.topbar.style.display = "none";
      el.topbar.setAttribute("aria-hidden", "true");
    }

    setHint("");
  }

  function exitVideoMode() {
    // retoma o BGM ao sair do vídeo
    if (EMM_AUDIO.bgmEl && EMM_AUDIO.wasPlaying) {
      EMM_AUDIO.wasPlaying = false;
      safePlay(EMM_AUDIO.bgmEl);
    }

    document.body.classList.remove("is-fullscreen-video");
    el.scene?.classList.remove("video-mode");

    // ===== NOVO: restaura o subtítulo ao sair do vídeo
    if (el.subtitleCena) el.subtitleCena.textContent = SUBTITLE_DEFAULT;

    if (el.videoLayer) {
      el.videoLayer.style.display = "none";
      el.videoLayer.setAttribute("aria-hidden", "true");
    }

    if (el.topbar) {
      const show = state.conversationOn;
      el.topbar.style.display = show ? "flex" : "none";
      el.topbar.setAttribute("aria-hidden", show ? "false" : "true");
    }
  }

  function playFinalVideoSceneThen(onDone) {
    const v = el.endVideo;
    if (!v) { onDone?.(); return; }

    enterVideoMode();
    stopFinalVideo();

    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;

      v.removeEventListener("ended", onEnded);
      v.removeEventListener("error", onError);

      if (el.btnSkipVideo) el.btnSkipVideo.onclick = null;

      stopFinalVideo();
      exitVideoMode();
      onDone?.();
    };

    const onEnded = () => finish();

    const onError = () => {
      showToast("Não foi possível reproduzir o vídeo. Prosseguindo...");
      finish();
    };

    v.addEventListener("ended", onEnded);
    v.addEventListener("error", onError);

    if (el.btnSkipVideo) {
      el.btnSkipVideo.onclick = () => finish();
    }

    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        v.controls = true;
        showToast("Clique no vídeo para reproduzir.");
      });
    }
  }

  // =========================
  // GEOMETRIA DO object-fit: contain
  // Retorna a área real desenhada da imagem dentro da .scene
  // =========================
  function getContainBox() {
    if (!el.scene || !el.bg) return null;

    const cw = el.scene.clientWidth;
    const ch = el.scene.clientHeight;

    const iw = el.bg.naturalWidth || 0;
    const ih = el.bg.naturalHeight || 0;
    if (!iw || !ih) return null;

    const scale = Math.min(cw / iw, ch / ih);
    const w = iw * scale;
    const h = ih * scale;
    const x = (cw - w) / 2;
    const y = (ch - h) / 2;

    const lm = x;
    const tm = y;
    const rm = cw - (x + w);
    const bm = ch - (y + h);

    return { x, y, w, h, lm, tm, rm, bm, cw, ch, iw, ih, scale };
  }

  function layoutHotspots() {
    const b = getContainBox();
    if (!b) return;

    Object.entries(HOTSPOTS_IMG).forEach(([id, r]) => {
      const hs = document.getElementById(id);
      if (!hs) return;

      const left = b.lm + r.x * b.w;
      const top = b.tm + r.y * b.h;
      const width = r.w * b.w;
      const height = r.h * b.h;

      hs.style.left = `${left}px`;
      hs.style.top = `${top}px`;
      hs.style.width = `${width}px`;
      hs.style.height = `${height}px`;
    });
  }

  // =========================
  // POSICIONAMENTO DA UI (balões, choices, toast, start)
  // Ancorado na área útil da imagem (contain box)
  // =========================
  function applyContainLayout() {
    const b = getContainBox();
    if (!b) return;

    if (el.bubbleNpc) {
      const npc = el.bubbleNpc;

      npc.style.left = "";
      npc.style.right = "";
      npc.style.top = "";
      npc.style.bottom = "";
      npc.style.transform = "";

      if (npc.classList.contains("is-system")) {
        npc.style.left = `${b.lm + b.w / 2}px`;
        npc.style.top = `${b.tm + b.h * 0.05}px`;
        npc.style.transform = "translateX(-50%)";
      } else if (npc.classList.contains("is-right")) {
        npc.style.top = `${b.tm + b.h * 0.012}px`;
        npc.style.right = `${b.rm + b.w * 0.10}px`;
      } else {
        npc.style.top = `${b.tm + b.h * 0.105}px`;
        npc.style.left = `${b.lm + b.w * 0.06}px`;
      }
    }

    if (el.bubblePlayer) {
      const p = el.bubblePlayer;
      const isSmall = window.matchMedia("(max-width: 720px)").matches;

      p.style.left = "";
      p.style.right = "";
      p.style.top = "";
      p.style.bottom = "";

      if (isSmall) {
        p.style.left = `${b.lm + b.w * 0.04}px`;
        p.style.right = `${b.rm + b.w * 0.04}px`;
        p.style.bottom = `${b.bm + b.h * 0.08}px`;
      } else {
        p.style.right = `${b.rm + b.w * 0.05}px`;
        p.style.bottom = `${b.bm + b.h * 0.10}px`;
      }
    }

    if (el.btnStartTalk) {
      el.btnStartTalk.style.left = `${b.lm + b.w / 2}px`;
      el.btnStartTalk.style.bottom = `${b.bm + 18}px`;
    }

    if (el.toast) {
      el.toast.style.left = `${b.lm + b.w / 5.5}px`;
      el.toast.style.bottom = `${b.bm + b.h * 0.122}px`;
      el.toast.style.transform = "translateX(-50%)";
    }
  }

  function scheduleLayout() {
    window.requestAnimationFrame(() => {
      layoutHotspots();
      applyContainLayout();
    });
  }

  function showConversationUI(show) {
    state.conversationOn = show;

    if (el.bubbleNpc) el.bubbleNpc.style.display = show ? "block" : "none";
    if (el.bubblePlayer) el.bubblePlayer.style.display = show ? "block" : "none";

    if (el.topbar) {
      el.topbar.style.display = show ? "flex" : "none";
      el.topbar.setAttribute("aria-hidden", show ? "false" : "true");
    }

    if (el.scene) {
      if (show) el.scene.classList.add("talking");
      else el.scene.classList.remove("talking");
    }

    scheduleLayout();
  }

  function getIcon(iconKey) {
    return ICONS[iconKey] || ICONS.dialogo;
  }

  function setNpcBubbleBySpeaker(speaker) {
    const s = (speaker || "").toLowerCase();
    if (!el.bubbleNpc) return;

    el.bubbleNpc.classList.remove("is-left", "is-right", "is-system");

    if (s.includes("pesquisadora")) {
      el.bubbleNpc.classList.add("is-right");
      scheduleLayout();
      return;
    }
    if (s.includes("morador") || s.includes("moradora")) {
      el.bubbleNpc.classList.add("is-left");
      scheduleLayout();
      return;
    }
    if (s.includes("sistema")) {
      el.bubbleNpc.classList.add("is-system");
      scheduleLayout();
      return;
    }

    el.bubbleNpc.classList.add("is-left");
    scheduleLayout();
  }

  function highlightChoice(buttons, index) {
    buttons.forEach(b => b.classList.remove("is-active"));
    if (buttons[index]) buttons[index].classList.add("is-active");
  }

  // =========================
  // EMBARALHAMENTO (NOVO)
  // =========================
  function rand01() {
    // tenta usar crypto para melhor aleatoriedade, cai no Math.random se não existir
    if (window.crypto && window.crypto.getRandomValues) {
      const a = new Uint32Array(1);
      window.crypto.getRandomValues(a);
      return a[0] / 4294967296; // 2^32
    }
    return Math.random();
  }

  function shuffleCopy(arr) {
    const out = Array.isArray(arr) ? arr.slice() : [];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand01() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  // ===== Botão final "Ir para ..." (usado APÓS o bloco de tintas)
  function renderProceedButton(url, tier) {
    showConversationUI(true);
    if (!el.playerChoices) return;

    el.playerChoices.innerHTML = "";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn is-active";
    btn.innerHTML = `
      <span class="choice-ico" aria-hidden="true">${getIcon("check")}</span>
      <span class="choice-main">
        <span class="choice-text">Ir para a campanha de conscientização e depois para oficina</span>
        <span class="choice-sub">Avançar.</span>
      </span>
    `;

    btn.onclick = () => {
      playFinalVideoSceneThen(() => {
        if (url) window.location.href = url;
      });
    };

    el.playerChoices.appendChild(btn);
    state._choiceButtons = [btn];
    state.activeChoiceIndex = 0;

    setHint(`✅ Reputação: ${tier}.`);
    scheduleLayout();
  }

  // ===== Gate final: reputação -> (Péssima = retry) | (Regular/Excelente = dispara TINTAS e só depois mostra avançar)
  function renderFinalGate(url) {
    const tier = repTier3(state.reputation);

    showToast(`Reputação: ${tier}`);
    showConversationUI(true);

    if (!el.playerChoices) return;
    el.playerChoices.innerHTML = "";

    // Péssima: mantém o botão de tentar novamente
    if (tier === "Péssima") {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-btn is-active";
      btn.innerHTML = `
        <span class="choice-ico" aria-hidden="true">${getIcon("alerta")}</span>
        <span class="choice-main">
          <span class="choice-text">Tentar novamente</span>
          <span class="choice-sub">Refazer a conversa para melhorar a reputação.</span>
        </span>
      `;
      btn.onclick = () => {
        startConversation();
        scheduleLayout();
      };

      el.playerChoices.appendChild(btn);
      state._choiceButtons = [btn];
      state.activeChoiceIndex = 0;

      setHint("❗ Reputação: Péssima.");
      scheduleLayout();
      return;
    }

    // Regular/Excelente: depois do gate, entra no bloco de tintas
    state._inPostGateTintas = true;
    state._pendingGotoUrl = url || "";
    state._pendingTier = tier;

    // Dispara imediatamente a pergunta de tintas
    renderNode("agua", "aTintas");
  }

  function handleNext(nextToken) {
    if (!nextToken) {
      endConversation(true);
      return;
    }

    // Intercepta retorno do bloco de tintas: aTintasResp -> (next: a4)
    if (state._inPostGateTintas && nextToken === "a4") {
      const url = state._pendingGotoUrl;
      const tier = state._pendingTier;

      state._inPostGateTintas = false;
      state._pendingGotoUrl = "";
      state._pendingTier = "";

      renderProceedButton(url, tier);
      return;
    }

    if (typeof nextToken === "string" && nextToken.startsWith("goto:")) {
      const url = nextToken.slice("goto:".length).trim();
      renderFinalGate(url);
      return;
    }

    renderNode(state.activeThread, nextToken);
  }

  function renderSingleContinue(nextFn) {
    if (!el.playerChoices) return;

    el.playerChoices.innerHTML = "";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn is-active";
    btn.innerHTML = `
      <span class="choice-ico" aria-hidden="true">${getIcon("check")}</span>
      <span class="choice-main">
        <span class="choice-text">Continuar</span>
        <span class="choice-sub">Avançar a conversa.</span>
      </span>
    `;

    btn.onclick = () => {
      nextFn?.();
      scheduleLayout();
    };

    el.playerChoices.appendChild(btn);

    state._choiceButtons = [btn];
    state.activeChoiceIndex = 0;

    scheduleLayout();
  }

  function onPickChoice(choice) {
    state.reputation = clamp(state.reputation + (choice.repDelta || 0), state.repMin, state.repMax);
    updateRepUI();
    showToast(choice.feedback);

    if (el.npcName) el.npcName.textContent = "Pesquisadora";
    if (el.npcText) el.npcText.textContent = choice.reply || "Certo. Vamos seguir.";
    setNpcBubbleBySpeaker("Pesquisadora");

    renderSingleContinue(() => {
      if (choice.next) handleNext(choice.next);
      else endConversation(true);
    });

    setHint("💬 Leia a resposta e clique em Continuar.");
  }

  function renderChoices(node) {
    if (!el.playerChoices) return;

    el.playerChoices.innerHTML = "";
    const buttons = [];

    // ===== NOVO: embaralha a ordem SEM alterar node.choices original
    const shuffledChoices = shuffleCopy(node.choices);

    shuffledChoices.forEach((choice) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-btn";

      btn.innerHTML = `
        <span class="choice-ico" aria-hidden="true">${getIcon(choice.icon)}</span>
        <span class="choice-main">
          <span class="choice-text">${choice.label}</span>
          <span class="choice-sub">${choice.sub || ""}</span>
        </span>
      `;

      btn.addEventListener("click", () => onPickChoice(choice));

      buttons.push(btn);
      el.playerChoices.appendChild(btn);
    });

    state.activeChoiceIndex = 0;
    highlightChoice(buttons, state.activeChoiceIndex);
    state._choiceButtons = buttons;

    scheduleLayout();
  }

  function renderNode(threadKey, nodeId) {
    const thread = DIALOGUES[threadKey];
    if (!thread) return;

    const node = thread.nodes[nodeId];
    if (!node) return;

    state.currentNodeId = nodeId;

    if (el.npcName) el.npcName.textContent = node.speaker || "";
    if (el.npcText) el.npcText.textContent = node.text || "";
    setNpcBubbleBySpeaker(node.speaker);

    if (node.choices) {
      renderChoices(node);
      setHint("💬 Escolha uma resposta.");
    } else if (node.next) {
      renderSingleContinue(() => handleNext(node.next));
      setHint("💬 Clique em Continuar.");
    } else {
      if (el.playerChoices) el.playerChoices.innerHTML = "";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-btn is-active";
      btn.innerHTML = `
        <span class="choice-ico" aria-hidden="true">${getIcon("check")}</span>
        <span class="choice-main">
          <span class="choice-text">Encerrar conversa</span>
          <span class="choice-sub">Finalizar este diálogo.</span>
        </span>
      `;
      btn.onclick = () => endConversation(true);

      el.playerChoices?.appendChild(btn);

      state._choiceButtons = [btn];
      state.activeChoiceIndex = 0;

      setHint("💬 Clique para encerrar.");
    }

    if (el.statusText) el.statusText.textContent = "Conversa ativa";

    scheduleLayout();
  }

  function startConversation() {
    // ajuda a destravar o áudio no clique do botão
    unlockAudioOnce();

    state.activeThread = "agua";
    state.reputation = 0;

    // reseta também o pós-gate
    state._inPostGateTintas = false;
    state._pendingGotoUrl = "";
    state._pendingTier = "";

    // se por algum motivo estava em vídeo, volta
    stopFinalVideo();
    exitVideoMode();

    updateRepUI();

    if (el.btnStartTalk) el.btnStartTalk.style.display = "none";
    showConversationUI(true);

    renderNode("agua", DIALOGUES.agua.start);

    scheduleLayout();
  }

  function endConversation(showSummary) {
    if (showSummary) {
      let resumo = "Conversa encerrada.";
      if (state.reputation >= 5) resumo = "A comunidade confia em você e topa agir junto.";
      else if (state.reputation >= 1) resumo = "A comunidade entendeu, mas ainda tem dúvidas.";
      else resumo = "A comunidade ficou resistente. Tente um tom mais acolhedor.";

      setHint(`✅ ${resumo}`);
      showToast(`Reputação: ${repTier3(state.reputation)}`);
    } else {
      setHint("💡 Clique em “Iniciar conversa” para conversar novamente.");
    }

    showConversationUI(false);

    if (el.btnStartTalk) el.btnStartTalk.style.display = "block";

    scheduleLayout();
  }

  window.addEventListener("keydown", (e) => {
    if (!state.conversationOn) return;
    if (!state._choiceButtons || state._choiceButtons.length === 0) return;

    const buttons = state._choiceButtons;

    if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
      e.preventDefault();
      state.activeChoiceIndex = (state.activeChoiceIndex + 1) % buttons.length;
      highlightChoice(buttons, state.activeChoiceIndex);
    }

    if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
      e.preventDefault();
      state.activeChoiceIndex = (state.activeChoiceIndex - 1 + buttons.length) % buttons.length;
      highlightChoice(buttons, state.activeChoiceIndex);
    }

    if (e.key === "Enter") {
      e.preventDefault();
      buttons[state.activeChoiceIndex]?.click();
    }
  });

  el.btnStartTalk?.addEventListener("click", startConversation);

  el.btnReiniciar?.addEventListener("click", () => {
    state.reputation = 0;

    // reseta também o pós-gate
    state._inPostGateTintas = false;
    state._pendingGotoUrl = "";
    state._pendingTier = "";

    stopFinalVideo();
    exitVideoMode();

    updateRepUI();
    endConversation(false);
  });

  if (el.bg) {
    el.bg.addEventListener("load", scheduleLayout);
    if (el.bg.complete && el.bg.naturalWidth > 0) scheduleLayout();
  }
  window.addEventListener("resize", scheduleLayout);

  // inicia trilha sonora (autoplay pode falhar; destrava no primeiro gesto)
  initBgm();

  scheduleLayout();
})();
