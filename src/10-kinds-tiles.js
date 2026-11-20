/* ============ simple tiles: light, switch, fan, cover, sensor, camera, actions ============ */

/* ----- light ----- */
const lightInfo = (c, id) => {
  const s = c.S(id), a = (s && s.attributes) || {}, on = !!s && s.state === 'on', modes = a.supported_color_modes || [];
  const caps = modes.some(m => ['hs', 'xy', 'rgb', 'rgbw', 'rgbww'].includes(m)) ? 'color' : modes.some(m => ['brightness', 'color_temp'].includes(m)) ? 'dim' : 'onoff';
  const lv = on ? (a.brightness != null ? Math.max(1, Math.round(a.brightness / 2.55)) : 100) : 0;
  let col = '#ffc15a'; if (on && a.hs_color) col = hsv(a.hs_color[0], a.hs_color[1] / 100); else if (on && a.rgb_color) col = `rgb(${a.rgb_color.slice(0, 3)})`;
  return { s, a, on, caps, lv, col };
};
kind({
  id: 'light', square: c => c.variant !== 'wheel', name: 'Light', domains: ['light'], icon: 'lightbulb', grid: { columns: 6, rows: 3 }, tap: { action: 'toggle' }, hold: { action: 'popup' },
  opts: [{ k: 'variant', l: 'Layout', t: 'seg', o: [['tile', 'Tile'], ['wheel', 'Colour wheel card']], d: 'tile' }, { k: 'layout', l: 'Wheel card shape', t: 'seg', o: [['tall', 'Tall'], ['wide', 'Wide']], d: 'tall' }, SIZE, { k: 'show_slider', l: 'Brightness slider on the card', t: 'sw', d: true }, SHOW_STATE, ...SWITCH_OPTS],
  tapFor: c => c.o.variant === 'wheel' ? { action: 'none' } : { action: 'toggle' },
  holdFor: c => c.o.variant === 'wheel' ? { action: 'more-info' } : { action: 'popup' },
  gridFor: c => { if (c.o.variant !== 'wheel') return { columns: 6, rows: 3 }; const i = lightInfo(c, c.e), wide = c.o.layout === 'wide'; return wide ? { columns: 'full', rows: i.caps === 'color' ? 5 : 3 } : { columns: 12, rows: i.caps === 'color' ? 7 : i.caps === 'dim' ? 3 : 2 }; },
  after(c, root) { if (c.o.variant === 'wheel') wheelAfter(c, root); else sxAfter(c, root); },
  render(c) {
    if (c.o.variant === 'wheel') return wheelCard(c);
    const i = lightInfo(c, c.e), o = c.o, dim = i.caps !== 'onoff';
    const sub = o.show_state ? (i.on ? 'On' + (dim ? ` · ${i.lv}%` : '') : 'Off') : '';
    return tile(c, { cls: 'lit', on: i.on, lit: true, sub, style: `--lv:${i.on ? i.lv : 0}%;--lc:${i.col}`, slider: dim && o.show_slider ? slider('light.turn_on', { entity_id: c.e }, 'brightness_pct', i.lv, { label: 'Brightness', dis: !i.on }) : '' });
  },
  popup: c => openLightPopup(c),
});

