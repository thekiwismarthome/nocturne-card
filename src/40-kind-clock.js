/* ============ clock: digital and analogue ============ */
const CLK_DAY = '#ffc15a', CLK_NIGHT = '#9aa7ff';

/* time in the chosen zone: formatters are cached on the card until the settings change */
function clkFmt(c) {
  const h = c._hass, o = c.o, loc = (h.locale && h.locale.language) || navigator.language || 'en';
  const zone = o.timezone || (h.locale && h.locale.time_zone === 'server' && h.config && h.config.time_zone) || undefined;
  const tf = h.locale && h.locale.time_format;
  const key = [loc, zone, o.hour_format, tf].join('|');
  if (c._fk === key) return c._fm;
  let tz = zone, bad = false;
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); } catch (e) { tz = undefined; bad = true; }
  const h12 = o.hour_format === '12' ? true : o.hour_format === '24' ? false : tf === '12' ? true : tf === '24' ? false : !!new Intl.DateTimeFormat(loc, { hour: 'numeric' }).resolvedOptions().hour12;
  const num = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
  const dp = new Intl.DateTimeFormat(loc, { timeZone: tz, hour: 'numeric', hour12: true });
  const long = new Intl.DateTimeFormat(loc, { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' });
  const short = new Intl.DateTimeFormat(loc, { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' });
  const wk = new Intl.DateTimeFormat(loc, { timeZone: tz, weekday: 'short' }), dn = new Intl.DateTimeFormat(loc, { timeZone: tz, day: 'numeric' });
  const abbr = new Intl.DateTimeFormat(loc, { timeZone: tz, timeZoneName: 'short' });
  const parts = d => Object.fromEntries(num.formatToParts(d).map(x => [x.type, +x.value]));
  const period = d => (dp.formatToParts(d).find(x => x.type === 'dayPeriod') || {}).value || '';
  const pad = n => String(n).padStart(2, '0');
  const hm = d => { const p = parts(d); return h12 ? `${p.hour % 12 || 12}:${pad(p.minute)} ${period(d)}` : `${pad(p.hour)}:${pad(p.minute)}`; };
  c._fk = key;
  return c._fm = { tz, bad, h12, parts, period, pad, hm, long: d => long.format(d), short: d => short.format(d), wk: d => wk.format(d).toUpperCase(), dn: d => dn.format(d), abbr: d => (abbr.formatToParts(d).find(x => x.type === 'timeZoneName') || {}).value || '' };
}

/* the remaining time of a timer entity as H:MM:SS or M:SS */
function clkRemain(c, id, now) {
  const s = c.S(id); if (!s) return null;
  let sec = null;
  if (s.state === 'active' && s.attributes.finishes_at) sec = Math.max(0, Math.ceil((Date.parse(s.attributes.finishes_at) - now) / 1000));
  else if (s.state === 'paused' && s.attributes.remaining) { const m = String(s.attributes.remaining).split(':').map(Number); if (m.length === 3) sec = m[0] * 3600 + m[1] * 60 + Math.floor(m[2]); }
  if (sec == null || isNaN(sec)) return null;
  const hh = Math.floor(sec / 3600), mm = Math.floor(sec % 3600 / 60), ss = sec % 60, p2 = n => String(n).padStart(2, '0');
  return { text: hh ? `${hh}:${p2(mm)}:${p2(ss)}` : `${mm}:${p2(ss)}`, paused: s.state === 'paused' };
}

/* day or night, by the sun, or by the hour when the clock shows another time zone */
function clkNight(c, F) {
  if (!c.o.timezone) { const s = c.st('sun.sun'); if (s) return s === 'below_horizon'; }
  const hr = F.parts(new Date()).hour; return hr < 6 || hr >= 19;
}

function clkDial(o, wide) {
  const mk = o.markers, X = (r, a) => [(100 + r * Math.sin(a * Math.PI / 180)).toFixed(2), (100 - r * Math.cos(a * Math.PI / 180)).toFixed(2)];
  let g = '';
  if (mk !== 'dots') for (let i = 0; i < 60; i++) { const hr = i % 5 === 0, a = i * 6; if (mk === 'numbers' && hr) continue; const p = X(hr ? 80 : 85, a), q = X(90, a); g += `<line class="${hr ? 'mj' : 'mn'}" x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}"/>`; }
  if (mk === 'dots') for (let i = 0; i < 12; i++) { const p = X(84, i * 30); g += `<circle class="dot${i % 3 ? '' : ' q'}" cx="${p[0]}" cy="${p[1]}" r="${i % 3 ? 2.4 : 3.8}"/>`; }
  if (mk === 'numbers') for (let i = 1; i <= 12; i++) { const p = X(72, i * 30); g += `<text class="nb" x="${p[0]}" y="${p[1]}">${i}</text>`; }
  return `<svg viewBox="0 0 200 200" aria-hidden="true"><circle class="face" cx="100" cy="100" r="97"/>${o.ring ? '<circle class="ring" cx="100" cy="100" r="93" pathLength="1" transform="rotate(-90 100 100)"/>' : ''}${g}
    ${o.show_date && !wide ? '<text class="dw" x="100" y="140" data-dw></text>' : ''}${wide ? '' : '<text class="lb" x="100" y="68" data-lbl></text>'}
    <g class="h hr" data-hr><line x1="100" y1="108" x2="100" y2="56"/></g><g class="h mi" data-mi><line x1="100" y1="110" x2="100" y2="32"/></g>
    ${o.show_seconds ? '<g class="h se" data-se><line x1="100" y1="120" x2="100" y2="20"/><circle cx="100" cy="100" r="4.5"/></g>' : ''}<circle class="cap" cx="100" cy="100" r="5"/></svg>`;
}

function clkTick(c) {
  const r = c.shadowRoot, el = r && r.querySelector('.clk'); if (!el || !c._hass) return;
  const o = c.o, F = clkFmt(c), now = Date.now(), d = new Date(now), p = F.parts(d), set = (sel, v) => { const n = el.querySelector(sel); if (n && n.dataset.v !== v) { n.dataset.v = v; n.innerHTML = v; } };
  const tm = F.h12 ? `${p.hour % 12 || 12}` : F.pad(p.hour);
  const secs = o.show_seconds ? `<small class="sc">${F.pad(p.second)}</small>` : '', ap = F.h12 ? `<small class="ap">${F.period(d)}</small>` : '';
  set('[data-tm]', `${tm}<i class="co${o.blink ? ' bl' : ''}">:</i>${F.pad(p.minute)}${secs}${ap}`);
  set('[data-dt]', el.classList.contains('wide') && !el.classList.contains('an') ? F.long(d) : F.short(d));
  const nt = clkNight(c, F), want = o.tint ? (nt ? CLK_NIGHT : CLK_DAY) : '';
  if (el.dataset.nt !== String(nt)) { el.dataset.nt = String(nt); el.classList.toggle('night', nt); el.style.setProperty('--lc', want || 'var(--accent-color)'); }
  const tmr = o.timer_entity && clkRemain(c, o.timer_entity, now), tn = el.querySelector('[data-tmr]');
  if (tn) { tn.closest('.pchip').hidden = !tmr; if (tmr) { tn.textContent = tmr.text; tn.closest('.pchip').classList.toggle('pz', tmr.paused); } }
  const al = el.querySelector('[data-al]');
  if (al) { const t = o.alarm_entity && Date.parse(c.st(o.alarm_entity)); const ok = t && t > now; al.closest('.pchip').hidden = !ok; if (ok) { const a = new Date(t); al.textContent = (F.dn(a) !== F.dn(d) ? F.wk(a) + ' ' : '') + F.hm(a); } }
  const lbl = el.querySelector('[data-lbl]'); if (lbl && !lbl.dataset.v) { lbl.dataset.v = '1'; lbl.textContent = (c.cfg.name || '').toUpperCase(); }
  const dw = el.querySelector('[data-dw]'); if (dw) dw.textContent = tmr && el.classList.contains('an') && !el.classList.contains('wide') ? tmr.text : `${F.wk(d)} ${F.dn(d)}`;
  const hr = el.querySelector('[data-hr]');
  if (hr) {
    const ms = o.smooth ? d.getMilliseconds() : 0, sec = p.second + ms / 1000, min = p.minute + sec / 60, hh = (p.hour % 12) + min / 60;
    const first = !el.dataset.init; if (first) el.classList.add('noanim');
    let sa = sec * 6; if (c._sp != null && sa < c._sp - 1) c._turn = (c._turn || 0) + 1; c._sp = sa; sa += (c._turn || 0) * 360;
    hr.style.transform = `rotate(${hh * 30}deg)`; el.querySelector('[data-mi]').style.transform = `rotate(${min * 6}deg)`;
    const se = el.querySelector('[data-se]'); if (se) se.style.transform = `rotate(${sa}deg)`;
    const rg = el.querySelector('.ring'); if (rg) rg.style.strokeDashoffset = String(1 - sec / 60);
    if (first) { el.dataset.init = '1'; void el.offsetWidth; requestAnimationFrame(() => el.classList.remove('noanim')); }
  }
}

kind({
  id: 'clock', name: 'Clock', domains: null, noEntity: true, noIcon: true, icon: 'clock-outline', grid: { columns: 6, rows: 3 }, tap: { action: 'none' }, hold: { action: 'none' },
  square: c => c.size !== 'wide',
  opts: [
    { k: 'variant', l: 'Clock face', t: 'seg', o: [['digital', 'Digital'], ['analog', 'Analogue']], d: 'digital' },
    SIZE,
    { k: 'timezone', l: 'Time zone, for example Pacific/Auckland (empty uses yours)', t: 'text' },
    { k: 'hour_format', l: 'Hours', t: 'seg', o: [['auto', 'From your profile'], ['12', '12 hour'], ['24', '24 hour']], d: 'auto' },
    { k: 'show_seconds', l: 'Seconds', t: 'sw', d: true },
    { k: 'show_date', l: 'Date', t: 'sw', d: true },
    { k: 'blink', l: 'Blinking colon', t: 'sw', d: true, when: c => c.variant !== 'analog' },
    { k: 'markers', l: 'Dial markers', t: 'seg', o: [['ticks', 'Ticks'], ['numbers', 'Numbers'], ['dots', 'Dots']], d: 'ticks', when: c => c.variant === 'analog' },
    { k: 'smooth', l: 'Sweeping second hand', t: 'sw', d: false, when: c => c.variant === 'analog' },
    { k: 'ring', l: 'Seconds ring around the dial', t: 'sw', d: true, when: c => c.variant === 'analog' },
    { k: 'tint', l: 'Warm by day and cool at night (follows sun.sun)', t: 'sw', d: true },
    { k: 'alarm_entity', l: 'Next alarm (a sensor whose state is a date and time)', t: 'entity', domains: ['sensor'] },
    { k: 'timer_entity', l: 'Timer to count down', t: 'entity', domains: ['timer'] },
  ],
  extraIds: () => ['sun.sun'],
  gridFor: () => ({ columns: 6, rows: 3 }),
  after(c) {
    clkTick(c);
    if (!c._clk) { c._clk = setInterval(() => clkTick(c), c.o.smooth && c.o.variant === 'analog' ? 60 : 250); c._subs.push(() => { clearInterval(c._clk); c._clk = null; }); }
  },
  render(c) {
    const o = c.o, wide = o.size === 'wide', analog = o.variant === 'analog', F = clkFmt(c), chips = [];
    if (o.alarm_entity) chips.push(`<span class="pchip" hidden>${icn('alarm', 15)}<b data-al></b></span>`);
    if (o.timer_entity) chips.push(`<span class="pchip" hidden>${icn('timer-sand', 15)}<b data-tmr></b></span>`);
    const zone = o.timezone ? `<span class="tz">${esc(F.bad ? 'Unknown time zone' : F.abbr(new Date()))}</span>` : '';
    const lab = c.cfg.name ? `<span class="lbl">${esc(c.cfg.name)}</span>` : '';
    const read = `<div class="tm" data-tm></div>${o.show_date ? '<div class="dt" data-dt></div>' : ''}`;
    const info = `<div class="info">${analog ? '' : lab}${zone}${chips.length ? `<div class="chs">${chips.join('')}</div>` : ''}</div>`;
    const cls = `clk ${analog ? 'an' : 'dg'} ${wide ? 'wide' : ''} ${o.tint ? 'tint' : ''} ${o.smooth ? 'sm' : ''}`;
    if (analog) return `<div class="nc ${cls}" style="--rows:3"><div class="cq"><div class="dial">${clkDial(o, wide)}</div>${wide ? `<div class="side">${lab}${read}${info}</div>` : ''}</div></div>`;
    return `<div class="nc ${cls}" style="--rows:3"><div class="cq"><div class="main">${read}</div>${info}</div></div>`;
  },
});
