/* ============ weather ============ */
const WX_ICON = { sunny: 'weather-sunny', 'clear-night': 'weather-night', cloudy: 'weather-cloudy', partlycloudy: 'weather-partly-cloudy', rainy: 'weather-rainy', pouring: 'weather-pouring', snowy: 'weather-snowy', 'snowy-rainy': 'weather-snowy-rainy', fog: 'weather-fog', hail: 'weather-hail', lightning: 'weather-lightning', 'lightning-rainy': 'weather-lightning-rainy', windy: 'weather-windy', 'windy-variant': 'weather-windy-variant', exceptional: 'alert-circle-outline' };
const WX_COL = { sunny: '#ffc15a', 'clear-night': '#a9b6ff', cloudy: '#c3cbe8', partlycloudy: '#ffd27a', rainy: '#6ec8ff', pouring: '#5aa8ff', snowy: '#e3f1ff', 'snowy-rainy': '#cfe6ff', fog: '#b9c2d9', hail: '#cfe6ff', lightning: '#ffe066', 'lightning-rainy': '#ffe066', windy: '#b9d6ff', 'windy-variant': '#b9d6ff', exceptional: '#ff7a85' };
const WX_TXT = { sunny: 'Sunny', 'clear-night': 'Clear', cloudy: 'Cloudy', partlycloudy: 'Partly cloudy', rainy: 'Rainy', pouring: 'Pouring', snowy: 'Snowy', 'snowy-rainy': 'Sleet', fog: 'Fog', hail: 'Hail', lightning: 'Thunderstorms', 'lightning-rainy': 'Thunderstorms', windy: 'Windy', 'windy-variant': 'Windy', exceptional: 'Exceptional' };
const wxIcon = (cond, px = 24) => icn(WX_ICON[cond] || 'weather-cloudy', px, `color:${WX_COL[cond] || '#c3cbe8'}`);
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const bearing = b => typeof b === 'number' ? COMPASS[Math.round(b / 22.5) % 16] : (b || '');
const fmtHour = (d, c) => d.toLocaleTimeString(c._hass.locale && c._hass.locale.language, { hour: 'numeric' }).replace(/\s/g, '').toLowerCase();
const pill = (ic, main, sub) => `<span style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:99px;background:var(--n-well);box-shadow:var(--n-inset);font-size:12.5px;color:var(--secondary-text-color)">${icn(ic, 15)}<b style="color:var(--primary-text-color);font-weight:700">${main}</b>${sub ? esc(sub) : ''}</span>`;
const WX_PANELS = { hero: { rows: 5, label: 'Now and today' }, hourly: { rows: 4, label: 'Next 24 hours' }, daily: { rows: 5, label: '7-day forecast' }, details: { rows: 3, label: 'Details (wind, humidity, pressure ...)' } };
kind({
  id: 'weather', name: 'Weather', domains: ['weather'], icon: 'weather-partly-cloudy', grid: { columns: 12, rows: 5 }, tap: { action: 'more-info' }, hold: { action: 'more-info' },
  opts: [{ k: 'panel', l: 'Panel', t: 'select', o: Object.entries(WX_PANELS).map(([k, v]) => [k, v.label]), d: 'hero' }, { k: 'location', l: 'Location name (default: entity name)', t: 'text' }, { k: 'hours', l: 'Hours shown in the hourly panel', t: 'range', min: 6, max: 24, d: 12 }, { k: 'days', l: 'Days shown in the daily panel', t: 'range', min: 3, max: 10, d: 7 }],
  gridFor: c => ({ columns: 12, rows: (WX_PANELS[c.o.panel] || WX_PANELS.hero).rows }),
  connect(c) {
    if (c._subs.length || !c._hass || !c._hass.connection) return;
    ['hourly', 'daily'].forEach(type => { try { const p = c._hass.connection.subscribeMessage(ev => { c._fc[type] = ev.forecast || []; c.refresh(); }, { type: 'weather/subscribe_forecast', forecast_type: type, entity_id: c.e }); p.catch(() => {}); c._subs.push(p); } catch (_) {} });
    clearInterval(c._tick); c._tick = setInterval(() => c.isConnected && c.refresh(), 60000);
  },
  render(c) {
    const s = c.S(c.e); if (!s) return bcard(c, { name: c.title, label: 'Entity not found', rows: 3, wide: false });
    const a = s.attributes, cond = s.state, p = c.o.panel, unit = a.temperature_unit || '°C', T = v => v == null ? '–' : Math.round(v) + '°';
    const hourly = (c._fc.hourly && c._fc.hourly.length ? c._fc.hourly : a.forecast_hourly || (a.forecast || []).filter(x => x.is_daytime === undefined)) || [], daily = (c._fc.daily && c._fc.daily.length ? c._fc.daily : a.forecast_daily || a.forecast || []) || [];
    const wrap = (inner, rows, cls = '') => `<div class="bc w wx ${cls}" style="--rows:${rows};padding:16px">${imgLayer(c)}<div class="grid" style="display:block;position:relative;z-index:2;height:100%">${inner}</div></div>`;
    const now = new Date(), loc = c.o.location || c.cfg.name || a.friendly_name || c.title;
    if (p === 'hourly') {
      const hrs = hourly.filter(h => new Date(h.datetime).getTime() > now.getTime() - 3600e3).slice(0, +c.o.hours), temps = hrs.map(h => h.temperature), mn = Math.min(...temps), mx = Math.max(...temps), W = 100 / Math.max(hrs.length, 1);
      const pts = hrs.map((h, i) => `${(i + .5) * W},${mx === mn ? 50 : 100 - ((h.temperature - mn) / (mx - mn)) * 100}`);
      return wrap(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font-size:15px">${esc(WX_PANELS.hourly.label)}</b><span style="font-size:12px;color:var(--secondary-text-color)">${daily[0] ? `High ${T(daily[0].temperature)} · Low ${T(daily[0].templow)}` : ''}</span></div>
        <div style="position:relative;overflow-x:auto;scrollbar-width:none"><div style="min-width:${hrs.length * 54}px;position:relative"><div style="display:grid;grid-template-columns:repeat(${hrs.length},1fr);text-align:center;font-size:12px;color:var(--secondary-text-color);gap:2px">${hrs.map((h, i) => `<div style="display:grid;gap:6px;justify-items:center"><span style="${i ? '' : 'color:var(--primary-text-color);font-weight:700'}">${i ? fmtHour(new Date(h.datetime), c) : 'Now'}</span>${wxIcon(h.condition, 24)}</div>`).join('')}</div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:70px;margin:6px 0;overflow:visible"><polyline points="${pts.join(' ')}" fill="none" stroke="var(--accent-color)" stroke-opacity=".8" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>
        <div style="display:grid;grid-template-columns:repeat(${hrs.length},1fr);text-align:center;gap:2px;font-family:var(--n-font-display);font-size:15px">${hrs.map((h, i) => `<div style="display:grid;gap:4px"><span style="${i ? 'color:var(--secondary-text-color)' : 'font-weight:700'}">${T(h.temperature)}</span><span style="font-size:10.5px;color:var(--n-water, #6ec8ff);min-height:13px">${h.precipitation_probability ? h.precipitation_probability + '%' : (h.precipitation ? h.precipitation + 'mm' : '')}</span></div>`).join('')}</div></div></div>`, 4);
    }
    if (p === 'daily') {
      const ds = daily.slice(0, +c.o.days), lo = Math.min(...ds.map(d => d.templow ?? d.temperature)), hi = Math.max(...ds.map(d => d.temperature));
      return wrap(`<b style="font-size:15px;display:block;margin-bottom:10px">${esc(WX_PANELS.daily.label)}</b><div style="display:grid;gap:9px">${ds.map((d, i) => { const dt = new Date(d.datetime), l = d.templow ?? d.temperature, L = (l - lo) / (hi - lo || 1) * 100, R = (d.temperature - lo) / (hi - lo || 1) * 100;
        return `<div style="display:grid;grid-template-columns:64px 30px 1fr 74px;align-items:center;gap:8px;font-size:13px"><span style="font-weight:${i ? 500 : 700}">${i ? dt.toLocaleDateString(c._hass.locale && c._hass.locale.language, { weekday: 'short' }) : 'Today'}</span>${wxIcon(d.condition, 22)}<span style="position:relative;height:8px;border-radius:99px;background:var(--n-well);box-shadow:var(--n-inset)"><i style="position:absolute;top:0;bottom:0;left:${L}%;right:${100 - R}%;border-radius:99px;background:linear-gradient(90deg,#6ec8ff,#ffc15a)"></i></span><span style="text-align:right;font-variant-numeric:tabular-nums"><span style="color:var(--secondary-text-color)">${T(l)}</span> ${T(d.temperature)}</span></div>`; }).join('')}</div>`, 5);
    }
    if (p === 'details') {
      const w = a.wind_speed, items = [['weather-windy', 'Wind', w != null ? `${Math.round(w)} ${a.wind_speed_unit || 'km/h'}` : null, bearing(a.wind_bearing)], ['water-percent', 'Humidity', a.humidity != null ? a.humidity + '%' : null], ['gauge', 'Pressure', a.pressure != null ? `${Math.round(a.pressure)} ${a.pressure_unit || 'hPa'}` : null], ['sun-wireless-outline', 'UV index', a.uv_index != null ? Math.round(a.uv_index) : null], ['thermometer-water', 'Dew point', a.dew_point != null ? T(a.dew_point) : null], ['eye-outline', 'Visibility', a.visibility != null ? `${a.visibility} ${a.visibility_unit || 'km'}` : null], ['cloud-outline', 'Cloud', a.cloud_coverage != null ? a.cloud_coverage + '%' : null], ['weather-dust', 'Gust', a.wind_gust_speed != null ? `${Math.round(a.wind_gust_speed)} ${a.wind_speed_unit || 'km/h'}` : null]].filter(x => x[2] != null);
      return wrap(`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px">${items.map(x => `<div class="well" style="padding:12px 14px;display:grid;gap:4px"><span style="display:flex;gap:6px;align-items:center;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--secondary-text-color)">${icn(x[0], 14)}${x[1]}</span><b style="font:500 20px var(--n-font-display)">${esc(x[2])}${x[3] ? ` <small style="font-size:12px;color:var(--secondary-text-color)">${esc(x[3])}</small>` : ''}</b></div>`).join('')}</div>`, 3);
    }
    /* hero: now and today */
    const d0 = daily[0] || {}, feels = a.apparent_temperature, rain24 = hourly.slice(0, 24).reduce((t, h) => t + (h.precipitation || 0), 0);
    return wrap(`<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><span style="font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--secondary-text-color)">${esc(loc)} · ${now.toLocaleDateString(c._hass.locale && c._hass.locale.language, { weekday: 'short', day: 'numeric', month: 'short' })}</span><span style="font-family:var(--n-font-display);font-size:18px;color:var(--secondary-text-color)">${now.toLocaleTimeString(c._hass.locale && c._hass.locale.language, { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, '').toLowerCase()}</span></div>
      <div style="display:flex;align-items:center;gap:22px;margin:14px 0 12px"><div style="flex:none;filter:drop-shadow(0 6px 14px rgba(0,0,0,.35))">${wxIcon(cond, 104)}</div><div style="min-width:0"><div style="font:300 76px/1 var(--n-font-display);letter-spacing:-.04em">${a.temperature != null ? Math.round(a.temperature) : '–'}<span style="font-size:26px;vertical-align:top;margin-left:2px;color:var(--secondary-text-color)">°</span></div><div style="font:600 19px var(--ha-font-family-body);margin-top:6px">${esc(WX_TXT[cond] || nice(cond))}</div><div style="font-size:12.5px;color:var(--secondary-text-color);margin-top:4px">${[feels != null ? `Feels like ${T(feels)}` : '', d0.temperature != null ? `H ${T(d0.temperature)}` : '', d0.templow != null ? `L ${T(d0.templow)}` : ''].filter(Boolean).join(' · ')}</div></div></div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${a.humidity != null ? pill('water-percent', a.humidity + '%') : ''}${a.wind_speed != null ? pill('weather-windy', `${Math.round(a.wind_speed)} ${a.wind_speed_unit || 'km/h'}`, bearing(a.wind_bearing)) : ''}${hourly.length ? pill('weather-rainy', `${Math.round(rain24 * 10) / 10} ${a.precipitation_unit || 'mm'}`, 'next 24h') : ''}</div>`, 5);
  },
});

