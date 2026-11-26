/* ============================================================
   T4 | Praça em Ação — Centro de Aracaju / SE
   Base de dados fictícia (JSON local, embutido em JS para
   funcionar offline até abrindo o index.html direto do disco)
   ============================================================ */
const VERSION = "2.1.1-aracaju";

const DB = {
  zonas: [
    {id:"Z1", nome:"Sombra das Amendoeiras", descricao:"Área arborizada e silenciosa, ideal para pausa e leitura.", cor:"var(--z1)", x:40, y:130, w:220, h:105},
    {id:"Z2", nome:"Pátio Central", descricao:"Área plana de alto fluxo, boa para jogos e convivência.", cor:"var(--z2)", x:330, y:130, w:230, h:105},
    {id:"Z3", nome:"Muro Cultural e Entradas", descricao:"Painel liso perto das entradas, ideal para arte coletiva e exposição.", cor:"var(--z3)", x:40, y:268, w:520, h:100}
  ],
  atividades: [
    {id:"A1", nome:"Estação de Leitura e Cordel", icone:"📚", cor:"#1f6b44", zona_id:"Z1", px:150, py:185,
     descricao:"Caixotes com cordéis e livros doados, almofadas e varal de cordéis na sombra das amendoeiras.",
     duracao_min:40, componente_ids:["C1","C2","C3","C4","C5","C6"],
     requisito_acessibilidade:"Cordéis e livros ao alcance de cadeirantes (altura até 1,20 m) e caminho livre e plano até a sombra."},
    {id:"A2", nome:"Jogos de Mesa Tradicionais", icone:"♟️", cor:"#1e5a8a", zona_id:"Z2", px:445, py:185,
     descricao:"Dama e xadrez para idosos e trabalhadores do Centro jogarem em dupla, com tabuleiros e peças reaproveitados.",
     duracao_min:50, componente_ids:["C7","C8","C9","C10","C11","C12"],
     requisito_acessibilidade:"Mesa com vão livre para cadeira de rodas, assentos com apoio e peças grandes com contraste."},
    {id:"A3", nome:"Mural Coletivo Sergipano", icone:"🎨", cor:"#7a4e0c", zona_id:"Z3", px:300, py:318,
     descricao:"Painel de papelão móbile no muro para arte coletiva com giz e canetinhas sobre temas sergipanos.",
     duracao_min:45, componente_ids:["C13","C14","C15","C16","C17","C18"],
     requisito_acessibilidade:"Faixa do painel em altura baixa e média; giz e canetas com empunhadura larga."}
  ],
  componentes: [
    {id:"C1", atividade_id:"A1", nome:"Caixote de feira (estante de cordéis)", quantidade:4, custo_estimado_didatico:0, origem_reuso:"Reuso — doação de feirantes"},
    {id:"C2", atividade_id:"A1", nome:"Cordéis e livros doados", quantidade:30, custo_estimado_didatico:0, origem_reuso:"Reuso — campanha de doação"},
    {id:"C3", atividade_id:"A1", nome:"Almofada de retalho de tecido", quantidade:6, custo_estimado_didatico:5, origem_reuso:"Reuso parcial — retalhos"},
    {id:"C4", atividade_id:"A1", nome:"Esteira / tapete de lona", quantidade:1, custo_estimado_didatico:15, origem_reuso:"Novo (fictício)"},
    {id:"C5", atividade_id:"A1", nome:"Placa “Leia, troque e devolva”", quantidade:1, custo_estimado_didatico:3, origem_reuso:"Papelão + impressão"},
    {id:"C6", atividade_id:"A1", nome:"Varal de cordéis (barbante e pregadores)", quantidade:1, custo_estimado_didatico:4, origem_reuso:"Reuso parcial — barbante"},
    {id:"C7", atividade_id:"A2", nome:"Mesa dobrável emprestada", quantidade:3, custo_estimado_didatico:0, origem_reuso:"Empréstimo (confirmar com o responsável)"},
    {id:"C8", atividade_id:"A2", nome:"Tabuleiro de papelão (dama e xadrez)", quantidade:3, custo_estimado_didatico:2, origem_reuso:"Reuso — papelão"},
    {id:"C9", atividade_id:"A2", nome:"Kit de peças (tampinhas PET)", quantidade:3, custo_estimado_didatico:0, origem_reuso:"Reuso — tampinhas PET"},
    {id:"C10", atividade_id:"A2", nome:"Banco ou cadeira", quantidade:6, custo_estimado_didatico:0, origem_reuso:"Empréstimo (confirmar com o responsável)"},
    {id:"C11", atividade_id:"A2", nome:"Cartaz de regras ilustrado", quantidade:3, custo_estimado_didatico:2, origem_reuso:"Impressão opcional"},
    {id:"C12", atividade_id:"A2", nome:"Caixa organizadora", quantidade:1, custo_estimado_didatico:10, origem_reuso:"Novo (fictício)"},
    {id:"C13", atividade_id:"A3", nome:"Painel de papelão móbile (1 m²)", quantidade:4, custo_estimado_didatico:0, origem_reuso:"Reuso — caixas grandes"},
    {id:"C14", atividade_id:"A3", nome:"Fita crepe larga", quantidade:2, custo_estimado_didatico:8, origem_reuso:"Novo (fictício)"},
    {id:"C15", atividade_id:"A3", nome:"Giz grosso (caixa)", quantidade:3, custo_estimado_didatico:7, origem_reuso:"Novo (fictício)"},
    {id:"C16", atividade_id:"A3", nome:"Canetinha lavável (kit)", quantidade:2, custo_estimado_didatico:12, origem_reuso:"Novo (fictício)"},
    {id:"C17", atividade_id:"A3", nome:"Etiqueta de tema do dia", quantidade:5, custo_estimado_didatico:1, origem_reuso:"Reuso — folha de rascunho + impressão"},
    {id:"C18", atividade_id:"A3", nome:"Lona de proteção do piso", quantidade:1, custo_estimado_didatico:0, origem_reuso:"Reuso — sobra de obra"}
  ],
  checklistModelo: [
    {cod:"K1", categoria:"Acessibilidade", item:"Caminho livre e plano (rampa ou calçada sem degraus, buracos ou cabos no chão) até a atividade."},
    {cod:"K2", categoria:"Acessibilidade", item:"Materiais ao alcance de pessoa em cadeira de rodas, idosos e crianças."},
    {cod:"K3", categoria:"Acessibilidade", item:"Placas com letra grande, alto contraste e ícone."},
    {cod:"K4", categoria:"Segurança", item:"Nenhum objeto pontiagudo, instável ou pesado ao alcance; sem bloquear o fluxo de pedestres."},
    {cod:"K5", categoria:"Segurança", item:"Sombra, água e plano para chuva ou sol forte."},
    {cod:"K6", categoria:"Segurança", item:"Adulto responsável presente e guarda dos materiais ao final do ensaio."},
    {cod:"K7", categoria:"Autorização", item:"Uso do espaço confirmado com o órgão responsável pela praça (data e horário)."},
    {cod:"K8", categoria:"Autorização", item:"Empréstimo de mobiliário e uso de imagens/materiais com fonte registrada."}
  ]
};

/* Gera Checklist com atividade_id (modelo de dados do projeto) */
DB.checklist = [];
DB.atividades.forEach(a => DB.checklistModelo.forEach(m => DB.checklist.push({
  id:`${a.id}-${m.cod}`, atividade_id:a.id, categoria:m.categoria, item:m.item, status:"a confirmar", observacao:""
})));
