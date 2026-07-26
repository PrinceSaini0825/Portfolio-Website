const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const staticPreview = new URLSearchParams(location.search).has('static');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches || staticPreview;
const coarsePointer = matchMedia('(pointer:coarse)').matches;
const lowPower = coarsePointer || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

$('#year').textContent = new Date().getFullYear();

const menuToggle = $('#menuToggle');
const mobileMenu = $('#mobileMenu');
menuToggle?.addEventListener('click', () => {
  const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!expanded));
  mobileMenu.classList.toggle('open', !expanded);
});
$$('.mobile-menu a').forEach(link => link.addEventListener('click', () => {
  menuToggle?.setAttribute('aria-expanded', 'false');
  mobileMenu?.classList.remove('open');
}));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
$$('.reveal').forEach((el, index) => {
  el.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
  revealObserver.observe(el);
});

const scrollProgress = $('#scrollProgress');
const localNav = $('#localNav');
let lastY = scrollY;
function updateGlobalScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  scrollProgress.style.width = `${max > 0 ? scrollY / max * 100 : 0}%`;
  if (localNav) {
    const down = scrollY > lastY;
    localNav.style.transform = down && scrollY > 700 ? 'translateY(-105%)' : 'translateY(0)';
  }
  lastY = scrollY;
}
updateGlobalScroll();

const heroDevice = $('#heroDevice');
const heroProduct = $('.hero-product');
if (!reduceMotion && !lowPower && matchMedia('(pointer:fine)').matches) {
  let heroTiltFrame = 0;
  let heroTiltEvent = null;
  heroProduct?.addEventListener('pointermove', event => {
    heroTiltEvent = event;
    if (heroTiltFrame) return;
    heroTiltFrame = requestAnimationFrame(() => {
      const rect = heroProduct.getBoundingClientRect();
      const x = (heroTiltEvent.clientX - rect.left) / rect.width - .5;
      const y = (heroTiltEvent.clientY - rect.top) / rect.height - .5;
      heroDevice.style.transform = `rotateX(${1 - y * 2.2}deg) rotateY(${x * 3}deg) translate3d(${x * 3}px,${y * 3}px,0)`;
      heroTiltFrame = 0;
    });
  }, { passive: true });
  heroProduct?.addEventListener('pointerleave', () => { heroDevice.style.transform = 'rotateX(1deg)'; });
}

// Cinematic sequence -------------------------------------------------------
const cinematic = $('#cinematic');
const cinematicSticky = $('#cinematicSticky');
const sceneIntro = $('.scene-intro');
const sceneWork = $('.scene-workstation');
const sceneMetric = $('.scene-metric');
const sceneType = $('.scene-type');
const workstation = $('#workstation');
const metric = $('#cinematicMetric');
let motionPaused = false;
let cinematicProgress = 0;
const workTransformState = { tilt: 10, lateral: -54, pointerX: 0, pointerY: 0 };
function applyWorkstationTransform() {
  if (!workstation) return;
  const rx = workTransformState.tilt - workTransformState.pointerY * 1.6;
  const ry = -2 + workTransformState.pointerX * 3.2;
  const tx = workTransformState.lateral + workTransformState.pointerX * 4;
  const ty = workTransformState.pointerY * 3;
  workstation.style.transform = `perspective(1600px) rotateX(${rx}deg) rotateY(${ry}deg) translate3d(${tx}px,${ty}px,0)`;
}

