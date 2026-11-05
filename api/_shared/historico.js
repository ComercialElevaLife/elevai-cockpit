// historico.js — trilha de auditoria (SÓ DE ACRÉSCIMO) das negociações.
// Regra fixa do Léo (05/11/2026): registrar SEMPRE mudança de status, tarefas, adição de informações e
// edição de dados — o que mudou e quem mudou. Este módulo grava na lista Historico_Comercial (schema.js).
// O autor vem do servidor (usuário logado da SWA), nunca da tela. Nada aqui edita ou apaga linhas.
const { LISTS } = require('./schema');
const g = require('./graph');

const IGNORAR = new Set(['alteradoEm', 'alteradoPor', 'histEventosJson', 'tarefasJson', 'Title', '__id', 'id']);
const MAX_TXT = 20000;   // limite de texto guardado em antes/depois (coluna multi-linha)
const MAX_RESUMO = 250;  // a coluna Title/resumo é de linha única (255)

const ROTULOS = {
  status: 'Status', subEtapa: 'Sub-etapa', cons: 'Consultor', serv: 'Serviço', valor: 'Valor', prop: 'Proposta',
  tc: 'Cliente (novo/atual)', cliente: 'Empresa', unidade: 'Unidade', nome: 'Contato', email: 'E-mail',
  telefone: 'Telefone', fonte: 'Fonte', campanha: 'Campanha', icp: 'ICP', tipo: 'Tipo (P/R)', envio: 'Data de envio',
  dt: 'Data de entrada', dataVenda: 'Data da venda', valorMensal: 'Valor mensal', numMeses: 'Nº de meses',
  valorFechamento: 'Valor de fechamento', observacoesLead: 'Observações', evidencia: 'Evidência da venda',
  evidenciaTipo: 'Tipo da evidência', cnpj: 'CNPJ', razaoSocial: 'Razão social', endereco: 'Endereço',
  prazoMobilizacao: 'Mobilização', vendaFicha: 'Ficha da venda', ftDados: 'Dados de contrato/faturamento',
  tarefasJson2: 'Tarefas', servicosJson: 'Serviços da oportunidade', origemFunil: 'Origem no funil',
  natureza: 'Natureza da venda', fupSeq: 'Nº do FUP',
};
const rotulo = (k) => ROTULOS[k] || k;

