/* ============================================================
   T4 | Praça em Ação — Centro de Aracaju / SE
   Lógica da aplicação (depende de data.js e custom.js: DB, VERSION, CUSTOM)
   A tela "Criar atividade" fica em criar.js (carregado depois).
   ============================================================ */

/* ============ ESTADO + localStorage ============ */
const LS_KEY = "pracaEmAcao.aracaju.v1";
const store = {
  ok: (()=>{ try{ localStorage.setItem("__t","1"); localStorage.removeItem("__t"); return true; }catch(e){ return false; } })(),
  load(){ if(!this.ok) return null; try{ return JSON.parse(localStorage.getItem(LS_KEY)); }catch(e){ return null; } },
  save(s){ if(!this.ok) return false; try{ localStorage.setItem(LS_KEY, JSON.stringify(s)); return true; }catch(e){ return false; } }
};
function defaultDraft(actId){
  const a = actById(actId);
  return { nome:"", comps: Object.fromEntries(a.componente_ids.map(cid => [cid,{on:true, qtd:compById(cid).quantidade}])) };
}
const S = Object.assign({
  zona:null, atividade:"A1",
  drafts:{}, checks:{}, obs:{}, propostas:[], cmp:{a:"",b:""},
  custom:[], customSeq:CUSTOM.PRIMEIRO_NUMERO,
  validacao:Array.from({length:5},()=>({encontrou:false,custo:false,cuidado:false,tempo:"",duvida:""}))
}, store.load() || {});
if(!S.cmp || typeof S.cmp!=="object") S.cmp={a:"",b:""};
if(!Array.isArray(S.propostas)) S.propostas=[];
["drafts","checks","obs"].forEach(k=>{ if(!S[k] || typeof S[k]!=="object" || Array.isArray(S[k])) S[k]={}; });

/* Atividades personalizadas: valida o que veio do localStorage e registra em DB */
if(!Array.isArray(S.custom)) S.custom=[];
S.custom = S.custom.map(sanitizeCustomDef).filter(Boolean).filter(d=>{
  if(DB.atividades.some(a=>a.id===d.id)) return false;                                   // id repetido
  if(DB.atividades.filter(a=>a.personalizada).length>=CUSTOM.MAX_ATIVIDADES) return false; // limite geral
  if(zoneCount(d.zona_id)>=CUSTOM.MAX_POR_ZONA) return false;                              // zona cheia
  registerCustom(d); return true;
});
if(!Number.isInteger(S.customSeq) || S.customSeq<CUSTOM.PRIMEIRO_NUMERO) S.customSeq=CUSTOM.PRIMEIRO_NUMERO;
S.custom.forEach(d=>{ S.customSeq=Math.max(S.customSeq, parseInt(d.id.slice(1),10)+1); });

if(!actById(S.atividade)) S.atividade="A1";
if(S.zona && !zonaById(S.zona)) S.zona=null;
DB.atividades.forEach(a => {
  const d=S.drafts[a.id];
  const ok=d && d.comps && a.componente_ids.every(cid=>d.comps[cid] && typeof d.comps[cid].qtd==="number");
  if(!ok) S.drafts[a.id]=Object.assign(defaultDraft(a.id),{nome:(d&&typeof d.nome==="string")?d.nome:""});
  if(!S.checks[a.id]) S.checks[a.id]={};
});
S.propostas = S.propostas.filter(p=>p && actById(p.atividade_id) && Array.isArray(p.componentes));

/* Mantém o campo status do checklist (modelo de dados) igual ao que está marcado no localStorage */
function syncChecklistStatus(){
  DB.checklist.forEach(c=>{ c.status = (S.checks[c.atividade_id] && S.checks[c.atividade_id][c.id]) ? "confirmado" : "a confirmar"; });
}
function persist(){ syncChecklistStatus(); return store.save(S); }
syncChecklistStatus();

/* ============ HELPERS ============ */
const $ = s => document.querySelector(s);
function actById(id){ return DB.atividades.find(a=>a.id===id); }
function zonaById(id){ return DB.zonas.find(z=>z.id===id); }
function compById(id){ return DB.componentes.find(c=>c.id===id); }
function clTotal(actId){ return DB.checklist.filter(i=>i.atividade_id===actId).length; }
const brl = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("show"),2200); }
function totalOf(actId){
  const d=S.drafts[actId]; let tot=0, n=0;
  actById(actId).componente_ids.forEach(cid=>{ const c=d.comps[cid]; if(c&&c.on&&c.qtd>0){ tot+=c.qtd*compById(cid).custo_estimado_didatico; n++; } });
  return {tot, n};
}
function selectActivity(id, go){
  S.atividade=id; S.zona=actById(id).zona_id; persist(); renderAll(); if(go) location.hash=go;
}