/* ----- the standalone colour wheel card (light, variant: wheel) ----- */
const hsvA = (h, s) => hsv(h, s).match(/\d+/g).map(Number);
function wheelCard(c) {
  const i = lightInfo(c, c.e), o = c.o, wide = o.layout === 'wide', color = i.caps === 'color', dim = i.caps !== 'onoff', hs = i.a.hs_color || [38, 60];
  const rgb = color && i.on ? hsvA(hs[0], hs[1] / 100) : (color ? hsvA(hs[0], hs[1] / 100) : [255, 170, 60]), lv = i.lv || (i.on ? 100 : 0), last = Math.max(1, lv);
  const g = c.k.gridFor(c);
  return `<div class="lc ${i.on ? 'on' : ''} ${wide ? 'wide' : ''}" style="--rows:${g.rows};--c:${rgb.join(',')};--glow:rgba(${rgb.join(',')},${(0.14 + 0.36 * lv / 100).toFixed(3)});--p:${((last - 1) / 99).toFixed(4)};--lc:rgb(${rgb.join(',')})">${imgLayer(c)}
    <div class="hd"><span class="disc" data-act="more-info">${icn(c.icon, 22)}</span><span class="t"><span class="nm">${esc(c.title)}</span><span class="st">${i.on ? 'On' + (dim ? ' · ' + lv + '%' : '') : 'Off'}</span></span>${tgl(i.on, 'toggle', c.e)}</div>
    ${color ? `<div class="wheel" style="--w:${wide ? 200 : 232}px"><div class="pad" data-pad data-h="${hs[0]}" data-s="${hs[1] / 100}" tabindex="0" role="application" aria-label="Colour wheel"><canvas></canvas><span class="thumb"></span></div></div>` : ''}
    <div class="ctl">${dim && o.show_slider ? `<div class="br">${icn('brightness-5', 20)}${slider('light.turn_on', { entity_id: c.e }, 'brightness_pct', last, { label: 'Brightness' })}${icn('brightness-7', 20)}</div>` : ''}${color ? `<div class="chips"><span class="chip"><i></i><span data-hs>Hue ${Math.round(hs[0])}° · Sat ${Math.round(hs[1])}%</span></span></div>` : ''}</div></div>`;
}
function wheelAfter(c, root) {
  const pad = root.querySelector('[data-pad]'); if (!pad) return;
  const cv = pad.querySelector('canvas'), thumb = pad.querySelector('.thumb'), card = root.querySelector('.lc'), id = c.e;
  const css = cv.clientWidth || 208, dpr = Math.min(window.devicePixelRatio || 1, 2), n = Math.round(css * dpr), R = n / 2; cv.width = cv.height = n;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(n, n), d = img.data;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const dx = x + .5 - R, dy = y + .5 - R, dist = Math.hypot(dx, dy); if (dist > R) continue; const h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, k = hsvA(h, Math.min(dist / R, 1)), p = (y * n + x) * 4; d[p] = k[0]; d[p + 1] = k[1]; d[p + 2] = k[2]; d[p + 3] = Math.round(255 * clamp(R - dist, 0, 1)); }
  ctx.putImageData(img, 0, 0);
  let h = +pad.dataset.h, s = +pad.dataset.s;
  const place = () => { const r = pad.clientWidth / 2, a = h * Math.PI / 180; thumb.style.left = r + Math.cos(a) * s * r + 'px'; thumb.style.top = r + Math.sin(a) * s * r + 'px'; const rgb = hsvA(h, s).join(','); card.style.setProperty('--c', rgb); card.style.setProperty('--lc', `rgb(${rgb})`); const t = card.querySelector('[data-hs]'); if (t) t.textContent = `Hue ${Math.round(h)}° · Sat ${Math.round(s * 100)}%`; };
  place();
  let down = false, last = 0;
  const send = () => c.call('light', 'turn_on', { entity_id: id, hs_color: [Math.round(h), Math.round(s * 100)] });
  const pick = (e, commit) => { const r = pad.getBoundingClientRect(), R2 = r.width / 2, dx = e.clientX - (r.left + R2), dy = e.clientY - (r.top + R2); h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360; s = clamp(Math.hypot(dx, dy) / R2, 0, 1); place(); const now = Date.now(); if (commit || now - last > 250) { last = now; send(); } };
  pad.addEventListener('pointerdown', e => { down = true; c._busy = true; pad.setPointerCapture(e.pointerId); pick(e); });
  pad.addEventListener('pointermove', e => down && pick(e));
  const end = e => { if (!down) return; down = false; pick(e, true); setTimeout(() => { c._busy = false; c._update(true); }, 400); };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', () => { down = false; c._busy = false; });
  pad.addEventListener('keydown', e => { const k = e.key; if (k === 'ArrowLeft') h = (h + 355) % 360; else if (k === 'ArrowRight') h = (h + 5) % 360; else if (k === 'ArrowUp') s = clamp(s + .05, 0, 1); else if (k === 'ArrowDown') s = clamp(s - .05, 0, 1); else return; e.preventDefault(); place(); send(); });
  const sl = root.querySelector('.lc input.sl'); if (sl) sl.addEventListener('input', () => { const st = card.querySelector('.st'); if (st) st.textContent = `On · ${sl.value}%`; card.style.setProperty('--glow', `rgba(${getComputedStyle(card).getPropertyValue('--c')},${(0.14 + 0.36 * sl.value / 100).toFixed(3)})`); });
}

