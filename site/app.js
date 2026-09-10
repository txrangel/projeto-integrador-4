'use strict';

/* ------------------------------------------------------------------
   Painel do Projeto Integrador IV — Univesp
   plano.json      = espelho do Plano de Ação entregue (não editável)
   progresso.json  = estado do grupo (publicado no repositório)
   localStorage    = rascunho local até ser exportado e commitado
-------------------------------------------------------------------*/

const CHAVE_RASCUNHO = 'pi4-progresso-rascunho';
const STATUS = {
  a_fazer:      { rotulo: 'A fazer',      marca: '○' },
  em_andamento: { rotulo: 'Em andamento', marca: '◐' },
  concluida:    { rotulo: 'Concluída',    marca: '●' },
};

let PLANO = null;
let PUBLICADO = null;
let atual = null;
let filtroStatus = 'todos';
let filtroPessoa = '';
let selecionado = null; // { tipo: 'atividade'|'demanda', id }

/* ---------- datas ---------- */

const MS_DIA = 86400000;
const dt = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const curto = (s) => { const d = dt(s); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };
const dias = (a, b) => Math.round((b - a) / MS_DIA);

function hoje() {
  const forcado = new URLSearchParams(location.search).get('hoje');
  if (forcado && /^\d{4}-\d{2}-\d{2}$/.test(forcado)) return dt(forcado);
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}
const HOJE = hoje();

function plural(n, um, muitos) { return n === 1 ? um : muitos; }

function emDias(alvo) {
  const d = dias(HOJE, dt(alvo));
  if (d === 0) return 'hoje';
  if (d > 0) return `em ${d} ${plural(d, 'dia', 'dias')}`;
  return `há ${-d} ${plural(-d, 'dia', 'dias')}`;
}

function contagemRegressiva(alvo) {
  const d = dias(HOJE, dt(alvo));
  if (d === 0) return 'é hoje';
  if (d === 1) return 'falta 1 dia';
  if (d > 1) return `faltam ${d} dias`;
  return `há ${-d} ${plural(-d, 'dia', 'dias')}`;
}

/* ---------- estado ---------- */

function estadoPadrao() { return { status: 'a_fazer', responsaveis: [], nota: '' }; }

function normalizar(e) {
  const p = estadoPadrao();
  if (!e) return p;
  return {
    status: e.status || p.status,
    responsaveis: [...(e.responsaveis || [])].sort(),
    nota: e.nota || '',
  };
}

function estadoDe(id) { return normalizar((atual.atividades || {})[id]); }

function definirEstado(id, patch) {
  atual.atividades = atual.atividades || {};
  atual.atividades[id] = { ...estadoDe(id), ...patch };
  salvarRascunho();
  desenhar();
}

function demandaDe(id) { return (atual.demandas || []).find((d) => d.id === id) || null; }

function definirDemanda(id, patch) {
  const d = demandaDe(id);
  if (!d) return;
  Object.assign(d, patch);
  salvarRascunho();
  desenhar();
}

function salvarRascunho() {
  try { localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(atual)); } catch (_) {}
}

function contarAlteracoes() {
  let n = 0;
  const pubA = PUBLICADO.atividades || {};
  const atuA = atual.atividades || {};
  for (const id of new Set([...Object.keys(pubA), ...Object.keys(atuA)])) {
    if (JSON.stringify(normalizar(pubA[id])) !== JSON.stringify(normalizar(atuA[id]))) n++;
  }
  const pubD = new Map((PUBLICADO.demandas || []).map((d) => [d.id, d]));
  const atuD = new Map((atual.demandas || []).map((d) => [d.id, d]));
  for (const id of new Set([...pubD.keys(), ...atuD.keys()])) {
    if (JSON.stringify(pubD.get(id) || null) !== JSON.stringify(atuD.get(id) || null)) n++;
  }
  return n;
}

/* ---------- consultas ---------- */