/* ============ TELA 1 ============ */
function renderCards(){
  const full = S.custom.length>=CUSTOM.MAX_ATIVIDADES;
  $("#actCards").innerHTML = DB.atividades.map(a=>{
    const z=zonaById(a.zona_id), t=totalOf(a.id).tot;
    return `<button type="button" class="card act-card t-${a.tint||a.id} ${S.atividade===a.id?'sel':''}" data-act="${a.id}" aria-pressed="${S.atividade===a.id}">
      <div class="act-ico" aria-hidden="true">${a.icone}</div>
      <h3>${esc(a.nome)}</h3><div class="fine">${esc(a.descricao)}</div>
      <div class="meta"><span class="chip green">${esc(z.nome)}</span><span class="chip">${a.duracao_min} min</span><span class="chip amber">${brl(t)} didático</span>${a.personalizada?'<span class="chip red">Criada por você</span>':''}</div>
    </button>`;}).join("") + (full
      ? `<div class="card act-card add disabled" aria-disabled="true"><div class="act-ico" aria-hidden="true">➕</div><h3>Criar minha atividade</h3><div class="fine">Limite de ${CUSTOM.MAX_ATIVIDADES} atividades criadas atingido. Exclua uma para criar outra.</div></div>`
      : `<a class="card act-card add" href="#criar"><div class="act-ico" aria-hidden="true">➕</div><h3>Criar minha atividade</h3><div class="fine">Monte uma atividade própria: zona, duração, acessibilidade e até ${CUSTOM.MAX_COMPONENTES} componentes com custo didático.</div></a>`);
  document.querySelectorAll("#actCards [data-act]").forEach(b=>b.onclick=()=>selectActivity(b.dataset.act,"#maquete"));
}

/* ============ TELA 2: MAQUETE ============ */
const mq = window.matchMedia("(max-width:640px)");
/* Distribui os pinos de cada zona em uma linha (até 3 por zona) */
function pinLayout(){
  const out={}; const baseR = mq.matches ? 30 : 20;
  DB.zonas.forEach(z=>{
    const acts=DB.atividades.filter(a=>a.zona_id===z.id), n=acts.length, step=z.w/(n+1);
    acts.forEach((a,i)=>{
      const r=Math.max(14,Math.min(baseR,Math.floor(step/2)-4));
      out[a.id]={x:Math.round(z.x+step*(i+1)), y:Math.round(z.y+z.h*0.46), r, solo:n===1};
    });
  });
  return out;
}
function renderMaquete(){
  const mob=mq.matches;
  $("#zonesG").innerHTML = DB.zonas.map(z=>`
    <g class="zone ${S.zona===z.id?'sel':''}" data-z="${z.id}" tabindex="0" role="button" aria-label="Zona ${esc(z.nome)}">
      <rect class="zr" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="14" fill="${z.cor}"/>
      <text class="zl-full" x="${z.x+12}" y="${z.y+22}" font-size="12.5" font-weight="700" fill="#22302a">${z.id} • ${esc(z.nome)}</text>
      <text class="zl-short" x="${z.x+12}" y="${z.y+25}" font-size="20" font-weight="800" fill="#22302a">${z.id}</text>
    </g>`).join("") +
    `<g aria-hidden="true"><circle cx="272" cy="150" r="11" fill="#6fa882"/><circle cx="272" cy="212" r="9" fill="#5c9a72"/><circle cx="322" cy="150" r="10" fill="#6fa882"/></g>`;
  const L=pinLayout();
  $("#pinsG").innerHTML = DB.atividades.map(a=>{
    const p=L[a.id], fs=Math.round(p.r*1.05), ly=p.y+p.r+(mob?18:15), lf=mob?17:12.5;
    return `<g class="pin ${S.atividade===a.id?'sel':''} ${S.zona && S.zona!==a.zona_id?'dim':''}" data-a="${a.id}" tabindex="0" role="button" aria-label="Atividade ${esc(a.nome)}">
      <title>${esc(a.nome)}</title>
      <circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="#fff" stroke="${a.cor}" stroke-width="3"/>
      <text x="${p.x}" y="${p.y+Math.round(fs*0.35)}" text-anchor="middle" font-size="${fs}">${a.icone}</text>
      ${p.solo?`<text class="pl-full" x="${p.x}" y="${p.y+p.r+20}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#1a2320">${esc(a.nome)}</text>`:""}
      <text class="pl-short${p.solo?' solo':''}" x="${p.x}" y="${ly}" text-anchor="middle" font-size="${lf}" font-weight="800" fill="#1a2320">${a.id}</text>
    </g>`;}).join("");
  const bind=(sel,fn)=>document.querySelectorAll(sel).forEach(el=>{ el.onclick=fn; el.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){e.preventDefault();fn.call(el,e);} }; });
  bind("#zonesG .zone", function(){ S.zona=this.dataset.z; const a=DB.atividades.find(x=>x.zona_id===S.zona); if(a) S.atividade=a.id; persist(); renderAll(); });
  bind("#pinsG .pin", function(e){ e.stopPropagation(); selectActivity(this.dataset.a); });
  $("#legend").innerHTML = DB.zonas.map(z=>`<span><i style="background:${z.cor}"></i>${z.id} ${esc(z.nome)}</span>`).join("") + `<span>📍 marcador = atividade</span>`;
  $("#pinKey").innerHTML = DB.atividades.map(a=>`<li><button type="button" class="key-btn ${S.atividade===a.id?'sel':''}" data-key="${a.id}"><b>${a.id}</b> <span aria-hidden="true">${a.icone}</span> ${esc(a.nome)}</button></li>`).join("");
  document.querySelectorAll("#pinKey [data-key]").forEach(b=>b.onclick=()=>selectActivity(b.dataset.key));
  const z = S.zona ? zonaById(S.zona) : null;
  $("#maqSel").textContent = z ? `Zona selecionada: ${z.nome}` : "Nenhuma zona selecionada";
  $("#maqSel").className = "chip " + (z?"green":"");
  if(!z){ $("#zoneInfo").innerHTML = `<div class="empty"><div class="e">🗺️</div><b>Escolha uma zona na maquete</b><br>Cada zona recebe atividades demonstrativas.</div>`; return; }
  const acts = DB.atividades.filter(a=>a.zona_id===z.id);
  $("#zoneInfo").innerHTML = `<span class="chip green">${z.id}</span><h3 style="margin-top:8px">${esc(z.nome)}</h3><p class="fine">${esc(z.descricao)}</p>
    ${acts.map(a=>{ const t=totalOf(a.id); return `<div class="saved" style="margin-top:10px"><div class="row"><span style="font-size:22px" aria-hidden="true">${a.icone}</span><b>${esc(a.nome)}</b><span class="spacer"></span><span class="chip amber">${brl(t.tot)}</span></div>
      ${a.personalizada?'<div style="margin-top:4px"><span class="chip red">Criada por você</span></div>':''}
      <div class="fine" style="margin:6px 0">${esc(a.descricao)}</div>
      <div class="fine">♿ ${esc(a.requisito_acessibilidade)}</div>
      <div class="row" style="margin-top:10px"><button type="button" class="btn primary" data-go="${a.id}">Ver componentes e custo →</button></div></div>`;}).join("")}`;
  document.querySelectorAll("#zoneInfo [data-go]").forEach(b=>b.onclick=()=>selectActivity(b.dataset.go,"#atividade"));
}
if(mq.addEventListener) mq.addEventListener("change",renderMaquete); else if(mq.addListener) mq.addListener(renderMaquete);

