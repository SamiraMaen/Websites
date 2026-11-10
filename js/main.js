import { ERAS } from './data.js';
import * as Sound from './sound.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollProgress = () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  return max > 0 ? scrollY / max : 0;
};

/* ---------------- Navigation ---------------- */
const toggle = $('.nav__toggle'), menu = $('#menu');
const setMenu = (open) => {
  toggle.setAttribute('aria-expanded', String(open));
  menu.classList.toggle('is-open', open);
  document.body.style.overflow = open ? 'hidden' : '';
};
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
$$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); toggle.focus(); } });

const links = new Map($$('a', menu).map(a => [a.getAttribute('href').slice(1), a]));
const sectionObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
    const a = links.get(e.target.id);
    if (a) { a.classList.add('is-active'); a.setAttribute('aria-current', 'true'); }
  });
}, { rootMargin: '-45% 0px -50% 0px' });
['home', 'beginning', 'timeline', 'capitalism', 'street', 'cinema', 'conclusion'].forEach(id => { const el = document.getElementById(id); if (el) sectionObs.observe(el); });

/* ---------------- Reveal on scroll ---------------- */
// Plays every time a block comes into view, scrolling down (rises from below)
// or back up (drops in from above). Once a block has fully left the screen it resets.
if (!reduceMotion) {
  const revealIn = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const el = e.target;
      if (!e.isIntersecting || el.classList.contains('is-in')) return;
      el.classList.toggle('from-top', e.boundingClientRect.top < innerHeight * 0.4);
      el.classList.remove('is-out'); el.classList.add('is-in');
    });
  }, { rootMargin: '-6% 0px -10% 0px' });
  const revealOut = new IntersectionObserver(entries => {
    entries.forEach(e => { if (!e.isIntersecting) { e.target.classList.remove('is-in', 'from-top'); e.target.classList.add('is-out'); } });
  });
  $$('.reveal').forEach(el => { revealIn.observe(el); revealOut.observe(el); });
}

/* ---------------- Flip cards ---------------- */
// Flip cards: hover flips them on desktop; tapping toggles them on touch screens
const canHover = matchMedia('(hover: hover)').matches;
$$('.flip__btn').forEach(b => b.addEventListener('click', () => {
  if (canHover) return;
  b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
}));

/* ---------------- Scroll-linked effects ---------------- */
const bar = $('.progress__bar'), counter = $('.counter__num');
const parallax = $$('[data-speed]');
const road = $('.road'), bus = $('.vehicle--bus'), tuk = $('.vehicle--tuk'), stops = $$('.stop');
const cinema = $('#cinema');

let ticking = false;
function onScroll() {
  ticking = false;
  const vh = innerHeight;
  const p = scrollProgress();
  bar.style.transform = `scaleX(${p})`;
  counter.textContent = String(Math.round(p * 999)).padStart(3, '0');

  if (!reduceMotion) {
    parallax.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const d = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.speed);
      el.style.translate = `0 ${d.toFixed(1)}px`;
    });
  }

  // Street: vehicles drive across as the road scrolls through the viewport
  const rr = road.getBoundingClientRect();
  if (rr.bottom > 0 && rr.top < vh) {
    const t = clamp((vh - rr.top) / (vh + rr.height));
    const W = rr.width;
    const bw = bus.offsetWidth, tw = tuk.offsetWidth;
    const bx = -bw + (W + bw) * clamp(t * 1.25 - 0.1);
    const tx = W - (W + tw) * clamp(t * 1.4 - 0.25);
    bus.style.transform = `translateX(${bx}px)`;
    tuk.style.transform = `translateX(${tx}px)`;
    const front = rr.left + bx + bw;
    stops.forEach(s => { const sr = s.getBoundingClientRect(); s.classList.toggle('is-lit', front > sr.left + sr.width / 2); });
  }

  // Cinema: black curtains open as the section arrives
  const cr = cinema.getBoundingClientRect();
  if (cr.top < vh && cr.bottom > 0) {
    const lb = reduceMotion ? 0 : clamp((cr.top - vh * 0.05) / (vh * 0.75));
    cinema.style.setProperty('--lb', lb.toFixed(3));
  }
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
addEventListener('resize', onScroll);
onScroll();

/* ---------------- Hero: sticky image scroller ----------------
   One screen of scrolling per photo; the active photo and its line
   crossfade, the outline in the dock springs to the active thumbnail,
   thumbnails jump to their photo, and the dock can be dragged by its handle. */
