/* =========================================================
   Flow:  Start button -> Video 1 -> Palm scan -> Video 2 -> Banner
   ========================================================= */

const screens = {
  start:  document.getElementById('startScreen'),
  video1: document.getElementById('video1Screen'),
  scan:   document.getElementById('scanScreen'),
  video2: document.getElementById('video2Screen'),
  banner: document.getElementById('imageScreen'),
};

const startBtn    = document.getElementById('startBtn');
const video1      = document.getElementById('video1');
const video2      = document.getElementById('video2');
const palmBtn     = document.getElementById('palmBtn');
const statusText  = document.getElementById('statusText');
const progressBar = document.getElementById('progressBar');
const percentEl   = document.getElementById('percent');
const imgResetBtn = document.getElementById('imgResetBtn');
const fadeEl      = document.getElementById('fadeOverlay');
const typedEl     = document.getElementById('typedText');
const canvas      = document.getElementById('bgCanvas');

const SCAN_DURATION = 3000;  // ms  (palm scan time)
const FADE_SECONDS  = 1.2;   // white fade at the end of video 2 (seconds)
const TYPED_WORD    = 'Dirasmikan';
const TYPING_SPEED  = 130;   // ms per letter

let stage = 'start';
let token = 0;               // bumped on reset so old timeouts do nothing
let scanTimer = null;
let typingTimer = null;
let fading = false;

/* ---------- helpers ---------- */
function goTo(name) {
  stage = name;
  Object.entries(screens).forEach(([key, el]) => el.classList.toggle('active', key === name));
  document.body.classList.toggle('immersive', name !== 'scan');   // palm scan is the only "card" screen
  if (name === 'start') startParticles(); else stopParticles();
}

// fade to a colour, switch screen while hidden, then fade back in
function transition(ms, color, midFn) {
  const t = token;
  fadeEl.style.transition = `opacity ${ms}ms ease`;
  fadeEl.style.background = color;
  fadeEl.classList.add('show');
  setTimeout(() => {
    if (t !== token) return;
    midFn();
    fadeEl.classList.remove('show');
  }, ms);
}

function playVideo(v) {
  v.currentTime = 0;
  v.play().catch(() => { /* autoplay blocked: user can press the button again */ });
}

/* ---------- 1. START SCREEN ---------- */
startBtn.addEventListener('click', () => {
  if (screens.start.classList.contains('launching')) return;
  screens.start.classList.add('launching');
  const t = token;
  setTimeout(() => {
    if (t !== token) return;
    transition(500, '#000', () => {
      screens.start.classList.remove('launching');
      goTo('video1');
      playVideo(video1);
    });
  }, 800);
});

/* animated particle network behind the start button */
const ctx = canvas.getContext('2d');
let particles = [];
let raf = null;

function sizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = canvas.clientWidth  * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function makeParticles() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const count = Math.min(110, Math.round((w * h) / 14000));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    vx: (Math.random() - .5) * .5, vy: (Math.random() - .5) * .5,
    r: Math.random() * 1.8 + .6,
  }));
}