/* ============ TELA 3: ATIVIDADE ============ */
function renderAtividade(){
  const a=actById(S.atividade), z=zonaById(a.zona_id), d=S.drafts[a.id];
  $("#actTabs").innerHTML = DB.atividades.map(x=>`<button type="button" role="tab" aria-selected="${x.id===a.id}" class="btn ${x.id===a.id?'primary':'ghost'}" data-t="${x.id}"><span aria-hidden="true">${x.icone}</span> ${esc(x.nome)}</button>`).join("")
    + (S.custom.length<CUSTOM.MAX_ATIVIDADES ? `<a class="btn ghost" href="#criar">➕ Nova atividade</a>` : "");
  document.querySelectorAll("#actTabs [data-t]").forEach(b=>b.onclick=()=>selectActivity(b.dataset.t));
  $("#actHead").innerHTML = `<div class="row"><span style="font-size:28px" aria-hidden="true">${a.icone}</span><div><h3 style="margin:0">${esc(a.nome)}</h3><div class="meta" style="margin-top:4px"><span class="chip green">Zona ${z.id} • ${esc(z.nome)}</span><span class="chip">${a.duracao_min} min</span>${a.personalizada?'<span class="chip red">Criada por você</span>':''}</div></div></div>
    <p class="fine" style="margin:10px 0">${esc(a.descricao)}<br>♿ <b>Requisito:</b> ${esc(a.requisito_acessibilidade)}</p>
    ${a.personalizada?`<div class="row" style="margin:0 0 12px"><button type="button" class="btn ghost" id="btnEditAct">✏️ Editar</button><button type="button" class="btn danger" id="btnDelAct">🗑 Excluir</button></div>`:""}`;
  if($("#btnEditAct")) $("#btnEditAct").onclick=()=>startEditActivity(a.id);
  if($("#btnDelAct")) $("#btnDelAct").onclick=()=>deleteActivity(a.id);
  $("#compBody").innerHTML = a.componente_ids.map(cid=>{
    const c=compById(cid), st=d.comps[cid];
    return `<tr class="${st.on?'':'off'}"><td class="c-use" data-label="Usar"><input type="checkbox" data-on="${cid}" ${st.on?'checked':''} aria-label="Usar ${esc(c.nome)}"></td>
      <td class="c-name">${esc(c.nome)}<div class="fine">${esc(c.id)} → ${a.id} / ${z.id}</div></td>
      <td class="num c-qty" data-label="Qtd."><input type="number" min="0" max="99" step="1" inputmode="numeric" value="${st.qtd}" data-q="${cid}" aria-label="Quantidade de ${esc(c.nome)}"></td>
      <td class="num c-unit" data-label="Unit. didático">${brl(c.custo_estimado_didatico)}</td>
      <td class="num c-sub" data-label="Subtotal">${brl(st.on?st.qtd*c.custo_estimado_didatico:0)}</td>
      <td class="c-orig" data-label="Origem"><span class="chip ${c.origem_reuso.startsWith('Reuso')||c.origem_reuso.startsWith('Empréstimo')?'green':'amber'}">${esc(c.origem_reuso)}</span></td></tr>`;}).join("");
  document.querySelectorAll("[data-on]").forEach(i=>i.onchange=()=>{ d.comps[i.dataset.on].on=i.checked; persist(); renderAtividade(); renderCards(); });
  document.querySelectorAll("[data-q]").forEach(i=>i.onchange=()=>{ let v=parseInt(i.value,10); if(isNaN(v)||v<0) v=0; if(v>99) v=99; d.comps[i.dataset.q].qtd=v; persist(); renderAtividade(); renderCards(); });
  const t=totalOf(a.id);
  $("#totalVal").textContent = brl(t.tot);
  if(document.activeElement!==$("#propNome")) $("#propNome").value = d.nome;
  $("#propZona").textContent = `${z.id} • ${z.nome}`;
  $("#propCount").textContent = t.n;
  $("#cmpBody").innerHTML = DB.atividades.map(x=>`<tr ${x.id===a.id?'style="background:var(--green-l)"':''}><td class="k-name">${x.icone} ${esc(x.nome)}</td><td data-label="Zona">${esc(zonaById(x.zona_id).nome)}</td><td class="num" data-label="Duração">${x.duracao_min} min</td><td class="num" data-label="Total">${brl(totalOf(x.id).tot)}</td></tr>`).join("");
}
$("#propNome").addEventListener("input",e=>{ S.drafts[S.atividade].nome=e.target.value; persist(); renderSummary(); });
$("#btnReset").onclick=()=>{ S.drafts[S.atividade]=defaultDraft(S.atividade); persist(); renderAll(); toast("Componentes restaurados"); };
$("#btnToChecklist").onclick=()=>{ location.hash="#checklist"; };