/* the colour wheel popup (hold a light tile) */
function openLightPopup(c) {
  const id = c.e, i = lightInfo(c, id); if (!i.s) return;
  document.querySelectorAll('nocturne-popup').forEach(n => n.remove());
  const host = document.createElement('nocturne-popup'), sr = host.attachShadow({ mode: 'open' });
  const color = i.caps === 'color', dim = i.caps !== 'onoff', hs = i.a.hs_color || [38, 60];
  sr.innerHTML = `<style>${CSS}
    .ov{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:16px;background:rgba(4,6,14,.6);backdrop-filter:blur(10px)}
    .pop{--lc:${i.col};width:min(340px,100%);border-radius:32px;padding:20px;background:var(--n-card-bg),var(--card-background-color,#12162b);background-color:var(--card-background-color,#12162b);box-shadow:var(--n-card-shadow);display:grid;gap:16px;justify-items:center;color:var(--primary-text-color);font-family:var(--ha-font-family-body,Manrope,system-ui,sans-serif)}
    .ph{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px}.ph b{font:600 17px var(--n-font-display)}
    canvas{width:220px;height:220px;border-radius:50%;touch-action:none;cursor:crosshair;box-shadow:0 0 0 5px rgba(255,255,255,.12),0 16px 40px rgba(0,0,0,.5)}
    .x{border:0;background:none;color:inherit;cursor:pointer;padding:4px}</style>
    <div class="ov"><div class="pop" role="dialog" aria-modal="true" aria-label="${esc(c.title)}"><div class="ph"><b>${esc(c.title)}</b><span style="display:flex;gap:12px;align-items:center">${tgl(i.on, 'p-toggle')}<button class="x" data-x aria-label="Close">${icn('close', 22)}</button></span></div>
    ${color ? '<canvas width="440" height="440"></canvas>' : ''}${dim ? slider('', {}, 'b', i.lv, { label: 'Brightness' }).replace('data-sl=""', '') : ''}</div></div>`;
  document.body.appendChild(host);
  const close = () => host.remove(); sr.querySelector('.ov').addEventListener('click', e => { if (e.target.classList.contains('ov') || e.target.closest('[data-x]')) close(); });
  sr.querySelector('.nctog').addEventListener('click', () => c.call('light', i.on ? 'turn_off' : 'turn_on', { entity_id: id }));
  const sl = sr.querySelector('input.sl'); if (sl) { sl.addEventListener('input', () => sl.style.setProperty('--p', sl.value + '%')); sl.addEventListener('change', () => c.call('light', 'turn_on', { entity_id: id, brightness_pct: +sl.value })); }
  const cv = sr.querySelector('canvas'); if (cv) {
    const S = 220, d = 2, ctx = cv.getContext('2d'), R = S / 2 * d; ctx.scale(1, 1);
    const draw = (h, s) => { const img = ctx.createImageData(cv.width, cv.height); for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) { const dx = x - R, dy = y - R, r = Math.hypot(dx, dy); if (r > R) continue; const hh = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, ss = r / R, k = (n => { const q = (n + hh / 60) % 6; return 1 - ss * Math.max(0, Math.min(q, 4 - q, 1)); }), p = (y * cv.width + x) * 4; img.data[p] = k(5) * 255; img.data[p + 1] = k(3) * 255; img.data[p + 2] = k(1) * 255; img.data[p + 3] = 255; } ctx.putImageData(img, 0, 0);
      const a = h * Math.PI / 180, mx = R + Math.cos(a) * s * R, my = R + Math.sin(a) * s * R; ctx.beginPath(); ctx.arc(mx, my, 14, 0, 7); ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.stroke(); };
    draw(hs[0], hs[1] / 100);
    let last = 0; const pick = (ev, commit) => { const b = cv.getBoundingClientRect(), x = (ev.clientX - b.left) / b.width * 2 - 1, y = (ev.clientY - b.top) / b.height * 2 - 1, s = Math.min(1, Math.hypot(x, y)), h = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; draw(h, s); const now = Date.now(); if (commit || now - last > 250) { last = now; c.call('light', 'turn_on', { entity_id: id, hs_color: [Math.round(h), Math.round(s * 100)] }); } };
    let down = false; cv.addEventListener('pointerdown', e => { down = true; cv.setPointerCapture(e.pointerId); pick(e); }); cv.addEventListener('pointermove', e => down && pick(e)); cv.addEventListener('pointerup', e => { down = false; pick(e, true); });
  }
  document.addEventListener('keydown', function esc_(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc_); } });
}

