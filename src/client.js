(() => {
  const stage = document.querySelector('.stage');
  const row = document.querySelector('.cities');
  const xp = document.querySelector('.xp');
  const cities = [...row.querySelectorAll('.city')];
  const buttons = cities.map((c) => c.querySelector('.scape'));
  const panels = cities.map((c) => c.querySelector('.panel'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = matchMedia('(max-width: 899px)'); // all three stack instead of sitting side by side

  // Open: null, one city's key, or 'all'.
  let open = null, pointer = 'mouse';

  // Panels side by side take the height of the tallest, so their tops line up.
  // Stacked (all open on a narrow screen), each sits on the one below it.
  // With all open, the page grows if the panels need more room than the screen.
  const level = () => {
    const stack = open === 'all' && narrow.matches;
    row.style.setProperty('--panel-h', '0px');
    const heights = panels.map((p) => p.offsetHeight);
    let lift = 0;
    for (let i = panels.length - 1; i >= 0; i--) {
      panels[i].style.setProperty('--lift', (stack ? lift : 0) + 'px');
      lift += heights[i];
    }
    const tallest = Math.max(...heights);
    if (!stack) row.style.setProperty('--panel-h', tallest + 'px');
    if (open === 'all') stage.style.setProperty('--need', (stack ? lift : tallest) + row.offsetHeight + 24 + 'px');
    else stage.style.removeProperty('--need');
  };
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

  const render = () => {
    const all = open === 'all';
    stage.classList.toggle('focus', open !== null);
    stage.classList.toggle('all', all);
    xp.setAttribute('aria-expanded', String(all));
    const on = cities.map((c) => all || c.dataset.city === open);
    cities.forEach((c, i) => {
      c.classList.toggle('on', on[i]);
      c.classList.toggle('open', on[i]);
      c.classList.toggle('from-l', !all && !!on[i - 1]);
      c.classList.toggle('from-r', !all && !!on[i + 1]);
      buttons[i].setAttribute('aria-expanded', String(on[i]));
      panels[i].inert = !on[i];
    });
    level();
    flights.forEach((fs, i) => fs.forEach((f) => launch(f, on[i])));
  };
  const show = (key) => { if (open !== key) { open = key; render(); } };
  const hide = () => { if (open !== null) { open = null; render(); } };
  render();

  addEventListener('pointerdown', (e) => { pointer = e.pointerType; }, true);
  xp.addEventListener('click', () => (open === 'all' ? hide() : show('all')));
  cities.forEach((c, i) => {
    const key = c.dataset.city;
    // Hover previews one city, but never breaks up the all-cities view; a click does.
    c.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && open !== 'all') show(key); });
    buttons[i].addEventListener('click', () => { if (pointer !== 'mouse' && open === key) hide(); else show(key); });
    panels[i].addEventListener('click', () => { if (open === 'all' && getSelection().isCollapsed) show(key); });
    buttons[i].addEventListener('focus', () => { if (buttons[i].matches(':focus-visible')) show(key); });
    buttons[i].addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      buttons[(i + d + buttons.length) % buttons.length].focus();
    });
  });
  row.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && open !== 'all') hide(); });
  row.addEventListener('focusout', (e) => { if (!row.contains(e.relatedTarget) && e.relatedTarget !== xp) hide(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  addEventListener('click', (e) => { if (!row.contains(e.target) && !xp.contains(e.target)) hide(); });
})();
