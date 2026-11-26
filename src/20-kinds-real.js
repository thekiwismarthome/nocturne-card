/* ============ climate ============ */
const CLIMATE_RGB = { heat: '255,110,60', cool: '50,165,255', dry: '40,210,160', auto: '140,120,255', heat_cool: '140,120,255', fan_only: '80,200,255' };
const rndBtn = (icon, onclick, color) => `<button class="ncround" aria-label="${icon}" style="${color ? 'color:' + color : ''}" onclick="${onclick}">${icn(icon, 19)}</button>`;
kind({
  id: 'climate', square: c => c.variant === 'compact', name: 'Climate', domains: ['climate'], icon: 'thermostat', grid: { columns: 12, rows: 5 }, tap: { action: 'none' }, hold: { action: 'more-info' },
  opts: [{ k: 'variant', l: 'Layout', t: 'seg', o: [['dial', 'Dial'], ['compact', 'Compact']], d: 'dial' }, { k: 'side', l: 'Mode, fan, indoor and humidity column', t: 'sw', d: true }, { k: 'dial_size', l: 'Dial size', t: 'range', min: 140, max: 210, u: 'px', d: 210 }, { k: 'step', l: 'Temperature step', t: 'seg', o: [['0.5', '0.5°'], ['1', '1°']], d: '1' }, ...switchOpts(c => c.variant === 'compact')],
  after(c, root) { sxAfter(c, root); },
  gridFor: c => c.o.variant === 'compact' ? { columns: 6, rows: 3 } : { columns: 12, rows: 5 },
  render(c) {
    const id = c.e, s = c.S(id); if (!s) return bcard(c, { name: c.title, label: 'Entity not found', rows: 3, wide: false });
    const rgb = CLIMATE_RGB[s.state], g = glow(rgb, 0.3, 0.2), a = s.attributes, on = s.state !== 'off';
    if (c.o.variant === 'compact') {
      const modes = ['auto', 'cool', 'heat'].filter(m => (a.hvac_modes || ['auto', 'cool', 'heat']).includes(m)), MI = { auto: ['thermostat-auto', '#6ee7a8'], cool: ['snowflake', '#5ac8fa'], heat: ['fire', '#ff9248'], dry: ['water-percent', '#22c997'] };
      const t = a.temperature, label = on ? `${s.state === 'heat' ? 'Heating to' : s.state === 'cool' ? 'Cooling to' : 'Set to'} ${t ?? '–'}°C` : `Off · ${a.current_temperature ?? '–'}°C indoors`;
      const buttons = `<div class="ncgrid" style="grid-template-columns:repeat(${modes.length},1fr);justify-items:center">${modes.map(m => `<button class="ncround" style="${s.state === m ? `color:#fff;background:${MI[m][1]}` : ''}" aria-label="${m}" ${svcAttr(s.state === m ? 'climate.turn_off' : 'climate.set_hvac_mode', s.state === m ? { entity_id: id } : { entity_id: id, hvac_mode: m })}>${icn(MI[m][0], 19)}</button>`).join('')}</div>`;
      if (c.o.switch_style && c.o.switch_style !== 'standard') return sxTile(c, { cls: 'cl', on, style: `--lc:${rgb ? `rgb(${rgb})` : 'var(--n-warm)'}`, face: `<div class="hd"><span class="ic ${on ? 'lit' : ''}" data-act="more-info" role="button" tabindex="0" aria-label="More info">${icn(c.icon)}</span><div class="nm"><b>${esc(c.title)}</b><span style="${on ? 'color:var(--n-ok)' : ''}">${label}</span></div></div><div class="slw" style="margin-top:auto">${buttons}</div>` });
      return bcard(c, { name: c.title, icon: c.icon, iconColor: on ? 'var(--accent-color)' : undefined, label, labelColor: on ? 'var(--n-ok)' : undefined, tog: tgl(on, 'toggle', id), rows: 3, wide: false, bg: g.bg, shadow: g.shadow,
        ctl: buttons });
    }
    const step = parseFloat(c.o.step), t = a.temperature ?? a.min_temp ?? 21, mn = a.min_temp ?? 16, mx = a.max_temp ?? 31, vars = { dial: +c.o.dial_size };
    const label = on ? `${({ heat: 'Heating to', cool: 'Cooling to', dry: 'Drying at', auto: 'Auto at', heat_cool: 'Auto at', fan_only: 'Fan at' })[s.state] || s.state} ${t}°C` : `Off · set to ${t}°C`;
    const H = "document.querySelector('home-assistant').hass";
    return bcard(c, { name: c.title, icon: false, center: true, label, labelColor: on ? 'var(--n-ok)' : 'var(--secondary-text-color)', rows: 5, wide: true, bg: g.bg, shadow: g.shadow,
      areas: "'left dial up' 'left dial down' 'left dial pwr' 'n n n' 'l l l'", cols: '60px 1fr 60px', trows: '1fr 1fr 1fr auto auto', gridCss: 'row-gap:0;',
      fields: {
        left: c.o.side ? climateLeft(s, vars) : '', dial: climateDial(s, vars),
        up: rndBtn('plus', `${H}.callService('climate','set_temperature',{entity_id:'${id}',temperature:Math.min(${mx},${t}+${step})})`),
        down: rndBtn('minus', `${H}.callService('climate','set_temperature',{entity_id:'${id}',temperature:Math.max(${mn},${t}-${step})})`),
        pwr: rndBtn('power', `${H}.callService('climate','${on ? 'turn_off' : 'turn_on'}',{entity_id:'${id}'})`, on ? 'var(--accent-color)' : ''),
      },
      fieldCss: { left: 'align-self:center;justify-self:start;overflow:visible;position:relative;z-index:6;', dial: 'align-self:center;width:100%;padding:4px 0;overflow:visible;', up: 'justify-self:end;align-self:center;', down: 'justify-self:end;align-self:center;', pwr: 'justify-self:end;align-self:center;' } });
  },
});

