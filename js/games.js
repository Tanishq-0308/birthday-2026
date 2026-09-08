/* Four small games. Each is init*(onWin) and calls onWin() once, when solved.
   None of them know about scene order — main.js wires that up. */

// Swap a broken <img> for a gradient placeholder, so the site looks intact
// before any photos are added to assets/.
function withFallback(img, emoji) {
  img.addEventListener("error", () => {
    const ph = document.createElement("div");
    ph.className = "ph";
    ph.textContent = emoji || "🎂";
    img.replaceWith(ph);
  }, { once: true });
  return img;
}

function photoSrc(n) {
  return `assets/photos/p${n}.jpg`;
}

/* ---------- 1. QUIZ ---------- */
function initQuiz(onWin) {
  const qEl = document.getElementById("quizQ");
  const optsEl = document.getElementById("quizOptions");
  const countEl = document.getElementById("quizCount");
  const noteEl = document.getElementById("quizNote");
  let i = 0;

  function render() {
    const item = QUIZ[i];
    countEl.textContent = `question ${i + 1} of ${QUIZ.length}`;
    qEl.textContent = item.q;
    noteEl.classList.remove("show");
    optsEl.innerHTML = "";

    item.options.forEach((text, idx) => {
      const b = document.createElement("button");
      b.className = "quiz-opt";
      b.textContent = text;
      b.addEventListener("click", () => choose(b, idx, item));
      optsEl.appendChild(b);
    });
    anim.killTweensOf(optsEl.children);
    anim.fromTo(optsEl.children,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: .3 * D, stagger: .05, clearProps: "transform" });
  }

  function choose(btn, idx, item) {
    // `answer: "any"` = there's no wrong answer (an opinion, not a fact).
    // Whatever she picks is accepted.
    if (item.answer !== "any" && idx !== item.answer) {
      // no fail state — nudge and let them try again
      btn.classList.add("wrong");
      btn.disabled = true;
      return;
    }
    btn.classList.add("right");
    [...optsEl.children].forEach(b => (b.disabled = true));
    const note = Array.isArray(item.note) ? item.note[idx] : item.note;
    if (note) {
      noteEl.textContent = note;
      noteEl.classList.add("show");
    }
    setTimeout(() => {
      i++;
      if (i < QUIZ.length) render();
      else onWin();
    }, note ? 1600 : 650);
  }

  render();
}

/* ---------- 2. BALLOON POP ---------- */
function initBalloons(onWin) {
  const field = document.getElementById("balloonField");
  const revealEl = document.getElementById("balloonReveal");
  const letters = BALLOON_LETTERS;
  const colors = ["#F7C9C0", "#FFE3AE", "#C7D6C2", "#F5C6D6", "#CFE0EF", "#F3D9B1", "#E8C7E0", "#D5E3C8"];

  field.innerHTML = "";
  revealEl.textContent = "";

  // one balloon per letter of her name
  const slots = letters.length;
  const revealed = new Array(slots).fill(null);
  let popped = 0;

  letters.forEach((letter, idx) => {
    const b = document.createElement("div");
    b.className = "balloon";
    b.innerHTML = `<div class="balloon-body" style="background:${colors[idx % colors.length]}"></div><div class="balloon-string"></div>`;

    // spread across the field, staggered vertically so they don't overlap
    const cols = Math.min(slots, 4);
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    // Centering is done with margins, not translate(-50%,-50%): GSAP animates
    // `y` on the same transform property and would wipe the centering out.
    b.style.left = `${(col + .5) * (100 / cols)}%`;
    b.style.top = `${12 + row * 42}%`;

    // gentle bob
    anim.to(b, {
      y: "+=14",
      duration: 1.8 + Math.random() * 1.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: Math.random(),
    });

    b.addEventListener("click", () => {
      if (b.dataset.popped) return;
      b.dataset.popped = "1";
      popped++;
      revealed[idx] = letter;
      revealEl.textContent = revealed.map(c => c || "·").join(" ");

      const r = b.getBoundingClientRect();
      boom({
        particleCount: 26,
        spread: 55,
        scalar: .7,
        origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight },
        colors: [colors[idx % colors.length], "#FFF", "#FFE3AE"],
      });

      anim.killTweensOf(b);
      anim.to(b, {
        scale: 1.35, opacity: 0, duration: .28, ease: "power2.out",
        onComplete: () => {
          b.style.visibility = "hidden";
          if (popped === slots) setTimeout(onWin, 700);
        },
      });
    }, { once: false });

    field.appendChild(b);
  });

  revealEl.textContent = revealed.map(() => "·").join(" ");
}