const scroller = $('.scroller');
if (scroller) {
  const sticky = $('.scroller__sticky', scroller);
  const slides = $$('.slide', scroller), texts = $$('.stext', scroller);
  const dock = $('.dock', scroller), thumbs = $$('.dock__thumb', scroller), outline = $('.dock__outline', scroller);
  const countEl = $('.scroller__count b', scroller);
  const n = slides.length;
  let active = -1;

  const placeOutline = () => {
    const t = thumbs[active]; if (!t) return;
    const x = t.offsetLeft + t.offsetWidth / 2 - outline.offsetWidth / 2;
    const y = t.offsetTop + t.offsetHeight / 2 - outline.offsetHeight / 2;
    outline.style.transform = `translate(${x}px, ${y}px)`;
  };
  const setActive = (i) => {
    if (i === active) return;
    active = i;
    slides.forEach((s, j) => s.classList.toggle('is-active', j === i));
    texts.forEach((t, j) => { t.classList.toggle('is-active', j === i); t.setAttribute('aria-hidden', String(j !== i)); });
    thumbs.forEach((t, j) => j === i ? t.setAttribute('aria-current', 'true') : t.removeAttribute('aria-current'));
    countEl.textContent = String(i + 1).padStart(2, '0');
    placeOutline();
  };
  const range = () => scroller.offsetHeight - sticky.offsetHeight;
  const update = () => {
    const r = scroller.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = clamp(-r.top / Math.max(1, range()));
    setActive(Math.min(n - 1, Math.floor(p * n)));
  };
  addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  addEventListener('resize', () => { placeOutline(); update(); });
  setActive(0); update();

  thumbs.forEach((t, i) => t.addEventListener('click', () => {
    const top = scroller.offsetTop + ((i + 0.5) / n) * range();
    if (window.__lenis) window.__lenis.scrollTo(top); else window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  }));

  // Drag the dock by its handle, kept inside the pinned screen
  const handle = $('.dock__handle', dock);
  let start = null;
  handle.addEventListener('pointerdown', (e) => {
    const d = dock.getBoundingClientRect(), s = sticky.getBoundingClientRect();
    start = { x: e.clientX - (d.left - s.left), y: e.clientY - (d.top - s.top) };
    dock.classList.add('is-moved', 'is-dragging');
    dock.style.left = `${d.left - s.left}px`; dock.style.top = `${d.top - s.top}px`; dock.style.bottom = 'auto';
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', (e) => {
    if (!start) return;
    const s = sticky.getBoundingClientRect();
    dock.style.left = `${clamp(e.clientX - start.x, 8, s.width - dock.offsetWidth - 8)}px`;
    dock.style.top = `${clamp(e.clientY - start.y, 24, s.height - dock.offsetHeight - 8)}px`;
  });
  const end = () => { start = null; dock.classList.remove('is-dragging'); };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

/* ---------------- Polaroid footer: drifting, draggable ticker ---------------- */
const pt = $('.pticker');
if (pt) {
  const track = $('.pticker__track', pt);
  [...track.children].forEach(it => { const c = it.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.tabIndex = -1; track.appendChild(c); });
  let x = 0, half = 1, hover = false, drag = null, moved = false, last = performance.now(), on = false;
  const SPEED = 35;
  const measure = () => { half = track.scrollWidth / 2; };
  const wrapX = () => { x = ((x % half) + half) % half - half; track.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`; };
  measure(); addEventListener('resize', measure);
  pt.addEventListener('pointerenter', () => { hover = true; });
  pt.addEventListener('pointerleave', () => { hover = false; });
  pt.addEventListener('pointerdown', e => { drag = { x: e.clientX, start: x }; moved = false; pt.classList.add('is-dragging'); pt.setPointerCapture(e.pointerId); });
  pt.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 5) moved = true; x = drag.start + dx; wrapX(); });
  const end = () => { drag = null; pt.classList.remove('is-dragging'); };
  pt.addEventListener('pointerup', end); pt.addEventListener('pointercancel', end);
  pt.addEventListener('click', e => { if (moved) { e.preventDefault(); moved = false; } }, true);
  const tick = (now) => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!drag && !reduceMotion) { x -= SPEED * (hover ? .5 : 1) * dt; wrapX(); }
    if (on) requestAnimationFrame(tick);
  };
  new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting; if (on && !was) { last = performance.now(); measure(); requestAnimationFrame(tick); } }).observe(pt);
  wrapX();
}

/* ---------------- Section transitions ----------------
   No scaling: as the next section rises into view, the one leaving
   drifts at ~75% of the scroll speed, so the hand-over feels slower. */
const SX = ['#home', '#manifesto', '#question', '#beginning', '#timeline', '#capitalism', '#street', '#cinema', '.pfooter'].map(s => $(s)).filter(Boolean);
SX.forEach(s => s.classList.add('sx'));
const SLOW = 0.25;
const sxRun = () => {
  const vh = innerHeight;
  for (let i = 0; i < SX.length - 1; i++) {
    const s = SX[i], r = s.getBoundingClientRect();
    if (r.bottom < -vh || r.top > vh) { if (s.style.transform) s.style.transform = ''; continue; }
    const t = clamp((vh - SX[i + 1].getBoundingClientRect().top) / vh);
    s.style.transform = t > 0 ? `translate3d(0, ${(t * SLOW * vh).toFixed(1)}px, 0)` : '';
  }
};
if (!reduceMotion) {
  addEventListener('scroll', () => requestAnimationFrame(sxRun), { passive: true });
  addEventListener('resize', sxRun);
  sxRun();
}

/* ---------------- Slow, smooth scrolling (slower after the opening section) ---------------- */
if (window.Lenis && !reduceMotion) {
  const lenis = new window.Lenis({ lerp: 0.07, wheelMultiplier: 1, smoothWheel: true });
  window.__lenis = lenis;
  lenis.on('scroll', () => { if (typeof srRun === 'function') srRun(); });
  const hero = $('#home');
  const raf = (t) => {
    const heroEnd = hero ? hero.offsetTop + hero.offsetHeight - innerHeight : 0;
    lenis.options.wheelMultiplier = scrollY <= heroEnd ? 1 : (window.__srActive ? 0.32 : 0.6);
    lenis.raf(t);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
  // in-page links glide too
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); const el = id.length > 1 && document.querySelector(id);
    if (!el) return; e.preventDefault(); window.__navJump = true;
    lenis.scrollTo(el, { offset: -70, onComplete: () => { window.__navJump = false; } });
  }));
}

/* ---------------- Paragraphs: words come into focus while scrolling ----------------
   Each word starts blurred and faint and sharpens one after another as the
   paragraph moves up the screen, so text only resolves while you scroll. */
const SR_SEL = 'main p, footer p, .flip__back, .paper__topics li, .pfooter__cols li';
const srBlocks = $$(SR_SEL).filter(el => !el.closest('.ct, .scroller, .poster, .tv, .stickers, .receipt, .flipgrid, .scard, .frame, .pfooter__content') && !el.querySelector('p')).map(el => {
  el.classList.remove('reveal'); el.classList.add('sr');
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const texts = []; while (walker.nextNode()) texts.push(walker.currentNode);
  texts.forEach(tn => {
    const parts = tn.textContent.split(/(\s+)/);
    if (parts.length < 2 && !tn.textContent.trim()) return;
    const frag = document.createDocumentFragment();
    parts.forEach(p => {
      if (!p) return;
      if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
      else { const s = document.createElement('span'); s.className = 'sr__w'; s.textContent = p; frag.appendChild(s); }
    });
    tn.replaceWith(frag);
  });
  return { el, words: $$('.sr__w', el) };
});
const SR_BLUR = 3, SR_OPACITY = 0.1;
window.__srActive = false;
function paintWords(b, p) {
  if (b.p === p) return;
  b.p = p;
  const n = b.words.length;
  b.words.forEach((w, i) => {
    const k = clamp((p - i / n) * n);
    w.style.opacity = (SR_OPACITY + (1 - SR_OPACITY) * k).toFixed(3);
    w.style.filter = k >= 1 ? 'none' : 'blur(' + (SR_BLUR * (1 - k)).toFixed(2) + 'px)';
  });
}
function splitWords(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const texts = []; while (walker.nextNode()) texts.push(walker.currentNode);
  texts.forEach(tn => {
    if (!tn.textContent.trim()) return;
    const frag = document.createDocumentFragment();
    tn.textContent.split(/(\s+)/).forEach(p => {
      if (!p) return;
      if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
      else { const s = document.createElement('span'); s.className = 'sr__w'; s.textContent = p; frag.appendChild(s); }
    });
    tn.replaceWith(frag);
  });
  el.classList.add('sr');
  return { el, words: $$('.sr__w', el) };
}
// Give every block its own slice of the scroll: it starts when it comes into view,
// but never before the block above it (in the same section) has finished, and it is
// fully readable by the time its top reaches the top of the screen.
const srMeasure = () => {
  const vh = innerHeight, maxY = document.documentElement.scrollHeight - vh;
  let prevEnd = -Infinity, prevSec = null;
  for (const b of srBlocks) {
    const r = b.el.getBoundingClientRect();
    const top = r.top + scrollY, h = r.height;
    const sec = b.el.closest('section, footer');
    const len = Math.min(600, Math.max(220, b.words.length * 14));
    let start = top + h - vh * 0.92;                    // bottom of the block comes into view
    if (sec === prevSec) start = Math.max(start, prevEnd); // wait for the block above
    let end = start + len;
    const latest = Math.min(top - vh * 0.1, maxY);       // must be done before it leaves the top
    if (end > latest) { end = latest; start = Math.min(start, end - 160); }
    b.start = start; b.end = end;
    prevEnd = end; prevSec = sec;
  }
};
const srRun = () => {
  const vh = innerHeight, y = scrollY;
  let active = false;
  for (const b of srBlocks) {
    if (b.start === undefined || b.gated) continue;
    const p = b.end <= b.start ? (y >= b.end ? 1 : 0) : clamp((y - b.start) / (b.end - b.start));
    if (p > 0 && p < 1) {
      const r = b.el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) active = true;
    }
    paintWords(b, p);
  }
  window.__srActive = active;
};
if (!reduceMotion) {
  srMeasure();
  addEventListener('load', () => { srMeasure(); srRun(); });
  addEventListener('resize', () => { srMeasure(); srRun(); });
}
if (!reduceMotion) { addEventListener('scroll', () => requestAnimationFrame(srRun), { passive: true }); srRun(); }


/* ---------------- Scroll gates ----------------
   At a few blocks the page stops: scrolling drives the reveal of that block's text
   (one paragraph after another) instead of moving the page, and only once everything
   has appeared does the page carry on. Scrolling up at the start releases it. */
const NAV_OFF = 76;
const absTop = el => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
const GATES = [];
const textGate = (sel, blockSel, anchor) => {
  const el = $(sel); if (!el) return;
  const blocks = srBlocks.filter(b => el.contains(b.el) && b.el.matches(blockSel));
  if (!blocks.length) return;
  blocks.forEach(b => { b.gated = true; paintWords(b, 0); });
  const total = blocks.reduce((s, b) => s + b.words.length, 0);
  GATES.push({
    el, anchor, p: 0, done: false,
    len: Math.min(2600, Math.max(1000, total * 22)),
    apply(p) {
      let before = 0;
      blocks.forEach(b => { paintWords(b, clamp((p * total - before) / b.words.length)); before += b.words.length; });
    },
  });
};
textGate('.manifesto__text', 'p', 'center');
textGate('.question__box', 'p', 'center');
textGate('.paper', '.paper__lead p, .paper__topics li', 'top');
textGate('.adaweya', 'p', 'center');
textGate('.market__intro', 'p', 'top');
// cinema: the film scenes slide past one after another
const strip = $('.filmstrip'), track = strip && $('.filmstrip__track', strip);
if (strip && track) {
  strip.classList.add('is-gated');
  GATES.push({
    el: strip, anchor: 'center', p: 0, done: false, len: 2400,
    apply(p) { const max = Math.max(0, track.scrollWidth - strip.clientWidth); track.style.transform = `translate3d(${(p * max).toFixed(1)}px,0,0)`; },
  });
}
const gateY = g => {
  const top = absTop(g.el), h = g.el.offsetHeight, vh = innerHeight;
  return g.anchor === 'center' && h < vh - NAV_OFF ? top + h / 2 - (vh + NAV_OFF) / 2 : top - NAV_OFF - 12;
};
const measureGates = () => GATES.forEach(g => {
  g.y = Math.max(0, gateY(g));
  if (g.el === strip && track) g.len = Math.max(900, (track.scrollWidth - strip.clientWidth) * 2.6);
});
let gLocked = null, gLastY = scrollY;
const gUnlock = () => { gLocked = null; window.__lenis && window.__lenis.start(); gLastY = scrollY; };
const gLock = g => {
  gLocked = g;
  const L = window.__lenis;
  if (L) { L.scrollTo(g.y, { immediate: true, force: true }); L.stop(); }
  window.scrollTo(0, g.y);
  gLastY = g.y;
  g.apply(g.p);
};
const gCheck = () => {
  const y = scrollY, prev = gLastY; gLastY = y;
  if (gLocked || window.__navJump) return;
  for (const g of GATES) if (!g.done && prev < g.y && y >= g.y) { gLock(g); break; }
};
const gStep = d => {
  const g = gLocked; if (!g) return false;
  g.p = clamp(g.p + d / g.len); g.apply(g.p);
  if (g.p >= 1 && d > 0) { g.done = true; gUnlock(); }
  else if (g.p <= 0 && d < 0) gUnlock();
  return true;
};
if (!reduceMotion && GATES.length) {
  measureGates();
  addEventListener('load', measureGates);
  addEventListener('resize', measureGates);
  addEventListener('scroll', gCheck, { passive: true });
  window.__lenis && window.__lenis.on('scroll', gCheck);
  addEventListener('wheel', e => {
    if (!gLocked) return;
    e.preventDefault(); e.stopImmediatePropagation();
    gStep(e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1));
  }, { capture: true, passive: false });
  let ty = null;
  addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { capture: true, passive: true });
  addEventListener('touchmove', e => {
    if (!gLocked || ty === null) return;
    const y = e.touches[0].clientY; e.preventDefault(); gStep((ty - y) * 2); ty = y;
  }, { capture: true, passive: false });
  addEventListener('keydown', e => {
    if (!gLocked) return;
    const k = e.key;
    const d = k === 'ArrowDown' || k === 'PageDown' || k === ' ' ? 1 : k === 'ArrowUp' || k === 'PageUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault(); gStep(d * gLocked.len * 0.15);
  }, { capture: true });
}

/* ---------------- Titles: glitch bursts ----------------
   Three coloured copies of the title, cut into horizontal slices, jump apart
   in short bursts every second or two, with a few scan lines. */
const GL_SEL = '.stext__title, .manifesto__en, .chapter__title, .finale__title';
const GL_COLORS = ['#FC8E00', '#FBC201', '#647568'];
const SLICES = 6;
$$(GL_SEL).forEach(t => {
  if (reduceMotion) return;
  t.classList.add('gl');
  const html = t.innerHTML;
  const layers = GL_COLORS.map((c, li) => {
    const L = document.createElement('span'); L.className = 'gl__layer'; L.setAttribute('aria-hidden', 'true'); L.style.color = c; L.style.zIndex = String(-1 - li);
    for (let i = 0; i < SLICES; i++) {
      const s = document.createElement('span'); s.className = 'gl__slice'; s.innerHTML = html;
      s.style.clipPath = `inset(${(i / SLICES * 100).toFixed(2)}% 0 ${(100 - (i + 1) / SLICES * 100).toFixed(2)}% 0)`;
      s.style.transform = `translateX(var(--s${i}, 0px))`;
      L.appendChild(s);
    }
    t.appendChild(L); return L;
  });
  const lines = document.createElement('span'); lines.className = 'gl__lines'; lines.setAttribute('aria-hidden', 'true'); t.appendChild(lines);
  let on = false, timer = 0;
  const reset = () => { layers.forEach(L => { L.style.transform = ''; for (let i = 0; i < SLICES; i++) L.style.removeProperty(`--s${i}`); }); lines.innerHTML = ''; };
  const burst = async () => {
    const steps = 4 + Math.floor(Math.random() * 4);
    for (let s = 0; s < steps && on; s++) {
      layers.forEach((L, li) => {
        const x = (Math.random() - .5) * 14 * (li === 1 ? -1 : 1), y = (Math.random() - .5) * 6, sk = (Math.random() - .5) * 6;
        L.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) skewX(${sk.toFixed(1)}deg)`;
        for (let i = 0; i < SLICES; i++) L.style.removeProperty(`--s${i}`);
        if (Math.random() > .5) L.style.setProperty(`--s${Math.floor(Math.random() * SLICES)}`, `${((Math.random() - .5) * 30).toFixed(1)}px`);
      });
      lines.innerHTML = Math.random() > .4 ? Array.from({ length: 4 + Math.floor(Math.random() * 4) }, () =>
        `<i style="top:${(25 + Math.random() * 55).toFixed(0)}%;left:${(5 + Math.random() * 85).toFixed(0)}%;width:${(1 + Math.random() * 15).toFixed(0)}%;height:${1 + Math.floor(Math.random() * 3)}px;opacity:${(.3 + Math.random() * .5).toFixed(2)}"></i>`).join('') : '';
      await new Promise(r => setTimeout(r, 40 + Math.random() * 120));
    }
    reset();
    if (on) timer = setTimeout(burst, 200 + Math.random() * 1500);
  };
  new IntersectionObserver(([e]) => {
    on = e.isIntersecting; clearTimeout(timer);
    if (on) timer = setTimeout(burst, 300 + Math.random() * 900); else reset();
  }).observe(t);
});

