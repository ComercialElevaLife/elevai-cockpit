const { LISTS } = require('../_shared/schema');
const g = require('../_shared/graph');
const { json, requireDomain } = require('../_shared/crud');

module.exports = async function (context, req) {
  if (!requireDomain(context, req)) return;
  const out = { ok: true, env: {
    hasClientId: !!process.env.AAD_CLIENT_ID,
    hasSecret: !!process.env.AAD_CLIENT_SECRET,
    tenant: process.env.TENANT_ID || '(default)',
    hostname: g.HOSTNAME, sitePath: g.SITEPATH,
  }, lists: {} };
  try {
    await g.getToken(); out.tokenOk = true;
    out.siteId = await g.getSiteId();
    for (const kind of Object.keys(LISTS)) {
      const def = LISTS[kind];
      const id = await g.findList(def.displayName);
      if (!id) { out.lists[def.displayName] = { exists: false }; continue; }
      const items = await g.listItems(id);
      out.lists[def.displayName] = { exists: true, id, count: items.length };
      // 21/09/2026 -- diagnostico temporario (Leo/Claude): investigar "Field 'obs3' is not
      // recognized" mesmo apos criar a coluna -- lista as colunas reais do SharePoint pra ver
      // se obs3 existe de fato e em que formato (allowMultipleLines, readOnly, hidden etc).
      if (kind === 'leads') {
        try {
          // pagina ate o fim (@odata.nextLink) -- a 1a tentativa desse diagnostico so olhou a
          // 1a pagina e so achou 'obs', o que pode ser paginacao escondendo obs2/obs3, nao
          // necessariamente ausencia real.
          let url = `/sites/${out.siteId}/lists/${id}/columns?$select=id,name,text,readOnly,hidden,columnGroup&$top=200`;
          let all = [];
          let pages = 0;
          while (url) {
            const cols = await g.graph('GET', url);
            all = all.concat(cols.value || []);
            url = cols['@odata.nextLink'] || null;
            pages++;
          }
          out.lists[def.displayName].total_colunas = all.length;
          out.lists[def.displayName].paginas = pages;
          out.lists[def.displayName].colunas_obs = all
            .filter(c => /^obs/i.test(c.name))
            .map(c => ({ name: c.name, text: c.text, readOnly: c.readOnly, hidden: c.hidden, columnGroup: c.columnGroup }));
          // 21/09/2026 -- diagnostico temporario (Leo/Claude): o teste_criar_obs3 revelou que o
          // Graph aceita o POST mas RENOMEIA sozinho o nome interno quando ha colisao (ex.: pedimos
          // 'obs3' e ele criou '_x006f_bs310' -- 'o' escapado + sufixo numerico). Aqui a gente lista
          // TODAS as colunas 'fantasma' desse padrao (nome comeca com _x0 = char escapado) pra medir
          // quantas tentativas anteriores (obs2, obs3, ...) ja ficaram 'enterradas' assim.
          out.lists[def.displayName].colunas_fantasma = all
            .filter(c => /^_x0/i.test(c.name))
            .map(c => ({ id: c.id, name: c.name, columnGroup: c.columnGroup }));
          out.lists[def.displayName].total_fantasmas = out.lists[def.displayName].colunas_fantasma.length;
        } catch (e) {
          out.lists[def.displayName].colunas_obs_erro = String(e.message || e);
        }
        // 21/09/2026 -- diagnostico temporario (Leo/Claude): antes de qualquer exclusao das
        // colunas fantasma, confirma que NENHUMA delas tem dado gravado (o app nunca escreveu
        // nelas por nome -- so escreve/le por 'obs'/'obs2'/'obs3'/'observacoesLead' -- mas aqui a
        // gente checa de verdade, item por item, em vez de assumir).
        try {
          const fantasmaNames = out.lists[def.displayName].colunas_fantasma.map(c => c.name);
          const itens = await g.listItems(id);
          const comDado = [];
          for (const nome of fantasmaNames) {
            const valores = itens
              .map(it => it[nome])
              .filter(v => v !== null && v !== undefined && v !== '');
            if (valores.length > 0) comDado.push({ nome, qtd_itens_com_dado: valores.length, exemplo: valores[0] });
          }
          out.lists[def.displayName].fantasmas_com_dado = comDado;
          out.lists[def.displayName].total_itens_checados = itens.length;
        } catch (e) {
          out.lists[def.displayName].fantasmas_com_dado_erro = String(e.message || e);
        }
        // 21/09/2026 -- diagnostico temporario (Leo/Claude): CONFIRMADO e resolvido. obs2/obs3
        // nunca existiram de verdade (SharePoint mutilava o nome interno a cada tentativa, gerando
        // uma coluna fantasma nova por request -- ver colunas_fantasma acima). 'observacoesLead'
        // (nome sem digito no final) foi aceito pelo SharePoint exatamente como pedido e agora e a
        // coluna real (ver schema.js/crud.js). Testes de criacao removidos daqui pra nao continuar
        // gerando fantasmas a cada chamada de /api/diag -- ja cumpriram o papel de diagnostico.
        // 22/09/2026 -- LIMPEZA (Leo autorizou): exclui as colunas fantasma aos poucos, em lotes
        // pequenos (?limpar_fantasmas=1&limite=N, default 25), com log de cada exclusao, pra poder
        // parar e avaliar se algo sair diferente do esperado. Ja confirmado antes (fantasmas_com_dado
        // acima) que nenhuma delas tem dado -- mas o log por item aqui e a rede de seguranca real.
        if (req.query && req.query.limpar_fantasmas) {
          const limite = Math.max(1, Math.min(50, parseInt(req.query.limite, 10) || 25));
          const alvo = out.lists[def.displayName].colunas_fantasma.slice(0, limite);
          const log = [];
          for (const col of alvo) {
            try {
              await g.graph('DELETE', `/sites/${out.siteId}/lists/${id}/columns/${col.id}`);
              log.push({ id: col.id, name: col.name, ok: true });
            } catch (e) {
              log.push({ id: col.id, name: col.name, ok: false, status: e.status, message: String(e.message || e) });
            }
          }
          out.lists[def.displayName].limpeza = {
            tentadas: log.length,
            sucesso: log.filter(l => l.ok).length,
            falha: log.filter(l => !l.ok).length,
            restantes_estimado: out.lists[def.displayName].total_fantasmas - log.filter(l => l.ok).length,
            log,
          };
        }
      }
    }
  } catch (e) {
    out.ok = false; out.error = String(e.message || e); out.body = e.body;
  }
  context.res = json(out.ok ? 200 : 500, out);
};
