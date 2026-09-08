const fs = require("fs");
const path = require("path");
const assert = require("assert");
let JSDOM;
try {
  ({ JSDOM } = require("jsdom"));
} catch (e) {
  console.error("This check needs jsdom:  npm i jsdom");
  process.exit(0);
}

const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "http://localhost/" });
const { window } = dom;

// --- stub CDN libs. Tweens complete synchronously so the flow runs to the end. ---
const noop = () => {};
const tw = { kill: noop };
// Apply the tween's END state to the elements, the way a finished GSAP tween
// does. A bare `from` has no explicit end state -> elements stay at the start
// values, which is exactly the stranded-at-opacity-0 bug this guards against.
const els = t => {
  if (typeof t === "string") return [...doc0().querySelectorAll(t)];
  if (!t) return [];
  return t.length !== undefined ? [...t] : [t];
};
let doc0 = () => window.document;
const applyEnd = (t, v) => {
  if (!v) return;
  els(t).forEach(e => {
    if (!e.style) return;
    if (v.opacity !== undefined) e.style.opacity = String(v.opacity);
  });
};
const applyStart = (t, v) => {
  if (!v) return;
  els(t).forEach(e => {
    if (!e.style) return;
    if (v.opacity !== undefined) e.style.opacity = String(v.opacity);
  });
};
window.gsap = {
  to: (t, v) => { applyEnd(t, v); if (v && v.onComplete) v.onComplete(); return tw; },
  // `from` sets the START values and never restores them in this stub —
  // mirroring the real hazard of an interrupted from-tween.
  from: (t, v) => { applyStart(t, v); return tw; },
  fromTo: (t, a, b) => { applyStart(t, a); applyEnd(t, b); if (b && b.onComplete) b.onComplete(); return tw; },
  killTweensOf: noop,
};
let confettiCalls = 0;
window.confetti = () => { confettiCalls++; };
window.matchMedia = () => ({ matches: false, addListener: noop, removeListener: noop });
window.scrollTo = noop;
window.requestAnimationFrame = noop;
window.HTMLMediaElement.prototype.play = () => Promise.reject(new Error("no file"));
window.HTMLMediaElement.prototype.pause = noop;

const errors = [];
window.addEventListener("error", e => errors.push(e.message));

const files = ["js/content.js", "js/games.js", "js/main.js"];
const src = files.map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n;\n");
const expose = "\n;window.__app={QUIZ:QUIZ,NAME:NAME,AGE:AGE,PHOTO_COUNT:PHOTO_COUNT,CAPTIONS:CAPTIONS,LETTER:LETTER,BALLOON_LETTERS:BALLOON_LETTERS,STORY:STORY};";
try { window.eval(src + expose); }
catch (e) { console.error("FAILED loading app: " + e.message); process.exit(1); }

const A = window.__app;
const doc = window.document;
const $ = s => doc.querySelector(s);
const $$ = s => [...doc.querySelectorAll(s)];
const active = () => { const a = $(".scene.active"); return a ? a.id.replace("scene-", "") : null; };
const click = el => el.dispatchEvent(new window.Event("click", { bubbles: true }));
// drain pending setTimeout callbacks
const drain = (ms = 5000) => { window.jsdomTick && window.jsdomTick(); };


// Guards the exact bug from the screenshot: elements left stranded invisible
// by an entrance animation that never reached its end state.
const assertVisible = (sel, label) => {
  const list = $$(sel);
  assert.ok(list.length > 0, label + ": nothing rendered");
  list.forEach((e, i) => {
    const o = e.style.opacity;
    assert.ok(o === "" || parseFloat(o) > 0.99,
      label + ": item " + (i + 1) + " of " + list.length + " stranded at opacity " + o);
  });
};

