/* ============================================================
   Nocturne Card: one Home Assistant card for every Nocturne tile.
   Pick a kind (light, climate, media, weather ...), pick an entity of that
   kind, set the options. Styled by the nocturne_glass themes, and still
   looks fine on any other theme.
   ============================================================ */
const VERSION = '__VERSION__';
const CSS = '__CSS__';

/* ---------- small helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mdi = n => (String(n).includes(':') ? n : 'mdi:' + n);
const icn = (n, px = 22, st = '') => `<ha-icon icon="${esc(mdi(n))}" style="--mdc-icon-size:${px}px;${st}"></ha-icon>`;
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const dom = id => String(id || '').split('.')[0];
const BAD_STATES = ['unavailable', 'unknown'];
const IDLE_STATES = ['off', 'closed', 'idle', 'standby', 'docked', 'unlocked', 'paused', 'closing', 'disarmed', 'not_home', ...BAD_STATES];
const hsv = (h, s, v = 1) => { const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return `rgb(${Math.round(f(5) * 255)},${Math.round(f(3) * 255)},${Math.round(f(1) * 255)})`; };
const fire = (node, type, detail) => node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
const first = id => String(id || '').replace(/^.*?\./, '');
const ENTITY_RE = /^[a-z_]+\.[a-z0-9_]+$/;
const nice = s => String(s || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

/* ---------- image option (shared by every kind) ---------- */
const POS = { center: 'center', 'right-bottom': 'right 4px bottom 4px', 'left-bottom': 'left 4px bottom 4px', 'right-top': 'right 4px top 4px', top: 'center top' };
function imgLayer(c, src = c.o.image) {
  if (!src) return '';
  const o = c.o, url = c.hass && c.hass.hassUrl && String(src).startsWith('/') ? c.hass.hassUrl(src) : src;
  const size = o.image_fit === 'cover' ? 'cover' : o.image_fit === 'contain' ? 'contain' : `${o.image_width}% auto`;
  return `<div class="imglayer ${o.image_fade ? 'fade' : ''}" style="background-image:url('${esc(url)}');background-size:${size};background-position:${POS[o.image_position] || 'center'};opacity:${o.image_opacity / 100};filter:blur(${o.image_blur}px)${o.image_blur ? ';transform:scale(1.15)' : ''}"></div>`;
}
const IMG_DEFAULTS = { image: '', image_opacity: 100, image_fit: 'width', image_width: 80, image_position: 'center', image_blur: 0, image_fade: false };
const IMG_OPTS = [
  { k: 'image', l: 'Background image (URL, e.g. /local/robot.png)', t: 'text', g: 'image' },
  { k: 'image_opacity', l: 'Image opacity', t: 'range', min: 0, max: 100, u: '%', g: 'image' },
  { k: 'image_fit', l: 'Image size', t: 'seg', o: [['cover', 'Cover'], ['contain', 'Contain'], ['width', 'Width %']], g: 'image' },
  { k: 'image_width', l: 'Image width', t: 'range', min: 20, max: 100, u: '%', g: 'image' },
  { k: 'image_position', l: 'Image position', t: 'seg', o: [['center', 'Centre'], ['right-bottom', 'Bottom right'], ['left-bottom', 'Bottom left'], ['right-top', 'Top right'], ['top', 'Top']], g: 'image' },
  { k: 'image_blur', l: 'Image blur', t: 'range', min: 0, max: 24, u: 'px', g: 'image' },
  { k: 'image_fade', l: 'Darken image for readable text', t: 'sw', g: 'image' },
];

/* ---------- reusable pieces of markup ---------- */
const tgl = (on, act = 'toggle', e = '') => `<div class="nctog ${on ? 'on' : ''}" data-act="${act}" ${e ? `data-e="${esc(e)}"` : ''} role="switch" aria-checked="${on}" tabindex="0"><i></i></div>`;
const svcAttr = (svc, data) => `data-svc="${svc}" data-d='${esc(JSON.stringify(data))}'`;
const round = (icon, svc, data, color, label) => `<button class="ncround" aria-label="${esc(label || icon)}" style="${color ? 'color:' + color : ''}" ${svcAttr(svc, data)}>${icn(icon, 19)}</button>`;
const slider = (svc, data, key, val, o = {}) => `<input class="sl" type="range" data-sl="${svc}" data-d='${esc(JSON.stringify(data))}' data-key="${key}" data-scale="${o.scale || 1}" min="${o.min ?? 1}" max="${o.max ?? 100}" step="${o.step ?? 1}" value="${val}" style="--p:${((val - (o.min ?? 1)) / ((o.max ?? 100) - (o.min ?? 1))) * 100}%;--fc:var(--lc, var(--accent-color))" aria-label="${esc(o.label || key)}" ${o.dis ? 'disabled' : ''}>`;
const barRow = (pct, label) => `<div class="row"><div class="bar"><i style="width:${clamp(pct, 0, 100)}%"></i></div><span>${label}</span></div>`;
const well = (inner, st = '') => `<div class="well" style="display:flex;align-items:center;gap:8px;padding:7px 12px;${st}">${inner}</div>`;

