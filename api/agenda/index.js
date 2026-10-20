// /api/agenda — cria automaticamente o compromisso no Microsoft 365 (Graph app-only)
// quando uma tarefa é criada no CRM.
//  - QUEM EMITE é sempre o usuário logado (a caixa dele); responsável e participantes entram como
//    convidados e recebem o convite. Reunião -> reunião ONLINE do Teams.
//  - O corpo do evento traz o resumo do card + link que abre o card no S.I.G.E.
//    (dados lidos do Kanban pelo cardId; o que o navegador mandou serve de reserva).
//  - Em caso de erro devolve {ok:false, error:<mensagem clara>, detalhe:<erro bruto>} — a tela mostra o aviso.
//  - body.dryRun=true devolve o evento montado sem gravar nada (usado para conferir o layout).
// Requer no app Entra a permissão Graph "Calendars.ReadWrite" (Application) + consentimento.
const g = require('../_shared/graph');
const { LISTS, fromFields } = require('../_shared/schema');
const { json, requireDomain, readUser } = require('../_shared/crud');
const A = require('../_shared/agenda');

async function resumoDoCard(b) {
  const card = {
    id: String(b.cardId || '').trim(), cliente: b.cliente, unidade: b.unidade, serv: b.servico, valor: b.valor,
    status: b.status, subEtapa: b.subEtapa, cons: b.cons, contato: b.contato, contatoEmail: b.contatoEmail, telefone: b.telefone,
  };
  if (card.id) {
    try {
      const { id: listId } = await g.ensureList(LISTS.leads);
      const itens = await g.listItemsMeta(listId);
      const it = itens.find(r => String(r.id) === card.id);
      if (it) {
        const l = fromFields('leads', it.fields);
        const pick = (novo, velho) => (novo !== null && novo !== undefined && novo !== '') ? novo : velho;
        card.cliente = pick(l.cliente, card.cliente); card.unidade = pick(l.unidade, card.unidade);
        card.serv = pick(l.serv, card.serv); card.valor = pick(l.valor, card.valor);
        card.status = pick(l.status, card.status); card.subEtapa = pick(l.subEtapa, card.subEtapa);
        card.cons = pick(l.cons, card.cons); card.contato = pick(l.nome, card.contato);
        card.contatoEmail = pick(l.email, card.contatoEmail); card.telefone = pick(l.tel || l.telefone, card.telefone);
      }
    } catch (e) { /* sem o Kanban, segue com o que a tela mandou */ }
  }
  return card;
}

module.exports = async function (context, req) {
  let user = '';
  try {
    if (!requireDomain(context, req)) return;
    user = String(readUser(req) || '').toLowerCase();
    if (!user || !user.endsWith('@elevalife.com.br')) {
      context.res = json(401, { ok: false, error: 'login @elevalife.com.br necessário para criar o compromisso' }); return;
    }
    const b = req.body || {};
    const card = await resumoDoCard(b);
    const r = await A.criarEvento({
      organizador: user, tipo: b.tipo, titulo: b.titulo, inicioLocal: b.inicioLocal, duracaoMin: b.duracaoMin,
      responsavelEmail: b.responsavelEmail || b.email, participantes: b.participantes, conteudo: b.conteudo,
      card, dryRun: b.dryRun === true,
    });
    context.res = json(r.dryRun ? 200 : 201, r);
  } catch (e) {
    context.res = json(e.status || 500, { ok: false, error: A.explicarErro(e, user || 'usuário'), detalhe: String((e && e.message) || e), body: e && e.body });
  }
};