/* ============ media player ============ */
const ART_MODES = { off: null, sharp: { op: 100, blur: 0, fade: false }, soft: { op: 55, blur: 0, fade: true }, blurred: { op: 75, blur: 18, fade: true } };
function artLayer(c, id) {
  const m = ART_MODES[c.o.artwork], pic = c.at(id, 'entity_picture'); if (!m || !pic) return '';
  return `<div class="imglayer ${m.fade ? 'fade' : ''}" style="background-image:url('${esc(c.url(pic))}');background-size:cover;background-position:center;opacity:${m.op / 100};filter:blur(${m.blur}px)${m.blur ? ';transform:scale(1.15)' : ''}"></div>`;
}
/* which player does the card start on? the one belonging to this device (Kiosk Satellite), else the pinned one */
function resolvePlayer(c) {
  const o = c.o, list = (o.players && o.players.length ? o.players : [c.e]).filter(p => c.S(p)), dn = (c._device || '').toLowerCase();
  if (o.start === 'last' && c._last && list.includes(c._last)) return { id: c._last, why: 'last used' };
  if (o.start === 'local' && dn) { const slug = dn.replace(/[^a-z0-9]+/g, '_'); const hit = list.find(p => c.fname(p).toLowerCase() === dn || first(p) === slug || first(p).startsWith(slug)); if (hit) return { id: hit, why: 'this device' }; }
  const pin = list.includes(o.pinned_player) ? o.pinned_player : (list.includes(c.e) ? c.e : list[0]);
  return { id: pin, why: 'pinned' };
}
kind({
  id: 'media', name: 'Media player', domains: ['media_player'], icon: 'speaker', grid: { columns: 12, rows: 3 }, tap: { action: 'none' }, hold: { action: 'none' },
  opts: [{ k: 'variant', l: 'Layout', t: 'seg', o: [['compact', 'Compact tile'], ['full', 'Full player']], d: 'compact' }, { k: 'volume', l: 'Volume slider', t: 'sw', d: true }, { k: 'power', l: 'Power switch', t: 'seg', o: [['auto', 'If the player can'], ['show', 'Show'], ['hide', 'Hide']], d: 'auto' }, { k: 'shuffle', l: 'Shuffle and repeat buttons', t: 'sw', d: true }, { k: 'spin', l: 'Rotate the artwork while playing (tile button and full player)', t: 'sw', d: true },
    { k: 'icon_artwork', l: 'Show the artwork in the top-left button', t: 'sw', d: false },
    { k: 'media_view', l: 'Compact tile style', t: 'seg', o: [['classic', 'Classic'], ['slim', 'Slim'], ['big', 'Big artwork']], d: 'classic', when: c => c.variant !== 'full' },
    { k: 'shortcuts', l: 'Shortcuts (albums, playlists, stations; needs Music Assistant)', t: 'list', when: c => c.variant !== 'full', fields: {
      name: { label: 'Name', required: true, selector: { text: {} } },
      media_type: { label: 'Type', selector: { select: { mode: 'dropdown', options: ['playlist', 'album', 'radio', 'artist', 'track'] } } },
      media_id: { label: 'What to play (name or URI; empty uses the name)', selector: { text: {} } },
      image: { label: 'Picture URL', selector: { text: {} } },
      icon: { label: 'Icon, when there is no picture', selector: { icon: {} } } } },
    { k: 'shortcut_style', l: 'Shortcut style', t: 'seg', o: [['art', 'Artwork'], ['names', 'Artwork and names'], ['pill', 'Name pills']], d: 'art', when: c => c.variant !== 'full' },
    { k: 'shortcut_columns', l: 'Shortcuts per row', t: 'range', min: 4, max: 9, d: 5, when: c => c.variant !== 'full' && c.shortcut_style !== 'pill' },
    { k: 'shortcut_wrap', l: 'Extra shortcuts go on a second row (off: swipe sideways)', t: 'sw', d: false, when: c => c.variant !== 'full' && c.shortcut_style !== 'pill' },
    { k: 'shortcut_gap', l: 'Space between shortcuts', t: 'range', min: 0, max: 16, u: 'px', d: 8, when: c => c.variant !== 'full' },
    { k: 'artwork', l: 'Artwork as background', t: 'seg', o: [['off', 'Off'], ['sharp', 'Sharp'], ['soft', 'Soft'], ['blurred', 'Blurred']], d: 'off' },
    { k: 'players', l: 'Players this card can offer', t: 'entity', domains: ['media_player'], multi: true }, { k: 'pinned_player', l: 'Pinned player', t: 'entity', domains: ['media_player'] },
    { k: 'start', l: 'Start on', t: 'seg', o: [['local', 'This device'], ['pinned', 'Pinned player'], ['last', 'Last used']], d: 'local' }],
  gridFor: c => c.o.variant === 'full' && customElements.get('nocturne-music-card') ? { columns: 12, rows: 11 } : { columns: 12, rows: 3 },
  autoRows: o => o.variant !== 'full' && !!((o.shortcuts || []).length || (o.media_view && o.media_view !== 'classic')),
  extraIds: c => (c.o.players || []).concat(c.o.pinned_player),
  sig: c => c._device || '',
  connect(c) { if (c._deviceAsked) return; c._deviceAsked = true; try { const ks = window.kioskSatellite; const r = ks && ks.getDeviceInfo && ks.getDeviceInfo(); Promise.resolve(r).then(i => { const n = i && (i.name || i.deviceName); if (n) { c._device = n; c._update(true); } }).catch(() => {}); } catch (_) {} },
  render(c) {
    const o = c.o, r = resolvePlayer(c), id = r.id || c.e, s = c.S(id), a = (s && s.attributes) || {}; c._resolved = id;
    if (o.variant === 'full' && customElements.get('nocturne-music-card')) return `<div class="mc" style="--rows:11;min-height:695px;height:100%;position:relative"></div>`;
    const play = s && s.state === 'playing', on = s && !['off', 'unavailable'].includes(s.state);
    const label = a.media_title ? `${esc(a.media_title)}${a.media_artist ? ' · ' + esc(a.media_artist) : ''}` : esc(nice(s ? s.state : 'unavailable'));
    const T = (svc, ic, col) => round(ic, 'media_player.' + svc, { entity_id: id }, col);
    const pic = a.entity_picture, art = o.icon_artwork && pic ? `<div style="width:100%;height:100%;border-radius:50%;background:url('${esc(c.url(pic))}') center/cover;animation:ncspin 12s linear infinite;animation-play-state:${play && o.spin ? 'running' : 'paused'}"></div>` : '';
    /* power: only for players that say they can be turned on and off (supported_features 128 / 256), unless forced */
    const feat = num(a.supported_features) || 0, power = o.power === 'show' || (o.power !== 'hide' && !!(feat & (128 | 256)));
    const name = c.cfg.name || (s ? c.fname(id) : c.title);
    const canShuf = o.shuffle && (a.shuffle !== undefined || (feat & 32768)), canRep = o.shuffle && (a.repeat !== undefined || (feat & 262144));
    const sm = (icon, svc, data, on, label) => `<button class="ncround" style="width:34px;height:34px;${on ? 'color:var(--accent-color)' : ''}" aria-label="${label}" aria-pressed="${!!on}" ${svcAttr('media_player.' + svc, data)}>${icn(icon, 17)}</button>`;
    const rep = a.repeat || 'off', nextRep = { off: 'all', all: 'one', one: 'off' }[rep] || 'all';
    const shuf = canShuf ? sm(a.shuffle ? 'shuffle' : 'shuffle-disabled', 'shuffle_set', { entity_id: id, shuffle: !a.shuffle }, a.shuffle, 'Shuffle') : '';
    const rp = canRep ? sm(rep === 'one' ? 'repeat-once' : rep === 'all' ? 'repeat' : 'repeat-off', 'repeat_set', { entity_id: id, repeat: nextRep }, rep !== 'off', 'Repeat') : '';
    const vol = o.volume ? `<div class="ncmslider" style="flex:1;min-width:0">${slider('media_player.volume_set', { entity_id: id }, 'volume_level', Math.round((a.volume_level || 0) * 100), { min: 0, scale: 0.01, label: 'Volume' })}</div>` : '<div style="flex:1"></div>';
    const volRow = shuf || rp || o.volume ? `<div style="display:flex;align-items:center;gap:8px">${shuf}${vol}${rp}</div>` : '';
    /* shortcuts: chips that play an album, playlist or station on this player */
    const list = o.shortcuts || [], low = x => String(x || '').toLowerCase(), now = [a.media_album_name, a.media_title, a.media_channel, a.media_playlist].map(low).filter(Boolean);
    const cs = o.shortcut_style || 'art';
    const per = clamp(+o.shortcut_columns || 5, 3, 10), cn = Math.min(per, Math.max(4, list.length)), swipe = !o.shortcut_wrap && list.length > cn, cg = o.shortcut_gap === undefined ? 8 : num(o.shortcut_gap) || 0;
    const chips = list.length ? `<div class="ncqs ${cs} ${o.shortcut_wrap ? 'wrap' : ''}" style="--n:${swipe ? cn + 0.35 : cn};--gaps:${swipe ? cn : cn - 1};--cg:${cg}px">${list.map(q => { const hit = on && play && now.includes(low(q.media_id || q.name)); return `<button class="ncq ${hit ? 'now' : ''}" aria-label="Play ${esc(q.name)}" ${svcAttr('music_assistant.play_media', { entity_id: id, media_type: q.media_type || 'playlist', media_id: q.media_id || q.name, enqueue: q.enqueue || 'replace' })}><span class="qa" ${q.image ? `style="background-image:url('${esc(c.url(q.image))}')"` : ''}>${q.image ? '' : icn(q.icon || 'music', 18)}</span>${cs === 'art' ? '' : `<em>${esc(q.name)}</em>`}</button>`; }).join('')}</div>` : '';
    const view = o.media_view || 'classic';
    if (view !== 'classic') {
      const cover = `<span class="mart ${play && o.spin && view === 'slim' ? 'spin' : ''}" data-act="more-info" ${pic ? `style="background-image:url('${esc(c.url(pic))}')"` : ''}>${pic ? '' : icn('music', 28)}</span>`;
      const trans = `<div class="mctl">${view === 'big' ? T('media_previous_track', 'skip-previous') : ''}${T('media_play_pause', play ? 'pause' : 'play', 'var(--accent-color)')}${T('media_next_track', 'skip-next')}${power ? tgl(on, 'toggle', id) : ''}</div>`;
      const title = esc(a.media_title || nice(s ? s.state : 'unavailable')), who = esc(a.media_title ? (a.media_artist || name) : name);
      const text = `<div class="mtx"><b>${title}</b><span>${who}</span></div>`;
      return `<div class="bc w auto mv ${view}">${artLayer(c, id)}<div class="mbody">${view === 'big'
        ? `<div class="mrow">${cover}<div class="minfo">${text}${trans}</div></div>${volRow}`
        : `<div class="mrow">${cover}${text}${trans}</div>${o.volume ? volRow : ''}`}${chips}</div></div>`;
    }
    const html = bcard(c, { name, icon: c.cfg.icon || a.icon || c.k.icon, iconHtml: art, iconColor: play ? 'var(--accent-color)' : undefined, label, tog: power ? tgl(on, 'toggle', id) : '', rows: 3, wide: true, image: undefined, cls: chips ? 'auto' : '', areas: power ? "'i tr tog' 'n n n' 'l l l' 'ctl ctl ctl'" : "'i tr' 'n n' 'l l' 'ctl ctl'", cols: power ? 'auto 1fr auto' : 'auto 1fr',
      fields: { tr: `<div style="display:flex;gap:${power ? 6 : 10}px">${T('media_previous_track', 'skip-previous')}${T('media_play_pause', play ? 'pause' : 'play', 'var(--accent-color)')}${T('media_next_track', 'skip-next')}</div>` }, fieldCss: { tr: `justify-self:${power ? 'center' : 'end'};align-self:center;` },
      ctl: volRow + chips });
    return html.replace('<div class="grid"', `${artLayer(c, id)}<div class="grid"`);
  },
  after(c, root) {
    const host = root.querySelector('.mc'); if (!host) return;
    const o = c.o, id = c._resolved, sig = JSON.stringify([id, o.players, o.volume, o.shuffle, o.spin]);
    if (!c._mc) { c._mc = document.createElement('nocturne-music-card'); c._mc.style.cssText = 'display:block;height:100%'; c._mcSig = ''; }
    host.appendChild(c._mc);
    if (c._mcSig !== sig) { c._mcSig = sig; try { localStorage.removeItem('nmc:' + id); } catch (_) {} c._mc.setConfig({ entity: id, speakers: o.players && o.players.length ? o.players : [id], show_volume: o.volume, show_shuffle_repeat: o.shuffle, spin_art: o.spin, library_only: true }); }
    c._mc.hass = c._hass;
    const card = c._mc.shadowRoot && c._mc.shadowRoot.querySelector('.card'), art = c.at(id, 'entity_picture'), m = ART_MODES[o.artwork];
    if (card && m && art && !card.querySelector('.nkbg')) card.insertAdjacentHTML('afterbegin', `<div class="nkbg" style="position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;border-radius:inherit"><div style="position:absolute;inset:${m.blur ? '-12%' : '0'};background:url('${esc(c.url(art))}') center/cover no-repeat;opacity:${m.op / 100};filter:blur(${m.blur}px)"></div>${m.fade ? '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,12,28,.15),rgba(10,12,28,.82))"></div>' : ''}</div>`);
  },
});