/* ============ TELA 4: CHECKLIST ============ */
function renderChecklist(){
  const a=actById(S.atividade), ch=S.checks[a.id];
  $("#clAct").textContent = `${a.icone} ${a.nome}`;
  const items = DB.checklist.filter(c=>c.atividade_id===a.id);
  const cats = [...new Set(items.map(i=>i.categoria))];
  const colors = {"Acessibilidade":"var(--blue)","Segurança":"var(--red)","Autorização":"var(--amber)"};
  const icons = {"Acessibilidade":"♿","Segurança":"🛟","Autorização":"📝"};
  $("#clList").innerHTML = cats.map(cat=>`<div class="cl-group"><h4 style="color:${colors[cat]}">${icons[cat]} ${cat}</h4>${
    items.filter(i=>i.categoria===cat).map(i=>{ const on=!!ch[i.id]; return `<label class="cl-item ${on?'done':''}"><input type="checkbox" data-c="${i.id}" ${on?'checked':''}><span class="cl-txt">${esc(i.item)}</span><span class="st" style="color:${on?'var(--green-d)':'var(--muted)'}">${on?'confirmado':'a confirmar'}</span></label>`; }).join("")
  }</div>`).join("");
  document.querySelectorAll("[data-c]").forEach(i=>i.onchange=()=>{ ch[i.dataset.c]=i.checked; persist(); renderChecklist(); });
  const n=items.filter(i=>ch[i.id]).length;
  $("#clBar").style.width = (n/items.length*100)+"%";
  $("#clProg").textContent = `${n} de ${items.length} cuidados confirmados` + (n<items.length ? " — o próximo pendente aparece no resumo." : " — pronto para pedir autorização formal.");
  if(document.activeElement!==$("#obs")) $("#obs").value = S.obs[a.id]||"";
  renderSummary(); renderSaved();
}
const PII = [/[\w.+-]+@[\w-]+\.[\w.]+/, /(\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}/, /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, /-?\d{1,2}\.\d{4,},\s*-?\d{1,3}\.\d{4,}/];
function obsHasPII(t){ return PII.some(r=>r.test(t)); }
$("#obs").addEventListener("input",e=>{
  S.obs[S.atividade]=e.target.value; persist();
  const w=$("#obsWarn"); if(obsHasPII(e.target.value)){ w.textContent="Parece haver e-mail, telefone, CPF ou coordenada. Remova antes de salvar — o teste não registra dados pessoais nem localização."; w.classList.add("show"); } else w.classList.remove("show");
  renderSummary();
});
function nextPending(actId){
  const ch=S.checks[actId]; const order=["Autorização","Segurança","Acessibilidade"];
  for(const cat of order){ const p=DB.checklist.find(i=>i.atividade_id===actId&&i.categoria===cat&&!ch[i.id]); if(p) return p; }
  return null;
}
function summaryText(){
  const a=actById(S.atividade), z=zonaById(a.zona_id), d=S.drafts[a.id], t=totalOf(a.id), np=nextPending(a.id);
  const comps=a.componente_ids.filter(cid=>d.comps[cid].on&&d.comps[cid].qtd>0).map(cid=>`${d.comps[cid].qtd}× ${compById(cid).nome}`);
  return {a,z,d,t,np,comps};
}
function renderSummary(){
  const {a,z,d,t,np,comps}=summaryText();
  $("#summary").innerHTML = `<div class="saved">
    <b>${esc(d.nome||"(proposta sem nome)")}</b>
    <div class="meta" style="margin:6px 0"><span class="chip">${a.icone} ${esc(a.nome)}</span><span class="chip green">${esc(z.nome)}</span><span class="chip amber">${brl(t.tot)} didático</span></div>
    <div class="fine">${comps.length? esc(comps.join(" • ")) : "<i>Nenhum componente selecionado</i>"}</div>
    <div style="margin-top:8px;font-size:14px">➡️ <b>Próximo cuidado:</b> ${np? `<span class="chip ${np.categoria==='Autorização'?'amber':np.categoria==='Segurança'?'red':'blue'}">${np.categoria}</span> ${esc(np.item)}` : "todos confirmados — solicitar autorização formal ao órgão responsável pela praça."}</div>
    ${(S.obs[a.id]||"").trim()?`<div class="fine" style="margin-top:6px">📝 ${esc(S.obs[a.id])}</div>`:""}
  </div>`;
}
function renderSavedList(){
  if(!store.ok){ $("#savedList").innerHTML=`<div class="empty"><div class="e">🔒</div>Este navegador bloqueou o armazenamento local.<br>A demo funciona, mas as propostas não serão guardadas.</div>`; return; }
  if(!S.propostas.length){ $("#savedList").innerHTML=`<div class="empty"><div class="e">🗂️</div><b>Nenhuma proposta salva ainda</b><br>Monte uma proposta e clique em “Salvar proposta”.</div>`; return; }
  $("#savedList").innerHTML = S.propostas.slice().reverse().map(p=>{ const a=actById(p.atividade_id); const tot=clTotal(p.atividade_id); return `<div class="saved">
    <div class="row"><b class="saved-name">${esc(p.nome)}</b><span class="spacer"></span><button type="button" class="btn ghost" data-load="${esc(p.id)}" style="padding:6px 10px">Abrir</button><button type="button" class="btn danger" data-del="${esc(p.id)}" style="padding:6px 10px" aria-label="Excluir ${esc(p.nome)}">✕</button></div>
    <div class="meta" style="margin-top:6px"><span class="chip">${a.icone} ${esc(a.nome)}</span><span class="chip amber">${brl(p.total)}</span><span class="chip ${p.checklist_ok===tot?'green':'blue'}">${p.checklist_ok}/${tot} cuidados</span></div>
    <div class="fine" style="margin-top:4px">${p.componentes.length} componentes • salvo em ${new Date(p.salvo_em).toLocaleString("pt-BR")}</div></div>`; }).join("");
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{ S.propostas=S.propostas.filter(p=>p.id!==b.dataset.del); persist(); renderSaved(); toast("Proposta excluída"); });
  document.querySelectorAll("[data-load]").forEach(b=>b.onclick=()=>{ const p=S.propostas.find(x=>x.id===b.dataset.load); loadProposal(p); });
}
function renderSaved(){ renderSavedList(); renderCompare(); }
function loadProposal(p){
  const a=actById(p.atividade_id); S.atividade=a.id; S.zona=a.zona_id;
  const d=defaultDraft(a.id); a.componente_ids.forEach(cid=>d.comps[cid].on=false);
  p.componentes.forEach(c=>{ if(d.comps[c.componente_id]) d.comps[c.componente_id]={on:true,qtd:c.quantidade}; });
  d.nome=p.nome; S.drafts[a.id]=d; S.checks[a.id]=Object.assign({},p.checklist); S.obs[a.id]=p.observacao||"";
  persist(); renderAll(); toast("Proposta carregada");
}

