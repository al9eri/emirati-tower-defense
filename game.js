const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const MAX_WAVE = 8;

const ui = {
  coins: document.getElementById("coins"),
  lives: document.getElementById("lives"),
  wave: document.getElementById("wave"),
  status: document.getElementById("status"),
  towerList: document.getElementById("towerList"),
  towerInfo: document.getElementById("towerInfo"),
  waveBtn: document.getElementById("waveBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  speedBtn: document.getElementById("speedBtn"),
  resetBtn: document.getElementById("resetBtn"),
  toast: document.getElementById("toast"),
};

const towerTypes = {
  slipper: {
    id: "slipper",
    short: "SM",
    name: "Slipper Mom",
    cost: 55,
    range: 150,
    damage: 34,
    rate: 1.0,
    color: "#b35b35",
    accent: "#f0c37a",
    projectile: "slipper",
    desc: "High damage slipper toss. Naughty kids may dodge.",
  },
  karak: {
    id: "karak",
    short: "KC",
    name: "Karak Stall",
    cost: 45,
    range: 128,
    damage: 6,
    rate: 0.34,
    slow: 0.54,
    slowTime: 1.25,
    color: "#c2772e",
    accent: "#fff1b8",
    projectile: "tea",
    desc: "Rapid chai steam slows anything dramatic.",
  },
  oud: {
    id: "oud",
    short: "OU",
    name: "Oud Uncle",
    cost: 70,
    range: 158,
    damage: 12,
    rate: 1.55,
    splash: 58,
    stun: 0.4,
    color: "#68452f",
    accent: "#d8a83b",
    projectile: "note",
    desc: "A smooth riff hits a small crowd at once.",
  },
  boundary: {
    id: "boundary",
    short: "NB",
    name: "No-Number Runner",
    cost: 75,
    range: 145,
    damage: 20,
    rate: 0.82,
    slow: 0.35,
    slowTime: 0.75,
    color: "#2f68ad",
    accent: "#f15a4a",
    projectile: "cone",
    desc: "Sets boundaries on Jumeirah Road. Strong vs phone pests.",
  },
  falcon: {
    id: "falcon",
    short: "FC",
    name: "Falcon Caller",
    cost: 90,
    range: 210,
    damage: 42,
    rate: 1.35,
    color: "#1f6f4a",
    accent: "#d7ecff",
    projectile: "falcon",
    desc: "Long range dive from a proud rooftop perch.",
  },
};

const enemyTypes = [
  {
    id: "kid",
    name: "Naughty Kid",
    hp: 58,
    speed: 45,
    reward: 12,
    color: "#efb040",
    accent: "#2d7dd2",
    radius: 14,
    dodge: 0.22,
    fromWave: 1,
  },
  {
    id: "number",
    name: "Number Chaser",
    hp: 82,
    speed: 52,
    reward: 16,
    color: "#8a5a44",
    accent: "#f5f5f5",
    radius: 15,
    fromWave: 2,
    weakToBoundary: true,
  },
  {
    id: "queue",
    name: "Queue Skipper",
    hp: 118,
    speed: 35,
    reward: 20,
    color: "#8246af",
    accent: "#ffe066",
    radius: 16,
    fromWave: 3,
  },
  {
    id: "suv",
    name: "Late Brunch SUV",
    hp: 165,
    speed: 29,
    reward: 28,
    color: "#2f3338",
    accent: "#a3d5ff",
    radius: 18,
    fromWave: 4,
  },
  {
    id: "drama",
    name: "Family Group Drama",
    hp: 235,
    speed: 33,
    reward: 38,
    color: "#bd3f42",
    accent: "#fff7d6",
    radius: 20,
    fromWave: 6,
  },
];

const path = [
  { x: -50, y: 326 },
  { x: 112, y: 326 },
  { x: 154, y: 214 },
  { x: 326, y: 214 },
  { x: 390, y: 405 },
  { x: 552, y: 405 },
  { x: 646, y: 152 },
  { x: 810, y: 152 },
  { x: 1010, y: 308 },
];

const buildSpots = [
  { x: 116, y: 430 },
  { x: 126, y: 196 },
  { x: 250, y: 138 },
  { x: 320, y: 316 },
  { x: 430, y: 500 },
  { x: 524, y: 304 },
  { x: 604, y: 500 },
  { x: 716, y: 258 },
  { x: 742, y: 72 },
  { x: 836, y: 248 },
  { x: 834, y: 434 },
];

const segments = [];
let totalPathLength = 0;
for (let i = 0; i < path.length - 1; i += 1) {
  const a = path[i];
  const b = path[i + 1];
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  segments.push({ a, b, length, start: totalPathLength });
  totalPathLength += length;
}

let state;
let lastFrame = performance.now();
let toastTimer = 0;
let needsUi = true;
let lastTowerListKey = "";
let lastTowerInfoKey = "";

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createState() {
  return {
    coins: 170,
    lives: 20,
    wave: 0,
    selectedType: "slipper",
    selectedTower: null,
    waveActive: false,
    spawnQueue: [],
    spawnTimer: 0,
    enemies: [],
    towers: [],
    projectiles: [],
    effects: [],
    floating: [],
    paused: false,
    speed: 1,
    gameOver: false,
    won: false,
    status: "Choose a tower, then click a glowing build spot.",
  };
}

function setStatus(text, toast = false) {
  state.status = text;
  needsUi = true;
  if (toast) {
    ui.toast.textContent = text;
    ui.toast.classList.remove("hidden");
    toastTimer = 2.2;
  }
}

function money(value) {
  return `${value}`;
}

function pointAt(distance) {
  if (distance <= 0) return { ...path[0], angle: 0 };
  if (distance >= totalPathLength) {
    const last = path[path.length - 1];
    return { ...last, angle: 0 };
  }

  for (const segment of segments) {
    if (distance <= segment.start + segment.length) {
      const t = (distance - segment.start) / segment.length;
      const x = segment.a.x + (segment.b.x - segment.a.x) * t;
      const y = segment.a.y + (segment.b.y - segment.a.y) * t;
      const angle = Math.atan2(segment.b.y - segment.a.y, segment.b.x - segment.a.x);
      return { x, y, angle };
    }
  }

  return { ...path[path.length - 1], angle: 0 };
}

function wavePool(wave) {
  return enemyTypes.filter((enemy) => enemy.fromWave <= wave);
}

function makeEnemy(type, wave, index) {
  const hpScale = 1 + (wave - 1) * 0.14;
  const speedScale = 1 + Math.min(0.24, (wave - 1) * 0.025);
  const spawnPoint = pointAt(0);
  return {
    id: makeId(),
    type,
    name: type.name,
    x: spawnPoint.x,
    y: spawnPoint.y,
    angle: 0,
    progress: -index * 10,
    hp: Math.round(type.hp * hpScale),
    maxHp: Math.round(type.hp * hpScale),
    speed: type.speed * speedScale,
    reward: Math.round(type.reward + wave * 1.3),
    radius: type.radius,
    slowUntil: 0,
    slowFactor: 1,
    stunUntil: 0,
    wobble: Math.random() * Math.PI * 2,
    alive: true,
  };
}

function createWave(wave) {
  const pool = wavePool(wave);
  const queue = [];
  const count = 8 + wave * 3;

  for (let i = 0; i < count; i += 1) {
    let type = pool[Math.floor(Math.random() * pool.length)];
    if (wave === 1) type = enemyTypes[0];
    if (wave >= 4 && i % 7 === 0) type = enemyTypes[3];
    if (wave >= 6 && i % 9 === 0) type = enemyTypes[4];
    queue.push(makeEnemy(type, wave, i));
  }

  if (wave === MAX_WAVE) {
    queue.push(makeEnemy(enemyTypes[4], wave + 2, count + 1));
    queue.push(makeEnemy(enemyTypes[3], wave + 1, count + 2));
  }

  return queue;
}

function startWave() {
  if (state.gameOver || state.won) return;
  if (state.waveActive) {
    setStatus("That wave is already causing drama.", true);
    return;
  }
  if (state.wave >= MAX_WAVE) return;
  state.wave += 1;
  state.waveActive = true;
  state.spawnQueue = createWave(state.wave);
  state.spawnTimer = 0.25;
  state.selectedTower = null;
  setStatus(`Wave ${state.wave}: the road is getting busy.`, true);
}

function resetGame() {
  state = createState();
  needsUi = true;
  lastTowerListKey = "";
  lastTowerInfoKey = "";
  renderTowerButtons();
  setStatus("Choose a tower, then click a glowing build spot.");
}

function isSpotOccupied(index) {
  return state.towers.some((tower) => tower.spotIndex === index);
}

function getTowerAt(x, y) {
  return state.towers.find((tower) => Math.hypot(tower.x - x, tower.y - y) <= 28);
}

function getSpotAt(x, y) {
  let best = null;
  let bestDist = Infinity;
  buildSpots.forEach((spot, index) => {
    const dist = Math.hypot(spot.x - x, spot.y - y);
    if (dist < 32 && dist < bestDist) {
      best = { spot, index };
      bestDist = dist;
    }
  });
  return best;
}

function buildTower(spotInfo) {
  const type = towerTypes[state.selectedType];
  if (!type || isSpotOccupied(spotInfo.index)) return;
  if (state.coins < type.cost) {
    setStatus(`Need ${type.cost - state.coins} more dirhams for ${type.name}.`, true);
    return;
  }

  state.coins -= type.cost;
  const tower = {
    id: makeId(),
    typeId: type.id,
    x: spotInfo.spot.x,
    y: spotInfo.spot.y,
    spotIndex: spotInfo.index,
    level: 1,
    cooldown: 0,
    invested: type.cost,
    pulse: 0,
    targetId: null,
  };
  state.towers.push(tower);
  state.selectedTower = tower;
  addFloating(tower.x, tower.y - 30, `${type.name} ready`, "#168a4a");
  setStatus(`${type.name} is watching the road.`, true);
}

function getTowerStats(tower) {
  const base = towerTypes[tower.typeId];
  const levelBoost = tower.level - 1;
  return {
    ...base,
    range: base.range + levelBoost * 15,
    damage: Math.round(base.damage * (1 + levelBoost * 0.35)),
    rate: Math.max(0.16, base.rate * (1 - levelBoost * 0.08)),
    splash: base.splash ? base.splash + levelBoost * 8 : 0,
    slowTime: base.slowTime ? base.slowTime + levelBoost * 0.12 : 0,
    stun: base.stun ? base.stun + levelBoost * 0.05 : 0,
  };
}

function upgradeCost(tower) {
  return 35 + tower.level * 28;
}

function upgradeSelectedTower() {
  const tower = state.selectedTower;
  if (!tower || tower.level >= 4) return;
  const cost = upgradeCost(tower);
  if (state.coins < cost) {
    setStatus(`Need ${cost - state.coins} more dirhams for the upgrade.`, true);
    return;
  }
  state.coins -= cost;
  tower.level += 1;
  tower.invested += cost;
  tower.pulse = 0.55;
  addEffect(tower.x, tower.y, 70, "#168a4a", 0.45);
  setStatus(`${towerTypes[tower.typeId].name} upgraded to level ${tower.level}.`, true);
}

function sellSelectedTower() {
  const tower = state.selectedTower;
  if (!tower) return;
  const refund = Math.round(tower.invested * 0.65);
  state.coins += refund;
  state.towers = state.towers.filter((item) => item !== tower);
  state.selectedTower = null;
  addFloating(tower.x, tower.y - 26, `+${refund}`, "#9a6a2f");
  setStatus(`Sold tower for ${refund} dirhams.`, true);
}

function addProjectile(tower, target, stats) {
  state.projectiles.push({
    x: tower.x,
    y: tower.y,
    target,
    typeId: tower.typeId,
    projectile: stats.projectile,
    damage: stats.damage,
    speed: stats.projectile === "falcon" ? 560 : 430,
    splash: stats.splash || 0,
    slow: stats.slow || 0,
    slowTime: stats.slowTime || 0,
    stun: stats.stun || 0,
    life: 1.8,
    wobble: 0,
  });
}

function addEffect(x, y, radius, color, life = 0.35) {
  state.effects.push({ x, y, radius, color, life, maxLife: life });
}

function addFloating(x, y, text, color = "#171717") {
  state.floating.push({ x, y, text, color, life: 1.05, maxLife: 1.05 });
}

function selectTarget(tower, stats) {
  let best = null;
  let bestProgress = -Infinity;
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    const dist = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
    if (dist <= stats.range && enemy.progress > bestProgress) {
      best = enemy;
      bestProgress = enemy.progress;
    }
  }
  return best;
}

