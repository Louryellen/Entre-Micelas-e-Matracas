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
    console.log('Fim do vídeo — ir para Cena 1 depois.');
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
    if(bg) bg.style.display = 'block';
    if(video) video.style.display = 'none';
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

  // popup
  const backdrop = $('#infoBackdrop');
  const popup    = $('#infoPopup');
  const infoTitle   = $('#infoTitle');
  const infoGeneral = $('#infoGeneral');
  const infoUse     = $('#infoUse');
  const btnClose    = $('#infoClose');

  if(!hint || !scene || !bgLab || !jaleco || !frascos || !reagentes || !checklist
     || !equipPranch || !equipFrascos || !equipMedidor || !equipTermom
     || !backdrop || !popup){
    console.warn('Cena 1: elemento faltando.');
    return;
  }

  const defaultHintText =
    '💡 Clique nos itens para conhecer cada material e montar o kit de análise.';
  hint.textContent = defaultHintText;

  // --- POPUP ---
  function openInfo({title, general, use}){
    infoTitle.textContent   = title;
    infoGeneral.textContent = general;
    infoUse.textContent     = use;
    backdrop.classList.add('visible');
  }
  function closeInfo(){
    backdrop.classList.remove('visible');
  }
  backdrop.addEventListener('click', e => { if(e.target === backdrop) closeInfo(); });
  btnClose.addEventListener('click', closeInfo);
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeInfo(); });

  // --- Estado ---
  const estado = {
    jaleco:false,
    frascos:false,
    reagentes:false,
    checklist:false,
    equipPrancheta:false,
    equipFrascos:false,
    equipMedidor:false,
    equipTermometro:false
  };

  function atualizarHint(){
    const total = Object.keys(estado).length;
    const pegos = Object.values(estado).filter(v=>v).length;
    hint.textContent = `Itens coletados: ${pegos}/${total}. Clique nos itens para ver mais detalhes.`;
  }

  function marcar(chave){
    if(!estado[chave]){
      estado[chave] = true;
      atualizarHint();
    }
  }

  // ========= ALINHAMENTO AUTOMÁTICO DOS HOTSPOTS =========
  // Coordenadas em FRAÇÃO da largura/altura da imagem (0 a 1)
  // Ajustadas "no olho" com base no print
  const MAP = {
  // ---- Jaleco (OK) ----
  jaleco: { 
    x: 0.191, 
    y: 0.20, 
    w: 0.094, 
    h: 0.41 
}
,

  // ---- Frascos da mesa da esquerda ----
  frascos: { 
    x: 0.191, 
    y: 0.63, 
    w: 0.094, 
    h: 0.15
  },

  // ---- Reagentes (garrafas água + frasco branco na bancada do meio) ----
  reagentes: { 
    x: 0.29, 
    y: 0.74, 
    w: 0.140, 
    h: 0.16 
  },

  // ---- Notebook com Checklist ----
  checklist: { 
    x: 0.45, 
    y: 0.492, 
    w: 0.120, 
    h: 0.188 
  },

  // ----------------------------------------------------
  //         E Q U I P A M E N T O S   D E   C A M P O
  // ----------------------------------------------------

  // Prancheta (lado esquerdo da bandeja)
  prancheta: { 
    x: 0.462, 
    y: 0.733, 
    w: 0.058, 
    h: 0.198 
  },

  // Frascos pequenos dentro da bandeja (centro)
  equipFrascos: { 
    x: 0.55, 
    y: 0.810, 
    w: 0.019, 
    h: 0.122
  },

  // Medidor (objeto mais alto à direita)
  medidor: { 
    x: 0.586, 
    y: 0.8233, 
    w: 0.085, 
    h: 0.111 
  },

  // Termômetro/copinho (parte frontal direita)
  termometro: { 
     x: 0.528, 
    y: 0.765, 
    w: 0.0119, 
    h: 0.16
  }
};


  function applyHotspots(){
    const sceneRect = scene.getBoundingClientRect();
    const imgRect   = bgLab.getBoundingClientRect();

    const imgW = imgRect.width;
    const imgH = imgRect.height;

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
  }

  // aplica quando a imagem carregar e quando a janela mudar
  if(bgLab.complete){
    applyHotspots();
  }else{
    bgLab.addEventListener('load', applyHotspots, { once:true });
  }
  window.addEventListener('resize', applyHotspots);

  // ================= CLIQUES (com textos educativos) =================

  jaleco.addEventListener('click',()=>{
    marcar('jaleco');
    openInfo({
      title:'Jaleco de laboratório',
      general:'É um EPI que protege o corpo contra respingos de reagentes, sujeira e contaminações.',
      use:'Na análise do igarapé, o jaleco evita contato direto com a água possivelmente contaminada e com os reagentes usados nos testes.'
    });
  });

  frascos.addEventListener('click',()=>{
    marcar('frascos');
    openInfo({
      title:'Frascos de coleta',
      general:'Frascos limpos, de vidro ou plástico adequado, usados para armazenar amostras de água.',
      use:'No igarapé, vão guardar a água coletada em vários pontos, preservando as características físico-químicas até a análise no laboratório.'
    });
  });

  reagentes.addEventListener('click',()=>{
    marcar('reagentes');
    openInfo({
      title:'Reagentes da análise',
      general:'Soluções químicas preparadas para reagir com substâncias presentes na água.',
      use:'Permitem determinar parâmetros como pH, alcalinidade, dureza ou demanda química de oxigênio, revelando contaminações ou alterações na qualidade da água.'
    });
  });

  checklist.addEventListener('click',()=>{
    marcar('checklist');
    openInfo({
      title:'Notebook e checklist',
      general:'O notebook exibe uma lista com os materiais e passos necessários antes de sair para campo.',
      use:'Ajuda a verificar se EPIs, frascos, reagentes e equipamentos de campo foram separados corretamente antes de ir ao igarapé.'
    });
  });

  equipPranch.addEventListener('click',()=>{
    marcar('equipPrancheta');
    openInfo({
      title:'Prancheta e ficha de campo',
      general:'Usada para registrar informações durante a coleta: data, hora, ponto de amostragem e observações visuais.',
      use:'Relaciona os resultados laboratoriais com o contexto de cada ponto do igarapé, o que é essencial para interpretar os dados.'
    });
  });

  equipFrascos.addEventListener('click',()=>{
    marcar('equipFrascos');
    openInfo({
      title:'Frascos e recipientes de campo',
      general:'Recipientes menores que auxiliam na coleta, divisão e preservação das amostras diretamente no local.',
      use:'Permitem pegar a água no ponto exato desejado, fazer pré-divisões e adicionar conservantes quando necessário.'
    });
  });

  equipMedidor.addEventListener('click',()=>{
    marcar('equipMedidor');
    openInfo({
      title:'Medidor portátil (pH/condutividade)',
      general:'Equipamento eletrônico usado para medições rápidas diretamente em campo.',
      use:'No igarapé, será usado para medir pH ou condutividade na hora da coleta, evitando mudanças que ocorreriam se a medição fosse feita apenas no laboratório.'
    });
  });

  equipTermom.addEventListener('click',()=>{
    marcar('equipTermometro');
    openInfo({
      title:'Termômetro / copo de amostra',
      general:'Instrumentos usados para medir a temperatura da água e realizar pequenas leituras ou testes rápidos.',
      use:'A temperatura influencia a solubilidade de gases, a atividade biológica e a toxicidade de poluentes, sendo um parâmetro importante na avaliação do igarapé.'
    });
  });

  // reiniciar
  btnReiniciar?.addEventListener('click',()=>{
    Object.keys(estado).forEach(k=>estado[k]=false);
    hint.textContent = defaultHintText;
    closeInfo();
    applyHotspots();
  });
}