/* a Nocturne glass card with the standard grid: icon, state pill, name, label, controls */
function bcard(c, p) {
  const rows = p.rows || c.k.grid.rows, wide = p.wide ?? c.k.grid.columns === 12;
  const S = (k, v) => v ? `${k}:${v};` : '';
  const grid = `grid-template-areas:${p.areas || "'i tog' 'n n' 'l l' 'ctl ctl'"};grid-template-columns:${p.cols || '1fr auto'};grid-template-rows:${p.trows || 'auto auto auto 1fr'};${p.gridCss || ''}`;
  let h = imgLayer(c, p.image);
  h += `<div class="grid" style="${grid}">`;
  if (p.icon !== false) h += `<div class="imgcell" ${p.iconAct === false ? '' : `data-act="more-info"`} style="grid-area:i;${p.iconBg ? 'background:' + p.iconBg + ';' : ''}">${p.iconHtml || icn(p.icon || c.icon, 22, `color:${p.iconColor || 'var(--secondary-text-color)'};${p.iconFilter ? 'filter:' + p.iconFilter + ';' : ''}`)}</div>`;
  if (p.tog) h += `<div class="f-tog" style="grid-area:tog;justify-self:end;align-self:start">${p.tog}</div>`;
  if (p.name !== false) h += `<div style="grid-area:n;justify-self:${p.center ? 'center' : 'start'};align-self:end;font-weight:600;font-size:${p.center ? 16 : 15}px;margin-top:${p.center ? 0 : 14}px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name ?? c.title)}</div>`;
  if (p.label) h += `<div style="grid-area:l;justify-self:${p.center ? 'center' : 'start'};font-size:12.5px;color:${p.labelColor || 'var(--secondary-text-color)'};max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.label}</div>`;
  if (p.fields) Object.entries(p.fields).forEach(([f, v]) => { h += `<div class="f-${f}" style="grid-area:${f};${f === 'ctl' ? 'align-self:end;width:100%;margin-top:14px;' : ''}${(p.fieldCss || {})[f] || ''}">${v}</div>`; });
  if (p.ctl) h += `<div class="f-ctl" style="grid-area:ctl;align-self:end;width:100%;margin-top:14px">${p.ctl}</div>`;
  h += '</div>';
  return `<div class="bc ${wide ? 'w' : ''} ${p.cls || ''}" style="--rows:${rows};${S('background', p.bg)}${S('box-shadow', p.shadow)}${S('animation', p.anim)}${p.cardCss || ''}">${h}</div>`;
}
/* the tinted glow a card gets for a state, e.g. green armed, amber unlocked, red triggered */
const glow = (rgb, a1, a2) => rgb ? { bg: `radial-gradient(130% 100% at 0% 0%, rgba(${rgb},${a1}), rgba(${rgb},.05) 60%, transparent 85%), var(--n-card-bg)`, shadow: `var(--n-card-shadow), 0 0 40px rgba(${rgb},${a2})` } : {};

