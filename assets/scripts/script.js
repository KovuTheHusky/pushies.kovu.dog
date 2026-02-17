const bananaSrc = "assets/images/banana.svg";
const poopSrc = "assets/images/poop.svg";
const audioFiles = {
  banana: "assets/sounds/banana.flac",
  flutter: "assets/sounds/flutter.flac",
  choose: "assets/sounds/choose.flac",
  menu: "assets/sounds/menu.flac",
  cheer: "assets/sounds/cheer.flac",
  start: "assets/sounds/start.flac",
  pushies: "assets/sounds/pushies.flac",
};
const imageFiles = [
  "assets/images/kovu.webp",
  "assets/images/maymoo.webp",
  "assets/images/nyx.webp",
  "assets/images/banana.svg",
  "assets/images/poop.svg",
];
imageFiles.forEach((src) => {
  const img = new Image();
  img.src = src;
});
const config = {
  minSpawnRate: 10,
  maxAnimDuration: 5000,
  safetyMargin: 1.25,
  initialPoolSize: 100,
  menuLoopStart: 13.16,
  menuLoopEnd: 25.32,
};
const MAX_POOL_SIZE = Math.ceil(
  (config.maxAnimDuration / config.minSpawnRate) * config.safetyMargin,
);
const silenceTrim = 1250;
const baseRotationSpeed = 0.5;
const fadeDuration = 250;
let poolIndex = 0;
let particlePool = [];
let isMaymooMode = false;
let isAnimating = false;
let rainGenInterval = null;
let fadeTimer = null;
let stopTimer = null;
let spawnRate = 100;
let currentRotation = 0;
let startRotation = 0;
let targetRotation = 0;
let startTime = 0;
let endTime = 0;
const sticker = document.getElementById("sticker");
const particleContainer = document.getElementById("particle-container");
const fadeOverlay = document.getElementById("fade-overlay");
function initPool() {
  growPool(config.initialPoolSize);
}
function growPool(amount) {
  const targetSize = Math.min(MAX_POOL_SIZE, particlePool.length + amount);
  const createCount = targetSize - particlePool.length;
  if (createCount <= 0) return;
  for (let i = 0; i < createCount; i++) {
    const img = document.createElement("img");
    img.className = "particle";
    img.draggable = false;
    particleContainer.appendChild(img);
    particlePool.push(img);
  }
}
initPool();
function resetAllParticles() {
  particlePool.forEach((el) => {
    el.className = "particle";
    el.removeAttribute("style");
  });
}
function toggleMenu() {
  unlockAudioContext();
  const menu = document.getElementById("side-menu");
  const overlay = document.getElementById("menu-overlay");
  const isOpen = menu.classList.contains("open");
  if (isOpen) {
    menu.classList.remove("open");
    overlay.classList.remove("visible");
  } else {
    menu.classList.add("open");
    overlay.classList.add("visible");
  }
}
const konamiCode = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];
let konamiIndex = 0;
document.addEventListener("keydown", (e) => {
  if (
    e.key.toLowerCase() === konamiCode[konamiIndex].toLowerCase() ||
    e.key === konamiCode[konamiIndex]
  ) {
    konamiIndex++;
    if (konamiIndex === konamiCode.length) {
      activateEasterEgg();
      konamiIndex = 0;
    }
  } else {
    konamiIndex = 0;
  }
});
function activateEasterEgg() {
  const btn = document.getElementById("menu-maymoo-btn");
  btn.style.display = "block";
  const menu = document.getElementById("side-menu");
  if (!menu.classList.contains("open")) {
    toggleMenu();
  }
  if (!isMaymooMode) toggleMaymooMode();
  unlockAudioContext();
  playSound("cheer", 1.0);
}
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
const buffers = {};
async function loadAudio(key, url) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    buffers[key] = decodedBuffer;
  } catch (e) {
    console.error("Failed to load audio:", url, e);
  }
}
Object.keys(audioFiles).forEach((key) => loadAudio(key, audioFiles[key]));
let activeSources = [];
let chooseSource = null;
let menuSource = null;
function playSound(
  key,
  volume = 1.0,
  loop = false,
  loopStart = null,
  loopEnd = null,
) {
  if (audioCtx.state === "suspended") audioCtx.resume();
  if (!buffers[key]) return null;

  const source = audioCtx.createBufferSource();
  source.buffer = buffers[key];
  source.loop = loop;

  // --- NEW: Apply gapless loop points if provided ---
  if (loop && loopStart !== null && loopEnd !== null) {
    source.loopStart = loopStart;
    source.loopEnd = loopEnd;
  }

  const gainNode = audioCtx.createGain();
  gainNode.gain.value = volume;
  source.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  source.start(0);
  return { source, gainNode };
}
function unlockAudioContext() {
  if (audioCtx.state === "suspended") audioCtx.resume();
}
function toggleMaymooMode() {
  unlockAudioContext();
  playSound("start", 1.0);
  isMaymooMode = !isMaymooMode;
  const btn = document.getElementById("menu-maymoo-btn");
  if (isMaymooMode) {
    btn.innerText = "Maymoo Mode: ON";
    btn.classList.add("active");
  } else {
    btn.innerText = "Maymoo Mode: OFF";
    btn.classList.remove("active");
  }
}
function openCharMenu() {
  unlockAudioContext();
  stopMenuAudio();

  const v = playSound("choose", 1.0);
  if (v) chooseSource = v.source; // FIXED: Assign to chooseSource

  // Figure out loop end (Use config value, or default to the file's total length)
  const endPoint =
    config.menuLoopEnd || (buffers["menu"] ? buffers["menu"].duration : 0);

  const c = playSound("menu", 1.0, true, config.menuLoopStart, endPoint);
  if (c) menuSource = c.source; // FIXED: Assign to menuSource

  document.getElementById("char-overlay").classList.add("visible");
}
function stopMenuAudio() {
  if (chooseSource) {
    try {
      chooseSource.stop();
    } catch (e) {}
    chooseSource = null;
  }
  if (menuSource) {
    try {
      menuSource.stop();
    } catch (e) {}
    menuSource = null;
  }
}
function closeCharMenu(e) {
  if (e.target.id === "char-overlay") {
    document.getElementById("char-overlay").classList.remove("visible");
    stopMenuAudio();
    playSound("cheer", 1.0);
  }
}
function selectChar(filename) {
  stopMenuAudio();
  playSound("cheer", 1.0);
  sticker.src = filename;
  document.getElementById("char-overlay").classList.remove("visible");
}
function animate() {
  if (!isAnimating) return;
  const now = Date.now();
  if (now >= endTime) {
    isAnimating = false;
    sticker.style.transition = "none";
    sticker.style.transform = "";
    void sticker.offsetWidth;
    sticker.style.transition = "transform 0.2s ease-out";
    return;
  }
  const progress = (now - startTime) / (endTime - startTime);
  currentRotation = startRotation + (targetRotation - startRotation) * progress;
  updateTransform(currentRotation);
  requestAnimationFrame(animate);
}
function updateTransform(deg) {
  const normalizedAngle = deg % 360;
  const radians = normalizedAngle * (Math.PI / 360);
  const pulseFactor = Math.sin(radians);
  const scale = 1.1 + 0.3 * pulseFactor;
  sticker.style.transform = `scale(${scale}) rotate(${deg}deg)`;
}
function handleClick(e) {
  unlockAudioContext();
  fadeOverlay.style.transition = "none";
  fadeOverlay.style.opacity = "0";
  const now = Date.now();
  const audioKey = isMaymooMode ? "flutter" : "banana";
  let spinDuration = 1;
  if (buffers[audioKey]) spinDuration = buffers[audioKey].duration;
  const rawDurationMs = spinDuration * 1000;
  const effectiveDurationMs = Math.max(0, rawDurationMs - silenceTrim);
  const mainVolume = audioKey === "flutter" ? 2.0 : 1.0;
  const instance = playSound(audioKey, mainVolume);
  if (audioKey === "banana") playSound("flutter", 2.0);
  if (instance) {
    activeSources.unshift(instance);
    activeSources.forEach((item, index) => {
      const time = audioCtx.currentTime;
      const targetVol = audioKey === "flutter" ? 2.0 : 1.0;
      const modifier = [1.0, 0.75, 0.5, 0.25][index] || 0;
      item.gainNode.gain.setTargetAtTime(targetVol * modifier, time, 0.01);
    });
    instance.source.onended = function () {
      activeSources = activeSources.filter((item) => item !== instance);
    };
  }
  if (!isAnimating) currentRotation = 0;
  startRotation = currentRotation;
  startTime = now;
  endTime = now + effectiveDurationMs;
  const duration = endTime - startTime;
  const projectedRotation = startRotation + duration * baseRotationSpeed;
  targetRotation = Math.round(projectedRotation / 360) * 360;
  if (!isAnimating) {
    isAnimating = true;
    sticker.style.transition = "none";
    requestAnimationFrame(animate);
  }
  clearTimeout(fadeTimer);
  clearTimeout(stopTimer);
  spawnRate = Math.max(config.minSpawnRate, spawnRate - 15);
  const requiredParticles = Math.ceil(
    (config.maxAnimDuration / spawnRate) * config.safetyMargin,
  );
  if (requiredParticles > particlePool.length) {
    growPool(requiredParticles - particlePool.length);
  }
  startRainGeneration();
  const timeUntilFade = Math.max(0, effectiveDurationMs - fadeDuration);
  fadeTimer = setTimeout(() => {
    fadeOverlay.style.transition = `opacity ${fadeDuration / 1000}s ease-out`;
    fadeOverlay.style.opacity = "1";
  }, timeUntilFade);
  stopTimer = setTimeout(() => {
    stopRainGeneration();
    resetAllParticles();
  }, effectiveDurationMs);
}
function startRainGeneration() {
  if (rainGenInterval) clearInterval(rainGenInterval);
  rainGenInterval = setInterval(spawnFromPool, spawnRate);
}
function stopRainGeneration() {
  clearInterval(rainGenInterval);
  rainGenInterval = null;
  spawnRate = 100;
}
function spawnFromPool() {
  const el = particlePool[poolIndex];
  poolIndex = (poolIndex + 1) % particlePool.length;
  el.className = "particle";
  el.removeAttribute("style");
  void el.offsetWidth;
  if (isMaymooMode) {
    el.src = poopSrc;
    el.style.width = 30 + Math.random() * 50 + "px";
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(window.innerWidth, window.innerHeight) * 0.8;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    el.style.setProperty("--tx", `${tx}px`);
    el.style.setProperty("--ty", `${ty}px`);
    el.style.animationDuration = 1 + Math.random() * 2 + "s";
    el.className = "particle active poop-anim";
  } else {
    el.src = bananaSrc;
    el.style.left = Math.random() * 100 + "vw";
    el.style.width = 30 + Math.random() * 50 + "px";
    el.style.animationDuration = 2 + Math.random() * 3 + "s";
    el.className = "particle active banana-anim";
  }
}
