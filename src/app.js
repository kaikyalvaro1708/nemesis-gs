/* ======================================================================
   NEMESIS — app.js (v3)
   O satélite olha PARA BAIXO. A textura do canvas simula imagem de
   satélite da Terra: água, vegetação, terra exposta, estruturas.
   Dados do painel são fictícios mas coerentes com o contexto do projeto.
   ====================================================================== */
'use strict';

/* ======================================================================
   1. HERO CANVAS — estrelas discretas (estamos acima da Terra)
   ====================================================================== */
function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let stars = [];

  const resize = () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const n = Math.floor((canvas.width * canvas.height) / 9000);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 0.9 + 0.15,
      a: Math.random() * 0.5 + 0.05,
      spd: Math.random() * 0.005 + 0.001,
      ph: Math.random() * Math.PI * 2,
    }));
  };

  const draw = (ts) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const t = ts * 0.001;
    for (const s of stars) {
      const alpha = s.a * (0.4 + 0.6 * Math.sin(t * s.spd * 30 + s.ph));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,215,255,${alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  };

  resize();
  requestAnimationFrame(draw);
  window.addEventListener('resize', debounce(resize, 200));
}


/* ======================================================================
   2. SIMULADOR DE DETECÇÃO
   Grade 9×6 = 54 janelas de 60×60px sobre imagem satelital da Terra.
   Textura: cores reais de satélite — água, floresta, solo, estruturas.
   ====================================================================== */
const COLS      = 9;
const ROWS      = 6;
const PW        = 60;   // patch width  (px no canvas)
const PH        = 60;   // patch height
const TOTAL_P   = COLS * ROWS;  // 54

/*
 * Tipo de terreno por patch — orienta tanto a textura quanto as detecções
 * W=água  F=floresta  A=agricult.  B=solo exposto  U=urbano/estrutura
 */
const TERRAIN = [
  'F','F','A','A','A','A','B','B','F',  // row 0
  'F','F','F','A','W','A','B','B','F',  // row 1 — água em col 4
  'A','F','F','A','A','B','B','A','A',  // row 2
  'A','F','A','A','A','A','B','B','B',  // row 3
  'A','A','A','W','W','A','A','B','B',  // row 4 — água em col 3-4
  'B','B','A','W','W','W','A','A','F',  // row 5 — água em col 3-5
];

/*
 * Estruturas a detectar (patchIdx, classe, label e confiança)
 * Escolhidas em terrenos coerentes:
 *   - Embarcação → patch de água (idx 13 = col4, row1)
 *   - Acampamento → patch de floresta (idx 19 = col1, row2)
 *   - Garimpo      → patch de solo (idx 42 = col6, row4)
 */
const STRUCTURES = [
  {
    idx: 13,   // col 4, row 1 — água
    label:  'Embarcação suspeita',
    cls:    'vessel',
    conf:   88.4,
    risk:   82,
    level:  'alto',
    probs:  { normal: 4, vessel: 88, struct: 5, mining: 3 },
    lat: -3.1051, lon: -60.0249,
  },
  {
    idx: 19,   // col 1, row 2 — floresta
    label:  'Acampamento clandestino',
    cls:    'struct',
    conf:   79.2,
    risk:   71,
    level:  'alto',
    probs:  { normal: 9, vessel: 2, struct: 79, mining: 10 },
    lat: -4.2734, lon: -59.8812,
  },
  {
    idx: 42,   // col 6, row 4 — solo exposto
    label:  'Garimpo irregular',
    cls:    'mining',
    conf:   74.6,
    risk:   63,
    level:  'medio',
    probs:  { normal: 8, vessel: 3, struct: 14, mining: 75 },
    lat: -2.9188, lon: -60.5563,
  },
];