function _s(v) { return (v === null || v === undefined) ? '' : String(v); }
function _eq(a, b) {
  const x = _s(a).trim(), y = _s(b).trim();
  if (x === y) return true;
  const nx = Number(x.replace(',', '.')), ny = Number(y.replace(',', '.'));
  return x !== '' && y !== '' && isFinite(nx) && isFinite(ny) && nx === ny;
}
function _cut(v, n) { const s = _s(v); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function _parse(v) { try { return JSON.parse(_s(v) || 'null'); } catch (e) { return undefined; } }
function _plain(o) { return o && typeof o === 'object' && !Array.isArray(o); }

// ---- diff de tarefas (array de objetos sem id: casa por título, na ordem) ----
function diffTarefas(antesRaw, depoisRaw) {
  const a = _parse(antesRaw), b = _parse(depoisRaw);
  const A = Array.isArray(a) ? a : [], B = Array.isArray(b) ? b : [];
  const usados = new Set(); const out = [];
  const camposTarefa = [['data', 'data'], ['hora', 'hora'], ['resp', 'responsável'], ['tipo', 'tipo'], ['conteudo', 'conteúdo'], ['dur', 'duração'], ['part', 'participantes']];
  B.forEach((t) => {
    const idx = A.findIndex((x, i) => !usados.has(i) && _s(x && x.titulo) === _s(t && t.titulo));
    if (idx === -1) {
      out.push({ campo: 'Tarefas', resumo: 'Tarefa criada: ' + _s(t && t.titulo) + (t && t.tipo ? ' (' + t.tipo + ')' : '') + (t && t.data ? ' · prazo ' + t.data : ''), antes: '', depois: JSON.stringify(t) });
      return;
    }
    usados.add(idx);
    const o = A[idx] || {};
    if (!!o.feito !== !!(t && t.feito)) {
      out.push({ campo: 'Tarefas', resumo: (t.feito ? 'Tarefa concluída: ' : 'Tarefa reaberta: ') + _s(t.titulo), antes: JSON.stringify(o), depois: JSON.stringify(t) });
    }
    camposTarefa.forEach(([k, nome]) => {
      if (!_eq(o[k], t && t[k])) out.push({ campo: 'Tarefas', resumo: 'Tarefa "' + _cut(t.titulo, 60) + '" — ' + nome + ': ' + _cut(o[k], 60) + ' → ' + _cut(t[k], 60), antes: _s(o[k]), depois: _s(t[k]) });
    });
  });
  A.forEach((x, i) => { if (!usados.has(i)) out.push({ campo: 'Tarefas', resumo: 'Tarefa excluída: ' + _s(x && x.titulo), antes: JSON.stringify(x), depois: '' }); });
  return out;
}

// ---- diff de campos: `antes` = campos atuais no SharePoint; `patch` = campos que serão gravados ----
function diffCampos(antes, patch) {
  const out = [];
  const base = antes || {};
  for (const k of Object.keys(patch || {})) {
    if (IGNORAR.has(k)) continue;
    const novo = patch[k], velho = base[k];
    if (k === 'tarefasJson2') { diffTarefas(velho, novo).forEach(d => out.push(d)); continue; }
    if (_eq(velho, novo)) continue;
    const pv = _parse(velho), pn = _parse(novo);
    if (_plain(pv) && _plain(pn)) {            // JSON de objeto (ficha da venda, contrato...): um registro por chave alterada
      const chaves = new Set(Object.keys(pv).concat(Object.keys(pn)));
      chaves.forEach((c) => {
        const x = pv[c], y = pn[c];
        if (JSON.stringify(x === undefined ? '' : x) === JSON.stringify(y === undefined ? '' : y)) return;
        const sx = typeof x === 'object' && x !== null ? JSON.stringify(x) : _s(x), sy = typeof y === 'object' && y !== null ? JSON.stringify(y) : _s(y);
        out.push({ campo: k + '.' + c, resumo: rotulo(k) + ' — ' + c + ': ' + _cut(sx, 70) + ' → ' + _cut(sy, 70), antes: sx, depois: sy });
      });
      continue;
    }
    out.push({ campo: k, resumo: rotulo(k) + ': ' + (_s(velho) === '' ? '(vazio)' : _cut(velho, 80)) + ' → ' + (_s(novo) === '' ? '(vazio)' : _cut(novo, 80)), antes: _s(velho), depois: _s(novo) });
  }
  return out;
}

function _nomeDe(f) { f = f || {}; return _s(f.Title || f.cliente || f.nome || '').slice(0, 250); }

function _linha(entidade, registroId, registroNome, autor, acao, d, origem) {
  return {
    Title: _cut(d.resumo || (acao + ' ' + (d.campo || '')), MAX_RESUMO),
    entidade, registroId: _s(registroId), registroNome: _s(registroNome).slice(0, 250), acao,
    campo: _s(d.campo).slice(0, 250), antes: _cut(d.antes, d.max || MAX_TXT), depois: _cut(d.depois, d.max || MAX_TXT),
    resumo: _cut(d.resumo, MAX_RESUMO), autor: _s(autor || 'desconhecido').slice(0, 250),
    quando: d.quando || new Date().toISOString(), origem: origem || 'sistema',
  };
}

// Grava linhas (em lote). Tenta de novo o que falhar. Devolve { ok, gravadas, falhas }.
async function gravar(linhas) {
  if (!linhas.length) return { ok: true, gravadas: 0, falhas: 0 };
  const { id: listId } = await g.ensureList(LISTS.historico);
  let pend = linhas.slice(); let gravadas = 0;
  for (let tentativa = 0; tentativa < 3 && pend.length; tentativa++) {
    let res = [];
    try { res = await g.batchAddItems(listId, pend); } catch (e) { res = pend.map((_, i) => ({ idx: i, status: 500 })); }
    const ok = new Set(res.filter(r => r.status >= 200 && r.status < 300).map(r => r.idx));
    gravadas += ok.size;
    pend = pend.filter((_, i) => !ok.has(i));
  }
  for (const p of pend) {   // último recurso: um a um
    try { await g.addItem(listId, p); gravadas++; } catch (e) { /* conta como falha abaixo */ }
  }
  const falhas = linhas.length - gravadas;
  if (falhas > 0) console.error('HISTORICO_FALHOU', falhas, 'de', linhas.length, 'linhas');
  return { ok: falhas === 0, gravadas, falhas };
}

async function registrarCriacao(entidade, registroId, rec, autor, origem) {
  const nome = _nomeDe(rec);
  const campos = ['status', 'cliente', 'unidade', 'serv', 'valor', 'cons', 'fonte'].filter(k => rec && rec[k] !== undefined && rec[k] !== null && _s(rec[k]) !== '');
  const resumo = (entidade === 'leads' ? 'Negociação criada' : 'Registro criado (' + entidade + ')') + (nome ? ': ' + nome : '');
  const linhas = [_linha(entidade, registroId, nome, autor, 'criou', { campo: '', resumo, antes: '', depois: JSON.stringify(campos.reduce((o, k) => { o[k] = rec[k]; return o; }, {})) }, origem)];
  return gravar(linhas);
}

async function registrarEdicao(entidade, registroId, antes, patch, autor, origem) {
  const difs = diffCampos(antes, patch);
  if (!difs.length) return { ok: true, gravadas: 0, falhas: 0 };
  const nome = _nomeDe(antes);
  return gravar(difs.map(d => _linha(entidade, registroId, nome, autor, 'editou', d, origem)));
}

// Exclusão: grava a FOTO COMPLETA do registro (recuperável). Quem chama deve gravar ANTES de apagar.
async function registrarExclusao(entidade, registroId, fotoCampos, autor, origem) {
  const nome = _nomeDe(fotoCampos);
  const copia = {}; Object.keys(fotoCampos || {}).forEach(k => { if (!k.startsWith('@') && k !== 'id') copia[k] = fotoCampos[k]; });
  return gravar([_linha(entidade, registroId, nome, autor, 'excluiu', { campo: '', resumo: 'Registro excluído: ' + (nome || registroId), antes: JSON.stringify(copia), depois: '', max: 60000 }, origem)]);
}

module.exports = { diffCampos, diffTarefas, gravar, registrarCriacao, registrarEdicao, registrarExclusao, rotulo, _linha };