const pessoa = (id) => PLANO.integrantes.find((p) => p.id === id);

function atrasada(item, est) {
  return est.status !== 'concluida' && dt(item.fim) < HOJE;
}

function itensDaQuinzena(q) {
  const doPlano = q.atividades.map((a) => ({ ...a, tipo: 'atividade', extra: false }));
  const extras = (atual.demandas || [])
    .filter((d) => d.quinzena === q.numero)
    .map((d) => ({ ...d, tipo: 'demanda', extra: true, responsavelPlano: null }));
  return [...doPlano, ...extras].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.fim.localeCompare(b.fim));
}

function estadoDoItem(item) {
  return item.tipo === 'demanda'
    ? normalizar({ status: item.status, responsaveis: item.responsaveis, nota: item.nota })
    : estadoDe(item.id);
}

function visivel(item) {
  const est = estadoDoItem(item);
  if (filtroPessoa && !est.responsaveis.includes(filtroPessoa)) return false;
  if (filtroStatus === 'todos') return true;
  if (filtroStatus === 'atrasada') return atrasada(item, est);
  return est.status === filtroStatus;
}

function quinzenaAtual() {
  const q = PLANO.quinzenas.find((q) => dt(q.inicio) <= HOJE && HOJE <= dt(q.fim));
  if (q) return { q, dentro: true };
  const prox = PLANO.quinzenas.find((q) => dt(q.inicio) > HOJE);
  return prox ? { q: prox, dentro: false } : { q: PLANO.quinzenas.at(-1), dentro: false };
}

/* ---------- desenho ---------- */

function desenhar() {
  desenharMetricas();
  desenharTimeline();
  desenharBarraRascunho();
}

function desenharBarraRascunho() {
  const n = contarAlteracoes();
  const barra = document.getElementById('rascunho');
  barra.hidden = n === 0;
  document.getElementById('rascunhoQtd').textContent = n;
  document.getElementById('rascunhoPalavra').textContent = plural(n, 'alteração', 'alterações');
}

function desenharMetricas() {
  const todas = PLANO.quinzenas.flatMap((q) => itensDaQuinzena(q));
  const feitas = todas.filter((i) => estadoDoItem(i).status === 'concluida').length;
  const atrasadas = todas.filter((i) => atrasada(i, estadoDoItem(i))).length;
  const pct = todas.length ? Math.round((feitas / todas.length) * 100) : 0;

  const { q, dentro } = quinzenaAtual();
  const proxMarco = PLANO.marcos.find((m) => dt(m.data) >= HOJE) || PLANO.marcos.at(-1);

  const cartao = (rotulo, valor, detalhe, extra = '', destaque = false) => `
    <div class="metrica${destaque ? ' destaque' : ''}">
      <div class="rotulo">${rotulo}</div>
      <div class="valor">${valor}</div>
      <div class="detalhe">${detalhe}</div>${extra}
    </div>`;

  document.getElementById('metricas').innerHTML = [
    cartao('Progresso', `${feitas}/${todas.length}`, `${pct}% concluído`,
      `<div class="progresso-geral"><i style="width:${pct}%"></i></div>`),
    cartao(dentro ? 'Quinzena atual' : 'Próxima quinzena', `Quinzena ${q.numero}`,
      `${curto(q.inicio)} – ${curto(q.fim)} · ${dentro ? `termina ${emDias(q.fim)}` : `começa ${emDias(q.inicio)}`}`,
      '', true),
    cartao('Próxima entrega', curto(proxMarco.data),
      `${proxMarco.titulo.replace(/^Entrega d[oa]s? /, '')} · ${contagemRegressiva(proxMarco.data)}`),
    atrasadas ? cartao('Em atraso', atrasadas, plural(atrasadas, 'atividade vencida', 'atividades vencidas')) : '',
  ].join('');

  document.getElementById('links').innerHTML = (PLANO.links || [])
    .map((l) => `<a href="${l.url}" target="_blank" rel="noopener">${l.rotulo}</a>`).join('');

  document.getElementById('subtitulo').textContent =
    `${PLANO.projeto.tema.replace(/\.$/, '')} · Polo ${PLANO.projeto.polo} · Orientador: ${PLANO.projeto.orientador}`;
}

