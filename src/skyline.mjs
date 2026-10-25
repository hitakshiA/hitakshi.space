// Draws the three city skylines as flat front elevations.
// Every landmark is drawn once, in local coordinates (centre x = 0, ground y = G),
// then placed and scaled into a city. Each city is a stack of layers (back to
// front). A layer is one path: solids wind clockwise, openings counter-clockwise,
// so nonzero fill merges solids and cuts the openings.
export const W = 480, G = 184;
const f = (n) => +n.toFixed(2);

class Shape {
  constructor() { this.d = []; this.l = []; this.ox = 0; this.k = 1; }
  // place the next landmark: centre at x = ox, scaled by k from the ground up
  at(ox, k = 1) { this.ox = ox; this.k = k; return this; }
  X(x) { return f(this.ox + this.k * x); }
  Y(y) { return f(G - this.k * (G - y)); }
  S(v) { return f(this.k * v); }
  // a path from absolute local points: ['M', x, y, 'C', x, y, x, y, x, y, 'Z']
  P(cmds) {
    let out = '', x = null;
    for (const t of cmds) {
      if (typeof t === 'string') { out += t; continue; }
      if (x === null) { x = t; continue; }
      out += (/[\d.]$/.test(out) ? ' ' : '') + this.X(x) + ' ' + this.Y(t);
      x = null;
    }
    return out;
  }
  // solids (clockwise)
  rect(cx, top, bot, hw) { this.d.push(`M${this.X(cx - hw)} ${this.Y(top)}H${this.X(cx + hw)}V${this.Y(bot)}H${this.X(cx - hw)}Z`); return this; }
  span(x1, x2, top, bot = G) { return this.rect((x1 + x2) / 2, top, bot, (x2 - x1) / 2); }
  trap(cx, top, bot, hwTop, hwBot) { this.d.push(this.P(['M', cx - hwTop, top, 'L', cx + hwTop, top, 'L', cx + hwBot, bot, 'L', cx - hwBot, bot, 'Z'])); return this; }
  tri(cx, top, bot, hw) { this.d.push(this.P(['M', cx, top, 'L', cx + hw, bot, 'L', cx - hw, bot, 'Z'])); return this; }
  circle(cx, cy, r) { const R = this.S(r); this.d.push(`M${this.X(cx - r)} ${this.Y(cy)}A${R} ${R} 0 1 1 ${this.X(cx + r)} ${this.Y(cy)}A${R} ${R} 0 1 1 ${this.X(cx - r)} ${this.Y(cy)}Z`); return this; }
  // onion dome: neck at base, swells past the base, ends in a point
  onion(cx, base, top, hw, swell = 1.18, neck = 0.86) {
    const h = base - top;
    this.d.push(this.P(['M', cx - hw * neck, base, 'C', cx - hw * swell, base - h * 0.3, cx - hw * 1.02, base - h * 0.78, cx, top,
      'C', cx + hw * 1.02, base - h * 0.78, cx + hw * swell, base - h * 0.3, cx + hw * neck, base, 'Z']));
    return this;
  }
  // round dome
  dome(cx, base, top, hw, point = 0) {
    const h = base - top - point;
    this.d.push(this.P(['M', cx - hw, base, 'C', cx - hw, base - h * 0.62, cx - hw * 0.55, base - h, cx, top,
      'C', cx + hw * 0.55, base - h, cx + hw, base - h * 0.62, cx + hw, base, 'Z']));
    return this;
  }
  // tiered, pointed turret cap
  cap(cx, base, top, hw) {
    const h = base - top;
    this.d.push(this.P(['M', cx - hw, base, 'C', cx - hw, base - h * 0.45, cx - hw * 0.35, base - h * 0.7, cx, top,
      'C', cx + hw * 0.35, base - h * 0.7, cx + hw, base - h * 0.45, cx + hw, base, 'Z']));
    return this;
  }
  // a lotus petal: pointed, its tip pushed sideways by `lean`
  petal(cx, base, apex, hw, lean = 0) {
    const h = base - apex, t = cx + lean;
    this.d.push(this.P(['M', cx - hw, base, 'C', cx - hw, base - h * 0.5, t - hw * 0.32, apex + h * 0.24, t, apex,
      'C', t + hw * 0.32, apex + h * 0.24, cx + hw, base - h * 0.5, cx + hw, base, 'Z']));
    return this;
  }
  petalLine(cx, base, apex, hw, lean = 0) {
    const h = base - apex, t = cx + lean;
    this.l.push(this.P(['M', cx - hw, base, 'C', cx - hw, base - h * 0.5, t - hw * 0.32, apex + h * 0.24, t, apex,
      'C', t + hw * 0.32, apex + h * 0.24, cx + hw, base - h * 0.5, cx + hw, base]));
    return this;
  }
  finial(cx, base, top, w = 1.2, knob = 0) {
    this.rect(cx, top, base, w / 2);
    if (knob) this.circle(cx, top + knob, knob);
    return this;
  }
  poly(pts) { this.d.push(this.P(['M', ...pts.flatMap(([x, y], i) => (i ? ['L', x, y] : [x, y])), 'Z'])); return this; }
  // battlements along a wall top
  merlons(x1, x2, top, step = 4.6, w = 2.4, h = 3.2) {
    for (let x = x1; x <= x2 + 0.01; x += step) this.rect(x, top - h, top + 0.5, w / 2);
    return this;
  }
  // openings (counter-clockwise). Round when apex is omitted, pointed otherwise.
  arch(cx, hw, spring, bot, apex) {
    const S = this.S.bind(this);
    let top;
    if (apex == null) top = `A${S(hw)} ${S(hw)} 0 0 0 ${this.X(cx - hw)} ${this.Y(spring)}`;
    else {
      const h = spring - apex, R = (hw * hw + h * h) / (2 * hw);
      top = `A${S(R)} ${S(R)} 0 0 0 ${this.X(cx)} ${this.Y(apex)}A${S(R)} ${S(R)} 0 0 0 ${this.X(cx - hw)} ${this.Y(spring)}`;
    }
    this.d.push(`M${this.X(cx + hw)} ${this.Y(bot)}V${this.Y(spring)}${top}V${this.Y(bot)}Z`);
    return this;
  }
  // detail lines (stroked, not filled)
  line(x1, y1, x2, y2) { this.l.push(this.P(['M', x1, y1, 'L', x2, y2])); return this; }
  hline(x1, x2, y) { return this.line(x1, y, x2, y); }
  vline(x, y1, y2) { return this.line(x, y1, x, y2); }
  curve(...pts) { this.l.push(this.P(['M', pts[0], pts[1], 'C', ...pts.slice(2)])); return this; }
  arcLine(cx, hw, spring, apex) {
    const S = this.S.bind(this);
    if (apex == null) this.l.push(`M${this.X(cx - hw)} ${this.Y(spring)}A${S(hw)} ${S(hw)} 0 0 1 ${this.X(cx + hw)} ${this.Y(spring)}`);
    else {
      const h = spring - apex, R = (hw * hw + h * h) / (2 * hw);
      this.l.push(`M${this.X(cx - hw)} ${this.Y(spring)}A${S(R)} ${S(R)} 0 0 1 ${this.X(cx)} ${this.Y(apex)}A${S(R)} ${S(R)} 0 0 1 ${this.X(cx + hw)} ${this.Y(spring)}`);
    }
    return this;
  }
  ring(cx, cy, r) { const R = this.S(r); this.l.push(`M${this.X(cx - r)} ${this.Y(cy)}A${R} ${R} 0 1 1 ${this.X(cx + r)} ${this.Y(cy)}A${R} ${R} 0 1 1 ${this.X(cx - r)} ${this.Y(cy)}`); return this; }
  out() { return { d: this.d.join(''), l: this.l.join('') }; }
}
const both = (fn) => { fn(1); fn(-1); };

