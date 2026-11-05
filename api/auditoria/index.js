// /api/auditoria
//  POST: o navegador avisa uma ação que só ele sabe (ex.: baixou relatório). Só ações da lista abaixo; usuário/hora/IP são carimbados aqui.
//  GET : tela de revisão, SÓ para os revisores (Léo, Rafael e João). Filtros: usuario, acao, desde, ate (AAAA-MM-DD), limite.
// Nenhuma rota edita ou apaga linhas desta lista.
const { LISTS } = require('../_shared/schema');
const g = require('../_shared/graph');
const A = require('../_shared/auditoria');
const { json, requireDomain, readUser } = require('../_shared/crud');

const REVISORES = ['leonardo@elevalife.com.br', 'rafael@elevalife.com.br', 'joao@elevalife.com.br'];
const ACOES_DA_TELA = new Set(['baixou', 'exportou', 'imprimiu', 'enviou', 'tarefa']);

function fromF(f) { const o = {}; LISTS.auditoria.columns.forEach(c => { o[c.name] = f[c.name] == null ? '' : f[c.name]; }); return o; }

module.exports = async function (context, req) {
  try {
    if (!requireDomain(context, req)) return;
    const usuario = String(readUser(req) || '').toLowerCase();
    if (!usuario) { context.res = json(401, { ok: false, error: 'faça login' }); return; }
    const method = (req.method || 'GET').toUpperCase();
    if (method === 'POST') {
      const b = req.body || {};
      const acao = String(b.acao || '');
      if (!ACOES_DA_TELA.has(acao)) { context.res = json(400, { ok: false, error: 'ação inválida' }); return; }
      const r = await A.registrar(req, acao, { entidade: b.entidade, registroId: b.registroId, registroNome: b.registroNome, resumo: b.resumo, detalhe: b.detalhe, origem: 'tela' });
      context.res = json(r.ok ? 200 : 503, { ok: r.ok });
      return;
    }
    if (method !== 'GET') { context.res = json(405, { ok: false, error: 'método não suportado' }); return; }
    if (REVISORES.indexOf(usuario) < 0) { context.res = json(403, { ok: false, error: 'acesso restrito aos revisores da auditoria' }); return; }
    const q = req.query || {};
    const re = /^\d{4}-\d{2}-\d{2}$/;
    const desde = re.test(q.desde || '') ? q.desde : new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const ate = re.test(q.ate || '') ? q.ate : '';
    const { id } = await g.ensureList(LISTS.auditoria);
    let filtro = "fields/quando ge '" + desde + "'";
    if (ate) filtro += " and fields/quando le '" + ate + "T23:59:59.999Z'";
    const itens = await g.listItemsFiltered(id, filtro, 5000);
    let rows = itens.map(it => fromF(it.fields));
    if (q.usuario) rows = rows.filter(r => r.usuario.toLowerCase().indexOf(String(q.usuario).toLowerCase()) >= 0);
    if (q.acao) rows = rows.filter(r => r.acao === q.acao);
    rows.sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
    const limite = Math.min(Math.max(parseInt(q.limite, 10) || 500, 1), 2000);
    context.res = json(200, { ok: true, count: rows.length, items: rows.slice(0, limite) });
  } catch (e) {
    context.res = json(e.status || 500, { ok: false, error: String(e.message || e) });
  }
};