function rangeProgress(p, start, end) { return clamp((p - start) / (end - start)); }
function fadeWindow(p, inStart, inEnd, outStart, outEnd) {
  return Math.min(rangeProgress(p, inStart, inEnd), 1 - rangeProgress(p, outStart, outEnd));
}
function setScene(el, opacity, transform = '') {
  if (!el) return;
  el.style.opacity = clamp(opacity);
  el.style.transform = transform;
  el.style.pointerEvents = opacity > .65 ? 'auto' : 'none';
}
function updateCinematic() {
  if (!cinematic || reduceMotion) return;
  const rect = cinematic.getBoundingClientRect();
  const available = cinematic.offsetHeight - innerHeight;
  cinematicProgress = clamp(-rect.top / Math.max(available, 1));
  const p = cinematicProgress;

  const introOpacity = fadeWindow(p, 0, .035, .14, .22);
  const introScale = lerp(.92, 1, rangeProgress(p, 0, .12));
  const introY = lerp(70, 0, rangeProgress(p, 0, .10)) - lerp(0, 70, rangeProgress(p, .14, .22));
  setScene(sceneIntro, introOpacity, `translateY(${introY}px) scale(${introScale})`);

  const workOpacity = fadeWindow(p, .15, .24, .58, .66);
  const workScale = lerp(.86, 1, rangeProgress(p, .15, .30));
  const workY = lerp(120, 0, rangeProgress(p, .15, .28)) - lerp(0, 70, rangeProgress(p, .58, .66));
  setScene(sceneWork, workOpacity, `translateY(${workY}px) scale(${workScale})`);
  workTransformState.tilt = lerp(10, 1, rangeProgress(p, .15, .33));
  workTransformState.lateral = lerp(-54, 0, rangeProgress(p, .15, .31));
  applyWorkstationTransform();

  const metricOpacity = fadeWindow(p, .60, .68, .79, .84);
  const metricScale = lerp(.76, 1, rangeProgress(p, .60, .72));
  setScene(sceneMetric, metricOpacity, `scale(${metricScale})`);
  if (metric) {
    const value = Math.round(lerp(4, 40, rangeProgress(p, .62, .72)));
    metric.textContent = String(value);
  }

  const typeOpacity = rangeProgress(p, .79, .88);
  const typeScale = lerp(1.06, 1, rangeProgress(p, .79, 1));
  setScene(sceneType, typeOpacity, `scale(${typeScale})`);
}
updateCinematic();

const motionControl = $('#motionControl');
motionControl?.addEventListener('click', () => {
  motionPaused = !motionPaused;
  motionControl.classList.toggle('paused', motionPaused);
  motionControl.setAttribute('aria-label', motionPaused ? 'Play cinematic animation' : 'Pause cinematic animation');
});

// Satellite canvas --------------------------------------------------------
const satelliteCanvas = $('#satelliteCanvas');
const satelliteCtx = satelliteCanvas?.getContext('2d', { alpha: false });
const satelliteBase = document.createElement('canvas');
const satelliteBaseCtx = satelliteBase.getContext('2d', { alpha: false });
const satelliteOverlay = $('#satelliteOverlay');
const scanFocus = $('#scanFocus');
let satellitePoints = [];
let vesselTracks = [];
let canvasRipples = [];
let activeLayer = 'fusion';
let satelliteSize = { w: 1, h: 1, dpr: 1 };
const canvasPointer = { x: 0, y: 0, active: false };

const layerPalette = {
  fusion: { primary: [99, 226, 255], secondary: [65, 133, 255], hot: [255, 188, 94] },
  vision: { primary: [177, 128, 255], secondary: [91, 113, 255], hot: [255, 104, 178] },
  geo: { primary: [101, 226, 196], secondary: [59, 161, 143], hot: [255, 210, 105] }
};