/* Probabilidades padrão (patches sem estrutura, variam por terreno) */
function defaultProbs(terrain) {
  switch (terrain) {
    case 'W': return { normal: rnd(55,75), vessel: rnd(10,25), struct: rnd(2,8),  mining: rnd(1,5)  };
    case 'F': return { normal: rnd(60,80), vessel: rnd(2,6),   struct: rnd(5,15), mining: rnd(2,8)  };
    case 'A': return { normal: rnd(65,82), vessel: rnd(1,4),   struct: rnd(4,12), mining: rnd(2,9)  };
    case 'B': return { normal: rnd(50,70), vessel: rnd(1,3),   struct: rnd(8,20), mining: rnd(8,22) };
    default:  return { normal: rnd(60,80), vessel: rnd(2,6),   struct: rnd(4,12), mining: rnd(2,8)  };
  }
}

/* Estado do simulador */
let sarTexture  = null;
let simRunning  = false;
let simTimer    = null;
let lastPatch   = -1;

function initDetector() {
  const canvas = document.getElementById('detection-canvas');
  if (!canvas) return;
  sarTexture = buildSatelliteTexture(canvas.getContext('2d'), canvas.width, canvas.height);
  document.getElementById('scan-btn')?.addEventListener('click', toggleScan);
}

function toggleScan() {
  simRunning ? resetScan() : startScan();
}

