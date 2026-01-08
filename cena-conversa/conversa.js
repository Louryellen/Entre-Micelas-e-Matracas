/* conversa.js
   Cena: Conversa com a Comunidade
   Mecânica: diálogo com escolhas (boa / média / ruim), reputação e ramificações
   FIX: layout responsivo relativo à área útil da imagem (object-fit: contain)
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
              repDelta: +2, icon: "dialogo",
              label: "Explicar com calma, sem assustar, e pedir exemplos do dia a dia.",
              sub: "Tom acolhedor e participativo.",
              feedback: "A comunidade se sentiu mais à vontade.",
              reply:
                "Vamos conversar com calma!\n\nQuero entender o dia a dia de vocês: quando começaram a notar cheiro forte, espuma, mudança de cor ou peixes mortos? Esses exemplos ajudam a gente a identificar a origem do problema.",
              next: "a2"
            },
            {
              repDelta: 0, icon: "raio",
              label: "Explicar rapidamente e já sugerir o que fazer.",
              sub: "Direto ao ponto, mas pode deixar dúvidas.",
              feedback: "O grupo entendeu, mas ficou com dúvidas.",
              reply:
                "Vou ser bem objetiva: esses sinais costumam indicar poluição por óleo e excesso de nutrientes.\n\nO primeiro passo é evitar jogar óleo e água de limpeza no igarapé e combinar um ponto de coleta. Depois a gente confirma com observação e, se possível, testes simples.",
              next: "a2"
            },
            {
              repDelta: -3, icon: "alerta",
              label: "Repreender a comunidade e dizer que a culpa é deles.",
              sub: "Confronto direto (tende a fechar o diálogo).",
              feedback: "A comunidade ficou na defensiva.",
              reply:
                "Gente, desse jeito não dá. Se continuarem jogando óleo e resíduos, o igarapé vai piorar.\n\nMas eu prefiro que a gente volte para um diálogo: vamos entender o que está acontecendo e construir uma saída juntos.",
              next: "a2"
            },
          ]
        },

        a2: {
          speaker: "Moradores",
          text: "Mas a gente sempre jogou a água do prato e o óleo ali… isso faz tanta diferença assim?",
          choices: [
            {
              repDelta: +2, icon: "livro",
              label: "Explicar que o óleo forma uma película e reduz a oxigenação da água.",
              sub: "Explicação simples e visual.",
              feedback: "Resposta clara e acessível.",
              reply:
                "Faz diferença, sim.\n\nO óleo forma uma película na superfície, como se fosse uma “tampa”. Isso dificulta a entrada de oxigênio e atrapalha a respiração dos peixes e de outros seres vivos. Com menos oxigênio, aumenta a chance de mortandade.",
              next: "a3"
            },
            {
              repDelta: 0, icon: "dialogo",
              label: "Dizer que faz mal ao meio ambiente e perguntar o que eles já notaram no igarapé.",
              sub: "Mantém o diálogo, mas menos técnico.",
              feedback: "O grupo falou mais, mas ainda faltou detalhe.",
              reply:
                "Sim, isso prejudica o igarapé e a saúde da água.\n\nQuero ouvir vocês: o que mudou primeiro — a cor, o cheiro, a espuma ou os peixes? Quando a gente junta os relatos, fica mais fácil ligar as causas aos sinais.",
              next: "a3"
            },
            {
              repDelta: -2, icon: "alerta",
              label: "Dizer que é errado e que precisam parar imediatamente.",
              sub: "Tom duro e pouco educativo.",
              feedback: "O tom pesou e gerou resistência.",
              reply:
                "Isso precisa parar, porque faz mal.\n\nMas vamos fazer do jeito certo: eu explico o porquê e a gente combina alternativas práticas para o descarte do óleo, sem complicar a rotina de vocês.",
              next: "a3"
            },
          ]
        },

        a3: {
          speaker: "Moradores",
          text: "E essa espuma e cheiro forte… tem a ver com sabão e água de limpeza?",
          choices: [
            {
              repDelta: +2, icon: "frasco",
              label: "Explicar que detergentes aumentam espuma e podem vir com esgoto e nutrientes.",
              sub: "Conecta a observação ao cotidiano.",
              feedback: "Agora fez sentido para o grupo.",
              reply:
                "Pode ter relação, sim.\n\nDetergentes aumentam a espuma e, muitas vezes, a água de limpeza vem com resíduos orgânicos e nutrientes. Isso pode favorecer algas, piorar o cheiro e reduzir o oxigênio na água.",
              next: "a3b"
            },
            {
              repDelta: 0, icon: "livro",
              label: "Dizer que pode ser poluição em geral e que vocês vão observar mais sinais juntos.",
              sub: "Correto, mas menos direto.",
              feedback: "A comunidade entendeu parcialmente.",
              reply:
                "Pode ser poluição em geral, mas a gente consegue afinar melhor.\n\nVamos observar juntos: onde a espuma aparece mais, em que horários o cheiro é pior e se há descarte visível. Esse mapa de sinais ajuda a identificar as fontes.",
              next: "a3b"
            },
            {
              repDelta: -2, icon: "alerta",
              label: "Dizer que é sujeira e falta de cuidado das pessoas.",
              sub: "Generaliza e culpabiliza.",
              feedback: "Parte do grupo se sentiu atacada.",
              reply:
                "Quando há descarte errado, realmente piora.\n\nMas eu prefiro focar na solução: vamos ver o que é mais comum no dia a dia (óleo, água de limpeza, restos) e criar um jeito simples de reduzir isso.",
              next: "a3b"
            },
          ]
        },

        a3b: {
          speaker: "Moradores",
          text: "E os peixes mortos… por que isso acontece? E o que é essa tal de eutrofização?",
          choices: [
            {
              repDelta: +3, icon: "livro",
              label: "Explicar eutrofização: excesso de nutrientes → algas → falta de oxigênio → peixes morrem.",
              sub: "Explicação completa e fácil de visualizar.",
              feedback: "Agora a comunidade entendeu a causa dos peixes mortos.",
              reply:
                "Ótima pergunta. Muitas mortes de peixes acontecem por falta de oxigênio na água.\n\nEutrofização é quando entram nutrientes demais (principalmente nitrogênio e fósforo) — por exemplo, de esgoto, restos orgânicos e até alguns detergentes. Isso faz as algas crescerem muito, deixando a água mais verde.\n\nDepois, quando essas algas morrem, as bactérias “decompõem” esse material e consomem muito oxigênio. Aí o oxigênio dissolve menos na água, e os peixes podem sufocar.\n\nVocês já perceberam a água mais esverdeada ou com “lodo”/algas perto da margem?",
              next: "a4"
            },
            {
              repDelta: +1, icon: "dialogo",
              label: "Fazer uma pergunta sobre o que eles notaram e explicar de forma bem simples.",
              sub: "Participativo, conecta o cotidiano aos sinais.",
              feedback: "O grupo participou e a explicação ficou clara.",
              reply:
                "Vamos ligar os sinais: vocês notaram água mais verde, lodo na margem ou muita espuma?\n\nQuando tem “comida” demais na água (nutrientes), as algas aumentam. Só que isso pode reduzir o oxigênio, principalmente à noite e na decomposição. Sem oxigênio, os peixes ficam fracos e podem morrer.\n\nSe vocês me disserem quando começou e onde aparece mais, a gente identifica a principal fonte.",
              next: "a4"
            },
            {
              repDelta: -2, icon: "alerta",
              label: "Responder de forma dura, sem explicar o processo direito.",
              sub: "Pode gerar resistência e cortar o diálogo.",
              feedback: "A comunidade ficou insegura e menos aberta.",
              reply:
                "Isso acontece porque estão poluindo o igarapé.\n\nMas, para resolver de verdade, precisamos entender as fontes (óleo, esgoto, água de limpeza) e organizar ações simples para reduzir nutrientes e melhorar o oxigênio na água.",
              next: "a4"
            },
          ]
        },

        a4: {
          speaker: "Pesquisadora",
          text: "Se a gente quiser melhorar isso juntos, precisamos de ações simples e constantes. O que vocês acham mais viável começar ainda esta semana?",
          choices: [
            {
              repDelta: +3, icon: "check",
              label: "Propor ponto de coleta de óleo + campanha curta + oficina de sabão.",
              sub: "Ação concreta e comunitária.",
              feedback: "A ideia animou muita gente.",
              reply:
                "Minha sugestão é bem prática: combinar um ponto de coleta para o óleo usado e fazer uma campanha curta aqui no bairro.\n\nSe vocês toparem, a gente organiza uma oficina de sabão com segurança (EPI e cuidado com a soda), para transformar o óleo em algo útil e evitar que ele vá pro igarapé.",
              next: "a5"
            },
            {
              repDelta: +1, icon: "dialogo",
              label: "Começar com conversa nas casas e cartazes, sem cobrar muito no início.",
              sub: "Acolhe o ritmo da comunidade.",
              feedback: "Boa aceitação, com adesão gradual.",
              reply:
                "Acho ótimo começar leve: conversa nas casas, cartazes e combinados simples.\n\nO importante é todo mundo entender o porquê e ter uma alternativa fácil. Depois a gente fortalece com ponto de coleta e acompanhamento.",
              next: "a5"
            },
            {
              repDelta: -1, icon: "raio",
              label: "Dizer que a prefeitura é quem tem que resolver.",
              sub: "Terceiriza e reduz engajamento local.",
              feedback: "A conversa perdeu força.",
              reply:
                "A prefeitura tem responsabilidade, sim.\n\nMas enquanto isso, pequenas ações locais já reduzem muito o impacto: não jogar óleo na água, guardar em garrafa e combinar um ponto de entrega. Isso já muda o cenário.",
              next: "a5"
            },
          ]
        },

        a5: {
          speaker: "Moradores",
          text: "E como a gente vai saber se está melhorando? Só olhando a água?",
          choices: [
            {
              repDelta: +2, icon: "frasco",
              label: "Sugerir registro semanal + observações + testes simples quando possível.",
              sub: "Monitoramento básico e realista.",
              feedback: "O grupo gostou de acompanhar a evolução.",
              reply:
                "Dá para fazer um acompanhamento simples.\n\nUma vez por semana: foto do mesmo ponto, anotar cheiro, cor e presença de espuma. Se der, a gente inclui testes básicos com orientação. Assim vocês enxergam a melhora ao longo do tempo.",
              next: "a6"
            },
            {
              repDelta: 0, icon: "dialogo",
              label: "Dizer que dá para observar sinais, mas que é melhor registrar mudanças em conjunto.",
              sub: "Ok, mas sem método claro.",
              feedback: "Ficou mais claro, porém ainda genérico.",
              reply:
                "Observar ajuda, mas registrar junto ajuda mais.\n\nSe vocês toparem, a gente combina um ponto e um dia fixo para comparar: foto, anotações e conversa rápida. Isso dá um “termômetro” do igarapé.",
              next: "a6"
            },
            {
              repDelta: -2, icon: "alerta",
              label: "Dizer que é complicado demais e não tem como saber.",
              sub: "Desanima e encerra o assunto.",
              feedback: "O grupo desanimou.",
              reply:
                "É verdade que medir com precisão pode ser difícil.\n\nMas dá para acompanhar com sinais simples e registro. Se vocês quiserem, eu ajudo a organizar um jeito bem fácil de fazer isso sem atrapalhar a rotina.",
              next: "a6"
            },
          ]
        },

        /* ===== NOVO FINAL: GANCHO PARA OFICINA DE SABÃO ===== */
        a6: {
          speaker: "Moradores",
          text:
            "Professora… a gente quer fazer do jeito certo. Você consegue ajudar a gente a organizar a oficina de sabão com o óleo usado?",
          choices: [
            {
              repDelta: +3, icon: "check",
              label: "Sim. Vamos para a oficina agora e fazer com segurança.",
              sub: "Encaminhar direto para a cena da oficina.",
              feedback: "A comunidade topou participar da oficina.",
              reply:
                "Consigo, sim.\n\nVamos organizar direitinho: segurança primeiro (EPI), cuidado com a soda e passo a passo bem claro.\n\nSe vocês estiverem prontos, vamos para a oficina agora.",
              next: "goto:../cenaoficina/oficina.html"
            },
            {
              repDelta: +1, icon: "dialogo",
              label: "Sim, mas combinando um horário e separando os materiais primeiro.",
              sub: "Planejamento antes de executar.",
              feedback: "A comunidade aceitou combinar a organização.",
              reply:
                "Sim. A gente faz, mas com organização.\n\nPrimeiro: separar os materiais, combinar o local e garantir os EPIs. Depois a oficina fica segura e dá certo.\n\nQuando estiverem prontos, a gente segue para a oficina.",
              next: "aEnd"
            },
            {
              repDelta: -1, icon: "alerta",
              label: "Dizer que é melhor alguém experiente fazer (mas orientar o caminho).",
              sub: "Menos engajamento direto.",
              feedback: "O grupo ficou menos animado, mas entendeu o cuidado.",
              reply:
                "Eu entendo a vontade, mas com soda cáustica precisa ter muito cuidado.\n\nO ideal é fazer com alguém que siga segurança e orientação. Se vocês quiserem, eu ajudo a montar um roteiro de segurança e a checar os materiais antes de começar.",
              next: "aEnd"
            },
          ]
        },

        aEnd: {
          speaker: "Sistema",
          text: "A conversa terminou. A reputação influencia os próximos eventos da comunidade.",
          next: null
        }
      }
    }
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

    bubbleNpc: document.getElementById("bubbleNpc"),
    bubblePlayer: document.getElementById("bubblePlayer"),
    npcName: document.getElementById("npcName"),
    npcText: document.getElementById("npcText"),
    playerChoices: document.getElementById("playerChoices"),
    toast: document.getElementById("toast"),

    hs1: document.getElementById("hs-1"),
    hs2: document.getElementById("hs-2"),
  };

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

  function repLabel(rep) {
    return repMood(rep).label;
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
  // Agora ancorado na área útil da imagem (contain box)
  // =========================
  function applyContainLayout() {
    const b = getContainBox();
    if (!b) return;

    // NPC bubble
    if (el.bubbleNpc) {
      const npc = el.bubbleNpc;

      // zera estilos anteriores para evitar acumulo
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
        // Pesquisadora (topo, direita)
        npc.style.top = `${b.tm + b.h * 0.012}px`;
        npc.style.right = `${b.rm + b.w * 0.10}px`;
      } else {
        // Moradores (mais abaixo, esquerda)
        npc.style.top = `${b.tm + b.h * 0.105}px`;
        npc.style.left = `${b.lm + b.w * 0.06}px`;
      }
    }

    // Player choices
    if (el.bubblePlayer) {
      const p = el.bubblePlayer;

      // breakpoint simples (mantém “cheio” em telas pequenas)
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

    // Start button (sempre centralizado na área útil)
    if (el.btnStartTalk) {
      el.btnStartTalk.style.left = `${b.lm + b.w / 2}px`;
      el.btnStartTalk.style.bottom = `${b.bm + 18}px`;
      // mantém transform translateX(-50%) no CSS
    }

    // Toast (centralizado na área útil)
    if (el.toast) {
      el.toast.style.left = `${b.lm + b.w / 2}px`;
      el.toast.style.bottom = `${b.bm + b.h * 0.18}px`;
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

  // ===== Interpreta "next" especial: goto:arquivo.html
  function handleNext(nextToken) {
    if (!nextToken) {
      endConversation(true);
      return;
    }

    if (typeof nextToken === "string" && nextToken.startsWith("goto:")) {
      const url = nextToken.slice("goto:".length).trim();
      if (url) window.location.href = url;
      else endConversation(true);
      return;
    }

    // default: renderiza próximo nó na thread atual
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

  /* ===== Clique na resposta: mostra fala da Pesquisadora e só depois avança ===== */
  function onPickChoice(choice) {
    state.reputation = clamp(state.reputation + (choice.repDelta || 0), state.repMin, state.repMax);
    updateRepUI();
    showToast(choice.feedback);

    // mostra resposta da pesquisadora
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

    node.choices.forEach((choice) => {
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
    state.activeThread = "agua";
    state.reputation = 0;
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
      showToast(`Reputação final: ${repMood(state.reputation).emoji} ${repLabel(state.reputation)}`);
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
    updateRepUI();
    endConversation(false);
  });

  // Layout: recalcula quando imagem carregar + resize
  if (el.bg) {
    el.bg.addEventListener("load", scheduleLayout);
    if (el.bg.complete && el.bg.naturalWidth > 0) scheduleLayout();
  }
  window.addEventListener("resize", scheduleLayout);

  // roda uma primeira vez (mesmo antes de conversar)
  scheduleLayout();

})();
