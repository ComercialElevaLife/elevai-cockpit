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

async function graph(method, path, body) {
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

// Garante que TODAS as colunas do schema existam na lista (adiciona as que faltam).
async function ensureColumns(listId, columns) {
  const siteId = await getSiteId();
  const j = await graph('GET', `/sites/${siteId}/lists/${listId}/columns?$select=name`);
  const have = new Set((j.value || []).map(c => c.name));
  for (const c of columns) {
    if (have.has(c.name)) continue;
    const body = c.type === 'number' ? { name: c.name, number: {} } : { name: c.name, text: {} };
    try { await graph('POST', `/sites/${siteId}/lists/${listId}/columns`, body); }
    catch (e) { if (e.status !== 409) throw e; } // 409 = já existe (corrida)
  }
}

// Cria a lista (se não existir) e garante as colunas do schema. Requer Sites.Manage.All (app).
async function ensureList(def) {
  const siteId = await getSiteId();
  let id = await findList(def.displayName);
  let created = false;
  if (!id) {
    const columns = def.columns.map(c =>
      c.type === 'number' ? { name: c.name, number: {} } : { name: c.name, text: {} }
    );
    const c = await graph('POST', `/sites/${siteId}/lists`, {
      displayName: def.displayName, list: { template: 'genericList' }, columns,
    });
    id = c.id; created = true; _listCache[def.displayName] = id;
  }
  await ensureColumns(id, def.columns); // idempotente: repara listas antigas de schema mínimo
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