function applyDamage(enemy, amount, sourceTypeId, now) {
  if (!enemy.alive) return false;

  if (sourceTypeId === "slipper" && enemy.type.dodge && Math.random() < enemy.type.dodge) {
    addFloating(enemy.x, enemy.y - 22, "dodged!", "#2f68ad");
    return false;
  }

  let damage = amount;
  if (sourceTypeId === "boundary" && enemy.type.weakToBoundary) {
    damage = Math.round(damage * 1.65);
    addFloating(enemy.x, enemy.y - 28, "blocked", "#cf2e2e");
  }

  enemy.hp -= damage;
  addFloating(enemy.x, enemy.y - enemy.radius - 14, `-${damage}`, "#171717");

  if (enemy.hp <= 0) {
    enemy.alive = false;
    state.coins += enemy.reward;
    addFloating(enemy.x, enemy.y - 30, `+${enemy.reward}`, "#168a4a");
    addEffect(enemy.x, enemy.y, 38, "#d8a83b", 0.28);
    setStatus(`${enemy.name} calmed down.`, false);
    return true;
  }

  return false;
}

function hitEnemy(projectile, now) {
  const enemy = projectile.target;
  if (!enemy || !enemy.alive) return;

  applyDamage(enemy, projectile.damage, projectile.typeId, now);

  if (projectile.slow && enemy.alive) {
    enemy.slowUntil = Math.max(enemy.slowUntil, now + projectile.slowTime);
    enemy.slowFactor = projectile.slow;
  }

  if (projectile.stun && enemy.alive) {
    enemy.stunUntil = Math.max(enemy.stunUntil, now + projectile.stun);
  }

  if (projectile.splash) {
    addEffect(enemy.x, enemy.y, projectile.splash, "#68452f", 0.4);
    for (const other of state.enemies) {
      if (other === enemy || !other.alive) continue;
      const dist = Math.hypot(other.x - enemy.x, other.y - enemy.y);
      if (dist <= projectile.splash) {
        applyDamage(other, Math.round(projectile.damage * 0.65), projectile.typeId, now);
        other.stunUntil = Math.max(other.stunUntil, now + projectile.stun * 0.75);
      }
    }
  } else {
    const color = towerTypes[projectile.typeId].accent;
    addEffect(enemy.x, enemy.y, 24, color, 0.22);
  }
}

