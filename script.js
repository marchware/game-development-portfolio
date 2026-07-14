/* ══════════════════════════════════════════════════════════
   MARCHELINO PORTFOLIO — Image Sequence Engine v7
   Fixes: cursor always visible, scene6 footer timing,
          typing animation, all scene interactivity
══════════════════════════════════════════════════════════ */

// ── SCENE CONFIG ─────────────────────────────────────────
const SCENES = [
  { id:'s1', folder:'scene1new', prefix:'scene1-', frameCount:72,  pxPerFrame:18, holdPx:500, panelId:'pw-s1' },
  { id:'s2', folder:'scene2new', prefix:'scene2-', frameCount:55,  pxPerFrame:20, holdPx:480, panelId:'pw-s2' },
  { id:'s3', folder:'scene3new', prefix:'scene3-', frameCount:111, pxPerFrame:16, holdPx:480, panelId:'pw-s3' },
  { id:'s4', folder:'scene4new', prefix:'scene4-', frameCount:100, pxPerFrame:16, holdPx:480, panelId:'pw-s4' },
  { id:'s5', folder:'scene5new', prefix:'scene5-', frameCount:96,  pxPerFrame:16, holdPx:480, panelId:'pw-s5' },
  { id:'s6', folder:'scene6new', prefix:'scene6-', frameCount:85,  pxPerFrame:18, holdPx:300, panelId:null    },
];

SCENES.forEach(s => {
  s.videoScrollLen = s.frameCount * s.pxPerFrame;
  s.totalScrollLen = s.videoScrollLen + s.holdPx;
});

const INTRO_HEIGHT = window.innerHeight;

function computeZoneTops() {
  let cur = INTRO_HEIGHT;
  SCENES.forEach(s => { s.zoneTop = cur; cur += s.totalScrollLen; });
}
computeZoneTops();

function totalScrollHeight() {
  return INTRO_HEIGHT + SCENES.reduce((a,s) => a + s.totalScrollLen, 0);
}

// ── DOM ──────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const loadScreen = $('loading-screen');
const ldFill     = $('ld-fill');
const ldPct      = $('ld-pct');
const ldStatus   = $('ld-status');
const introWrap  = $('intro-video-wrap');
const introVid   = $('vid-intro');
const canvas     = $('seq-canvas');
const ctx        = canvas.getContext('2d');
const scrollHint = $('scroll-hint');
const footer     = $('site-footer');
const scrollDrv  = $('scroll-driver');
const zoneIntro  = $('zone-intro');
const cursorDot  = $('cursor-dot');
const cursorRing = $('cursor-ring');

// ── DRAW ─────────────────────────────────────────────────
let lastScene    = null;
let lastFrameIdx = 0;
let lastFrame    = -1;

function drawFrame(sceneId, frameIndex) {
  const s = SCENES.find(sc => sc.id === sceneId);
  if (!s) return;
  frameIndex = Math.max(0, Math.min(s.frameCount - 1, frameIndex));
  lastScene    = sceneId;
  lastFrameIdx = frameIndex;

  let img = images[sceneId][frameIndex];
  if (!img || !img.complete || !img.naturalWidth) {
    for (let d = 1; d < 10; d++) {
      const fb = images[sceneId][Math.max(0, frameIndex - d)];
      if (fb && fb.complete && fb.naturalWidth) { img = fb; break; }
    }
  }
  if (!img || !img.naturalWidth) return;
  if (lastFrame === frameIndex && lastScene === sceneId) return;
  lastFrame = frameIndex;

  const cw = canvas.width, ch = canvas.height;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(cw/iw, ch/ih);
  const dw = iw*scale, dh = ih*scale;
  ctx.clearRect(0,0,cw,ch);
  ctx.drawImage(img, (cw-dw)/2, (ch-dh)/2, dw, dh);
}

// ── CANVAS ───────────────────────────────────────────────
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  if (lastScene) { lastFrame = -1; drawFrame(lastScene, lastFrameIdx); }
}
resizeCanvas();
window.addEventListener('resize', () => { computeZoneTops(); setDriverHeight(); resizeCanvas(); });