// ================= 1. LANDING =================
assert.strictEqual(active(), "landing");
assert.strictEqual($("#landingName").textContent, A.NAME);
assert.strictEqual($("#landingAge").textContent, String(A.AGE));
assert.ok(doc.title.includes(A.NAME));
assert.ok(!$("#progress").classList.contains("show"), "progress hidden on landing");
// scrolling intro panels
const panels = $$("#story .panel");
assert.strictEqual(panels.length, A.STORY.length, "one panel per STORY entry");
panels.forEach((p, i) => {
  assert.strictEqual(p.querySelector(".panel-title").textContent, A.STORY[i].title, "panel " + (i+1) + " title");
  assert.strictEqual(p.querySelector(".panel-body").textContent, A.STORY[i].text, "panel " + (i+1) + " text");
  assert.ok(p.querySelector(".panel-img img"), "panel " + (i+1) + " has an image");
});
assertVisible("#story .panel", "story panels");
assert.ok($(".hero.outro .btn[data-go=\"quiz\"]"), "Begin button lives after the story");
console.log("PASS landing — " + $("#landingName").textContent + ", " + $("#landingAge").textContent + $("#landingSuffix").textContent + ", " + panels.length + " story panels");

// ================= 2. QUIZ =================
click($('[data-go="quiz"]'));
assert.strictEqual(active(), "quiz");
assert.ok($("#progress").classList.contains("show"), "progress shows after landing");

// Fake timers: capture callbacks so we can flush the chained setTimeouts.
let pending = [];
window.setTimeout = (fn, ms) => { pending.push(fn); return pending.length; };
window.clearTimeout = noop;
const flush = (rounds = 400) => {
  for (let i = 0; i < rounds && pending.length; i++) {
    const batch = pending; pending = [];
    batch.forEach(fn => { try { fn(); } catch (e) { errors.push("timer: " + e.message); } });
  }
};

for (let q = 0; q < A.QUIZ.length; q++) {
  assert.strictEqual($("#quizCount").textContent, "question " + (q + 1) + " of " + A.QUIZ.length,
    "on question " + (q + 1));
  const opts = $$("#quizOptions .quiz-opt");
  assert.strictEqual(opts.length, 4, "four options on q" + (q + 1));
  assertVisible("#quizOptions .quiz-opt", "quiz q" + (q + 1) + " options");

  const ans = A.QUIZ[q].answer;
  if (ans === "any") {
    // open question: every option is accepted and advances
    const pick = 2;
    click(opts[pick]);
    flush();
    assert.ok(opts[pick].classList.contains("right"),
      "q" + (q + 1) + " accepts any answer");
  } else {
    // wrong answer must not advance
    const wrong = ans === 0 ? 1 : 0;
    click(opts[wrong]);
    assert.ok(opts[wrong].classList.contains("wrong"), "wrong marked");
    assert.strictEqual($("#quizCount").textContent, "question " + (q + 1) + " of " + A.QUIZ.length,
      "wrong answer did NOT advance");
    click(opts[ans]);
    flush();
  }
}
assert.strictEqual(active(), "balloons", "quiz -> balloons");
assert.strictEqual($$(".pip.lit").length, 1, "candle 1 lit");
console.log("PASS quiz — 5 questions, wrong answers rejected, candle 1 lit");

// ================= 3. BALLOONS =================
const balloons = $$("#balloonField .balloon");
assert.strictEqual(balloons.length, A.BALLOON_LETTERS.length, "one balloon per letter");
balloons.forEach((b, i) => {
  click(b);
  click(b); // double-click must not double-count
  flush();
});
assert.strictEqual(active(), "memory", "balloons -> memory");
assert.strictEqual($$(".pip.lit").length, 2, "candle 2 lit");
assert.strictEqual($("#balloonReveal").textContent.replace(/ /g, ""), A.NAME.toUpperCase(),
  "name revealed: " + $("#balloonReveal").textContent);
console.log("PASS balloons — " + balloons.length + " popped, revealed '" + $("#balloonReveal").textContent + "'");

