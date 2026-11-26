/* ============ shortcut: a tile that runs any action (go to a page, play a radio station, call a script) ============ */
kind({
  id: 'shortcut', name: 'Shortcut', title: 'Shortcut', noEntity: true, icon: 'gesture-tap', square: c => c.size !== 'wide', grid: { columns: 6, rows: 3 }, tap: { action: 'none' }, hold: { action: 'none' },
  opts: [
    SIZE,
    TILE_VIEW, ...ICON_OPTS.filter(o => o.k !== 'show_name'),   /* shortcuts already have show_name */
    { k: 'sub', l: 'Second line (optional)', t: 'text' },
    { k: 'accent', l: 'Accent colour', t: 'seg', o: [['accent', 'Accent'], ['water', 'Water'], ['air', 'Air'], ['warm', 'Warm'], ['good', 'Green']], d: 'accent' },
    { k: 'show_icon', l: 'Show the icon', t: 'sw', d: true },
    { k: 'show_name', l: 'Show the name', t: 'sw', d: true },
  ],
  gridFor: c => ({ columns: c.o.size === 'wide' ? 12 : 6, rows: 3 }),
  render(c) {
    const o = c.o, tap = c.cfg.tap_action && c.cfg.tap_action.action !== 'none', wide = o.size === 'wide';
    if (o.tile_view === 'icon' && !wide) { const url = o.image ? c.url(o.image) : ''; return iconTile(c, { cls: `${o.accent} sc ${url ? 'art' : ''}`, lit: true, noImage: true, icStyle: url ? '' : 'background:linear-gradient(160deg,var(--lc),color-mix(in srgb,var(--lc) 60%,#ff7a2a));color:#1b1030', iconHtml: url ? `<span class="icimg" style="background-image:url('${esc(url)}')"></span>` : '' }); }
    const txt = (o.show_name ? `<b>${esc(c.title)}</b>` : '') + (o.sub ? `<span>${esc(o.sub)}</span>` : '');
    return `<div class="nc tile sc ${o.tile_view === 'centre' && !wide ? 'ctr' : ''} ${esc(o.accent)} ${wide ? 'wide' : ''} ${tap ? 'tap' : ''}" style="--rows:3">${imgLayer(c)}<div class="in">${o.show_icon ? `<span class="ic lit" role="button" tabindex="0" aria-label="${esc(c.title)}" style="background:linear-gradient(160deg,var(--lc),color-mix(in srgb,var(--lc) 60%,#ff7a2a));color:#1b1030">${icn(c.icon)}</span>` : ''}${txt ? `<div class="nm">${txt}</div>` : ''}</div></div>`;
  },
});
