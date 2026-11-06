'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#64b5f6', // J - azul pálido
  '#ffb74d', // L - orange
];

const SKIN_PALETTES = {
  retro: COLORS,
  neon: [
    null,
    '#00e5ff', // I
    '#fff176', // O
    '#e040fb', // T
    '#69f0ae', // S
    '#ff1744', // Z
    '#448aff', // J
    '#ff9100', // L
  ],
  pastel: [
    null,
    '#a8d8ea', // I
    '#fff3b0', // O
    '#d9b3f0', // T
    '#b5e8b8', // S
    '#f5b8b8', // Z
    '#b8c9f0', // J
    '#f5cba7', // L
  ],
  pixel: COLORS,
};

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const QUEUE_SIZE = 5;
const NEXT_BLOCK = 20;
const RECORDS_KEY = 'tetris-records-v1';
const NAME_KEY = 'tetris-player-name';
const MAX_RECORDS = 5;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const overlayStats = document.getElementById('overlay-stats');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');
const pauseOverlay = document.getElementById('pause-overlay');
const pauseMenu = document.getElementById('pause-menu');
const pauseControlsView = document.getElementById('pause-controls-view');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const pauseControlsBtn = document.getElementById('pause-controls-btn');
const pauseBackBtn = document.getElementById('pause-back-btn');
const startLevelSelect = document.getElementById('start-level-select');

const MAX_START_LEVEL = 15;

const RESUME_INPUT_LOCK_MS = 200;
const START_LEVEL_KEY = 'tetris-start-level';

const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const startRecordsEl = document.getElementById('start-records');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const nameForm = document.getElementById('name-form');
const playerNameInput = document.getElementById('player-name-input');
const saveRecordBtn = document.getElementById('save-record-btn');
const overlayRecordsEl = document.getElementById('overlay-records');

let board, current, nextQueue, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, piecesUsed, elapsedTime, startLevel, gameStartLevel, combo, sessionBestCombo;
let inputLockedUntil = 0, ignoreRepeats = false;
let records = loadRecords();
let pendingNewEntry = null;
const skinSelect = document.getElementById('skin-select');
let currentSkin = 'retro';

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = gameStartLevel + Math.floor(lines / 10);
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    combo++;
    sessionBestCombo = Math.max(sessionBestCombo, combo);
    updateHUD();
  } else {
    combo = 0;
  }
}

function loadRecords() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECORDS_KEY));
    return {
      scores: Array.isArray(raw && raw.scores) ? raw.scores : [],
      bestCombo: Number(raw && raw.bestCombo) || 0,
      maxLines: Number(raw && raw.maxLines) || 0,
    };
  } catch {
    return { scores: [], bestCombo: 0, maxLines: 0 };
  }
}

function saveRecords() {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // localStorage no disponible (modo privado, cuota llena): récords solo en memoria
  }
}

function isTopScore(value) {
  return value > 0 && (records.scores.length < MAX_RECORDS || value > records.scores[records.scores.length - 1].score);
}

function addScoreRecord(name, value, clearedLines) {
  const entry = { name: name || 'AAA', score: value, lines: clearedLines };
  records.scores.push(entry);
  records.scores.sort((a, b) => b.score - a.score);
  records.scores = records.scores.slice(0, MAX_RECORDS);
  saveRecords();
  return entry;
}

function updateMetaRecords(comboValue, linesValue) {
  let updated = false;
  if (comboValue > records.bestCombo) { records.bestCombo = comboValue; updated = true; }
  if (linesValue > records.maxLines) { records.maxLines = linesValue; updated = true; }
  if (updated) saveRecords();
}

