// /api/agenda — cria automaticamente o compromisso no Microsoft 365 (Graph app-only)
// quando uma tarefa e criada no CRM.
//  - Reuniao  -> evento com reuniao ONLINE do Teams + convida participantes
//  - Tarefa/Ligacao/WhatsApp -> evento (lembrete) no calendario do responsavel, que ja
//    dispara o convite por e-mail (o responsavel entra como participante).
// Requer no app Entra a permissao Graph "Calendars.ReadWrite" (Application) + consentimento.
const g = require('../_shared/graph');
const { json } = require('../_shared/crud');

const TZ = 'E. South America Standard Time'; // Brasilia

function computeEnd(startLocal, mins) {
  const m = String(startLocal || '').match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return startLocal;
  let d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  d = new Date(d.getTime() + (mins || 30) * 60000);
  const p = n => String(n).padStart(2, '0');
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + 'T' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes());
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function buildBody(b) {
  return '<b>' + esc(b.tipo || 'Tarefa') + '</b> — ' + esc(b.titulo || '') + '<br>' +
    'Lead: ' + esc(b.cliente || '') + (b.unidade ? ' - ' + esc(b.unidade) : '') + '<br>' +
    (b.servico ? 'Serviço: ' + esc(b.servico) + '<br>' : '') +
    (b.valor ? 'Valor: R$ ' + esc(b.valor) + '<br>' : '') +
    (b.conteudo ? '<br>' + esc(b.conteudo) : '') +
    '<br><br><i>Criado automaticamente pelo ElevAI Cockpit.</i>';
}

module.exports = async function (context, req) {
  try {
    const b = req.body || {};
    const tipo = b.tipo || 'Tarefa';
    const mailbox = String(b.organizador || b.responsavelEmail || '').trim();
    const start = String(b.inicioLocal || '');
    if (!mailbox) { context.res = json(400, { ok: false, error: 'sem e-mail do responsável/organizador' }); return; }
    if (start.length < 16) { context.res = json(400, { ok: false, error: 'sem data/hora' }); return; }
    const dur = (tipo === 'Reunião') ? (parseInt(b.duracaoMin, 10) || 30) : 30;
    const end = computeEnd(start, dur);

    // participantes
    const seen = {}; const attendees = [];
    const push = a => { a = String(a || '').trim(); if (a && !seen[a.toLowerCase()]) { seen[a.toLowerCase()] = 1; attendees.push({ emailAddress: { address: a }, type: 'required' }); } };
    if (tipo !== 'Reunião') push(mailbox); // tarefa/ligacao/wa: responsavel recebe convite/e-mail
    String(b.participantes || '').split(',').forEach(push);

    const reminderMin = (tipo === 'Reunião' || tipo === 'Ligação') ? 15 : 60;
    const ev = {
      subject: '[' + tipo + '] ' + (b.titulo || 'ElevaLife'),
      body: { contentType: 'HTML', content: buildBody(b) },
      start: { dateTime: start + ':00', timeZone: TZ },
      end: { dateTime: end + ':00', timeZone: TZ },
      isReminderOn: true, reminderMinutesBeforeStart: reminderMin,
      attendees
    };
    if (tipo === 'Reunião') { ev.isOnlineMeeting = true; ev.onlineMeetingProvider = 'teamsForBusiness'; }

    const created = await g.graph('POST', '/users/' + encodeURIComponent(mailbox) + '/events', ev);
    context.res = json(201, {
      ok: true, id: created.id, tipo,
      webLink: created.webLink || null,
      joinUrl: (created.onlineMeeting && created.onlineMeeting.joinUrl) || null
    });
  } catch (e) {
    context.res = json(e.status || 500, { ok: false, error: String(e.message || e), body: e.body });
  }
};
