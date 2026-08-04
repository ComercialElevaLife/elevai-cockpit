// /api/lead-publico — endpoint PÚBLICO (anônimo) para captura de leads via Landing Page (eventos).
// Só aceita POST e só CRIA lead (nunca lê/edita/apaga a base). Defaults seguros no servidor.
const { LISTS, toFields } = require('../_shared/schema');
const g = require('../_shared/graph');
const { json } = require('../_shared/crud');

module.exports = async function (context, req) {
  try {
    if ((req.method || '').toUpperCase() !== 'POST') { context.res = json(405, { ok: false, error: 'somente POST' }); return; }
    const b = req.body || {};
    if (b.website) { context.res = json(200, { ok: true }); return; } // honeypot anti-bot (campo oculto)
    const cliente = String(b.cliente || '').trim();
    const nome    = String(b.nome || '').trim();
    if (!cliente && !nome) { context.res = json(400, { ok: false, error: 'Informe ao menos empresa ou contato.' }); return; }
    const now = new Date();
    const rec = {
      dt: now.toISOString().slice(0, 10), y: now.getUTCFullYear(), m: now.getUTCMonth() + 1,
      nome, cliente: cliente || nome,
      unidade: String(b.unidade || '').trim(),
      fonte: (String(b.fonte || '').trim() || 'Evento'),
      campanha: String(b.campanha || '').trim(),
      icp: (String(b.icp || '').trim() || 'NA'),
      cons: String(b.cons || '').trim(),
      serv: String(b.serv || '').trim(),
      prop: 'NÃO', valor: 0, tipo: 'N/A', tc: 'NOVO', status: 'NÃO ENVIADA',
      telefone: String(b.telefone || '').trim(),
      email: String(b.email || '').trim(),
      obs: String(b.obs || '').trim(),
    };
    const { id } = await g.ensureList(LISTS.leads);
    const created = await g.addItem(id, toFields('leads', rec));
    context.res = json(201, { ok: true, id: created.id });
  } catch (e) {
    context.res = json(e.status || 500, { ok: false, error: String(e.message || e) });
  }
};
