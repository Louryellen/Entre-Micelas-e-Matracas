// ===== util =====
const $  = sel => document.querySelector(sel);

// ajusta a var --header-h conforme o header real
function fitHeader(){
  const h = document.querySelector('header')?.offsetHeight || 86;
  document.documentElement.style.setProperty('--header-h', h + 'px');
}
window.addEventListener('load', fitHeader);
window.addEventListener('resize', fitHeader);

// efeito máquina de escrever
export function typeInto(node, text, speed = 18, done){
  node.textContent = "";
  let i = 0;
  (function tick(){
    if(i <= text.length){
      node.textContent = text.slice(0, i++);
      setTimeout(tick, speed);
    } else {
      done && done();
    }
  })();
}

// ===== alterna ícone com a tecla G =====
(function(){
  let show = false;
  document.addEventListener('keydown', e => {
    if(e.key.toLowerCase() === 'g'){
      show = !show;

      const icon = document.getElementById('emailIcon');
      if(!icon) return;

      icon.classList.toggle('active', show);
    }
  });
})();

// ====================== CENA 0 ==========================
export function initCena0(){
  const hs    = $('#hs-email');
  const icon  = $('#emailIcon');
  const hint  = $('#hint');
  const mail  = $('#emailWin');
  const bg    = $('#bg');
  const video = $('#introVideo');

  if(!hs || !icon || !hint || !mail) return;

  // Hotspot
  Object.assign(hs.style, {
    position:'absolute',
    left:'59%',
    top:'57%',
    width:'6%',
    height:'9%'
  });

  // Ícone do e-mail
  Object.assign(icon.style, {
    position:'absolute',
    left:'59.5%',
    top:'54.25%',
    width:'60px',
    imageRendering:'pixelated'
  });

  const mailText =
    "Olá, pesquisadora. Recebemos relatos de espuma e cheiro de sabão às margens do igarapé. Precisamos de uma análise rápida. Você assume?";

  function openMail(){
    hint.style.display = 'none';
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const W = 520, H = 330;

    Object.assign(mail.style, {
      left:(vw - W)/2 + 460 + 'px',
      top:(vh - H)/2 - 60 + 'px',
      width:W+'px',
      height:H+'px',
      display:'flex',
      overflowY:'auto'
    });

    const mailNode = document.getElementById('mailText');
    typeInto(mailNode, mailText, 18);
  }

  function closeMail(){
    mail.style.display = 'none';
  }

  function goToLab(){
    // ajusta o caminho se cena1.html estiver em outra pasta
    window.location.href = 'cena1.html';
    console.log('Fim do vídeo — ir para Cena 1.');
  }

  function playIntroVideo(){
    if(bg) bg.style.display = 'none';
    hs.style.pointerEvents = 'none';

    if(!video){
      console.warn('Vídeo introIntro não encontrado');
      return;
    }

    video.style.display = 'block';
    video.currentTime = 0;
    video.play().catch(e => console.warn(e));

    video.addEventListener('ended', goToLab, { once:true });
  }

  hs.addEventListener('click', openMail);
  $('#closeMail').addEventListener('click', closeMail);

  $('#acceptCase').addEventListener('click', () => {
    closeMail();
    playIntroVideo();
  });

  $('#btnReiniciar')?.addEventListener('click', () => {
    hint.style.display = '';
    closeMail();
    icon.classList.remove('active');
    hs.style.pointerEvents = 'auto';
    if(bg) video.style.display = 'none';
  });
}

// ====================== CENA 1 ==========================