/* ============ alarm panel ============ */
const chip = (ic, lab, col, id) => `<button class="ncchip" ${id ? `data-act="more-info" data-e="${esc(id)}"` : ''}><span class="c" style="color:${col}">${icn(ic, 17)}</span><span class="cl">${esc(lab)}</span></button>`;
kind({
  id: 'alarm', name: 'Alarm panel', domains: ['alarm_control_panel'], icon: 'shield-check-outline', grid: { columns: 12, rows: 4 }, tap: { action: 'more-info' }, hold: { action: 'more-info' },
  opts: [{ k: 'lock_entity', l: 'Lock chip', t: 'entity', domains: ['lock'] }, { k: 'door_entity', l: 'Door chip', t: 'entity', domains: ['binary_sensor'] }, { k: 'presence_entity', l: 'Presence chip', t: 'entity', domains: ['binary_sensor'] }, { k: 'camera_entity', l: 'Camera chip', t: 'entity', domains: ['camera'] }, { k: 'presence_label', l: 'Presence chip label', t: 'text' }, { k: 'camera_label', l: 'Camera chip label', t: 'text' },
    { k: 'arm', l: 'Arm / disarm buttons', t: 'sw', d: false }, { k: 'code', l: 'Alarm code (stored in the dashboard, so only use if you accept that)', t: 'text' }],
  gridFor: c => ({ columns: 12, rows: c.o.arm ? 5 : 4 }),
  render(c) {
    const o = c.o, s = c.st(c.e) || 'unknown', armed = s.startsWith('armed'), trig = s === 'triggered', pend = s === 'arming' || s === 'pending';
    const rgb = trig ? '255,90,100' : armed ? '70,225,165' : pend ? '255,196,90' : null, g = glow(rgb, trig ? .42 : .24, .2);
    const LAB = { disarmed: 'Disarmed', armed_home: 'Armed · home', armed_away: 'Armed · away', armed_night: 'Armed · night', armed_vacation: 'Armed · vacation', arming: 'Arming…', pending: 'Entry delay', triggered: 'Triggered' };
    const chips = [];
    if (o.lock_entity) { const l = c.st(o.lock_entity) === 'locked'; chips.push(chip(l ? 'lock' : 'lock-open-variant', l ? 'Locked' : 'Unlocked', l ? 'var(--n-ok)' : 'var(--n-warn)', o.lock_entity)); }
    if (o.door_entity) { const d = c.st(o.door_entity) === 'on'; chips.push(chip(d ? 'door-open' : 'door-closed', d ? 'Door open' : 'Door shut', d ? 'var(--n-warn)' : 'var(--secondary-text-color)', o.door_entity)); }
    if (o.presence_entity) { const p = c.st(o.presence_entity) === 'on'; chips.push(chip('motion-sensor', o.presence_label || c.fname(o.presence_entity).replace(/ (area )?(state|presence|occupancy)$/i, ''), p ? 'var(--accent-color)' : 'var(--secondary-text-color)', o.presence_entity)); }
    if (o.camera_entity) chips.push(chip('cctv', o.camera_label || c.fname(o.camera_entity).split(/[ -]/)[0], 'var(--secondary-text-color)', o.camera_entity));
    const code = o.code ? { code: o.code } : {};
    const arm = o.arm ? `<div style="display:flex;gap:6px;margin-top:10px">${[['alarm_disarm', 'Disarm', 'disarmed'], ['alarm_arm_home', 'Home', 'armed_home'], ['alarm_arm_away', 'Away', 'armed_away'], ['alarm_arm_night', 'Night', 'armed_night']].map(m => `<button class="btn" aria-pressed="${s === m[2]}" ${svcAttr('alarm_control_panel.' + m[0], Object.assign({ entity_id: c.e }, code))}>${m[1]}</button>`).join('')}</div>` : '';
    return bcard(c, { name: c.title, icon: c.icon, iconColor: trig ? 'var(--n-bad)' : armed ? 'var(--n-ok)' : undefined, iconFilter: armed ? 'drop-shadow(0 0 6px var(--n-ok))' : undefined, label: LAB[s] || nice(s), labelColor: armed ? 'var(--n-ok)' : undefined, rows: o.arm ? 5 : 4, wide: true, bg: g.bg, shadow: g.shadow, anim: trig ? 'ncpulse 1.2s ease-in-out infinite' : '',
      ctl: (chips.length ? `<div class="ncgrid" style="grid-template-columns:repeat(${Math.max(chips.length, 4)},1fr)">${chips.join('')}</div>` : '') + arm });
  },
});