function desenharTimeline() {
  const alvo = document.getElementById('timeline');
  const { q: qAtual } = quinzenaAtual();
  alvo.innerHTML = '';

  for (const q of PLANO.quinzenas) {
    const itens = itensDaQuinzena(q);
    const mostrados = itens.filter(visivel);
    const feitas = itens.filter((i) => estadoDoItem(i).status === 'concluida').length;
    const ehAtual = q.numero === qAtual.numero;
    const passada = dt(q.fim) < HOJE;

    const sec = document.createElement('section');
    sec.className = `quinzena${ehAtual ? ' atual' : ''}${passada ? ' passada' : ''}`;

    const total = dias(dt(q.inicio), dt(q.fim)) + 1;
    const pos = (d) => dias(dt(q.inicio), dt(d)) / total;
    const larg = (a, b) => (dias(dt(a), dt(b)) + 1) / total;
    const esquerda = (p) => `calc(var(--col-titulo) + var(--gap-trilha) + (100% - var(--col-titulo) - var(--gap-trilha)) * ${p})`;

    /* cabeçalho */
    sec.innerHTML = `
      <div class="quinzena-cab">
        <h2>Quinzena ${q.numero}</h2>
        ${ehAtual ? '<span class="selo-atual">em curso</span>' : ''}
        <span class="periodo">${curto(q.inicio)} – ${curto(q.fim)}</span>
        <span class="objetivo">${q.objetivo}</span>
        <span class="contagem">${feitas}/${itens.length} concluídas</span>
      </div>`;

    const corpo = document.createElement('div');
    corpo.className = 'quinzena-corpo';
    const grade = document.createElement('div');
    grade.className = 'grade';

    /* eixo de dias */
    const eixo = document.createElement('div');
    eixo.className = 'eixo';
    for (let i = 0; i < total; i++) {
      const d = new Date(dt(q.inicio).getTime() + i * MS_DIA);
      const fds = d.getDay() === 0 || d.getDay() === 6;
      eixo.innerHTML += `<span class="${fds ? 'fds' : ''}">${d.getDate()}</span>`;
    }
    grade.appendChild(eixo);

    /* linhas */
    if (!mostrados.length) {
      grade.innerHTML += '<p class="vazio">Nenhuma atividade corresponde ao filtro nesta quinzena.</p>';
    }
    for (const item of mostrados) {
      const est = estadoDoItem(item);
      const atras = atrasada(item, est);
      const pessoas = est.responsaveis.map(pessoa).filter(Boolean);

      const linha = document.createElement('div');
      linha.className = `linha${item.extra ? ' extra' : ''}`;

      const fdsMarcas = Array.from({ length: total }, (_, i) => {
        const d = new Date(dt(q.inicio).getTime() + i * MS_DIA);
        return (d.getDay() === 0 || d.getDay() === 6)
          ? `<div class="fim-de-semana" style="left:${(i / total) * 100}%;width:${(1 / total) * 100}%"></div>` : '';
      }).join('');

      linha.innerHTML = `
        <div class="titulo" title="${item.titulo.replace(/"/g, '&quot;')}">${item.extra ? '<span class="selo-extra">extra</span>' : ''}${item.titulo}</div>
        <div class="trilha">
          ${fdsMarcas}
          <button class="barra${atras ? ' atrasada' : ''}" data-status="${est.status}"
                  data-tipo="${item.tipo}" data-id="${item.id}"
                  style="--esq:${pos(item.inicio) * 100}%;--larg:${larg(item.inicio, item.fim) * 100}%"
                  title="${item.titulo} — ${curto(item.inicio)} a ${curto(item.fim)}">
            <span class="marca">${item.marco ? '◆' : STATUS[est.status].marca}</span>
            <span class="pessoas">${pessoas.map((p) =>
              `<span class="pastilha" style="background:${p.cor}" title="${p.nome}">${p.curto[0]}</span>`).join('')}</span>
          </button>
        </div>`;
      grade.appendChild(linha);
    }

    /* linha do hoje */
    if (dt(q.inicio) <= HOJE && HOJE <= dt(q.fim)) {
      const l = document.createElement('div');
      l.className = 'linha-hoje';
      l.style.left = esquerda(pos(iso(HOJE)) + 0.5 / total);
      grade.appendChild(l);
    }

    corpo.appendChild(grade);

    /* marcos da quinzena */
    for (const m of PLANO.marcos.filter((m) => m.quinzena === q.numero)) {
      const e = document.createElement('div');
      e.className = 'marco-etiqueta';
      e.textContent = `${curto(m.data)} — ${m.titulo} (${contagemRegressiva(m.data)})`;
      corpo.appendChild(e);
    }

    const acoes = document.createElement('div');
    acoes.className = 'acoes-quinzena';
    acoes.innerHTML = `<button class="btn discreto" data-nova-demanda="${q.numero}">+ Adicionar demanda</button>`;
    corpo.appendChild(acoes);

    sec.appendChild(corpo);
    alvo.appendChild(sec);
  }
}