/* ---------------- LANDMARKS (local: centre 0, ground G) ---------------- */
const L = {
  /* Delhi */
  qutub(m) { // Qutub Minar: five tapering, fluted storeys with balconies
    m.trap(0, 150, G, 6, 7.2).rect(0, 147, 150.5, 8.6)
     .trap(0, 118, 147, 4.9, 5.7).rect(0, 115.5, 118.5, 7.1)
     .trap(0, 93, 115.5, 3.9, 4.5).rect(0, 90.5, 93, 6)
     .trap(0, 79, 90.5, 3.1, 3.5).rect(0, 77, 79, 4.6)
     .rect(0, 72, 77, 2.9).dome(0, 72, 66, 3.6).finial(0, 66, 61, 0.9);
    for (const dx of [-3.6, 0, 3.6]) m.vline(dx, 152, 182);
    for (const dx of [-2.6, 0, 2.6]) m.vline(dx, 120, 145);
    m.hline(-6.4, 6.4, 162).hline(-6.2, 6.2, 172).hline(-4.2, 4.2, 104);
  },
  qutubScreen(m, { hw = 18 } = {}) { // the arched screen of the Quwwat-ul-Islam mosque, beside the minar
    m.rect(0, 160, G, hw);
    m.arch(0, 5.5, 172, G, 165);
    for (const dx of [-hw + 5.5, hw - 5.5]) if (Math.abs(dx) > 10) m.arch(dx, 3, 176, G, 172);
    m.arcLine(0, 8, 172, 162.5).hline(-hw, hw, 164);
  },
  humayun(m) { // Humayun's Tomb: arcaded plinth, iwan, chhatris, onion dome
    m.rect(0, 166, G, 44);
    for (const dx of [-36, -24, -12, 0, 12, 24, 36]) m.arch(dx, 3.4, 177.5, G, 172.5);
    m.rect(0, 139, 166, 26);
    m.arch(0, 7, 158, 166, 147);
    for (const dx of [-17.5, 17.5]) { m.arch(dx, 3, 151, 157, 147.5); m.arch(dx, 3, 162.5, 166, 159.5); }
    m.rect(0, 136, 139.5, 27.5);
    both((k) => { m.rect(k * 21, 131, 136.5, 4.4).dome(k * 21, 131.2, 124, 5.2).finial(k * 21, 124.4, 120.5, 0.8); });
    m.rect(0, 127, 136.5, 12.5).onion(0, 127.4, 99, 15.5).finial(0, 99.5, 92, 1, 1.4);
    m.arcLine(0, 10, 160, 144).hline(-44, 44, 170.5);
  },
  indiaGate(m) {
    m.trap(0, 176, G, 64, 67);          // plinth steps
    m.trap(0, 87, 176.5, 57.5, 62);     // main body, slight batter
    m.arch(0, 15.5, 119, 176.5);        // the arch
    m.rect(0, 81.5, 87.5, 61.5);        // cornice
    m.rect(0, 74, 82, 52.5);            // attic, stepped
    m.rect(0, 67.5, 74.5, 49);
    m.rect(0, 53.5, 68, 39.5);
    m.rect(0, 49.5, 54, 21);
    m.dome(0, 50, 44.5, 14);            // the shallow bowl on top
    m.arcLine(0, 20, 119);
    both((s) => {
      m.ring(s * 39, 103, 5.6);
      m.hline(s * 58.6, s * 15.5, 120).hline(s * 59.4, s * 15.5, 137);
      m.vline(s * 36, 121, 136).vline(s * 36, 139, 175);
    });
    m.hline(-31, 31, 58).hline(-31, 31, 64).hline(-57, 57, 92);
  },
  lotus(m) { // Lotus Temple: podium, then three rings of petals
    m.trap(0, 178, G, 50, 55).rect(0, 172, 178.5, 46);
    // the entrance petals, curling outward at the foot
    m.d.push(m.P(['M', -44, 172.5, 'C', -47, 165, -50, 157, -55, 149, 'C', -42, 152, -29, 160, -22, 172.5, 'Z']));
    m.d.push(m.P(['M', 22, 172.5, 'C', 29, 160, 42, 152, 55, 149, 'C', 50, 157, 47, 165, 44, 172.5, 'Z']));
    for (const [x, apex, hw, lean] of [[-35, 142, 12, -7], [35, 142, 12, 7], [-25, 127, 14, -4], [25, 127, 14, 4], [-12.5, 115, 15, -1.5], [12.5, 115, 15, 1.5], [0, 106, 15, 0]]) m.petal(x, 172.5, apex, hw, lean);
    m.petalLine(0, 172.5, 106, 15).petalLine(-25, 172.5, 127, 14, -4).petalLine(25, 172.5, 127, 14, 4);
    m.curve(-22, 172.5, -26, 164, -32, 158, -38, 155).curve(22, 172.5, 26, 164, 32, 158, 38, 155);
    m.hline(-46, 46, 175);
  },
  redFort(m) { // Lahori Gate: crenellated wall, gate block, octagonal towers with chhatris
    m.rect(0, 148, G, 34).merlons(-32, 32, 148);
    both((s) => { m.rect(s * 34, 140, G, 5).merlons(s * 34 - 3.6, s * 34 + 3.6, 140, 3.6, 2, 2.6); });   // corner bastions
    both((s) => {
      const x = s * 25;
      m.rect(x, 117, G, 7);                       // tower
      m.rect(x, 114, 117.5, 8.8);                 // chhajja
      m.rect(x, 106, 114.5, 6).arch(x, 2.4, 111.5, 114.5);
      m.rect(x, 103.5, 106.5, 7.2);
      m.onion(x, 103.9, 92, 6.4, 1.12, 0.9).finial(x, 92.5, 87, 0.8, 1);
      m.vline(x - 3.5, 120, 182).vline(x + 3.5, 120, 182);
    });
    m.rect(0, 124, G, 18.5).rect(0, 121, 124.5, 20).rect(0, 116.5, 121.5, 16.5);
    for (const x of [-12, -6, 0, 6, 12]) m.dome(x, 116.9, 110.5, 2.7).finial(x, 111, 108, 0.6);
    m.arch(0, 7.5, 160, G, 146);
    m.arcLine(0, 11, 160, 142);
    m.hline(-18.5, 18.5, 131).hline(-29, -32, 160).hline(29, 32, 160);
  },

  /* Mumbai */
  seaLink(m, { left = 78, right = 74, ramp = 24, fan = 64, cables = 11 } = {}) { // Bandra–Worli Sea Link: one inverted-Y pylon, cable fans, and the approach ramp up from the shore
    const D = 163, a = -left + ramp;
    m.span(a, right, D, D + 4.5);
    m.poly([[-left, G], [-left, G - 2.5], [a, D], [a, D + 4.5], [-left + ramp * 0.4, G]]);
    m.line(-left + 2, G - 3.2, a, D + 1.6);
    for (const x of [-64, -36, 36, 62]) if (x > a + 4 && x < right) m.rect(x, D + 4, G, 2.2);
    m.poly([[-1.8, 44], [1.8, 44], [3.2, 104], [9.5, D + 0.5], [6, D + 0.5], [0, 116], [-6, D + 0.5], [-9.5, D + 0.5], [-3.2, 104]]);
    m.rect(0, D + 4, G, 4.5);
    for (let i = 0; i < cables; i++) {
      const u = i / (cables - 1), y = 50 + u * 52, reach = fan - u * (fan - 22);
      m.line(0, y, -reach, D).line(0, y, reach, D);
    }
  },
  gateway(m) { // Gateway of India
    m.rect(0, 115, G, 80).rect(0, 132, 140.5, 86.5).rect(0, 109.5, 115.5, 82);
    m.rect(0, 92, 132.5, 38).rect(0, 88, 92.5, 40);
    m.arch(0, 17, 160, G, 139);
    both((s) => {
      const x = s * 30;
      m.rect(x, 79, 88.5, 6).rect(x, 76, 79.5, 7.4);
      m.cap(x, 76.5, 63.5, 7).finial(x, 64, 58.5, 0.9, 1.1);
      m.arch(s * 59, 5.4, 169.5, G, 163);
      m.arcLine(s * 59, 12.5, 159, 145);
      m.vline(s * 23.5, 141, 183).vline(s * 36.5, 141, 183);
      for (const k of [0, 1, 2, 3]) m.vline(s * (6 + k * 6.5), 117, 129);
      m.hline(s * 40, s * 80, 125);
    });
    m.arcLine(0, 22, 160, 134).hline(-38, 38, 115).hline(-38, 38, 100);
  },
  taj(m) { // Taj Mahal Palace hotel: the long front, red central dome, corner domes, gables
    m.rect(0, 122, G, 58).rect(0, 118, 122.5, 59.5);
    both((s) => {
      const x = s * 51;
      m.rect(x, 108, 118.5, 7).rect(x, 105.5, 108.5, 8.2);
      m.dome(x, 105.9, 93, 7.6, 1.6).finial(x, 93.4, 88, 0.7, 1);
      for (const g of [20, 35]) m.tri(s * g, 110, 118.5, 5);
      for (const g of [13, 29, 44]) m.vline(s * g, 124, 172);
    });
    m.rect(0, 97, 118.5, 13).rect(0, 93.5, 97.5, 15).rect(0, 88, 94, 12.5);
    m.dome(0, 88.4, 70, 14, 3).finial(0, 70.4, 61, 0.9, 1.3);
    m.arch(0, 4.2, 176, G);
    for (const y of [130, 142, 154, 166]) m.hline(-57, 57, y);
    for (let x = -50; x <= 50.1; x += 8.33) if (Math.abs(x) > 6) m.arcLine(x, 2.6, 180);
    m.hline(-12, 12, 104).arcLine(0, 5, 112);
  },
  worldOne(m) { // a supertall on the Lower Parel skyline
    m.rect(0, 66, G, 11).trap(0, 54, 66.5, 7, 11).rect(0, 50, 54.5, 4).finial(0, 50.5, 40, 0.9);
    for (const dx of [-5.5, 0, 5.5]) m.vline(dx, 70, 182);
    for (let y = 78; y < 182; y += 12) m.hline(-11, 11, y);
  },
  palais(m) {
    m.rect(0, 92, G, 9).rect(0, 88, 92.5, 7).cap(0, 88.5, 76, 7).finial(0, 76.5, 70, 0.8);
    for (let y = 98; y < 182; y += 7) m.hline(-9, 9, y);
  },
  midrise(m, { hw = 12, top = 128 } = {}) {
    m.rect(0, top, G, hw).rect(hw * 0.4, top - 5, top + 0.5, 3);
    for (let y = top + 6; y < 182; y += 8) m.hline(-hw, hw, y);
  },

  /* Bangalore */
  ubPoint(m) { // UB City: the tall tower with the pointed crown
    m.rect(0, 64, G, 13).rect(0, 58, 64.5, 11).tri(0, 36, 58.5, 11).finial(0, 37, 24, 1, 1.2);
    for (const dx of [-6.5, 0, 6.5]) m.vline(dx, 67, 182);
    for (let y = 74; y < 182; y += 12) m.hline(-13, 13, y);
    m.hline(-11, 11, 61);
  },
  ubCrown(m) { // UB City: the glass-crowned tower beside it
    m.rect(0, 104, G, 12.5).rect(0, 99, 104.5, 11).cap(0, 99.5, 83, 11).finial(0, 83.5, 76, 0.9);
    for (let y = 110; y < 182; y += 6) m.hline(-12.5, 12.5, y);
    m.vline(0, 104, 182);
  },
  vidhana(m, { wing = 124 } = {}) { // Vidhana Soudha
    m.rect(0, 142, G, wing);
    for (let x = 66; x <= wing - 6; x += 8.6) both((s) => m.rect(s * x, 138.5, 142.5, 1.1));
    both((s) => {
      const x = s * wing;
      m.rect(x, 128, G, 9.5).rect(x, 125, 128.5, 8).onion(x, 125.4, 111, 7.6, 1.12, 0.9).finial(x, 111.5, 106.5, 0.8, 1);
      for (let k = 66; k < wing - 12; k += 9) {
        m.arcLine(s * (k + 4.5), 3, 155).vline(s * (k + 1.5), 155, 163).vline(s * (k + 7.5), 155, 163);
        m.arcLine(s * (k + 4.5), 2.4, 172).vline(s * (k + 2.1), 172, 181).vline(s * (k + 6.9), 172, 181);
      }
      m.hline(s * 62, s * (wing - 10), 148).hline(s * 62, s * (wing - 10), 166);
    });
    m.rect(0, 120, G, 57).rect(0, 115.5, 120.5, 60).trap(0, 176, G, 54, 66);
    m.hline(-57, 57, 179).hline(-61, 61, 181.5);
    for (const x of [5, 14, 23, 32, 41, 50]) both((s) => m.vline(s * x, 123, 175.5));
    m.hline(-57, 57, 124.5);
    both((s) => {
      const x = s * 50;
      m.rect(x, 101, 116, 10.5).rect(x, 98, 101.5, 9).onion(x, 98.4, 79, 11, 1.14, 0.9).finial(x, 79.5, 73, 0.9, 1.2);
      m.arcLine(x, 4, 110).vline(x - 4, 110, 114).vline(x + 4, 110, 114);
    });
    m.rect(0, 105, 116, 30).rect(0, 101.5, 105.5, 32);
    for (let x = -28; x <= 28; x += 7) m.rect(x, 98.5, 102, 0.9);
    m.rect(0, 92, 102, 26);
    for (const x of [-18, -9, 0, 9, 18]) m.arcLine(x, 2.6, 100);
    m.onion(0, 92.4, 58, 28, 1.08, 0.94);
    m.curve(-13, 90, -15, 76, -9, 66, 0, 59).curve(13, 90, 15, 76, 9, 66, 0, 59);
    m.rect(0, 53, 58.5, 5.6).rect(0, 50.5, 53.5, 7.4);
    // the Lion Capital: three lions, back to back
    m.d.push(m.P(['M', -7, 50.8, 'C', -7, 46, -5.5, 44.5, -3.6, 44.6, 'C', -2.8, 41.6, -1.4, 40.4, 0, 40.4,
      'C', 1.4, 40.4, 2.8, 41.6, 3.6, 44.6, 'C', 5.5, 44.5, 7, 46, 7, 50.8, 'Z']));
    m.hline(-30, 30, 109.5);
  },
  palace(m) { // Bangalore Palace: Tudor battlements, square towers, the tall turret
    m.rect(0, 142, G, 50).merlons(-48, 48, 142);
    both((s) => {
      const c = s * 47;                                       // corner turrets with cones
      m.rect(c, 128, G, 5.5).tri(c, 110, 128.5, 6.5).finial(c, 110.5, 104, 0.7);
      const t = s * 25;                                       // square towers
      m.rect(t, 118, 142.5, 9).rect(t, 115, 118.5, 10.5).merlons(t - 8.4, t + 8.4, 115, 4.2, 2.2, 3);
      m.arcLine(t, 2.4, 128, 124.5).vline(t - 2.4, 128, 134).vline(t + 2.4, 128, 134);
      for (const x of [9, 16, 34, 41]) m.arcLine(s * x, 2, 154, 150.5).arcLine(s * x, 2, 170, 166.5);
    });
    m.rect(0, 96, 142.5, 6.5).rect(0, 92.5, 96.5, 8).merlons(-6, 6, 92.5, 4, 2, 3);  // the tall turret
    m.rect(0, 80, 89.8, 3).dome(0, 80.3, 74, 3.4).finial(0, 74.4, 69, 0.6);
    m.arch(0, 4.5, 172, G, 165).arcLine(0, 7, 172, 162);
    m.vline(-2.5, 102, 112).vline(2.5, 102, 112).hline(-50, 50, 160);
  },
  techPark(m) { // a glass office tower with a raked top
    m.poly([[-14, 74], [14, 62], [14, G], [-14, G]]);
    for (const dx of [-9.3, -4.7, 0, 4.7, 9.3]) m.vline(dx, 76, 182);
    for (let y = 88; y < 182; y += 14) m.hline(-14, 14, y);
  },

  /* joins: low walls and terraces so neighbours read as one city */
  wall(m, { hw = 10, h = 12, crenel = false, rail = true } = {}) {
    m.rect(0, G - h, G, hw);
    if (crenel) m.merlons(-hw + 1.6, hw - 1.6, G - h, 4.4, 2.2, 2.6);
    if (rail) m.hline(-hw, hw, G - h + 3.5);
  },
};