/* ============ COMPARAR PROPOSTAS SALVAS (funcionalidade extra) ============ */
function renderCompare(){
  const list=S.propostas, ids=list.map(p=>p.id);
  const sa=$("#cmpA"), sb=$("#cmpB"), box=$("#cmpResult");
  if(!ids.includes(S.cmp.a)) S.cmp.a="";
  if(!ids.includes(S.cmp.b)) S.cmp.b="";
  const opts=sel=>`<option value="">— escolha uma proposta —</option>`+list.slice().reverse().map(p=>`<option value="${esc(p.id)}" ${sel===p.id?'selected':''}>${esc(p.nome)} • ${esc(actById(p.atividade_id).nome)} • ${brl(p.total)}</option>`).join("");
  sa.innerHTML=opts(S.cmp.a); sb.innerHTML=opts(S.cmp.b);
  const few=list.length<2;
  sa.disabled=few; sb.disabled=few; $("#cmpLast").disabled=few;
  if(few){
    box.innerHTML=`<div class="empty"><div class="e">⚖️</div><b>Salve pelo menos duas propostas para comparar</b><br>${list.length===0?"Nenhuma proposta salva ainda.":"Há apenas 1 proposta salva."} Mude a atividade ou os componentes na tela 3 e salve outra versão.</div>`;
    return;
  }
  const pa=list.find(p=>p.id===S.cmp.a), pb=list.find(p=>p.id===S.cmp.b);
  if(!pa||!pb){
    box.innerHTML=`<div class="empty"><div class="e">👆</div>Selecione a <b>Proposta A</b> e a <b>Proposta B</b> acima para ver a tabela comparativa.</div>`;
    return;
  }
  let aviso="";
  if(pa.id===pb.id) aviso=`<div class="alert warn show" role="status">Você selecionou a mesma proposta nos dois campos. Escolha propostas diferentes para comparar.</div>`;
  const info=p=>{ const a=actById(p.atividade_id), z=zonaById(p.zona_id||a.zona_id)||zonaById(a.zona_id), tot=clTotal(p.atividade_id); return {a,z,tot,ok:p.checklist_ok,ratio:tot?p.checklist_ok/tot:0}; };
  const ia=info(pa), ib=info(pb);
  const cheaper = pa.total===pb.total ? null : (pa.total<pb.total?"a":"b");
  const safer = ia.ratio===ib.ratio ? null : (ia.ratio>ib.ratio?"a":"b");
  const tag=t=>`<span class="tag">${t}</span>`;
  const cell=(side,best,html,label)=>`<td data-label="Proposta ${side.toUpperCase()}" class="${best===side?'best':''}">${html}${best===side?tag(label):""}</td>`;
  const plain=(side,h)=>`<td data-label="Proposta ${side.toUpperCase()}">${h}</td>`;
  const row=(label,ca,cb)=>`<tr><th scope="row">${label}</th>${ca}${cb}</tr>`;
  const rows =
    row("Nome", plain("a",esc(pa.nome)), plain("b",esc(pb.nome))) +
    row("Atividade", plain("a",`${ia.a.icone} ${esc(ia.a.nome)}`), plain("b",`${ib.a.icone} ${esc(ib.a.nome)}`)) +
    row("Zona", plain("a",`${ia.z.id} • ${esc(ia.z.nome)}`), plain("b",`${ib.z.id} • ${esc(ib.z.nome)}`)) +
    row("Total didático", cell("a",cheaper,brl(pa.total),"menor custo"), cell("b",cheaper,brl(pb.total),"menor custo")) +
    row("Cuidados confirmados", cell("a",safer,`${ia.ok} de ${ia.tot}`,"mais cuidados"), cell("b",safer,`${ib.ok} de ${ib.tot}`,"mais cuidados")) +
    row("Componentes usados", plain("a",String(pa.componentes.length)), plain("b",String(pb.componentes.length)));
  const diff=Math.abs(pa.total-pb.total);
  const frase = cheaper
    ? `A proposta <b>${cheaper==="a"?"A":"B"}</b> custa ${brl(diff)} a menos (valores didáticos fictícios).`
    : "As duas propostas têm o mesmo total didático.";
  box.innerHTML = aviso + `<div class="tbl-scroll"><table class="cmp"><caption class="sr">Comparação lado a lado entre a proposta A e a proposta B</caption>
    <thead><tr><th scope="col">Critério</th><th scope="col">Proposta A</th><th scope="col">Proposta B</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="fine" style="margin:10px 0 0">${frase} Os destaques servem para discussão em grupo; não substituem a autorização formal.</p>`;
}
$("#cmpA").onchange=e=>{ S.cmp.a=e.target.value; persist(); renderCompare(); };
$("#cmpB").onchange=e=>{ S.cmp.b=e.target.value; persist(); renderCompare(); };
$("#cmpLast").onclick=()=>{
  if(S.propostas.length<2) return;
  const n=S.propostas.length; S.cmp.a=S.propostas[n-2].id; S.cmp.b=S.propostas[n-1].id; persist(); renderCompare(); toast("Comparando as 2 mais recentes");
};