/* ============ person ============ */
const hash = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const personColors = id => { const h = hash(id) % 360; return [`hsl(${h} 78% 62%)`, `hsl(${(h + 48) % 360} 70% 48%)`]; };
const initials = n => String(n || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
function distance(c, a) {
  const z = c.S('zone.home'); if (!z || a.latitude == null || a.longitude == null) return null; const R = 6371, rad = x => x * Math.PI / 180, la = rad(z.attributes.latitude), lb = rad(a.latitude), dl = rad(a.longitude - z.attributes.longitude), dp = lb - la;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dl / 2) ** 2, km = 2 * R * Math.asin(Math.sqrt(h)), mi = (c._hass.config.unit_system || {}).length === 'mi';
  const v = mi ? km * 0.621371 : km; return v < 1 && !mi ? Math.round(v * 1000) + ' m' : (v < 10 ? Math.round(v * 10) / 10 : Math.round(v)) + (mi ? ' mi' : ' km');
}
function personBattery(c, id) {
  if (c.o.battery_entity) return num(c.st(c.o.battery_entity));
  const a = (c.S(id) || {}).attributes || {}, trackers = [a.source, ...(a.device_trackers || [])].filter(Boolean);
  for (const t of trackers) { const sn = first(t), cands = [`sensor.${sn}_battery_level`, `sensor.${sn}_battery`]; for (const x of cands) { const v = num(c.st(x)); if (v != null) return v; } const b = c.at(t, 'battery_level') ?? c.at(t, 'battery'); if (num(b) != null) return num(b); }
  return num(a.battery_level);
}
function sinceText(c, s) { if (!s) return ''; const d = new Date(s.last_changed), loc = c._hass.locale && c._hass.locale.language, t = d.toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, '').toLowerCase(); return d.toDateString() === new Date().toDateString() ? t : `${d.toLocaleDateString(loc, { weekday: 'short' })} ${t}`; }
const accentOf = (c, id) => c.o.color || ({ auto: personColors(id)[0], accent: 'var(--accent-color)', water: 'var(--n-water)', warm: 'var(--n-warn)', good: 'var(--n-ok)' }[c.o.accent] || 'var(--accent-color)');
/* the avatar: picture, initials or icon, with a ring and a presence dot */
function avatar(c, id, A, ringMode, col, st) {
  const s = c.S(id), pic = s && s.attributes.entity_picture, [p1, p2] = personColors(id), name = c.fname(id), R = (A - 5) / 2, C = 2 * Math.PI * R, bat = ringMode === 'battery' ? personBattery(c, id) : null, low = bat != null && bat <= 20;
  const on = ringMode === 'battery' ? bat != null && st !== 'unknown' : st === 'home', pct = ringMode === 'battery' ? (bat ?? 0) / 100 : 1;
  const ring = ringMode === 'none' ? '' : `<svg class="ring" viewBox="0 0 ${A} ${A}"><circle cx="${A / 2}" cy="${A / 2}" r="${R}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="4"/>${on ? `<circle cx="${A / 2}" cy="${A / 2}" r="${R}" fill="none" stroke="${low ? 'var(--n-bad)' : col}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" style="filter:drop-shadow(0 0 5px ${col})"/>` : ''}</svg>`;
  const face = c.o.avatar === 'icon' ? icn(c.cfg.icon || 'account', Math.round(A * .5)) : (c.o.avatar === 'initials' || !pic) ? esc(initials(name)) : `<img src="${esc(c.url(pic))}" alt="" style="width:100%;height:100%;object-fit:cover">`;
  return `<div class="pav" style="--a:${A}px;--p1:${p1};--p2:${p2}">${ring}<div class="face">${face}</div><span class="dot"></span></div>`;
}
const personMode = (c, id) => { const s = c.st(id); return !s || BAD_STATES.includes(s) ? 'unknown' : s === 'home' ? 'home' : 'away'; };
kind({
  id: 'person', name: 'Person', domains: ['person'], icon: 'account', grid: { columns: 6, rows: 3 }, tap: { action: 'more-info' }, hold: { action: 'more-info' },
  opts: [{ k: 'layout', l: 'Layout', t: 'seg', o: [['portrait', 'Portrait'], ['wide', 'Wide'], ['photo', 'Photo']], d: 'portrait' }, { k: 'avatar', l: 'Avatar', t: 'seg', o: [['photo', 'Picture'], ['initials', 'Initials'], ['icon', 'Icon']], d: 'photo' }, { k: 'ring', l: 'Ring shows', t: 'seg', o: [['presence', 'Home / away'], ['battery', 'Phone battery'], ['none', 'Nothing']], d: 'presence' },
    { k: 'accent', l: 'Colour', t: 'select', o: [['auto', 'Their own colour'], ['accent', 'Theme accent'], ['water', 'Water'], ['warm', 'Warm'], ['good', 'Green']], d: 'auto' }, { k: 'color', l: 'Custom colour (any CSS colour, optional)', t: 'text' },
    { k: 'show_since', l: 'Show “since” time', t: 'sw', d: true }, { k: 'show_battery', l: 'Phone battery', t: 'sw', d: true }, { k: 'show_place', l: 'Where they are (when away)', t: 'sw', d: true }, { k: 'show_distance', l: 'Distance from home (when away)', t: 'sw', d: true },
    { k: 'battery_entity', l: 'Battery sensor (default: found from their phone)', t: 'entity', domains: ['sensor'] }, { k: 'geocoded_entity', l: 'Address sensor (e.g. geocoded location)', t: 'entity', domains: ['sensor'] }],
  gridFor: c => ({ columns: c.o.layout === 'wide' ? 12 : 6, rows: 3 }),
  extraIds: c => { const a = (c.S(c.e) || {}).attributes || {}, t = [a.source, ...(a.device_trackers || [])].filter(Boolean); return [c.o.battery_entity, c.o.geocoded_entity, 'zone.home', ...t.flatMap(x => [`sensor.${first(x)}_battery_level`, x])]; },
  render(c) {
    const o = c.o, id = c.e, s = c.S(id), a = (s && s.attributes) || {}, m = personMode(c, id), home = m === 'home', away = m === 'away', unk = m === 'unknown', name = c.title, col = accentOf(c, id), [p1, p2] = personColors(id);
    const bat = o.show_battery && !unk ? personBattery(c, id) : null, low = bat != null && bat <= 20, dist = away && o.show_distance ? distance(c, a) : null;
    const place = away && o.show_place ? (s.state !== 'not_home' ? nice(s.state) : (o.geocoded_entity && c.st(o.geocoded_entity) && !BAD_STATES.includes(c.st(o.geocoded_entity)) ? String(c.st(o.geocoded_entity)).split(',')[0] : '')) : '';
    const stx = unk ? 'Unknown' : home ? 'Home' : 'Away', since = o.show_since && !unk ? sinceText(c, s) : '';
    const batChip = bat != null ? `<span class="pchip ${low ? 'low' : ''}">${icn('battery', 15)}${Math.round(bat)}%</span>` : '';
    const vars = `--acc:${col};--p1:${p1};--p2:${p2}`, cls = `pc ${away ? 'away' : ''} ${unk ? 'unk' : ''}`;
    if (o.layout === 'wide') { const A = 96; return `<div class="nc wide ${cls} side" style="--rows:3;${vars}">${imgLayer(c)}<div class="in">${avatar(c, id, A, o.ring, col, m)}<div class="info"><div><span class="pn">${esc(name)}</span><span class="ps"><b>${stx}</b>${since ? ' · ' + since : ''}</span>${place ? `<span class="ps">${icn('map-marker', 13)} ${esc(place)}</span>` : ''}</div>${batChip || dist ? `<div class="chips">${batChip}${dist ? `<span class="pchip">${icn('map-marker-distance', 15)}${dist}</span>` : ''}</div>` : ''}</div></div></div>`; }
    if (o.layout === 'photo') { const pic = a.entity_picture; return `<div class="nc ${cls} photo" style="--rows:3;${vars};padding:0;overflow:hidden"><div class="face-bg" ${pic && o.avatar === 'photo' ? `style="background:url('${esc(c.url(pic))}') center/cover"` : ''}>${pic && o.avatar === 'photo' ? '' : (o.avatar === 'initials' ? `<span style="font:600 64px var(--n-font-display);margin-top:-18px">${esc(initials(name))}</span>` : icn(o.avatar === 'icon' ? c.icon : 'account', 120))}</div>${imgLayer(c)}<div class="in" style="padding:14px;box-sizing:border-box;justify-content:space-between"><div class="prow"><span class="pstat"><i></i>${stx}</span>${bat != null ? `<span class="pstat" style="${low ? 'color:var(--n-bad)' : ''}">${icn('battery', 14)}${Math.round(bat)}%</span>` : ''}</div><div><span class="pn">${esc(name)}</span><span class="ps">${[since ? (home ? 'Since ' + since : since) : '', place, dist].filter(Boolean).join(' · ')}</span></div></div></div>`; }
    return `<div class="nc ${cls}" style="--rows:3;${vars}">${imgLayer(c)}<div class="in"><div class="prow">${avatar(c, id, 76, o.ring, col, m)}${batChip}</div><div><span class="pn">${esc(name)}</span><span class="ps"><b>${stx}</b>${dist ? ' · ' + dist : ''}${since ? ' · ' + since : ''}</span>${place ? `<span class="ps">${esc(place)}</span>` : ''}</div></div></div>`;
  },
});