function resetRecords() {
  if (!confirm('¿Seguro que quieres borrar todos los récords?')) return;
  records = { scores: [], bestCombo: 0, maxLines: 0 };
  saveRecords();
  renderRecords(startRecordsEl);
  renderRecords(overlayRecordsEl, pendingNewEntry);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderRecords(container, highlightEntry) {
  if (!container) return;
  if (records.scores.length === 0) {
    container.innerHTML = `
      <p class="records-empty">Sin récords todavía</p>
      <p class="records-meta">Mejor combo: ${records.bestCombo} · Líneas máx: ${records.maxLines}</p>
    `;
    return;
  }
  const rows = records.scores.map((entry, i) => `
    <li class="${entry === highlightEntry ? 'highlight' : ''}">
      <span class="rank">${i + 1}</span>
      <span class="name">${escapeHtml(entry.name)}</span>
      <span class="score">${entry.score.toLocaleString()}</span>
      <span class="lines">${entry.lines}L</span>
    </li>
  `).join('');
  container.innerHTML = `
    <ol class="records-list">${rows}</ol>
    <p class="records-meta">Mejor combo: ${records.bestCombo} · Líneas máx: ${records.maxLines}</p>
  `;
}

function saveCurrentRecord() {
  if (nameForm.classList.contains('hidden')) return;
  const name = playerNameInput.value.trim().slice(0, 10) || 'AAA';
  try { localStorage.setItem(NAME_KEY, name); } catch { /* ignorar */ }
  pendingNewEntry = addScoreRecord(name, score, lines);
  nameForm.classList.add('hidden');
  renderRecords(overlayRecordsEl, pendingNewEntry);
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  piecesUsed++;
  merge();
  clearLines();
  spawn();
}

function fillQueue() {
  while (nextQueue.length < QUEUE_SIZE) nextQueue.push(randomPiece());
}

function spawn() {
  current = nextQueue.shift();
  fillQueue();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(255 * (percent / 100));
  const clamp = v => Math.min(255, Math.max(0, v));
  const r = clamp((num >> 16) + amt);
  const g = clamp(((num >> 8) & 0xff) + amt);
  const b = clamp((num & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function drawBlockRetro(context, x, y, color, size, alpha) {
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawBlockNeon(context, x, y, color, size, alpha) {
  context.save();
  context.globalAlpha = alpha ?? 1;
  context.shadowColor = color;
  context.shadowBlur = size * 0.6;
  context.fillStyle = color;
  context.fillRect(x * size + 3, y * size + 3, size - 6, size - 6);
  context.shadowBlur = 0;
  context.strokeStyle = 'rgba(255,255,255,0.6)';
  context.lineWidth = 1;
  context.strokeRect(x * size + 3.5, y * size + 3.5, size - 7, size - 7);
  context.restore();
}

function drawBlockPastel(context, x, y, color, size, alpha) {
  context.save();
  context.globalAlpha = alpha ?? 1;
  const px = x * size + 2;
  const py = y * size + 2;
  const w = size - 4;
  const h = size - 4;
  const r = size * 0.28;
  context.fillStyle = color;
  context.beginPath();
  if (context.roundRect) {
    context.roundRect(px, py, w, h, r);
  } else {
    context.moveTo(px + r, py);
    context.arcTo(px + w, py, px + w, py + h, r);
    context.arcTo(px + w, py + h, px, py + h, r);
    context.arcTo(px, py + h, px, py, r);
    context.arcTo(px, py, px + w, py, r);
  }
  context.fill();
  context.fillStyle = 'rgba(255,255,255,0.45)';
  context.beginPath();
  context.arc(px + w * 0.32, py + h * 0.32, w * 0.16, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawBlockPixel(context, x, y, color, size, alpha) {
  context.save();
  context.globalAlpha = alpha ?? 1;
  const px = x * size;
  const py = y * size;
  const unit = Math.max(2, Math.round(size / 6));
  const lighter = shadeColor(color, 22);
  const darker = shadeColor(color, -22);
  context.fillStyle = color;
  context.fillRect(px + 1, py + 1, size - 2, size - 2);
  context.fillStyle = lighter;
  context.fillRect(px + 1, py + 1, size - 2, unit);
  context.fillRect(px + 1, py + 1, unit, size - 2);
  context.fillStyle = darker;
  context.fillRect(px + 1, py + size - unit - 1, size - 2, unit);
  context.fillRect(px + size - unit - 1, py + 1, unit, size - 2);
  context.fillStyle = 'rgba(0,0,0,0.18)';
  for (let i = 0; i < 4; i++) {
    const dx = unit + (i % 2) * unit * 2;
    const dy = unit * 2 + Math.floor(i / 2) * unit * 2;
    context.fillRect(px + dx, py + dy, unit, unit);
  }
  context.restore();
}

const SKIN_DRAWERS = {
  retro: drawBlockRetro,
  neon: drawBlockNeon,
  pastel: drawBlockPastel,
  pixel: drawBlockPixel,
};

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const palette = SKIN_PALETTES[currentSkin] || COLORS;
  const drawer = SKIN_DRAWERS[currentSkin] || drawBlockRetro;
  drawer(context, x, y, palette[colorIndex], size, alpha);
}

function drawGrid() {
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid-line').trim();
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextQueue.forEach((piece, i) => {
    const shape = piece.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = i * 4 + Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NEXT_BLOCK);
  });
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';

  const qualifies = isTopScore(score);
  overlayScore.innerHTML = `Puntuación: ${score.toLocaleString()}${qualifies ? ' <span class="top-badge">¡Top 5!</span>' : ''}`;

  const seconds = elapsedTime / 1000;
  const pps = seconds > 0 ? (piecesUsed / seconds).toFixed(2) : '0.00';
  const newBestCombo = sessionBestCombo > records.bestCombo;
  const newMaxLines = lines > records.maxLines;
  updateMetaRecords(sessionBestCombo, lines);

  overlayStats.innerHTML = `
    <p>Piezas: ${piecesUsed}</p>
    <p>Tiempo: ${formatTime(elapsedTime)}</p>
    <p>PPS: ${pps}</p>
    <p>Mejor combo: ${sessionBestCombo}</p>
    ${newBestCombo ? '<p class="new-record">¡Nuevo récord de combo!</p>' : ''}
    ${newMaxLines ? '<p class="new-record">¡Nuevo récord de líneas!</p>' : ''}
  `;

  pendingNewEntry = null;
  renderRecords(overlayRecordsEl);
  if (qualifies) {
    nameForm.classList.remove('hidden');
    playerNameInput.value = localStorage.getItem(NAME_KEY) || '';
    overlay.classList.remove('hidden');
    playerNameInput.focus();
  } else {
    nameForm.classList.add('hidden');
    overlay.classList.remove('hidden');
  }
}

function showPauseView(view) {
  const isMenu = view === 'menu';
  pauseMenu.classList.toggle('hidden', !isMenu);
  pauseControlsView.classList.toggle('hidden', isMenu);
  (isMenu ? pauseControlsBtn : pauseBackBtn).focus();
}

function openPauseMenu() {
  paused = true;
  cancelAnimationFrame(animId);
  showPauseView('menu');
  pauseOverlay.classList.remove('hidden');
  resumeBtn.focus();
}

// Bloquea input del juego un instante tras volver y descarta auto-repeat de teclas mantenidas
function lockInputBriefly() {
  if (document.activeElement) document.activeElement.blur();
  inputLockedUntil = performance.now() + RESUME_INPUT_LOCK_MS;
  ignoreRepeats = true;
}

function closePauseMenu() {
  paused = false;
  pauseOverlay.classList.add('hidden');
  lockInputBriefly();
  lastTime = performance.now();
  animId = requestAnimationFrame(loop);
}

function togglePause() {
  if (gameOver) return;
  if (paused) {
    if (!pauseControlsView.classList.contains('hidden')) showPauseView('menu');
    else closePauseMenu();
  } else {
    openPauseMenu();
  }
}

function populateStartLevelSelect() {
  for (let lvl = 1; lvl <= MAX_START_LEVEL; lvl++) {
    const option = document.createElement('option');
    option.value = lvl;
    option.textContent = lvl;
    startLevelSelect.appendChild(option);
  }
  startLevelSelect.value = startLevel;
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  elapsedTime += dt;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
      if (gameOver) return;
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  gameStartLevel = startLevel;
  level = gameStartLevel;
  paused = false;
  gameOver = false;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  piecesUsed = 0;
  elapsedTime = 0;
  combo = 0;
  sessionBestCombo = 0;
  lastTime = performance.now();
  nextQueue = [];
  fillQueue();
  spawn();
  updateHUD();
  nameForm.classList.add('hidden');
  overlayRecordsEl.innerHTML = '';
  overlay.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  lockInputBriefly();
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (!board) return; // partida aún no iniciada (pantalla de inicio)
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (!e.repeat) togglePause();
    return;
  }
  if (paused || gameOver) return;
  if (e.repeat && ignoreRepeats) return; // tecla mantenida desde antes de volver
  if (!e.repeat) ignoreRepeats = false;
  if (performance.now() < inputLockedUntil) {
    if (e.code === 'Space') e.preventDefault();
    return;
  }
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', () => {
  // si entró en el top y no pulsó Guardar, no perder el récord
  if (gameOver) saveCurrentRecord();
  init();
});

startBtn.addEventListener('click', () => {
  startOverlay.classList.add('hidden');
  init();
});

resetRecordsBtn.addEventListener('click', resetRecords);

saveRecordBtn.addEventListener('click', saveCurrentRecord);

playerNameInput.addEventListener('keydown', e => {
  if (e.code === 'Enter') saveCurrentRecord();
});

resumeBtn.addEventListener('click', closePauseMenu);
pauseRestartBtn.addEventListener('click', init);
pauseControlsBtn.addEventListener('click', () => showPauseView('controls'));
pauseBackBtn.addEventListener('click', () => showPauseView('menu'));
startLevelSelect.addEventListener('change', () => {
  startLevel = Number(startLevelSelect.value);
  try { localStorage.setItem(START_LEVEL_KEY, startLevel); } catch {}
});

{
  let saved = NaN;
  try { saved = Number(localStorage.getItem(START_LEVEL_KEY)); } catch {}
  startLevel = saved >= 1 && saved <= MAX_START_LEVEL ? saved : 1;
}
populateStartLevelSelect();

const THEME_KEY = 'tetris-theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'light' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
  if (board) {
    draw();
    drawNext();
  }
}

function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  applyTheme(isLight ? 'dark' : 'light');
}

themeToggle.addEventListener('click', toggleTheme);
applyTheme(localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark');

const SKIN_KEY = 'tetris-skin';

function applySkin(skin) {
  currentSkin = SKIN_PALETTES[skin] ? skin : 'retro';
  document.documentElement.setAttribute('data-skin', currentSkin);
  if (skinSelect) skinSelect.value = currentSkin;
  try { localStorage.setItem(SKIN_KEY, currentSkin); } catch {}
  if (board) {
    draw();
    drawNext();
  }
}

if (skinSelect) {
  skinSelect.addEventListener('change', e => {
    applySkin(e.target.value);
    // Soltar foco: si no, flechas/espacio cambian la skin en vez de jugar
    skinSelect.blur();
  });
}

let savedSkin = 'retro';
try { savedSkin = localStorage.getItem(SKIN_KEY) || 'retro'; } catch {}
applySkin(savedSkin);

renderRecords(startRecordsEl);
