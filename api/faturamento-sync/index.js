// faturamento-sync — FASE 3 da integração SIGE-novasreceitas <-> Faturamento de Serviços (03/11/2026).
// Lança no Faturamento (listas FAT_* do site BPM) a venda fechada, SEMPRE como contrato "Provisório" (não fatura)
// ou "Retido" (não fatura + alerta). Nunca sobrescreve: cria uma nova Versão do contrato (copiando os itens) ou um
// contrato novo, mais o item da venda. Nunca cria cliente (cliente inexistente = erro; fica para a Fase 4).
// GET  -> { ok, live, statusContratos } (informa se a gravação está ligada e se a coluna Status aceita "Provisório").
// POST -> { modo:'teste'|'gravar', ...dados do lead }. 'teste' só calcula e devolve o plano (não grava).
//         'gravar' só grava se a App Setting FAT_SYNC_LIVE=1 (desligada por padrão) e se o lead ainda não foi lançado.
// Acesso: somente contas @elevalife.com.br logadas (requireDomain + regra /api/* do staticwebapp.config.json).
const g = require('../_shared/graph');
const { json, requireDomain } = require('../_shared/crud');

const BPM_HOST = process.env.FAT_SP_HOSTNAME || 'elevalife.sharepoint.com';
const BPM_PATH = process.env.FAT_SP_SITEPATH || '/sites/BUSINESSPROCESSMANAGEMENT';
const FORTE = ['Pedido de compra', 'Contrato assinado'];
const COLS_NOVAS = ['Origem', 'LeadId', 'EvidenciaTipo', 'EvidenciaRef', 'ValidacaoStatus', 'CriadoPorSistemaEm', 'LancadoPor'];
const SYS = /^(id|ID|Created|Modified|ContentType|Attachments|Edit|LinkTitle|LinkTitleNoMenu|ItemChildCount|FolderChildCount|FileSystemObjectType|ComplianceAssetId|ServerRedirectedEmbedUrl|ServerRedirectedEmbedUri|AuthorLookupId|EditorLookupId|AppAuthorLookupId|AppEditorLookupId|_.*|@.*)$/;
let _sid = null;
const _lid = {};

async function siteId() {
  if (_sid) return _sid;
  const j = await g.graph('GET', '/sites/' + BPM_HOST + ':' + BPM_PATH);
  _sid = j.id;
  return _sid;
}
async function listaId(nome) {
  if (_lid[nome]) return _lid[nome];
  const sid = await siteId();
  const f = await g.graph('GET', '/sites/' + sid + '/lists?$filter=displayName eq ' + "'" + encodeURIComponent(nome) + "'" + '&$select=id,displayName');
  const l = (f.value || [])[0];
  if (!l) throw new Error('Lista ' + nome + ' não encontrada no site BPM.');
  _lid[nome] = l.id;
  return l.id;
}
async function colunas(lid) {
  const sid = await siteId();
  const j = await g.graph('GET', '/sites/' + sid + '/lists/' + lid + '/columns?$select=name,choice&$top=300');
  return j.value || [];
}
async function itensRaw(lid) {
  const sid = await siteId();
  const out = [];
  let url = '/sites/' + sid + '/lists/' + lid + '/items?expand=fields&$top=200';
  while (url) {
    const j = await g.graph('GET', url);
    (j.value || []).forEach(function (it) { out.push({ id: String(it.id), f: it.fields || {} }); });
    url = j['@odata.nextLink'] || null;
  }
  return out;
}
function limpa(f) {
  const o = {};
  Object.keys(f || {}).forEach(function (k) { if (!SYS.test(k) && f[k] !== null && f[k] !== undefined && f[k] !== '') o[k] = f[k]; });
  return o;
}
const s = function (v) { return v == null ? '' : String(v); };
const numReal = function (n) { n = s(n).trim(); return !!n && !/^(PROV|A\s*CADASTRAR|A\s*DEFINIR|PENDENTE|N\/?A|TBD)/i.test(n) && n !== '-' && n !== '—'; };
function quem(req) {
  try { const h = (req.headers && (req.headers['x-ms-client-principal'] || req.headers['X-MS-CLIENT-PRINCIPAL'])) || ''; const p = JSON.parse(Buffer.from(h, 'base64').toString('utf8')); return p.userDetails || p.userId || ''; } catch (e) { return ''; }
}
function quemNome(req) {
  try {
    const h = (req.headers && (req.headers['x-ms-client-principal'] || req.headers['X-MS-CLIENT-PRINCIPAL'])) || ''; const p = JSON.parse(Buffer.from(h, 'base64').toString('utf8'));
    const cl = Array.isArray(p.claims) ? p.claims : []; const nm = (cl.find(function (c) { return c.typ === 'name' || /claims\/name$/.test(c.typ || ''); }) || {}).val;
    const mail = p.userDetails || '';
    return (nm && mail && nm !== mail) ? nm + ' (' + mail + ')' : (nm || mail || p.userId || '');
  } catch (e) { return ''; }
}
function fmtBR(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s(iso)); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function moeda(n) { return 'R$ ' + Number(n || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

async function avisarTeams(txt) {
  const url = process.env.FAT_TEAMS_WEBHOOK;
  if (!url) return { ok: false, erro: 'FAT_TEAMS_WEBHOOK não configurado' };
  try {
    const body = { type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: { type: 'AdaptiveCard', version: '1.4', $schema: 'http://adaptivecards.io/schemas/adaptive-card.json', body: [{ type: 'TextBlock', text: txt, wrap: true }] } }] };
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: r.ok, status: r.status };
  } catch (e) { return { ok: false, erro: String((e && e.message) || e).slice(0, 120) }; }
}

