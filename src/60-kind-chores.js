/* ============ chores: a progress tile that opens the child's chores screen ============
   Only works with KSH Family Hub for now (ksh_chores/* and ksh_family_hub/people/list, and its ksh-family-hub-kids-card). */
/* what the tile shows for one person: chores today, how many are done, how many are late, their stars */
function chStats(c) {
  const d = c._ch; if (!d) return null; if (!d.ok) return { off: true };
  const want = String(c.o.person || '').trim().toLowerCase();
  const me = d.people.find(p => p.id === c.o.person || String(p.name || '').toLowerCase() === want || String(p.full_name || '').toLowerCase() === want);
  if (!me) return { missing: true };
  const s = d.state, chore = id => s.chores.find(x => x.id === id);
  const keep = i => { const ch = chore(i.chore_id); return !!ch && ((ch.assignees || []).length ? ch.assignees.includes(me.id) : true); };
  const today = (s.items || []).filter(keep), late = (s.overdue || []).filter(keep).length;
  const done = today.filter(i => ['done', 'approved'].includes(i.status)).length;
  return { me, done, total: today.length, late, stars: Math.round((s.balances && s.balances[me.id]) || 0) };
}
const chRing = (pct, col) => { const R = 25, C = 2 * Math.PI * R; return `<svg class="chr" viewBox="0 0 58 58" aria-hidden="true"><circle cx="29" cy="29" r="${R}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="4"/><circle cx="29" cy="29" r="${R}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 29 29)" style="filter:drop-shadow(0 0 4px ${col})"/></svg>`; };

kind({
  id: 'chores', name: 'Chores', title: 'Chores', noEntity: true, noIcon: true, icon: 'broom', square: () => true, grid: { columns: 6, rows: 3 }, tap: { action: 'popup' }, hold: { action: 'none' },
  opts: [
    TILE_VIEW, ...ICON_OPTS,
    { k: 'person', l: 'KSH Family Hub only: person (their name in People & guests)', t: 'text' },
    { k: 'style', l: 'Look of the chores screen', t: 'select', o: [['', 'From their colour'], ['galaxy', 'Galaxy'], ['candy', 'Candy'], ['ocean', 'Ocean'], ['jungle', 'Jungle']], d: '' },
    { k: 'show_stars', l: 'Show their stars on the tile', t: 'sw', d: true },
  ],
  connect(c) {
    if (c._subs.length || !c._hass || !c._hass.connection || !c._hass.callWS) return;
    const load = async () => {
      try { const [pp, st] = await Promise.all([c._hass.callWS({ type: 'ksh_family_hub/people/list' }), c._hass.callWS({ type: 'ksh_chores/get_state' })]); c._ch = { ok: true, people: pp.people, state: st }; }
      catch (e) { c._ch = { ok: false, err: e && e.message }; }
      c.refresh();
    };
    load();
    let t; const p = c._hass.connection.subscribeMessage(() => { clearTimeout(t); t = setTimeout(load, 300); }, { type: 'ksh_chores/subscribe' }); p.catch(() => {}); c._subs.push(p);
    /* a new day brings new chores */
    clearInterval(c._tick); c._tick = setInterval(() => c.isConnected && load(), 10 * 60e3); c._subs.push(() => clearInterval(c._tick));
  },
  /* keeps the open chores screen in step with Home Assistant (it needs a fresh hass to talk to the hub) */
  sig(c) { if (c._pop && c._pop.el && c._pop.host.isConnected) c._pop.el.hass = c._hass; return ''; },
  popup(c) {
    const d = ncDialog(c, { title: c.cfg.name || 'Chores', icon: 'broom', w: 560, flush: true }); c._pop = d;
    if (!customElements.get('ksh-family-hub-kids-card')) { d.body.innerHTML = '<div class="icmsg" style="padding:24px">The chores screen comes from KSH Family Hub. Install it and reload this page.</div>'; return; }
    const el = document.createElement('ksh-family-hub-kids-card');
    try { el.setConfig({ person: c.o.person, ...(c.o.style ? { style: c.o.style } : {}), height: 'min(72vh, 640px)' }); } catch (e) { d.body.innerHTML = `<div class="icmsg" style="padding:24px">${esc(e.message)}</div>`; return; }
    el.hass = c._hass; d.body.appendChild(el); d.el = el;
  },
  render(c) {
    const o = c.o, s = chStats(c), name = c.title;
    if (!s) return `<div class="nc tile chm" style="--rows:3">${imgLayer(c)}<div class="in"><span class="ic" data-act="popup" role="button" tabindex="0">${icn(c.cfg.icon || 'broom')}</span><div class="nm"><b>${esc(name)}</b><span>Loading…</span></div></div></div>`;
    if (s.off || s.missing) return `<div class="nc tile chm" style="--rows:3">${imgLayer(c)}<div class="in"><span class="ic" data-act="popup" role="button" tabindex="0">${icn(c.cfg.icon || 'broom')}</span><div class="nm"><b>${esc(name)}</b><span>${s.missing ? 'Person not found' : 'KSH Family Hub is not set up'}</span></div></div></div>`;
    const all = s.total > 0 && s.done >= s.total, pct = s.total ? s.done / s.total : 1, col = all ? 'var(--n-ok)' : s.late ? 'var(--n-warn)' : 'var(--accent-color)';
    const line = !s.total ? (s.late ? `${s.late} late` : 'Nothing today') : all ? 'All done today' : `${s.done} of ${s.total} done${s.late ? ` · ${s.late} late` : ''}`;
    if (o.tile_view === 'icon') return iconTile(c, { cls: 'chm', on: all, lit: all, ring: true, level: Math.round(pct * 100), icon: all ? 'check-bold' : (c.cfg.icon || 'broom'), badge: o.show_stars ? `${icn('star', 11, 'color:#ffc15a')}${s.stars}` : '', style: `--lc:${col};--lv:${all ? 60 : 0}%` });
    return `<div class="nc tile ${o.tile_view === 'centre' ? 'ctr' : ''} chm ${all ? 'on lit' : ''}" style="--rows:3;--lc:${col};--lv:${all ? 60 : 0}%">${imgLayer(c)}<div class="in"><span class="ic ring ${all ? 'lit' : ''}" data-act="popup" role="button" tabindex="0" aria-label="${esc(name)}">${chRing(pct, col)}${icn(all ? 'check-bold' : (c.cfg.icon || 'broom'))}</span>${o.show_stars ? `<span class="tgw"><span class="pchip">${icn('star', 15, 'color:#ffc15a')}${s.stars}</span></span>` : ''}<div class="nm"><b>${esc(name)}</b><span style="${s.late && !all ? 'color:var(--n-warn)' : ''}">${esc(line)}</span></div><div class="slw"><div class="chbar"><i style="width:${Math.round(pct * 100)}%;background:${col}"></i></div></div></div></div>`;
  },
});