/* ---------- painel ---------- */

function abrirPainel(tipo, id) {
  selecionado = { tipo, id };
  const item = tipo === 'demanda'
    ? demandaDe(id)
    : PLANO.quinzenas.flatMap((q) => q.atividades).find((a) => a.id === id);
  if (!item) return;

  const est = estadoDoItem({ ...item, tipo });
  const q = PLANO.quinzenas.find((q) => q.numero === (item.quinzena ?? quinzenaDaAtividade(id)));

  document.getElementById('painelTitulo').textContent = item.titulo || 'Nova demanda';
  document.getElementById('painelMeta').textContent =
    `Quinzena ${q.numero} · ${curto(item.inicio)} – ${curto(item.fim)}` +
    (tipo === 'atividade' ? ` · responsável no plano: ${item.responsavelPlano}` : ' · demanda do grupo');

  const corpo = document.getElementById('painelCorpo');
  corpo.innerHTML = `
    ${tipo === 'demanda' ? `
      <div class="painel-secao">
        <label for="campoTitulo">Título da demanda</label>
        <input type="text" id="campoTitulo" value="${(item.titulo || '').replace(/"/g, '&quot;')}" placeholder="O que precisa ser feito">
      </div>
      <div class="painel-secao">
        <span class="rotulo-secao">Período</span>
        <div class="duas-colunas">
          <input type="date" id="campoInicio" value="${item.inicio}" min="${q.inicio}" max="${q.fim}">
          <input type="date" id="campoFim" value="${item.fim}" min="${q.inicio}" max="${q.fim}">
        </div>
      </div>` : `
      <div class="painel-secao">
        <span class="rotulo-secao">Observação do plano</span>
        <p class="observacao">${item.observacao || '—'}</p>
      </div>`}

    <div class="painel-secao">
      <span class="rotulo-secao">Situação</span>
      <div class="grupo" role="group" style="display:inline-flex">
        ${Object.entries(STATUS).map(([k, v]) =>
          `<button class="chip" data-status-opcao="${k}" aria-pressed="${est.status === k}">${v.marca} ${v.rotulo}</button>`).join('')}
      </div>
    </div>

    <div class="painel-secao">
      <span class="rotulo-secao">Responsáveis</span>
      <div class="pessoas-lista">
        ${PLANO.integrantes.map((p) => `
          <button class="pessoa-chip" data-pessoa="${p.id}" aria-pressed="${est.responsaveis.includes(p.id)}">
            <span class="pastilha" style="background:${p.cor}">${p.curto[0]}</span>${p.curto}
          </button>`).join('')}
      </div>
    </div>

    <div class="painel-secao">
      <label for="campoNota">Anotações</label>
      <textarea id="campoNota" rows="5" placeholder="Onde parou, o que travou, link do notebook…">${est.nota}</textarea>
    </div>`;

  const btnConcluir = document.getElementById('btnConcluir');
  btnConcluir.textContent = est.status === 'concluida' ? 'Reabrir atividade' : 'Marcar como concluída';
  document.getElementById('btnExcluir').hidden = tipo !== 'demanda';

  document.getElementById('painel').hidden = false;
  document.getElementById('cortina').hidden = false;
}