/* ---------- Tuner switch: a big switch that sits on the bottom edge of the tile (light, switch, fan) ---------- */
const SX_ON = c => ['slot', 'tab'].includes(c.switch_style);
const SW_OPTS = [
  { k: 'switch_style', l: 'Switch style', t: 'seg', o: [['standard', 'Corner toggle'], ['slot', 'Slot'], ['tab', 'Tab'], ['overlap', 'Overlap']], d: 'standard' },
  { k: 'switch_gap', l: 'Switch gap (slot) or wrap margin (tab)', t: 'range', min: 0, max: 20, u: 'px', d: 6, tuner: true },
  { k: 'switch_softness', l: 'Corner softness where the glass meets the switch', t: 'range', min: 0, max: 50, u: '°', d: 40, tuner: true },
];
/* ok(cfg): does this config use a tile that has the switch? */
const switchOpts = ok => SW_OPTS.map(o => ({ ...o, when: c => ok(c) && (!o.tuner || SX_ON(c)) }));
const SWITCH_OPTS = switchOpts(c => c.variant !== 'wheel');
const SX = { R: 28, SW: 84, SH: 40 };
/* the tile outline for the Tuner switch. slot: the glass is cut away around the switch. tab: the glass grows around it. overlap: no cut. */
function sxShape(W, B, mode, g, ph) {
  const { R, SW, SH } = SX, L = (SW - SH) / 2, CX = W / 2, f = n => Math.round(n * 100) / 100;
  const head = `M${R},0 H${W - R} A${R},${R} 0 0 1 ${W},${R} V${B - R} A${R},${R} 0 0 1 ${W - R},${B}`;
  const tail = ` H${R} A${R},${R} 0 0 1 0,${B - R} V${R} A${R},${R} 0 0 1 ${R},0 Z`;
  if (mode === 'overlap') return head + tail;
  const tab = mode === 'tab', r = SH / 2 + g, sg = tab ? 1 : -1, sweep = tab ? 1 : 0;
  const k = (CX - R - L - 2) / r, phiMax = Math.max(0, 2 * (Math.atan(k) - Math.PI / 4)), phi = Math.min(ph, phiMax), c = Math.cos(phi), s = Math.sin(phi), t = Math.tan(phi);
  const rx = CX + L, lx = CX - L, Cr = rx + r / c, Ar = Cr + r * t, Pry = B + sg * r * s, Cl = lx - r / c, Al = Cl - r * t;
  return head + ` H${f(Ar)} Q${f(Cr)},${B} ${f(rx + r * c)},${f(Pry)} A${r},${r} 0 0 ${sweep} ${rx},${B + sg * r} H${lx} A${r},${r} 0 0 ${sweep} ${f(lx - r * c)},${f(Pry)} Q${f(Cl)},${B} ${f(Al)},${B}` + tail;
}
function sxTile(c, p) {
  const o = c.o, mode = o.switch_style, wide = o.size === 'wide', gid = 'sxg' + c._id, g = SX_ON(o) ? clamp(+o.switch_gap || 0, 0, 20) : 0, tab = mode === 'tab';
  const pb = 46 + (mode === 'overlap' ? 0 : g);
  const grad = (id, a, b, d) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${a}"/><stop offset=".5" stop-color="${p.on ? 'var(--lc)' : '#fff'}" stop-opacity="${b}"/><stop offset="1" stop-color="${p.on ? 'var(--lc)' : '#fff'}" stop-opacity="${d}"/></linearGradient>`;
  return `<div class="nc sx ${p.cls || ''} ${wide ? 'wide' : ''} ${p.on ? 'on' : ''}" style="--rows:3;--b:calc(100% - ${SX.SH / 2 + (tab ? g : 0)}px);${p.style || ''}">
    <div class="shape">${imgLayer(c)}</div>
    <svg class="edge" aria-hidden="true"><defs>${p.on ? grad(gid, .6, .3, .65) : grad(gid, .55, .16, .22)}</defs><path class="o" stroke="url(#${gid})"/></svg>
    <div class="face" style="padding-bottom:${pb}px">${p.face || `<span class="ic ${p.lit ? 'lit' : ''}" data-act="toggle" role="button" tabindex="0" aria-label="Toggle">${icn(c.icon)}</span><div class="nm"><b>${esc(c.title)}</b>${p.sub ? `<span>${p.sub}</span>` : ''}</div>${p.slider ? `<div class="slw">${p.slider}</div>` : ''}`}</div>
    <button class="sw" data-act="toggle" role="switch" aria-checked="${!!p.on}" aria-label="Toggle ${esc(c.title)}"></button></div>`;
}
/* sets the outline once the tile has a real size, and again when it changes */
function sxAfter(c, root) {
  const el = root.querySelector('.sx'); if (!el) return;
  if (c._ro) c._ro.disconnect();
  const o = c.o, mode = o.switch_style, apply = () => {
    const W = el.clientWidth, H = el.clientHeight; if (!W || !H) return;
    const { R, SW, SH } = SX, gmax = Math.max(0, Math.floor(W / 2 - R - (SW - SH) / 2 - SH / 2 - 1));
    const g = SX_ON(o) ? clamp(+o.switch_gap || 0, 0, gmax) : 0, B = H - SH / 2 - (mode === 'tab' ? g : 0);
    const d = sxShape(W, B, mode, g, (+o.switch_softness || 0) * Math.PI / 180);
    const url = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}'><path d='${d}' fill='black'/></svg>`)}")`, sh = el.querySelector('.shape');
    sh.style.webkitMaskImage = url; sh.style.maskImage = url;
    const sv = el.querySelector('.edge'); sv.setAttribute('viewBox', `0 0 ${W} ${H}`); sv.querySelector('.o').setAttribute('d', d);
    el.style.setProperty('--b', B + 'px');
  };
  apply(); if (typeof ResizeObserver !== 'undefined') { c._ro = new ResizeObserver(apply); c._ro.observe(el); }
}