// places: [landmark, x, scale, layer (0 back, 1 front), options]
function compose(places, depth = 2) {
  const layers = Array.from({ length: depth }, () => new Shape());
  for (const [name, x, k = 1, layer = 1, opt] of places) L[name](layers[layer].at(x, k), opt);
  return layers.map((s) => s.out());
}

export const CITIES = {
  delhi: {
    layers: compose([
      ['qutub', 30, 1.2, 0], ['qutubScreen', 60, 1, 0, { hw: 20 }],
      ['humayun', 124, 1, 0], ['wall', 171, 1, 0, { hw: 5, h: 10 }],
      ['indiaGate', 240, 1, 1],
      ['lotus', 350, 1, 0],
      ['redFort', 428, 1, 1],                 // bastions end at 467, clear of the city edge
    ]),
    clear: [[222, 258], [418, 438]],
    clearM: [[230, 262]],
    mobile: compose([
      ['qutub', 156, 0.95, 0], ['wall', 176, 0.86, 0, { hw: 14, h: 12 }],
      ['indiaGate', 246, 0.86, 1],
      ['lotus', 316, 0.46, 0],
    ]),
  },
  mumbai: {
    layers: compose([
      ['seaLink', 82, 1, 0, { left: 74, right: 76, ramp: 24, fan: 50 }],
      ['gateway', 198, 0.82, 1],
      ['taj', 330, 1, 0],
      ['midrise', 400, 1, 0, { hw: 12, top: 132 }],
      ['worldOne', 430, 1, 0],
      ['palais', 462, 1, 1],
    ]),
    clear: [[182, 214], [143, 157], [239, 253]],
    clearM: [[236, 268]],
    mobile: compose([
      ['seaLink', 168, 0.66, 0, { left: 40, right: 60, ramp: 16, fan: 38, cables: 6 }],
      ['gateway', 252, 0.78, 1],
      ['worldOne', 330, 0.7, 0],
    ]),
  },
  bangalore: {
    layers: compose([
      ['palace', 58, 1.05, 0],                // clear of the Vidhana Soudha wing, so outlines never double
      ['wall', 122, 1, 0, { hw: 10, h: 10 }],
      ['vidhana', 222, 1, 1, { wing: 92 }],
      ['wall', 326, 1, 0, { hw: 12, h: 10 }],
      ['techPark', 352, 1, 0],
      ['ubCrown', 404, 1, 0], ['ubPoint', 442, 1, 1],
      ['wall', 470, 1, 0, { hw: 16, h: 10 }],
    ]),
    clear: [[50, 66]],
    clearM: [],
    mobile: compose([
      ['palace', 167, 0.5, 0],
      ['vidhana', 246, 0.8, 1, { wing: 70 }],
      ['ubPoint', 326, 0.72, 0],
    ]),
  },
};

