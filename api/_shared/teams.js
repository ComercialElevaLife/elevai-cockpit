// _shared/teams.js — aviso no Teams (sino de Atividade) para tarefas/reuniões criadas no S.I.G.E.
// Usa Microsoft Graph app-only: teamwork/sendActivityNotification.
// Requisitos (uma vez só, feitos pelo administrador):
//   - Permissões de aplicativo no app "ElevAI Cockpit": TeamsActivity.Send,
//     TeamsAppInstallation.ReadWriteForUser.All e AppCatalog.Read.All (com consentimento do administrador);
//   - "URI da ID do aplicativo" definido como api://<domínio do S.I.G.E.>/<id do app>;
//   - pacote do app do Teams (S.I.G.E.-Teams-app.zip) carregado no Centro de administração do Teams.
// Tudo aqui é "melhor esforço": se algo faltar, devolve { ok:false, erro } e o fluxo da tarefa segue normal.
const g = require('./graph');

const EXT_ID = process.env.TEAMS_APP_EXTERNAL_ID || '3fcd5d2c-446b-4049-bf9a-e0efa0b23b42'; // id do manifest

let _catalogId = null;
async function catalogId() {
  if (_catalogId) return _catalogId;
  const r = await g.graph('GET', '/appCatalogs/teamsApps?$filter=' + encodeURIComponent("externalId eq '" + EXT_ID + "'"));
  const a = r && r.value && r.value[0];
  if (!a || !a.id) throw new Error('O app do Teams do S.I.G.E. ainda não foi publicado no catálogo da organização.');
  _catalogId = a.id;
  return _catalogId;
}

async function instalar(uid) {
  const id = await catalogId();
  try {
    await g.graph('POST', '/users/' + encodeURIComponent(uid) + '/teamwork/installedApps',
      { 'teamsApp@odata.bind': 'https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/' + id });
  } catch (e) { if (e && e.status === 409) return; throw e; } // 409 = já instalado
}

function corta(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

// Envia o aviso a UMA pessoa. Devolve { ok:true } ou { ok:false, erro }.
async function avisar(email, o) {
  try {
    const u = await g.graph('GET', '/users/' + encodeURIComponent(email) + '?$select=id');
    const uid = u && u.id; if (!uid) throw new Error('usuário não encontrado');
    let inst = '';
    try {
      const li = await g.graph('GET', '/users/' + encodeURIComponent(uid) + '/teamwork/installedApps?$expand=teamsApp');
      const ja = ((li && li.value) || []).some(x => x.teamsApp && (x.teamsApp.externalId === EXT_ID || x.teamsApp.displayName === 'S.I.G.E.'));
      if (ja) inst = 'ja instalado';
      else { try { await instalar(uid); inst = 'instalado agora'; } catch (ei) { inst = 'falha ao instalar: ' + corta((ei && ei.message) || ei, 110); } }
    } catch (el) { inst = 'checagem falhou: ' + corta((el && el.message) || el, 110); }
    const corpo = {
      topic: { source: 'text', value: corta(o.titulo, 120), webUrl: 'https://teams.microsoft.com/l/entity/' + EXT_ID + '/sige?label=S.I.G.E.&webUrl=' + encodeURIComponent(o.url || 'https://sige-novasreceitas.elevalife.com.br/') }, /* Teams só aceita link do próprio Teams aqui */
      activityType: 'novaTarefa',
      previewText: { content: corta(o.resumo, 150) },
      templateParameters: [{ name: 'titulo', value: corta(o.titulo, 120) }],
    };
    const url = '/users/' + encodeURIComponent(uid) + '/teamwork/sendActivityNotification';
    try { await g.graph('POST', url, corpo); }
    catch (e) {
      if (e && (e.status === 403 || e.status === 404)) { await instalar(uid); await g.graph('POST', url, corpo); } // app ainda não instalado p/ essa pessoa
      else throw e;
    }
    return { ok: true, inst };
  } catch (e) { return { ok: false, erro: corta((e && e.message) || e, 160) }; }
}

// Avisa várias pessoas (no máx. 12). Devolve { enviados, falhas, erro }.
async function avisarVarios(emails, o) {
  const lista = Array.from(new Set((emails || []).map(x => String(x || '').trim().toLowerCase()).filter(Boolean))).slice(0, 12);
  let enviados = 0, falhas = 0, erro = null, det = null;
  for (const em of lista) {
    const r = await avisar(em, o);
    if (r.ok) { enviados++; det = det || r.inst; } else { falhas++; erro = erro || r.erro; }
  }
  return { enviados, falhas, erro, det };
}

module.exports = { avisar, avisarVarios };