/* hand-built tile (light, switch, fan, cover, sensor, ...) */
function tile(c, p) {
  const o = c.o, wide = o.size === 'wide';
  if (p.tog !== false && o.switch_style && o.switch_style !== 'standard') return sxTile(c, p);
  return `<div class="nc tile ${p.cls || ''} ${wide ? 'wide' : ''} ${p.on ? 'on' : ''}" style="--rows:3;${p.style || ''}">${imgLayer(c)}<div class="in"><span class="ic ${p.lit ? 'lit' : ''}" data-act="toggle" role="button" tabindex="0" aria-label="Toggle">${icn(c.icon)}</span>${p.tog === false ? '' : `<span class="tgw">${tgl(p.on)}</span>`}<div class="nm"><b>${esc(c.title)}</b>${p.sub ? `<span>${p.sub}</span>` : ''}</div>${p.slider ? `<div class="slw">${p.slider}</div>` : ''}</div></div>`;
}

/* ---------- kinds registry ---------- */
const KINDS = {};
const SIZE = { k: 'size', l: 'Size', t: 'seg', o: [['small', 'Small'], ['wide', 'Wide']], d: 'small' };
const SHOW_STATE = { k: 'show_state', l: 'Show state line', t: 'sw', d: false };
const SQUARE = { k: 'square', l: 'Square tile (so tiles line up like a grid)', t: 'sw', d: false };
function kind(def) { def.opts = [...(def.opts || []), ...(def.square ? [{ ...SQUARE, when: def.square }] : []), ...(def.noImage ? [] : IMG_OPTS)]; def.defaults = Object.assign({}, ...(def.opts || []).map(o => ({ [o.k]: o.d !== undefined ? o.d : IMG_DEFAULTS[o.k] })), def.noImage ? {} : IMG_DEFAULTS); KINDS[def.id] = def; return def; }