/* ---------------- Timeline: chronicle-style scroll wipe ----------------
   A pinned, rounded frame holds one full-colour panel per era. Scrolling wipes
   the next panel in from the right, the content drifts a little, and the
   outgoing year tips over. The reveal follows the scrollbar with light smoothing. */
const ct = $('.ct');
if (ct) {
  const frame = $('.ct__frame', ct);
  const panels = $$('.ct__panel', ct);
  const inners = panels.map(p => $('.ct__inner', p));
  const years = panels.map(p => $('.ct__year', p));
  const n = panels.length;
  const ROT = 90, PARALLAX = reduceMotion ? 0 : 64;
  const rate = 24 - (reduceMotion ? 0 : 45) / 100 * 21;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const r2 = v => Math.round(v * 100) / 100;
  let stickyTop = 0, travel = 1, current = 0, target = 0, running = false, painted = -1, last = 0, shown = -1;
  // scroll units: reveal panel 0, wipe, reveal panel 1, wipe, … reveal last panel, hold
  const R = 1, W = 1, HOLD = 0.8, U = n * R + (n - 1) * W + HOLD;
  ct.style.height = `calc(${U.toFixed(2)} * 72vh)`;
  const panelText = panels.map(p => {
    const blocks = $$('.ct__desc', p).map(splitWords);
    const total = blocks.reduce((s, b) => s + b.words.length, 0);
    return { blocks, total };
  });
  const revealPanel = (i, k) => {
    const t = panelText[i]; let before = 0;
    t.blocks.forEach(b => { paintWords(b, reduceMotion ? 1 : clamp((k * t.total - before) / b.words.length)); before += b.words.length; });
  };
  const toRaw = u => {
    let x = u;
    for (let i = 0; i < n; i++) {
      if (x <= R) return { raw: i, cur: i, k: x / R };
      x -= R;
      if (i < n - 1) { if (x <= W) return { raw: i + x / W, cur: i + 1, k: 0 }; x -= W; }
    }
    return { raw: n - 1, cur: n - 1, k: 1 };
  };

  const measure = () => { stickyTop = parseFloat(getComputedStyle(frame).top) || 0; travel = Math.max(1, ct.offsetHeight - frame.offsetHeight); };
  const readTarget = () => { target = clamp((stickyTop - ct.getBoundingClientRect().top) / travel) * U; };

  function apply(u) {
    if (Math.abs(u - painted) < 4e-4) return;
    painted = u;
    const st = toRaw(u), raw = st.raw;
    panels.forEach((_, i) => revealPanel(i, i < st.cur ? 1 : i === st.cur ? st.k : 0));
    const scaled = clamp(raw, 0, n - 1);
    const idx = Math.min(Math.max(n - 2, 0), Math.floor(scaled));
    const t = n > 1 ? ease(scaled - idx) : 0;
    panels.forEach((p, i) => {
      if (i === idx) {
        p.style.clipPath = `inset(0 ${r2(t * 100)}% 0 0)`;
        years[i].style.transform = `rotate(${r2(-ROT * t)}deg)`;
        inners[i].style.transform = `translate3d(${r2(-PARALLAX * t)}px,0,0)`;
      } else if (i === idx + 1) {
        p.style.clipPath = `inset(0 0 0 ${r2((1 - t) * 100)}%)`;
        years[i].style.transform = 'rotate(0deg)';
        inners[i].style.transform = `translate3d(${r2(PARALLAX * (1 - t))}px,0,0)`;
      } else {
        p.style.clipPath = 'inset(0 0 0 100%)';
        years[i].style.transform = i < idx ? `rotate(${-ROT}deg)` : 'rotate(0deg)';
        inners[i].style.transform = 'none';
      }
      p.style.zIndex = String(i);
    });
    // only the panel that is mostly on screen takes keyboard focus
    const vis = Math.round(scaled);
    if (vis !== shown) { shown = vis; panels.forEach((p, i) => { p.inert = i !== vis; }); }
  }
  function tick(now) {
    const dt = Math.min(.064, (now - last) / 1000 || .016); last = now;
    readTarget();
    current += (target - current) * (1 - Math.exp(-rate * dt));
    if (Math.abs(target - current) < 3e-4) current = target;
    apply(current);
    if (current !== target) requestAnimationFrame(tick); else running = false;
  }
  const kick = () => { if (running) return; running = true; last = performance.now(); requestAnimationFrame(tick); };
  const onResize = () => { measure(); painted = -1; kick(); };
  measure(); readTarget(); current = target; apply(current);
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', onResize);
  new ResizeObserver(onResize).observe(ct);

  panels.forEach(p => setupPlayer(p, ERAS.find(e => e.id === p.dataset.era)));
}