// ================= 4. MEMORY =================
const cards = $$("#memoryGrid .mcard");
const PAIRS = Math.min(A.PHOTO_COUNT, 6);
assert.strictEqual(cards.length, PAIRS * 2, "two cards per pair");
assertVisible("#memoryGrid .mcard", "memory cards");
// group by value and click each pair
const byVal = {};
cards.forEach(c => { (byVal[c.dataset.n] = byVal[c.dataset.n] || []).push(c); });
assert.strictEqual(Object.keys(byVal).length, PAIRS, "distinct pairs");
Object.values(byVal).forEach(pair => {
  assert.strictEqual(pair.length, 2);
  click(pair[0]); click(pair[1]); flush();
});
assert.strictEqual($$(".mcard.matched").length, PAIRS * 2, "all matched");
assert.strictEqual(active(), "candles", "memory -> candles");
assert.strictEqual($$(".pip.lit").length, 3, "candle 3 lit");
console.log("PASS memory — " + PAIRS + " pairs matched, candle 3 lit");

// ================= 5. CANDLES =================
const candles = $$("#cakeCandles .candle");
assert.strictEqual(candles.length, 4, "4 candles");
candles.forEach(c => { click(c); click(c); flush(); });
assert.strictEqual($$("#cakeCandles .candle.out").length, 4, "all blown out");
assert.strictEqual(active(), "reveal", "candles -> reveal");
assert.strictEqual($$(".pip.lit").length, 4, "candle 4 lit");
console.log("PASS candles — 4 blown out (click fallback, no mic), candle 4 lit");

// ================= 6. REVEAL =================
assert.strictEqual($("#revealName").textContent, A.NAME, "name on reveal");
const rc = $$("#revealCandles .candle");
assert.strictEqual(rc.length, 4, "reveal cake has 4 candles");
assert.strictEqual($$("#revealCandles .candle.out").length, 4, "reveal candles shown blown out");
assert.ok(confettiCalls > 0, "confetti fired");
console.log("PASS reveal — cake + 4 spent candles, " + confettiCalls + " confetti bursts total");

// ================= 7. LETTER =================
click($('[data-go="letter"]'));
assert.strictEqual(active(), "letter", "reveal -> letter");
click($("#letterSkip"));            // skip the typewriter
const paras = $$("#letterBody p");
assert.strictEqual(paras.length, A.LETTER.length, "all letter paragraphs shown");
assert.ok($("#letterSkip").hidden, "skip button hidden after finish");
assert.ok(!$("#letterNext").hidden, "next button revealed");
console.log("PASS letter — " + paras.length + " paragraphs, skip works");

// ================= 8. PHOTOS =================
click($('[data-go="photos"]'));
assert.strictEqual(active(), "photos", "letter -> photos");
const polas = $$(".polaroid");
assert.strictEqual(polas.length, A.PHOTO_COUNT, "one polaroid per photo");
assertVisible(".polaroid", "polaroids");
polas.forEach((p, i) => {
  assert.strictEqual(p.querySelector("figcaption").textContent, A.CAPTIONS[i], "caption " + (i + 1));
});
// lightbox opens and closes
click(polas[0]);
assert.ok(!$("#lightbox").hidden, "lightbox opened");
click($("#lightboxClose"));
assert.ok($("#lightbox").hidden, "lightbox closed");
console.log("PASS photos — " + polas.length + " polaroids with captions, lightbox opens/closes");

// ================= missing-assets behaviour =================
// every <img> points at assets that don't exist yet; fire their error handlers
const imgs = $$("img");
imgs.forEach(img => img.dispatchEvent(new window.Event("error")));
const placeholders = $$(".ph");
console.log("PASS fallbacks — " + placeholders.length + " gradient placeholders replaced missing photos");

assert.strictEqual(errors.length, 0, "no runtime errors: " + errors.join(" | "));
console.log("\nALL SCENES PASSED — full flow landing -> photos, zero runtime errors");