/* ---------- the card ---------- */
let SEQ = 0;
class NocturneCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._refs = []; this._id = ++SEQ; this._subs = []; this._fc = {}; }
  static getConfigElement() { return document.createElement('nocturne-card-editor'); }
  static getStubConfig(hass, entities) { const pick = d => (entities || []).find(e => e.startsWith(d + '.')); const e = pick('light'); return e ? { type: 'custom:nocturne-card', kind: 'light', entity: e } : { type: 'custom:nocturne-card', kind: 'light' }; }

  setConfig(config) {
    if (!config || !config.kind) throw new Error('Choose a kind (for example kind: light)');
    const k = KINDS[config.kind]; if (!k) throw new Error(`Unknown kind "${config.kind}". Kinds: ${Object.keys(KINDS).join(', ')}`);
    this.k = k; this.cfg = config; this.o = Object.assign({}, k.defaults, config);
    this._watch = null; this._unsub(); this._rendered = false; this._connected_once = false;
    if (this._hass) this._update(true);
    this.style.setProperty('--rows', this._grid().rows);
  }
  get hass() { return this._hass; }
  set hass(h) { const first = !this._hass; this._hass = h; if (this.k) this._update(first); }
  connectedCallback() { if (this.k && this._hass) { if (this.k.connect) this.k.connect(this); this._update(true); } }
  disconnectedCallback() { this._unsub(); }
  _unsub() { if (this._ro) this._ro.disconnect(); this._subs.forEach(p => Promise.resolve(p).then(u => typeof u === 'function' && u()).catch(() => {})); this._subs = []; }

  /* which entities does this card depend on? every entity id found in the config, plus whatever the kind adds */
  _entityIds() {
    if (this._watch) return this._watch;
    const ids = new Set(), walk = v => { if (typeof v === 'string') { if (ENTITY_RE.test(v)) ids.add(v); } else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
    walk(this.cfg); (this.k.extraIds ? this.k.extraIds(this) : []).forEach(i => i && ids.add(i));
    return this._watch = [...ids];
  }
  _update(force) {
    const ids = this._entityIds(), refs = ids.map(i => this._hass.states[i]);
    const extra = this.k.sig ? this.k.sig(this) : '';
    const changed = force || extra !== this._extra || refs.length !== this._refs.length || refs.some((r, i) => r !== this._refs[i]);
    if (!changed || this._busy) { if (changed) this._dirty = true; return; }
    this._refs = refs; this._extra = extra; this._rendered = false;
    if (!this._connected_once) { this._connected_once = true; if (this.k.connect) this.k.connect(this); }
    this._render();
  }
  refresh() { this._rendered = false; this._render(); }

  /* ---- state helpers used by the kinds ---- */
  S(id) { return id && this._hass ? this._hass.states[id] : undefined; }
  st(id) { const s = this.S(id); return s ? s.state : undefined; }
  at(id, k) { const s = this.S(id); return s && s.attributes ? s.attributes[k] : undefined; }
  get e() { if (this.cfg.entity) return this.cfg.entity; const l = this.list(); return l.length ? l[0].entity : undefined; }
  /* entities as [{entity, name, icon}] from strings or objects */
  list() { return [].concat(this.cfg.entities || this.cfg.entity || []).filter(Boolean).map(x => typeof x === 'string' ? { entity: x } : x); }
  fname(id) { const s = this.S(id); return (s && s.attributes && s.attributes.friendly_name) || nice(first(id)); }
  get title() { return this.cfg.name || this.k.title || (this.e ? this.fname(this.e) : this.k.name); }
  get icon() { return this.cfg.icon || (this.e && this.at(this.e, 'icon')) || this.k.icon; }
  call(d, s, data) { return this._hass.callService(d, s, data); }
  url(p) { return p && this._hass.hassUrl ? this._hass.hassUrl(p) : p; }

  _render() {
    if (!this._hass || !this.k) return;
    let body;
    try { body = this.k.domains && !this.e ? `<div class="nc tile" style="--rows:3;padding:16px"><div class="in" style="display:grid;align-content:center;gap:6px"><span class="ic">${icn(this.k.icon)}</span><b>${esc(this.k.name)}</b><span style="font-size:12px;color:var(--secondary-text-color)">Choose an entity in the card editor</span></div></div>` : this.k.render(this); this.style.setProperty('--rows', this._grid().rows); } catch (err) { console.error('[nocturne-card]', err); body = `<div class="nc tile" style="--rows:3;padding:16px"><div class="in"><b>nocturne-card</b><span style="font-size:12px;color:var(--n-bad)">${esc(err.message)}</span></div></div>`; }
    this.classList.toggle('sq', this._isSq());
    this.shadowRoot.innerHTML = `<style>${CSS}</style>${body}`;
    if (!this._bound) this._bind();
    if (this.k.after) this.k.after(this, this.shadowRoot);
    this._dirty = false;
  }

  /* ---- interaction ---- */
  _bind() {
    this._bound = true; const r = this.shadowRoot;
    r.addEventListener('click', ev => {
      const t = ev.target.closest('[data-svc]');
      if (t) { ev.stopPropagation(); const [d, s] = t.dataset.svc.split('.'); this.call(d, s, JSON.parse(t.dataset.d || '{}')); t.classList.add('fired'); setTimeout(() => t.classList.remove('fired'), 700); return; }
      const a = ev.target.closest('[data-act]');
      if (a) { ev.stopPropagation(); this._act(a.dataset.act, a.dataset.e || this.e, a); return; }
      if (ev.target.closest('input,select,textarea,a,.mc,.pad')) return;
      if (this._held) { this._held = false; return; }
      this._action(this.cfg.tap_action || (this.k.tapFor ? this.k.tapFor(this) : this.k.tap) || { action: 'more-info' });
    });
    r.addEventListener('keydown', ev => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('[role=button],[role=switch]')) { ev.preventDefault(); ev.target.click(); } });
    r.addEventListener('input', ev => { const i = ev.target; if (!i.matches || !i.matches('input.sl')) return; this._busy = true; i.style.setProperty('--p', ((i.value - i.min) / (i.max - i.min)) * 100 + '%'); const lab = i.closest('.nc,.bc'); if (lab) lab.style.setProperty('--lv', i.value + '%'); });
    r.addEventListener('change', ev => { const i = ev.target; if (!i.matches || !i.matches('input.sl[data-sl]')) return; const [d, s] = i.dataset.sl.split('.'); const data = JSON.parse(i.dataset.d || '{}'); data[i.dataset.key] = Math.round(parseFloat(i.value) * parseFloat(i.dataset.scale || 1) * 100) / 100; this.call(d, s, data); this._busy = false; setTimeout(() => this._dirty && this._update(true), 400); });
    r.addEventListener('pointerup', () => { if (this._busy) { this._busy = false; setTimeout(() => this._dirty && this._update(true), 400); } });
    let timer;
    r.addEventListener('pointerdown', ev => { if (ev.target.closest('input,select,button,[data-svc],.mc,.pad')) return; const hold = this.cfg.hold_action || (this.k.holdFor ? this.k.holdFor(this) : this.k.hold); if (!hold || hold.action === 'none') return; timer = setTimeout(() => { this._held = true; this._action(hold); }, 500); });
    ['pointerup', 'pointerleave', 'pointercancel', 'scroll'].forEach(n => r.addEventListener(n, () => clearTimeout(timer)));
  }
  _act(a, id, el) {
    const e = id || this.e;
    if (a === 'toggle') return this.toggle(e);
    if (a === 'more-info') return fire(this, 'hass-more-info', { entityId: e });
    if (a === 'popup') return this._action({ action: 'popup' });
    if (this.k.act) this.k.act(this, a, e, el);
  }
  toggle(id) {
    const d = dom(id), s = this.st(id);
    if (this.k.toggle) return this.k.toggle(this, id);
    if (d === 'lock') return this.call('lock', s === 'locked' ? 'unlock' : 'lock', { entity_id: id });
    if (d === 'climate') return this.call('climate', s === 'off' ? 'turn_on' : 'turn_off', { entity_id: id });
    if (d === 'media_player') return this.call('media_player', ['off', 'unavailable'].includes(s) ? 'turn_on' : 'turn_off', { entity_id: id });
    if (d === 'scene' || d === 'script') return this.call(d, 'turn_on', { entity_id: id });
    if (d === 'button' || d === 'input_button') return this.call(d, 'press', { entity_id: id });
    if (d === 'vacuum') return this.call('vacuum', s === 'cleaning' ? 'return_to_base' : 'start', { entity_id: id });
    if (d === 'alarm_control_panel') return fire(this, 'hass-more-info', { entityId: id });
    return this.call('homeassistant', 'toggle', { entity_id: id });
  }
  _action(cfg) {
    const a = cfg.action || 'more-info', e = cfg.entity || this.e;
    if (a === 'none') return;
    if (a === 'toggle') return this.toggle(e);
    if (a === 'more-info') return fire(this, 'hass-more-info', { entityId: e });
    if (a === 'navigate') { history.pushState(null, '', cfg.navigation_path); return window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } })); }
    if (a === 'url') return window.open(cfg.url_path, cfg.new_tab === false ? '_self' : '_blank');
    if (a === 'perform-action' || a === 'call-service') { const [d, s] = String(cfg.perform_action || cfg.service).split('.'); return this.call(d, s, Object.assign({}, cfg.data || cfg.service_data, cfg.target || {})); }
    if (a === 'popup' && this.k.popup) return this.k.popup(this);
    if (a === 'popup') return fire(this, 'hass-more-info', { entityId: e });
  }

  _grid() { if (!this.k) return { columns: 6, rows: 3 }; const g = this.k.gridFor ? this.k.gridFor(this) : this.k.grid; return { columns: this.o.size === 'wide' ? 12 : g.columns, rows: g.rows }; }
  /* square tiles: the height follows the width, so the tile needs no fixed number of rows */
  _isSq() { return !!(this.k && this.o.square && this.k.square && this.k.square(this.o) && this._grid().columns <= 6); }
  getCardSize() { return this._grid().rows; }
  getGridOptions() { const g = this._grid(); return this._isSq() ? { columns: g.columns, rows: 'auto', min_columns: 3 } : { columns: g.columns, rows: g.rows, min_columns: 3, min_rows: 2 }; }
}
