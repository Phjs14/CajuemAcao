/* ============================================================
   T4 | Praça em Ação — Centro de Aracaju / SE
   Tela "Criar atividade" (criar, editar e excluir atividades
   personalizadas). Carregado DEPOIS de app.js: usa S, DB, $, esc,
   brl, toast, persist, renderAll, renderDados, defaultDraft e
   obsHasPII de app.js, e as funções de custom.js.
   ============================================================ */
let cfEditing = null;   // id da atividade personalizada em edição (null = criando)
let cfComps = [];       // linhas do formulário de componentes: {nome, quantidade, custo, origem}

function cfBlankComp(){ return {nome:"", quantidade:1, custo:0, origem:CUSTOM.ORIGENS[0]}; }
const cfNum = v => Number(String(v == null ? "" : v).replace(",", "."));

/* ---------- Abrir / preencher o formulário ---------- */
function cfFillZones(selected){
  $("#cfZona").innerHTML = DB.zonas.map(z=>{
    const n = zoneCount(z.id, cfEditing), cheia = n >= CUSTOM.MAX_POR_ZONA;
    return `<option value="${z.id}" ${cheia?"disabled":""} ${z.id===selected?"selected":""}>${z.id} • ${esc(z.nome)} (${n}/${CUSTOM.MAX_POR_ZONA})</option>`;
  }).join("");
  cfZonaInfo();
}
function cfZonaInfo(){
  const z = zonaById($("#cfZona").value);
  $("#cfZonaInfo").textContent = z ? z.descricao : "";
}

function renderCriar(){
  const def = cfEditing ? S.custom.find(d=>d.id===cfEditing) : null;
  if(cfEditing && !def) cfEditing = null;
  const cheio = !def && S.custom.length >= CUSTOM.MAX_ATIVIDADES;

  $("#cfTitle").textContent = def ? "✏️ Editar atividade" : "➕ Criar minha atividade";
  $("#cfLimit").textContent = `${S.custom.length} de ${CUSTOM.MAX_ATIVIDADES} atividades criadas`;
  $("#cfNome").value = def ? def.nome : "";
  $("#cfIcone").value = def ? def.icone : "✨";
  $("#cfDesc").value = def ? def.descricao : "";
  $("#cfDur").value = def ? def.duracao_min : 30;
  $("#cfAcc").value = def ? def.requisito_acessibilidade : "";

  const livre = DB.zonas.find(z => zoneCount(z.id, cfEditing) < CUSTOM.MAX_POR_ZONA);
  cfFillZones(def ? def.zona_id : (livre ? livre.id : "Z1"));

  cfComps = def ? def.componentes.map(c=>({nome:c.nome, quantidade:c.quantidade, custo:c.custo, origem:c.origem})) : [cfBlankComp()];
  renderCfComps();

  $("#cfEmojis").innerHTML = CUSTOM.EMOJIS.map(e=>`<button type="button" data-e="${e}" aria-label="Usar o ícone ${e}">${e}</button>`).join("");
  document.querySelectorAll("#cfEmojis [data-e]").forEach(b=>b.onclick=()=>{ $("#cfIcone").value=b.dataset.e; });
  $("#cfOrigens").innerHTML = CUSTOM.ORIGENS.map(o=>`<option value="${esc(o)}"></option>`).join("");

  $("#cfSave").disabled = cheio;
  $("#cfSave").textContent = def ? "💾 Salvar alterações" : "💾 Salvar atividade";
  if(cheio) showCfErr([{msg:`Limite de ${CUSTOM.MAX_ATIVIDADES} atividades criadas atingido. Exclua uma na tela 3 para criar outra.`}]);
  else showCfErr([]);
}

