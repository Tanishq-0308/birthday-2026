/* Scene router + progress + audio + letter typewriter. */

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const D = REDUCED ? 0.01 : 1; // duration multiplier

/* Confetti and GSAP are decoration loaded from a CDN. If either fails to load
   (offline, blocked, bad wifi on the day) the site must still be completable,
   so everything goes through these guards instead of calling the globals raw. */
function boom(opts) {
  try { if (typeof confetti === "function") confetti(opts); } catch (e) {}
}
const hasGsap = typeof gsap !== "undefined";
// Minimal stand-in: jump straight to the end state and run any onComplete,
// so scene transitions still fire when GSAP is missing.
const anim = hasGsap ? gsap : {
  to: (t, v) => { if (v && v.onComplete) v.onComplete(); },
  from: () => {},
  fromTo: (t, a, b) => { if (b && b.onComplete) b.onComplete(); },
  killTweensOf: () => {},
};

/* ---------- scenes ---------- */
let current = null;

function showScene(id) {
  const next = document.getElementById(`scene-${id}`);
  if (!next || id === current) return;
  const prev = current && document.getElementById(`scene-${current}`);
  current = id;

  const enter = () => {
    next.classList.add("active");
    anim.fromTo(next, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .5 * D, ease: "power2.out" });
    scrollTo(0, 0);
    SETUP[id] && SETUP[id]();
  };

  // The landing is the only scrolling scene. Once we leave it, its
  // ScrollTriggers would keep measuring a hidden section — kill them.
  if (prev && prev.classList.contains("scrolly") && typeof ScrollTrigger !== "undefined") {
    ScrollTrigger.getAll().forEach(t => t.kill());
  }

  if (prev) {
    anim.to(prev, {
      opacity: 0, y: -14, duration: .35 * D, ease: "power2.in",
      onComplete: () => { prev.classList.remove("active"); enter(); },
    });
  } else {
    enter();
  }

  document.getElementById("progress").classList.toggle("show", id !== "landing");
}

/* ---------- candle progress ---------- */
let lit = 0;
function lightCandle() {
  const pip = document.querySelector(`.pip[data-pip="${lit}"]`);
  if (pip) {
    pip.classList.add("lit");
    anim.fromTo(pip, { scale: .6 }, { scale: 1, duration: .5 * D, ease: "back.out(3)" });
  }
  lit++;
  boom({ particleCount: 60, spread: 70, origin: { y: .3 }, colors: ["#F7C9C0", "#FFE3AE", "#C7D6C2", "#FFF"] });
}

// Each game wins → light a candle, move to the next scene.
function winThen(nextId) {
  return () => { lightCandle(); setTimeout(() => showScene(nextId), 600 * D); };
}

/* ---------- per-scene setup (runs once each) ---------- */
const done = {};
const SETUP = {
  quiz:     () => once("quiz",     () => initQuiz(winThen("balloons"))),
  balloons: () => once("balloons", () => initBalloons(winThen("memory"))),
  memory:   () => once("memory",   () => initMemory(winThen("candles"))),
  candles:  () => once("candles",  () => initCandles(winThen("reveal"))),
  reveal:   () => once("reveal",   bigMoment),
  letter:   () => once("letter",   typeLetter),
  photos:   () => once("photos",   buildWall),
};
function once(key, fn) { if (!done[key]) { done[key] = true; fn(); } }

/* ---------- scrolling intro ---------- */
function buildStory() {
  const host = document.getElementById("story");
  host.innerHTML = "";

  STORY.forEach((item, i) => {
    const panel = document.createElement("div");
    // `wide: true` in STORY lets a panel break out of the column width
    panel.className = item.wide ? "panel wide" : "panel";

    const figure = document.createElement("div");
    figure.className = "panel-img";
    const img = document.createElement("img");
    img.src = item.img;
    img.alt = item.title || "";
    img.loading = i > 1 ? "lazy" : "eager";
    withFallback(img, ["📷", "🌷", "☕", "🌙", "✨", "💛"][i % 6]);
    figure.appendChild(img);

    const text = document.createElement("div");
    text.className = "panel-text";
    text.innerHTML = `<h3 class="panel-title"></h3><p class="panel-body"></p>`;
    text.querySelector(".panel-title").textContent = item.title || "";
    text.querySelector(".panel-body").textContent = item.text || "";

    panel.append(figure, text);
    host.appendChild(panel);
  });

  animateStory(host);
}