function update(dt) {
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) ui.toast.classList.add("hidden");
  }

  if (state.paused || state.gameOver || state.won) return;

  const now = performance.now() / 1000;

  if (state.waveActive && state.spawnQueue.length > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.enemies.push(state.spawnQueue.shift());
      state.spawnTimer = Math.max(0.34, 0.78 - state.wave * 0.025);
    }
  }

  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    const stunned = enemy.stunUntil > now;
    const slow = enemy.slowUntil > now ? enemy.slowFactor : 1;
    enemy.progress += stunned ? 0 : enemy.speed * slow * dt;
    const point = pointAt(enemy.progress);
    const wiggle = Math.sin(now * 7 + enemy.wobble) * (enemy.type.id === "kid" ? 2.3 : 1.0);
    enemy.x = point.x + Math.cos(point.angle + Math.PI / 2) * wiggle;
    enemy.y = point.y + Math.sin(point.angle + Math.PI / 2) * wiggle;
    enemy.angle = point.angle;

    if (enemy.progress >= totalPathLength) {
      enemy.alive = false;
      state.lives -= 1;
      addFloating(W - 130, H - 98, "-1 patience", "#cf2e2e");
      setStatus(`${enemy.name} reached the majlis.`, true);
      if (state.lives <= 0) {
        state.gameOver = true;
        setStatus("Game over. The family group chat won.", true);
      }
    }
  }

  state.enemies = state.enemies.filter((enemy) => enemy.alive);

  for (const tower of state.towers) {
    tower.cooldown -= dt;
    tower.pulse = Math.max(0, tower.pulse - dt);
    const stats = getTowerStats(tower);
    if (tower.cooldown <= 0) {
      const target = selectTarget(tower, stats);
      if (target) {
        tower.targetId = target.id;
        addProjectile(tower, target, stats);
        tower.cooldown = stats.rate;
        tower.pulse = 0.18;
      } else {
        tower.targetId = null;
      }
    }
  }

  for (const projectile of state.projectiles) {
    projectile.life -= dt;
    projectile.wobble += dt * 10;
    const target = projectile.target;
    if (!target || !target.alive || projectile.life <= 0) {
      projectile.dead = true;
      continue;
    }
    const dx = target.x - projectile.x;
    const dy = target.y - projectile.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= Math.max(11, target.radius * 0.7)) {
      hitEnemy(projectile, now);
      projectile.dead = true;
    } else {
      const step = Math.min(dist, projectile.speed * dt);
      projectile.x += (dx / dist) * step;
      projectile.y += (dy / dist) * step;
      if (projectile.projectile === "slipper") {
        projectile.y += Math.sin(projectile.wobble) * 0.9;
      }
    }
  }
  state.projectiles = state.projectiles.filter((projectile) => !projectile.dead);

  for (const effect of state.effects) effect.life -= dt;
  state.effects = state.effects.filter((effect) => effect.life > 0);

  for (const float of state.floating) {
    float.life -= dt;
    float.y -= dt * 24;
  }
  state.floating = state.floating.filter((float) => float.life > 0);

  if (
    state.waveActive &&
    state.spawnQueue.length === 0 &&
    state.enemies.length === 0 &&
    !state.gameOver
  ) {
    state.waveActive = false;
    const bonus = 35 + state.wave * 10;
    state.coins += bonus;
    if (state.wave >= MAX_WAVE) {
      state.won = true;
      setStatus("You saved the majlis. Karak for everyone.", true);
    } else {
      setStatus(`Wave cleared. Bonus ${bonus} dirhams.`, true);
    }
  }

  needsUi = true;
}

