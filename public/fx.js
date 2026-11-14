// Небольшие анимации: всплывающие очки, покачивание, набегающие числа, конфетти.
// Если в системе включено «уменьшить движение», всё сводится к мгновенной смене состояния.
window.FX = (() => {
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const restart = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); el.addEventListener('animationend', () => el.classList.remove(cls), { once: true }); };

  // «+1» вылетает над элементом и тает.
  function floatText(el, text, cls = 'good') {
    if (!el || reduced()) return;
    const r = el.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'fx-float fx-float--' + cls;
    f.textContent = text;
    f.style.left = r.left + r.width / 2 + 'px';
    f.style.top = r.top + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 950);
  }
  const shake = el => (reduced() ? null : restart(el, 'fx-shake'));
  const pop = el => (reduced() ? null : restart(el, 'fx-pop'));
  const glow = el => restart(el, 'fx-glow');

  // Число плавно набегает от from до to. fmt — как печатать промежуточные значения.
  function countTo(el, to, { from = 0, ms = 900, fmt = v => Math.round(v) } = {}) {
    if (!el) return;
    if (reduced() || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1 && el.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  // Цифра счёта «перекатывается»: старое значение уходит вверх, новое приходит снизу.
  function roll(el, value) {
    if (!el) return;
    const cur = el.dataset.v;
    el.dataset.v = value;
    if (cur === undefined || cur === String(value) || reduced()) { el.textContent = value; return; }
    el.innerHTML = `<span class="fx-roll"><span>${cur}</span><span>${value}</span></span>`;
    setTimeout(() => { if (el.dataset.v === String(value)) el.textContent = value; }, 420);
  }
  // Полоски заполняются по очереди: элементы с data-w="0..100".
  function bars(root, sel = '[data-w]', gap = 90) {
    const list = [...(root || document).querySelectorAll(sel)];
    list.forEach((b, i) => {
      const w = b.dataset.w + '%';
      if (reduced()) { b.style.width = w; return; }
      b.style.width = '0%';
      setTimeout(() => { b.style.width = w; }, 60 + i * gap);
    });
  }

  // Конфетти в цветах логотипа: синий, жёлтый, тёмно-синий, белый.
  function confetti({ count = 110, ms = 2600 } = {}) {
    if (reduced()) return;
    const c = document.createElement('canvas');
    c.className = 'fx-confetti';
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    document.body.appendChild(c);
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const colors = ['#1F5FD6', '#F2B600', '#0E2552', '#7FA6FF', '#FFD34D'];
    const ps = Array.from({ length: count }, (_, i) => {
      const left = i % 2 === 0;
      return { x: left ? -10 : innerWidth + 10, y: innerHeight * (0.55 + Math.random() * 0.25), vx: (left ? 1 : -1) * (4 + Math.random() * 7), vy: -(9 + Math.random() * 9), w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: colors[i % colors.length] };
    });
    const t0 = performance.now();
    const frame = t => {
      const el = t - t0;
      g.clearRect(0, 0, innerWidth, innerHeight);
      g.globalAlpha = Math.max(0, 1 - Math.max(0, el - ms + 700) / 700);
      for (const p of ps) {
        p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
      }
      if (el < ms) requestAnimationFrame(frame); else c.remove();
    };
    requestAnimationFrame(frame);
  }

  // Награда: значок крупно по центру с подписью, исчезает сам.
  function award(html, text) {
    const box = document.createElement('div');
    box.className = 'fx-award';
    box.innerHTML = `<div class="fx-award__card"><div class="fx-award__ico">${html}</div><b>${text}</b></div>`;
    document.body.appendChild(box);
    confetti({ count: 70, ms: 2000 });
    const close = () => { box.classList.add('out'); setTimeout(() => box.remove(), 250); };
    box.onclick = close;
    setTimeout(close, 2600);
  }

  // Заглушка загрузки: серые полосы вместо надписи «Загрузка…».
  const skel = (rows = 4) => `<div class="skel" role="status" aria-live="polite"><span class="sr-only">…</span><i class="skel__h"></i>${Array.from({ length: rows }, (_, i) => `<i style="width:${[92, 78, 86, 64, 88, 70][i % 6]}%"></i>`).join('')}</div>`;
  window.SKEL = skel;

  return { skel, reduced, floatText, shake, pop, glow, countTo, roll, bars, confetti, award };
})();