module.exports = async function (context, req) {
  try {
    if (!requireDomain(context, req)) return;
    const live = process.env.FAT_SYNC_LIVE === '1';
    const lidC = await listaId('FAT_Contratos');
    const colC = await colunas(lidC);
    const colStatus = colC.find(function (c) { return c.name === 'Status'; });
    const escolhas = colStatus && colStatus.choice ? (colStatus.choice.choices || []) : null;
    const statusInfo = { tipo: escolhas ? 'escolha' : 'texto', escolhas: escolhas, aceitaProvisorio: !escolhas || escolhas.indexOf('Provisório') >= 0, aceitaRetido: !escolhas || escolhas.indexOf('Retido') >= 0 };
    if (req.method === 'GET') { context.res = json(200, { ok: true, live: live, statusContratos: statusInfo, colunasContratos: colC.map(function (c) { return c.name; }) }); return; }

    const p = req.body || {};
    const erro = function (m) { context.res = json(400, { ok: false, error: m }); };
    const leadId = s(p.leadId).trim(), clienteId = s(p.clienteId).trim();
    const servico = s(p.servico).trim(), numero = s(p.numero).trim();
    const valor = Number(p.valor) || 0;
    if (!leadId) return erro('Falta o id do lead.');
    if (!clienteId) return erro('Cliente não encontrado no Faturamento: cadastre o cliente lá (a criação automática de cliente é uma fase futura).');
    if (!servico || /^(AF|AE|GL|ACAD|GR)$/i.test(servico) || /^servi.o a confirmar$/i.test(servico)) return erro('Informe o nome do serviço (ex.: o Resumo do projeto), não só o código (AF, GL, ACAD, AE, GR).');
    if (!numero) return erro('Falta o Nº do contrato (use o provisório PROV-...).');

    const lidI = await listaId('FAT_Itens'), lidCli = await listaId('FAT_Clientes');
    const [cts, its, clis] = await Promise.all([itensRaw(lidC), itensRaw(lidI), itensRaw(lidCli)]);
    const cli = clis.find(function (x) { return x.id === clienteId; });
    if (!cli) return erro('Cliente id ' + clienteId + ' não existe no Faturamento.');
    const doCli = cts.filter(function (c) { return s(c.f.ClienteId) === clienteId; });
    const base = p.contratoBaseId ? doCli.find(function (c) { return c.id === s(p.contratoBaseId); }) : null;
    if (p.contratoBaseId && !base) return erro('Contrato base não pertence a esse cliente.');
    const ja = cts.find(function (c) { return s(c.f.Origem) === 'SIGE' && s(c.f.LeadId) === leadId; });

    const tipo = s(p.evidenciaTipo), ref = s(p.evidenciaRef);
    const forte = FORTE.indexOf(tipo) >= 0, real = numReal(numero);
    const ret = [];
    if (!tipo || !ref) ret.push('sem evidência da venda registrada');
    if (!(valor > 0)) ret.push('valor mensal ausente ou zerado');
    if (forte && !real) ret.push('evidência é pedido/contrato, mas falta o Nº real');
    if (real && cts.some(function (c) { return s(c.f.Title).trim().toUpperCase() === numero.toUpperCase() && s(c.f.ClienteId) !== clienteId; })) ret.push('o Nº ' + numero + ' já existe em outro cliente');
    if (!real && !/^PROV/i.test(numero)) ret.push('Nº provisório deve começar com PROV-');
    const nivel = ret.length ? 3 : (forte ? 1 : 2);
    const statusFinal = nivel === 3 ? 'Retido' : 'Provisório';
    const versao = doCli.reduce(function (m, c) { return Math.max(m, Number(c.f.Versao) || 0); }, 0) + 1;
    const copiar = base ? its.filter(function (i) { return s(i.f.ContratoId) === base.id; }) : [];
    const nomesCol = colC.map(function (c) { return c.name; });
    const faltam = COLS_NOVAS.filter(function (n) { return nomesCol.indexOf(n) < 0; });

    const campos = base ? limpa(base.f) : { ClienteId: clienteId };
    campos.Title = numero; campos.ClienteId = clienteId; campos.Versao = versao; campos.Status = statusFinal;
    if (p.ini) campos.Inicio = s(p.ini); if (p.fim) campos.Fim = s(p.fim);
    campos.Origem = 'SIGE'; campos.LeadId = leadId; campos.EvidenciaTipo = tipo; campos.EvidenciaRef = ref;
    campos.ValidacaoStatus = nivel === 3 ? 'Retida' : 'Aguardando validação'; campos.CriadoPorSistemaEm = new Date().toISOString(); campos.LancadoPor = quemNome(req);
    if (nomesCol.indexOf('Observacoes') >= 0) campos.Observacoes = 'Lançado pelo SIGE (lead ' + leadId + ') como ' + statusFinal + ': aguardando validação do Financeiro. Não fatura até mudar o Status para Vigente.' + (quemNome(req) ? ' Lançado por ' + quemNome(req) + '.' : '');

    const linhas = [
      'Cliente: ' + s(cli.f.Title) + ' (existente, não é alterado).',
      base ? 'Contrato: nova Versão v' + versao + ' do contrato Nº ' + s(base.f.Title) + ' (v' + (Number(base.f.Versao) || 1) + ' continua como está), copiando ' + copiar.length + ' item(ns).' : 'Contrato: novo, v' + versao + '.',
      'Nº: ' + numero + ' · Status: ' + statusFinal + ' (não fatura) · Vigência: ' + (fmtBR(campos.Inicio) || 'a informar') + ' a ' + (fmtBR(campos.Fim) || 'a informar') + '.',
      'Item novo: "' + servico + '" · ' + moeda(valor) + '/mês' + (p.oc ? ' · PO ' + s(p.oc) : ' · sem PO') + '.',
      'Rastreio: Origem=SIGE · lead ' + leadId + ' · evidência ' + (tipo || '—') + '.'
    ];
    if (nivel === 1) linhas.push('Nível 1 (pedido/contrato com Nº real): a entrada direta como Vigente é a Fase 4; por enquanto entra como Provisório.');
    if (ret.length) linhas.push('Retido por: ' + ret.join('; ') + '.');
    if (faltam.length) linhas.push('Colunas que seriam criadas em FAT_Contratos: ' + faltam.join(', ') + '.');
    const bloqueio = ja ? 'Este lead já foi lançado no Faturamento (contrato id ' + ja.id + ', v' + (Number(ja.f.Versao) || 1) + ').' :
      (statusFinal === 'Provisório' && !statusInfo.aceitaProvisorio) || (statusFinal === 'Retido' && !statusInfo.aceitaRetido) ? 'A coluna Status de FAT_Contratos é uma lista fechada e não aceita "' + statusFinal + '". Ajustar a lista no SharePoint.' : '';
    const plano = { nivel: nivel, status: statusFinal, versao: versao, motivos: ret, itensCopiados: copiar.length };
    if (req.body && p.modo !== 'gravar' || !live || bloqueio) {
      context.res = json(200, { ok: true, modo: p.modo === 'gravar' ? 'gravar-bloqueado' : 'teste', live: live, gravou: false, bloqueio: bloqueio || (p.modo === 'gravar' && !live ? 'Gravação desligada (App Setting FAT_SYNC_LIVE).' : ''), plano: plano, linhas: linhas });
      return;
    }

    // ---- GRAVAÇÃO (só chega aqui com FAT_SYNC_LIVE=1, modo 'gravar', sem bloqueio) ----
    const sid = await siteId();
    for (const n of faltam) { try { await g.graph('POST', '/sites/' + sid + '/lists/' + lidC + '/columns', { name: n, text: {} }); } catch (e) { if (e.status !== 409) throw e; } }
    const novo = await g.graph('POST', '/sites/' + sid + '/lists/' + lidC + '/items', { fields: campos });
    const novoId = String(novo.id);
    let n = 0;
    for (const i of copiar) { const f = limpa(i.f); f.ContratoId = novoId; await g.graph('POST', '/sites/' + sid + '/lists/' + lidI + '/items', { fields: f }); n++; }
    const fi = { Title: servico, ContratoId: novoId, ClienteId: clienteId, ValorMensal: valor, Ordem: n + 1 };
    if (p.oc) fi.NumPedido = s(p.oc); if (p.cod) fi.CodigoServicoNF = s(p.cod); if (Number(p.prazo)) fi.PrazoFaturamento = Number(p.prazo);
    await g.graph('POST', '/sites/' + sid + '/lists/' + lidI + '/items', { fields: fi });
    context.log('[faturamento-sync] gravou lead=' + leadId + ' contrato=' + novoId + ' v' + versao + ' status=' + statusFinal + ' por=' + quem(req));
    const t = await avisarTeams('📥 SIGE lançou no Faturamento um contrato ' + statusFinal.toUpperCase() + ': ' + s(cli.f.Title) + ' · Nº ' + numero + ' (v' + versao + ') · ' + servico + ' · ' + moeda(valor) + '/mês. Não fatura até o Financeiro conferir e mudar o Status para Vigente.' + (ret.length ? ' Retido por: ' + ret.join('; ') + '.' : ''));
    context.res = json(200, { ok: true, modo: 'gravar', live: true, gravou: true, contratoId: novoId, plano: plano, linhas: linhas, teams: t });
  } catch (e) {
    context.res = json(e.status || 500, { ok: false, error: String((e && e.message) || e).slice(0, 300) });
  }
};