/* ============ lock ============ */
kind({
  id: 'lock', square: () => true, name: 'Lock', domains: ['lock'], icon: 'lock', grid: { columns: 6, rows: 3 }, tap: { action: 'none' }, hold: { action: 'more-info' },
  opts: [{ k: 'show_battery', l: 'Show battery in the label', t: 'sw', d: true }, { k: 'battery_entity', l: 'Battery sensor (if not an attribute of the lock)', t: 'entity', domains: ['sensor'] }, { k: 'confirm', l: 'Ask before locking or unlocking', t: 'sw', d: true }],
  extraIds: c => [c.o.battery_entity],
  toggle(c, id) { const l = c.st(id) === 'locked'; if (c.o.confirm && !window.confirm(`${l ? 'Unlock' : 'Lock'} ${c.title}?`)) return; c.call('lock', l ? 'unlock' : 'lock', { entity_id: id }); },
  render(c) {
    const s = c.st(c.e), locked = s === 'locked', unl = s === 'unlocked', a = (c.S(c.e) || {}).attributes || {}, bat = c.o.battery_entity ? num(c.st(c.o.battery_entity)) : a.battery_level;
    const g = glow(unl ? '255,190,90' : locked ? '70,225,165' : null, locked ? .12 : .24, .16);
    return bcard(c, { name: c.title, icon: c.cfg.icon || (locked ? 'lock' : 'lock-open-variant'), iconColor: locked ? 'var(--n-ok)' : 'var(--n-warn)', iconFilter: locked ? 'drop-shadow(0 0 6px var(--n-ok))' : '', label: `${locked ? 'Locked' : unl ? 'Unlocked' : nice(s || 'unknown')}${c.o.show_battery && bat != null ? ' · battery ' + bat + '%' : ''}`, tog: tgl(locked, 'toggle', c.e), areas: "'i tog' 'n n' 'l l'", trows: 'auto 1fr auto', rows: 3, bg: g.bg, shadow: g.shadow });
  },
});

