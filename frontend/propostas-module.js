/* S.I.G.E. Novas Receitas · módulo Propostas (nativo, via Shadow DOM).
   GERADO a partir de propostas.html -- não editar à mão. */
(function(){
'use strict';
var FONTS="@font-face{font-family:M;font-weight:400;src:url(propostas-assets/fonts/montserrat-latin-400-normal.woff2)}@font-face{font-family:M;font-weight:600;src:url(propostas-assets/fonts/montserrat-latin-600-normal.woff2)}@font-face{font-family:M;font-weight:700;src:url(propostas-assets/fonts/montserrat-latin-700-normal.woff2)}@font-face{font-family:M;font-weight:800;src:url(propostas-assets/fonts/montserrat-latin-800-normal.woff2)}@font-face{font-family:MA;font-weight:700;src:url(propostas-assets/fonts/montserrat-alternates-latin-700-normal.woff2)}";
var CSS_SLIDES="\n\n\n\n\n\n@page{size:1280px 720px;margin:0}\n:host{--w:#8B3A42;--deep:#5E2A30;--mid:#A34E56;--soft:#C99AA0;--pale:#F3E3E4;--bg:#F5EFEA;--ink:#3D2E30;--mut:#8A7A78;--ln:#E7D8D9;--teal:#3E7B7E}\n*{box-sizing:border-box;margin:0;padding:0}\n.ui-root{font-family:M,sans-serif;color:var(--ink);-webkit-print-color-adjust:exact;print-color-adjust:exact}\n.pg{width:1280px;height:720px;position:relative;overflow:hidden;page-break-after:always;background:#fff;padding:56px 72px}\n.pg:last-child{page-break-after:auto}\nh1,h2,h3{font-family:MA,M,sans-serif;font-weight:700}\n.top{position:absolute;left:0;right:0;top:0;height:10px;background:linear-gradient(90deg,var(--deep),var(--w) 60%,var(--soft))}\n.tagp{position:absolute;right:72px;top:30px;font-size:10.5px;font-weight:700;letter-spacing:1.5px;color:var(--mid);text-transform:uppercase}\n.foot{position:absolute;left:72px;right:72px;bottom:22px;display:flex;justify-content:space-between;font-size:10.5px;color:var(--mut);border-top:1px solid var(--ln);padding-top:9px}\n.eyebrow{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--mid);margin-bottom:6px}\nh2{font-size:34px;color:var(--deep);margin-bottom:8px;line-height:1.15}\n.lead{font-size:17px;line-height:1.55;color:#5b4a4d;max-width:900px}\n.cover{background:linear-gradient(135deg,var(--deep),#7A3139 55%,var(--w));color:#fff;padding:0}\n.cover .logo{position:absolute;left:72px;top:56px;height:92px}\n.cover .tt{position:absolute;left:72px;top:215px;width:820px}\n.cover .k{font-size:14px;letter-spacing:3px;font-weight:700;color:#EBD9DB;margin-bottom:18px}\n.cover h1{font-size:54px;line-height:1.08;margin-bottom:20px}\n.cover .tag{font-size:16px;font-weight:600;color:#EBD9DB;letter-spacing:1px}\n.cover .for{position:absolute;left:72px;bottom:60px;font-size:15px;line-height:1.7}\n.cover .for b{font-size:26px;font-family:MA,M}\n.deco{position:absolute;right:-120px;bottom:-140px;width:560px;height:560px;border-radius:50%;border:70px solid rgba(255,255,255,.06)}\n.deco2{position:absolute;right:120px;bottom:-60px;width:260px;height:260px;border-radius:50%;background:rgba(255,255,255,.05)}\n.seal{position:absolute;right:80px;top:64px;width:150px;height:150px;border-radius:50%;border:2px solid rgba(255,255,255,.75);display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,.07)}\n.seal .n{font-size:58px;font-weight:800;line-height:1}.seal .a{font-size:14px;font-weight:700;letter-spacing:3px;text-transform:uppercase}.seal .s{font-size:9px;letter-spacing:1px;margin-top:4px;color:#EBD9DB}\n.ic{width:56px;height:56px;border-radius:50%;background:var(--w);display:flex;align-items:center;justify-content:center;flex:0 0 auto}\n.ic svg{width:28px;height:28px;stroke:#fff;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}\n.ic.sm{width:48px;height:48px}.ic.sm svg{width:24px;height:24px}\n.ic.lt{background:var(--pale)}.ic.lt svg{stroke:var(--w)}\n.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}\n.stat{background:var(--deep);color:#fff;border-radius:16px;padding:28px 14px;text-align:center}\n.stat .v{font-size:44px;font-weight:800}.stat .l{font-size:14px;color:#EBD9DB;margin-top:2px}\n.box{background:var(--bg);border-radius:16px;padding:18px 20px}\n.box h3{font-size:18px;color:var(--deep);margin-bottom:6px}.box p{font-size:15px;line-height:1.55}\n.grid{display:grid;gap:18px}.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:repeat(3,1fr)}.g4{grid-template-columns:repeat(4,1fr)}.g5{grid-template-columns:repeat(5,1fr)}.g6{grid-template-columns:repeat(3,1fr)}\n.tile{background:var(--bg);border-radius:18px;padding:26px 24px;display:flex;gap:16px;align-items:center}\n.tile b{display:block;font-size:17px;color:var(--deep);margin-bottom:2px;font-family:MA,M}.tile span{font-size:14px;line-height:1.45;color:#5b4a4d}\n.arrowrow{display:flex;align-items:stretch;gap:0}\n.chev{flex:1;background:var(--w);color:#fff;padding:30px 24px 30px 34px;position:relative;clip-path:polygon(0 0,calc(100% - 22px) 0,100% 50%,calc(100% - 22px) 100%,0 100%,22px 50%);margin-right:-10px}\n.chev:first-child{clip-path:polygon(0 0,calc(100% - 22px) 0,100% 50%,calc(100% - 22px) 100%,0 100%);padding-left:24px}\n.chev:nth-child(2){background:var(--mid)}.chev:nth-child(3){background:#7A3139}.chev:nth-child(4){background:var(--soft);color:var(--deep)}.chev:nth-child(5){background:var(--deep)}\n.chev b{display:block;font-size:34px;font-weight:800;line-height:1}.chev span{font-size:15px;font-weight:600;line-height:1.3;display:block;margin-top:6px}\n.opt{background:#fff;border:2px solid var(--ln);border-radius:20px;overflow:hidden}\n.opt .h{background:linear-gradient(120deg,var(--deep),var(--w));color:#fff;padding:18px 26px}\n.opt .h .o{font-size:12px;letter-spacing:2px;font-weight:700;color:#EBD9DB}.opt .h .t{font-family:MA;font-size:24px;margin-top:3px}\n.opt .b{padding:30px 32px}\n.price{font-size:48px;font-weight:800;color:var(--deep);line-height:1}.price small{font-size:15px;font-weight:600;color:var(--mut)}\n.row{display:flex;justify-content:space-between;font-size:15px;padding:13px 0;border-bottom:1px solid var(--ln)}.row span:first-child{color:var(--mut)}\n.note{font-size:12.5px;color:var(--mut);line-height:1.5;margin-top:14px}\n.end{background:linear-gradient(135deg,var(--deep),var(--w));color:#fff}\n.end h2{color:#fff;font-size:50px}\n.big{font-size:84px;font-weight:800;color:var(--deep);line-height:1}\n.wk{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:10px}\n.wk div{border-radius:10px;padding:16px 0;text-align:center;font-size:14px;font-weight:700;background:#F0E8E8;color:#b9a9ab}\n.wk div.on{background:var(--w);color:#fff}.wk div i{display:block;font-style:normal;font-size:12px;font-weight:600;margin-top:1px;opacity:.9}\n";
var CSS_UI="\n/* UI da tela (prefixo ui-) \u2014 o CSS das l\u00e2minas vem de propostas.css */\n:host{display:block;--ui-bg:#F7F2EE}\n\n.ui-root{background:var(--ui-bg);font-family:M,Montserrat,system-ui,sans-serif;color:#3D2E30}\n.ui-wrap{display:grid;grid-template-columns:372px 1fr;height:calc(100vh - 150px);min-height:620px;border-radius:14px;overflow:hidden;border:1px solid #E7D8D9}\n.ui-side{overflow:auto;background:#fff;border-right:1px solid #E7D8D9;padding:16px 16px 40px}\n.ui-main{overflow:auto;padding:16px 20px 60px}\n.ui-side h1{font-size:17px;color:#5E2A30;margin-bottom:2px}\n.ui-side .sub{font-size:11.5px;color:#8A7A78;margin-bottom:12px}\n.ui-sec{border:1px solid #E7D8D9;border-radius:12px;padding:10px 12px;margin-bottom:10px;background:#FFFCFB}\n.ui-sec>h3{font-size:12.5px;color:#8B3A42;letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;gap:8px}\n.ui-sec label{display:block;font-size:11px;color:#8A7A78;margin:6px 0 2px}\n.ui-sec input,.ui-sec select,.ui-sec textarea{width:100%;font:inherit;font-size:13px;border:1px solid #DCC9CB;border-radius:8px;padding:6px 8px;background:#fff;color:#3D2E30}\n.ui-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}\n.ui-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}\n.ui-chk{display:flex;align-items:center;gap:8px;font-size:13px;margin:5px 0}\n.ui-chk input{width:auto}\n.ui-opt{border:1px dashed #C99AA0;border-radius:10px;padding:8px 10px;margin-top:8px;background:#fff}\n.ui-opt .hd{display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:700;color:#5E2A30}\n.ui-price{font-family:MA,M,sans-serif;font-size:16px;color:#5E2A30;margin-top:6px}\n.ui-btn{font:inherit;font-size:13px;font-weight:700;border:0;border-radius:10px;padding:9px 14px;cursor:pointer;background:#8B3A42;color:#fff}\n.ui-btn.sec{background:#F3E3E4;color:#5E2A30}\n.ui-btn.sm{padding:3px 9px;font-size:11px}\n.ui-bar{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}\n.ui-hint{font-size:11px;color:#8A7A78;line-height:1.45}\n.ui-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}\n.ui-top .hint{font-size:12px;color:#8A7A78}\n#preview .slot{margin:0 auto 18px;box-shadow:0 8px 24px rgba(94,42,48,.15);background:#fff;overflow:hidden;border-radius:6px}\n#preview .slot .pg{transform-origin:0 0}\n[contenteditable]:hover{outline:1px dashed #C99AA0}\n[contenteditable]:focus{outline:2px solid #8B3A42}\n.ui-empty{padding:60px 20px;text-align:center;color:#8A7A78;font-size:14px}\n";
var HTML="<div class=\"ui-wrap\">\n<aside class=\"ui-side\">\n  <h1>Propostas</h1>\n  <div class=\"sub\">Escolha o servi\u00e7o, ajuste os par\u00e2metros e gere a proposta edit\u00e1vel. Os valores v\u00eam das calculadoras de precifica\u00e7\u00e3o.</div>\n\n  <div class=\"ui-sec\"><h3>Cliente</h3>\n    <label>Nome do cliente</label><input id=\"f-cliente\" value=\"ATVOS\">\n    <label>A/C (aos cuidados de)</label><textarea id=\"f-ac\" rows=\"2\">Dr. Phelipe Monteiro Felicio e Sra. Tatiane da Silva Sousa</textarea>\n    <div class=\"ui-row\"><div><label>Cidade</label><input id=\"f-cidade\" value=\"S\u00e3o Paulo\"></div><div><label>Data</label><input id=\"f-data\" type=\"date\"></div></div>\n  </div>\n\n  <div class=\"ui-sec\"><h3>Servi\u00e7os</h3>\n    <label class=\"ui-chk\"><input type=\"checkbox\" id=\"s-ergo\" checked> Gest\u00e3o de Ergonomia</label>\n    <label class=\"ui-chk\"><input type=\"checkbox\" id=\"s-nr1\" checked> Diagn\u00f3stico NR-1 (psicossocial)</label>\n    <label class=\"ui-chk\"><input type=\"checkbox\" id=\"s-gl\"> Gin\u00e1stica Laboral</label>\n    <div class=\"ui-hint\">Cada servi\u00e7o gera um bloco de p\u00e1ginas. Ergonomia + NR-1 saem na mesma proposta, separados por assunto.</div>\n  </div>\n\n  <div class=\"ui-sec\" id=\"box-ergo\"><h3>Ergonomia <button class=\"ui-btn sm sec\" id=\"add-ergo\" type=\"button\">+ op\u00e7\u00e3o</button></h3>\n    <div id=\"ergo-opts\"></div>\n  </div>\n\n  <div class=\"ui-sec\" id=\"box-nr1\"><h3>NR-1 psicossocial</h3>\n    <div class=\"ui-row\"><div><label>Vidas</label><input id=\"n-vidas\" type=\"number\" value=\"11000\" min=\"1\"></div><div><label>Valor/hora an\u00e1lise (R$)</label><input id=\"n-vh\" type=\"number\" value=\"150\"></div></div>\n    <div class=\"ui-row3\"><div><label>Etapa 1 (R$)</label><input id=\"n-e1\" type=\"number\" value=\"1600\"></div><div><label>Etapa 2 (R$)</label><input id=\"n-e2\" type=\"number\" value=\"1600\"></div><div><label>Reuni\u00e3o (R$)</label><input id=\"n-reu\" type=\"number\" value=\"400\"></div></div>\n    <label>Minutos de an\u00e1lise por vida</label><input id=\"n-min\" type=\"number\" value=\"2\" step=\"0.5\">\n    <div class=\"ui-price\" id=\"n-total\"></div>\n  </div>\n\n  <div class=\"ui-sec\" id=\"box-gl\"><h3>Gin\u00e1stica Laboral <button class=\"ui-btn sm sec\" id=\"add-gl\" type=\"button\">+ op\u00e7\u00e3o</button></h3>\n    <div class=\"ui-row\"><div><label>Local do programa</label><input id=\"g-local\" value=\"Sede \u00b7 Pinheiros\"></div><div><label>Cidade/unidade (texto)</label><input id=\"g-local2\" value=\"sede de Pinheiros\"></div></div>\n    <div id=\"gl-opts\"></div>\n  </div>\n\n  <div class=\"ui-sec\"><h3>Prazos e condi\u00e7\u00f5es</h3>\n    <div class=\"ui-row3\"><div><label>Pagamento (dias)</label><input id=\"c-pag\" type=\"number\" value=\"30\"></div><div><label>Mobiliza\u00e7\u00e3o (dias)</label><input id=\"c-imp\" type=\"number\" value=\"30\"></div><div><label>Validade (dias)</label><input id=\"c-val\" type=\"number\" value=\"30\"></div></div>\n    <label>Reajuste</label><input id=\"c-reaj\" value=\"IPCA (a cada 12 meses)\">\n    <div class=\"ui-row\"><div><label>C\u00f3digo \u00b7 Ergonomia/NR-1</label><input id=\"c-cod-ergo\" value=\"08.02.01\"></div><div><label>C\u00f3digo \u00b7 GL</label><input id=\"c-cod-gl\" value=\"04.08.02\"></div></div>\n    <label>Descri\u00e7\u00e3o do c\u00f3digo \u00b7 Ergonomia/NR-1</label><input id=\"c-obs-ergo\" value=\"Instru\u00e7\u00e3o, treinamento, orienta\u00e7\u00e3o pedag\u00f3gica e educacional, avalia\u00e7\u00e3o de conhecimentos de qualquer natureza\">\n    <label>Descri\u00e7\u00e3o do c\u00f3digo \u00b7 GL</label><input id=\"c-obs-gl\" value=\"Terapia ocupacional, fisioterapia e fonoaudiologia\">\n    <label>CNPJ e raz\u00e3o social (GL)</label><input id=\"c-cnpj-gl\" value=\"15.447.255/0001-74 \u00b7 ELEVALIFE SA\u00daDE E EDUCA\u00c7\u00c3O LTDA\">\n    <label class=\"ui-chk\"><input type=\"checkbox\" id=\"c-ref\" checked> Observa\u00e7\u00e3o de alimenta\u00e7\u00e3o (Ergonomia, jornada &gt; 6 h)</label>\n  </div>\n\n  <div class=\"ui-bar\"><button class=\"ui-btn\" id=\"btn-gerar\" type=\"button\">Gerar proposta</button><button class=\"ui-btn sec\" id=\"btn-print\" type=\"button\">Imprimir / PDF</button></div>\n  <div class=\"ui-sec\"><h3>SharePoint</h3>\n    <div class=\"ui-bar\" style=\"margin:0 0 8px\"><button class=\"ui-btn\" id=\"btn-save\" type=\"button\">Salvar proposta</button><button class=\"ui-btn sec\" id=\"btn-open\" type=\"button\">Abrir salvas</button></div>\n    <label>Anexar o PDF final (opcional)</label><input id=\"f-pdf\" type=\"file\" accept=\"application/pdf\">\n    <div class=\"ui-bar\" style=\"margin:8px 0 0\"><button class=\"ui-btn sec\" id=\"btn-pdf\" type=\"button\">Enviar PDF ao SharePoint</button></div>\n    <div class=\"ui-hint\" id=\"sp-msg\" style=\"margin-top:8px\"></div>\n  </div>\n  <div class=\"ui-sec\" id=\"box-mail\"><h3>Enviar por e-mail</h3>\n    <label>Oportunidade no Kanban</label>\n    <select id=\"e-lead\"><option value=\"\">Digite o cliente acima\u2026</option></select>\n    <div class=\"ui-row\"><div><label>Contato (nome)</label><input id=\"e-contato\" placeholder=\"Nome do contato\"></div><div><label>Servi\u00e7o (Kanban)</label><input id=\"e-serv\" placeholder=\"Ex.: ERGO + NR-1\"></div></div>\n    <div class=\"ui-row3\"><div><label>Valor mensal (R$)</label><input id=\"e-vmes\" type=\"number\" step=\"0.01\"></div><div><label>Meses</label><input id=\"e-meses\" type=\"number\" value=\"12\" min=\"1\"></div><div><label>Valor total (R$)</label><input id=\"e-vtot\" type=\"number\" step=\"0.01\"></div></div>\n    <label>Para (separe com v\u00edrgula)</label><input id=\"e-para\" placeholder=\"nome@empresa.com.br\">\n    <label>CC adicional</label><input id=\"e-cc\" placeholder=\"Fixos: leonardo@ e rafael@\">\n    <label>Assunto</label><input id=\"e-assunto\">\n    <label>Mensagem</label><textarea id=\"e-corpo\" rows=\"11\"></textarea>\n    <label>Assinatura</label><textarea id=\"e-assin\" rows=\"3\"></textarea>\n    <label>PDF da proposta (anexo)</label>\n    <div class=\"ui-hint\">Usa o arquivo escolhido em \u201cAnexar o PDF final\u201d, acima (at\u00e9 3 MB).</div>\n    <div class=\"ui-bar\" style=\"margin:8px 0 0\"><button class=\"ui-btn sec\" id=\"e-tpl\" type=\"button\">Restaurar modelo</button><button class=\"ui-btn\" id=\"e-send\" type=\"button\">Enviar proposta</button></div>\n    <div class=\"ui-hint\" id=\"e-msg\" style=\"margin-top:8px\"></div>\n  </div>\n  <div class=\"ui-hint\">Gerar de novo refaz todas as p\u00e1ginas e descarta edi\u00e7\u00f5es manuais. Para o PDF, use \u201cImprimir / PDF\u201d, escolha \u201cSalvar como PDF\u201d e depois anexe o arquivo acima. \u201cSalvar proposta\u201d guarda a vers\u00e3o edit\u00e1vel.</div>\n</aside>\n\n<main class=\"ui-main\">\n  <div class=\"ui-top\"><b style=\"color:#5E2A30\">Pr\u00e9-visualiza\u00e7\u00e3o edit\u00e1vel</b><span class=\"hint\">Clique em qualquer texto da proposta para editar.</span></div>\n  <div id=\"preview\"><div class=\"ui-empty\">Defina os par\u00e2metros e clique em <b>Gerar proposta</b>.</div></div>\n</main>\n</div>\n\n<div id=\"ov\" style=\"display:none;position:fixed;inset:0;background:rgba(61,46,48,.45);z-index:50;align-items:center;justify-content:center\"><div style=\"background:#fff;border-radius:14px;width:min(640px,92vw);max-height:80vh;overflow:auto;padding:16px 18px\"><div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px\"><b style=\"color:#5E2A30\">Propostas salvas no SharePoint</b><button class=\"ui-btn sec sm\" id=\"ov-x\" type=\"button\">fechar</button></div><div id=\"ov-list\" style=\"font-size:13px\"></div></div></div>";
var mounted=false;
function loadTpl(cb){
  if(window.PROP_TPL) return cb();
  var s=document.createElement('script');s.src='propostas-templates.js';s.onload=cb;
  s.onerror=function(){console.error('propostas-templates.js nao carregou');};
  document.head.appendChild(s);
}
window.PropostasModule={
  mount:function(host){
    if(mounted||!host) return;
    mounted=true;
    if(!document.getElementById('prop-fonts')){var st=document.createElement('style');st.id='prop-fonts';st.textContent=FONTS;document.head.appendChild(st);}
    var R=host.attachShadow({mode:'open'});
    R.innerHTML='<style>'+CSS_SLIDES+CSS_UI+'</style><div class="ui-root">'+HTML+'</div>';
    loadTpl(function(){ run(R); });
  },
  refit:function(){ window.dispatchEvent(new Event('resize')); }
};
function run(R){

function printPreview(){
  var pages=[].map.call(R.querySelectorAll('#preview .pg'),function(p){var c=p.cloneNode(true);c.removeAttribute('contenteditable');c.style.transform='none';return '<div class="slot">'+c.outerHTML+'</div>';}).join('');
  var f=document.createElement('iframe');f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';document.body.appendChild(f);
  var d=f.contentWindow.document;d.open();
  d.write('<!doctype html><html><head><meta charset="utf-8"><base href="'+document.baseURI+'"><style>'+FONTS+CSS_SLIDES+'@page{size:1280px 720px;margin:0}body{margin:0}.slot{width:1280px;height:720px;overflow:hidden;page-break-after:always}</style></head><body>'+pages+'</body></html>');
  d.close();
  setTimeout(function(){f.contentWindow.focus();f.contentWindow.print();setTimeout(function(){f.remove();},2000);},600);
}

(function(){
'use strict';
var $=function(id){return R.getElementById(id);};
var BRL=function(v){return 'R$ '+v.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');};
var r2=function(v){return Math.round(v*100)/100;};

/* ===== Calculadoras (espelham as planilhas “6 - MODELO DE PRECIFICAÇÕES”) =====
   Regras: valor CLT-Capital da tabela de referência; PJ = CLT x (1,30/3,00 x 2,20) ;
   Interior = -15% ; Difícil acesso = +10% sobre o valor final. */
var PJ_F=1.3/3*2.2, INT_F=0.85, DIF_F=1.10;
var ERGO={ /* CLT · Capital/RM · valor mensal por CH semanal */
  JR:{40:13500,30:10800,24:8775,20:8100,16:6885,12:4455,8:3786.75},
  PL:{40:16500,30:13200,24:10725,20:9900,16:8415,12:5445,8:4628.25},
  SR:{40:19500,30:15600,24:12675,20:11700,16:9945,12:6435,8:5469.75}};
var GL={ /* CLT · Capital/RM · [freq/sem][CH/dia] */
 1:{1:1299.00,1.5:1704.94,2:1989.09,2.5:2175.57,3:2284.35,4:2665.07,5:2914.93,6:3060.67,7:3124.44,8:3124.44},
 2:{1:2208.30,1.5:2898.39,2:3381.46,2.5:3698.47,3:3883.39,4:4530.63,5:4955.37,6:5203.14,7:5311.54,8:5311.54},
 3:{1:2922.75,1.5:3836.11,2:4475.46,2.5:4895.04,3:5139.79,4:5996.42,5:6558.58,6:6886.51,7:7029.98,8:7029.98},
 4:{1:3377.40,1.5:4432.84,2:5171.64,2.5:5656.49,3:5939.31,4:6929.19,5:7578.81,6:7957.75,7:8123.53,8:8123.53},
 5:{1:3572.25,1.5:4688.58,2:5470.01,2.5:5982.82,3:6281.96,3.5:6412.84,4:6412.84,5:7214.44,6:7791.60,7:8181.18,8:8414.92,9:8520.11}};
function adj(base,o){var v=base; if(o.regime==='PJ') v=r2(v*PJ_F); if(o.loc==='Interior') v=r2(v*INT_F); if(o.acesso==='Difícil acesso') v=r2(v*DIF_F); return v;}
function priceErgo(o){var t=ERGO[o.sen]; var b=t&&t[o.ch]; return b==null?null:adj(b,o);}
function priceGL(o){var t=GL[o.freq]; var b=t&&t[o.hdia]; return b==null?null:adj(b,o);}

var NIV={JR:'júnior',PL:'pleno',SR:'sênior'};
var DAYS={1:[2],2:[1,3],3:[0,2,4],4:[0,1,3,4],5:[0,1,2,3,4]};
var DN=['Seg','Ter','Qua','Qui','Sex'];

/* ===== opções ===== */
var ergoOpts=[{ch:16,sen:'PL',regime:'CLT',loc:'Capital / Região Metropolitana',acesso:'Difícil acesso',qtd:1},{ch:24,sen:'PL',regime:'CLT',loc:'Capital / Região Metropolitana',acesso:'Difícil acesso',qtd:1}];
var glOpts=[{hdia:2,freq:2,regime:'CLT',loc:'Capital / Região Metropolitana',acesso:'Fácil acesso',qtd:1},{hdia:2,freq:3,regime:'CLT',loc:'Capital / Região Metropolitana',acesso:'Fácil acesso',qtd:1}];

function sel(id,opts,val,extra){return '<select data-k="'+id+'" '+(extra||'')+'>'+opts.map(function(o){var v=Array.isArray(o)?o[0]:o,l=Array.isArray(o)?o[1]:o;return '<option value="'+v+'"'+(String(v)===String(val)?' selected':'')+'>'+l+'</option>';}).join('')+'</select>';}
var LOCS=['Capital / Região Metropolitana','Interior'];
function renderErgo(){
  $('ergo-opts').innerHTML=ergoOpts.map(function(o,i){
    var p=priceErgo(o);
    return '<div class="ui-opt" data-i="'+i+'"><div class="hd"><span>Opção '+String.fromCharCode(65+i)+'</span>'+(ergoOpts.length>1?'<button class="ui-btn sm sec" data-del="'+i+'" type="button">remover</button>':'')+'</div>'+
    '<div class="ui-row"><div><label>Regime</label>'+sel('regime',['CLT','PJ'],o.regime)+'</div><div><label>Senioridade</label>'+sel('sen',[['JR','Júnior'],['PL','Pleno'],['SR','Sênior']],o.sen)+'</div></div>'+
    '<div class="ui-row"><div><label>Carga semanal (h)</label>'+sel('ch',[40,30,24,20,16,12,8],o.ch)+'</div><div><label>Quantidade</label><input data-k="qtd" type="number" min="1" value="'+o.qtd+'"></div></div>'+
    '<div class="ui-row"><div><label>Localidade</label>'+sel('loc',LOCS,o.loc)+'</div><div><label>Acesso</label>'+sel('acesso',['Fácil acesso','Difícil acesso'],o.acesso)+'</div></div>'+
    '<div class="ui-price">'+(p==null?'—':BRL(p*o.qtd)+' / mês')+'</div></div>';}).join('');
  bindOpts('ergo-opts',ergoOpts,renderErgo);
}
function renderGL(){
  $('gl-opts').innerHTML=glOpts.map(function(o,i){
    var p=priceGL(o);
    var hs=[1,1.5,2,2.5,3,4,5,6,7,8];
    return '<div class="ui-opt" data-i="'+i+'"><div class="hd"><span>Opção '+(i+1)+'</span>'+(glOpts.length>1?'<button class="ui-btn sm sec" data-del="'+i+'" type="button">remover</button>':'')+'</div>'+
    '<div class="ui-row"><div><label>Regime</label>'+sel('regime',['CLT','PJ'],o.regime)+'</div><div><label>Quantidade</label><input data-k="qtd" type="number" min="1" value="'+o.qtd+'"></div></div>'+
    '<div class="ui-row"><div><label>Horas por aula (dia)</label>'+sel('hdia',hs,o.hdia)+'</div><div><label>Vezes por semana</label>'+sel('freq',[1,2,3,4,5],o.freq)+'</div></div>'+
    '<div class="ui-row"><div><label>Localidade</label>'+sel('loc',LOCS,o.loc)+'</div><div><label>Acesso</label>'+sel('acesso',['Fácil acesso','Difícil acesso'],o.acesso)+'</div></div>'+
    '<div class="ui-price">'+(p==null?'combinação fora da tabela':BRL(p*o.qtd)+' / mês')+'</div></div>';}).join('');
  bindOpts('gl-opts',glOpts,renderGL);
}
function bindOpts(boxId,arr,rerender){
  var box=$(boxId);
  box.querySelectorAll('[data-k]').forEach(function(el){el.onchange=function(){
    var i=+el.closest('.ui-opt').dataset.i,k=el.dataset.k,v=el.value;
    if(['ch','qtd','freq'].indexOf(k)>=0||k==='hdia') v=parseFloat(v);
    arr[i][k]=v; rerender();};});
  box.querySelectorAll('[data-del]').forEach(function(b){b.onclick=function(){arr.splice(+b.dataset.del,1);rerender();};});
}
$('add-ergo').onclick=function(){if(ergoOpts.length<4){ergoOpts.push({ch:20,sen:'PL',regime:'CLT',loc:'Capital / Região Metropolitana',acesso:'Fácil acesso',qtd:1});renderErgo();}};
$('add-gl').onclick=function(){if(glOpts.length<4){glOpts.push({hdia:2,freq:2,regime:'CLT',loc:'Capital / Região Metropolitana',acesso:'Fácil acesso',qtd:1});renderGL();}};

/* NR-1 */
function nr1Calc(){
  var vidas=+$('n-vidas').value||0,vh=+$('n-vh').value||0,e1=+$('n-e1').value||0,e2=+$('n-e2').value||0,reu=+$('n-reu').value||0,mi=+$('n-min').value||0;
  var analise=r2(vidas*(mi/60)*vh), e3=r2(analise+reu), total=r2(e1+e2+e3);
  return {vidas:vidas,e1:e1,e2:e2,e3:e3,total:total,porVida:vidas?total/vidas:0};
}
function showNr1(){var c=nr1Calc();$('n-total').textContent='Total '+BRL(c.total)+'  ·  Etapa 3 '+BRL(c.e3);}
['n-vidas','n-vh','n-e1','n-e2','n-reu','n-min'].forEach(function(id){$(id).oninput=showNr1;});

function svcToggle(){$('box-ergo').style.display=$('s-ergo').checked?'':'none';$('box-nr1').style.display=$('s-nr1').checked?'':'none';$('box-gl').style.display=$('s-gl').checked?'':'none';}
['s-ergo','s-nr1','s-gl'].forEach(function(id){$(id).onchange=svcToggle;});

/* ===== geração das lâminas ===== */
var T=window.PROP_TPL;
function fill(h,ctx){return h.replace(/\{\{CLIENTE\}\}/g,ctx.cliente).replace(/\{\{VIDAS\}\}/g,ctx.vidas);}
function tagp(t){return '<div class="tagp">'+t+'</div>';}
function head(eb,title,sub,tag){return '<div class="top"></div><div class="tagp">'+tag+'</div><div class="eyebrow">'+eb+'</div><h2>'+title+'</h2>'+(sub?'<p class="lead">'+sub+'</p>':'');}
function foot(ctx){return '<div class="foot"><span>ElevaLife · Proposta '+ctx.cliente+'</span><span>{{N}}</span></div>';}
function week(days,lab){return '<div class="wk">'+DN.map(function(d,i){var on=days.indexOf(i)>=0;return '<div class="'+(on?'on':'')+'">'+d+(on?'*':'')+'<i>'+(on?lab:'')+'</i></div>';}).join('')+'</div>';}
function cal(){return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8B3A42" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';}
function hlabel(h){return String(h).replace('.',',');}
function visitCard(opt,title,visits,hrs,total,prof,ctx){
  var dots='';for(var i=0;i<visits;i++)dots+=cal();
  var days=DAYS[Math.min(visits,5)]||DAYS[5];
  return '<div class="opt"><div class="h"><div class="o">'+opt+'</div><div class="t">'+title+'</div></div><div class="b">'+
  '<div style="display:flex;align-items:center;gap:14px"><div class="big">'+visits+'</div><div><div style="font-family:MA;font-size:20px;color:var(--deep)">'+(visits>1?'visitas por semana':'visita por semana')+'</div><div style="font-size:14px;color:var(--mut)">de '+hlabel(hrs)+' horas cada</div></div><div style="margin-left:auto;display:flex;gap:4px">'+dots+'</div></div>'+
  week(days,hlabel(hrs)+' h')+'<div style="font-size:11px;color:var(--mut);margin-top:6px">* Dias propostos, a definir em conjunto com '+ctx.cliente+'.</div>'+
  '<div class="row" style="margin-top:12px"><span>Profissional</span><b>'+prof+'</b></div><div class="row"><span>Carga total</span><b>'+total+'</b></div></div></div>';
}
function gridCols(n){return 'grid-template-columns:repeat('+Math.min(n,2)+',1fr)';}
function pageWrap(inner){return '<section class="pg">'+inner+'</section>';}

function ergoVisits(ctx){
  var cards=ergoOpts.map(function(o,i){var v=Math.max(1,Math.ceil(o.ch/8)),hrs=o.ch/v;
    return visitCard('OPÇÃO '+String.fromCharCode(65+i),o.ch+' horas semanais',v,hrs,o.ch+' h/semana',(o.qtd>1?o.qtd+' especialistas':'1 especialista')+' em ergonomia, nível '+NIV[o.sen],ctx);}).join('');
  return pageWrap(head('Quem atua e quando','Presença em campo, com rotina definida','',ctx.tagE)+'<div class="grid" style="margin-top:20px;'+gridCols(ergoOpts.length)+'">'+cards+'</div><p class="note">Coordenação técnica inclusa. Profissional contratado em regime '+(ergoOpts[0]?ergoOpts[0].regime:'CLT')+'.</p>'+foot(ctx));
}
function investCard(o,t,rows,price,anual){
  return '<div class="opt"><div class="h"><div class="o">'+o+'</div><div class="t">'+t+'</div></div><div class="b"><div class="price">'+price+' <small>/ mês</small></div>'+
  rows.map(function(r,i){return '<div class="row"'+(i===0?' style="margin-top:16px"':'')+'><span>'+r[0]+'</span><b>'+r[1]+'</b></div>';}).join('')+'<div class="row"><span>Valor em 12 meses</span><b>'+anual+'</b></div></div></div>';
}
function ergoInvest(ctx){
  var cards=ergoOpts.map(function(o,i){var v=Math.max(1,Math.ceil(o.ch/8)),p=(priceErgo(o)||0)*o.qtd;
    return investCard('OPÇÃO '+String.fromCharCode(65+i),o.ch+' horas semanais',[['Profissional',(o.qtd>1?o.qtd+' especialistas':'1 especialista')+' em ergonomia, nível '+NIV[o.sen]],['Presença em campo',v+(v>1?' visitas semanais':' visita semanal')+' de '+hlabel(o.ch/v)+' h'],['Coordenação técnica','Inclusa']],BRL(p),BRL(p*12));}).join('');
  return pageWrap(head('Investimento · Gestão de Ergonomia','Opções de presença','',ctx.tagE)+'<div class="grid" style="margin-top:22px;'+gridCols(ergoOpts.length)+'">'+cards+'</div><p class="note">Valores mensais, com impostos inclusos e emissão de nota fiscal.'+(ctx.ref?'<br>Refeição não inclusa: fica a cargo da contratante nos casos aplicáveis (jornada acima de 6 horas).':'')+'</p>'+foot(ctx));
}
function glVisits(ctx){
  var cards=glOpts.map(function(o,i){return visitCard('OPÇÃO '+(i+1),o.freq+(o.freq>1?' vezes por semana':' vez por semana'),o.freq,o.hdia,hlabel(o.freq*o.hdia)+' h/semana',(o.qtd>1?o.qtd+' professores':'1 professor')+' de ginástica laboral',ctx);}).join('');
  return pageWrap(head('Quem atua e quando','Rotina de aulas na sede','',ctx.tagG)+'<div class="grid" style="margin-top:20px;'+gridCols(glOpts.length)+'">'+cards+'</div><p class="note">Coordenação técnica inclusa.</p>'+foot(ctx));
}
function glInvest(ctx){
  var cards=glOpts.map(function(o,i){var p=(priceGL(o)||0)*o.qtd;
    return investCard('OPÇÃO '+(i+1),o.freq+(o.freq>1?' vezes por semana':' vez por semana'),[['Profissional',(o.qtd>1?o.qtd+' professores':'1 professor')+' de ginástica laboral'],['Frequência',o.freq+(o.freq>1?' visitas semanais':' visita semanal')+' de '+hlabel(o.hdia)+' h'],['Local',ctx.glLocal],['Coordenação técnica','Inclusa']],BRL(p),BRL(p*12));}).join('');
  return pageWrap(head('Investimento · Ginástica Laboral','Opções de frequência','',ctx.tagG)+'<div class="grid" style="margin-top:22px;'+gridCols(glOpts.length)+'">'+cards+'</div><p class="note">Valores mensais, com impostos inclusos e emissão de nota fiscal.</p>'+foot(ctx));
}
function nr1Invest(ctx){
  var c=ctx.nr1;
  var rows=[['Etapa 1','Diagnóstico preliminar organizacional',BRL(c.e1)],['Etapa 2','Treinamento gerencial, informativo em vídeo e material gráfico',BRL(c.e2)],['Etapa 3','Questionário HSE-IT para '+c.vidas.toLocaleString('pt-BR')+' vidas, análise, relatório com plano de ação e reunião de resultados',BRL(c.e3)]];
  var r=rows.map(function(x){return '<div style="display:flex;align-items:center;gap:18px;padding:16px 0;border-bottom:1px solid var(--ln)"><div style="width:84px;font-weight:800;color:var(--mid);font-size:13px">'+x[0].toUpperCase()+'</div><div style="flex:1;font-size:14px">'+x[1]+'</div><div style="font-family:MA;font-size:20px;color:var(--deep)">'+x[2]+'</div></div>';}).join('');
  return pageWrap(head('Investimento · Diagnóstico NR-1','Valor do levantamento psicossocial','',ctx.tagN)+
  '<div class="grid" style="grid-template-columns:1.7fr 1fr;gap:28px;margin-top:20px"><div>'+r+'<p class="note">Valor único do projeto, com impostos inclusos e emissão de nota fiscal.</p></div>'+
  '<div class="opt"><div class="h"><div class="o">TOTAL DO PROJETO</div><div class="t">'+c.vidas.toLocaleString('pt-BR')+' vidas</div></div><div class="b"><div class="price">'+BRL(c.total)+'</div><div class="row" style="margin-top:16px"><span>Por vida avaliada</span><b>≈ '+BRL(c.porVida)+'</b></div><div class="row"><span>Escopo</span><b>3 etapas</b></div><div class="row"><span>Método</span><b>ISO 45003 + HSE-IT</b></div></div></div></div>'+foot(ctx));
}
function condTable(rows){
  var th='padding:11px 14px;font-size:12.5px;letter-spacing:1px;font-weight:800;color:#fff;background:#A34E56;text-align:center';
  var body=rows.map(function(r,i){var bg=i%2===0?'#F3E3E4':'#FAF3F3';return '<tr style="background:'+bg+'"><td style="padding:17px 16px;font-weight:800;font-size:14.5px;color:var(--deep);width:24%">'+r[0]+'</td><td style="padding:17px 16px;font-size:14.5px;text-align:center;width:36%">'+r[1]+'</td><td style="padding:17px 16px;font-size:13px;text-align:center;color:#5b4a4d;width:40%">'+r[2]+'</td></tr>';}).join('');
  return '<table style="width:100%;border-collapse:collapse;margin-top:18px"><thead><tr><th style="'+th+'">ITEM</th><th style="'+th+'">PRAZO / CONDIÇÃO</th><th style="'+th+'">OBSERVAÇÃO</th></tr></thead><tbody>'+body+'</tbody></table>';
}
function conditions(ctx){
  var out=[];
  function rows(cod,obs,ali,extra){
    var r=[['Início dos serviços','Até '+ctx.imp+' dias após a assinatura do contrato e/ou aprovação do pedido','--'],['Condição de pagamento',ctx.pag+' dias','--'],['Paramétrica de reajuste',ctx.reaj,'--'],['Tempo de mobilização',ctx.imp+' dias','--'],['Impostos','Inclusos, com emissão de nota fiscal',ali||'--'],['Validade da proposta',ctx.val+' dias corridos','--'],['Código do serviço',cod,obs||'--']];
    return r.concat(extra||[]);
  }
  if(ctx.ergo||ctx.nr1on) out.push(pageWrap(head('Condições comerciais','Prazos e condições','','Condições')+condTable(rows(ctx.codErgo,ctx.obsErgo,(ctx.ergo&&ctx.ref)?'Alimentação não inclusa, quando aplicável (jornada acima de 6 h)':'--'))+foot(ctx)));
  if(ctx.gl){
    var cn=(ctx.cnpjGL||'').split(' · ');
    out.push(pageWrap(head('Condições comerciais','Prazos e condições'+((ctx.ergo||ctx.nr1on)?' · Ginástica Laboral':''),'','Condições')+condTable(rows(ctx.codGL,ctx.obsGL,'--',cn[0]?[['CNPJ',cn[0],cn.slice(1).join(' · ')||'--']]:[]))+foot(ctx)));
  }
  return out;
}

function fmtDate(v){var d=v?new Date(v+'T12:00:00'):new Date();var m=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];return d.getDate()+' de '+m[d.getMonth()]+' de '+d.getFullYear();}

function gerar(){
  var ergo=$('s-ergo').checked,nr1on=$('s-nr1').checked,gl=$('s-gl').checked;
  if(!ergo&&!nr1on&&!gl){alert('Selecione ao menos um serviço.');return;}
  var cliente=$('f-cliente').value.trim()||'Cliente';
  var nr=nr1Calc();
  var ctx={cliente:cliente,vidas:nr.vidas.toLocaleString('pt-BR'),nr1:nr,ergo:ergo,nr1on:nr1on,gl:gl,
    pag:$('c-pag').value||30,imp:$('c-imp').value||30,val:$('c-val').value||30,reaj:$('c-reaj').value,ref:$('c-ref').checked,codErgo:$('c-cod-ergo').value,codGL:$('c-cod-gl').value,obsErgo:$('c-obs-ergo').value,obsGL:$('c-obs-gl').value,cnpjGL:$('c-cnpj-gl').value,glLocal:$('g-local').value,
    tagE:'Proposta · Gestão de Ergonomia',tagN:'Proposta · Diagnóstico NR-1',tagG:'Proposta · Programa de Ginástica Laboral'};
  var names=[];if(ergo)names.push('Gestão de Ergonomia');if(nr1on)names.push('Diagnóstico NR-1');if(gl)names.push('Programa de Ginástica Laboral');
  var title=ergo&&nr1on&&!gl?'Gestão de Ergonomia<br>e Diagnóstico NR-1':(names.length===1&&gl?'Programa de<br>Ginástica Laboral':names.join('<br>'));
  var sub=gl&&!ergo&&!nr1on?($('g-local2').value?'SEDE · '+$('g-local').value.replace(/^Sede\s*·\s*/i,'').toUpperCase()+' · CUIDADO QUE GERA RESULTADO':'CUIDADO QUE GERA RESULTADO'):'CUIDADO QUE GERA RESULTADO';
  var ac='<b>'+cliente+'</b><br>A/C '+$('f-ac').value.replace(/\n/g,' ')+'<br>'+($('f-cidade').value||'')+', '+fmtDate($('f-data').value);
  var S=[];
  var cover=T.cover.replace('{{TITLE}}',title).replace('{{SUBTITLE}}',sub).replace('{{AC}}',ac);
  S.push(cover,T.about,T.clients);
  if(ergo){
    var lv=ergoOpts[0]||{sen:'PL',regime:'CLT'};
    S.push(T.scenario,T.hub,T.cycle,T.ergo_method,T.team_ergo.replace('{{PROF_NIVEL}}','Nível '+NIV[lv.sen]+' · '+lv.regime),ergoVisits(ctx),T.ergo_deliv,T.ergo_ind,T.ergo_rep,ergoInvest(ctx));
  }
  if(nr1on) S.push(T.nr1,nr1Invest(ctx));
  if(gl) S.push(T.gl_how,T.gl_phases,T.team_gl,glVisits(ctx),T.gl_deliv,T.gl_plan,T.gl_ind,T.gl_rep,glInvest(ctx));
  conditions(ctx).forEach(function(c){S.push(c);});S.push(T.end.replace('Proposta válida por 30 dias','Proposta válida por '+($('c-val').value||30)+' dias'));
  var html=S.map(function(h,i){return fill(h,ctx).replace(/\{\{N\}\}/g,i+1);});
  $('preview').innerHTML=html.map(function(h){return '<div class="slot">'+h+'</div>';}).join('');
  $('preview').querySelectorAll('.pg').forEach(function(p){p.setAttribute('contenteditable','true');p.setAttribute('spellcheck','false');});
  fit();
}
function fit(){
  var main=R.querySelector('.ui-main');var w=Math.max(480,main.clientWidth-40);var sc=Math.min(1,w/1280);
  R.querySelectorAll('#preview .slot').forEach(function(s){s.style.width=(1280*sc)+'px';s.style.height=(720*sc)+'px';var p=s.querySelector('.pg');if(p)p.style.transform='scale('+sc+')';});
}
window.addEventListener('resize',fit);
$('btn-gerar').onclick=gerar;
$('btn-print').onclick=function(){if(!$('preview').querySelector('.pg'))gerar();printPreview();};


/* ===== SharePoint (API /api/propostas) ===== */
var FIELD_IDS=['f-cliente','f-ac','f-cidade','f-data','s-ergo','s-nr1','s-gl','n-vidas','n-vh','n-e1','n-e2','n-reu','n-min','g-local','g-local2','c-pag','c-imp','c-val','c-reaj','c-cod-ergo','c-cod-gl','c-obs-ergo','c-obs-gl','c-cnpj-gl','c-ref','e-contato','e-serv','e-vmes','e-meses','e-vtot','e-para','e-cc','e-assunto','e-corpo','e-assin'];
function spMsg(t,err){var m=$('sp-msg');m.textContent=t;m.style.color=err?'#B3261E':'#8A7A78';}
function getState(){
  var campos={};FIELD_IDS.forEach(function(id){var e=$(id);campos[id]=e.type==='checkbox'?e.checked:e.value;});
  var slides=[].map.call(R.querySelectorAll('#preview .pg'),function(p){return p.outerHTML;});
  return {campos:campos,ergoOpts:ergoOpts,glOpts:glOpts,slides:slides};
}
function setState(st){
  FIELD_IDS.forEach(function(id){var e=$(id);if(st.campos&&st.campos[id]!=null){if(e.type==='checkbox')e.checked=!!st.campos[id];else e.value=st.campos[id];}});
  if(st.ergoOpts)ergoOpts=st.ergoOpts;if(st.glOpts)glOpts=st.glOpts;
  renderErgo();renderGL();showNr1();svcToggle();
  if(st.slides&&st.slides.length){
    $('preview').innerHTML=st.slides.map(function(h){return '<div class="slot">'+h+'</div>';}).join('');
    $('preview').querySelectorAll('.pg').forEach(function(p){p.style.transform='';p.setAttribute('contenteditable','true');});
    fit();
  }
}
function api(method,qs,body){
  return fetch('/api/propostas'+(qs||''),{method:method,credentials:'same-origin',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined})
    .then(function(r){return r.json().catch(function(){return {ok:false,error:'resposta inválida ('+r.status+')'};});});
}
function nomeBase(){
  var d=$('f-data').value||new Date().toISOString().slice(0,10);
  var sv=[];if($('s-ergo').checked)sv.push('Ergonomia');if($('s-nr1').checked)sv.push('NR-1');if($('s-gl').checked)sv.push('Ginastica Laboral');
  return 'Proposta - '+($('f-cliente').value||'Cliente')+' - '+sv.join(' + ')+' - '+d;
}
$('btn-save').onclick=function(){
  if(!$('preview').querySelector('.pg')){spMsg('Gere a proposta antes de salvar.',true);return;}
  spMsg('Salvando…');
  api('POST','',{nome:nomeBase(),estado:getState()}).then(function(j){
    if(j.ok)spMsg('Salva no SharePoint: '+j.name);else spMsg('Falha ao salvar: '+(j.error||'erro'),true);
  }).catch(function(e){spMsg('Falha ao salvar: '+e.message,true);});
};
$('btn-pdf').onclick=function(){
  var f=$('f-pdf').files[0];if(!f){spMsg('Escolha o arquivo PDF primeiro.',true);return;}
  if(f.size>25*1024*1024){spMsg('PDF acima de 25 MB.',true);return;}
  spMsg('Enviando PDF…');
  var rd=new FileReader();rd.onload=function(){
    api('POST','',{nome:nomeBase(),pdfBase64:String(rd.result).split(',')[1]}).then(function(j){
      if(j.ok)spMsg('PDF enviado: '+j.name);else spMsg('Falha ao enviar: '+(j.error||'erro'),true);
    }).catch(function(e){spMsg('Falha ao enviar: '+e.message,true);});
  };rd.readAsDataURL(f);
};
$('btn-open').onclick=function(){
  $('ov').style.display='flex';$('ov-list').textContent='Carregando…';
  api('GET','').then(function(j){
    if(!j.ok){$('ov-list').textContent='Falha: '+(j.error||'erro');return;}
    var js=(j.items||[]).filter(function(x){return /\.json$/i.test(x.name);});
    var pd=(j.items||[]).filter(function(x){return /\.pdf$/i.test(x.name);});
    if(!js.length&&!pd.length){$('ov-list').textContent='Nenhuma proposta salva ainda.';return;}
    var out='';
    js.forEach(function(x){out+='<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #EFE3E4"><div style="flex:1"><b>'+x.name.replace(/\.json$/i,'')+'</b><div style="font-size:11px;color:#8A7A78">'+new Date(x.modificado).toLocaleString('pt-BR')+(x.por?' · '+x.por:'')+'</div></div><button class="ui-btn sm" data-open="'+x.id+'" type="button">abrir</button></div>';});
    pd.forEach(function(x){out+='<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #EFE3E4"><div style="flex:1">PDF · '+x.name+'</div><a class="ui-btn sm sec" style="text-decoration:none" target="_blank" rel="noopener" href="'+x.webUrl+'">ver</a></div>';});
    $('ov-list').innerHTML=out;
    $('ov-list').querySelectorAll('[data-open]').forEach(function(b){b.onclick=function(){
      b.textContent='abrindo…';
      api('GET','?id='+encodeURIComponent(b.dataset.open)).then(function(r){
        if(r.ok&&r.estado&&r.estado.estado){setState(r.estado.estado);$('ov').style.display='none';spMsg('Proposta aberta.');}else{b.textContent='erro';}
      });};});
  }).catch(function(e){$('ov-list').textContent='Falha: '+e.message;});
};
$('ov-x').onclick=function(){$('ov').style.display='none';};

/* init */
var today=new Date();$('f-data').value=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
renderErgo();renderGL();showNr1();svcToggle();
/* ===== Envio por e-mail + Kanban ===== */
var TPL_ASSUNTO='Proposta ElevaLife | {{EMPRESA}} | {{SERVICO}}';
var TPL_CORPO='Olá, {{CONTATO}}, tudo bem?\n\nConforme conversamos, segue em anexo a proposta técnica e comercial de {{SERVICO}} para a {{EMPRESA}}.\n\nA proposta reúne o escopo, a equipe envolvida, a rotina de atendimento, os indicadores de acompanhamento e as condições comerciais. Ela tem validade de {{VALIDADE}} dias corridos.\n\nFico à disposição para conversarmos e ajustar o que for necessário à rotina de vocês.';
var TPL_ASSIN='Atenciosamente,\nLeonardo Scaccabarozzi | Executivo de novos negócios\nleonardo@elevalife.com.br | (11) 97260-4027\nwww.elevalife.com.br';
var leadsCache=null, leadsBusy=false;
function eMsg(t,err){var m=$('e-msg');m.textContent=t;m.style.color=err?'#B3261E':'#8A7A78';}
function servTexto(){var s=[];if($('s-ergo').checked)s.push('Gestão de Ergonomia');if($('s-nr1').checked)s.push('Diagnóstico NR-1');if($('s-gl').checked)s.push('Ginástica Laboral');return s.join(' e ')||'serviços';}
function servKanban(){var s=[];if($('s-ergo').checked)s.push('ERGO');if($('s-nr1').checked)s.push('NR-1');if($('s-gl').checked)s.push('GL');return s.join(' + ');}
function preencherTpl(t){
  return t.replace(/\{\{EMPRESA\}\}/g,$('f-cliente').value||'sua empresa').replace(/\{\{SERVICO\}\}/g,servTexto())
    .replace(/\{\{CONTATO\}\}/g,($('e-contato').value||'').split(' ')[0]||'tudo bem').replace(/\{\{VALIDADE\}\}/g,$('c-val').value||'30');
}
function aplicarModelo(){
  $('e-assunto').value=preencherTpl(TPL_ASSUNTO);
  $('e-corpo').value=preencherTpl(TPL_CORPO).replace('Olá, tudo bem, tudo bem?','Olá, tudo bem?');
  if(!$('e-assin').value)$('e-assin').value=TPL_ASSIN;
  if(!$('e-serv').value)$('e-serv').value=servKanban();
  sugerirValor();
}
function sugerirValor(){
  if($('e-vmes').value)return;
  var v=null;
  if($('s-ergo').checked&&ergoOpts.length){v=(priceErgo(ergoOpts[0])||0)*ergoOpts[0].qtd;}
  else if($('s-gl').checked&&glOpts.length){v=(priceGL(glOpts[0])||0)*glOpts[0].qtd;}
  if(v){$('e-vmes').value=r2(v);totalizar();}
}
function totalizar(){var m=parseFloat($('e-vmes').value),n=parseInt($('e-meses').value,10);if(m&&n)$('e-vtot').value=r2(m*n);}
$('e-vmes').oninput=totalizar;$('e-meses').oninput=totalizar;
$('e-tpl').onclick=function(){$('e-assunto').value='';$('e-corpo').value='';aplicarModelo();eMsg('Modelo restaurado.');};

function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
function carregarLeads(cb){
  if(leadsCache)return cb();
  if(leadsBusy)return;leadsBusy=true;
  fetch('/api/leads',{credentials:'same-origin'}).then(function(r){return r.json();}).then(function(j){
    leadsCache=(j&&j.items)||[];leadsBusy=false;cb();
  }).catch(function(){leadsBusy=false;eMsg('Não foi possível carregar as oportunidades do Kanban.',true);});
}
var ATIVOS={'LEAD':1,'OPORTUNIDADE':1,'EM NEGOCIAÇÃO':1,'REATIVAR':1};
function listarOportunidades(){
  var q=norm($('f-cliente').value),sel=$('e-lead'),antes=sel.value;
  if(!q){sel.innerHTML='<option value="">Digite o cliente acima…</option>';return;}
  carregarLeads(function(){
    var achados=leadsCache.filter(function(l){return ATIVOS[String(l.status||'').toUpperCase()]&&norm(l.cliente).indexOf(q)>=0;});
    var o='<option value="">'+(achados.length?'Selecione a oportunidade…':'Nenhuma ativa — será criada uma nova')+'</option>';
    achados.forEach(function(l){o+='<option value="'+l.__id+'">'+esc(l.cliente||'')+' · '+esc(l.nome||'sem contato')+' · '+esc(l.status||'')+(l.subEtapa?' / '+esc(l.subEtapa):'')+(l.serv?' · '+esc(l.serv):'')+'</option>';});
    o+='<option value="__novo">➕ Criar nova oportunidade</option>';
    sel.innerHTML=o;
    if(antes&&sel.querySelector('option[value="'+antes+'"]'))sel.value=antes;
    else if(achados.length===1)sel.value=achados[0].__id;
    else if(!achados.length)sel.value='__novo';
    sel.onchange();
  });
}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
$('e-lead').onchange=function(){
  var id=$('e-lead').value;if(!id||id==='__novo'||!leadsCache)return;
  var l=leadsCache.filter(function(x){return String(x.__id)===id;})[0];if(!l)return;
  if(l.nome&&!$('e-contato').value)$('e-contato').value=l.nome;
  if(l.email&&!$('e-para').value)$('e-para').value=l.email;
  if(l.serv&&!$('e-serv').value)$('e-serv').value=l.serv;
  aplicarModelo();
};
var tmr=null;
$('f-cliente').addEventListener('input',function(){clearTimeout(tmr);tmr=setTimeout(function(){listarOportunidades();},400);});
$('e-contato').addEventListener('change',function(){if(!$('e-assunto').value)aplicarModelo();else{$('e-corpo').value=preencherTpl(TPL_CORPO).replace('Olá, tudo bem, tudo bem?','Olá, tudo bem?');}});
$('e-send').onclick=function(){
  var f=$('f-pdf').files[0];
  if(!$('e-para').value.trim()){eMsg('Informe o e-mail do destinatário.',true);return;}
  if(!f){eMsg('Escolha o PDF final em “Anexar o PDF final” (acima).',true);return;}
  if(f.size>3*1024*1024){eMsg('PDF acima de 3 MB — comprima o arquivo.',true);return;}
  var lid=$('e-lead').value;
  if(!lid){eMsg('Escolha a oportunidade no Kanban (ou “Criar nova”).',true);return;}
  if(!$('e-assunto').value){aplicarModelo();}
  var assin=$('e-assin').value;
  var corpo=$('e-corpo').value+'\n\n'+assin;
  eMsg('Enviando…');$('e-send').disabled=true;
  var rd=new FileReader();rd.onload=function(){
    var body={para:$('e-para').value,cc:$('e-cc').value,assunto:$('e-assunto').value,corpo:corpo,pdfNome:f.name,pdfBase64:String(rd.result).split(',')[1],
      lead:{id:(lid==='__novo'?'':lid),cliente:$('f-cliente').value,nome:$('e-contato').value,serv:$('e-serv').value,valorMensal:parseFloat($('e-vmes').value)||0,numMeses:parseInt($('e-meses').value,10)||0,valor:parseFloat($('e-vtot').value)||0}};
    fetch('/api/propostas-enviar',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){return r.json().catch(function(){return {ok:false,error:'resposta inválida ('+r.status+')'};});})
      .then(function(j){
        $('e-send').disabled=false;
        if(!j.ok){eMsg('Não enviado: '+(j.error||'erro'),true);return;}
        var k=j.kanban||{};
        var t='E-mail enviado'+(j.email&&j.email.fallback?' (pela caixa padrão, com resposta para você)':'')+'. ';
        t+=k.ok?('Kanban: oportunidade '+k.acao+' → '+k.para+'.'):('Atenção: o Kanban não foi atualizado ('+(k.error||'erro')+'). Atualize a oportunidade manualmente.');
        eMsg(t,!k.ok);leadsCache=null;
      }).catch(function(e){$('e-send').disabled=false;eMsg('Falha ao enviar: '+e.message,true);});
  };rd.readAsDataURL(f);
};
try{var sg=localStorage.getItem('prop-assin');if(sg)$('e-assin').value=sg;}catch(e){}
$('e-assin').addEventListener('change',function(){try{localStorage.setItem('prop-assin',$('e-assin').value);}catch(e){}});
aplicarModelo();
if($('f-cliente').value)listarOportunidades();

})();

}
})();