/* ---------------- THE CITY BETWEEN ----------------
   One continuous strip of low-rise rooftops along a shared horizon, drawn
   behind all three cities so the skyline runs from Delhi to Bangalore without
   a break. `span` is the width of one city in the shared horizon; each city
   takes its own slice, shifted into its local coordinates. */
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

export function fabric(span, offset, cityIndex, seed = 7, clear = []) {
  const r = rng(seed), out = new Shape();
  const total = span * 3, JOIN = 16;
  const profile = (gx) => {
    const zone = Math.min(2, Math.max(0, Math.floor(gx / span)));
    const t = (gx - zone * span) / span;
    const edge = Math.min(1, Math.min(t, 1 - t) / 0.16);
    const peak = [24, 54, 36][zone];
    return { zone, h: JOIN + (peak - JOIN) * edge * edge };
  };
  let gx = -24;
  const blocks = [];
  while (gx < total + 24) {
    const { zone, h } = profile(gx);
    const w = zone === 1 ? 7 + r() * 9 : 9 + r() * 13;
    const bh = Math.max(9, h * (0.62 + r() * 0.5));
    blocks.push({ x: gx, w, h: bh, zone, k: r() });
    gx += w + (r() < 0.18 ? 1.5 + r() * 3 : 0);
  }
  const lo = cityIndex * span, hi = lo + span;
  for (const b of blocks) {
    if (b.x + b.w < lo - 30 || b.x > hi + 30) continue;
    const x = b.x - lo + offset, top = G - b.h, cx = x + b.w / 2;
    if (clear.some(([a, z]) => x < z && x + b.w > a)) continue;   // keep arches open to the sky
    out.rect(cx, top, G, b.w / 2);
    if (b.zone === 0 && b.k > 0.72 && b.w > 11) out.dome(cx, top + 0.4, top - b.w * 0.42, b.w * 0.3);
    else if (b.zone === 0 && b.k < 0.2) out.rect(cx, top - 3, top + 0.5, b.w * 0.3);
    else if (b.zone === 1 && b.k > 0.6) out.rect(cx, top - 4, top + 0.5, b.w * 0.32);
    else if (b.zone === 2 && b.k > 0.66) out.poly([[x + 1, top + 0.5], [x + b.w - 1, top - 4], [x + b.w - 1, top + 0.5]]);
    else if (b.k < 0.14) out.rect(x + b.w * 0.72, top - 3.5, top + 0.5, 1.8);
  }
  return out.out();
}
