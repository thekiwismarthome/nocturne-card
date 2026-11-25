/* ============ dialog: the glass popup the intercom and chores tiles open ============ */
/* one at a time; closes on the backdrop, the X or Escape. body is where the caller puts its content. */
function ncDialog(c, o) {
  document.querySelectorAll('nocturne-popup').forEach(n => n.remove());
  const host = document.createElement('nocturne-popup'), sr = host.attachShadow({ mode: 'open' });
  sr.innerHTML = `<style>${CSS}
    .ov{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:16px;background:rgba(4,6,14,.6);backdrop-filter:blur(10px)}
    .pop{width:min(${o.w || 380}px,100%);max-height:calc(100vh - 32px);overflow:auto;border-radius:32px;padding:${o.flush ? 0 : 20}px;background:var(--n-card-bg),var(--card-background-color,#12162b);background-color:var(--card-background-color,#12162b);box-shadow:var(--n-card-shadow);display:grid;gap:14px;color:var(--primary-text-color);font-family:var(--ha-font-family-body,Manrope,system-ui,sans-serif);box-sizing:border-box}
    .ph{display:flex;align-items:center;justify-content:space-between;gap:10px;${o.flush ? 'padding:14px 16px 0' : ''}}.ph b{font:600 18px var(--n-font-display);display:flex;align-items:center;gap:10px}
    .x{border:0;background:none;color:inherit;cursor:pointer;padding:4px}</style>
    <div class="ov"><div class="pop" role="dialog" aria-modal="true" aria-label="${esc(o.title)}"><div class="ph"><b>${icn(o.icon || 'information-outline', 22)}${esc(o.title)}</b><button class="x" data-x aria-label="Close">${icn('close', 24)}</button></div><div class="pb"></div></div></div>`;
  document.body.appendChild(host);
  const close = () => { host.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  sr.querySelector('.ov').addEventListener('click', e => { if (e.target.classList.contains('ov') || e.target.closest('[data-x]')) close(); });
  document.addEventListener('keydown', onKey);
  return { host, sr, body: sr.querySelector('.pb'), close };
}

/* ============ intercom (Kiosk Satellite / ESPHome intercom between screens) ============
   Only works with Kiosk Satellite screens for now (esphome.<node>_intercom_call + sensor.<name>_intercom).
   Kept apart from the rest so it can be pointed at an Asterisk / IP calling setup later. */
const IC_IDLE = ['idle', 'ended', 'off', 'unavailable', 'unknown', 'none', ''];
const icBusy = s => !IC_IDLE.includes(String(s ?? '').trim().toLowerCase());
const icNorm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
/* every sensor.<name>_intercom is a screen; its esphome node is found from the esphome.<node>_intercom_call services */
function icDiscover(c) {
  const h = c._hass, svcs = h.services && h.services.esphome ? Object.keys(h.services.esphome) : [], nodes = svcs.filter(k => /_intercom_call$/.test(k)).map(k => k.replace(/_intercom_call$/, '')), ov = c.o.node_overrides || {};
  return Object.keys(h.states).filter(id => /^sensor\..*_intercom$/.test(id)).map(id => {
    const st = h.states[id], name = String((st.attributes && st.attributes.friendly_name) || id).replace(/\s*intercom$/i, '').trim(), n = icNorm(name), k = h.states[id + '_kiosk'];
    return { id, name, norm: n, node: ov[name] || nodes.find(nd => nd === n || nd.endsWith('_' + n) || nd.endsWith(n)) || '', state: st.state, who: k && !BAD_STATES.includes(k.state) ? k.state : '' };
  }).filter((d, i, a) => a.findIndex(x => x.norm === d.norm) === i).sort((a, b) => a.name.localeCompare(b.name));
}
function icModel(c) {
  const o = c.o, all = icDiscover(c), mine = icNorm(o.my_device), me = all.find(d => d.norm === mine);
  let targets = all.filter(d => d.norm !== mine);
  if (!o.show_all && Array.isArray(o.devices) && o.devices.length) { const keep = o.devices.map(icNorm); targets = targets.filter(d => keep.includes(d.norm)); }
  return { all, me, targets, busy: !!me && icBusy(me.state) };
}
/* the rows: who is in a call, and everyone you can ring */
function icRows(c, m) {
  if (!m.me) return `<div class="icmsg">${m.all.length ? 'Choose which screen this is (my_device) in the card settings.' : 'No intercom screens found yet.'}</div>`;
  const admin = !!(c._hass.user && c._hass.user.is_admin), glyph = n => /assist|tablet|kiosk|screen/i.test(n) ? 'tablet-dashboard' : 'speaker';
  let h = '';
  if (m.busy) h += `<div class="icme"><i class="live"></i><span>In a call with <b>${esc(m.me.who || '…')}</b></span><button class="ncround icend" data-act="hangup" aria-label="Hang up">${icn('phone-hangup', 20)}</button></div>`;
  h += m.targets.map(d => icBusy(d.state)
    ? `<div class="icrow busy"><span class="av">${icn(glyph(d.name), 20)}</span><span class="nm"><b>${esc(d.name)}</b><span>${d.who ? 'Talking to ' + esc(d.who) : 'In a call'}</span></span>${admin && d.node ? `<button class="ncround icend sm" data-act="end" data-e="${esc(d.node)}" aria-label="End their call">${icn('phone-hangup', 16)}</button>` : ''}</div>`
    : `<button class="icrow" data-act="call" data-e="${esc(d.name)}" ${m.busy ? 'disabled' : ''}><span class="av">${icn(glyph(d.name), 20)}</span><span class="nm"><b>${esc(d.name)}</b><span>${m.busy ? 'Hang up first' : 'Tap to call'}</span></span><span class="call">${icn('phone', 20)}</span></button>`).join('');
  if (!m.targets.length) h += '<div class="icmsg">No other screens to call.</div>';
  return h;
}
const icDraw = c => { if (c._pop && c._pop.host.isConnected && c._pop.kind === 'intercom') c._pop.body.innerHTML = `<div class="iclist">${icRows(c, icModel(c))}</div>`; };

kind({
  id: 'intercom', name: 'Intercom', title: 'Intercom', noEntity: true, noIcon: true, icon: 'phone', grid: { columns: 6, rows: 3 }, tap: { action: 'popup' }, hold: { action: 'none' },
  square: c => c.variant !== 'list',
  opts: [
    { k: 'my_device', l: 'Kiosk Satellite only: this screen (the name its intercom sensor shows, for example Ella’s Assistant)', t: 'text' },
    { k: 'variant', l: 'Layout', t: 'seg', o: [['tile', 'Tile (opens a list)'], ['list', 'List card']], d: 'tile' },
    { k: 'show_all', l: 'Show every other screen (off: use the devices list in YAML)', t: 'sw', d: true },
  ],
  extraIds: c => Object.keys(c._hass.states).filter(id => /^sensor\..*_intercom(_kiosk)?$/.test(id)),
  gridFor: c => c.o.variant === 'list' ? { columns: 12, rows: Math.max(3, Math.ceil((icModel(c).targets.length * 66 + 92) / 64)) } : { columns: 6, rows: 3 },
  after(c) { icDraw(c); },
  act(c, a, e) {
    const m = icModel(c);
    if (a === 'call' && m.me && m.me.node) c.call('esphome', m.me.node + '_intercom_call', { kiosk: e });
    else if (a === 'hangup' && m.me && m.me.node) c.call('esphome', m.me.node + '_intercom_hangup', {});
    else if (a === 'end' && e) c.call('esphome', e + '_intercom_hangup', {});
  },
  popup(c) {
    if (c.o.variant === 'list') return;
    const d = ncDialog(c, { title: c.title, icon: 'phone', w: 400 }); d.kind = 'intercom'; c._pop = d;
    d.sr.addEventListener('click', ev => { const a = ev.target.closest('[data-act]'); if (a && !a.disabled) c.k.act(c, a.dataset.act, a.dataset.e, a); });
    icDraw(c);
  },
  render(c) {
    const m = icModel(c), o = c.o, who = m.me && m.me.who;
    if (o.variant === 'list') return `<div class="nc wide tall icl ${m.busy ? 'on' : ''}" style="--rows:${c.k.gridFor(c).rows};height:auto;min-height:calc(var(--rows) * 56px)">${imgLayer(c)}<div class="in" style="display:grid;gap:12px;align-content:start;height:auto"><div class="nm" style="display:flex;align-items:center;gap:10px"><span class="ic" style="width:40px;height:40px">${icn('phone', 20)}</span><b style="font-size:16px">${esc(c.title)}</b><span style="margin-left:auto;font-size:12px;color:var(--secondary-text-color)">${esc(m.me ? m.me.name : '')}</span></div><div class="iclist">${icRows(c, m)}</div></div></div>`;
    const sub = !m.me ? 'Set up this screen' : m.busy ? `With ${esc(who || '…')}` : m.targets.length ? `Call ${m.targets.length === 1 ? esc(m.targets[0].name) : m.targets.length + ' screens'}` : 'Nobody to call';
    return `<div class="nc tile icm ${m.busy ? 'on lit' : ''}" style="--rows:3;--lc:${m.busy ? 'var(--n-ok)' : 'var(--accent-color)'};--lv:${m.busy ? 70 : 0}%">${imgLayer(c)}<div class="in"><span class="ic ${m.busy ? 'lit' : ''}" data-act="popup" role="button" tabindex="0" aria-label="${esc(c.title)}">${icn(m.busy ? 'phone-in-talk' : (c.cfg.icon || 'phone'))}</span>${m.busy ? `<span class="tgw"><button class="ncround icend" data-act="hangup" aria-label="Hang up">${icn('phone-hangup', 20)}</button></span>` : ''}<div class="nm"><b>${esc(c.title)}</b><span>${sub}</span></div></div></div>`;
  },
});