/* ----- switch / input_boolean / valve ----- */
const swOn = s => ['on', 'open', 'opening'].includes(s);
kind({
  id: 'switch', square: () => true, name: 'Switch', domains: ['switch', 'input_boolean', 'valve', 'automation', 'script'], icon: 'power', grid: { columns: 6, rows: 3 }, tap: { action: 'toggle' }, hold: { action: 'more-info' },
  opts: [SIZE, { k: 'accent', l: 'Accent colour', t: 'seg', o: [['accent', 'Accent'], ['water', 'Water'], ['air', 'Air'], ['warm', 'Warm']], d: 'accent' }, SHOW_STATE, ...SWITCH_OPTS],
  after: sxAfter,
  render(c) { const on = swOn(c.st(c.e)), valve = dom(c.e) === 'valve'; return tile(c, { cls: c.o.accent, on, lit: on, sub: c.o.show_state ? (valve ? (on ? 'Open' : 'Closed') : (on ? 'On' : 'Off')) : '' }); },
});

/* ----- fan ----- */
kind({
  id: 'fan', square: () => true, name: 'Fan', domains: ['fan'], icon: 'fan', grid: { columns: 6, rows: 3 }, tap: { action: 'toggle' }, hold: { action: 'more-info' },
  opts: [SIZE, { k: 'accent', l: 'Accent colour', t: 'seg', o: [['air', 'Air'], ['water', 'Water'], ['accent', 'Accent']], d: 'air' }, { k: 'steps', l: 'Speed control', t: 'seg', o: [['smooth', 'Smooth %'], ['3', '3 steps'], ['off', 'Hidden']], d: 'smooth' }, SHOW_STATE, ...SWITCH_OPTS],
  after: sxAfter,
  render(c) {
    const on = c.st(c.e) === 'on', o = c.o, pc = num(c.at(c.e, 'percentage')) ?? (on ? 100 : 0), sp = o.steps === '3' ? (Math.round(pc / 33) * 33 || 33) : Math.max(1, pc);
    const can = (num(c.at(c.e, 'supported_features')) || 0) & 1;
    return tile(c, { cls: o.accent + (on ? ' spin' : ''), on, lit: on, style: `--spd:${(2.2 - sp / 60).toFixed(2)}s`, sub: o.show_state ? (on ? pc + '%' : 'Off') : '', slider: o.steps !== 'off' && can ? slider('fan.set_percentage', { entity_id: c.e }, 'percentage', sp, { step: o.steps === '3' ? 33 : 1, min: o.steps === '3' ? 33 : 1, label: 'Speed', dis: !on }) : '' });
  },
});

