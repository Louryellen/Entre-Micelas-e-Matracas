/* relatorio_final.js
   Cena 9 — Relatório Final (Igarapé)
   Mecânica: marcação (radio/checkbox) + parecer curto por etapa + finais ramificados
*/

(() => {
  "use strict";

  // =========================
  // CONFIG DE INTEGRAÇÃO
  // =========================
  const END_URL = "fim.html"; // troque para sua cena de encerramento/créditos
  const STORAGE_KEY = "emm_relatorio_igarape_v2";

  // =========================
  // Helpers
  // =========================
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function nowBR() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  }

  function setHint(text) { $("hint").textContent = text; }

  function getCheckedValue(formEl, name) {
    const input = formEl.querySelector(`input[name="${name}"]:checked`);
    return input ? input.value : null;
  }

  function getCheckedValues(formEl, name) {
    return Array.from(formEl.querySelectorAll(`input[name="${name}"]:checked`)).map(i => i.value);
  }

  function normalizeText(s) {
    // Mantém texto como texto puro; remove espaços extras.
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  // =========================
  // Elementos
  // =========================
  const btnReiniciar = $("btnReiniciar");
  const btnAjuda = $("btnAjuda");

  const chipStep = $("chipStep");
  const chipProgress = $("chipProgress");
  const chipScore = $("chipScore");
  const progressFill = $("progressFill");
  const panelSub = $("panelSub");

  const step1 = $("step1");
  const step2 = $("step2");
  const step3 = $("step3");
  const step4 = $("step4");

  const txtCause = $("txtCause");
  const txtRisk  = $("txtRisk");
  const txtReco  = $("txtReco");
  const txtGuid  = $("txtGuid");

  const countCause = $("countCause");
  const countRisk  = $("countRisk");
  const countReco  = $("countReco");
  const countGuid  = $("countGuid");

  const helpModal = $("helpModal");
  const btnCloseHelp = $("btnCloseHelp");
  const btnOkHelp = $("btnOkHelp");

  const resultModal = $("resultModal");
  const btnCloseResult = $("btnCloseResult");
  const btnCopy = $("btnCopy");
  const btnPrint = $("btnPrint");
  const btnFinishGame = $("btnFinishGame");

  const resultTitle = $("resultTitle");
  const resultSub = $("resultSub");
  const resultBadge = $("resultBadge");
  const kpiScore = $("kpiScore");
  const kpiConsistency = $("kpiConsistency");
  const endingText = $("endingText");

  const reportText = $("reportText");
  const paperMeta = $("paperMeta");

  // Botões navegação
  const btnNext1 = $("btnNext1");
  const btnNext2 = $("btnNext2");
  const btnNext3 = $("btnNext3");
  const btnFinish = $("btnFinish");

  const btnBack2 = $("btnBack2");
  const btnBack3 = $("btnBack3");
  const btnBack4 = $("btnBack4");

  // =========================
  // Validação (parecer mínimo)
  // =========================
  const MIN = {
    cause: 90,
    risk: 80,
    reco: 100,
    guid: 120
  };

  function requireMinText(text, minChars, msg) {
    const t = normalizeText(text);
    if (t.length < minChars) {
      setHint(msg);
      return null;
    }
    return t;
  }

  function enforceMaxTwoRecommendations(vals) {
    if (vals.length > 2) return vals.slice(0, 2);
    return vals;
  }

  // =========================
  // Estado
  // =========================
  const state = {
    step: 1,
    score: 0,
    criticalMistakes: 0,
    answers: {
      cause: null,      // A/B/C/D
      risk: null,       // A/B/C/D
      reco: [],         // até 2 (A/B/C/D)
      guid: null        // A/B/C/D
    },
    notes: {
      cause: "",
      risk: "",
      reco: "",
      guid: ""
    }
  };

  // =========================
  // Rubrica (ajuste livre)
  // =========================
  // Ideia: escolhas consistentes somam pontos; decisões inseguras aumentam "erros críticos".
  // Recomendações agora aceitam 2 seleções; pontuação soma as duas.
  const RUBRIC = {
    cause: {
      A: { points: 30, critical: 0, label: "Carga orgânica elevada por descarte de resíduos e óleo no entorno do igarapé" },
      B: { points: 10, critical: 0, label: "Variação natural (chuvas/estiagem) como principal explicação" },
      C: { points: 5,  critical: 0, label: "Contaminação por substância específica sem evidências suficientes" },
      D: { points: 0,  critical: 1, label: "Alteração apenas visual, sem impacto na qualidade da água" }
    },
    risk: {
      A: { points: 25, critical: 0, label: "Alto" },
      B: { points: 15, critical: 0, label: "Moderado" },
      C: { points: 5,  critical: 0, label: "Baixo" },
      D: { points: 0,  critical: 1, label: "Nenhum" }
    },
    reco: {
      A: { points: 15, critical: 0, label: "Pontos de coleta de óleo + mobilização + limpeza monitorada do entorno" },
      B: { points: 12, critical: 0, label: "Monitoramento periódico + registro + encaminhamento para análise quando necessário" },
      C: { points: 0,  critical: 2, label: "Aplicar produtos químicos diretamente no igarapé para neutralizar" },
      D: { points: 4,  critical: 0, label: "Somente fiscalização punitiva, sem alternativa/educação" }
    },
    guid: {
      A: { points: 20, critical: 0, label: "Não descarte óleo no ralo; armazene e entregue em ponto de coleta" },
      B: { points: 0,  critical: 2, label: "Usar químicos fortes e despejar no esgoto para limpar" },
      C: { points: 5,  critical: 0, label: "Responsabilidade exclusiva do poder público; não mudar hábitos" },
      D: { points: 0,  critical: 1, label: "Se parecer normal, pode usar sem cuidados" }
    }
  };

  // Bônus por completar parecer com mínimo (incentiva escrever sem “julgar conteúdo”).
  const BONUS_FOR_TEXT = 3; // por etapa validada

  // =========================
  // UI: contadores
  // =========================
  function bindCounter(textarea, counterEl, max) {
    const update = () => {
      const n = textarea.value.length;
      counterEl.textContent = `${n}/${max}`;
    };
    textarea.addEventListener("input", update);
    update();
  }

  bindCounter(txtCause, countCause, 240);
  bindCounter(txtRisk,  countRisk,  240);
  bindCounter(txtReco,  countReco,  260);
  bindCounter(txtGuid,  countGuid,  280);

  // =========================
  // UI: passos
  // =========================
  function setActiveStep(step) {
    state.step = clamp(step, 1, 4);

    [step1, step2, step3, step4].forEach(el => el.classList.remove("active"));
    $(`step${state.step}`).classList.add("active");

    const pct = Math.round(((state.step - 1) / 4) * 100);
    chipStep.textContent = `${state.step}/4`;
    chipProgress.textContent = `${pct}%`;
    progressFill.style.width = `${pct}%`;

    const subByStep = {
      1: "Etapa 1: indique a causa provável e registre as evidências que sustentam sua análise.",
      2: "Etapa 2: classifique o risco e justifique o impacto para comunidade e ambiente.",
      3: "Etapa 3: selecione até 2 recomendações e descreva um plano de ação curto e executável.",
      4: "Etapa 4: defina a orientação principal e escreva a mensagem final para a comunidade."
    };
    panelSub.textContent = subByStep[state.step] || "";

    const hintByStep = {
      1: "Dica: cite sinais do igarapé (odor, filme superficial, espuma, descarte, impacto no uso comunitário).",
      2: "Dica: considere exposição humana, persistência e potencial de agravamento.",
      3: "Dica: priorize ações viáveis e seguras; evite intervenções químicas diretas sem plano técnico.",
      4: "Dica: a mensagem final deve ser clara, acionável e responsável."
    };
    setHint(hintByStep[state.step] || "");
  }

  function updateScoreUI() { chipScore.textContent = String(state.score); }

  // =========================
  // Pontuação
  // =========================
  function applyAnswerSingle(key, value) {
    state.answers[key] = value;
    const rule = RUBRIC[key][value];
    state.score = clamp(state.score + rule.points, 0, 100);
    state.criticalMistakes += rule.critical;
  }

  function applyAnswerReco(values) {
    state.answers.reco = values;

    let sum = 0;
    let crit = 0;

    values.forEach(v => {
      const rule = RUBRIC.reco[v];
      sum += rule.points;
      crit += rule.critical;
    });

    state.score = clamp(state.score + sum, 0, 100);
    state.criticalMistakes += crit;
  }

  function applyTextBonus() {
    state.score = clamp(state.score + BONUS_FOR_TEXT, 0, 100);
  }

  // =========================
  // Desfecho
  // =========================
  function computeEnding() {
    const s = state.score;
    const c = state.criticalMistakes;

    // Ajuste conforme seu tom:
    if (s >= 78 && c === 0) return "BOM";
    if (s >= 55 && c <= 2) return "MÉDIO";
    return "RUIM";
  }

  function consistencyLabel(ending) {
    if (ending === "BOM") return "Alta";
    if (ending === "MÉDIO") return "Média";
    return "Baixa";
  }

  function buildEndingNarrative(ending) {
    if (ending === "BOM") {
      return "O relatório foi consistente com as evidências do igarapé e propôs medidas seguras e executáveis. A comunidade recebe orientação clara e as ações priorizam prevenção, mitigação e monitoramento contínuo.";
    }
    if (ending === "MÉDIO") {
      return "O relatório apresenta boa intenção e parte das decisões é adequada, mas há lacunas que podem reduzir a efetividade. Com ajustes nas recomendações e reforço da comunicação comunitária, a resposta pode se tornar mais robusta.";
    }
    return "O relatório apresenta inconsistências e/ou decisões de risco. Isso compromete a resposta ao problema do igarapé e pode agravar impactos. É necessário reavaliar diagnóstico, priorizar segurança e buscar suporte técnico antes de intervenções.";
  }

  function buildReportText(ending) {
    const a = state.answers;

    const cause = a.cause ? RUBRIC.cause[a.cause].label : "—";
    const risk  = a.risk  ? RUBRIC.risk[a.risk].label  : "—";
    const guid  = a.guid  ? RUBRIC.guid[a.guid].label  : "—";

    const recoLabels = (a.reco || []).map(v => `- ${RUBRIC.reco[v].label}`).join("\n") || "- —";

    const blocoConclusao = (() => {
      if (ending === "BOM") {
        return [
          "Conclusão técnica:",
          "- As decisões são compatíveis com um cenário de degradação do igarapé por ação antrópica e priorizam prevenção e mitigação.",
          "- Recomenda-se manter monitoramento, registro de indicadores e retorno periódico à comunidade com orientações atualizadas."
        ].join("\n");
      }
      if (ending === "MÉDIO") {
        return [
          "Conclusão técnica:",
          "- As decisões apontam caminhos úteis, porém com pontos a fortalecer na consistência e no plano de ação.",
          "- Recomenda-se revisar prioridades, evitar medidas de baixa efetividade e tornar o cronograma de monitoramento mais explícito."
        ].join("\n");
      }
      return [
        "Conclusão técnica:",
        "- O relatório contém escolhas e orientações com risco ou baixa aderência às evidências do igarapé.",
        "- Recomenda-se reavaliar o diagnóstico, suspender intervenções potencialmente danosas e procurar apoio técnico para encaminhamento adequado."
      ].join("\n");
    })();

    return [
      "RELATÓRIO FINAL — IGARAPÉ",
      "",
      "1) Causa provável (marcação)",
      `- ${cause}`,
      "",
      "1.1) Parecer técnico do investigador (texto)",
      `- ${state.notes.cause || "—"}`,
      "",
      "2) Nível de risco (marcação)",
      `- ${risk}`,
      "",
      "2.1) Justificativa do risco (texto)",
      `- ${state.notes.risk || "—"}`,
      "",
      "3) Recomendações prioritárias (marcação — até 2)",
      recoLabels,
      "",
      "3.1) Plano de ação (texto)",
      `- ${state.notes.reco || "—"}`,
      "",
      "4) Orientação principal para a comunidade (marcação)",
      `- ${guid}`,
      "",
      "4.1) Parecer final para circulação comunitária (texto)",
      `- ${state.notes.guid || "—"}`,
      "",
      `Desfecho: ${ending}`,
      "",
      blocoConclusao
    ].join("\n");
  }

  function openResult() {
    const ending = computeEnding();
    const report = buildReportText(ending);
    const narrative = buildEndingNarrative(ending);

    resultTitle.textContent = `Final ${ending}`;
    resultSub.textContent = "Relatório consolidado com base nas marcações e nos pareceres.";
    resultBadge.textContent = `FINAL ${ending}`;

    kpiScore.textContent = String(state.score);
    kpiConsistency.textContent = consistencyLabel(ending);
    endingText.textContent = narrative;

    paperMeta.textContent = `Data: ${nowBR()} • Pontuação: ${state.score} • Erros críticos: ${state.criticalMistakes}`;
    reportText.textContent = report;

    const payload = {
      endedAt: new Date().toISOString(),
      score: state.score,
      criticalMistakes: state.criticalMistakes,
      ending,
      answers: state.answers,
      notes: state.notes,
      report
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    resultModal.showModal();
  }

  // =========================
  // Regras de validação por etapa
  // =========================
  function validateStep1() {
    const v = getCheckedValue(step1, "cause");
    if (!v) {
      setHint("Selecione uma causa provável antes de avançar.");
      return null;
    }
    const note = requireMinText(
      txtCause.value,
      MIN.cause,
      `Escreva um parecer mais completo (mín. ${MIN.cause} caracteres) com evidências do igarapé.`
    );
    if (!note) return null;

    return { v, note };
  }

  function validateStep2() {
    const v = getCheckedValue(step2, "risk");
    if (!v) {
      setHint("Selecione o nível de risco antes de avançar.");
      return null;
    }
    const note = requireMinText(
      txtRisk.value,
      MIN.risk,
      `Escreva uma justificativa mais completa (mín. ${MIN.risk} caracteres) para o risco.`
    );
    if (!note) return null;

    return { v, note };
  }

  function validateStep3() {
    const valsRaw = getCheckedValues(step3, "reco");
    if (valsRaw.length === 0) {
      setHint("Selecione pelo menos 1 recomendação.");
      return null;
    }
    const vals = enforceMaxTwoRecommendations(valsRaw);

    // Se marcou mais de 2, desmarca automaticamente as extras (mantém as 2 primeiras)
    if (valsRaw.length > 2) {
      const allowed = new Set(vals);
      Array.from(step3.querySelectorAll('input[name="reco"]')).forEach(i => {
        if (!allowed.has(i.value)) i.checked = false;
      });
      setHint("Você pode selecionar no máximo 2 recomendações. Mantive as 2 primeiras marcadas.");
    }

    const note = requireMinText(
      txtReco.value,
      MIN.reco,
      `Descreva um plano de ação mais completo (mín. ${MIN.reco} caracteres).`
    );
    if (!note) return null;

    return { vals, note };
  }

  function validateStep4() {
    const v = getCheckedValue(step4, "guid");
    if (!v) {
      setHint("Selecione a orientação principal antes de finalizar.");
      return null;
    }
    const note = requireMinText(
      txtGuid.value,
      MIN.guid,
      `Escreva uma mensagem final mais completa (mín. ${MIN.guid} caracteres) para a comunidade.`
    );
    if (!note) return null;

    return { v, note };
  }

  // =========================
  // Navegação
  // =========================
  btnNext1.addEventListener("click", () => {
    const ok = validateStep1();
    if (!ok) return;

    // aplica só uma vez
    if (!state.answers.cause) {
      applyAnswerSingle("cause", ok.v);
      state.notes.cause = ok.note;
      applyTextBonus();
      updateScoreUI();
    }
    setActiveStep(2);
  });

  btnBack2.addEventListener("click", () => setActiveStep(1));
  btnNext2.addEventListener("click", () => {
    const ok = validateStep2();
    if (!ok) return;

    if (!state.answers.risk) {
      applyAnswerSingle("risk", ok.v);
      state.notes.risk = ok.note;
      applyTextBonus();
      updateScoreUI();
    }
    setActiveStep(3);
  });

  btnBack3.addEventListener("click", () => setActiveStep(2));
  btnNext3.addEventListener("click", () => {
    const ok = validateStep3();
    if (!ok) return;

    if (state.answers.reco.length === 0) {
      applyAnswerReco(ok.vals);
      state.notes.reco = ok.note;
      applyTextBonus();
      updateScoreUI();
    }
    setActiveStep(4);
  });

  btnBack4.addEventListener("click", () => setActiveStep(3));
  btnFinish.addEventListener("click", () => {
    const ok = validateStep4();
    if (!ok) return;

    if (!state.answers.guid) {
      applyAnswerSingle("guid", ok.v);
      state.notes.guid = ok.note;
      applyTextBonus();
      updateScoreUI();
    }

    chipProgress.textContent = "100%";
    progressFill.style.width = "100%";

    openResult();
  });

  // =========================
  // Ajuda / Modais
  // =========================
  btnAjuda.addEventListener("click", () => helpModal.showModal());
  btnCloseHelp.addEventListener("click", () => helpModal.close());
  btnOkHelp.addEventListener("click", () => helpModal.close());

  btnCloseResult.addEventListener("click", () => resultModal.close());

  btnCopy.addEventListener("click", async () => {
    try {
      const text = reportText.textContent || "";
      await navigator.clipboard.writeText(text);
      setHint("Relatório copiado para a área de transferência.");
    } catch {
      setHint("Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.");
    }
  });

  btnPrint.addEventListener("click", () => window.print());

  btnFinishGame.addEventListener("click", () => {
    if (END_URL && END_URL.trim()) {
      window.location.href = END_URL;
      return;
    }
    resultModal.close();
    setHint("Jogo encerrado. Você pode reiniciar para testar outro desfecho.");
  });

  // =========================
  // Reiniciar
  // =========================
  function hardReset() {
    localStorage.removeItem(STORAGE_KEY);

    state.step = 1;
    state.score = 0;
    state.criticalMistakes = 0;
    state.answers = { cause: null, risk: null, reco: [], guid: null };
    state.notes = { cause: "", risk: "", reco: "", guid: "" };

    document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(i => (i.checked = false));
    [txtCause, txtRisk, txtReco, txtGuid].forEach(t => (t.value = ""));

    // atualiza contadores
    countCause.textContent = "0/240";
    countRisk.textContent = "0/240";
    countReco.textContent = "0/260";
    countGuid.textContent = "0/280";

    updateScoreUI();
    setActiveStep(1);
    chipProgress.textContent = "0%";
    progressFill.style.width = "0%";

    setHint("Monte o relatório técnico do igarapé. Marque decisões e escreva pareceres curtos para justificar.");
  }

  btnReiniciar.addEventListener("click", hardReset);

  // =========================
  // Boot
  // =========================
  function boot() {
    updateScoreUI();
    setActiveStep(1);
  }

  boot();
})();
