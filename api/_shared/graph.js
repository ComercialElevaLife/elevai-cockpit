// graph.js — cliente Microsoft Graph (client-credentials / app-only) para o backend ElevAI.
// Requer App Settings: AAD_CLIENT_ID, AAD_CLIENT_SECRET, TENANT_ID.
// Site alvo: elevalife.sharepoint.com / sites/Comercial (defaults; sobrescreve via SP_HOSTNAME/SP_SITEPATH).

const TENANT = process.env.TENANT_ID || 'cfb770f9-787a-45dd-8368-a47edc43fc12';
const CLIENT_ID = process.env.AAD_CLIENT_ID;
const CLIENT_SECRET = process.env.AAD_CLIENT_SECRET;
const HOSTNAME = process.env.SP_HOSTNAME || 'elevalife.sharepoint.com';
const SITEPATH = process.env.SP_SITEPATH || '/sites/Comercial';
const GRAPH = 'https://graph.microsoft.com/v1.0';

let _tok = { value: null, exp: 0 };
let _siteId = null;
const _listCache = {}; // displayName -> listId
const _colsOk = {}; // listId -> colunas já conferidas nesta instância

async function getToken() {
  const now = Date.now();
  if (_tok.value && now < _tok.exp - 60000) return _tok.value;
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('Faltam AAD_CLIENT_ID / AAD_CLIENT_SECRET nas App Settings.');
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const r = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Token error: ' + JSON.stringify(j));
  _tok = { value: j.access_token, exp: now + (j.expires_in || 3600) * 1000 };
  return _tok.value;
}