/* ============ vacuum ============ */
kind({
  id: 'vacuum', square: () => true, name: 'Vacuum', domains: ['vacuum'], icon: 'robot-vacuum', grid: { columns: 6, rows: 3 }, tap: { action: 'none' }, hold: { action: 'more-info' },
  opts: [{ k: 'battery_entity', l: 'Battery sensor (if not an attribute)', t: 'entity', domains: ['sensor'] }, { k: 'bin_entity', l: 'Bin full sensor', t: 'entity', domains: ['binary_sensor'] }, { k: 'ring', l: 'Battery ring around the icon', t: 'sw', d: true }, { k: 'buttons', l: 'Start and Dock buttons', t: 'sw', d: true }],
  extraIds: c => [c.o.battery_entity, c.o.bin_entity],
  render(c) {
    const s = c.st(c.e) || 'unknown', o = c.o, bat = num(o.battery_entity ? c.st(o.battery_entity) : c.at(c.e, 'battery_level')), clean = s === 'cleaning', bin = o.bin_entity ? c.st(o.bin_entity) === 'on' : null;
    const ring = o.ring && bat != null ? `radial-gradient(closest-side, var(--card-background-color) 80%, transparent 82%), conic-gradient(var(--n-ok) ${bat}%, var(--n-well) 0)` : undefined;
    const lab = `${bat != null ? Math.round(bat) + '%' : nice(s)}${bin == null ? '' : bin ? ' · bin full' : ' · bin ok'}`;
    return bcard(c, { name: c.title, icon: c.icon, iconBg: ring, iconColor: clean ? 'var(--accent-color)' : undefined, label: lab, tog: `<span class="pill" style="color:${clean ? 'var(--accent-color)' : s === 'error' ? 'var(--n-bad)' : 'var(--n-ok)'}">${esc(s)}</span>`, rows: 3,
      ctl: o.buttons ? `<div class="ncgrid" style="grid-template-columns:1fr 1fr"><button class="ncpill pri" ${svcAttr('vacuum.' + (clean ? 'pause' : 'start'), { entity_id: c.e })}>${icn(clean ? 'pause' : 'play', 14)}${clean ? 'Pause' : 'Start'}</button><button class="ncpill" ${svcAttr('vacuum.return_to_base', { entity_id: c.e })}>${icn('home-import-outline', 14)}Dock</button></div>` : '' });
  },
});

