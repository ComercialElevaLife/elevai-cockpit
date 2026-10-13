// /api/propostas-assinatura — assinatura de e-mail do usuário logado (@elevalife.com.br)
//   GET  -> { ok, email, tem, nome, cargo, origem, preview }  (preview = data URL da imagem, quando houver)
//           Sem assinatura cadastrada: marca o usuário como pendente na pasta de assinaturas (SharePoint).
//   POST { imagemBase64, nome, cargo } -> cadastra/atualiza a assinatura do PRÓPRIO usuário (JPG/PNG até 700 KB).
const A = require('../_shared/assinatura');
const { json, requireDomain, readUser } = require('../_shared/crud');

function resposta(s) {
  return { ok: true, email: s.email, tem: !!s.tem, nome: s.nome, cargo: s.cargo, origem: s.origem, preview: s.tem ? 'data:' + s.mime + ';base64,' + s.b64 : '' };
}

module.exports = async function (context, req) {
  try {
    if (!requireDomain(context, req)) return;
    const user = String(readUser(req) || '').toLowerCase();
    if (!user || !user.endsWith('@elevalife.com.br')) { context.res = json(401, { ok: false, error: 'login @elevalife.com.br necessário' }); return; }
    if (req.method === 'POST') {
      const b = req.body || {};
      const buf = Buffer.from(String(b.imagemBase64 || '').replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
      await A.salvar(user, buf, { nome: b.nome, cargo: b.cargo });
      context.res = json(201, resposta(await A.obter(user, { log: (m) => context.log(m) })));
      return;
    }
    const s = await A.obter(user, { log: (m) => context.log(m) });
    if (!s.tem) { try { await A.marcarPendente(user); } catch (e) { context.log('pendente: ' + (e.message || e)); } }
    context.res = json(200, resposta(s));
  } catch (e) {
    context.res = json(e.status || 500, { ok: false, error: String(e.message || e) });
  }
};
