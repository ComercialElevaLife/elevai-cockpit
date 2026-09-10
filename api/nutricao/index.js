// /api/nutricao — avisa a responsável pelo fluxo de nutrição (Clara) quando um lead é PAUSADO (esfriou).
// Envia e-mail via Graph sendMail (Mail.Send). Destinatário configurável via NUTRICAO_TO.
const g = require('../_shared/graph');
const { json, requireDomain } = require('../_shared/crud');

const SENDER = process.env.RENOV_SENDER || 'leonardo@elevalife.com.br';
const TO      = process.env.NUTRICAO_TO || 'clara@elevalife.com.br';
// cópia fixa (Léo acompanha as negociações pausadas). Configurável via NUTRICAO_CC.
const CC      = (process.env.NUTRICAO_CC || 'leonardo@elevalife.com.br')
                  .split(',').map(s => s.trim()).filter(Boolean)
                  .filter(a => a.toLowerCase() !== TO.toLowerCase());

function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

module.exports = async function (context, req) {
  try {
    if (!requireDomain(context, req)) return;
    const l = req.body || {};
    const to = (l.to && String(l.to).trim()) || TO;   // destinatário editável (fallback: Clara)
    const html =
      '<p>O lead abaixo foi <b>PAUSADO (esfriou)</b> no ElevAI Cockpit e precisa <b>entrar no fluxo de nutrição</b>:</p>' +
      '<ul>' +
      '<li><b>Cliente:</b> ' + esc(l.cliente) + (l.unidade ? ' — ' + esc(l.unidade) : '') + '</li>' +
      '<li><b>Contato:</b> ' + esc([l.nome, l.contatoSobrenome].filter(Boolean).join(' ') || '—') + '</li>' +
      (l.email ? '<li><b>E-mail do contato:</b> ' + esc(l.email) + '</li>' : '') +
      (l.telefone ? '<li><b>Telefone do contato:</b> ' + esc(l.telefone) + '</li>' : '') +
      '<li><b>Serviço:</b> ' + esc(l.serv || '—') + '</li>' +
      '<li><b>Consultor:</b> ' + esc(l.cons || '—') + '</li>' +
      (l.valor ? '<li><b>Valor proposto:</b> R$ ' + esc(l.valor) + '</li>' : '') +
      '</ul>' +
      '<p><i>Aviso automático do ElevAI Cockpit.</i></p>';
    const msg = {
      message: {
        subject: '[Nutrição] Lead pausado — ' + (l.cliente || 'ElevaLife'),
        body: { contentType: 'HTML', content: html },
        toRecipients: [{ emailAddress: { address: to } }],
        ccRecipients: CC.filter(a => a.toLowerCase() !== to.toLowerCase()).map(a => ({ emailAddress: { address: a } })),
      },
      saveToSentItems: true,
    };
    await g.graph('POST', '/users/' + encodeURIComponent(SENDER) + '/sendMail', msg);
    context.res = json(200, { ok: true, to: to, cc: CC });
  } catch (e) {
    context.res = json(e.status || 500, { ok: false, error: String(e.message || e), body: e.body });
  }
};