/* ============ vehicle ============ */
kind({
  id: 'vehicle', square: () => true, name: 'Vehicle', domains: ['sensor'], icon: 'car-electric', grid: { columns: 6, rows: 3 }, tap: { action: 'more-info' }, hold: { action: 'more-info' },
  opts: [{ k: 'range_entity', l: 'Range sensor', t: 'entity', domains: ['sensor'] }, { k: 'lock_entity', l: 'Lock', t: 'entity', domains: ['lock'] }, { k: 'charging_entity', l: 'Charging sensor', t: 'entity', domains: ['binary_sensor'] }, { k: 'time_entity', l: 'Charge time remaining sensor', t: 'entity', domains: ['sensor'] }, { k: 'show_range', l: 'Show range and lock state', t: 'sw', d: true }, { k: 'bar', l: 'Battery bar', t: 'sw', d: true }],
  extraIds: c => [c.o.range_entity, c.o.lock_entity, c.o.charging_entity, c.o.time_entity],
  render(c) {
    const o = c.o, b = Math.round(num(c.st(c.e)) || 0), ch = o.charging_entity && c.st(o.charging_entity) === 'on', t = o.time_entity ? c.st(o.time_entity) : '';
    const rng = o.range_entity ? c.st(o.range_entity) : null, lk = o.lock_entity ? c.st(o.lock_entity) : null, ru = (c.at(o.range_entity, 'unit_of_measurement')) || 'km';
    const lab = o.show_range ? [rng != null ? `${Math.round(num(rng) ?? 0)} ${ru}` : '', lk ? (lk === 'locked' ? 'locked' : 'unlocked') : ''].filter(Boolean).join(' · ') : '';
    return bcard(c, { name: c.title, icon: c.icon, iconBg: `radial-gradient(closest-side, var(--card-background-color) 80%, transparent 82%), conic-gradient(${b < 20 ? 'var(--n-bad)' : 'var(--n-ok)'} ${b}%, var(--n-well) 0)`, iconColor: ch ? 'var(--accent-color)' : undefined, iconFilter: ch ? 'drop-shadow(0 0 6px var(--n-glow))' : '', label: lab, tog: `<span class="pill" style="color:${ch ? 'var(--accent-color)' : 'var(--secondary-text-color)'}">${ch ? 'Charging' : 'Parked'}</span>`, rows: 3,
      ctl: o.bar ? barRow(b, `${b}%${ch && t && !BAD_STATES.includes(t) ? ' · ' + esc(t) : ''}`) : '' });
  },
});

