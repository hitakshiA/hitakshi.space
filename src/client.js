(() => {
  const stage = document.querySelector('.stage');
  const row = document.querySelector('.cities');
  const cities = [...row.querySelectorAll('.city')];
  const buttons = cities.map((c) => c.querySelector('.scape'));
  const panels = cities.map((c) => c.querySelector('.panel'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Every panel takes the height of the tallest, so their tops line up.
  const level = () => {
    row.style.setProperty('--panel-h', '0px');
    row.style.setProperty('--panel-h', Math.max(...panels.map((p) => p.offsetHeight)) + 'px');
  };
  level();
  addEventListener('resize', level);
  document.fonts?.ready.then(level);

  // The peeking logos fly up into their place in the panel, and back down behind the city.
  const easeOut = (t) => 1 - (1 - t) ** 3;
  const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
  const flights = cities.map((c) => [...c.querySelectorAll('.peek')].map((peek) => ({
    peek,
    fly: peek.firstElementChild,
    target: c.querySelector(`.panel [data-fly="${peek.dataset.fly}"]`),
    x: 0, y: 0, s: 1, up: false, landed: false, raf: 0,
  })));
  const put = (f) => { f.fly.style.transform = `translate(${f.x}px,${f.y}px) scale(${f.s})`; };
  const toTarget = (f) => {
    const home = f.peek.getBoundingClientRect(), t = f.target.getBoundingClientRect();
    return { x: t.left - home.left, y: t.top - home.top, s: t.width / home.width };
  };
  const launch = (f, up) => {
    if (f.up === up) return;
    f.up = up;
    cancelAnimationFrame(f.raf);
    if (f.landed) { Object.assign(f, toTarget(f)); put(f); f.landed = false; }
    f.fly.style.opacity = '';
    f.target.classList.add('away');
    f.peek.classList.add('flying');
    const from = { x: f.x, y: f.y, s: f.s }, start = performance.now();
    const duration = reduce ? 0 : up ? 920 : 680, delay = up ? 60 : 0;
    const step = (now) => {
      const p = duration ? Math.min(1, Math.max(0, now - start - delay) / duration) : 1;
      // Up: rise out from behind the roofs first, then slide over. Down: slide over, then sink.
      const ex = up ? easeInOut(p) : easeOut(p), ey = up ? easeOut(p) : easeInOut(p);
      const to = up ? toTarget(f) : { x: 0, y: 0, s: 1 };
      f.x = from.x + (to.x - from.x) * ex;
      f.y = from.y + (to.y - from.y) * ey;
      f.s = from.s + (to.s - from.s) * ey;
      put(f);
      if (p < 1) { f.raf = requestAnimationFrame(step); return; }
      if (up) { f.landed = true; f.target.classList.remove('away'); f.fly.style.opacity = '0'; }
      else { f.peek.classList.remove('flying'); f.fly.style.transform = ''; }
    };
    f.raf = requestAnimationFrame(step);
  };

  // One city open at a time, or none.
  let open = null, pointer = 'mouse';
  const render = () => {
    stage.classList.toggle('focus', open !== null);
    cities.forEach((c, i) => {
      const key = c.dataset.city;
      c.classList.toggle('on', key === open);
      c.classList.toggle('open', key === open);
      c.classList.toggle('from-l', cities[i - 1]?.dataset.city === open && open !== null);
      c.classList.toggle('from-r', cities[i + 1]?.dataset.city === open && open !== null);
      buttons[i].setAttribute('aria-expanded', String(key === open));
      panels[i].inert = key !== open;
      flights[i].forEach((f) => launch(f, key === open));
    });
  };
  const show = (key) => { if (open !== key) { open = key; render(); } };
  const hide = () => { if (open !== null) { open = null; render(); } };
  render();

  addEventListener('pointerdown', (e) => { pointer = e.pointerType; }, true);
  cities.forEach((c, i) => {
    const key = c.dataset.city;
    c.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(key); });
    buttons[i].addEventListener('click', () => { if (pointer !== 'mouse' && open === key) hide(); else show(key); });
    buttons[i].addEventListener('focus', () => { if (buttons[i].matches(':focus-visible')) show(key); });
    buttons[i].addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      buttons[(i + d + buttons.length) % buttons.length].focus();
    });
  });
  row.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
  row.addEventListener('focusout', (e) => { if (!row.contains(e.relatedTarget)) hide(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  addEventListener('click', (e) => { if (!row.contains(e.target)) hide(); });
})();
