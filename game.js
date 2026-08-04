'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const SKINS = {
  retro: {
    label: 'Retro',
    colors: [
      null,
      '#4dd0e1', // I - cyan
      '#ffd54f', // O - yellow
      '#ba68c8', // T - purple
      '#81c784', // S - green
      '#e57373', // Z - red
      '#64b5f6', // J - azul pálido
      '#ffb74d', // L - orange
    ],
    // bloques cuadrados planos: comportamiento original del juego
    drawBlock(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = this.colors[colorIndex];
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = color;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      context.globalAlpha = 1;
    },
  },
  neon: {
    label: 'Neón',
    colors: [
      null,
      '#00e5ff',
      '#fff176',
      '#e040fb',
      '#69f0ae',
      '#ff5252',
      '#448aff',
      '#ffab40',
    ],
    // fondo oscuro + resplandor (shadowBlur/shadowColor) alrededor del bloque
    drawBlock(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = this.colors[colorIndex];
      const px = x * size + 1;
      const py = y * size + 1;
      const s = size - 2;
      context.save();
      context.globalAlpha = alpha ?? 1;
      context.shadowBlur = size * 0.5;
      context.shadowColor = color;
      context.fillStyle = 'rgba(8, 8, 18, 0.9)';
      context.fillRect(px, py, s, s);
      context.shadowBlur = 0;
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(px + 1, py + 1, s - 2, s - 2);
      context.fillStyle = color;
      context.globalAlpha = (alpha ?? 1) * 0.35;
      context.fillRect(px + 3, py + 3, Math.max(0, s - 6), Math.max(0, s - 6));
      context.restore();
    },
  },
  pastel: {
    label: 'Pastel',
    colors: [
      null,
      '#a8dee8',
      '#ffe3a3',
      '#d7bbe0',
      '#b8e4c0',
      '#f4b7b7',
      '#b7c8ee',
      '#f6cba0',
    ],
    // paleta suave + esquinas redondeadas (roundRect o dibujo manual)
    drawBlock(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = this.colors[colorIndex];
      const px = x * size + 1;
      const py = y * size + 1;
      const s = size - 2;
      const radius = Math.min(s / 2, Math.max(3, size * 0.18));
      context.save();
      context.globalAlpha = alpha ?? 1;
      context.beginPath();
      if (typeof context.roundRect === 'function') {
        context.roundRect(px, py, s, s, radius);
      } else {
        context.moveTo(px + radius, py);
        context.lineTo(px + s - radius, py);
        context.quadraticCurveTo(px + s, py, px + s, py + radius);
        context.lineTo(px + s, py + s - radius);
        context.quadraticCurveTo(px + s, py + s, px + s - radius, py + s);
        context.lineTo(px + radius, py + s);
        context.quadraticCurveTo(px, py + s, px, py + s - radius);
        context.lineTo(px, py + radius);
        context.quadraticCurveTo(px, py, px + radius, py);
        context.closePath();
      }
      context.fillStyle = color;
      context.fill();
      context.fillStyle = 'rgba(255,255,255,0.4)';
      context.fillRect(px + 2, py + 2, Math.max(0, s - 4), Math.max(0, s * 0.22));
      context.restore();
    },
  },
  pixel: {
    label: 'Pixel art',
    colors: [
      null,
      '#4dd0e1',
      '#ffd54f',
      '#ba68c8',
      '#81c784',
      '#e57373',
      '#64b5f6',
      '#ffb74d',
    ],
    // bloque plano + patrón de puntos tipo pixel-art
    drawBlock(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = this.colors[colorIndex];
      const px = x * size + 1;
      const py = y * size + 1;
      const s = size - 2;
      context.save();
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = color;
      context.fillRect(px, py, s, s);
      context.fillStyle = 'rgba(0,0,0,0.18)';
      const step = Math.max(3, Math.floor(s / 4));
      for (let gy = 0; gy < s; gy += step) {
        const rowOffset = (gy / step) % 2 === 0 ? 0 : step / 2;
        for (let gx = rowOffset; gx < s; gx += step) {
          context.fillRect(px + gx, py + gy, step / 2, step / 2);
        }
      }
      context.strokeStyle = 'rgba(0,0,0,0.35)';
      context.lineWidth = 1;
      context.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
      context.restore();
    },
  },
};

const VALID_SKINS = Object.keys(SKINS);

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
const NEXT_BLOCK = 12;
const NEXT_GAP = 6;
const NEXT_PAD = 6;

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
const startScreen = document.getElementById('start-screen');
const startRecordsEl = document.getElementById('start-records');
const startResetBtn = document.getElementById('start-reset-btn');
const playBtn = document.getElementById('play-btn');
const overlayRecordsSection = document.getElementById('overlay-records-section');
const overlayRecordsEl = document.getElementById('overlay-records');
const overlayResetBtn = document.getElementById('overlay-reset-btn');
const playerNameInput = document.getElementById('player-name-input');
const saveScoreBtn = document.getElementById('save-score-btn');

