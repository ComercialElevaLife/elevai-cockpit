// /api/solicitar-telefones — pede ao time, por e-mail, o telefone corporativo (ou o usado nas tarefas da ElevaLife).
//  - Remetente: caixa sige@elevalife.com.br (SIGE_SENDER); o "responder para" é quem disparou.
//  - Só dispara quem estiver em QUEM_PODE (login @elevalife.com.br) e só para a lista fixa abaixo.
//  - Sem body.confirmar === true NADA é enviado: devolve a lista e o texto (ensaio).
//  - Requer Mail.Send (Application), o mesmo já usado em /api/propostas-enviar.
const g = require('../_shared/graph');
const { json, requireDomain, readUser } = require('../_shared/crud');

const SENDER = process.env.SIGE_SENDER || 'sige@elevalife.com.br';
const QUEM_PODE = ['leonardo@elevalife.com.br', 'rafael@elevalife.com.br'];
const TIME = [
  ['João Barbosa', 'joao@elevalife.com.br'], ['Rafael Piacenti', 'rafael@elevalife.com.br'],
  ['Alexandre Gondin Berloffa', 'alexandre.berloffa@elevalife.com.br'], ['Cristiano Goulart', 'cristiano@elevalife.com.br'],
  ['Clara Monteiro', 'clara@elevalife.com.br'], ['Dhanilo Cruz', 'dhanilo@elevalife.com.br'],
  ['Gisleiny Ribeiro', 'gisleiny@elevalife.com.br'], ['Daniele Cunha', 'daniele.cunha@elevalife.com.br'],
  ['Geovane Oliveira', 'geovane@elevalife.com.br'], ['William Lima', 'william@elevalife.com.br'],
  ['Gabriele Paes', 'gabrielepaes@elevalife.com.br'], ['Gabriela Santos', 'auxiliardeoperacoes@elevalife.com.br'],
];
const ASSUNTO = 'Atualização cadastral — telefone corporativo (ElevaLife)';

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function corpo(nome, quem) {
  const p = 'font-size:14.5px;line-height:1.65;margin:0 0 14px;color:#3a2a2e';
  return '<div style="font-family:Montserrat,Segoe UI,Arial,sans-serif;max-width:620px;color:#3a2a2e">' +
    '<div style="background:#5e2a30;color:#fff;padding:18px 24px;border-radius:10px 10px 0 0"><div style="font-weight:700;font-size:17px">Atualização cadastral</div>' +
    '<div style="font-size:12px;opacity:.85">S.I.G.E. · ElevaLife</div></div>' +
    '<div style="border:1px solid #eaddE0;border-top:none;border-radius:0 0 10px 10px;padding:22px 24px;background:#fff">' +
    '<p style="' + p + '">Olá, ' + esc(nome.split(' ')[0]) + ', tudo bem?</p>' +
    '<p style="' + p + '">Estamos atualizando o cadastro do time no S.I.G.E., o sistema de gestão da ElevaLife. Precisamos do seu <b>telefone corporativo</b> ou, se não houver, do número que você usa para as tarefas e o contato com clientes da ElevaLife.</p>' +
    '<p style="' + p + '">Esse número aparece no último slide ("Obrigado!") das propostas geradas em seu nome.</p>' +
    '<p style="' + p + '">Para responder, basta responder este e-mail com o número no formato <b>(11) 9XXXX-XXXX</b>.</p>' +
    '<p style="' + p + '">Obrigado!</p>' +
    '<p style="font-size:12px;color:#8a7a78;margin:0;border-top:1px solid #eaddE0;padding-top:10px">Solicitação feita por ' + esc(quem) + ' pelo S.I.G.E.</p>' +
    '</div></div>';
}

module.exports = async function (context, req) {
  try {
    if (!requireDomain(context, req)) return;
    const user = String(readUser(req) || '').toLowerCase();
    if (QUEM_PODE.indexOf(user) < 0) { context.res = json(403, { ok: false, error: 'sem permissão para este envio' }); return; }
    const b = req.body || {};
    if (b.confirmar !== true) {
      context.res = json(200, { ok: true, ensaio: true, remetente: SENDER, responderPara: user, assunto: ASSUNTO, destinatarios: TIME.map(t => t[1]), exemplo: corpo(TIME[0][0], user) });
      return;
    }
    const resultados = [];
    for (const [nome, email] of TIME) {
      try {
        await g.graph('POST', '/users/' + encodeURIComponent(SENDER) + '/sendMail', {
          message: {
            subject: ASSUNTO, body: { contentType: 'HTML', content: corpo(nome, user) },
            toRecipients: [{ emailAddress: { address: email } }], replyTo: [{ emailAddress: { address: user } }],
          },
          saveToSentItems: true,
        });
        resultados.push({ email, ok: true });
      } catch (e) { resultados.push({ email, ok: false, erro: String((e && e.message) || e).slice(0, 200) }); }
    }
    context.res = json(200, { ok: resultados.every(r => r.ok), remetente: SENDER, resultados });
  } catch (e) {
    context.res = json(e.status || 500, { ok: false, error: String((e && e.message) || e) });
  }
};