/* ----- cover ----- */
kind({
  id: 'cover', square: () => true, name: 'Cover', domains: ['cover'], icon: 'garage', grid: { columns: 6, rows: 3 }, tap: { action: 'more-info' }, hold: { action: 'more-info' },
  opts: [SIZE, { k: 'slider', l: 'Position slider (if the device supports it)', t: 'sw', d: true }],
  toggle: (c, id) => c.call('cover', 'toggle', { entity_id: id }),
  render(c) {
    const o = c.o, s = c.st(c.e), pos = num(c.at(c.e, 'current_position')), feat = num(c.at(c.e, 'supported_features')) || 0, wide = o.size === 'wide', open = s !== 'closed';
    const bt = (svc, ic, l) => `<button class="ncround" style="width:40px;height:40px" ${svcAttr('cover.' + svc, { entity_id: c.e })} aria-label="${l}">${icn(ic, 22)}</button>`;
    const state = s === 'opening' ? 'Opening' : s === 'closing' ? 'Closing' : pos != null && pos > 0 && pos < 100 ? `Open ${pos}%` : open ? 'Open' : 'Closed';
    const sl = o.slider && (feat & 4) && pos != null;
    return `<div class="nc accent ${wide ? 'wide' : ''} ${open ? 'on' : ''}" style="--rows:${sl ? 4 : 3}">${imgLayer(c)}<div class="in" style="display:flex;flex-direction:column;justify-content:space-between;gap:8px"><span class="ic ${open ? 'lit' : ''}" data-act="more-info">${icn(c.icon)}</span><div><div class="nm"><b>${esc(c.title)}</b><span>${state}</span></div><div style="display:flex;gap:8px;justify-content:${wide ? 'flex-start' : 'space-between'};margin:10px 0 ${sl ? 8 : 0}px">${feat & 1 ? bt('open_cover', 'chevron-up', 'Open') : ''}${feat & 8 ? bt('stop_cover', 'stop', 'Stop') : ''}${feat & 2 ? bt('close_cover', 'chevron-down', 'Close') : ''}</div>${sl ? slider('cover.set_cover_position', { entity_id: c.e }, 'position', pos, { min: 0, label: 'Position' }) : ''}</div></div></div>`;
  },
  gridFor: c => ({ columns: c.o.size === 'wide' ? 12 : 6, rows: c.o.slider ? 4 : 3 }),
});

/* ----- sensor ----- */
kind({
  id: 'sensor', square: () => true, name: 'Sensor', domains: ['sensor', 'binary_sensor', 'input_number', 'number'], icon: 'thermometer', grid: { columns: 6, rows: 3 }, tap: { action: 'more-info' }, hold: { action: 'more-info' },
  opts: [{ k: 'variant', l: 'Layout', t: 'seg', o: [['auto', 'Auto'], ['temp', 'Temperature'], ['value', 'Plain value']], d: 'auto' }, { k: 'secondary_entity', l: 'Secondary entity (e.g. humidity)', t: 'entity', domains: ['sensor'] }, { k: 'bar', l: 'Show bar for the secondary value', t: 'sw', d: true }],
  extraIds: c => [c.cfg.secondary_entity],
  render(c) {
    const o = c.o, s = c.S(c.e), a = (s && s.attributes) || {}, dc = a.device_class; let v = o.variant; if (v === 'auto') v = dc === 'temperature' ? 'temp' : 'value';
    const val = s ? (num(s.state) != null ? (Math.round(num(s.state) * 10) / 10) : s.state) : '–', unit = a.unit_of_measurement || '';
    if (v === 'value') return `<div class="nc sens" style="--rows:3">${imgLayer(c)}<div class="in"><div class="top"><span class="ic" data-act="more-info">${icn(c.icon)}</span></div><div class="nm"><div class="big">${esc(val)}<small>${esc(unit)}</small></div><b style="margin-top:6px">${esc(c.title)}</b></div><div></div></div></div>`;
    const sec = o.secondary_entity && c.S(o.secondary_entity), h = sec ? num(sec.state) : null;
    return `<div class="nc sens" style="--rows:3">${imgLayer(c)}<div class="in"><div class="top"><span class="ic" data-act="more-info">${icn(c.cfg.icon || 'thermometer')}</span><div class="big">${esc(val)}<small>${esc(unit || '°C')}</small></div></div><div class="nm"><b>${esc(c.title)}</b></div><div class="bot">${h != null ? `${o.bar ? `<div class="bar" style="height:6px"><i style="width:${clamp(h, 0, 100)}%"></i></div>` : ''}<div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--secondary-text-color);align-items:center">${icn('water', 12)}<span>${Math.round(h)}${esc((sec.attributes || {}).unit_of_measurement || '%')}</span></div>` : ''}</div></div></div>`;
  },
});