function rgba(rgb, alpha) { return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`; }
function renderSatelliteBase() {
  const { w, h, dpr } = satelliteSize;
  if (!satelliteBaseCtx) return;
  satelliteBase.width = Math.max(1, Math.floor(w * dpr));
  satelliteBase.height = Math.max(1, Math.floor(h * dpr));
  satelliteBaseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ctx = satelliteBaseCtx;
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, '#06111a');
  gradient.addColorStop(.52, '#0b2732');
  gradient.addColorStop(1, '#05090e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(105,211,233,.105)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  const coast = new Path2D();
  coast.moveTo(-20, h * .88);
  coast.bezierCurveTo(w * .12, h * .57, w * .18, h * .20, w * .39, h * .29);
  coast.bezierCurveTo(w * .51, h * .35, w * .45, h * .68, w * .62, h * .78);
  coast.bezierCurveTo(w * .75, h * .86, w * .83, h * .52, w + 20, h * .44);
  coast.lineTo(w + 20, h + 20);
  coast.lineTo(-20, h + 20);
  coast.closePath();
  const coastFill = ctx.createLinearGradient(0, 0, w, h);
  coastFill.addColorStop(0, 'rgba(30,89,101,.55)');
  coastFill.addColorStop(1, 'rgba(18,54,65,.16)');
  ctx.fillStyle = coastFill;
  ctx.fill(coast);
  ctx.strokeStyle = 'rgba(119,226,239,.38)';
  ctx.lineWidth = 1.2;
  ctx.stroke(coast);

  ctx.fillStyle = 'rgba(255,255,255,.055)';
  for (let i = 0; i < 80; i++) {
    const x = (Math.sin(i * 92.13) * .5 + .5) * w;
    const y = (Math.sin(i * 31.71 + 2) * .5 + .5) * h;
    ctx.fillRect(x, y, 1, 1);
  }
}

function resizeSatellite() {
  if (!satelliteCanvas || !satelliteCtx) return;
  const rect = satelliteCanvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, lowPower ? 1 : 1.2);
  satelliteSize = { w: Math.max(1, rect.width), h: Math.max(1, rect.height), dpr };
  satelliteCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
  satelliteCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
  satelliteCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderSatelliteBase();
  satellitePoints = Array.from({ length: lowPower ? 9 : 15 }, (_, i) => ({
    x: (.12 + Math.random() * .76) * rect.width,
    y: (.12 + Math.random() * .74) * rect.height,
    r: 1.5 + Math.random() * 4.5,
    phase: Math.random() * Math.PI * 2,
    speed: .25 + Math.random() * .5,
    hot: i % 6 === 0
  }));
  vesselTracks = [
    { y: .30, amp: .08, speed: .00010, phase: .2 },
    { y: .58, amp: .11, speed: .000075, phase: 2.1 },
    { y: .76, amp: .06, speed: .000125, phase: 4.2 }
  ];
}

function drawTrack(ctx, track, index, time, palette) {
  const { w, h } = satelliteSize;
  const phase = time * track.speed + track.phase;
  const path = new Path2D();
  for (let i = 0; i <= 34; i++) {
    const t = i / 34;
    const x = -20 + t * (w + 40);
    const y = h * track.y + Math.sin(t * 7 + phase * 4) * h * track.amp;
    if (!i) path.moveTo(x, y); else path.lineTo(x, y);
  }
  ctx.save();
  ctx.setLineDash([8, 13]);
  ctx.lineDashOffset = -time * (.018 + index * .004);
  ctx.strokeStyle = rgba(palette.primary, .34 - index * .055);
  ctx.lineWidth = 1.2;
  ctx.stroke(path);
  ctx.restore();

  const progress = (phase % 1 + 1) % 1;
  const x = progress * w;
  const y = h * track.y + Math.sin(progress * 7 + phase * 4) * h * track.amp;
  ctx.beginPath();
  ctx.fillStyle = rgba(palette.primary, .95);
  ctx.shadowBlur = lowPower ? 0 : 14;
  ctx.shadowColor = rgba(palette.primary, .9);
  ctx.arc(x, y, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawSatellite(time = 0) {
  if (!satelliteCanvas || !satelliteCtx) return;
  const { w, h } = satelliteSize;
  const ctx = satelliteCtx;
  const palette = layerPalette[activeLayer];
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(satelliteBase, 0, 0, satelliteBase.width, satelliteBase.height, 0, 0, w, h);

  const sweep = (time * .00022) % 1;
  const sweepX = sweep * (w + 160) - 80;
  const sweepGradient = ctx.createLinearGradient(sweepX - 80, 0, sweepX + 30, 0);
  sweepGradient.addColorStop(0, rgba(palette.primary, 0));
  sweepGradient.addColorStop(.82, rgba(palette.primary, .055));
  sweepGradient.addColorStop(1, rgba(palette.primary, .45));
  ctx.fillStyle = sweepGradient;
  ctx.fillRect(sweepX - 80, 0, 110, h);

  vesselTracks.forEach((track, index) => drawTrack(ctx, track, index, time, palette));

  satellitePoints.forEach((point, index) => {
    const pulse = .5 + .5 * Math.sin(time * .001 * point.speed + point.phase);
    const base = point.hot ? palette.hot : palette.primary;
    ctx.beginPath();
    ctx.fillStyle = rgba(base, .38 + pulse * .58);
    ctx.shadowBlur = lowPower ? 0 : 10 + pulse * 10;
    ctx.shadowColor = rgba(base, .8);
    ctx.arc(point.x, point.y, point.r * (.72 + pulse * .42), 0, Math.PI * 2);
    ctx.fill();
    if (index < 5) {
      ctx.beginPath();
      ctx.strokeStyle = rgba(base, .16 + pulse * .13);
      ctx.lineWidth = 1;
      ctx.arc(point.x, point.y, point.r * (3 + pulse * 2.5), 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  ctx.shadowBlur = 0;

  if (canvasPointer.active && !coarsePointer) {
    const focus = ctx.createRadialGradient(canvasPointer.x, canvasPointer.y, 0, canvasPointer.x, canvasPointer.y, 90);
    focus.addColorStop(0, rgba(palette.primary, .12));
    focus.addColorStop(1, rgba(palette.primary, 0));
    ctx.fillStyle = focus;
    ctx.fillRect(canvasPointer.x - 90, canvasPointer.y - 90, 180, 180);
  }

  canvasRipples = canvasRipples.filter(ripple => {
    const age = (time - ripple.started) / 900;
    if (age >= 1) return false;
    ctx.beginPath();
    ctx.strokeStyle = rgba(palette.hot, (1 - age) * .8);
    ctx.lineWidth = 1.4;
    ctx.arc(ripple.x, ripple.y, 8 + age * 62, 0, Math.PI * 2);
    ctx.stroke();
    return true;
  });
}

satelliteCanvas?.addEventListener('pointermove', event => {
  const rect = satelliteCanvas.getBoundingClientRect();
  canvasPointer.x = event.clientX - rect.left;
  canvasPointer.y = event.clientY - rect.top;
  canvasPointer.active = true;
  if (scanFocus) {
    scanFocus.style.setProperty('--x', `${canvasPointer.x}px`);
    scanFocus.style.setProperty('--y', `${canvasPointer.y}px`);
    scanFocus.classList.add('active');
  }
}, { passive: true });
satelliteCanvas?.addEventListener('pointerleave', () => {
  canvasPointer.active = false;
  scanFocus?.classList.remove('active');
});
satelliteCanvas?.addEventListener('pointerdown', event => {
  const rect = satelliteCanvas.getBoundingClientRect();
  canvasRipples.push({ x: event.clientX - rect.left, y: event.clientY - rect.top, started: performance.now() });
});

const workstationWrap = $('.workstation-wrap');
if (!reduceMotion && !lowPower && matchMedia('(pointer:fine)').matches) {
  let tiltFrame = 0;
  workstationWrap?.addEventListener('pointermove', event => {
    if (tiltFrame) return;
    tiltFrame = requestAnimationFrame(() => {
      const rect = workstationWrap.getBoundingClientRect();
      workTransformState.pointerX = ((event.clientX - rect.left) / rect.width - .5);
      workTransformState.pointerY = ((event.clientY - rect.top) / rect.height - .5);
      applyWorkstationTransform();
      tiltFrame = 0;
    });
  }, { passive: true });
  workstationWrap?.addEventListener('pointerleave', () => {
    workTransformState.pointerX = 0;
    workTransformState.pointerY = 0;
    applyWorkstationTransform();
  });
}

function resizeCanvases() { resizeSatellite(); }
let resizeFrame = 0;
addEventListener('resize', () => {
  if (resizeFrame) cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => { resizeCanvases(); updateCinematic(); resizeFrame = 0; });
}, { passive: true });
resizeCanvases();

let cinematicInView = false;
const activityObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    entry.target.classList.toggle('is-active', entry.isIntersecting);
    if (entry.target === cinematic) cinematicInView = entry.isIntersecting;
  });
}, { rootMargin: '12% 0px 12% 0px' });
[cinematic, $('.highlights')].filter(Boolean).forEach(section => activityObserver.observe(section));

let scrollFrame = 0;
function scheduleScrollUpdate() {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    updateGlobalScroll();
    updateCinematic();
    scrollFrame = 0;
  });
}
addEventListener('scroll', scheduleScrollUpdate, { passive: true });

let lastFrame = 0;
const frameInterval = lowPower ? 66 : 34;
function animationFrame(time) {
  const shouldDraw = cinematicInView && !motionPaused && !document.hidden && cinematicProgress > .10 && cinematicProgress < .72;
  if (shouldDraw && time - lastFrame >= frameInterval) {
    drawSatellite(time);
    lastFrame = time;
  }
  requestAnimationFrame(animationFrame);
}
if (!reduceMotion) requestAnimationFrame(animationFrame); else { drawSatellite(0); $$('.reveal').forEach(el => el.classList.add('in-view')); }

const chipData = {
  fusion: {
    title: 'Four sensor streams become one traceable evidence chain.',
    text: 'VIIRS DNB, Sentinel-1 SAR, thermal imagery and AIS flow through acquisition, detection, contextual analysis and risk scoring.',
    metric: '40', label: 'pipeline stages · demo + real modes',
    layer: 'FUSED EVIDENCE', status: '04 STREAMS SYNCED'
  },
  vision: {
    title: 'Detection is layered, inspectable and built for cross-verification.',
    text: 'DBSCAN clusters night-light candidates while CFAR surfaces radar detections before vessel-like filtering and sensor matching.',
    metric: 'DBSCAN + CFAR', label: 'candidate extraction stack',
    layer: 'DETECTION VIEW', status: 'DBSCAN + CFAR ACTIVE'
  },
  geo: {
    title: 'Every candidate remains connected to maritime context.',
    text: 'Ports, coast distance, EEZ boundaries, shipping lanes, temporal tracks, loitering and route anomalies enrich each risk record.',
    metric: 'GeoJSON', label: 'GIS-ready evidence output',
    layer: 'CONTEXT VIEW', status: 'EEZ + PORT + LANE'
  }
};
$$('.chip').forEach(button => button.addEventListener('click', () => {
  $$('.chip').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-selected', String(active)); });
  const data = chipData[button.dataset.chip];
  activeLayer = button.dataset.chip;
  $('#canvasLayer').textContent = data.layer;
  $('#canvasStatus').textContent = data.status;
  $$('.sensor-strip span').forEach((item, index) => item.classList.toggle('active', activeLayer === 'fusion' || index === ({vision:1,geo:2}[activeLayer] ?? index)));
  const copy = $('#chipCopy');
  copy.animate([{ opacity:.25, transform:'translateY(8px)' },{ opacity:1, transform:'none' }], { duration:360, easing:'cubic-bezier(.22,1,.36,1)' });
  copy.innerHTML = `<h3>${data.title}</h3><p>${data.text}</p><strong>${data.metric}<span>${data.label}</span></strong>`;
}));

// Project cards -----------------------------------------------------------
const cardsTrack = $('#cardsTrack');
$('#cardsPrev')?.addEventListener('click', () => cardsTrack.scrollBy({ left: -620, behavior: 'smooth' }));
$('#cardsNext')?.addEventListener('click', () => cardsTrack.scrollBy({ left: 620, behavior: 'smooth' }));

const projects = {
  vessel: {
    kicker:'Pinned GitHub project · Final end-to-end pipeline', title:'Dark Vessel Detection Pipeline',
    intro:'A 40-stage maritime-domain-awareness pipeline for detecting vessels that disable AIS, with multimodal evidence fusion and ML-based risk prioritisation.',
    problem:'Potential dark-vessel activity must be cross-checked across nighttime lights, radar, thermal observations, AIS behaviour and geographic context. No single sensor is sufficient.',
    approach:'Ingest demo or real data; cluster VIIRS-DNB candidates with DBSCAN; match AIS, Sentinel-1 CFAR detections and thermal anomalies; add whitelist, history, port, coast, EEZ, lane, tracking, loitering and route-anomaly features; then run XGBoost, Random Forest or LightGBM with SHAP explanations.',
    outcome:'Exports scored CSV and GeoJSON evidence, a Folium map, tiered alerts, PDF/HTML reports and system tests. Includes FastAPI, Streamlit and Docker Compose services with optional PostGIS integration.',
    note:'Demo mode uses synthetic/random data and has no scientific validity. Operational use requires real licensed sensor data, validated ground truth and expert domain review.',
    tags:['40 Stages','VIIRS DNB','Sentinel-1 SAR','AIS','Thermal','LightGBM','SHAP','FastAPI','Streamlit','Docker'],
    repo:'https://github.com/PrinceSaini0825/automated-dark-vessel-detection-via-multimodel-analytics'
  },
  sentiment: {
    kicker:'Pinned GitHub project · Financial AI', title:'Hyperliquid Sentiment Analysis AI',
    intro:'An end-to-end platform linking crypto-market sentiment, trader behaviour, profitability patterns and machine-learning signals.',
    problem:'Market psychology and trader execution data are usually analysed separately, limiting explainability and context around model-generated decisions.',
    approach:'Synchronise Fear & Greed and Hyperliquid data, engineer behavioural and sentiment features, generate confidence-aware BUY/SELL/HOLD signals, and expose analytics through a Streamlit dashboard and LLM assistant.',
    outcome:'A unified research platform for sentiment analysis, trader-performance analytics, risk classification, explainable signals and natural-language exploration.',
    tags:['Python','Pandas','Scikit-learn','XGBoost','Streamlit','Plotly','LLM Agents'],
    repo:'https://github.com/PrinceSaini0825/Hyperliquid-Sentiment-Analysis'
  },
  plastic: {
    kicker:'Pinned GitHub project · Earth observation', title:'OCM-3 Ocean Plastic Detection',
    intro:'A satellite-data workflow for detecting and projecting potential floating-plastic patterns from EOS-06 OCM-3 imagery.',
    problem:'Potential marine-plastic signatures are subtle, spatially complex and difficult to inspect consistently across large ocean-colour scenes.',
    approach:'Process OCM-3 multispectral observations, derive detection layers and project candidate patterns into geographic outputs for interpretation.',
    outcome:'A documented notebook-based workflow focused on EOS-06 ocean-colour detection and projection.',
    tags:['EOS-06','OCM-3','Jupyter','Remote Sensing','Ocean Colour','Geospatial Analysis'],
    repo:'https://github.com/PrinceSaini0825/ocm3-ocean-plastic-detection'
  },
  agent: {
    kicker:'Pinned GitHub project · Generative AI', title:'Agent Pipeline',
    intro:'A local multi-agent application where LLM agents generate, review and automatically refine educational content.',
    problem:'Single-pass generation can produce inconsistent educational material and often depends on paid external APIs.',
    approach:'Connect a React/Vite interface to an Express backend and local Ollama models, orchestrating generator and reviewer agents with an automatic retry-and-refinement loop.',
    outcome:'A private, offline-capable workflow with no API-key requirement, visible pipeline stages, MCQ generation and grade-specific output.',
    tags:['React','Vite','Node.js','Express','Ollama','Llama 3.1','Mistral','Qwen'],
    repo:'https://github.com/PrinceSaini0825/agent-pipeline'
  }
};
const dialog = $('#projectDialog');
function openProject(key) {
  const project = projects[key];
  if (!dialog || !project) return;
  $('#dialogKicker').textContent = project.kicker;
  $('#dialogTitle').textContent = project.title;
  $('#dialogIntro').textContent = project.intro;
  $('#dialogProblem').textContent = project.problem;
  $('#dialogApproach').textContent = project.approach;
  $('#dialogOutcome').textContent = project.outcome;
  const note = $('#dialogNote');
  if (project.note) { note.textContent = project.note; note.hidden = false; } else { note.textContent = ''; note.hidden = true; }
  $('#dialogTags').innerHTML = project.tags.map(tag => `<span>${tag}</span>`).join('');
  const repoLink = $('#dialogRepo');
  repoLink.href = project.repo;
  repoLink.setAttribute('aria-label', `Open ${project.title} on GitHub`);
  dialog.showModal(); document.body.style.overflow = 'hidden';
}
$$('.story-card').forEach(card => card.querySelector('.card-plus')?.addEventListener('click', () => openProject(card.dataset.project)));
function closeDialog() { dialog?.close(); document.body.style.overflow = ''; }
$('#dialogClose')?.addEventListener('click', closeDialog);
dialog?.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
});
dialog?.addEventListener('close', () => { document.body.style.overflow = ''; });

const performanceData = {
  vessel:{eyebrow:'Pipeline coverage',value:'40 stages',text:'A modular system spanning data acquisition, detection, maritime context, ML risk scoring, explainability and operational outputs.',stats:[['4','sensor streams'],['4','alert risk tiers'],['Demo + Real','execution modes']]},
  gesture:{eyebrow:'Real-time recognition accuracy',value:'94.8%',text:'A wearable gesture-recognition system validated across seven gesture classes.',stats:[['700','noise-injection trials'],['~290–320 ms','BLE pathway'],['~450 ms','MQTT pathway']]},
  sst:{eyebrow:'Target spatial enhancement',value:'1 km → 10 m',text:'A CNN-based super-resolution research pipeline designed to reconstruct fine thermal gradients.',stats:[['CNN','core architecture'],['Satellite SST','source observations'],['Ongoing','validation status']]}
};
$$('.performance-tab').forEach(tab => tab.addEventListener('click', () => {
  $$('.performance-tab').forEach(item => { const active = item === tab; item.classList.toggle('active', active); item.setAttribute('aria-selected', String(active)); });
  const data = performanceData[tab.dataset.performance];
  const stage = $('#performanceStage');
  stage.animate([{opacity:.4,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:360,easing:'cubic-bezier(.22,1,.36,1)'});
  $('#performanceEyebrow').textContent = data.eyebrow;
  $('#performanceValue').textContent = data.value;
  $('#performanceText').textContent = data.text;
  $('#performanceSecondary').innerHTML = data.stats.map(([value,label]) => `<article><strong>${value}</strong><span>${label}</span></article>`).join('');
}));