function setDriverHeight() {
  scrollDrv.style.height   = totalScrollHeight() + 'px';
  zoneIntro.style.height   = INTRO_HEIGHT + 'px';
}
setDriverHeight();

// ── IMAGE STORE ──────────────────────────────────────────
const images = {};
SCENES.forEach(s => { images[s.id] = new Array(s.frameCount); });

// ── PANEL STATE ──────────────────────────────────────────
const panelState = {};
SCENES.forEach(s => { if (s.panelId) panelState[s.id] = 'hidden'; });
let s1AnimDone = false;
let s2AnimDone = false;
let s3AnimDone = false;
let s4AnimDone = false;
let s5AnimDone = false;

function showPanel(id) {
  const s = SCENES.find(sc => sc.id === id);
  if (!s?.panelId || panelState[id] === 'visible') return;
  panelState[id] = 'visible';
  const el = $(s.panelId);
  if (!el) return;
  el.classList.remove('panel-exit');
  void el.offsetWidth;
  el.classList.add('panel-visible');
  if (id === 's1' && !s1AnimDone) {
    initTypingLoopEffect(document.querySelector('#s1-code'), "print(\"hello!\")", 2000); 
    initScene1Animations();
    s1AnimDone = true; 
  }
  if (id === 's2' && !s2AnimDone) {
    initScene2Animations();
    s2AnimDone = true; // Tandai sudah selesai
  }
  if (id === 's3' && !s3AnimDone) {
    initScene3Animations(); 
    s3AnimDone = true;
  }
  if (id === 's4' && !s4AnimDone) {
    initScene4Animations();
    s4AnimDone = true;
  }
    if (id === 's5' && !s5AnimDone) {
    initScene5Animations();
    s5AnimDone = true;
  }
}

function hidePanel(id) {
  const s = SCENES.find(sc => sc.id === id);
  if (!s?.panelId || panelState[id] === 'hidden') return;
  panelState[id] = 'hidden';
  const el = $(s.panelId);
  if (!el) return;
  el.classList.remove('panel-visible');
  el.classList.add('panel-exit');
  setTimeout(() => el?.classList.remove('panel-exit'), 400);
}

function hideAllPanels() { SCENES.forEach(s => hidePanel(s.id)); }

// ── SCROLL ───────────────────────────────────────────────
let seqActive   = false;
let hasScrolled = false;
let rafPending  = false;

window.addEventListener('scroll', () => {
  if (!rafPending) { rafPending = true; requestAnimationFrame(onScroll); }
}, { passive: true });



function onScroll() {
  rafPending = false;
  const sy = window.scrollY;

  if (!hasScrolled && sy > 2) {
    hasScrolled = true;
    scrollHint.classList.add('hidden');
    activateSequence();
  }

  if (sy < INTRO_HEIGHT * 0.3) {
    if (seqActive) deactivateSequence();
    return;
  }
  if (!seqActive) activateSequence();

  // Find active scene
  let activeScene = null, scrollInZone = 0;
  for (let i = 0; i < SCENES.length; i++) {
    const s = SCENES[i];
    const bot = s.zoneTop + s.totalScrollLen;
    if (sy >= s.zoneTop && sy < bot) { activeScene = s; scrollInZone = sy - s.zoneTop; break; }
    if (i === SCENES.length-1 && sy >= bot) { activeScene = s; scrollInZone = s.totalScrollLen; }
  }
  if (!activeScene) return;

  // Draw frame
  const clamped    = Math.min(scrollInZone, activeScene.videoScrollLen);
  const frameIndex = Math.floor(clamped / activeScene.pxPerFrame);
  drawFrame(activeScene.id, frameIndex);

  // Panels
  const inHold = activeScene.holdPx > 0 && scrollInZone >= activeScene.videoScrollLen;
  SCENES.forEach(s => { if (s.id !== activeScene.id) hidePanel(s.id); });
  if (inHold) showPanel(activeScene.id);
  else        hidePanel(activeScene.id);

  revealFooter();
}