/* ============ plants ============ */
kind({
  id: 'plants', name: 'Plants', title: 'Plants', domains: ['plant'], multi: true, icon: 'sprout', grid: { columns: 6, rows: 4 }, tap: { action: 'none' }, hold: { action: 'none' },
  opts: [{ k: 'summary', l: 'Summary line', t: 'sw', d: true }],
  gridFor: c => ({ columns: 6, rows: 2 + Math.ceil(Math.max(2, c.list().length) * 0.75) }),
  render(c) {
    const items = c.list(), bad = items.filter(p => c.st(p.entity) === 'problem').length;
    const rows = items.map(p => { const s = c.S(p.entity); if (!s) return ''; const ok = s.state === 'ok', col = ok ? 'var(--n-ok)' : 'var(--n-warn)', n = p.name || (s.attributes.friendly_name || '').split(' ')[0];
      return `<div class="well" data-act="more-info" data-e="${esc(p.entity)}" style="display:flex;align-items:center;gap:8px;padding:7px 12px;cursor:pointer"><i style="width:8px;height:8px;border-radius:50%;background:${col};box-shadow:0 0 8px ${col}"></i><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px;color:var(--secondary-text-color)">${esc(n)}</span><b style="flex:none;font-size:12px">${ok ? 'OK' : 'Check'}</b></div>`; }).join('');
    return bcard(c, { name: c.title, icon: c.cfg.icon || 'sprout', iconAct: false, iconColor: bad ? 'var(--n-warn)' : 'var(--n-ok)', label: c.o.summary ? (bad ? `${bad} need attention` : 'All happy') : '', rows: c.k.gridFor(c).rows, ctl: `<div style="display:flex;flex-direction:column;gap:8px">${rows}</div>` });
  },
});