const pauseMenu = document.getElementById('pause-menu');
const pauseMain = document.getElementById('pause-main');
const pauseControlsView = document.getElementById('pause-controls');
const pauseControlsList = document.getElementById('pause-controls-list');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const controlsBtn = document.getElementById('controls-btn');
const backBtn = document.getElementById('back-btn');
const startLevelSelect = document.getElementById('start-level-select');

const skinSelect = document.getElementById('skin-select');

let board, current, nextQueue, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, piecesUsed, elapsedTime, combo, maxCombo, scoreSaved;
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
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
  return cleared;
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
  const cleared = clearLines();
  if (cleared > 0) {
    combo++;
    if (combo > maxCombo) maxCombo = combo;
  } else {
    combo = 0;
  }
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

function getSkin() {
  return SKINS[currentSkin] || SKINS.retro;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  getSkin().drawBlock(context, x, y, colorIndex, size, alpha);
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

function occupiedRowBounds(shape) {
  let first = -1, last = -1;
  for (let r = 0; r < shape.length; r++) {
    if (shape[r].some(v => v)) {
      if (first === -1) first = r;
      last = r;
    }
  }
  return { first, last };
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  let cursorY = NEXT_PAD;
  nextQueue.forEach(piece => {
    const shape = piece.shape;
    const { first, last } = occupiedRowBounds(shape);
    const offX = Math.floor((4 - shape[0].length) / 2);
    for (let r = first; r <= last; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(nextCtx, offX + c, cursorY / NEXT_BLOCK + (r - first), shape[r][c], NEXT_BLOCK);
    cursorY += (last - first + 1) * NEXT_BLOCK + NEXT_GAP;
  });
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const RECORDS_KEY = 'tetris-records';
const NAME_KEY = 'tetris-player-name';
const MAX_RECORDS = 5;

function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(r =>
      r && typeof r === 'object' &&
      typeof r.nombre === 'string' &&
      typeof r.puntuacion === 'number' &&
      Number.isFinite(r.puntuacion)
    );
  } catch (e) {
    return [];
  }
}

function saveRecords(records) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch (e) {
    // localStorage no disponible o cuota excedida: ignorar silenciosamente
  }
}

function addRecord(entry) {
  const records = loadRecords();
  records.push(entry);
  records.sort((a, b) => b.puntuacion - a.puntuacion);
  const top = records.slice(0, MAX_RECORDS);
  saveRecords(top);
  return top;
}

function resetRecords() {
  if (!confirm('¿Seguro que quieres borrar todos los récords?')) return;
  saveRecords([]);
  renderRecords(startRecordsEl);
  renderRecords(overlayRecordsEl);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderRecords(container, highlightEntry) {
  if (!container) return;
  const records = loadRecords();
  if (records.length === 0) {
    container.innerHTML = '<p class="records-empty">Sin récords todavía</p>';
    return;
  }
  const bestCombo = Math.max(0, ...records.map(r => r.combo || 0));
  const maxLines = Math.max(0, ...records.map(r => r.lineas || 0));
  const rows = records.map((r, i) => {
    const isHighlight = !!highlightEntry &&
      r.fecha === highlightEntry.fecha &&
      r.nombre === highlightEntry.nombre &&
      r.puntuacion === highlightEntry.puntuacion;
    return `
      <li class="record-row${isHighlight ? ' record-highlight' : ''}">
        <span class="record-pos">${i + 1}</span>
        <span class="record-name">${escapeHtml(r.nombre)}</span>
        <span class="record-score">${r.puntuacion.toLocaleString()}</span>
        <span class="record-meta">Nivel ${r.nivel || 1} · ${r.lineas || 0} líneas · combo x${r.combo || 0}</span>
      </li>`;
  }).join('');
  container.innerHTML = `
    <div class="records-summary">
      <span>Mejor combo: x${bestCombo}</span>
      <span>Más líneas: ${maxLines}</span>
    </div>
    <ol class="records-list">${rows}</ol>
  `;
}

function saveScore() {
  if (scoreSaved) return;
  const nombre = (playerNameInput.value || '').trim() || 'Jugador';
  localStorage.setItem(NAME_KEY, nombre);
  const entry = {
    nombre,
    puntuacion: score,
    lineas: lines,
    nivel: level,
    combo: maxCombo,
    fecha: new Date().toISOString(),
  };
  addRecord(entry);
  scoreSaved = true;
  saveScoreBtn.disabled = true;
  saveScoreBtn.textContent = 'Guardado ✓';
  renderRecords(overlayRecordsEl, entry);
  renderRecords(startRecordsEl, entry);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  const seconds = elapsedTime / 1000;
  const pps = seconds > 0 ? (piecesUsed / seconds).toFixed(2) : '0.00';
  overlayStats.innerHTML = `
    <p>Piezas: ${piecesUsed}</p>
    <p>Tiempo: ${formatTime(elapsedTime)}</p>
    <p>PPS: ${pps}</p>
    <p>Combo máximo: ${maxCombo}</p>
  `;
  scoreSaved = false;
  playerNameInput.value = localStorage.getItem(NAME_KEY) || '';
  saveScoreBtn.disabled = false;
  saveScoreBtn.textContent = 'Guardar';
  overlayRecordsSection.classList.remove('hidden');
  renderRecords(overlayRecordsEl);
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    hidePauseMenu();
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    showPauseMenu();
  }
}