function setupPlayer(root, e) {
  const btn = $('.player__btn', root), cv = $('.player canvas', root), g = cv.getContext('2d');
  const W = cv.width, H = cv.height, buf = new Uint8Array(1024);
  const color = e.fg || '#FC8E00';
  let playing = false, raf = 0;
  const flat = () => {
    g.clearRect(0, 0, W, H); g.lineWidth = 3; g.strokeStyle = color; g.globalAlpha = .45;
    g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); g.globalAlpha = 1;
  };
  const draw = () => {
    const an = Sound.getAnalyser();
    if (!playing || !an) { flat(); return; }
    an.getByteTimeDomainData(buf);
    g.clearRect(0, 0, W, H); g.lineWidth = 3; g.strokeStyle = color; g.beginPath();
    for (let x = 0; x < W; x++) { const v = buf[Math.floor(x / W * buf.length)] / 128 - 1; const y = H / 2 + v * H * 0.9; x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    raf = requestAnimationFrame(draw);
  };
  const setUI = (on) => {
    playing = on; btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? '■' : '▶';
    cancelAnimationFrame(raf); if (on) raf = requestAnimationFrame(draw); else flat();
  };
  btn.addEventListener('click', async () => {
    if (playing) { Sound.stop(); return; }
    await Sound.play(e.id, () => setUI(false));
    setUI(true);
  });
  flat();
}