/* ============ family (everyone in one row) ============ */
kind({
  id: 'family', name: 'Family', title: 'Family', domains: ['person', 'device_tracker'], multi: true, icon: 'account-group', grid: { columns: 12, rows: 3 }, tap: { action: 'none' }, hold: { action: 'none' },
  opts: [{ k: 'avatar', l: 'Avatar', t: 'seg', o: [['photo', 'Picture'], ['initials', 'Initials']], d: 'photo' }, { k: 'show_since', l: 'Show how long they have been home or away', t: 'sw', d: true }, { k: 'show_count', l: 'Show “2 of 4 home”', t: 'sw', d: true }],
  render(c) {
    const o = c.o, items = c.list(), n = items.filter(i => personMode(c, i.entity) === 'home').length;
    const age = s => { if (!s) return ''; const m = Math.max(0, Math.round((Date.now() - new Date(s.last_changed)) / 60000)); return m < 60 ? m + 'm' : m < 1440 ? Math.floor(m / 60) + 'h' : Math.floor(m / 1440) + 'd'; };
    const avs = items.map(it => { const m = personMode(c, it.entity), nm = it.name || c.fname(it.entity); return `<div class="av ${m === 'home' ? 'home' : 'away'}" data-act="more-info" data-e="${esc(it.entity)}" style="cursor:pointer">${avatarFace(c, it.entity, 46, m)}${o.show_since ? `<span>${age(c.S(it.entity))}</span>` : ''}</div>`; }).join('');
    return `<div class="nc wide" style="--rows:3">${imgLayer(c)}<div class="in" style="display:grid;align-content:space-between"><div class="avs"><span class="ic" style="margin-right:6px">${icn(c.icon)}</span>${avs}</div><div class="nm"><b>${esc(c.title)}</b>${o.show_count ? `<span>${n} of ${items.length} home</span>` : ''}</div></div></div>`;
  },
});
function avatarFace(c, id, A, m) { const s = c.S(id), pic = s && s.attributes.entity_picture, [p1, p2] = personColors(id); return `<i style="width:${A}px;height:${A}px;${pic && c.o.avatar === 'photo' ? `background:url('${esc(c.url(pic))}') center/cover` : `background:linear-gradient(160deg,${p1},${p2})`}">${pic && c.o.avatar === 'photo' ? '' : esc(initials(c.fname(id)))}</i>`; }