function showPauseMain() {
  pauseMain.classList.remove('hidden');
  pauseControlsView.classList.add('hidden');
}

function showPauseControls() {
  pauseMain.classList.add('hidden');
  pauseControlsView.classList.remove('hidden');
}

function showPauseMenu() {
  showPauseMain();
  pauseMenu.classList.remove('hidden');
}

function hidePauseMenu() {
  pauseMenu.classList.add('hidden');
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
  level = getStartLevel();
  paused = false;
  gameOver = false;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  piecesUsed = 0;
  elapsedTime = 0;
  combo = 0;
  maxCombo = 0;
  scoreSaved = false;
  lastTime = performance.now();
  nextQueue = [];
  fillQueue();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  hidePauseMenu();
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

const MENU_BLOCKED_CODES = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (gameOver) return;
    if (e.code === 'Escape') e.preventDefault();
    togglePause();
    return;
  }
  if (paused || gameOver) {
    // Con el menú abierto (o en game over) los controles de juego no actúan
    // y evitamos que las flechas/espacio hagan scroll de la página, salvo
    // que el usuario esté interactuando con el propio selector de nivel.
    if (paused && MENU_BLOCKED_CODES.includes(e.code) && e.target !== startLevelSelect) {
      e.preventDefault();
    }
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
  startScreen.classList.add('hidden');
  init();
});
saveScoreBtn.addEventListener('click', saveScore);
startResetBtn.addEventListener('click', resetRecords);
overlayResetBtn.addEventListener('click', resetRecords);
playBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  init();
});

resumeBtn.addEventListener('click', () => {
  if (paused) togglePause();
});

pauseRestartBtn.addEventListener('click', () => {
  init();
});

controlsBtn.addEventListener('click', showPauseControls);
backBtn.addEventListener('click', showPauseMain);

const START_LEVEL_KEY = 'tetris-start-level';
const MIN_START_LEVEL = 1;
const MAX_START_LEVEL = 15;

function getStartLevel() {
  const raw = localStorage.getItem(START_LEVEL_KEY);
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < MIN_START_LEVEL || n > MAX_START_LEVEL) return MIN_START_LEVEL;
  return n;
}

function setStartLevel(n) {
  localStorage.setItem(START_LEVEL_KEY, String(n));
}

startLevelSelect.value = String(getStartLevel());
startLevelSelect.addEventListener('change', () => {
  const n = parseInt(startLevelSelect.value, 10);
  if (Number.isFinite(n) && n >= MIN_START_LEVEL && n <= MAX_START_LEVEL) {
    setStartLevel(n);
  }
});

// Reutiliza la lista de controles del panel lateral en la sub-vista del menú de pausa.
pauseControlsList.innerHTML = document.querySelector('.controls ul').innerHTML;

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

function readStoredSkin() {
  let stored = null;
  try {
    stored = localStorage.getItem(SKIN_KEY);
  } catch (err) {
    stored = null;
  }
  return VALID_SKINS.includes(stored) ? stored : 'retro';
}

function applySkin(skin) {
  currentSkin = VALID_SKINS.includes(skin) ? skin : 'retro';
  document.documentElement.setAttribute('data-skin', currentSkin);
  if (skinSelect) skinSelect.value = currentSkin;
  try {
    localStorage.setItem(SKIN_KEY, currentSkin);
  } catch (err) {
    // almacenamiento no disponible: la preferencia simplemente no persiste
  }
  if (board) {
    draw();
    drawNext();
  }
}

if (skinSelect) {
  skinSelect.addEventListener('change', e => applySkin(e.target.value));
}
applySkin(readStoredSkin());

// El juego no arranca hasta pulsar "Jugar" en la pantalla de inicio;
// gameOver=true bloquea el manejador de teclado mientras tanto.
gameOver = true;
paused = false;
renderRecords(startRecordsEl);