/* ---------------- TV static (cinema) ---------------- */
const tv = $('.tv__screen');
if (tv) {
  const g = tv.getContext('2d'); const img = g.createImageData(tv.width, tv.height);
  let on = false, lastT = 0, phase = 0;
  const colors = ['#FBC201', '#FC8E00', '#647568', '#DAD2D0', '#121110', '#4569c7'];
  const loop = (t) => {
    if (!on) return;
    if (t - lastT > 70) {
      lastT = t; phase++;
      if (phase % 40 < 26 || reduceMotion) {
        // colour bars with a soft scanline wobble
        const w = tv.width / colors.length;
        colors.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * w, 0, w + 1, tv.height); });
        g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = (phase * 2) % 4; y < tv.height; y += 4) g.fillRect(0, y, tv.width, 1);
        g.fillStyle = '#121110'; g.fillRect(0, tv.height * 0.68, tv.width, tv.height * 0.32);
        g.fillStyle = '#DAD2D0'; g.font = '700 15px Saudi, Alexandria, sans-serif'; g.textAlign = 'center'; g.direction = 'rtl';
        g.fillText('قناة الأغاني', tv.width / 2, tv.height * 0.88);
      } else {
        for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        g.putImageData(img, 0, 0);
      }
    }
    requestAnimationFrame(loop);
  };
  new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting; if (on && !was) requestAnimationFrame(loop); }).observe(tv);
}