/* ---------- Linhas de componentes ---------- */
function renderCfComps(focusIdx){
  $("#cfComps").innerHTML = cfComps.map((c,i)=>`
    <fieldset class="comp-row">
      <legend>Componente ${i+1}</legend>
      <div class="cr-name"><label for="cfCn${i}">Nome</label><input type="text" id="cfCn${i}" data-k="nome" maxlength="50" value="${esc(c.nome)}" placeholder="Ex.: Caixote de feira"></div>
      <div class="cr-qty"><label for="cfCq${i}">Qtd.</label><input type="number" id="cfCq${i}" data-k="quantidade" min="1" max="99" step="1" inputmode="numeric" value="${esc(c.quantidade)}"></div>
      <div class="cr-cost"><label for="cfCc${i}">Custo unit. (R$)</label><input type="number" id="cfCc${i}" data-k="custo" min="0" max="100" step="0.5" inputmode="decimal" value="${esc(c.custo)}"></div>
      <div class="cr-orig"><label for="cfCo${i}">Origem / reuso</label><input type="text" id="cfCo${i}" data-k="origem" list="cfOrigens" maxlength="60" value="${esc(c.origem)}"></div>
      <button type="button" class="btn danger cr-del" aria-label="Remover componente ${i+1}" ${cfComps.length<=1?"disabled":""}>✕<span class="cr-del-txt">&nbsp;Remover componente</span></button>
    </fieldset>`).join("");
  document.querySelectorAll("#cfComps .comp-row").forEach((fs,i)=>{
    fs.querySelectorAll("input").forEach(inp=>inp.addEventListener("input",()=>{ cfComps[i][inp.dataset.k]=inp.value; cfUpdateTotal(); }));
    fs.querySelector(".cr-del").onclick=()=>{ if(cfComps.length<=1) return; cfComps.splice(i,1); renderCfComps(); $("#cfAddComp").focus(); };
  });
  $("#cfCompCount").textContent = `${cfComps.length} de ${CUSTOM.MAX_COMPONENTES} componentes`;
  $("#cfAddComp").disabled = cfComps.length >= CUSTOM.MAX_COMPONENTES;
  cfUpdateTotal();
  if(focusIdx != null){ const el = $("#cfCn"+focusIdx); if(el) el.focus(); }
}
function cfUpdateTotal(){
  let t = 0;
  cfComps.forEach(c=>{
    const q = cfNum(c.quantidade), k = cfNum(c.custo);
    if(isFinite(q) && isFinite(k) && q > 0 && k >= 0) t += q * k;
  });
  $("#cfTotal").textContent = brl(t);
}
$("#cfAddComp").onclick=()=>{
  if(cfComps.length >= CUSTOM.MAX_COMPONENTES) return;
  cfComps.push(cfBlankComp()); renderCfComps(cfComps.length-1);
};
$("#cfZona").addEventListener("change", cfZonaInfo);

/* ---------- Ler e validar ---------- */
function readCfForm(){
  return {
    nome: cleanText($("#cfNome").value, 40),
    iconeBruto: String($("#cfIcone").value).trim(),
    icone: cleanIcon($("#cfIcone").value),
    descricao: cleanText($("#cfDesc").value, 160),
    zona_id: $("#cfZona").value,
    duracao_min: $("#cfDur").value,
    requisito_acessibilidade: cleanText($("#cfAcc").value, 160),
    componentes: cfComps.map(c=>({nome:cleanText(c.nome,50), quantidade:c.quantidade, custo:c.custo, origem:cleanText(c.origem,60)}))
  };
}
function validateCf(v){
  const errs = [];
  if(v.nome.length < 3) errs.push({msg:"Dê um nome à atividade (mínimo 3 letras).", id:"cfNome"});
  else if(DB.atividades.some(a=>a.id!==cfEditing && a.nome.toLowerCase()===v.nome.toLowerCase()))
    errs.push({msg:"Já existe uma atividade com esse nome. Escolha outro.", id:"cfNome"});
  if(!v.iconeBruto) errs.push({msg:"Escolha um ícone (emoji) para a atividade.", id:"cfIcone"});
  if(!DB.zonas.some(z=>z.id===v.zona_id)) errs.push({msg:"Escolha a zona da praça.", id:"cfZona"});
  else if(zoneCount(v.zona_id, cfEditing) >= CUSTOM.MAX_POR_ZONA)
    errs.push({msg:`Essa zona já tem ${CUSTOM.MAX_POR_ZONA} atividades. Escolha outra zona.`, id:"cfZona"});
  const dur = cfNum(v.duracao_min);
  if(!isFinite(dur) || dur < 5 || dur > 240) errs.push({msg:"Informe a duração entre 5 e 240 minutos.", id:"cfDur"});
  if(v.requisito_acessibilidade.length < 5) errs.push({msg:"Descreva o requisito de acessibilidade (mínimo 5 letras).", id:"cfAcc"});
  v.componentes.forEach((c,i)=>{
    const q = cfNum(c.quantidade), k = cfNum(c.custo);
    if(!c.nome) errs.push({msg:`Componente ${i+1}: informe o nome (ou remova a linha).`, id:"cfCn"+i});
    if(!Number.isInteger(q) || q < 1 || q > 99) errs.push({msg:`Componente ${i+1}: a quantidade deve ser um número inteiro de 1 a 99.`, id:"cfCq"+i});
    if(!isFinite(k) || k < 0 || k > 100) errs.push({msg:`Componente ${i+1}: o custo deve ficar entre R$ 0 e R$ 100.`, id:"cfCc"+i});
    if(!c.origem) errs.push({msg:`Componente ${i+1}: informe a origem do material.`, id:"cfCo"+i});
  });
  const textos = [v.nome, v.descricao, v.requisito_acessibilidade].concat(v.componentes.reduce((l,c)=>l.concat([c.nome,c.origem]),[]));
  if(textos.some(obsHasPII)) errs.push({msg:"Remova e-mail, telefone, CPF ou coordenada dos textos — o protótipo não guarda dados pessoais.", id:"cfNome"});
  if(!cfEditing && S.custom.length >= CUSTOM.MAX_ATIVIDADES) errs.push({msg:`Limite de ${CUSTOM.MAX_ATIVIDADES} atividades criadas atingido.`});
  return errs;
}
function showCfErr(errs){
  const box = $("#cfErr");
  if(!errs.length){ box.className = "alert err"; box.innerHTML = ""; return; }
  box.className = "alert err show";
  box.innerHTML = "<b>Revise antes de salvar:</b><ul>" + errs.map(e=>`<li>${esc(e.msg)}</li>`).join("") + "</ul>";
  const first = errs.find(e=>e.id && $("#"+e.id));
  if(first) $("#"+first.id).focus(); else box.scrollIntoView({block:"nearest"});
}