function drawBackground() {
  ctx.fillStyle = "#e8d2a8";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#74cbd0";
  ctx.fillRect(0, 0, W, 92);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let x = -40; x < W; x += 72) {
    ctx.beginPath();
    ctx.ellipse(x, 88, 42, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSun(64, 58);
  drawBurj(678, 122);
  drawPalm(74, 166, 1.1);
  drawPalm(884, 108, 0.9);
  drawKarakSign(818, 540);
  drawMajlis(832, 354);
}

function drawSun(x, y) {
  ctx.save();
  ctx.fillStyle = "#f6ca4f";
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBurj(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#b8c7d3";
  ctx.beginPath();
  ctx.moveTo(0, -108);
  ctx.lineTo(12, 0);
  ctx.lineTo(-18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#dbe7ef";
  ctx.fillRect(-5, -132, 5, 46);
  ctx.fillStyle = "#9bb1c1";
  for (let i = 0; i < 5; i += 1) {
    ctx.fillRect(-13 + i * 5, -18 - i * 14, 19 - i * 2, 2);
  }
  ctx.restore();
}

function drawPalm(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "#7a562a";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 48);
  ctx.quadraticCurveTo(10, 16, 0, -22);
  ctx.stroke();
  ctx.strokeStyle = "#1f8f57";
  ctx.lineWidth = 7;
  for (let i = 0; i < 7; i += 1) {
    const angle = -Math.PI * 0.95 + i * 0.32;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(Math.cos(angle) * 34, -28 + Math.sin(angle) * 14, Math.cos(angle) * 58, -18 + Math.sin(angle) * 24);
    ctx.stroke();
  }
  ctx.restore();
}

function drawKarakSign(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#c2772e";
  ctx.fillRect(-50, -42, 100, 58);
  ctx.fillStyle = "#fff1b8";
  ctx.fillRect(-36, -28, 72, 20);
  ctx.fillStyle = "#171717";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("KARAK", 0, -13);
  ctx.fillStyle = "#75451d";
  ctx.fillRect(-38, 16, 10, 30);
  ctx.fillRect(28, 16, 10, 30);
  ctx.restore();
}

function drawMajlis(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#fff7df";
  ctx.fillRect(-76, -38, 152, 76);
  ctx.fillStyle = "#cf2e2e";
  ctx.fillRect(-76, -48, 152, 16);
  ctx.fillStyle = "#168a4a";
  ctx.fillRect(-76, 28, 152, 10);
  ctx.fillStyle = "#202020";
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.arc(i * 28, 0, 12, Math.PI, 0);
    ctx.lineTo(i * 28 + 12, 24);
    ctx.lineTo(i * 28 - 12, 24);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#171717";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MAJLIS", 0, 58);
  ctx.restore();
}

function drawPath() {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#272b31";
  ctx.lineWidth = 54;
  drawPolyline(path);
  ctx.stroke();

  ctx.strokeStyle = "#484d54";
  ctx.lineWidth = 42;
  drawPolyline(path);
  ctx.stroke();

  ctx.setLineDash([18, 18]);
  ctx.strokeStyle = "#f6dc78";
  ctx.lineWidth = 4;
  drawPolyline(path);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "center";
  ctx.save();
  ctx.translate(482, 434);
  ctx.rotate(0.02);
  ctx.fillText("Jumeirah Road", 0, 0);
  ctx.restore();
  ctx.restore();
}

function drawPolyline(points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
}

function drawBuildSpots() {
  for (let i = 0; i < buildSpots.length; i += 1) {
    const spot = buildSpots[i];
    const occupied = isSpotOccupied(i);
    ctx.save();
    ctx.globalAlpha = occupied ? 0.35 : 1;
    ctx.fillStyle = occupied ? "#5c5043" : "#fffdf7";
    ctx.strokeStyle = occupied ? "#6b6254" : "#168a4a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (!occupied) {
      ctx.strokeStyle = "rgba(22, 138, 74, 0.25)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, 30 + Math.sin(performance.now() / 350 + i) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawTowers() {
  for (const tower of state.towers) {
    const stats = getTowerStats(tower);
    if (state.selectedTower === tower) {
      ctx.save();
      ctx.strokeStyle = "rgba(22, 138, 74, 0.72)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, stats.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    const scale = 1 + tower.pulse * 0.12;
    ctx.save();
    ctx.translate(tower.x, tower.y);
    ctx.scale(scale, scale);
    if (tower.typeId === "slipper") drawSlipperMom(tower);
    if (tower.typeId === "karak") drawKarakTower(tower);
    if (tower.typeId === "oud") drawOudTower(tower);
    if (tower.typeId === "boundary") drawBoundaryTower(tower);
    if (tower.typeId === "falcon") drawFalconTower(tower);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "#171717";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`L${tower.level}`, tower.x, tower.y + 37);
    ctx.restore();
  }
}

function drawTowerBase(color) {
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.ellipse(0, 21, 28, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 4, 22, 0, Math.PI * 2);
  ctx.fill();
}

function drawPersonHead(x, y, scarf = "#f1d0a4") {
  ctx.fillStyle = "#8f5f3d";
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = scarf;
  ctx.beginPath();
  ctx.arc(x, y - 2, 10, Math.PI, Math.PI * 2);
  ctx.fill();
}

function drawSlipperMom(tower) {
  const type = towerTypes.slipper;
  drawTowerBase(type.color);
  drawPersonHead(-4, -10, "#111");
  ctx.fillStyle = "#111";
  ctx.fillRect(-15, -3, 22, 24);
  ctx.strokeStyle = "#8f5f3d";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(6, 2);
  ctx.lineTo(22, -12);
  ctx.stroke();
  ctx.fillStyle = "#7b4a2d";
  ctx.save();
  ctx.translate(26, -15);
  ctx.rotate(-0.45);
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawKarakTower() {
  drawTowerBase("#c2772e");
  ctx.fillStyle = "#fff1b8";
  ctx.fillRect(-16, -12, 32, 24);
  ctx.fillStyle = "#9a551c";
  ctx.fillRect(-11, -6, 22, 15);
  ctx.strokeStyle = "#fff7df";
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 8, -15);
    ctx.quadraticCurveTo(i * 8 + 6, -22, i * 8, -28);
    ctx.stroke();
  }
  ctx.fillStyle = "#171717";
  ctx.font = "bold 8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CHAI", 0, 5);
}

function drawOudTower() {
  drawTowerBase("#68452f");
  drawPersonHead(-9, -9, "#fff7df");
  ctx.fillStyle = "#fff7df";
  ctx.fillRect(-18, -2, 16, 23);
  ctx.fillStyle = "#8a5a32";
  ctx.beginPath();
  ctx.ellipse(12, 1, 14, 20, -0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2d1e16";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(21, -12);
  ctx.lineTo(38, -28);
  ctx.stroke();
  ctx.strokeStyle = "#f0c37a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(9, -8);
  ctx.lineTo(22, 12);
  ctx.stroke();
}

function drawBoundaryTower() {
  drawTowerBase("#2f68ad");
  drawPersonHead(-8, -13, "#111");
  ctx.fillStyle = "#f2f2f2";
  ctx.fillRect(-18, -5, 18, 24);
  ctx.fillStyle = "#2f68ad";
  ctx.fillRect(-3, -3, 17, 22);
  ctx.strokeStyle = "#f15a4a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(30, -13);
  ctx.stroke();
  ctx.fillStyle = "#f15a4a";
  ctx.beginPath();
  ctx.moveTo(30, -18);
  ctx.lineTo(42, 6);
  ctx.lineTo(21, 6);
  ctx.closePath();
  ctx.fill();
}

function drawFalconTower() {
  drawTowerBase("#1f6f4a");
  ctx.fillStyle = "#7a562a";
  ctx.fillRect(-5, -18, 10, 38);
  ctx.fillStyle = "#d7ecff";
  ctx.beginPath();
  ctx.moveTo(-18, -17);
  ctx.quadraticCurveTo(0, -38, 22, -18);
  ctx.quadraticCurveTo(6, -25, -18, -17);
  ctx.fill();
  ctx.fillStyle = "#2a2a2a";
  ctx.beginPath();
  ctx.arc(9, -21, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d8a83b";
  ctx.beginPath();
  ctx.moveTo(20, -19);
  ctx.lineTo(31, -15);
  ctx.lineTo(20, -12);
  ctx.closePath();
  ctx.fill();
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle);
    if (enemy.type.id === "suv") drawSuvEnemy(enemy);
    else drawPersonEnemy(enemy);
    ctx.restore();

    drawHealthBar(enemy);
  }
}

function drawPersonEnemy(enemy) {
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, enemy.radius + 5, enemy.radius + 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = enemy.type.color;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = enemy.type.accent;
  ctx.fillRect(-enemy.radius * 0.65, -3, enemy.radius * 1.3, enemy.radius + 9);

  ctx.fillStyle = "#2a1b13";
  ctx.beginPath();
  ctx.arc(0, -enemy.radius + 3, enemy.radius * 0.55, 0, Math.PI * 2);
  ctx.fill();

  if (enemy.type.id === "kid") {
    ctx.fillStyle = "#2d7dd2";
    ctx.fillRect(-9, -enemy.radius - 5, 18, 5);
  }

  if (enemy.type.id === "number") {
    ctx.fillStyle = "#111";
    ctx.fillRect(enemy.radius - 1, -12, 7, 13);
    ctx.fillStyle = "#fff";
    ctx.fillRect(enemy.radius, -10, 5, 7);
    ctx.fillStyle = "#fffdf7";
    ctx.beginPath();
    ctx.ellipse(4, -enemy.radius - 18, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#171717";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("num?", 4, -enemy.radius - 15);
  }

  if (enemy.type.id === "queue") {
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(9, -1, 10, 16);
    ctx.strokeStyle = "#171717";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(14, -1, 5, Math.PI, 0);
    ctx.stroke();
  }

  if (enemy.type.id === "drama") {
    ctx.fillStyle = "#fff7d6";
    ctx.fillRect(-16, -enemy.radius - 21, 32, 12);
    ctx.fillStyle = "#bd3f42";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("99+", 0, -enemy.radius - 12);
  }
}

function drawSuvEnemy(enemy) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 31, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = enemy.type.color;
  ctx.fillRect(-28, -13, 56, 27);
  ctx.fillStyle = enemy.type.accent;
  ctx.fillRect(-15, -24, 28, 14);
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(-18, 16, 6, 0, Math.PI * 2);
  ctx.arc(18, 16, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7d36d";
  ctx.fillRect(22, -7, 6, 5);
}

function drawHealthBar(enemy) {
  const width = enemy.radius * 2.4;
  const pct = Math.max(0, enemy.hp / enemy.maxHp);
  ctx.save();
  ctx.translate(enemy.x, enemy.y - enemy.radius - 14);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(-width / 2, -3, width, 6);
  ctx.fillStyle = pct > 0.45 ? "#168a4a" : "#cf2e2e";
  ctx.fillRect(-width / 2, -3, width * pct, 6);
  ctx.restore();
}

function drawProjectiles() {
  for (const projectile of state.projectiles) {
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    const target = projectile.target;
    const angle = target ? Math.atan2(target.y - projectile.y, target.x - projectile.x) : 0;
    ctx.rotate(angle);

    if (projectile.projectile === "slipper") {
      ctx.fillStyle = "#7b4a2d";
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f0c37a";
      ctx.fillRect(-2, -5, 6, 10);
    } else if (projectile.projectile === "tea") {
      ctx.fillStyle = "#fff1b8";
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#9a551c";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (projectile.projectile === "note") {
      ctx.fillStyle = "#68452f";
      ctx.beginPath();
      ctx.arc(-4, 3, 5, 0, Math.PI * 2);
      ctx.arc(7, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#68452f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(1, 3);
      ctx.lineTo(1, -13);
      ctx.lineTo(12, -8);
      ctx.stroke();
    } else if (projectile.projectile === "cone") {
      ctx.fillStyle = "#f15a4a";
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, -9);
      ctx.lineTo(-8, 9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(-5, -3, 11, 6);
    } else if (projectile.projectile === "falcon") {
      ctx.fillStyle = "#d7ecff";
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-12, -11);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-12, 11);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#d8a83b";
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(22, -3);
      ctx.lineTo(22, 3);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawEffects() {
  for (const effect of state.effects) {
    const pct = effect.life / effect.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, pct) * 0.72;
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 4 * pct;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius * (1 - pct * 0.35), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawFloating() {
  for (const float of state.floating) {
    const pct = float.life / float.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, pct);
    ctx.fillStyle = float.color;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(float.text, float.x, float.y);
    ctx.restore();
  }
}

function drawOverlayState() {
  if (!state.gameOver && !state.won && (state.wave > 0 || state.waveActive || state.towers.length > 0)) return;

  ctx.save();
  ctx.fillStyle = "rgba(255,253,247,0.86)";
  ctx.strokeStyle = "rgba(23,23,23,0.16)";
  ctx.lineWidth = 2;
  roundRect(ctx, 286, 196, 388, 138, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#171717";
  ctx.textAlign = "center";
  ctx.font = "900 28px sans-serif";
  let title = "Choose a tower";
  let line = "Place it on a glowing spot, then start the wave.";
  if (state.gameOver) {
    title = "Game Over";
    line = "Reset and protect the majlis again.";
  } else if (state.won) {
    title = "Majlis Saved";
    line = "Eight waves handled. Excellent crowd control.";
  }
  ctx.fillText(title, W / 2, 244);
  ctx.fillStyle = "#5d5a53";
  ctx.font = "700 16px sans-serif";
  ctx.fillText(line, W / 2, 278);
  ctx.fillStyle = "#168a4a";
  ctx.fillText("Click a build spot to begin.", W / 2, 306);
  ctx.restore();
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function draw() {
  drawBackground();
  drawPath();
  drawBuildSpots();
  drawTowers();
  drawEnemies();
  drawProjectiles();
  drawEffects();
  drawFloating();
  drawOverlayState();
}

function renderTowerButtons() {
  ui.towerList.innerHTML = "";
  Object.values(towerTypes).forEach((type) => {
    const card = document.createElement("div");
    card.className = `tower-card ${state.selectedType === type.id ? "selected" : ""}`;
    if (state.coins < type.cost) card.classList.add("locked");

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-pressed", String(state.selectedType === type.id));
    button.innerHTML = `
      <span class="tower-icon" style="background:${type.color}">${type.short}</span>
      <span>
        <span class="tower-name">${type.name}</span>
        <span class="tower-desc">${type.desc}</span>
      </span>
      <span class="tower-cost">${type.cost}</span>
    `;
    button.addEventListener("click", () => {
      state.selectedType = type.id;
      state.selectedTower = null;
      setStatus(`${type.name} selected. Click an empty build spot.`);
      renderTowerButtons();
    });

    card.appendChild(button);
    ui.towerList.appendChild(card);
  });
}

function renderTowerInfo() {
  const tower = state.selectedTower;
  if (!tower) {
    const type = towerTypes[state.selectedType];
    ui.towerInfo.innerHTML = `
      <h2>Build ${type.name}</h2>
      <p>${type.desc} Cost: ${type.cost} dirhams. Click a glowing spot beside the road.</p>
    `;
    return;
  }

  const stats = getTowerStats(tower);
  const canUpgrade = tower.level < 4;
  const cost = canUpgrade ? upgradeCost(tower) : 0;
  ui.towerInfo.innerHTML = `
    <h2>${stats.name}</h2>
    <p>Level ${tower.level}. Damage ${stats.damage}, range ${Math.round(stats.range)}, reload ${stats.rate.toFixed(2)}s.</p>
    <div class="tower-actions">
      <button id="upgradeBtn" type="button" ${!canUpgrade ? "disabled" : ""}>
        ${canUpgrade ? `Upgrade ${cost}` : "Max Level"}
      </button>
      <button id="sellBtn" type="button">Sell ${Math.round(tower.invested * 0.65)}</button>
    </div>
  `;
  const upgradeBtn = document.getElementById("upgradeBtn");
  const sellBtn = document.getElementById("sellBtn");
  if (upgradeBtn) upgradeBtn.addEventListener("click", upgradeSelectedTower);
  if (sellBtn) sellBtn.addEventListener("click", sellSelectedTower);
}

function renderUi() {
  ui.coins.textContent = money(state.coins);
  ui.lives.textContent = String(state.lives);
  ui.wave.textContent = `${state.wave} / ${MAX_WAVE}`;
  ui.status.textContent = state.status;
  ui.waveBtn.disabled = state.waveActive || state.gameOver || state.won;
  ui.waveBtn.textContent = state.wave >= MAX_WAVE ? "All Waves Done" : "Start Wave";
  ui.pauseBtn.textContent = state.paused ? "Resume" : "Pause";
  ui.speedBtn.textContent = `${state.speed}x`;

  const towerListKey = `${state.selectedType}|${state.coins}`;
  if (towerListKey !== lastTowerListKey) {
    renderTowerButtons();
    lastTowerListKey = towerListKey;
  }

  const tower = state.selectedTower;
  const towerInfoKey = tower
    ? `${tower.id}|${tower.level}|${tower.invested}|${state.coins}`
    : `build|${state.selectedType}`;
  if (towerInfoKey !== lastTowerInfoKey) {
    renderTowerInfo();
    lastTowerInfoKey = towerInfoKey;
  }

  needsUi = false;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  return {
    x: ((clientX - rect.left) / rect.width) * W,
    y: ((clientY - rect.top) / rect.height) * H,
  };
}

function handleCanvasPress(event) {
  event.preventDefault();
  if (state.gameOver || state.won) return;
  const point = canvasPoint(event);
  const tower = getTowerAt(point.x, point.y);
  if (tower) {
    state.selectedTower = tower;
    const type = towerTypes[tower.typeId];
    setStatus(`${type.name} selected for upgrades.`);
    return;
  }

  const spot = getSpotAt(point.x, point.y);
  if (spot) {
    state.selectedTower = null;
    if (isSpotOccupied(spot.index)) return;
    buildTower(spot);
    return;
  }

  state.selectedTower = null;
  setStatus("Click a glowing build spot, or choose a tower to upgrade.");
}

function bindEvents() {
  canvas.addEventListener("pointerdown", handleCanvasPress);
  ui.waveBtn.addEventListener("click", startWave);
  ui.pauseBtn.addEventListener("click", () => {
    state.paused = !state.paused;
    setStatus(state.paused ? "Paused." : "Back on patrol.", true);
  });
  ui.speedBtn.addEventListener("click", () => {
    state.speed = state.speed === 1 ? 2 : 1;
    setStatus(`Speed set to ${state.speed}x.`);
  });
  ui.resetBtn.addEventListener("click", resetGame);
  window.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      if (!state.waveActive) startWave();
    }
    if (event.key === "p" || event.key === "P") {
      state.paused = !state.paused;
      setStatus(state.paused ? "Paused." : "Back on patrol.", true);
    }
    const number = Number(event.key);
    if (number >= 1 && number <= Object.keys(towerTypes).length) {
      const type = Object.values(towerTypes)[number - 1];
      state.selectedType = type.id;
      state.selectedTower = null;
      setStatus(`${type.name} selected.`);
    }
  });
}

function loop(now) {
  const rawDt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  const dt = rawDt * state.speed;
  update(dt);
  draw();
  if (needsUi) renderUi();
  requestAnimationFrame(loop);
}

resetGame();
bindEvents();
requestAnimationFrame(loop);