/* ---------------- Finale: flowing lines (WebGL port of the Framer "Lines" component) ---------------- */
const fl = $('.finale__lines');
const flGl = fl && fl.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
if (flGl) {
  const gl = flGl;
  const VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  const FS = `
  precision highp float;
  uniform vec2 iResolution; uniform float iTime; uniform vec3 uLineColor; uniform float uSpeed;
  const float gridSmoothWidth = 0.015; const float scale = 5.0;
  const float minLineWidth = 0.01; const float maxLineWidth = 0.2;
  const float lineAmplitude = 1.0; const float lineFrequency = 0.2;
  const float warpFrequency = 0.5; const float warpAmplitude = 1.0;
  const float offsetFrequency = 0.5; const float minOffsetSpread = 0.6; const float maxOffsetSpread = 2.0;
  const int linesPerGroup = 16;
  #define drawCircle(pos, radius, coord) smoothstep(radius + gridSmoothWidth, radius, length(coord - (pos)))
  #define drawSmoothLine(pos, halfWidth, t) smoothstep(halfWidth, 0.0, abs(pos - (t)))
  #define drawCrispLine(pos, halfWidth, t) smoothstep(halfWidth + gridSmoothWidth, halfWidth, abs(pos - (t)))
  float random(float t) { return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0; }
  float getPlasmaY(float x, float hFade, float offset, float speed) { return random(x * lineFrequency + iTime * speed) * hFade * lineAmplitude + offset; }
  void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    vec2 space = (gl_FragCoord.xy - iResolution.xy * 0.5) / iResolution.x * 2.0 * scale;
    float lineSpeed = 0.2 * uSpeed; float warpSpeed = 0.04 * uSpeed; float offsetSpeed = 0.266 * uSpeed;
    float hFade = 1.0 - (cos(uv.x * 6.28318) * 0.5 + 0.5);
    space.y += random(space.x * warpFrequency + iTime * warpSpeed) * warpAmplitude * (0.5 + hFade);
    space.x += random(space.y * warpFrequency + iTime * warpSpeed + 2.0) * warpAmplitude * hFade;
    float lines = 0.0;
    for (int l = 0; l < linesPerGroup; l++) {
      float nIdx = float(l) / float(linesPerGroup);
      float offsetTime = iTime * offsetSpeed;
      float offsetPos = float(l) + space.x * offsetFrequency;
      float rand = random(offsetPos + offsetTime) * 0.5 + 0.5;
      float halfWidth = mix(minLineWidth, maxLineWidth, rand * hFade) / 2.0;
      float offset = random(offsetPos + offsetTime * (1.0 + nIdx)) * mix(minOffsetSpread, maxOffsetSpread, hFade);
      float linePos = getPlasmaY(space.x, hFade, offset, lineSpeed);
      float line = drawSmoothLine(linePos, halfWidth, space.y) / 2.0 + drawCrispLine(linePos, halfWidth * 0.15, space.y);
      float circleX = mod(float(l) + iTime * lineSpeed, 25.0) - 12.0;
      vec2 circlePos = vec2(circleX, getPlasmaY(circleX, hFade, offset, lineSpeed));
      float circle = drawCircle(circlePos, 0.01, space) * 4.0;
      lines += (line + circle) * rand;
    }
    float a = clamp(lines, 0.0, 1.0);
    gl_FragColor = vec4(uLineColor * a, a);
  }`;
  const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(o)); return null; } return o; };
  const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  const prog = vs && fs && gl.createProgram();
  if (prog) {
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aP = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, 'iResolution'), uTime = gl.getUniformLocation(prog, 'iTime');
    gl.uniform3f(gl.getUniformLocation(prog, 'uLineColor'), 251 / 255, 194 / 255, 1 / 255); // --tape
    gl.uniform1f(gl.getUniformLocation(prog, 'uSpeed'), 1);
    // 1× like the original component, and never more than ~1.2M pixels: it is a full-screen shader
    const size = () => {
      const w = fl.clientWidth, h = fl.clientHeight, k = Math.min(1, Math.sqrt(1.2e6 / Math.max(1, w * h)));
      fl.width = Math.max(1, Math.round(w * k)); fl.height = Math.max(1, Math.round(h * k)); gl.viewport(0, 0, fl.width, fl.height);
    };
    const draw = t => { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform2f(uRes, fl.width, fl.height); gl.uniform1f(uTime, t); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
    let on = false; const t0 = performance.now();
    const loop = () => { if (!on) return; draw((performance.now() - t0) / 1000); requestAnimationFrame(loop); };
    new ResizeObserver(() => { size(); if (reduceMotion || !on) draw(8); }).observe(fl);
    if (!reduceMotion) new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting; if (on && !was) requestAnimationFrame(loop); }).observe(fl);
  }
}