function estadoSelecionado() {
  if (!selecionado) return estadoPadrao();
  return selecionado.tipo === 'demanda'
    ? normalizar(demandaDe(selecionado.id))
    : estadoDe(selecionado.id);
}

function quinzenaDaAtividade(id) {
  return PLANO.quinzenas.find((q) => q.atividades.some((a) => a.id === id))?.numero;
}

function fecharPainel() {
  selecionado = null;
  document.getElementById('painel').hidden = true;
  document.getElementById('cortina').hidden = true;
}

function aplicar(patch) {
  if (!selecionado) return;
  if (selecionado.tipo === 'demanda') definirDemanda(selecionado.id, patch);
  else definirEstado(selecionado.id, patch);
  abrirPainel(selecionado.tipo, selecionado.id);
}

/* ---------- exportar ---------- */

function montarSaida() {
  return {
    versao: 1,
    atualizadoEm: iso(HOJE),
    atividades: atual.atividades || {},
    demandas: atual.demandas || [],
  };
}

function exportar() {
  const txt = JSON.stringify(montarSaida(), null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
  a.download = 'progresso.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function copiar(botao) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(montarSaida(), null, 2));
    botao.textContent = 'Copiado!';
    setTimeout(() => { botao.textContent = 'Copiar JSON'; }, 1600);
  } catch (_) {
    botao.textContent = 'Não foi possível copiar';
    setTimeout(() => { botao.textContent = 'Copiar JSON'; }, 1600);
  }
}

/* ---------- eventos ---------- */