function drawParticles() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  for (const p of particles) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > w) p.vx *= -1;
    if (p.y < 0 || p.y > h) p.vy *= -1;
  }
  for (let i = 0; i < particles.length; i++) {
    const a = particles[i];
    for (let j = i + 1; j < particles.length; j++) {
      const b = particles[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 130) {
        ctx.strokeStyle = `rgba(0, 229, 255, ${(1 - d / 130) * .35})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
  }
  ctx.fillStyle = 'rgba(180, 245, 255, .9)';
  for (const p of particles) {
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  raf = requestAnimationFrame(drawParticles);
}

function startParticles() {
  stopParticles();
  sizeCanvas();
  makeParticles();
  raf = requestAnimationFrame(drawParticles);
}
function stopParticles() {
  if (raf) cancelAnimationFrame(raf);
  raf = null;
}
window.addEventListener('resize', () => { if (stage === 'start') { sizeCanvas(); makeParticles(); } });

/* ---------- 2. VIDEO 1 -> PALM SCAN ---------- */
video1.addEventListener('ended', () => {
  transition(600, '#000', () => {
    resetPalm();
    goTo('scan');
  });
});

/* ---------- 3. PALM SCAN ---------- */
function setStatus(msg, type = '') {
  statusText.textContent = msg;
  statusText.className = 'status ' + type;
}

function setProgress(p) {
  const v = Math.min(100, Math.round(p));
  progressBar.style.width = v + '%';
  percentEl.textContent = v + '%';
}

function resetPalm() {
  clearInterval(scanTimer);
  palmBtn.disabled = false;
  palmBtn.classList.remove('scanning', 'success');
  setProgress(0);
  setStatus('Sila letakkan tapak tangan anda di atas pengimbas.');
}

function startScan() {
  if (palmBtn.classList.contains('scanning')) return;

  palmBtn.classList.remove('success');
  palmBtn.classList.add('scanning');
  palmBtn.disabled = true;
  setStatus('Mengimbas… Pastikan tapak tangan anda tidak bergerak.');

  const start = performance.now();
  scanTimer = setInterval(() => {
    const progress = ((performance.now() - start) / SCAN_DURATION) * 100;
    setProgress(progress);

    if (progress < 35)      setStatus('Mengimbas… Pastikan tapak tangan anda tidak bergerak.');
    else if (progress < 70) setStatus('Membaca corak urat tapak tangan…');
    else                    setStatus('Identiti disahkan…');

    if (progress >= 100) {
      clearInterval(scanTimer);
      onScanSuccess();
    }
  }, 50);
}

function onScanSuccess() {
  palmBtn.classList.remove('scanning');
  palmBtn.classList.add('success');
  setProgress(100);
  setStatus('Identiti disahkan ✔', 'ok');

  // short pause so the success state is visible, then go to video 2
  const t = token;
  setTimeout(() => {
    if (t !== token) return;
    transition(600, '#000', () => {
      goTo('video2');
      playVideo(video2);
    });
  }, 900);
}

palmBtn.addEventListener('click', startScan);

/* ---------- 4. VIDEO 2 -> BANNER (white fade) ---------- */
// start fading to white shortly before video 2 finishes
video2.addEventListener('timeupdate', () => {
  if (!fading && video2.duration && video2.duration - video2.currentTime <= FADE_SECONDS) {
    fading = true;
    fadeEl.style.transition = `opacity ${FADE_SECONDS}s ease`;
    fadeEl.style.background = '#fff';
    fadeEl.classList.add('show');
  }
});

// when video 2 ends: switch to the banner behind the white, then fade the white away
video2.addEventListener('ended', () => {
  fadeEl.style.background = '#fff';
  fadeEl.classList.add('show');
  video2.pause();
  goTo('banner');
  startTyping(TYPED_WORD);
  const t = token;
  setTimeout(() => {
    if (t !== token) return;
    fadeEl.classList.remove('show');
    fading = false;
  }, 300);
});

/* ---------- 5. BANNER (typing text) ---------- */
function startTyping(text) {
  clearInterval(typingTimer);
  typedEl.textContent = '';
  let i = 0;
  const t = token;
  // small delay so the banner appears first, then the text starts typing
  setTimeout(() => {
    if (t !== token) return;
    typingTimer = setInterval(() => {
      typedEl.textContent = text.slice(0, ++i);
      if (i >= text.length) clearInterval(typingTimer);
    }, TYPING_SPEED);
  }, 700);
}

/* ---------- RESET (back to the start screen) ---------- */
function resetAll() {
  token++;
  fading = false;
  fadeEl.classList.remove('show');
  clearInterval(typingTimer);
  clearInterval(scanTimer);
  typedEl.textContent = '';
  [video1, video2].forEach(v => { v.pause(); v.currentTime = 0; });
  screens.start.classList.remove('launching');
  resetPalm();
  goTo('start');
}

imgResetBtn.addEventListener('click', resetAll);
[video1, video2].forEach(v => v.addEventListener('dblclick', resetAll));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stage !== 'start') resetAll();
});

/* ---------- init ---------- */
goTo('start');
