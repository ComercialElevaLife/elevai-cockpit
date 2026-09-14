// 14/09/2026 -- Leo: rota de leitura p/ o "Scan de renovacoes" (Claude, roda 1x/dia num runner do
// GitHub Actions, sem sessao AAD). GET /api/contratos ja existe mas cai na regra generica
// "/api/*": allowedRoles authenticated do staticwebapp.config.json -- exige login Microsoft, que um
// runner anonimo nao tem. Abrir /api/contratos pra leitura anonima exporia nome de cliente, valor de
// contrato (valorPadrao) e status de renovacao dos ~90 contratos pra qualquer um com a URL, sem
// senha. Em vez disso, esta rota e anonima na plataforma (staticwebapp.config.json) mas exige um
// token secreto proprio (header X-Sync-Token), comparado aqui contra a app setting
// CONTRATOS_SYNC_TOKEN -- so quem tem o token (guardado como GitHub Actions secret, nunca aparece
// no codigo) consegue ler. Somente leitura (GET), nunca grava nada.
const { LISTS, fromFields } = require('../_shared/schema');
const g = require('../_shared/graph');

function json(status, body) {
  return { status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

module.exports = async function (context, req) {
  try {
    const expected = process.env.CONTRATOS_SYNC_TOKEN || '';
    const got = (req.headers && (req.headers['x-sync-token'] || req.headers['X-Sync-Token'])) || '';
    if (!expected || got !== expected) {
      context.res = json(401, { ok: false, error: 'token invalido ou ausente' });
      return;
    }
    const def = LISTS.contratos;
    const { id: listId } = await g.ensureList(def);
    const raw = await g.listItemsMeta(listId);
    const items = raw.map(r => Object.assign({ __id: r.id }, fromFields('contratos', r.fields)));
    context.res = json(200, { ok: true, kind: 'contratos', count: items.length, items });
  } catch (e) {
    context.res = json(e.status || 500, { ok: false, error: String(e.message || e) });
  }
};

