/* =====================================================================
   ElevaLife — MINUTA PADRÃO (Contrato de Prestação de Serviços)
   Motor + integração com a aba Renovações do cockpit.
   Segue o modelo oficial minuta_padrão.docx (I–VIII, 6.1–6.7, 7.1–7.4).
   Uso: window.gerarMinutaPadrao(i)  -> gera a partir de RNVIEW[i].c
        Minuta.aoSalvarSituacao(status, contrato) -> oferta ao marcar RENOVADO
   ===================================================================== */
(function (root) {
  "use strict";

  // ---- Entidades (guarda-chuvas) e dados fixos da CONTRATADA ----
  var ENTIDADES = {
    elevalife: { razao: "ELEVALIFE SAÚDE E EDUCAÇÃO LTDA - ME", cnpj: "15.447.255/0001-74" },
    eleva:     { razao: "ELEVA SAÚDE E EDUCAÇÃO LTDA - ME",     cnpj: "57.467.788/0001-68" }
  };
  var FIXOS = {
    enderecoContratada: "Rua Adriano Cesar Pinto, 201, Socorro, Mogi das Cruzes/SP, CEP 08780-590",
    banco: "Banco Santander, Agência 0087, Conta Corrente nº 13006802-5",
    foro: "Mogi das Cruzes/SP",
    ccFixo: ["leonardo@elevalife.com.br", "rafael@elevalife.com.br"]
  };

  // ---- Valor por extenso (R$) ----
  function extensoReais(valor) {
    var u = ["zero","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
    var d = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
    var c = ["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
    function ate999(n){
      if(n===0) return "";
      if(n===100) return "cem";
      var s=[], cent=Math.floor(n/100), resto=n%100;
      if(cent) s.push(c[cent]);
      if(resto){ if(resto<20) s.push(u[resto]); else { var dez=Math.floor(resto/10), un=resto%10; s.push(un? d[dez]+" e "+u[un] : d[dez]); } }
      return s.join(" e ");
    }
    function inteiro(n){
      if(n===0) return "zero";
      var mi=Math.floor(n/1000000), mil=Math.floor((n%1000000)/1000), r=n%1000, p=[];
      if(mi) p.push(ate999(mi)+(mi===1?" milhão":" milhões"));
      if(mil) p.push(mil===1?"mil":ate999(mil)+" mil");
      if(r){ if(p.length && (r<100 || r%100===0)) p.push("e "+ate999(r)); else p.push(ate999(r)); }
      return p.join(" ").replace(/\s+/g," ").trim();
    }
    valor = Math.round((+valor||0)*100)/100;
    var reais=Math.floor(valor), cent=Math.round((valor-reais)*100);
    var out = inteiro(reais)+(reais===1?" real":" reais");
    if(cent) out += " e "+inteiro(cent)+(cent===1?" centavo":" centavos");
    return out;
  }

  var esc = function (s) { return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); };

  // ---- Motor: gera o HTML completo da minuta ----
  function buildMinutaPadrao(dados) {
    var ent = ENTIDADES[(dados.entidade||"elevalife").toLowerCase()] || ENTIDADES.elevalife;
    var cli = dados.cliente || {}, svc = dados.servico || {}, rem = dados.remuneracao || {}, resp = dados.responsavel || {};
    var valorNum = rem.valorNum || (rem.valor!=null ? "R$ "+Number(rem.valor).toLocaleString("pt-BR",{minimumFractionDigits:2}) : "R$ [Valor]");
    var valorExt = rem.valorExtenso || (rem.valor!=null ? extensoReais(Number(rem.valor)) : "[valor por extenso]");
    var prazo = (dados.pagamento && dados.pagamento.prazo) || "30 (trinta) dias (30 DDL)";
    var anexo = (svc.anexo||[]).map(function(r){return "<tr><td><b>"+esc(r.servico)+"</b></td><td>"+esc(r.detalhe)+"</td></tr>";}).join("") ||
      '<tr><td colspan="2" class="mark">Anexo I — detalhar escopo técnico (volume de horas, profissionais, formatos).</td></tr>';
    var toEmail = esc(resp.email||""), anoAssin = dados.anoAssinatura || "2026";
    var S = " ";
    return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
+'<meta name="viewport" content="width=device-width, initial-scale=1.0">'
+'<title>Minuta — '+esc(cli.razaoSocial||"Cliente")+' | ElevaLife</title>'
+'<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
+'<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Montserrat+Alternates:wght@700;800&display=swap" rel="stylesheet">'
+'<style>'
+':root{--vinho:#8B3A42;--vinho-esc:#5E2A30;--vinho-med:#A34E56;--vinho-suave:#C99AA0;--creme:#F5EFEA;--texto:#3D2E30;--cinza:#8A7A78;--teal:#3E7B7E;}'
+'*{box-sizing:border-box}body{margin:0;background:#e9e2dc;font-family:Montserrat,system-ui,sans-serif;color:var(--texto);line-height:1.6}'
+'.toolbar{position:sticky;top:0;z-index:20;background:var(--vinho-esc);color:#fff;display:flex;gap:12px;align-items:center;justify-content:center;padding:12px 16px;flex-wrap:wrap}'
+'.toolbar .title{font-weight:600;margin-right:auto}'
+'.btn{border:0;border-radius:999px;padding:10px 20px;font-family:inherit;font-weight:600;font-size:.9rem;cursor:pointer}'
+'.btn-primary{background:#fff;color:var(--vinho-esc)}.btn-ghost{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.5)}'
+'@media print{.toolbar,.email-panel{display:none!important}body{background:#fff}.page{box-shadow:none;margin:0;width:auto}}'
+'.page{background:#fff;max-width:820px;margin:28px auto;padding:56px 64px 72px;box-shadow:0 8px 30px rgba(0,0,0,.15);border-top:6px solid var(--vinho)}'
+'header.doc{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:2px solid var(--vinho);padding-bottom:18px}'
+'.wordmark{font-family:"Montserrat Alternates",sans-serif;font-weight:800;font-size:2rem;color:var(--vinho);letter-spacing:-.02em;line-height:1}'
+'.wordmark small{display:block;font-family:Montserrat,sans-serif;font-weight:500;font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:var(--cinza);margin-top:6px}'
+'.selo{text-align:right;font-size:.66rem;color:var(--vinho-med);font-weight:600;text-transform:uppercase;letter-spacing:.08em;max-width:200px}'
+'.selo b{display:block;font-size:1rem;color:var(--vinho);letter-spacing:0;text-transform:none}'
+'h1.doc{font-size:1.25rem;text-align:center;color:var(--vinho-esc);text-transform:uppercase;letter-spacing:.06em;margin:26px 0 4px;font-weight:700}'
+'.subttl{text-align:center;color:var(--cinza);font-size:.82rem;margin-bottom:24px}'
+'h2.cl{font-size:.98rem;color:var(--vinho);font-weight:700;text-transform:uppercase;letter-spacing:.03em;margin:24px 0 8px;padding-bottom:5px;border-bottom:1px solid var(--vinho-suave)}'
+'p{margin:8px 0;text-align:justify;font-size:.92rem}.lead{color:var(--vinho-esc);font-weight:600}'
+'ol.alpha{padding-left:22px}ol.alpha li{margin:6px 0;font-size:.92rem;text-align:justify}'
+'.mark{background:#FCE9B8;border-bottom:1px dashed #C9922B;padding:0 3px;border-radius:3px;font-weight:600}'
+'.box-anexo{background:var(--creme);border-left:4px solid var(--vinho);padding:16px 20px;margin:12px 0;border-radius:0 8px 8px 0}'
+'.box-anexo h3{margin:0 0 8px;color:var(--vinho-esc);font-size:.95rem}'
+'table.val{width:100%;border-collapse:collapse;margin:8px 0;font-size:.88rem}'
+'table.val th{background:var(--vinho);color:#fff;text-align:left;padding:8px 10px}'
+'table.val td{border:1px solid #e3d7d3;padding:8px 10px}table.val tr:nth-child(even) td{background:#faf6f3}'
+'.assin{display:flex;gap:40px;margin-top:52px;justify-content:space-between}.assin .col{flex:1;text-align:center}'
+'.assin .line{border-top:1.4px solid var(--texto);margin-bottom:6px;padding-top:6px;font-weight:600;font-size:.85rem;color:var(--vinho-esc)}'
+'.assin .col small{color:var(--cinza);font-size:.75rem}'
+'.foot{margin-top:38px;text-align:center;color:var(--cinza);font-size:.72rem;border-top:1px solid #eaddd8;padding-top:14px}.foot b{color:var(--vinho)}'
+'.local-data{text-align:center;margin:32px 0 8px;font-size:.9rem}'
+'.email-panel{max-width:820px;margin:0 auto 40px;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.12);overflow:hidden;border:1px solid #e3d7d3}'
+'.email-panel .ep-head{background:var(--teal);color:#fff;padding:14px 22px;font-weight:600}.email-panel .ep-body{padding:22px}'
+'.fld{margin-bottom:14px}.fld label{display:block;font-size:.78rem;font-weight:600;color:var(--vinho-esc);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em}'
+'.fld input,.fld textarea{width:100%;padding:10px 12px;border:1.4px solid #d9cbc6;border-radius:8px;font-family:inherit;font-size:.9rem;color:var(--texto)}.fld textarea{min-height:120px}'
+'.fixed-cc{font-size:.8rem;color:var(--cinza)}.ep-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:6px}.status{margin-top:12px;font-size:.85rem;font-weight:600}'
+'</style></head><body>'

+'<div class="toolbar"><span class="title">Minuta — '+esc(cli.razaoSocial||"Cliente")+'</span>'
+'<button class="btn btn-primary" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>'
+'<button class="btn btn-ghost" onclick="document.getElementById(\'email\').scrollIntoView({behavior:\'smooth\'})">✉️ Enviar por e-mail</button></div>'
+'<div class="page"><header class="doc">'
+'<div class="wordmark">elevalife<small>cuidado que gera resultado</small></div>'
+'<div class="selo">Contrato de<br><b>Prestação de Serviços</b>15 anos elevando pessoas e resultados</div></header>'
+'<h1 class="doc">Contrato de Prestação de Serviços</h1>'
+'<div class="subttl">'+esc(svc.nome||"[Nome resumido do serviço]")+'</div>'
+'<p>Pelo presente contrato e na melhor forma de direito admitida, as partes:</p>'
+'<p>De um lado, na qualidade de <span class="lead">CONTRATANTE</span>, <b>'+esc(cli.razaoSocial||"[RAZÃO SOCIAL DO CLIENTE]")+'</b>, localizada à '+esc(cli.endereco||"[Endereço Completo do Cliente com CEP]")+', cadastrada no CNPJ '+esc(cli.cnpj||"[CNPJ do Cliente]")+', neste ato representada na forma estabelecida em seu Estatuto Social, doravante denominada simplesmente CONTRATANTE.</p>'
+'<p>De outro lado a empresa: <b>'+esc(ent.razao)+'</b>, localizada à '+esc(FIXOS.enderecoContratada)+', cadastrada no CNPJ '+esc(ent.cnpj)+', doravante denominada simplesmente CONTRATADA.</p>'
+'<p>Resolvem celebrar este contrato, o qual será regido pelas cláusulas elencadas na sequência:</p>'
+'<h2 class="cl">Cláusula I — Do Objeto</h2>'
+'<p>1.1. O presente contrato tem por objetivo a prestação de Serviços de <b>'+esc(svc.nome||"[Nome resumido do serviço]")+'</b> nas dependências da CONTRATANTE, conforme segue:</p>'
+'<ol class="alpha" type="a">'
+'<li>Seguir a Gestão e execução do Programa conforme proposta Técnica e Comercial datada de <b>'+esc(svc.dataProposta||"[data da proposta]")+'</b>, na(s) unidade(s) de '+esc(svc.unidade||"[localidade/cidade]")+', considerada parte integrante do Contrato;</li>'
+'<li>O escopo técnico detalhado, incluindo volume de horas, quantitativo de profissionais e formatos de atendimento, encontra-se descrito no <b>Anexo I</b> deste instrumento.</li></ol>'
+'<div class="box-anexo"><h3>Anexo I — Escopo Técnico dos Serviços</h3>'
+'<table class="val"><tr><th>Serviço</th><th>Escopo / Organização</th></tr>'+anexo+'</table></div>'
+'<h2 class="cl">Cláusula II — Das Obrigações do Contratado</h2>'
+'<p>2.1. As obrigações do CONTRATADO, sem prejuízo de outras previstas neste instrumento, assim se resumem:</p>'
+'<ol class="alpha" type="a">'
+'<li>disponibilizar os profissionais para o cumprimento do item I deste contrato, denominado Objeto;</li>'
+'<li>zelar pela guarda e conservação dos bens de sua propriedade e de propriedade da CONTRATANTE utilizados no local de execução dos serviços, sendo de sua exclusiva responsabilidade e guarda dos mesmos;</li>'
+'<li>apresentar Nota Fiscal – NF, com prazo de pagamento de faturamento para até '+esc(prazo)+';</li>'
+'<li>cumprir e fazer cumprir as Normas Internas da CONTRATANTE, quando dentro de suas instalações, especialmente as de segurança;</li>'
+'<li>responsabilizar-se integralmente por todos os impostos, taxas e contribuições de qualquer espécie, que incidam ou venham a incidir sobre os serviços ora contratados;</li>'
+'<li>indenizar a CONTRATANTE e ou terceiros, e responsabilizando-se isoladamente, civil e criminalmente, por eventuais danos ou prejuízos causados, decorrentes dos serviços prestados ou de quaisquer outros atos, dolosos ou culposos, desde que comprovados.</li></ol>'
+'<h2 class="cl">Cláusula III — Das Obrigações da Contratante</h2>'
+'<p>3.1. As obrigações da CONTRATANTE, sem prejuízo de outras previstas neste instrumento, assim se resumem:</p>'
+'<ol class="alpha" type="a">'
+'<li>designar um responsável pelo contato entre as partes, dirimindo-se eventuais dúvidas;</li>'
+'<li>permitir ao CONTRATADO o acesso e o uso das informações que a CONTRATANTE julgar necessárias à perfeita execução dos serviços, obrigando-se o CONTRATADO a manter confidencialidade das informações recebidas;</li>'
+'<li>ceder estrutura física contendo '+esc(dados.estrutura||"[descrever estrutura fornecida pelo cliente]")+';</li>'
+'<li>efetuar ou fazer com que sejam efetuados os pagamentos pelos serviços prestados, tudo em conformidade com os valores, condições e critérios estabelecidos neste instrumento.</li></ol>'

+'<h2 class="cl">Cláusula IV — Da Remuneração e Forma de Pagamento</h2>'
+'<p>4.1. A CONTRATANTE pagará ao CONTRATADO, em razão do presente contrato, a importância de <b>'+esc(valorNum)+' ('+esc(valorExt)+')</b> por mês, cujo pagamento deverá ser efetuado em até '+esc(prazo)+' após a emissão da NF, devendo o pagamento ser feito via transferência bancária em conta corrente no '+esc(FIXOS.banco)+'.</p>'
+'<p>4.1.1. O não pagamento nos prazos estabelecidos implicará na aplicação de multa única de 2% (dois por cento), juros de 1,0% (um por cento) ao mês.</p>'
+'<p>4.1.2. Os valores descritos no item 4.1 serão reajustados anualmente, com base na variação do IPCA ou outro índice que vier a substituí-lo.</p>'
+'<h2 class="cl">Cláusula V — Do Prazo e da Rescisão</h2>'
+'<p>5.1. O presente contrato vigerá por prazo indeterminado, iniciando-se no dia <b>'+esc((dados.vigencia&&dados.vigencia.inicio)||"[data de início da operação]")+'</b>.</p>'
+'<p>5.2. Este contrato poderá ser rescindido, sem qualquer ônus para as partes, nos seguintes casos:</p>'
+'<ol class="alpha" type="a">'
+'<li>por mútuo acordo;</li>'
+'<li>unilateral e imotivadamente, desde que haja comunicação escrita, com antecedência mínima de 30 (trinta) dias;</li>'
+'<li>quando, por motivos de força maior, tornar-se impossível o prosseguimento do mesmo;</li>'
+'<li>em caso de falência, extinção, dissolução, liquidação ou encerramento de atividade de qualquer das partes.</li></ol>'
+'<p>5.3. O contrato também será rescindido, independentemente de quaisquer notificações, interpelações, procedimentos judiciais ou extrajudiciais, em razão de descumprimento de qualquer de suas cláusulas, sendo certo que, neste caso, a parte infratora ficará obrigada a pagar uma multa no valor de 3 (três) mensalidades, ficando ressalvados os direitos da parte prejudicada em acionar a parte infratora por prejuízos, perdas e danos a que der causa.</p>'
+'<h2 class="cl">Cláusula VI — Das Demais Cláusulas</h2>'
+'<p>6.1. Não há relação empregatícia entre CONTRATADO e a CONTRATANTE, arcando cada qual com seus respectivos encargos sociais e previdenciários devidos.</p>'
+'<p>6.2. Caberá ao CONTRATADO a total responsabilidade pelos serviços que executar, respondendo civil e criminalmente por quaisquer danos causados ao patrimônio da CONTRATANTE ou a terceiros, bem como aqueles causados à integridade física dos empregados da CONTRATANTE ou terceiras pessoas, decorrentes dos serviços prestados ou de quaisquer outros atos, dolosos ou culposos.</p>'
+'<p>6.3. O CONTRATADO poderá subcontratar, no todo ou em parte, os serviços objetos deste contrato com a prévia identificação do subcontratado perante a CONTRATANTE e com a expressa concordância desta, por escrito, cabendo, em qualquer caso, ao CONTRATADO, a integral responsabilidade pelas obrigações assumidas neste contrato.</p>'
+'<p>6.4. Não haverão reposições de aulas no caso de cancelamento por parte da CONTRATANTE com menos de 48 horas de antecedência, no caso de feriados que coincidirem com as datas previamente acordadas e em caso de férias coletivas da CONTRATANTE.</p>'
+'<p>6.5. Não haverá desconto nas mensalidades em caso de incidência de feriados na data definida e em caso de férias coletivas da CONTRATANTE.</p>'
+'<p>6.6. As PARTES comprometem-se a não contratar de forma direta fornecedores, free-lancers ou profissionais com Contrato de Trabalho ou de Prestação de Serviços em vigor junto à outra parte, ou que tenham encerrado seu vínculo empregatício ou contratual num período inferior a 12 (doze) meses em relação à data de encerramento do presente contrato.</p>'
+'<p>6.7. Exceto em caso de mútuo consentimento por escrito, o descumprimento desta cláusula obriga a infratora a ressarcir a outra parte com o valor equivalente à remuneração que seria recebida pelo profissional num período de 12 (doze) meses, acrescido dos encargos sociais, tomando-se por base a remuneração do seu último mês de trabalho ou prestação de serviço.</p>'
+'<h2 class="cl">Cláusula VII — Da Proteção de Dados (LGPD)</h2>'
+'<p>7.1. As PARTES obrigam-se a atuar em estrita conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD), garantindo a privacidade e a segurança dos dados.</p>'
+'<p>7.2. A CONTRATADA compromete-se a tratar os dados pessoais e dados pessoais sensíveis (tais como informações de saúde, prontuários, avaliações físicas e CIDs) dos colaboradores da CONTRATANTE única e exclusivamente para a finalidade de execução dos serviços previstos neste contrato.</p>'
+'<p>7.3. A CONTRATADA adotará todas as medidas técnicas e administrativas aptas a proteger os dados pessoais de acessos não autorizados e de situações acidentais ou ilícitas de destruição, perda, alteração, comunicação ou difusão.</p>'
+'<p>7.4. O dever de sigilo e confidencialidade sobre os dados tratados permanecerá vigente mesmo após o término ou rescisão deste instrumento.</p>'
+'<h2 class="cl">Cláusula VIII — Do Foro</h2>'
+'<p>8.1. As partes contratantes elegem o Foro da Comarca de <b>'+esc(FIXOS.foro)+'</b>, para dirimir eventuais litígios derivados deste contrato, renunciando expressamente a qualquer outro, por mais privilegiado que seja.</p>'
+'<p style="margin-top:16px">E assim, por estarem justos e acordados, assinam o presente instrumento, em duas vias de igual teor e forma, na presença das testemunhas abaixo.</p>'
+'<div class="local-data">São Paulo, ______ de _________________ de '+esc(anoAssin)+'.</div>'
+'<div class="assin"><div class="col"><div class="line">CONTRATANTE</div><small>'+esc(cli.razaoSocial||"[Razão social do cliente]")+(resp.nome?"<br>A/C "+esc(resp.nome):"")+'</small></div>'
+'<div class="col"><div class="line">CONTRATADA</div><small>'+esc(ent.razao)+'</small></div></div>'
+'<div class="assin" style="margin-top:34px"><div class="col"><div class="line">Testemunha 1</div><small>Nome / CPF</small></div>'
+'<div class="col"><div class="line">Testemunha 2</div><small>Nome / CPF</small></div></div>'
+'<div class="foot"><b>'+esc(ent.razao)+'</b> · CNPJ '+esc(ent.cnpj)+' · '+esc(FIXOS.enderecoContratada)+'<br><b>15 anos elevando pessoas e resultados</b></div></div>'

+'<div class="email-panel" id="email"><div class="ep-head">✉️ Enviar minuta por e-mail</div><div class="ep-body">'
+'<div class="fld"><label>Para (responsável na CONTRATANTE)</label><input id="mto" type="email" value="'+toEmail+'" placeholder="e-mail do responsável"></div>'
+'<div class="fld"><label>Assunto</label><input id="msubj" type="text" value="ElevaLife — Minuta de Contrato | '+esc(cli.razaoSocial||"")+'"></div>'
+'<div class="fld"><label>Mensagem</label><textarea id="mmsg">Prezado(a)'+(resp.nome?" "+esc(String(resp.nome).split(" ")[0]):"")+',\n\nSegue a minuta de contrato referente ao '+esc(svc.nome||"serviço contratado")+', conforme proposta aprovada.\n\nFicamos à disposição para eventuais ajustes.\n\nAtenciosamente,\nEquipe ElevaLife\n15 anos elevando pessoas e resultados</textarea></div>'
+'<p class="fixed-cc">Cópia fixa (CC): <b>leonardo@elevalife.com.br</b>, <b>rafael@elevalife.com.br</b></p>'
+'<div class="ep-actions"><button class="btn" style="background:var(--teal);color:#fff" onclick="MinutaEnvio.sistema()">Enviar pelo sistema</button>'
+'<button class="btn" style="background:transparent;border:1.5px solid var(--teal);color:var(--teal)" onclick="MinutaEnvio.mailto()">Abrir no meu e-mail (mailto)</button></div>'
+'<div class="status" id="mst"></div></div></div>'
+'<script>var CC_FIXO=["leonardo@elevalife.com.br","rafael@elevalife.com.br"];'
+'var MinutaEnvio={mailto:function(){var t=document.getElementById("mto").value.trim(),s=encodeURIComponent(document.getElementById("msubj").value),b=encodeURIComponent(document.getElementById("mmsg").value),cc=encodeURIComponent(CC_FIXO.join(","));window.location.href="mailto:"+encodeURIComponent(t)+"?cc="+cc+"&subject="+s+"&body="+b;},'
+'sistema:async function(){var st=document.getElementById("mst"),t=document.getElementById("mto").value.trim();if(!t||t.indexOf("@")<0){st.style.color="#b03535";st.textContent="Informe um e-mail válido do responsável.";return;}st.style.color="#3E7B7E";st.textContent="Enviando pelo sistema…";try{var r=await fetch("/api/enviar-renovacao",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({para:t,assunto:document.getElementById("msubj").value,corpo:document.getElementById("mmsg").value})});var j=await r.json();if(r.ok&&j.ok){st.style.color="#2e7d32";st.textContent="✔ Enviado (com cópia para Leonardo e Rafael).";}else{st.style.color="#b03535";st.textContent="Falha ao enviar: "+((j&&j.error)||("HTTP "+r.status))+". Use o mailto.";}}catch(e){st.style.color="#b03535";st.textContent="Envio pelo sistema indisponível — use “Abrir no meu e-mail (mailto)”.";}}};'
+'<\/script></body></html>';
  }

  // ================= INTEGRAÇÃO COM O COCKPIT (aba Renovações) =================
  var MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  function fmtData(iso){ if(!iso) return ""; var m=String(iso).slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!m) return String(iso);
    return String(+m[3]).padStart(2,"0")+" de "+MESES[(+m[2])-1]+" de "+m[1]; }
  function soDigitos(s){ return String(s||"").replace(/\D/g,""); }
  function num(v){ if(v==null||v==="")return null; if(typeof v==="number")return v;
    return Number(String(v).replace(/[^\d,.-]/g,"").replace(/\.(?=\d{3}(\D|$))/g,"").replace(",","."))||null; }
  function montarEndereco(e){ if(!e)return"";
    var p=[]; var l=[e.logradouro,e.numero].filter(Boolean).join(", "); if(l)p.push(l);
    if(e.complemento)p.push(e.complemento); if(e.bairro)p.push(e.bairro);
    var mun=[e.municipio,e.uf].filter(Boolean).join("/"); if(mun)p.push(mun);
    if(e.cep)p.push("CEP "+e.cep); return p.join(", "); }

  var _empresasCache=null;
  async function buscarEmpresa(cnpj){
    var alvo=soDigitos(cnpj); if(!alvo) return {};
    try{ if(!_empresasCache){ var r=await fetch("/api/empresas"); if(r.ok){ var j=await r.json(); _empresasCache=(j&&j.items)||[]; } else _empresasCache=[]; }
      return _empresasCache.filter(Boolean).find(function(e){return soDigitos(e.cnpj)===alvo;})||{};
    }catch(e){ return {}; }
  }

  function mapear(c, empresa){
    c=c||{}; empresa=empresa||{};
    var valor = (c.novoValor!=null? c.novoValor : (c.valorPadrao!=null? c.valorPadrao : null));
    var ano = (String(c.vigInicio||"").match(/\d{4}/)||["2026"])[0];
    return {
      entidade: "elevalife",
      cliente: {
        razaoSocial: empresa.razaoSocial || c.cliente || "",
        endereco: montarEndereco(empresa),
        cnpj: c.cnpj || empresa.cnpj || ""
      },
      servico: { nome: c.servico||"", dataProposta:"", unidade: c.unidade||"",
        anexo: c.servico ? [{servico:c.servico, detalhe:""}] : [] },
      pagamento: { prazo: (c.dll!=null? (c.dll+" ("+extensoReais(c.dll).replace(/ reais.*/,"")+") dias") : "30 (trinta) dias") },
      remuneracao: { valor: valor },
      estrutura: "",
      vigencia: { inicio: fmtData(c.vigInicio) },
      responsavel: { nome: c.responsavel||"", email: c.responsavelEmail||"" },
      anoAssinatura: ano
    };
  }

  var CAMPOS = [
    ["entidade","Entidade ElevaLife (guarda-chuva)","select",["elevalife","eleva"]],
    ["cliente.razaoSocial","Razão social do cliente","text"],
    ["cliente.endereco","Endereço + CEP","text"],
    ["cliente.cnpj","CNPJ do cliente","text"],
    ["servico.nome","Serviço (nome resumido)","text"],
    ["servico.dataProposta","Data da proposta","text"],
    ["servico.unidade","Unidade / cidade","text"],
    ["pagamento.prazo","Prazo de pagamento","text"],
    ["remuneracao.valor","Valor mensal (número)","number"],
    ["vigencia.inicio","Início da vigência","text"],
    ["estrutura","Estrutura cedida pelo cliente","text"],
    ["responsavel.nome","Responsável (A/C)","text"],
    ["responsavel.email","E-mail do responsável","text"],
    ["anexoTexto","Anexo I — 1 linha por serviço: Serviço | Escopo","textarea"]
  ];
  function getP(o,p){ return p.split(".").reduce(function(a,k){return (a||{})[k];},o); }
  function setP(o,p,v){ var ks=p.split("."),a=o; while(ks.length>1){ var k=ks.shift(); a[k]=a[k]||{}; a=a[k]; } a[ks[0]]=v; }
  function el(tag,attrs,html){ var e=document.createElement(tag); attrs=attrs||{}; Object.keys(attrs).forEach(function(k){ if(k==="style")e.style.cssText=attrs[k]; else e.setAttribute(k,attrs[k]); }); if(html!=null)e.innerHTML=html; return e; }

  function miniTela(dados, onConfirm){
    dados.anexoTexto=(dados.servico.anexo||[]).map(function(r){return r.servico+" | "+r.detalhe;}).join("\n");
    var ov=el("div",{style:"position:fixed;inset:0;background:rgba(45,30,32,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Montserrat,system-ui,sans-serif"});
    var card=el("div",{style:"background:#fff;border-radius:14px;max-width:640px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.35);border-top:6px solid #8B3A42"});
    card.appendChild(el("div",{style:"background:#5E2A30;color:#fff;padding:16px 22px;font-weight:700"},"Gerar minuta padrão — conferir dados"));
    var body=el("div",{style:"padding:18px 22px"}), inputs={};
    CAMPOS.forEach(function(cfg){ var path=cfg[0],label=cfg[1],type=cfg[2],opts=cfg[3];
      var val = path==="anexoTexto"? dados.anexoTexto : (getP(dados,path)==null?"":getP(dados,path));
      var falta = (val===""||val==null);
      var wrap=el("div",{style:"margin-bottom:12px"});
      wrap.appendChild(el("label",{style:"display:block;font-size:.72rem;font-weight:700;color:#5E2A30;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px"}, label+(falta?' <span style="background:#FCE9B8;color:#8a5a00;padding:0 5px;border-radius:4px">preencher</span>':"")));
      var inp;
      if(type==="select"){ inp=el("select"); opts.forEach(function(o){ var op=el("option",{value:o}); op.textContent=(o==="elevalife"?"ELEVALIFE (15.447.255/0001-74)":"ELEVA (57.467.788/0001-68)"); if(o===val)op.selected=true; inp.appendChild(op); }); }
      else if(type==="textarea"){ inp=el("textarea",{rows:"4"}); inp.value=val; }
      else { inp=el("input",{type:type||"text"}); inp.value=val; }
      inp.style.cssText="width:100%;padding:9px 11px;border:1.4px solid "+(falta?"#C9922B":"#d9cbc6")+";border-radius:8px;font-family:inherit;font-size:.9rem";
      wrap.appendChild(inp); inputs[path]=inp; body.appendChild(wrap);
    });
    var bar=el("div",{style:"display:flex;gap:10px;justify-content:flex-end;margin-top:8px"});
    var cancel=el("button",{style:"padding:10px 18px;border:1.4px solid #d9cbc6;background:#fff;border-radius:999px;font-weight:600;cursor:pointer"},"Cancelar");
    var ok=el("button",{style:"padding:10px 20px;border:0;background:#8B3A42;color:#fff;border-radius:999px;font-weight:700;cursor:pointer"},"Gerar minuta");
    cancel.onclick=function(){ ov.remove(); };
    ok.onclick=function(){
      CAMPOS.forEach(function(cfg){ if(cfg[0]!=="anexoTexto") setP(dados,cfg[0],inputs[cfg[0]].value); });
      dados.servico.anexo=(inputs.anexoTexto.value||"").split("\n").map(function(l){return l.trim();}).filter(Boolean).map(function(l){ var i=l.indexOf("|"); return i<0?{servico:l,detalhe:""}:{servico:l.slice(0,i).trim(),detalhe:l.slice(i+1).trim()}; });
      dados.remuneracao.valor=num(dados.remuneracao.valor);
      ov.remove(); onConfirm(dados);
    };
    bar.appendChild(cancel); bar.appendChild(ok); body.appendChild(bar); card.appendChild(body); ov.appendChild(card);
    ov.addEventListener("click",function(e){ if(e.target===ov) ov.remove(); });
    document.body.appendChild(ov);
  }

  function abrirMinuta(dados){
    var html=buildMinutaPadrao(dados);
    var url=URL.createObjectURL(new Blob([html],{type:"text/html"}));
    root.open(url,"_blank");
  }
  async function gerarParaContrato(c){
    if(!c){ alert("Contrato não encontrado."); return; }
    var empresa=await buscarEmpresa(c.cnpj);
    miniTela(mapear(c, empresa), abrirMinuta);
  }
  // chamado pelo botão da linha: RNVIEW[i].c
  function gerarMinutaPadrao(i){
    try{ var o=(root.RNVIEW||[])[i]; gerarParaContrato(o&&o.c); }
    catch(e){ alert("Não foi possível abrir a minuta: "+e.message); }
  }
  // oferta ao salvar a situação como RENOVADO
  function aoSalvarSituacao(status, c){
    if(!status || !c) return;
    if(/^\s*RENOVADO\s*$/i.test(status)){
      if(confirm("Contrato marcado como RENOVADO. Gerar a minuta padrão agora?")) gerarParaContrato(c);
    }
  }

  root.MinutaPadrao = { buildMinutaPadrao: buildMinutaPadrao, extensoReais: extensoReais, ENTIDADES: ENTIDADES, FIXOS: FIXOS };
  root.Minuta = { gerarParaContrato: gerarParaContrato, aoSalvarSituacao: aoSalvarSituacao, mapear: mapear, _empresa: buscarEmpresa };
  root.gerarMinutaPadrao = gerarMinutaPadrao;
})(window);