function animateStory(host) {
  const panels = [...host.children];

  // Without ScrollTrigger (CDN blocked, or reduced motion) everything simply
  // stays visible — the intro still reads, it just doesn't animate.
  const canScrollAnimate =
    !REDUCED && hasGsap && typeof ScrollTrigger !== "undefined";
  if (!canScrollAnimate) return;

  gsap.registerPlugin(ScrollTrigger);

  panels.forEach(panel => {
    const figure = panel.querySelector(".panel-img");
    const img = panel.querySelector(".panel-img img, .panel-img .ph");
    const text = panel.querySelector(".panel-text");
    const flip = [...panel.parentNode.children].indexOf(panel) % 2 === 1;

    // photo and words drift in from opposite sides as the panel enters
    gsap.fromTo(figure,
      { opacity: 0, y: 60, scale: .95 },
      {
        opacity: 1, y: 0, scale: 1, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: panel, start: "top 82%", once: true },
      });

    gsap.fromTo(text,
      { opacity: 0, y: 40, x: flip ? 30 : -30 },
      {
        opacity: 1, y: 0, x: 0, duration: 1, ease: "power3.out", delay: .12,
        scrollTrigger: { trigger: panel, start: "top 82%", once: true },
      });

    // slow parallax on the image inside its frame
    if (img) {
      gsap.fromTo(img,
        { yPercent: -6 },
        {
          yPercent: 6, ease: "none",
          scrollTrigger: { trigger: panel, start: "top bottom", end: "bottom top", scrub: true },
        });
    }
  });

  // the closing hero fades up too
  const outro = document.querySelector(".hero.outro");
  if (outro) {
    gsap.fromTo(outro.children,
      { opacity: 0, y: 26 },
      {
        opacity: 1, y: 0, duration: .8, stagger: .12, ease: "power3.out",
        scrollTrigger: { trigger: outro, start: "top 80%", once: true },
      });
  }
}

/* ---------- the cake moment ---------- */
function bigMoment() {
  // carry the moment over: the same four candles, just blown out and smoking
  const holder = document.getElementById("revealCandles");
  holder.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const c = document.createElement("div");
    c.className = "candle out";
    c.innerHTML = `<div class="flame"></div><div class="smoke">💨</div><div class="stick"></div>`;
    holder.appendChild(c);
  }

  anim.fromTo("#cakeReveal",
    { scale: .7, opacity: 0, y: 30 },
    { scale: 1, opacity: 1, y: 0, duration: .9 * D, ease: "back.out(1.6)" });

  if (REDUCED) { boom({ particleCount: 120, spread: 90, origin: { y: .5 } }); return; }

  // a couple of cannons from the sides
  const palette = ["#F7C9C0", "#FFE3AE", "#C7D6C2", "#E89B8E", "#FFF"];
  boom({ particleCount: 130, spread: 80, origin: { y: .55 }, colors: palette });
  setTimeout(() => boom({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: .7 }, colors: palette }), 250);
  setTimeout(() => boom({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: .7 }, colors: palette }), 400);
}

/* ---------- letter typewriter ---------- */
let typing = null;
function typeLetter() {
  const body = document.getElementById("letterBody");
  const skip = document.getElementById("letterSkip");
  const next = document.getElementById("letterNext");
  body.innerHTML = "";

  const finish = () => {
    clearTimeout(typing);
    body.innerHTML = LETTER.map(p => `<p>${p}</p>`).join("");
    skip.hidden = true;
    next.hidden = false;
    anim.fromTo(next, { opacity: 0 }, { opacity: 1, duration: .4 * D });
  };
  skip.onclick = finish;

  if (REDUCED) { finish(); return; }

  let pi = 0, ci = 0, para = null;
  const caret = document.createElement("span");
  caret.className = "caret";

  (function tick() {
    if (pi >= LETTER.length) { caret.remove(); finish(); return; }
    if (ci === 0) {
      para = document.createElement("p");
      body.appendChild(para);
      body.appendChild(caret);
    }
    const text = LETTER[pi];
    para.textContent = text.slice(0, ++ci);
    body.appendChild(caret);

    if (ci >= text.length) { pi++; ci = 0; typing = setTimeout(tick, 520); }
    else typing = setTimeout(tick, 28);
  })();
}

/* ---------- polaroid wall ---------- */
function buildWall() {
  const wall = document.getElementById("polaroidWall");
  wall.innerHTML = "";
  const emojis = ["📸", "🌷", "☕", "🌙", "🧸", "🎈", "✨", "💛"];

  for (let n = 1; n <= PHOTO_COUNT; n++) {
    const fig = document.createElement("figure");
    fig.className = "polaroid";
    // Fixed alternating tilt rather than Math.random(): random lets two
    // neighbours land at the same angle, which reads as a mistake.
    const tilt = [-2.6, 1.8, -1.2, 2.4, -3.1, 1.4, -1.9, 2.8][(n - 1) % 8];
    fig.style.transform = `rotate(${tilt}deg)`;

    const img = document.createElement("img");
    img.src = photoSrc(n);
    img.alt = CAPTIONS[n - 1] || "";
    img.loading = "lazy";
    withFallback(img, emojis[(n - 1) % emojis.length]);

    const cap = document.createElement("figcaption");
    cap.textContent = CAPTIONS[n - 1] || "";

    fig.append(img, cap);
    fig.addEventListener("click", () => openLightbox(photoSrc(n), cap.textContent));
    wall.appendChild(fig);
  }

  // fromTo, not from: an interrupted `from` strands elements at opacity 0.
  // The polaroids keep their random CSS rotation, so only clear what we animated.
  anim.fromTo(wall.children,
    { opacity: 0, y: 26, scale: .94 },
    { opacity: 1, y: 0, scale: 1, duration: .5 * D, stagger: .07, ease: "back.out(1.4)" });
}