/* ============ appliance (time remaining) ============ */
const APP_ICONS = [[/wash/i, 'washing-machine'], [/dry/i, 'tumble-dryer'], [/dish/i, 'dishwasher'], [/oven|cook/i, 'stove'], [/coffee/i, 'coffee-maker']];
kind({
  id: 'appliance', name: 'Appliance', title: 'Appliances', domains: ['sensor'], multi: true, icon: 'washing-machine', grid: { columns: 6, rows: 4 }, tap: { action: 'none' }, hold: { action: 'none' },
  opts: [{ k: 'summary', l: 'Summary line', t: 'sw', d: true }, { k: 'idle_values', l: 'Values that mean idle (comma separated)', t: 'text', d: '00:00,0:00:00,0' }],
  gridFor: c => ({ columns: 6, rows: 2 + Math.ceil(Math.max(2, c.list().length) * 0.75) }),
  render(c) {
    const idle = String(c.o.idle_values).split(',').map(x => x.trim()), busy = v => v != null && !idle.includes(String(v)) && !BAD_STATES.includes(v), items = c.list();
    const rows = items.map(it => { const v = c.st(it.entity), on = busy(v), nm = it.name || c.fname(it.entity).replace(/ time remaining.*$/i, '').replace(/^(aeg|bosch|miele|samsung|lg)\s+/i, ''), ic = it.icon || (APP_ICONS.find(x => x[0].test(nm)) || [0, 'timer-outline'])[1];
      return `<div class="well" data-act="more-info" data-e="${esc(it.entity)}" style="display:flex;align-items:center;gap:8px;padding:7px 12px;cursor:pointer">${icn(ic, 15, `color:${on ? 'var(--accent-color)' : 'var(--secondary-text-color)'}`)}<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px;color:var(--secondary-text-color)">${esc(nice(nm))}</span><b style="flex:none;font-size:12px;font-variant-numeric:tabular-nums;color:${on ? 'var(--primary-text-color)' : 'var(--secondary-text-color)'}">${on ? esc(v) : 'Idle'}</b></div>`; }).join('');
    const any = items.some(it => busy(c.st(it.entity)));
    return bcard(c, { name: c.title, icon: c.cfg.icon || 'washing-machine', iconAct: false, iconColor: any ? 'var(--accent-color)' : undefined, label: c.o.summary ? (any ? 'Running' : 'All idle') : '', rows: c.k.gridFor(c).rows, ctl: `<div style="display:flex;flex-direction:column;gap:8px">${rows}</div>` });
  },
});

/* ============ smoke alarms (any group of binary sensors) ============ */
kind({
  id: 'safety', name: 'Smoke alarms', title: 'Smoke Alarms', domains: ['binary_sensor'], multi: true, icon: 'smoke-detector-variant', grid: { columns: 6, rows: 3 }, tap: { action: 'none' }, hold: { action: 'none' },
  opts: [{ k: 'summary', l: 'Summary line', t: 'sw', d: true }],
  render(c) {
    const ids = c.list().map(x => x.entity), hot = ids.filter(i => c.st(i) === 'on'), off = ids.filter(i => !c.S(i) || BAD_STATES.includes(c.st(i))), clean = i => c.fname(i).replace(/^Smoke Alarm\s*[-:]?\s*/i, '').replace(/ Smoke( \d+)?$/i, '');
    const lab = hot.length ? 'SMOKE · ' + hot.map(clean).join(', ') : off.length ? `${ids.length - off.length} clear · ${off.length} offline` : `All ${ids.length} clear`;
    const g = glow(hot.length ? '255,90,100' : null, .42, .25);
    const dots = ids.map(i => { const s = c.st(i), col = s === 'on' ? 'var(--n-bad)' : s === 'off' ? 'var(--n-ok)' : 'var(--nc-dim, rgba(240,242,255,.32))'; return `<i title="${esc(c.fname(i))}" data-act="more-info" data-e="${esc(i)}" style="width:8px;height:8px;border-radius:50%;background:${col};box-shadow:0 0 8px ${col};cursor:pointer"></i>`; }).join('');
    return bcard(c, { name: c.title, icon: c.cfg.icon || 'smoke-detector-variant', iconAct: false, iconColor: hot.length ? 'var(--n-bad)' : 'var(--n-ok)', iconFilter: `drop-shadow(0 0 ${hot.length ? 8 : 6}px ${hot.length ? 'var(--n-bad)' : 'var(--n-ok)'})`, label: c.o.summary ? esc(lab) : '', rows: 3, bg: g.bg, shadow: g.shadow, anim: hot.length ? 'ncpulse 1.2s ease-in-out infinite' : '',
      ctl: `<div class="well" style="display:flex;justify-content:space-between;padding:9px 12px">${dots}</div>` });
  },
});