export function initCena1(){
  const hint         = $('#hint');
  const btnReiniciar = $('#btnReiniciar');

  const scene        = $('#scene');
  const bgLab        = $('#bg-lab');

  // hotspots principais
  const jaleco       = $('#hs-jaleco');
  const frascos      = $('#hs-frascos');
  const reagentes    = $('#hs-reagentes');
  const checklist    = $('#hs-checklist');

  // equipamentos
  const equipPranch  = $('#hs-equip-prancheta');
  const equipFrascos = $('#hs-equip-frascos');
  const equipMedidor = $('#hs-equip-medidor');
  const equipTermom  = $('#hs-equip-termometro');

  // NOVO: distrações
  const residuos     = $('#hs-residuos');
  const micro        = $('#hs-microondas');
  const cafe         = $('#hs-cafe');
  const plantas      = $('#hs-plantas');

  // popup de informação
  const backdrop    = $('#infoBackdrop');
  const popup       = $('#infoPopup');
  const infoTitle   = $('#infoTitle');
  const infoGeneral = $('#infoGeneral');
  const infoUse     = $('#infoUse');
  const btnClose    = $('#infoClose');

  const btnLevar    = $('#btnLevar');
  const btnNaoLevar = $('#btnNaoLevar');

  // overlay de resultado / ranking
  const overlayRes   = $('#resultadoOverlay');
  const resPont      = $('#resultadoPontuacao');
  const resRank      = $('#resultadoRanking');
  const trofeuIcon   = $('#trofeuIcon');
  const btnFecharRes = $('#btnFecharResultado');

  // container dos fogos
  const fogosContainer = $('#fogosContainer');

  if(!hint || !scene || !bgLab || !jaleco || !frascos || !reagentes || !checklist
     || !equipPranch || !equipFrascos || !equipMedidor || !equipTermom
     || !backdrop || !popup || !btnLevar || !btnNaoLevar
     || !residuos || !micro || !cafe || !plantas){
    console.warn('Cena 1: elemento faltando.');
    return;
  }

  const defaultHintText =
    '💡 Clique nos itens para conhecer cada material e montar o kit de análise.';
  hint.textContent = defaultHintText;

  // Configuração de pontos
  const PONTOS_POR_ITEM = 10;
  const META_PONTOS     = 60;   // meta mínima para "passar"
  let resultadoMostrado = false;

  // item atual aberto no popup
  let itemAtual = null;

  // loop dos fogos
  let fogosLoopId = null;

  // --- CONFIG: quais itens são necessários e quais são distrações ---
  const configItens = {
    // necessários (precisam ser LEVADOS)
    jaleco:         { tipo: 'necessario' },
    frascos:        { tipo: 'necessario' },
    reagentes:      { tipo: 'necessario' },
    checklist:      { tipo: 'necessario' },
    equipPrancheta: { tipo: 'necessario' },
    equipFrascos:   { tipo: 'necessario' },
    equipMedidor:   { tipo: 'necessario' },
    equipTermometro:{ tipo: 'necessario' },

    // distrações (não devem ser levadas)
    residuos:   { tipo: 'distracao' },
    microondas: { tipo: 'distracao' },
    cafe:       { tipo: 'distracao' },
    plantas:    { tipo: 'distracao' }
  };

  // --- Estado (acertos e erros) ---
  const estado  = {};
  const errados = {};
  Object.keys(configItens).forEach(k => {
    estado[k]  = false;  // decisão correta
    errados[k] = false;  // decisão errada
  });

  // mapa pra travar os hotspots
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
    plantas
  };

  function travarHotspot(chave){
    const el = hotspotsMap[chave];
    if (!el) return;
    el.style.pointerEvents = 'none';
  }

  // --- POPUP ---
  function openInfo({title, general, use, key}){
    // se o item já foi decidido (acerto ou erro), não abre de novo
    if (key && (estado[key] || errados[key])) return;

    itemAtual = key || null;

    infoTitle.textContent   = title;
    infoGeneral.textContent = general;
    infoUse.textContent     = use;
    backdrop.classList.add('visible');
  }

  function closeInfo(){
    backdrop.classList.remove('visible');
  }

  backdrop.addEventListener('click', e => {
    if(e.target === backdrop) closeInfo();
  });
  btnClose.addEventListener('click', closeInfo);
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape') closeInfo();
  });

  function atualizarHint(){
    const total     = Object.keys(estado).length;
    const acertos   = Object.values(estado).filter(v=>v).length;
    const erros     = Object.values(errados).filter(v=>v).length;
    const decididos = acertos + erros;
    const pontos    = acertos * PONTOS_POR_ITEM;

    if (decididos < total) {
      hint.textContent =
        `Itens decididos: ${decididos}/${total} — Pontos: ${pontos}.`;
    } else {
      hint.textContent =
        `Itens decididos: ${decididos}/${total} — Pontos finais: ${pontos}.`;
      mostrarResultado(pontos);
    }
  }

  function marcarAcerto(chave){
    if(!estado[chave]){
      estado[chave]  = true;
      errados[chave] = false;
      travarHotspot(chave);
      atualizarHint();
    }
  }

  function marcarErro(chave){
    if(!errados[chave] && !estado[chave]){
      errados[chave] = true;
      travarHotspot(chave);
      atualizarHint();
    }
  }

  // ========= FOGOS DE ARTIFÍCIO (quando rank Ouro) =========

  function dispararFogos(){
    if (!fogosContainer) return;

    const explosoes  = 10;
    const particulas = 24;

    for (let e = 0; e < explosoes; e++) {
      const centroX = 10 + Math.random() * 80; // 10% a 90% da tela
      const centroY = 15 + Math.random() * 50; // 15% a 65% da tela
      const atraso  = e * 120;                 // cada explosão um pouco depois

      setTimeout(() => {
        for (let i = 0; i < particulas; i++) {
          const p = document.createElement('div');
          p.className = 'firework';

          const angulo = (Math.PI * 2 * i) / particulas;
          const dist   = 90 + Math.random() * 90; // raio maior

          const dx = Math.cos(angulo) * dist;
          const dy = Math.sin(angulo) * dist;

          p.style.left = centroX + '%';
          p.style.top  = centroY + '%';
          p.style.setProperty('--dx', dx + 'px');
          p.style.setProperty('--dy', dy + 'px');

          const cores = ['#ffd54f', '#ff8a65', '#ce93d8', '#4fc3f7', '#a5d6a7'];
          p.style.backgroundColor =
            cores[Math.floor(Math.random() * cores.length)];

          fogosContainer.appendChild(p);

          p.addEventListener('animationend', () => {
            p.remove();
          });
        }
      }, atraso);
    }
  }

  function iniciarFogosLoop(){
    if (!fogosContainer) return;
    if (fogosLoopId !== null) return; // já está rodando

    dispararFogos(); // primeira rodada
    fogosLoopId = setInterval(dispararFogos, 2500); // repete
  }

  function pararFogosLoop(){
    if (fogosLoopId !== null) {
      clearInterval(fogosLoopId);
      fogosLoopId = null;
    }
    if (fogosContainer) {
      fogosContainer.innerHTML = '';
    }
  }

  // ========= RANKING + TROFÉU =========

  function mostrarResultado(pontos){
    if (!overlayRes || resultadoMostrado) return;
    resultadoMostrado = true;

    const total     = Object.keys(estado).length;
    const maxPontos = total * PONTOS_POR_ITEM;
    const perc      = pontos / maxPontos;

    let ranking;
    let texto;

    // limpa classes antigas do troféu
    trofeuIcon?.classList.remove('trofeu-ouro','trofeu-prata','trofeu-bronze');

    if (pontos >= META_PONTOS) {
      ranking = 'Ouro';
      texto   = 'Excelente! Você montou um kit muito completo para a investigação.';
      trofeuIcon?.classList.add('trofeu-ouro');
      iniciarFogosLoop(); // loop de fogos no Ouro
    } else if (perc >= 0.5) {
      ranking = 'Prata';
      texto   = 'Bom trabalho! Seu kit está razoável, mas ainda faltaram alguns itens importantes.';
      trofeuIcon?.classList.add('trofeu-prata');
    } else {
      ranking = 'Bronze';
      texto   = 'Você esqueceu vários itens essenciais. Que tal tentar novamente e melhorar o kit?';
      trofeuIcon?.classList.add('trofeu-bronze');
    }

    if (resPont) resPont.textContent = `Pontuação: ${pontos}/${maxPontos} pontos`;
    if (resRank) resRank.textContent = `Ranking: ${ranking}. ${texto}`;

    overlayRes.classList.add('visible');
  }

  btnFecharRes?.addEventListener('click', () => {
    overlayRes.classList.remove('visible');
    pararFogosLoop();
  });

  // ========= ALINHAMENTO AUTOMÁTICO DOS HOTSPOTS (com "media query") =========

  // até 1400px de largura considero "tela menor" (notebook)
  const mqSmall = window.matchMedia('(max-width: 1400px)');

  // mapa para MONITOR MAIOR (onde já está certo)
  const MAP_LARGE = {
    jaleco: {
      x: 0.210,
      y: 0.20,
      w: 0.094,
      h: 0.41
    },
    frascos: {
      x: 0.197,
      y: 0.63,
      w: 0.099,
      h: 0.15
    },
    reagentes: {
      x: 0.30,
      y: 0.74,
      w: 0.140,
      h: 0.16
    },
    checklist: {
      x: 0.46,
      y: 0.492,
      w: 0.102,
      h: 0.18
    },
    prancheta: {
      x: 0.462,
      y: 0.733,
      w: 0.058,
      h: 0.198
    },
    equipFrascos: {
      x: 0.55,
      y: 0.810,
      w: 0.019,
      h: 0.122
    },
    medidor: {
      x: 0.586,
      y: 0.8233,
      w: 0.085,
      h: 0.111
    },
    termometro: {
      x: 0.528,
      y: 0.765,
      w: 0.0119,
      h: 0.16
    },

    residuos: {
      x: 0.32,
      y: 0.12,
      w: 0.12,
      h: 0.13
    },
    microondas: {
      x: 0.37,
      y: 0.41,
      w: 0.081,
      h: 0.18
    },
    cafe: {
      x: 0.61,
      y: 0.57,
      w: 0.041,
      h: 0.12
    },
    plantas: {
      x: 0.68,
      y: 0.55,
      w: 0.09,
      h: 0.14
    }
  };

  // mapa para TELA MENOR (notebook) 
  const MAP_SMALL = {
    ...MAP_LARGE,
    jaleco: {
      x: 0.195,
      y: 0.21,
      w: 0.094,
      h: 0.41
    }
  };

  function getCurrentMap(){
    return mqSmall.matches ? MAP_SMALL : MAP_LARGE;
  }

  function applyHotspots(){
    const sceneRect = scene.getBoundingClientRect();
    const imgRect   = bgLab.getBoundingClientRect();
    const imgW = imgRect.width;
    const imgH = imgRect.height;

    const MAP = getCurrentMap(); // pega o mapa de acordo com o tamanho da tela

    function place(el, d){
      const pxLeft = (imgRect.left - sceneRect.left) + d.x * imgW;
      const pxTop  = (imgRect.top  - sceneRect.top)  + d.y * imgH;
      const pxW    = d.w * imgW;
      const pxH    = d.h * imgH;

      Object.assign(el.style, {
        position:'absolute',
        left: pxLeft + 'px',
        top:  pxTop  + 'px',
        width:pxW + 'px',
        height:pxH + 'px',
        zIndex:50
      });
    }

    place(jaleco,      MAP.jaleco);
    place(frascos,     MAP.frascos);
    place(reagentes,   MAP.reagentes);
    place(checklist,   MAP.checklist);

    place(equipPranch,  MAP.prancheta);
    place(equipFrascos, MAP.equipFrascos);
    place(equipMedidor, MAP.medidor);
    place(equipTermom,  MAP.termometro);

    place(residuos,   MAP.residuos);
    place(micro,      MAP.microondas);
    place(cafe,       MAP.cafe);
    place(plantas,    MAP.plantas);
  }

  if(bgLab.complete){
    applyHotspots();
  }else{
    bgLab.addEventListener('load', applyHotspots, { once:true });
  }
  window.addEventListener('resize', applyHotspots);
  mqSmall.addEventListener('change', applyHotspots);

  // ============== DECISÃO: LEVAR / NÃO LEVAR ==============

  btnLevar.addEventListener('click', () => {
    if (itemAtual) {
      const cfg = configItens[itemAtual];
      if (cfg?.tipo === 'distracao') {
        marcarErro(itemAtual);
      } else {
        marcarAcerto(itemAtual);
      }
    }
    itemAtual = null;
    closeInfo();
  });

  btnNaoLevar.addEventListener('click', () => {
    if (itemAtual) {
      const cfg = configItens[itemAtual];
      if (cfg?.tipo === 'distracao') {
        marcarAcerto(itemAtual);
      } else {
        marcarErro(itemAtual);
      }
    }
    itemAtual = null;
    closeInfo();
  });

  // ================= CLIQUES (com textos educativos) =================

  jaleco.addEventListener('click',()=>{
    openInfo({
      key:'jaleco',
      title:'Jaleco de laboratório',
      general:'É um EPI que protege o corpo contra respingos de reagentes, sujeira e contaminações.',
      use:'Na análise do igarapé, o jaleco evita contato direto com a água possivelmente contaminada e com os reagentes usados nos testes.'
    });
  });

  frascos.addEventListener('click',()=>{
    openInfo({
      key:'frascos',
      title:'Frascos de coleta',
      general:'Frascos limpos, de vidro ou plástico adequado, usados para armazenar amostras de água.',
      use:'No igarapé, vão guardar a água coletada em vários pontos, preservando as características físico-químicas até a análise no laboratório.'
    });
  });

  reagentes.addEventListener('click',()=>{
    openInfo({
      key:'reagentes',
      title:'Reagentes da análise',
      general:'Soluções químicas preparadas para reagir com substâncias presentes na água.',
      use:'Permitem determinar parâmetros como pH, alcalinidade, dureza ou demanda química de oxigênio, revelando contaminações ou alterações na qualidade da água.'
    });
  });

  checklist.addEventListener('click',()=>{
    openInfo({
      key:'checklist',
      title:'Notebook e checklist',
      general:'O notebook exibe uma lista com os materiais e passos necessários antes de sair para campo.',
      use:'Ajuda a verificar se EPIs, frascos, reagentes e equipamentos de campo foram separados corretamente antes de ir ao igarapé.'
    });
  });

  equipPranch.addEventListener('click',()=>{
    openInfo({
      key:'equipPrancheta',
      title:'Prancheta e ficha de campo',
      general:'Usada para registrar informações durante a coleta: data, hora, ponto de amostragem e observações visuais.',
      use:'Relaciona os resultados laboratoriais com o contexto de cada ponto do igarapé, o que é essencial para interpretar os dados.'
    });
  });

  equipFrascos.addEventListener('click',()=>{
    openInfo({
      key:'equipFrascos',
      title:'Frascos e recipientes de campo',
      general:'Recipientes menores que auxiliam na coleta, divisão e preservação das amostras diretamente no local.',
      use:'Permitem pegar a água no ponto exato desejado, fazer pré-divisões e adicionar conservantes quando necessário.'
    });
  });

  equipMedidor.addEventListener('click',()=>{
    openInfo({
      key:'equipMedidor',
      title:'Medidor portátil (pH/condutividade)',
      general:'Equipamento eletrônico usado para medições rápidas diretamente em campo.',
      use:'No igarapé, será usado para medir pH ou condutividade na hora da coleta, evitando mudanças que ocorreriam se a medição fosse feita apenas no laboratório.'
    });
  });

  equipTermom.addEventListener('click',()=>{
    openInfo({
      key:'equipTermometro',
      title:'Termômetro / copo de amostra',
      general:'Instrumentos usados para medir a temperatura da água e realizar pequenas leituras ou testes rápidos.',
      use:'A temperatura influencia a solubilidade de gases, a atividade biológica e a toxicidade de poluentes, sendo um parâmetro importante na avaliação do igarapé.'
    });
  });

  // NOVO: distrações (descrições mais neutras)

  residuos.addEventListener('click', () => {
    openInfo({
      key:'residuos',
      title:'Frascos com soluções e resíduos',
      general:'Conjunto de frascos que guardam soluções já utilizadas ou sobras de experimentos anteriores, organizados na bancada do laboratório.',
      use:'Fazem parte da rotina de registro e armazenamento temporário de materiais que já passaram por análise, enquanto outras atividades seguem acontecendo no laboratório.'
    });
  });

  micro.addEventListener('click', () => {
    openInfo({
      key:'microondas',
      title:'Forno de micro-ondas do laboratório',
      general:'Equipamento elétrico utilizado em alguns protocolos para aquecer soluções, vidrarias ou materiais, e que costuma ficar instalado em um ponto fixo do laboratório.',
      use:'É acionado em procedimentos específicos que acontecem ali mesmo na bancada ou em áreas internas do laboratório, integrado ao dia a dia das análises.'
    });
  });

  cafe.addEventListener('click', () => {
    openInfo({
      key:'cafe',
      title:'Caneca de café da pesquisadora',
      general:'Caneca pessoal que costuma acompanhar a pesquisadora nas pausas entre uma etapa e outra do trabalho experimental.',
      use:'Ajuda a manter o foco e o bem-estar durante o planejamento e a interpretação dos resultados, geralmente ficando próxima aos materiais de estudo no laboratório.'
    });
  });

  plantas.addEventListener('click', () => {
    openInfo({
      key:'plantas',
      title:'Plantas da bancada',
      general:'Vasos decorativos que deixam o ambiente de laboratório mais agradável, trazendo um pouco de verde para perto dos equipamentos.',
      use:'Contribuem para tornar a rotina científica mais acolhedora e humanizada, compondo o cenário em torno da área onde as análises são realizadas.'
    });
  });

  // reiniciar
  btnReiniciar?.addEventListener('click',()=>{
    Object.keys(estado).forEach(k=>estado[k]=false);
    Object.keys(errados).forEach(k=>errados[k]=false);
    Object.values(hotspotsMap).forEach(el=>{
      el.style.pointerEvents = 'auto';
    });
    itemAtual = null;
    resultadoMostrado = false;
    overlayRes?.classList.remove('visible');
    hint.textContent = defaultHintText;
    closeInfo();
    applyHotspots();
    pararFogosLoop();
  });
}