/* ---------- lightbox ---------- */
const lb = document.getElementById("lightbox");
const lbImg = document.getElementById("lightboxImg");
const lbCap = document.getElementById("lightboxCap");

function openLightbox(src, caption) {
  lbImg.src = src;
  lbCap.textContent = caption;
  lb.hidden = false;
}
function closeLightbox() { lb.hidden = true; lbImg.src = ""; }

document.getElementById("lightboxClose").onclick = closeLightbox;
lb.addEventListener("click", e => { if (e.target === lb) closeLightbox(); });
addEventListener("keydown", e => { if (e.key === "Escape" && !lb.hidden) closeLightbox(); });
// a missing photo shouldn't open an empty lightbox
lbImg.addEventListener("error", closeLightbox);

/* ---------- music ---------- */
const bgm = document.getElementById("bgm");
const musicBtn = document.getElementById("musicBtn");
musicBtn.classList.add("off");
const MUSIC_VOLUME = .35;   // full volume once faded in

// Ramp the volume instead of cutting in/out — a track snapping on at 35%
// is jarring when she's mid-scroll.
let fadeId = 0;
function fadeAudio(to, ms, done) {
  const from = bgm.volume;
  const start = performance.now();
  const id = ++fadeId;          // a newer fade cancels this one
  (function step(now) {
    if (id !== fadeId) return;
    const t = Math.min((now - start) / ms, 1);
    bgm.volume = from + (to - from) * t;
    if (t < 1) requestAnimationFrame(step);
    else if (done) done();
  })(start);
}

function startMusic() {
  bgm.volume = 0;
  return bgm.play().then(() => {
    musicBtn.classList.remove("off");
    fadeAudio(MUSIC_VOLUME, 1800);
  });
}

musicBtn.addEventListener("click", () => {
  if (bgm.paused) {
    startMusic().catch(() => musicBtn.classList.add("off"));
  } else {
    musicBtn.classList.add("off");
    fadeAudio(0, 600, () => bgm.pause());
  }
});

/* Autoplay. Browsers block audio until the page has been interacted with, so
   a bare play() on load fails silently. Try it anyway (it works if she's
   already interacted with the site once), and otherwise arm a one-shot
   listener that starts the track on her very first tap — which is the
   "Begin" button she presses regardless. She never has to find the ♪. */
const GESTURES = ["pointerdown", "keydown", "touchstart"];
function armAutoplay() {
  function kick() {
    // If she already started it herself via the ♪, just stand down.
    if (!bgm.paused) return disarm();
    startMusic().then(disarm).catch(() => {});  // still blocked: next gesture retries
  }
  function disarm() {
    GESTURES.forEach(e => document.removeEventListener(e, kick));
  }
  startMusic().catch(() => {
    GESTURES.forEach(e => document.addEventListener(e, kick, { passive: true }));
  });
}
armAutoplay();

/* ---------- drifting background ---------- */
function drift() {
  if (REDUCED) return;
  const host = document.getElementById("bgDrift");
  const glyphs = ["🎈", "♡", "✨", "🎈", "❁", "♡"];
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("span");
    s.textContent = glyphs[i % glyphs.length];
    s.style.left = `${Math.random() * 100}%`;
    host.appendChild(s);
    anim.to(s, {
      y: -(innerHeight + 200),
      x: `+=${Math.random() * 120 - 60}`,
      rotation: Math.random() * 90 - 45,
      duration: 16 + Math.random() * 14,
      repeat: -1,
      delay: Math.random() * 18,
      ease: "none",
    });
  }
}

/* ---------- boot ---------- */
document.getElementById("landingName").textContent = NAME;
document.getElementById("landingAge").textContent = AGE;
document.getElementById("landingSuffix").textContent =
  (AGE % 100 >= 11 && AGE % 100 <= 13) ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[AGE % 10] || "th");
document.getElementById("revealName").textContent = NAME;
document.getElementById("outroName").textContent = NAME;
document.title = `Happy Birthday, ${NAME} ♡`;

document.querySelectorAll("[data-go]").forEach(b => {
  b.addEventListener("click", () => showScene(b.dataset.go));
});

buildStory();
drift();
showScene("landing");