function activateSequence() {
  if (seqActive) return;
  seqActive = true;
  drawFrame('s1', 0);
  canvas.classList.add('visible');
  setTimeout(() => introWrap.classList.add('hidden'), 60);
}

function deactivateSequence() {
  if (!seqActive) return;
  seqActive = false;
  canvas.classList.remove('visible');
  introWrap.classList.remove('hidden');
  hideAllPanels();
  s1AnimDone = false; // reset so typing plays again if they scroll back
}

// ── FOOTER REVEAL ────────────────────────────────────────
const revealedF = new Set();
function revealFooter() {
  const scrollPosition = window.scrollY + window.innerHeight;
  const pageHeight = document.documentElement.scrollHeight;

  // Jika jarak ke bawah tinggal 100px lagi, munculkan footer
  if (pageHeight - scrollPosition < 100) {
    footer.style.opacity = "1";
    footer.querySelectorAll('.reveal-f').forEach(el => {
      el.classList.add('visible');
    });
  } else {
    // Sembunyikan jika user scroll ke atas lagi
    footer.style.opacity = "0";
    footer.querySelectorAll('.reveal-f').forEach(el => {
      el.classList.remove('visible');
    });
  }
}

// ── TYPING ANIMATION (Scene 1) ───────────────────────────
/* --- DI SCRIPT.JS --- */

function initScene1Animations() {
  const headingText = document.querySelector('.s1-heading');
  const photos = document.querySelectorAll('#pw-s1 .anim-photo');
  
  // 1. Kunci scroll saat animasi dimulai
  document.body.classList.add('stop-scrolling');

  const tl = gsap.timeline({
    // 2. Buka kunci scroll HANYA setelah semua animasi di timeline ini selesai
    onComplete: () => {
      document.body.classList.remove('stop-scrolling');
    }
  });
  
  // Animasi Teks
  tl.fromTo(headingText, {opacity: 0, y: 20}, {
    opacity: 1, 
    y: 0, 
    duration: 0.8, 
    ease: "power3.out"
  })
  // Animasi Foto (Staggered)
  .fromTo(photos, {opacity: 0, scale: 0.8, y: 30}, {
    opacity: 1, 
    scale: 1,
    y: 0, 
    duration: 0.8, 
    stagger: 0.3, // Kita lambatin dikit staggernya biar user beneran nunggu
    ease: "back.out(1.7)"
  }, "-=0.4");
}

// --- FUNGSI HELPER TYPING EFFECT LOOP ---
function initTypingLoopEffect(target, text, loopDelay) {
  if (!target) return;
  
  let charIndex = 0;
  let isDeleting = false;

  function type() {
    // Gunakan substring tapi pastikan jika kosong tetap ada spasi kosong agar layout tak geser
    let currentText = isDeleting ? text.substring(0, charIndex--) : text.substring(0, charIndex++);
    
    // Gunakan textContent untuk keamanan, lalu tambahkan caret manual jika mau
    target.textContent = currentText || " "; // Jika kosong, beri spasi tipis

    if (!isDeleting && charIndex > text.length) {
      isDeleting = true;
      setTimeout(type, loopDelay); 
    } else if (isDeleting && charIndex < 0) {
      isDeleting = false;
      charIndex = 0;
      setTimeout(type, 500); 
    } else {
      let nextSpeed = isDeleting ? 40 : 100;
      setTimeout(type, nextSpeed);
    }
  }
  type();
}

// ── SCENE 2 ─────────────────────────────

function initScene2Animations() {
  const thumbs = document.querySelectorAll('#pw-s2 .s2-thumb');
  
  if (thumbs.length === 0) return;

  // 1. Kunci scroll saat animasi dimulai (pakai class yang sama dari Scene 1)
  document.body.classList.add('stop-scrolling');

  // 2. Buat Timeline GSAP
  const tl = gsap.timeline({
    // Buka kunci scroll SETELAH gambar ke-6 selesai muncul
    onComplete: () => {
      document.body.classList.remove('stop-scrolling');
    }
  });
  
  // 3. Animasi Pop Out Staggered
  tl.fromTo(thumbs, 
    { 
      opacity: 0, 
      scale: 0.3,              // Mulai dari sangat kecil (buat efek 'pop')
      y: 30                    /* Sedikit turun biar ada gerakan naik */
    }, 
    {
      opacity: 1, 
      scale: 1,                // Kembali ke ukuran asli
      y: 0, 
      duration: 0.6,           // Durasi pop per gambar
      stagger: 0.15,           // Jarak waktu antar gambar (satu per satu)
      ease: "back.out(1.8)",   /* Efek mantul (elastic) di akhir pop */
      delay: 0.2               // Sedikit delay setelah scene muncul
    }
  );
}