/* ----- camera ----- */
kind({
  id: 'camera', name: 'Camera', domains: ['camera'], icon: 'cctv', grid: { columns: 12, rows: 3 }, tap: { action: 'more-info' }, hold: { action: 'more-info' }, noImage: true,
  opts: [{ k: 'aspect', l: 'Shape', t: 'seg', o: [['wide', '16:9'], ['sq', 'Square'], ['tall', '4:3']], d: 'wide' }, { k: 'show_name', l: 'Show name', t: 'sw', d: true }, { k: 'live', l: 'Live badge', t: 'sw', d: true }],
  gridFor: c => ({ columns: c.o.aspect === 'sq' ? 6 : 12, rows: c.o.aspect === 'sq' ? 3 : c.o.aspect === 'tall' ? 4 : 3 }),
  sig: c => Math.floor(Date.now() / 10000),
  render(c) {
    const o = c.o, pic = c.at(c.e, 'entity_picture'), ratio = { wide: '16/9', sq: '1/1', tall: '4/3' }[o.aspect];
    return `<div class="nc cam" style="--rows:3;aspect-ratio:${ratio};height:auto;min-height:0"><div class="view" ${pic ? `style="background:url('${esc(c.url(pic))}') center/cover"` : ''}>${pic ? '' : `<span style="position:absolute;inset:0;display:grid;place-items:center;opacity:.4">${icn('cctv', 48)}</span>`}</div>${o.live ? '<span class="live"><i></i>LIVE</span>' : ''}${o.show_name ? `<div class="lab">${esc(c.title)}</div>` : ''}</div>`;
  },
});

/* ----- quick actions (scenes, scripts, buttons) ----- */
kind({
  id: 'actions', name: 'Quick actions', title: 'Quick Actions', domains: ['scene', 'script', 'button', 'input_button'], multi: true, icon: 'flash', grid: { columns: 12, rows: 3 }, tap: { action: 'none' }, hold: { action: 'none' },
  opts: [{ k: 'labels', l: 'Show labels', t: 'sw', d: true }, { k: 'columns', l: 'Buttons per row', t: 'seg', o: [['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']], d: '4' }],
  gridFor: c => ({ columns: 12, rows: Math.ceil(Math.max(1, c.list().length) / (+c.o.columns || 4)) * 2 + 2 }),
  render(c) {
    const o = c.o, items = c.list(), cols = +o.columns || 4, iconFor = e => ({ scene: 'palette', script: 'script-text-play', button: 'gesture-tap-button', input_button: 'gesture-tap-button' }[dom(e)] || 'flash');
    const act = e => { const d = dom(e); return d === 'button' || d === 'input_button' ? [d, 'press'] : [d, 'turn_on']; };
    const btns = items.map(it => { const [d, s] = act(it.entity), nm = it.name || c.fname(it.entity); return `<button class="ncscene" ${svcAttr(d + '.' + s, { entity_id: it.entity })} aria-label="${esc(nm)}"><span class="c">${icn(it.icon || c.at(it.entity, 'icon') || iconFor(it.entity), 22)}</span>${o.labels ? esc(nm) : ''}</button>`; }).join('');
    return bcard(c, { name: c.title, icon: c.cfg.icon || 'flash', iconAct: false, label: '', rows: c.k.gridFor(c).rows, ctl: `<div class="ncgrid" style="grid-template-columns:repeat(${cols},1fr)">${btns}</div>` });
  },
});