async function graph(method, path, body, _retry) {
  const token = await getToken();
  const r = await fetch(path.startsWith('http') ? path : GRAPH + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let j = null;
  try { j = text ? JSON.parse(text) : null; } catch (_) { j = { raw: text }; }
  /* 20/10/2026 — permissão nova concedida no Azure só vale num token novo: se veio 403 com token em cache, renova e tenta 1 vez */
  if (r.status === 403 && !_retry) { _tok = { value: null, exp: 0 }; return graph(method, path, body, true); }
  if (!r.ok) {
    const err = new Error('Graph ' + method + ' ' + path + ' -> ' + r.status + ': ' + text);
    err.status = r.status;
    err.body = j;
    throw err;
  }
  return j;
}

async function getSiteId() {
  if (_siteId) return _siteId;
  const j = await graph('GET', `/sites/${HOSTNAME}:${SITEPATH}`);
  _siteId = j.id;
  return _siteId;
}

async function findList(displayName) {
  if (_listCache[displayName]) return _listCache[displayName];
  const siteId = await getSiteId();
  const j = await graph('GET', `/sites/${siteId}/lists?$filter=displayName eq '${encodeURIComponent(displayName)}'&$select=id,displayName`);
  const found = (j.value || [])[0];
  if (found) { _listCache[displayName] = found.id; return found.id; }
  return null;
}

// 31/08/2026 — colunas de texto do SharePoint nascem "linha única" por padrão (limite de 255
// caracteres) quando criadas com `{ text: {} }`. Campos que guardam JSON e crescem a cada evento
// (tarefasJson/servicosJson/histEventosJson — ver `long:true` no schema.js) precisam ser
// "múltiplas linhas" (sem esse limite), senão um PATCH que passa de 255 chars é rejeitado pelo
// Graph e a gravação inteira é revertida no Cockpit ("Falha ao salvar — revertido").
//
// 31/08/2026 (correção) — a migração abaixo (PATCH numa coluna já existente) foi a 1ª tentativa
// de consertar isso pro campo de histórico (que nasceu como `historicoJson`, linha única) — não
// funcionou: Léo testou de novo e bateu no mesmo erro. Na prática, o Graph/SharePoint NÃO
// converte de forma confiável "Text" (linha única) em "Note" (multi-linha) num campo que já
// existe, mesmo os dois caindo sob o mesmo facet `text` da API — são tipos internos diferentes no
// SharePoint. A correção real foi trocar de coluna (`histEventosJson`, nova, nasce multi-linha
// desde a criação) em vez de depender dessa migração. Ainda assim deixei o código de migração
// abaixo — não atrapalha (falha silenciosa, só loga) e cobre o caso raro de um campo `long`
// futuro que ainda não tenha sido usado o suficiente pra estourar 255 chars: criar do zero com
// `long:true` sempre funciona: é só migrar um campo JÁ existente como linha única que é frágil.
// **Se aparecer de novo esse erro num campo marcado `long`, o caminho é trocar de nome de coluna
// (como foi feito aqui), não confiar nessa migração.**
function _colBody(c) {
  if (c.type === 'number') return { name: c.name, number: {} };
  return { name: c.name, text: c.long ? { allowMultipleLines: true } : {} };
}

// Garante que TODAS as colunas do schema existam na lista (adiciona as que faltam) e TENTA migrar
// pra multi-linha qualquer coluna `long:true` que já exista como linha única — ver aviso acima
// sobre a confiabilidade dessa migração.
async function ensureColumns(listId, columns) {
  const siteId = await getSiteId();
  const j = await graph('GET', `/sites/${siteId}/lists/${listId}/columns?$select=id,name,text`);
  const byName = new Map((j.value || []).map(c => [c.name, c]));
  for (const c of columns) {
    const existing = byName.get(c.name);
    if (!existing) {
      try { await graph('POST', `/sites/${siteId}/lists/${listId}/columns`, _colBody(c)); }
      catch (e) { if (e.status !== 409) throw e; } // 409 = já existe (corrida)
      continue;
    }
    if (c.long && existing.text && existing.text.allowMultipleLines === false) {
      // best-effort: não falha o request se a mudança de facet não for aceita — só loga; a
      // coluna continua utilizável do jeito que estava (ver aviso acima: não confiar nisso).
      try { await graph('PATCH', `/sites/${siteId}/lists/${listId}/columns/${existing.id}`, { text: { allowMultipleLines: true } }); }
      catch (e) { console.error('Falha ao migrar coluna pra multi-linha:', c.name, e.message || e); }
    }
  }
}

// Cria a lista (se não existir) e garante as colunas do schema. Requer Sites.Manage.All (app).
async function ensureList(def) {
  const siteId = await getSiteId();
  let id = await findList(def.displayName);
  let created = false;
  if (!id) {
    const columns = def.columns.map(_colBody);
    const c = await graph('POST', `/sites/${siteId}/lists`, {
      displayName: def.displayName, list: { template: 'genericList' }, columns,
    });
    id = c.id; created = true; _listCache[def.displayName] = id;
  }
  /* 21/10/2026 — desempenho: a checagem de colunas custa 1 chamada ao SharePoint e rodava em TODA requisição.
     Agora roda 1 vez por lista a cada inicialização do servidor (um deploy reinicia e confere de novo). */
  if (created || !_colsOk[id]) { await ensureColumns(id, def.columns); _colsOk[id] = true; } // idempotente: repara listas antigas de schema mínimo
  return { id, created };
}

// Ids dos itens (para limpeza no modo fresh)
async function listItemIds(listId) {
  const siteId = await getSiteId();
  const out = [];
  let url = `/sites/${siteId}/lists/${listId}/items?$select=id&$top=200`;
  while (url) { const j = await graph('GET', url); for (const it of (j.value || [])) out.push(it.id); url = j['@odata.nextLink'] || null; }
  return out;
}

async function deleteItem(listId, itemId) {
  const siteId = await getSiteId();
  return graph('DELETE', `/sites/${siteId}/lists/${listId}/items/${itemId}`);
}

async function listItems(listId) {
  const siteId = await getSiteId();
  const out = [];
  let url = `/sites/${siteId}/lists/${listId}/items?expand=fields&$top=200`;
  while (url) {
    const j = await graph('GET', url);
    for (const it of (j.value || [])) out.push(it.fields || {});
    url = j['@odata.nextLink'] || null;
  }
  return out;
}

async function addItem(listId, fields) {
  const siteId = await getSiteId();
  return graph('POST', `/sites/${siteId}/lists/${listId}/items`, { fields });
}


// Itens com metadados (id + fields) — para o front referenciar e atualizar
async function listItemsMeta(listId) {
  const siteId = await getSiteId();
  const out = [];
  let url = `/sites/${siteId}/lists/${listId}/items?expand=fields&$top=200`;
  while (url) { const j = await graph('GET', url); for (const it of (j.value || [])) out.push({ id: it.id, fields: it.fields || {} }); url = j['@odata.nextLink'] || null; }
  return out;
}

// Atualiza (PATCH) os campos de um item
async function updateItem(listId, itemId, fields) {
  const siteId = await getSiteId();
  return graph('PATCH', `/sites/${siteId}/lists/${listId}/items/${itemId}/fields`, fields);
}

module.exports = { graph, getToken, getSiteId, findList, ensureList, ensureColumns, listItems, listItemsMeta, listItemIds, deleteItem, updateItem, addItem, HOSTNAME, SITEPATH };