// ── SCENE 3 — Photo carousel ─────────────────────────────
let s3Index = 0;
const S3_TITLES = ['Spirit Feast Battle','Pet Obby!'];
const S3_TOTAL  = 2;

function initScene3() {
  const slides  = document.querySelectorAll('.s3-slide');
  const counter = $('s3-counter');
  const titleEl = $('s3-proj-title');
  const prev    = $('s3-prev');
  const next    = $('s3-next');
  if (!prev || !next) return;

  function goTo(idx) {
    slides[s3Index]?.classList.remove('active');
    s3Index = (idx + S3_TOTAL) % S3_TOTAL;
    slides[s3Index]?.classList.add('active');
    if (counter) counter.textContent = `${s3Index+1}/${S3_TOTAL}`;
    if (titleEl) titleEl.textContent  = S3_TITLES[s3Index] || 'Project\'s Title';
  }
  prev.addEventListener('click', () => { animatePop(prev); goTo(s3Index - 1); });
  next.addEventListener('click', () => { animatePop(next); goTo(s3Index + 1); });
}

function initScene3Animations() {
  const leftSide = document.querySelector('#pw-s3 .s3-left');
  const textSide = document.querySelector('#pw-s3 .s3-text');

  if (!leftSide || !textSide) return;

  // 1. Kunci scroll
  document.body.classList.add('stop-scrolling');

  const tl = gsap.timeline({
    onComplete: () => {
      document.body.classList.remove('stop-scrolling');
    }
  });

  // 2. Animasi masuk (Slide in & Fade)
  tl.fromTo(leftSide, 
    { opacity: 0, x: -50 }, 
    { opacity: 1, x: 0, duration: 1, ease: "power3.out" }
  )
  .fromTo(textSide, 
    { opacity: 0, x: 50 }, 
    { opacity: 1, x: 0, duration: 1, ease: "power3.out" }, 
    "-=0.6" // Mulai lebih awal biar smooth
  );
}

// ── SCENE 4 — Mastering Engine ──────────────────────────

function initScene4Animations() {
    // 1. Kunci scroll
    document.body.classList.add('stop-scrolling');

    const tl = gsap.timeline({
        onComplete: () => {
            document.body.classList.remove('stop-scrolling');
            // 2. Trigger Autoplay setelah animasi panel selesai
            playScene4Videos(); 
        }
    });

    tl.fromTo("#pw-s4 .s4-vid-block", 
        { opacity: 0, y: 60, scale: 0.9 }, 
        { opacity: 1, y: 0, scale: 1, duration: 1.2, stagger: 0.3, ease: "power4.out" }
    )
    .fromTo("#pw-s4 .s4-text", 
        { opacity: 0, y: 30 }, 
        { opacity: 1, y: 0, duration: 1 }, 
        "-=0.7"
    );
}

// Fungsi bantu untuk Autoplay
function playScene4Videos() {
    const videos = document.querySelectorAll('#pw-s4 video');
    videos.forEach(vid => {
        vid.play().then(() => {
            // Update icon tombol jadi Pause karena video jalan
            const btn = document.querySelector(`[data-vid="${vid.id}"]`);
            if (btn) {
                btn.querySelector('.ic-play').classList.add('hidden');
                btn.querySelector('.ic-pause').classList.remove('hidden');
            }
        }).catch(e => console.log("Autoplay blocked:", e));
    });
}