/* ---------- 3. MEMORY MATCH ---------- */
function initMemory(onWin) {
  const grid = document.getElementById("memoryGrid");
  const status = document.getElementById("memoryStatus");
  // One pair per photo, capped at 6 so the grid stays a tidy 4x3.
  // With fewer photos the grid narrows to 3 columns instead of leaving a gap.
  const PAIRS = Math.min(PHOTO_COUNT, 6);
  const emojis = ["🎂", "🎈", "🌷", "☕", "🌙", "🧸"]; // fallback faces
  grid.style.gridTemplateColumns = `repeat(${PAIRS * 2 % 4 === 0 ? 4 : 3}, 1fr)`;

  // two of each photo index, shuffled
  const deck = [];
  for (let n = 1; n <= PAIRS; n++) deck.push(n, n);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  grid.innerHTML = "";
  let first = null;
  let lock = false;
  let matched = 0;

  deck.forEach(n => {
    const card = document.createElement("div");
    card.className = "mcard";
    card.dataset.n = n;

    const back = document.createElement("div");
    back.className = "mface mback";
    back.textContent = "♡";

    const front = document.createElement("div");
    front.className = "mface mfront";
    const img = document.createElement("img");
    img.src = photoSrc(n);
    img.alt = "";
    withFallback(img, emojis[(n - 1) % emojis.length]);
    front.appendChild(img);

    card.append(back, front);
    card.addEventListener("click", () => flip(card));
    grid.appendChild(card);
  });

  // Fade the cards in via opacity only. The cards' `transform` belongs to
  // .flipped/.matched (rotateY) — animating y here would override the flip.
  anim.fromTo(grid.children,
    { opacity: 0 },
    { opacity: 1, duration: .35 * D, stagger: .035 });

  function flip(card) {
    if (lock || card.classList.contains("flipped")) return;
    card.classList.add("flipped");

    if (!first) { first = card; return; }

    if (first.dataset.n === card.dataset.n) {
      first.classList.add("matched");
      card.classList.add("matched");
      first = null;
      matched++;
      status.textContent = matched === PAIRS ? "all of them ♡" : `${PAIRS - matched} to go`;
      if (matched === PAIRS) setTimeout(onWin, 800);
      return;
    }

    // wrong pair — flip both back after a beat
    lock = true;
    const a = first;
    first = null;
    setTimeout(() => {
      a.classList.remove("flipped");
      card.classList.remove("flipped");
      lock = false;
    }, 800);
  }
}

/* ---------- 4. CANDLE BLOW ---------- */
function initCandles(onWin) {
  const holder = document.getElementById("cakeCandles");
  const micBtn = document.getElementById("micBtn");
  const hint = document.getElementById("candleHint");
  const COUNT = 4;

  holder.innerHTML = "";
  let out = 0;
  let stopMic = null;

  for (let i = 0; i < COUNT; i++) {
    const c = document.createElement("div");
    c.className = "candle";
    c.innerHTML = `<div class="flame"></div><div class="smoke">💨</div><div class="stick"></div>`;
    c.addEventListener("click", () => blowOut(c));
    holder.appendChild(c);
  }

  function blowOut(c) {
    if (c.classList.contains("out")) return;
    c.classList.add("out");
    out++;
    if (out === COUNT) {
      if (stopMic) stopMic();
      hint.textContent = "✨";
      setTimeout(onWin, 800);
    }
  }

  function blowOne() {
    const lit = holder.querySelector(".candle:not(.out)");
    if (lit) blowOut(lit);
  }

  // Mic is strictly optional — clicking always works.
  micBtn.addEventListener("click", async () => {
    micBtn.disabled = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      let raf;
      let cooldown = 0;

      hint.textContent = "now blow ♡";
      micBtn.textContent = "listening…";

      (function loop() {
        analyser.getByteFrequencyData(buf);
        // average energy across the band; a blow is broadband and loud
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        if (avg > 55 && cooldown <= 0) {
          blowOne();
          cooldown = 22; // ~frames, stops one puff killing every candle
        }
        if (cooldown > 0) cooldown--;
        raf = requestAnimationFrame(loop);
      })();

      stopMic = () => {
        cancelAnimationFrame(raf);
        stream.getTracks().forEach(t => t.stop());
        ctx.close();
      };
    } catch {
      // denied or unsupported — fall back silently, tapping still works
      hint.textContent = "no mic — just tap each flame ♡";
      micBtn.textContent = "tap the flames instead";
    }
  });
}