/* ── Gera textura de imagem satelital da Terra ── */
function buildSatelliteTexture(ctx, W, H) {
  const img = ctx.createImageData(W, H);
  const d   = img.data;

  for (let py = 0; py < ROWS; py++) {
    for (let px = 0; px < COLS; px++) {
      const terrain = TERRAIN[py * COLS + px];
      // Pinta todos os pixels desse patch com a cor do terreno + ruído
      for (let dy = 0; dy < PH; dy++) {
        for (let dx = 0; dx < PW; dx++) {
          const ix = px * PW + dx;
          const iy = py * PH + dy;
          const i  = (iy * W + ix) * 4;
          const [r, g, b] = terrainPixel(terrain, dx / PW, dy / PH);
          d[i]   = r;
          d[i+1] = g;
          d[i+2] = b;
          d[i+3] = 255;
        }
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  return img;
}

/* Cor de cada pixel por tipo de terreno — paleta realista de satélite */
function terrainPixel(terrain, fx, fy) {
  const n  = (Math.random() - 0.5) * 18;  // ruído pixel
  // Variação regional suave dentro do patch
  const v  = 0.6 + 0.4 * Math.sin(fx * 7.3 + 1.1) * Math.cos(fy * 6.8 + 0.7);

  switch (terrain) {
    case 'W': { // Água — azul-escuro com variação de profundidade
      const t = v * 0.85;
      return [jt(8  + t * 14, n * .3),
              jt(30 + t * 35, n * .4),
              jt(72 + t * 45, n * .6)];
    }
    case 'F': { // Floresta — verde-escuro denso
      const t = v;
      return [jt(18 + t * 20, n * .4),
              jt(52 + t * 38, n * .7),
              jt(20 + t * 15, n * .3)];
    }
    case 'A': { // Agricultura — verde mais claro, padrão de campo
      const t = v;
      // simula talhões com variação ligeira
      const grid = Math.sin(fx * 9 * Math.PI) * Math.sin(fy * 7 * Math.PI) > 0 ? 1 : 0.82;
      return [jt((50 + t * 40) * grid, n * .6),
              jt((75 + t * 35) * grid, n * .8),
              jt((30 + t * 15) * grid, n * .4)];
    }
    case 'B': { // Solo exposto / área degradada — tons marrons/ocre
      const t = v;
      return [jt(90  + t * 55, n * .8),
              jt(72  + t * 38, n * .6),
              jt(38  + t * 20, n * .4)];
    }
    default:   return [80, 80, 80];
  }
}

function jt(base, jitter) {
  return Math.min(255, Math.max(0, Math.round(base + jitter)));
}

/* ── Inicia varredura ── */
function startScan() {
  simRunning = true;
  lastPatch  = -1;
  setScanBtn(true);
  setDotState('active');
  setDetStatusText('Varrendo região…');
  clearBboxes();
  clearLog();
  setProgress(0, 0);
  resetBars();
  setPatchInfo('—', '—', true);
  setClfResult(null);

  const cursor = document.getElementById('patch-cursor');
  if (cursor) cursor.classList.add('show');

  processPatch(0);
}

/* ── Processa patch idx ── */
function processPatch(idx) {
  if (idx >= TOTAL_P) { finishScan(); return; }

  lastPatch = idx;
  const col = idx % COLS;
  const row = Math.floor(idx / COLS);
  const terrain  = TERRAIN[idx];
  const structure = STRUCTURES.find(s => s.idx === idx);

  // Move cursor visual para a posição do patch
  moveCursor(col, row);

  // Atualiza info do patch
  const lat = (-3.1000 - row * 0.08 + (Math.random() - .5) * .02).toFixed(4);
  const lon = (-60.000 + col * 0.08 + (Math.random() - .5) * .02).toFixed(4);
  setPatchInfo(idx + 1, `${lat}°, ${lon}°`);

  // Anima barras para os valores corretos
  const probs = structure ? structure.probs : defaultProbs(terrain);
  animateBars(probs, structure ? structure.cls : null);

  // Delay: estruturas detectadas ficam "pensando" mais
  const delay = structure ? 900 : rnd(80, 180);

  simTimer = setTimeout(() => {
    // Aplica overlay de risco no canvas
    paintRiskOverlay(col, row, terrain, structure);

    // Resultado do patch
    if (structure) {
      setClfResult(structure);
      addBbox(col, row, structure);
      addLogEntry(structure);
    } else {
      setClfResult(null, true);
    }

    setProgress((idx + 1) / TOTAL_P, idx + 1);

    simTimer = setTimeout(() => processPatch(idx + 1), structure ? 380 : 55);
  }, delay);
}

/* ── Finaliza ── */
function finishScan() {
  simRunning = false;
  setScanBtn(false, true);
  setDotState('done');
  setDetStatusText(`Análise concluída · ${STRUCTURES.length} estruturas detectadas`);

  const cursor = document.getElementById('patch-cursor');
  if (cursor) cursor.classList.remove('show');
}

/* ── Reset ── */
function resetScan() {
  clearTimeout(simTimer);
  simRunning = false;
  lastPatch  = -1;

  const canvas = document.getElementById('detection-canvas');
  const ctx    = canvas?.getContext('2d');
  if (ctx && sarTexture) ctx.putImageData(sarTexture, 0, 0);

  setScanBtn(false, false);
  setDotState('');
  setDetStatusText('Aguardando início');
  clearBboxes();
  clearLog();
  setProgress(0, 0);
  resetBars();
  setPatchInfo('—', '—', true);
  setClfResult(null);

  const cursor = document.getElementById('patch-cursor');
  if (cursor) cursor.classList.remove('show');
}

/* ── Overlay de risco no canvas ── */
function paintRiskOverlay(col, row, terrain, structure) {
  const canvas = document.getElementById('detection-canvas');
  const ctx    = canvas?.getContext('2d');
  if (!ctx) return;

  const x = col * PW, y = row * PH;

  if (structure) {
    const color = structure.level === 'alto'
      ? 'rgba(239,68,68,0.28)'
      : 'rgba(232,98,10,0.22)';
    ctx.fillStyle = color;
    ctx.fillRect(x, y, PW, PH);
  }
}

/* ── Bounding box ── */
function addBbox(col, row, s) {
  const canvas  = document.getElementById('detection-canvas');
  const overlay = document.getElementById('bbox-layer');
  if (!canvas || !overlay) return;

  const scX = canvas.offsetWidth  / canvas.width;
  const scY = canvas.offsetHeight / canvas.height;
  const pad = 5;

  const bx = (col * PW + pad) * scX;
  const by = (row * PH + pad) * scY;
  const bw = (PW - pad * 2)   * scX;
  const bh = (PH - pad * 2)   * scY;

  const color = s.level === 'alto' ? '#EF4444' : '#E8620A';

  const box = document.createElement('div');
  box.className = 'bbox';
  box.style.cssText = `
    left:${bx}px; top:${by}px;
    width:${bw}px; height:${bh}px;
    border-color:${color};
    box-shadow: 0 0 12px ${color}55;
  `;
  box.innerHTML = `
    <span class="bbox-lbl" style="background:${color}">${esc(s.label)}</span>
    <span class="bbox-conf" style="color:${color}">${s.conf}%</span>
  `;
  overlay.appendChild(box);
}

/* ── Cursor de patch ── */
function moveCursor(col, row) {
  const canvas = document.getElementById('detection-canvas');
  const cursor = document.getElementById('patch-cursor');
  if (!canvas || !cursor) return;

  const scX = canvas.offsetWidth  / canvas.width;
  const scY = canvas.offsetHeight / canvas.height;

  cursor.style.left   = `${col * PW * scX}px`;
  cursor.style.top    = `${row * PH * scY}px`;
  cursor.style.width  = `${PW * scX}px`;
  cursor.style.height = `${PH * scY}px`;
}

/* ── Barras de confiança ── */
function animateBars(probs, winnerCls = null) {
  for (const [cls, val] of Object.entries(probs)) {
    const fill = document.getElementById(`fill-${cls}`);
    const pct  = document.getElementById(`pct-${cls}`);
    if (fill) fill.style.width = `${val}%`;
    if (pct)  pct.textContent  = `${val}%`;
    document.querySelector(`[data-cls="${cls}"]`)?.classList
      .toggle('winner', cls === winnerCls);
  }
}

function resetBars() {
  for (const cls of ['normal','vessel','struct','mining']) {
    const fill = document.getElementById(`fill-${cls}`);
    const pct  = document.getElementById(`pct-${cls}`);
    if (fill) fill.style.width = '0%';
    if (pct)  pct.textContent  = '0%';
    document.querySelector(`[data-cls="${cls}"]`)?.classList.remove('winner');
  }
}

/* ── Info do patch ── */
function setPatchInfo(num, loc, idle = false) {
  const numEl = document.getElementById('clf-patch-num');
  const locEl = document.getElementById('clf-patch-loc');
  if (numEl) numEl.textContent = idle ? '—' : `${num} / ${TOTAL_P}`;
  if (locEl) locEl.textContent = idle ? 'Aguardando análise…' : loc;
}

/* ── Resultado do patch ── */
function setClfResult(structure, ok = false) {
  const el = document.getElementById('clf-result');
  if (!el) return;

  if (!structure && !ok) {
    el.innerHTML = '<p class="clf-result-idle">Nenhuma janela analisada</p>';
    return;
  }

  if (ok && !structure) {
    el.innerHTML = `
      <div class="result-ok">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Sem estrutura suspeita detectada
      </div>`;
    return;
  }

  const riskTag = structure.level === 'alto' ? '🔴 Risco alto' : '🟠 Risco médio';
  el.innerHTML = `
    <div class="result-alert">
      <div class="result-alert-body">
        <span class="result-alert-name">${esc(structure.label)}</span>
        <span class="result-alert-meta">
          Confiança: ${structure.conf}% · Score: ${structure.risk}% · ${riskTag}
        </span>
      </div>
    </div>`;
}

/* ── Log de detecções ── */
function addLogEntry(s) {
  const log = document.getElementById('clf-log');
  if (!log) return;
  log.querySelector('.clf-log-empty')?.remove();

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <span class="log-badge ${s.level}">${s.level}</span>
    <div class="log-body">
      <span class="log-name">${esc(s.label)}</span>
      <span class="log-meta">${s.lat}°, ${s.lon}° · conf. ${s.conf}%</span>
    </div>`;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

/* ── UI helpers ── */
function setScanBtn(running, done = false) {
  const icon  = document.getElementById('scan-icon');
  const label = document.getElementById('scan-label');
  if (!icon || !label) return;

  if (running) {
    icon.innerHTML  = '<rect x="5" y="5" width="14" height="14" rx="1"/>';
    label.textContent = 'Parar análise';
  } else if (done) {
    icon.innerHTML  = '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15A9 9 0 1 0 5 6.5L1 10"/>';
    label.textContent = 'Reiniciar';
  } else {
    icon.innerHTML  = '<polygon points="5,3 19,12 5,21"/>';
    label.textContent = 'Iniciar análise';
  }
}

function setDotState(state) {
  const dot = document.getElementById('det-dot');
  if (dot) dot.className = `status-dot${state ? ' ' + state : ''}`;
}

function setDetStatusText(text) {
  const el = document.getElementById('det-status-text');
  if (el) el.textContent = text;
}

function setProgress(frac, count) {
  const fill = document.getElementById('prog-fill');
  const pct  = document.getElementById('det-pct');
  const bar  = fill?.parentElement;
  const pctV = Math.round(frac * 100);
  if (fill) fill.style.width = `${pctV}%`;
  if (pct)  pct.textContent  = `${count} / ${TOTAL_P} janelas`;
  if (bar)  bar.setAttribute('aria-valuenow', pctV);
}

function clearBboxes() {
  const layer = document.getElementById('bbox-layer');
  if (layer) layer.innerHTML = '';
}

function clearLog() {
  const log = document.getElementById('clf-log');
  if (log) log.innerHTML = '<p class="clf-log-empty">Nenhuma detecção ainda</p>';
}


/* ======================================================================
   3. CONTADORES ANIMADOS
   ====================================================================== */
function initCounters() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      animateCounter(e.target);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.metric-val[data-target]').forEach(el => obs.observe(el));
}

function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const start  = performance.now();
  const dur    = 2000;

  const tick = (ts) => {
    const t = Math.min((ts - start) / dur, 1);
    el.textContent = Math.floor(easeOut(t) * target).toLocaleString('pt-BR');
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = target.toLocaleString('pt-BR');
  };
  requestAnimationFrame(tick);
}

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }


/* ======================================================================
   4. FADE-IN
   ====================================================================== */
function initFadeIn() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -28px 0px' });

  document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
}


/* ======================================================================
   5. HEADER — scroll + nav mobile
   ====================================================================== */
function initHeader() {
  const header = document.getElementById('header');
  const burger = document.getElementById('burger');
  const nav    = document.getElementById('nav');

  window.addEventListener('scroll', () => {
    header?.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  burger?.addEventListener('click', () => {
    const open = nav?.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(!!open));
  });

  nav?.querySelectorAll('.nav-link').forEach(a => {
    a.addEventListener('click', () => {
      nav.classList.remove('open');
      burger?.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', e => {
    if (!header?.contains(e.target)) {
      nav?.classList.remove('open');
      burger?.setAttribute('aria-expanded', 'false');
    }
  });
}


/* ======================================================================
   6. REAJUSTE DE BBOXES NO RESIZE
   ====================================================================== */
function initResizeHandler() {
  window.addEventListener('resize', debounce(() => {
    const canvas = document.getElementById('detection-canvas');
    if (!canvas) return;

    clearBboxes();
    STRUCTURES
      .filter(s => s.idx <= lastPatch)
      .forEach(s => {
        const col = s.idx % COLS;
        const row = Math.floor(s.idx / COLS);
        addBbox(col, row, s);
      });
  }, 180));
}


/* ======================================================================
   UTILITÁRIOS
   ====================================================================== */
const debounce = (fn, ms) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const esc = str => {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
};


/* ======================================================================
   BOOT
   ====================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initHeroCanvas();
  initHeader();
  initDetector();
  initCounters();
  initFadeIn();
  initResizeHandler();
});