// Fungsi Global Listener (Panggil di init awal)
function initScene4() {
    const buttons = document.querySelectorAll('.vid-ctrl-btn');
    
    buttons.forEach(btn => {
        // Cek apakah mouse masuk area tombol
        btn.onmouseenter = () => console.log("Mouse di atas tombol:", btn.dataset.vid);

        btn.onclick = function(e) {
            const vidId = this.getAttribute('data-vid');
            const vid = document.getElementById(vidId);
            
            if (vid) {
                if (vid.paused) {
                    vid.play();
                    this.querySelector('.ic-play').classList.add('hidden');
                    this.querySelector('.ic-pause').classList.remove('hidden');
                } else {
                    vid.pause();
                    this.querySelector('.ic-play').classList.remove('hidden');
                    this.querySelector('.ic-pause').classList.add('hidden');
                }
            }
        };
    });
}

// ── SCENE 5 — 16:9 video carousel with play/pause ────────
let s5Index = 0; 
const S5_TOTAL = 6;
const S5_TITLES = [
  "Spirit Feast Battle",
  "Pet Obby",
  "Zombie Chase",
  "Mount Putri",
  "Roadshop Keeper",
  "Ultimate Troll Tower"
];

function initScene5Animations() {
  document.body.classList.add('stop-scrolling');
  const tl = gsap.timeline({ onComplete: () => document.body.classList.remove('stop-scrolling') });
    tl.fromTo("#pw-s5 .s5-text", 
        { opacity: 0, x: -50 }, 
        { opacity: 1, x: 0, duration: 1, ease: "power3.out" }
    )
    .fromTo("#pw-s5 .s5-vid-area", 
        { opacity: 0, x: 50 }, 
        { opacity: 1, x: 0, duration: 1, ease: "power3.out" }, 
        "-=0.6"
    );
}

function initScene5() {
  const slides  = document.querySelectorAll('#s5-slides .s5-vslide');
  const counter = document.getElementById('s5-counter');
  const label   = document.getElementById('s5-proj-label');
  const prev    = document.getElementById('s5-prev');
  const next    = document.getElementById('s5-next');
  if (!prev || !next || !slides.length) return;

  // Update label awal
  if (label) label.textContent = S5_TITLES[0];
  if (counter) counter.textContent = `1/${S5_TOTAL}`;

  function goTo(idx) {
    slides[s5Index]?.classList.remove('active');
    s5Index = (idx + S5_TOTAL) % S5_TOTAL;
    slides[s5Index]?.classList.add('active');
    if (counter) counter.textContent = `${s5Index + 1}/${S5_TOTAL}`;
    if (label)   label.textContent   = S5_TITLES[s5Index] || `Project ${s5Index + 1}`;
  }

  prev.addEventListener('click', () => goTo(s5Index - 1));
  next.addEventListener('click', () => goTo(s5Index + 1));
}

// Pop button animation helper
function animatePop(btn) {
  btn.classList.remove('pop-anim');
  void btn.offsetWidth;
  btn.classList.add('pop-anim');
  setTimeout(() => btn.classList.remove('pop-anim'), 300);
}

// ── CURSOR ───────────────────────────────────────────────
// Use direct mouse coords for the dot (no lag), smooth ring separately
let mx = 0, my = 0, rx = 0, ry = 0;
document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  // Dot follows instantly
  if (cursorDot) {
    cursorDot.style.left = mx + 'px';
    cursorDot.style.top  = my + 'px';
  }
});

;(function ringLoop() {
  rx += (mx - rx) * 0.13;
  ry += (my - ry) * 0.13;
  if (cursorRing) {
    cursorRing.style.left = rx + 'px';
    cursorRing.style.top  = ry + 'px';
  }
  requestAnimationFrame(ringLoop);
})();

document.querySelectorAll('a,button,.cta-btn,.soc-pill,.s3-arrow,.s5-arrow-btn,.vid-ctrl-btn,.s5-play-btn').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
});

// ── NAVIGATION ───────────────────────────────────────────
document.querySelectorAll('.cta-btn[data-page]').forEach(btn => {
  btn.addEventListener('click', () => {
    const map = { work:'work.html', skills:'skills.html', contact:'contact.html' };
    const url = map[btn.dataset.page];
    if (url) window.location.href = url;
  });
});