/* ============ VALIDAÇÃO DA PROPOSTA (critério de aceite) ============ */
function validateProposal(){
  const a=actById(S.atividade), d=S.drafts[a.id], erros=[];
  const nome=(d.nome||"").trim();
  const sel=a.componente_ids.filter(cid=>d.comps[cid].on&&d.comps[cid].qtd>0);
  if(!nome) erros.push("Dê um nome à proposta (tela 3, campo “Nome da proposta”).");
  if(nome && obsHasPII(nome)) erros.push("O nome não pode conter e-mail, telefone ou documento.");
  if(sel.length===0) erros.push("Selecione pelo menos 1 componente com quantidade maior que zero.");
  if(sel.length>6) erros.push("Use no máximo 6 componentes.");
  if(obsHasPII(S.obs[a.id]||"")) erros.push("Remova dados pessoais ou localização da observação.");
  return {erros, sel, nome};
}
$("#btnSave").onclick=()=>{
  const m=$("#saveMsg"); const {erros, sel, nome}=validateProposal();
  if(erros.length){ m.className="alert err show"; m.innerHTML="<b>Não foi possível salvar.</b><ul style='margin:6px 0 0;padding-left:18px'>"+erros.map(e=>`<li>${esc(e)}</li>`).join("")+"</ul>"+(erros.some(e=>e.includes("nome")||e.includes("componente"))?`<button type="button" class="btn ghost" style="margin-top:8px" onclick="location.hash='#atividade'">Corrigir na tela 3</button>`:""); return; }
  const a=actById(S.atividade), d=S.drafts[a.id], ch=S.checks[a.id];
  const p = { id:"P"+Date.now().toString(36), nome, atividade_id:a.id, zona_id:a.zona_id,
    componentes: sel.map(cid=>({componente_id:cid, quantidade:d.comps[cid].qtd, subtotal:d.comps[cid].qtd*compById(cid).custo_estimado_didatico})),
    total: totalOf(a.id).tot, checklist:Object.assign({},ch),
    checklist_ok: DB.checklist.filter(i=>i.atividade_id===a.id&&ch[i.id]).length,
    observacao:(S.obs[a.id]||"").trim(), salvo_em:new Date().toISOString(), versao:VERSION };
  S.propostas.push(p); const ok=persist()!==false && store.ok;
  m.className="alert ok show"; m.innerHTML = ok ? `✅ Proposta “${esc(nome)}” salva. Ela continuará aqui mesmo após recarregar a página offline.` : "Proposta montada, mas o navegador bloqueou o armazenamento local.";
  renderSaved();
};
$("#btnClearAll").onclick=()=>{
  const b=$("#btnClearAll"); if(!b.dataset.confirm){ b.dataset.confirm="1"; b.textContent="Clique de novo para confirmar"; setTimeout(()=>{delete b.dataset.confirm;b.textContent="Limpar todas";},3000); return; }
  S.propostas=[]; S.cmp={a:"",b:""}; persist(); renderSaved(); delete b.dataset.confirm; b.textContent="Limpar todas"; toast("Propostas removidas");
};
async function copyText(t,label){ try{ await navigator.clipboard.writeText(t); toast(label+" copiado"); }catch(e){ toast("Cópia bloqueada — selecione o texto manualmente"); } }
$("#btnCopy").onclick=()=>{ const {a,z,d,t,np,comps}=summaryText();
  copyText(`PRAÇA EM AÇÃO — Centro de Aracaju / SE — Proposta de teste (ensaio pedagógico, não autoriza ocupação real)\nNome: ${d.nome||"(sem nome)"}\nAtividade: ${a.nome} (${a.duracao_min} min)\nZona: ${z.id} ${z.nome}\nComponentes: ${comps.join("; ")||"—"}\nTotal didático fictício: ${brl(t.tot)}\nPróximo cuidado: ${np?np.categoria+" — "+np.item:"todos confirmados"}\n${(S.obs[a.id]||"").trim()?"Obs.: "+S.obs[a.id]:""}`,"Resumo"); };