function ligarEventos() {
  document.getElementById('timeline').addEventListener('click', (ev) => {
    const barra = ev.target.closest('.barra');
    if (barra) return abrirPainel(barra.dataset.tipo, barra.dataset.id);

    const nova = ev.target.closest('[data-nova-demanda]');
    if (nova) {
      const num = Number(nova.dataset.novaDemanda);
      const q = PLANO.quinzenas.find((q) => q.numero === num);
      const dentro = (d) => (d < dt(q.inicio) ? q.inicio : d > dt(q.fim) ? q.fim : iso(d));
      const d = {
        id: `d${Date.now().toString(36)}`,
        quinzena: num,
        titulo: 'Nova demanda',
        inicio: dentro(HOJE),
        fim: q.fim,
        status: 'a_fazer',
        responsaveis: [],
        nota: '',
      };
      atual.demandas = atual.demandas || [];
      atual.demandas.push(d);
      salvarRascunho();
      desenhar();
      abrirPainel('demanda', d.id);
    }
  });

  document.getElementById('painelCorpo').addEventListener('click', (ev) => {
    const s = ev.target.closest('[data-status-opcao]');
    if (s) return aplicar({ status: s.dataset.statusOpcao });

    const p = ev.target.closest('[data-pessoa]');
    if (p) {
      const est = estadoSelecionado();
      const id = p.dataset.pessoa;
      const novos = est.responsaveis.includes(id)
        ? est.responsaveis.filter((x) => x !== id)
        : [...est.responsaveis, id];
      aplicar({ responsaveis: novos });
    }
  });

  document.getElementById('painelCorpo').addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.id === 'campoNota') return salvarSemRedesenhar({ nota: t.value });
    if (t.id === 'campoTitulo') return salvarSemRedesenhar({ titulo: t.value });
  });

  document.getElementById('painelCorpo').addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.id === 'campoInicio' && t.value) return aplicar({ inicio: t.value });
    if (t.id === 'campoFim' && t.value) return aplicar({ fim: t.value });
  });

  document.getElementById('btnConcluir').addEventListener('click', () => {
    const est = estadoSelecionado();
    aplicar({ status: est.status === 'concluida' ? 'a_fazer' : 'concluida' });
  });

  document.getElementById('btnExcluir').addEventListener('click', () => {
    atual.demandas = (atual.demandas || []).filter((d) => d.id !== selecionado.id);
    salvarRascunho();
    fecharPainel();
    desenhar();
  });

  document.getElementById('btnFechar').addEventListener('click', fecharPainel);
  document.getElementById('cortina').addEventListener('click', fecharPainel);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharPainel(); });

  document.querySelectorAll('[data-filtro-status]').forEach((b) => {
    b.addEventListener('click', () => {
      filtroStatus = b.dataset.filtroStatus;
      document.querySelectorAll('[data-filtro-status]').forEach((o) =>
        o.setAttribute('aria-pressed', String(o === b)));
      desenharTimeline();
    });
  });

  document.getElementById('filtroPessoa').addEventListener('change', (e) => {
    filtroPessoa = e.target.value;
    desenharTimeline();
  });

  document.getElementById('btnExportar').addEventListener('click', exportar);
  document.getElementById('btnCopiar').addEventListener('click', (e) => copiar(e.target));
  document.getElementById('btnDescartar').addEventListener('click', () => {
    if (!confirm('Descartar todas as alterações não publicadas e voltar ao progresso.json do repositório?')) return;
    try { localStorage.removeItem(CHAVE_RASCUNHO); } catch (_) {}
    atual = structuredClone(PUBLICADO);
    fecharPainel();
    desenhar();
  });
}

/* Nota e título mudam a cada tecla: grava sem redesenhar para não perder o foco. */
function salvarSemRedesenhar(patch) {
  if (!selecionado) return;
  if (selecionado.tipo === 'demanda') {
    const d = demandaDe(selecionado.id);
    if (d) Object.assign(d, patch);
  } else {
    atual.atividades = atual.atividades || {};
    atual.atividades[selecionado.id] = { ...estadoDe(selecionado.id), ...patch };
  }
  salvarRascunho();
  desenharBarraRascunho();
}

/* ---------- início ---------- */

async function iniciar() {
  const buscar = async (arq) => {
    const r = await fetch(`${arq}?v=${Date.now()}`);
    if (!r.ok) throw new Error(`${arq}: HTTP ${r.status}`);
    return r.json();
  };

  try {
    [PLANO, PUBLICADO] = await Promise.all([buscar('plano.json'), buscar('progresso.json')]);
  } catch (err) {
    document.getElementById('timeline').innerHTML =
      `<p class="vazio">Não foi possível carregar os dados (${err.message}).<br>
       Abrindo o arquivo direto do disco o navegador bloqueia a leitura —
       rode <code>python3 -m http.server</code> dentro da pasta <code>site/</code>.</p>`;
    return;
  }

  PUBLICADO.atividades = PUBLICADO.atividades || {};
  PUBLICADO.demandas = PUBLICADO.demandas || [];

  let rascunho = null;
  try { rascunho = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO) || 'null'); } catch (_) {}
  atual = rascunho && rascunho.atividades ? rascunho : structuredClone(PUBLICADO);

  document.getElementById('filtroPessoa').innerHTML =
    `<option value="">Todos os integrantes</option>` +
    PLANO.integrantes.map((p) => `<option value="${p.id}">${p.curto}</option>`).join('');

  ligarEventos();
  desenhar();
}

iniciar();
