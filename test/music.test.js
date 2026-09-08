const assert = require("assert");
let JSDOM;
try { ({ JSDOM } = require("jsdom")); }
catch (e) { console.error("This check needs jsdom:  npm i jsdom"); process.exit(0); }
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");

function run(autoplayAllowed) {
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT,"index.html"),"utf8"),
    { runScripts:"outside-only", pretendToBeVisual:true, url:"http://localhost/" });
  const { window } = dom;
  const noop=()=>{}, tw={kill:noop};
  window.gsap={to:(t,v)=>{v&&v.onComplete&&v.onComplete();return tw},from:()=>tw,
    fromTo:(t,a,b)=>{b&&b.onComplete&&b.onComplete();return tw},killTweensOf:noop};
  window.confetti=noop;
  window.matchMedia=()=>({matches:false,addListener:noop,removeListener:noop});
  window.scrollTo=noop; window.requestAnimationFrame=cb=>{cb(1e6);return 1};
  window.performance={now:()=>0};

  let playing=false, playCalls=0;
  window.HTMLMediaElement.prototype.play=function(){
    playCalls++;
    if(!autoplayAllowed && !window.__gestured)
      return Promise.reject(new DOMException("blocked","NotAllowedError"));
    playing=true; return Promise.resolve();
  };
  window.HTMLMediaElement.prototype.pause=function(){playing=false};
  Object.defineProperty(window.HTMLMediaElement.prototype,"paused",{get(){return !playing}});

  const src=["js/content.js","js/games.js","js/main.js"]
    .map(f=>fs.readFileSync(path.join(ROOT,f),"utf8")).join("\n;\n");
  window.eval(src);
  return { window, isPlaying:()=>playing, calls:()=>playCalls };
}

// --- case 1: browser allows autoplay ---
const a = run(true);
setTimeout(()=>{
  assert.ok(a.isPlaying(), "plays immediately when autoplay is allowed");
  console.log("allowed  : starts on load, no gesture needed");

  // --- case 2: browser blocks it (the real world) ---
  const b = run(false);
  setTimeout(()=>{
    assert.ok(!b.isPlaying(), "correctly blocked before any gesture");
    const before = b.calls();
    // simulate her first tap (the Begin button)
    b.window.__gestured = true;
    b.window.document.dispatchEvent(new b.window.Event("pointerdown",{bubbles:true}));
    setTimeout(()=>{
      assert.ok(b.isPlaying(), "starts on the first gesture");
      assert.ok(b.calls() > before, "retried play() on gesture");
      // a second gesture must not restart or double-play
      const after = b.calls();
      b.window.document.dispatchEvent(new b.window.Event("pointerdown",{bubbles:true}));
      setTimeout(()=>{
        assert.strictEqual(b.calls(), after, "listener removed; no repeat play()");
        console.log("blocked  : silent on load, starts on first tap, then disarms");
        console.log("loop attr:", b.window.document.getElementById("bgm").hasAttribute("loop") ? "present (infinite)" : "MISSING");
        console.log("\nautoplay checks passed");
      },0);
    },0);
  },0);
},0);