/* ============ TESTE COM PARTICIPANTES ============ */
let tLeft=180, tH=null;
function drawTimer(){ const m=Math.floor(Math.abs(tLeft)/60), s=Math.abs(tLeft)%60; $("#timer").textContent=(tLeft<0?"-":"")+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0"); $("#timer").classList.toggle("over",tLeft<0); }
$("#tStart").onclick=()=>{ if(tH) return; tH=setInterval(()=>{tLeft--; drawTimer();},1000); };
$("#tStop").onclick=()=>{ clearInterval(tH); tH=null; };
$("#tReset").onclick=()=>{ clearInterval(tH); tH=null; tLeft=180; drawTimer(); };
function renderValidacao(){
  $("#vtRows").innerHTML = S.validacao.map((v,i)=>`<div class="vt-row">
    <b class="vt-p">P${i+1}</b>
    <label><input type="checkbox" data-v="${i}" data-k="encontrou" ${v.encontrou?'checked':''}>Encontrou atividade</label>
    <label><input type="checkbox" data-v="${i}" data-k="custo" ${v.custo?'checked':''}>Consultou custo</label>
    <label><input type="checkbox" data-v="${i}" data-k="cuidado" ${v.cuidado?'checked':''}>Explicou cuidado</label>
    <label class="vt-time">⏱ <input type="text" data-v="${i}" data-k="tempo" value="${esc(v.tempo)}" placeholder="m:ss" aria-label="Tempo do participante ${i+1}"></label>
    <div class="vt-note"><input type="text" data-v="${i}" data-k="duvida" value="${esc(v.duvida)}" maxlength="140" placeholder="Dúvida ou comentário (sem dados pessoais)" aria-label="Dúvida ou comentário do participante ${i+1}"></div>
  </div>`).join("") + `<div class="row" style="margin-top:10px"><button type="button" class="btn ghost" id="vtFill">Usar tempo do cronômetro no próximo P vazio</button><button type="button" class="btn danger" id="vtClear">Zerar registros</button></div>`;
  document.querySelectorAll("#vtRows [data-v]").forEach(el=>{
    const ev = el.type==="checkbox"?"change":"input";
    el.addEventListener(ev,()=>{ const v=S.validacao[+el.dataset.v]; v[el.dataset.k]= el.type==="checkbox"?el.checked:el.value; persist(); kpis(); });
  });
  $("#vtFill").onclick=()=>{ const used=180-tLeft; const i=S.validacao.findIndex(v=>!v.tempo); if(i<0){toast("Todos os P já têm tempo");return;} S.validacao[i].tempo=`${Math.floor(used/60)}:${String(used%60).padStart(2,"0")}`; persist(); renderValidacao(); };
  $("#vtClear").onclick=()=>{ S.validacao=Array.from({length:5},()=>({encontrou:false,custo:false,cuidado:false,tempo:"",duvida:""})); persist(); renderValidacao(); };
  kpis();
}
function secs(t){ const m=/^(\d+):(\d{1,2})$/.exec((t||"").trim()); return m? (+m[1])*60+(+m[2]) : null; }
function kpis(){
  const ok=S.validacao.filter(v=>v.encontrou&&v.custo&&v.cuidado).length;
  const tm=S.validacao.filter(v=>v.encontrou&&v.custo&&v.cuidado&&secs(v.tempo)!==null&&secs(v.tempo)<=180).length;
  $("#kOk").textContent=ok+"/5"; $("#kTime").textContent=tm+"/5";
  const m=$("#kMsg"); if(tm>=4){ m.className="alert ok show"; m.textContent="🎯 Meta atingida: pelo menos 4 de 5 concluíram em até 3 minutos."; }
  else { m.className="alert warn show"; m.textContent=`Faltam ${4-tm} participante(s) concluindo em até 3 min para atingir a meta.`; }
}

/* ============ DADOS ============ */
function renderDados(){
  const base={atividades:DB.atividades.map(({px,py,cor,icone,tint,...r})=>r), componentes:DB.componentes, zonas:DB.zonas.map(({x,y,w,h,cor,...r})=>r), checklist:DB.checklist.slice(0,8).concat([{"...":`+${DB.checklist.length-8} itens (8 por atividade)`}])};
  $("#jsonBase").textContent=JSON.stringify(base,null,2);
  $("#btnCopyJson").onclick=()=>copyText(JSON.stringify({zonas:DB.zonas,atividades:DB.atividades,componentes:DB.componentes,checklist:DB.checklist},null,2),"JSON");
  $("#sqlSchema").textContent=`CREATE TABLE zona (
  id TEXT PRIMARY KEY, nome TEXT NOT NULL, descricao TEXT);

CREATE TABLE atividade (
  id TEXT PRIMARY KEY, nome TEXT NOT NULL, descricao TEXT,
  duracao_min INTEGER CHECK (duracao_min > 0),
  zona_id TEXT NOT NULL REFERENCES zona(id),
  requisito_acessibilidade TEXT,
  personalizada INTEGER DEFAULT 0);  -- 1 = criada pelo usuário

CREATE TABLE componente_fisico (
  id TEXT PRIMARY KEY,
  atividade_id TEXT NOT NULL REFERENCES atividade(id),
  nome TEXT NOT NULL,
  quantidade INTEGER CHECK (quantidade >= 0),
  custo_estimado_didatico REAL CHECK (custo_estimado_didatico >= 0),
  origem_reuso TEXT,
  personalizada INTEGER DEFAULT 0);

CREATE TABLE checklist (
  id TEXT PRIMARY KEY,
  atividade_id TEXT NOT NULL REFERENCES atividade(id),
  categoria TEXT CHECK (categoria IN ('Acessibilidade','Segurança','Autorização')),
  item TEXT NOT NULL,
  status TEXT DEFAULT 'a confirmar',
  observacao TEXT);

CREATE TABLE proposta (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  atividade_id TEXT NOT NULL REFERENCES atividade(id),
  zona_id TEXT NOT NULL REFERENCES zona(id),
  total REAL CHECK (total >= 0),
  checklist_ok INTEGER CHECK (checklist_ok >= 0),
  salvo_em TEXT);

-- total didático por atividade
SELECT a.nome, SUM(c.quantidade * c.custo_estimado_didatico) AS total
FROM atividade a JOIN componente_fisico c ON c.atividade_id = a.id
GROUP BY a.id;

-- comparar duas propostas salvas
SELECT p.nome, a.nome AS atividade, z.nome AS zona, p.total, p.checklist_ok
FROM proposta p
JOIN atividade a ON a.id = p.atividade_id
JOIN zona z ON z.id = p.zona_id
WHERE p.id IN (:proposta_a, :proposta_b);`;
  // integridade
  const checks=[];
  const nCustom=DB.atividades.filter(a=>a.personalizada).length;
  checks.push([["A1","A2","A3"].every(id=>actById(id)),"Atividades padrão A1–A3 presentes"]);
  checks.push([nCustom<=CUSTOM.MAX_ATIVIDADES,`Atividades criadas por você: ${nCustom} (máx. ${CUSTOM.MAX_ATIVIDADES})`]);
  checks.push([DB.zonas.length<=3,"Até 3 zonas na maquete"]);
  checks.push([DB.zonas.every(z=>zoneCount(z.id)<=CUSTOM.MAX_POR_ZONA),`Até ${CUSTOM.MAX_POR_ZONA} atividades por zona`]);
  checks.push([DB.atividades.every(a=>a.componente_ids.length<=6),"Cada atividade com até 6 componentes"]);
  checks.push([DB.atividades.every(a=>a.componente_ids.every(cid=>{const c=compById(cid);return c&&c.atividade_id===a.id;})),"Todo componente_ids aponta para componente da mesma atividade"]);
  checks.push([DB.atividades.every(a=>zonaById(a.zona_id)),"Toda atividade aponta para zona existente"]);
  checks.push([DB.atividades.every(a=>DB.checklist.filter(c=>c.atividade_id===a.id).length<=8),"Checklist com até 8 itens por atividade"]);
  checks.push([DB.componentes.every(c=>c.custo_estimado_didatico>=0&&c.quantidade>=0),"Custos e quantidades não negativos"]);
  checks.push([DB.checklist.every(c=>c.status===((S.checks[c.atividade_id]||{})[c.id]?"confirmado":"a confirmar")),"Status do checklist igual ao que está salvo no navegador"]);
  $("#integrity").innerHTML=checks.map(([ok,t])=>`<div>${ok?"✅":"❌"} ${t}</div>`).join("");
}

/* ============ ROTEAMENTO (hash) E INICIALIZAÇÃO ============ */
const VIEWS=["inicio","maquete","atividade","checklist","validacao","dados","criar"];
function route(){
  const h=(location.hash||"#inicio").slice(1); const v=VIEWS.includes(h)?h:"inicio";
  VIEWS.forEach(x=>$("#v-"+x).classList.toggle("active",x===v));
  const navKey = v==="criar" ? "atividade" : v;     // a tela "criar" fica sob a etapa 3
  document.querySelectorAll("nav.steps a").forEach(a=>{ if(a.dataset.v===navKey) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current"); });
  if(v==="dados") renderDados();
  window.scrollTo({top:0});
}
function renderAll(){ renderCards(); renderMaquete(); renderAtividade(); renderChecklist(); }
window.addEventListener("hashchange",route);
$("#ver").textContent=VERSION;
function net(){ $("#netBadge").textContent = navigator.onLine ? "● online (funciona offline)" : "● offline"; }
window.addEventListener("online",net); window.addEventListener("offline",net); net();
renderAll(); renderValidacao(); renderDados(); drawTimer(); route();
