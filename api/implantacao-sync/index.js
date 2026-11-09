// implantacao-sync — SIMULAÇÃO da criação automática de Implantação (09/11/2026).
// Lê a lista "Implantação de Serviços Kanban" (site BPM) e devolve o que SERIA criado ao fechar uma venda,
// espelhando as regras do painel (modelo = linhas sem cliente; prazos em dias úteis; responsáveis; status inicial).
// Modo 'gravar' (cria só a etapa 1 com prazo; desligado salvo IMPL_SYNC_LIVE=1); 'simular' e 'listar' não gravam nada.
// GET  -> { ok, live:false, lista, etapasModelo }
// POST -> { modo:'simular', cliente, unidades:[{nome,cidade,uf,data}], area, tipoVenda, usuario, empresa, cnpj, endereco, cargo, cargaHoraria }
//      -> { modo:'comparar', cliente, abertura:'AAAA-MM-DD', uf, cidade } compara prazos calculados x reais de uma implantação existente.
// Acesso: somente contas @elevalife.com.br logadas (requireDomain).
const g = require('../_shared/graph');
const AUD = require('../_shared/auditoria');
const { json, requireDomain } = require('../_shared/crud');
const HOST = process.env.IMPL_SP_HOSTNAME || process.env.FAT_SP_HOSTNAME || 'elevalife.sharepoint.com';
const PATH = process.env.IMPL_SP_SITEPATH || process.env.FAT_SP_SITEPATH || '/sites/BUSINESSPROCESSMANAGEMENT';
const LISTA_ID = process.env.IMPL_LISTA_ID || '4563517e-40d7-4fa4-99ff-bf126b15c95c';
const s = function (v) { return v == null ? '' : String(v); };
let _sid = null;
async function siteId() {
  if (_sid) return _sid;
  const j = await g.graph('GET', '/sites/' + HOST + ':' + PATH);
  _sid = j.id;
  return _sid;
}
async function itens() {
  const sid = await siteId();
  const out = [];
  let url = '/sites/' + sid + '/lists/' + LISTA_ID + '/items?expand=fields&$top=200';
  while (url) {
    const j = await g.graph('GET', url);
    (j.value || []).forEach(function (i) { out.push({ id: i.id, f: i.fields || {} }); });
    url = j['@odata.nextLink'] || null;
  }
  return out;
}
// ---- feriados (mesmas regras do painel) ----
const FER_UF = { SP: ['07-09'], RJ: ['04-23'], RS: ['09-20'], PR: ['12-19'], BA: ['07-02'], DF: ['11-30'] };
const FER_MUN = { 'SP|sao paulo': ['01-25'], 'RJ|rio de janeiro': ['01-20'], 'SP|mogi das cruzes': ['09-01', '12-08'] };
function semAcento(t) { return s(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const gg = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - gg + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia, 12));
}
function pad(n) { return (n < 10 ? '0' : '') + n; }
function mmdd(d) { return pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
function feriados(ano, uf, cid) {
  const L = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];
  const sx = new Date(pascoa(ano).getTime() - 2 * 86400000);
  L.push(mmdd(sx));
  (FER_UF[s(uf).toUpperCase()] || []).forEach(function (x) { L.push(x); });
  const mun = FER_MUN[s(uf).toUpperCase() + '|' + semAcento(cid)] || [];
  mun.forEach(function (x) { L.push(x); });
  return L;
}
function ehUtil(d, uf, cid) {
  const w = d.getUTCDay();
  if (w === 0 || w === 6) return false;
  return feriados(d.getUTCFullYear(), uf, cid).indexOf(mmdd(d)) < 0;
}
function addBU(d, n, uf, cid) {
  let x = new Date(d.getTime()), k = 0;
  while (k < n) { x = new Date(x.getTime() + 86400000); if (ehUtil(x, uf, cid)) k++; }
  return x;
}
function subBU(d, n, uf, cid) {
  let x = new Date(d.getTime()), k = 0;
  while (k < n) { x = new Date(x.getTime() - 86400000); if (ehUtil(x, uf, cid)) k++; }
  return x;
}
function iso(d) { return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
function parseData(t) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s(t));
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)) : null;
}
// Regras do painel (numeração de 24 etapas): só calcula o que o painel calcula.
function prazos(ab, uf, cid) {
  const P = {};
  P[1] = addBU(ab, 1, uf, cid);
  P[2] = addBU(P[1], 1, uf, cid);
  P[3] = addBU(P[2], 1, uf, cid);
  P[4] = addBU(P[3], 4, uf, cid);
  P[5] = addBU(P[4], 2, uf, cid);
  P[6] = addBU(ab, 7, uf, cid);
  P[7] = addBU(ab, 15, uf, cid);
  for (let n = 8; n <= 13; n++) P[n] = addBU(ab, 16, uf, cid);
  P[20] = addBU(P[1], 25, uf, cid);
  P[14] = subBU(P[20], 7, uf, cid);
  for (let n = 15; n <= 19; n++) P[n] = subBU(P[20], 5, uf, cid);
  P[21] = addBU(P[20], 7, uf, cid);
  for (let n = 22; n <= 24; n++) P[n] = addBU(P[20], 30, uf, cid);
  return P;
}
// ---- responsáveis (mesmas regras do painel) ----
const AREA_EMAIL = {
  'atividades fisicas': 'dhanilo@elevalife.com.br', 'fisioterapia': 'dhanilo@elevalife.com.br',
  'ergonomia': 'alexandre@elevalife.com.br', 'recursos humanos': 'gisleiny@elevalife.com.br',
  'departamento pessoal': 'gabrielepaes@elevalife.com.br', 'enfermagem': 'cristiano@elevalife.com.br',
  'saude corporativa': 'cristiano@elevalife.com.br', 'medicina': 'cristiano@elevalife.com.br',
  'massoterapia': 'cristiano@elevalife.com.br', 'psicologia': 'cristiano@elevalife.com.br', 'nutricao': 'cristiano@elevalife.com.br'
};
function emailEtapa(areaResp, areaCliente, tipoVenda, usuario) {
  const a = s(areaResp).toUpperCase();
  if (a.indexOf('VENDAS') >= 0) return /up\s*sell/i.test(tipoVenda) && usuario ? usuario : 'leonardo@elevalife.com.br';
  if (a.indexOf('MARKETING') >= 0) return 'clara@elevalife.com.br';
  if (/\bRH\b/.test(a)) return AREA_EMAIL['recursos humanos'];
  if (/\bDP\b/.test(a)) return AREA_EMAIL['departamento pessoal'];
  if (a.indexOf('COORDENADOR') >= 0) return AREA_EMAIL[semAcento(areaCliente)] || '';
  return '';
}
function modeloDe(todos) {
  return todos.filter(function (i) { return !s(i.f.field_1).trim(); })
    .sort(function (a, b) { return (parseFloat(a.f.field_3) || 0) - (parseFloat(b.f.field_3) || 0); });
}
module.exports = async function (context, req) {
  try {
    if (!requireDomain(context, req)) return;
    const todos = await itens();
    const modelo = modeloDe(todos);
    if (req.method === 'GET') {
      context.res = json(200, { ok: true, live: false, modo: 'simulacao', listaId: LISTA_ID, etapasModelo: modelo.length, linhasTotal: todos.length });
      return;
    }
    const p = req.body || {};
    const erro = function (m) { context.res = json(400, { ok: false, error: m }); };
    if (p.modo === 'comparar') {
      const cli = s(p.cliente).trim().toLowerCase();
      const ab = parseData(p.abertura);
      if (!cli || !ab) return erro('Informe cliente (nome exato da implantação) e abertura AAAA-MM-DD.');
      const reais = todos.filter(function (i) { return s(i.f.field_1).trim().toLowerCase() === cli; });
      if (!reais.length) return erro('Implantação não encontrada com esse nome.');
      const P = prazos(ab, p.uf, p.cidade);
      const linhas = reais.map(function (i) {
        const n = parseInt(i.f.field_3, 10);
        const real = parseData(i.f.field_10);
        const calc = P[n] || null;
        return { etapa: n, titulo: s(i.f.Title), real: real ? iso(real) : null, calculado: calc ? iso(calc) : null,
          difDias: real && calc ? Math.round((real - calc) / 86400000) : null };
      }).sort(function (a, b) { return a.etapa - b.etapa; });
      context.res = json(200, { ok: true, modo: 'comparar', cliente: p.cliente, abertura: iso(ab), etapasReais: reais.length, linhas: linhas });
      return;
    }
    if (p.modo === 'listar') {
      // Lista as implantações existentes (nome, empresa, CNPJ, unidade, UF, tipo de venda, prazo da etapa 1). Só leitura.
      const mapa = {};
      todos.forEach(function (i) {
        const k = s(i.f.field_1).trim();
        if (!k) return;
        const o = mapa[k] || (mapa[k] = { cliente: k, empresa: '', cnpj: '', unidade: '', uf: '', tipoVenda: '', etapas: 0, etapa1Prazo: null });
        o.etapas++;
        if (!o.empresa) o.empresa = s(i.f.Empresa);
        if (!o.cnpj) o.cnpj = s(i.f.CNPJ);
        if (!o.unidade) o.unidade = s(i.f.Unidade);
        if (!o.uf) o.uf = s(i.f.UFPrestacaoServico);
        if (!o.tipoVenda) o.tipoVenda = s(i.f.TipoVenda);
        if (parseInt(i.f.field_3, 10) === 1) o.etapa1Prazo = s(i.f.field_10).slice(0, 10) || null;
      });
      const lista = Object.keys(mapa).map(function (c) { return mapa[c]; });
      context.res = json(200, { ok: true, modo: 'listar', total: lista.length, implantacoes: lista });
      return;
    }
    if (p.modo === 'gravar') {
      // GRAVAÇÃO (Fase Implantação): só liga com IMPL_SYNC_LIVE=1 no Azure. Cria as etapas-modelo de cada unidade,
      // com PRAZO SÓ NA ETAPA 1 (proposta do Cris: as demais só contam quando a anterior é concluída). Não duplica
      // implantação já existente e, se qualquer etapa falhar, apaga o que acabou de criar (nada fica pela metade).
      if (process.env.IMPL_SYNC_LIVE !== '1') { context.res = json(200, { ok: true, modo: 'gravar', gravou: false, live: false, aviso: 'Gravação desligada (IMPL_SYNC_LIVE). Use o modo simular.' }); return; }
      const clienteG = s(p.cliente).trim();
      if (!clienteG) return erro('Falta o nome do cliente.');
      if (!s(p.area).trim()) return erro('Falta a área de serviço.');
      if (!modelo.length) return erro('Modelo de etapas não encontrado na lista.');
      const unidG = (Array.isArray(p.unidades) && p.unidades.length ? p.unidades : [{ nome: '' }]);
      const existG = {};
      todos.forEach(function (i) { const k = s(i.f.field_1).trim().toLowerCase(); if (k) existG[k] = 1; });
      const sidG = await siteId();
      const colsG = await g.graph('GET', '/sites/' + sidG + '/lists/' + LISTA_ID + '/columns?$top=500');
      const nomesG = {};
      (colsG.value || []).forEach(function (c) { nomesG[c.name] = 1; });
      const criadas = [], puladas = [], avisosG = [];
      let falha = '';
      for (const u of unidG) {
        const nomeFinal = u.nome ? clienteG + ' - ' + s(u.nome).trim() : clienteG;
        if (existG[nomeFinal.toLowerCase()]) { puladas.push({ cliente: nomeFinal, motivo: 'já existe implantação com esse nome (não duplica)' }); continue; }
        let ab = parseData(u.data);
        if (!ab) { ab = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(), 12)); avisosG.push(nomeFinal + ': data de abertura não informada; usada a data de hoje.'); }
        const P = prazos(ab, u.uf, u.cidade);
        for (const m of modelo) {
          const n = parseInt(m.f.field_3, 10);
          const areaResp = s(m.f.field_5);
          const visual = /comunica[cç][aã]o visual/i.test(s(m.f.Title));
          const campos = { Title: s(m.f.Title), field_1: nomeFinal, field_2: s(p.area), field_3: m.f.field_3, field_4: m.f.field_4, field_5: visual ? 'RH' : areaResp,
            field_12: (/VENDAS|MARKETING/i.test(areaResp) || visual) ? 'A fazer' : 'A definir' };
          if (n === 1 && P[1]) campos.field_10 = iso(P[1]);
          ['field_7', 'field_8', 'field_9', 'field_13'].forEach(function (c) { if (nomesG[c] && m.f[c] !== undefined && m.f[c] !== null && m.f[c] !== '') campos[c] = m.f[c]; });
          if (n === 1 && nomesG.field_13) campos.field_13 = 'Criada pelo SIGE por ' + (s(p.usuario) || 'SIGE') + ' em ' + iso(new Date()) + (s(m.f.field_13) ? ' | ' + s(m.f.field_13) : '');
          const extra = { EmailResponsavel: emailEtapa(visual ? 'RH' : areaResp, p.area, s(p.tipoVenda), s(p.usuario)), EmailCoordenador: s(p.coordenadorEmail), CriadoPor: s(p.usuario) || 'SIGE',
            TipoVenda: s(p.tipoVenda), Unidade: s(u.nome), Empresa: s(p.empresa), CNPJ: s(p.cnpj), UFPrestacaoServico: s(u.uf) };
          Object.keys(extra).forEach(function (c) { if (nomesG[c] && extra[c]) campos[c] = extra[c]; });
          try {
            const r = await g.graph('POST', '/sites/' + sidG + '/lists/' + LISTA_ID + '/items', { fields: campos });
            criadas.push(String(r.id));
          } catch (e) { falha = 'Falha na etapa ' + n + ' de ' + nomeFinal + ': ' + (e && e.message ? e.message : e); break; }
        }
        if (falha) break;
      }
      if (falha) {
        let apagadas = 0;
        for (const id of criadas) { try { await g.graph('DELETE', '/sites/' + sidG + '/lists/' + LISTA_ID + '/items/' + id); apagadas++; } catch (e) { /* segue apagando as demais */ } }
        context.res = json(500, { ok: false, modo: 'gravar', gravou: false, error: falha, desfeitas: apagadas, criadasAntesDaFalha: criadas.length });
        return;
      }
      try { AUD.registrar(req, 'gravou', { entidade: 'implantacao', registroId: clienteG, resumo: 'Criou implantação (' + clienteG + ')', detalhe: criadas.length + ' etapa(s); ' + puladas.length + ' unidade(s) puladas' }); } catch (e) { /* auditoria é best-effort */ }
      context.res = json(200, { ok: true, modo: 'gravar', gravou: criadas.length > 0, live: true, etapasCriadas: criadas.length, itens: criadas, puladas: puladas, avisos: avisosG });
      return;
    }
    // modo 'simular' (padrão)
    const cliente = s(p.cliente).trim();
    if (!cliente) return erro('Falta o nome do cliente.');
    if (!modelo.length) return erro('Modelo de etapas não encontrado na lista.');
    const unidades = (Array.isArray(p.unidades) && p.unidades.length ? p.unidades : [{ nome: '' }]);
    const existentes = {};
    todos.forEach(function (i) { const k = s(i.f.field_1).trim().toLowerCase(); if (k) existentes[k] = (existentes[k] || 0) + 1; });
    const avisos = [];
    const plano = unidades.map(function (u) {
      const nomeFinal = u.nome ? cliente + ' - ' + s(u.nome).trim() : cliente;
      const dup = !!existentes[nomeFinal.toLowerCase()];
      const ab = parseData(u.data) || new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(), 12));
      const P = prazos(ab, u.uf, u.cidade);
      const etapas = modelo.map(function (m) {
        const n = parseInt(m.f.field_3, 10);
        const areaResp = s(m.f.field_5);
        const visual = /comunica[cç][aã]o visual/i.test(s(m.f.Title));
        const status = (/VENDAS|MARKETING/i.test(areaResp) || visual) ? 'A fazer' : 'A definir';
        const prazo = P[n] ? iso(P[n]) : null;
        if (!P[n]) avisos.push('Etapa ' + n + ' sem regra de prazo no painel.');
        return { etapa: n, titulo: s(m.f.Title), grupo: s(m.f.field_4), areaResp: visual ? 'RH' : areaResp, prazo: prazo,
          status: status, responsavel: emailEtapa(visual ? 'RH' : areaResp, p.area, s(p.tipoVenda), s(p.usuario)) };
      });
      return { cliente: nomeFinal, duplicado: dup, abertura: iso(ab), uf: s(u.uf), cidade: s(u.cidade), etapas: etapas };
    });
    try { AUD.registrar(req, 'simulou', { entidade: 'implantacao', registroId: cliente, resumo: 'Simulou criação de implantação (' + cliente + ')', detalhe: unidades.length + ' unidade(s)' }); } catch (e) { /* auditoria é best-effort */ }
    context.res = json(200, { ok: true, modo: 'simular', gravou: false, cliente: cliente, tipoVenda: s(p.tipoVenda), area: s(p.area),
      etapasModelo: modelo.length, unidades: plano.length, avisos: Array.from(new Set(avisos)), plano: plano });
  } catch (e) {
    context.res = json(500, { ok: false, error: String(e && e.message || e) });
  }
};
