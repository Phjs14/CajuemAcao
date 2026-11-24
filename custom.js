/* ============================================================
   T4 | Praça em Ação — Centro de Aracaju / SE
   Atividades personalizadas — MODELO DE DADOS (sem DOM).
   Carregado depois de data.js e ANTES de app.js.
   A fonte da verdade fica em S.custom (localStorage); este arquivo
   só valida/limpa os dados e os registra em DB (zonas, atividades,
   componentes e checklist), do mesmo jeito que as atividades padrão.
   ============================================================ */
const CUSTOM = {
  MAX_ATIVIDADES: 6,      // máximo de atividades criadas pelo usuário
  MAX_POR_ZONA: 3,        // máximo de pinos por zona na maquete (padrão + criadas)
  MAX_COMPONENTES: 6,     // componentes físicos por atividade
  PRIMEIRO_NUMERO: 4,     // A1–A3 são as atividades padrão
  CORES: ["#a8362a", "#1f7a4d", "#1a5f82", "#7a5200"],   // contorno do pino na maquete
  TINTS: ["c0", "c1", "c2", "c3"],                         // cor do cartão (classes t-c0…t-c3)
  ORIGENS: [
    "Reuso — doação",
    "Reuso — caixas e papelão",
    "Reuso parcial — retalhos",
    "Empréstimo (confirmar com o responsável)",
    "Papelão + impressão",
    "Novo (fictício)"
  ],
  EMOJIS: ["🎵", "🧩", "🌱", "🎭", "⚽", "🎲", "🧵", "🍉", "📖", "🎨", "🥁", "🧺"]
};

/* ---------- Limpeza de texto (impede HTML injetado e exageros) ---------- */
function cleanText(v, max){
  return String(v == null ? "" : v).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}
/* Mantém só o primeiro "caractere visual" (emoji) e remove símbolos perigosos */
function cleanIcon(v){
  const s = String(v == null ? "" : v).replace(/[<>&"'`\s]/g, "");
  if(!s) return "✨";
  if(typeof Intl !== "undefined" && Intl.Segmenter){
    const seg = Array.from(new Intl.Segmenter("pt", {granularity: "grapheme"}).segment(s));
    return seg.length ? seg[0].segment : "✨";
  }
  return Array.from(s).slice(0, 2).join("");
}
function cleanNum(v, min, max, dflt, int){
  let n = Number(String(v == null ? "" : v).replace(",", "."));
  if(!isFinite(n)) n = dflt;
  n = Math.min(max, Math.max(min, n));
  return int ? Math.round(n) : Math.round(n * 100) / 100;
}

/* ---------- Valida uma definição vinda do formulário ou do localStorage ---------- */
function sanitizeCustomDef(raw){
  if(!raw || typeof raw !== "object") return null;
  const num = parseInt(String(raw.id || "").replace(/^A/, ""), 10);
  if(!(num >= CUSTOM.PRIMEIRO_NUMERO)) return null;
  const zona = ["Z1", "Z2", "Z3"].indexOf(raw.zona_id) >= 0 ? raw.zona_id : null;
  if(!zona) return null;
  const nome = cleanText(raw.nome, 40);
  if(!nome) return null;
  const comps = (Array.isArray(raw.componentes) ? raw.componentes : []).slice(0, CUSTOM.MAX_COMPONENTES).map(c => ({
    nome: cleanText(c && c.nome, 50),
    quantidade: cleanNum(c && c.quantidade, 1, 99, 1, true),
    custo: cleanNum(c && c.custo, 0, 100, 0, false),
    origem: cleanText(c && c.origem, 60) || "Novo (fictício)"
  })).filter(c => c.nome);
  if(!comps.length) return null;
  return {
    id: "A" + num,
    nome: nome,
    icone: cleanIcon(raw.icone),
    descricao: cleanText(raw.descricao, 160),
    zona_id: zona,
    duracao_min: cleanNum(raw.duracao_min, 5, 240, 30, true),
    requisito_acessibilidade: cleanText(raw.requisito_acessibilidade, 160) || "A definir com a equipe.",
    componentes: comps
  };
}

/* ---------- Quantas atividades já ocupam uma zona ---------- */
function zoneCount(zonaId, exceptId){
  return DB.atividades.filter(a => a.zona_id === zonaId && a.id !== exceptId).length;
}

/* ---------- Registra / remove em DB ---------- */
function unregisterCustom(id){
  DB.atividades = DB.atividades.filter(a => a.id !== id);
  DB.componentes = DB.componentes.filter(c => c.atividade_id !== id);
  DB.checklist = DB.checklist.filter(c => c.atividade_id !== id);
}
function registerCustom(def){
  unregisterCustom(def.id);
  const num = parseInt(def.id.slice(1), 10);
  const idx = (num - CUSTOM.PRIMEIRO_NUMERO) % CUSTOM.CORES.length;
  const cids = def.componentes.map((c, i) => "C" + num + "-" + (i + 1));   // ex.: C4-1
  def.componentes.forEach((c, i) => DB.componentes.push({
    id: cids[i], atividade_id: def.id, nome: c.nome, quantidade: c.quantidade,
    custo_estimado_didatico: c.custo, origem_reuso: c.origem, personalizada: true
  }));
  DB.atividades.push({
    id: def.id, nome: def.nome, icone: def.icone, cor: CUSTOM.CORES[idx], tint: CUSTOM.TINTS[idx],
    zona_id: def.zona_id, descricao: def.descricao || "Atividade criada pela equipe.",
    duracao_min: def.duracao_min, componente_ids: cids,
    requisito_acessibilidade: def.requisito_acessibilidade, personalizada: true
  });
  DB.checklistModelo.forEach(m => DB.checklist.push({
    id: def.id + "-" + m.cod, atividade_id: def.id, categoria: m.categoria, item: m.item,
    status: "a confirmar", observacao: "", personalizada: true
  }));
}
