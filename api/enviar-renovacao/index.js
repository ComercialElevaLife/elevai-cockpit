// /api/enviar-renovacao — envia a minuta de renovação por e-mail (Graph app-only, sendMail)
//  TO  = responsável do contrato   |   CC (fixo) = leonardo@ + rafael@elevalife.com.br
// Requer no app Entra a permissão Graph "Mail.Send" (Application) + consentimento.
const g = require('../_shared/graph');
const { json } = require('../_shared/crud');

const SENDER  = process.env.RENOV_SENDER || 'leonardo@elevalife.com.br';
const CC_FIXO = (process.env.RENOV_CC || 'leonardo@elevalife.com.br,rafael@elevalife.com.br')
                  .split(',').map(s => s.trim()).filter(Boolean);

function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function nl2br(s){ return esc(s).replace(/\r?\n/g,'<br>'); }
function addr(a){ return { emailAddress: { address: String(a).trim() } }; }

module.exports = async function (context, req) {
  try {
    const b = req.body || {};
    const to = String(b.para || '').trim();
    if (!to || to.indexOf('@') < 0) { context.res = json(400, { ok:false, error:'sem e-mail válido do responsável (campo "para")' }); return; }

    const assunto = (b.assunto && String(b.assunto).trim()) || 'Renovação de contrato — ElevaLife';
    const corpoHtml = b.corpoHtml ? String(b.corpoHtml) : nl2br(b.corpo || '');

    // CC = fixos + extras informados, sem duplicar o destinatário
    const extra = String(b.cc || '').split(',').map(s => s.trim()).filter(Boolean);
    const cc = Array.from(new Set(CC_FIXO.concat(extra)))
                 .filter(a => a.toLowerCase() !== to.toLowerCase());

    const msg = {
      message: {
        subject: assunto,
        body: { contentType: 'HTML', content: corpoHtml },
        toRecipients: [ addr(to) ],
        ccRecipients: cc.map(addr),
      },
      saveToSentItems: true,
    };
    await g.graph('POST', '/users/' + encodeURIComponent(SENDER) + '/sendMail', msg);
    context.res = json(200, { ok:true, de: SENDER, para: to, cc });
  } catch (e) {
    context.res = json(e.status || 500, { ok:false, error:String(e.message || e), body:e.body });
  }
};