// ── PRELOAD ──────────────────────────────────────────────
function preloadAll(onProgress) {
  return new Promise(resolve => {
    const total = SCENES.reduce((a,s) => a + s.frameCount, 0);
    let loaded  = 0;

    function loadOne(sceneId, fi) {
      return new Promise(res => {
        const s   = SCENES.find(sc => sc.id === sceneId);
        const img = new Image();
        img.onload = img.onerror = () => {
          loaded++;
          onProgress(loaded, total, sceneId, fi+1);
          res();
        };
        img.src = `public/${s.folder}/${s.prefix}${fi+1}.jpg`;
        images[sceneId][fi] = img;
      });
    }

    async function run() {
      // Scene 1 first (sequential, so it's ready instantly)
      for (let i = 0; i < SCENES[0].frameCount; i++) await loadOne(SCENES[0].id, i);
      // Rest concurrently
      const rest = [];
      for (let si = 1; si < SCENES.length; si++)
        for (let i = 0; i < SCENES[si].frameCount; i++)
          rest.push(loadOne(SCENES[si].id, i));
      await Promise.all(rest);
      resolve();
    }
    run();
  });
}

// ── SKIP BUTTON LOGIC ─────────────────────────────────────
function injectSkipButton() {
  const btnContainer = document.createElement('div');
  btnContainer.id = 'skip-container';
  btnContainer.innerHTML = `
    <button id="skip-btn">
      <span id="skip-label">Skip in <span id="skip-countdown">5</span>s</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="13,5 20,12 13,19"/><polyline points="5,5 12,12 5,19"/>
      </svg>
    </button>
    <span class="skip-note">Recommended to let it load for the best experience</span>
  `;
  document.getElementById('loading-screen').appendChild(btnContainer);

  const btn = btnContainer.querySelector('#skip-btn');
  let secondsLeft = 5;
  const countdownEl = btnContainer.querySelector('#skip-countdown');
  const labelEl     = btnContainer.querySelector('#skip-label');

  const timer = setInterval(() => {
    secondsLeft--;
    if (secondsLeft > 0) {
      countdownEl.textContent = secondsLeft;
    } else {
      clearInterval(timer);
      labelEl.textContent = 'Skip Anyway';
      btn.classList.add('skip-ready');
      btn.addEventListener('click', () => {
        skipLoading();
      });
    }
  }, 1000);

  return btn;
}

function skipLoading() {
  // Tandai bahwa preload boleh berhenti / loading screen langsung tutup
  loadScreen.classList.add('hidden');
  // Draw frame pertama agar canvas langsung siap
  drawFrame('s1', 0);
}

// ── INIT ─────────────────────────────────────────────────
async function init() {
  setDriverHeight();
  introVid.play().catch(() => {});
  initScene3();
  initScene4();
  initScene5();

  // Inject skip button (mulai hitung mundur dari awal)
  injectSkipButton();

  let lastSt = '';
  let skipTriggered = false;

  // Wrap preload agar bisa diinterrupt jika skip ditekan
  const preloadPromise = preloadAll((loaded, total, sceneId, frameNum) => {
    if (loadScreen.classList.contains('hidden')) {
      skipTriggered = true;
      return; // stop updating UI kalau sudah skip
    }
    const pct = Math.round((loaded / total) * 100);
    if (ldFill) ldFill.style.width = pct + '%';
    if (ldPct)  ldPct.textContent  = pct + '%';
    const st = `Loading ${sceneId.toUpperCase()} · frame ${frameNum}`;
    if (ldStatus && st !== lastSt) { ldStatus.textContent = st; lastSt = st; }
  });

  await preloadPromise;

  // Kalau user tidak skip, tutup loading screen normal
  if (!loadScreen.classList.contains('hidden')) {
    if (ldFill)   ldFill.style.width   = '100%';
    if (ldPct)    ldPct.textContent    = '100%';
    if (ldStatus) ldStatus.textContent = 'Ready';

    await new Promise(r => setTimeout(r, 600));
    loadScreen.classList.add('hidden');
  }

  drawFrame('s1', 0);
}

init();