/* ---------- Salvar (criar ou editar) ---------- */
$("#cfForm").addEventListener("submit", e=>{
  e.preventDefault();
  const v = readCfForm(), errs = validateCf(v);
  if(errs.length){ showCfErr(errs); return; }
  showCfErr([]);
  saveActivity(v);
});
function saveActivity(v){
  const editing = cfEditing;
  const id = editing || ("A" + S.customSeq);
  const def = sanitizeCustomDef({
    id, nome:v.nome, icone:v.icone, descricao:v.descricao, zona_id:v.zona_id, duracao_min:v.duracao_min,
    requisito_acessibilidade:v.requisito_acessibilidade, componentes:v.componentes
  });
  if(!def){ showCfErr([{msg:"Não foi possível salvar. Confira os campos.", id:"cfNome"}]); return; }
  if(editing){
    const antigo = S.drafts[id];
    S.custom = S.custom.map(d => d.id===id ? def : d);
    registerCustom(def);
    S.drafts[id] = Object.assign(defaultDraft(id), {nome: (antigo && antigo.nome) || ""});
  } else {
    S.custom.push(def); S.customSeq++;
    registerCustom(def);
    S.drafts[id] = defaultDraft(id); S.checks[id] = {};
  }
  S.atividade = id; S.zona = def.zona_id; cfEditing = null;
  persist(); renderAll(); renderDados();
  toast(editing ? "Atividade atualizada!" : "Atividade criada!");
  location.hash = "#atividade";
}
$("#cfCancel").onclick = ()=>{ cfEditing = null; location.hash = "#atividade"; };

/* ---------- Editar / excluir (chamadas pelos botões da tela 3) ---------- */
function startEditActivity(id){
  if(!S.custom.some(d=>d.id===id)) return;
  cfEditing = id; location.hash = "#criar";
}
function deleteActivity(id){
  const a = actById(id);
  if(!a || !a.personalizada) return;
  const nProps = S.propostas.filter(p=>p.atividade_id===id).length;
  const aviso = `Excluir “${a.nome}”?` + (nProps ? ` ${nProps} proposta(s) salva(s) com ela também serão removidas.` : "") + " Isso não pode ser desfeito.";
  if(!window.confirm(aviso)) return;
  S.custom = S.custom.filter(d=>d.id!==id);
  unregisterCustom(id);
  delete S.drafts[id]; delete S.checks[id]; delete S.obs[id];
  S.propostas = S.propostas.filter(p=>p.atividade_id!==id);
  if(S.atividade === id){ S.atividade = "A1"; S.zona = zonaById(actById("A1").zona_id).id; }
  persist(); renderAll(); renderDados();
  toast("Atividade excluída");
}

/* ---------- Navegação ---------- */
window.addEventListener("hashchange", ()=>{
  if(location.hash === "#criar") renderCriar(); else cfEditing = null;
});
if(location.hash === "#criar") renderCriar();
