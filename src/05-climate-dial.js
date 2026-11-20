/* ====== climate dial: ported from the Nocturne dashboard's nc_climate_dial template ====== */
const climateDial = (entity, variables) => { const a=entity.attributes, min=a.min_temp||16, max=a.max_temp||31, t=a.temperature ?? min, on=entity.state!=='off';
    const MD={heat:['mdi:fire','Heat','var(--n-warn)','#ff6a3a','#ffc27a'],cool:['mdi:snowflake','Cool','var(--accent-color)','#2f9bff','#b8ecff'],dry:['mdi:water-percent','Dry','var(--n-ok)','#22c997','#c5ffe8'],auto:['mdi:thermostat-auto','Auto','var(--accent-color)','var(--primary-color)','var(--accent-color)'],heat_cool:['mdi:thermostat-auto','Auto','var(--accent-color)','var(--primary-color)','var(--accent-color)'],fan_only:['mdi:fan','Fan','var(--accent-color)','var(--primary-color)','var(--accent-color)']}, [mi,ml,mc,m1,m2]=MD[entity.state]||['mdi:power','Off','var(--n-dim)','var(--primary-color)','var(--accent-color)'];
    const kind=entity.state==='heat'?'rise':entity.state==='cool'?'fall':entity.state==='dry'?'rise':'spin';
    const P=on&&kind!=='spin'?[0,1,2,3,4,5,6].map(i=>{const l=10+((i*37)%78),sz=2+(i%3),du=(3.4+(i%4)*.7).toFixed(1),de=(-i*.8).toFixed(1);return `<i style="position:absolute;left:${l}%;${kind==='fall'?'top':'bottom'}:-6px;width:${sz}px;height:${sz}px;border-radius:50%;background:${kind==='rise'?m2:'#fff'};box-shadow:0 0 6px ${kind==='rise'?m1:'#fff'};opacity:0;animation:${kind==='fall'?'ncfall':'ncrise'} ${du}s linear ${de}s infinite"></i>`}).join(''):'';
    const FX=!on?'':kind==='spin'?`<div style="position:absolute;inset:-30%;background:conic-gradient(from 0deg,transparent 0,${m2} 12%,transparent 32%);opacity:.16;animation:ncspin 10s linear infinite"></div>`:`<div style="position:absolute;left:8%;right:8%;${kind==='fall'?'top':'bottom'}:-18%;height:60%;border-radius:50%;background:radial-gradient(closest-side,${m1},transparent);opacity:.3;filter:blur(10px);animation:ncbreathe 3.4s ease-in-out infinite"></div>${P}`;
    const f=Math.max(0,Math.min(1,(t-min)/(max-min))), A0=135, S=270, ang=A0+S*f;
    const pt=(r,d)=>{const x=d*Math.PI/180;return [(100+r*Math.cos(x)).toFixed(2),(100+r*Math.sin(x)).toFixed(2)]};
    const arc=(r,a0,a1)=>{const p0=pt(r,a0),p1=pt(r,Math.max(a1,a0+.01));return `M${p0} A${r} ${r} 0 ${a1-a0>180?1:0} 1 ${p1}`};
    let ticks='';
    for(let i=0;i<=max-min;i++){const d=A0+S*i/(max-min),maj=(min+i)%5===0,p0=pt(maj?57:61,d),p1=pt(66,d);
      ticks+=`<line x1="${p0[0]}" y1="${p0[1]}" x2="${p1[0]}" y2="${p1[1]}" style="stroke:${d<=ang&&on?m2:'var(--n-dim)'};stroke-opacity:.75;stroke-width:${maj?1.6:1};stroke-linecap:round"/>`}
    const k=pt(88,ang), main=on?'url(#ncg)':'var(--n-dim)';
    return `<div style="position:relative;width:100%;max-width:${variables.dial||210}px;aspect-ratio:1;margin:0 auto;border-radius:50%;background:var(--n-raised);box-shadow:var(--n-shadow-lg)">
      <svg viewBox="0 0 200 200" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible">
      <defs>
        <linearGradient id="ncg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" style="stop-color:${m1}"/><stop offset="1" style="stop-color:${m2}"/></linearGradient>
        <radialGradient id="ncf" cx=".42" cy=".36" r=".75"><stop offset="0" style="stop-color:var(--n-c1)"/><stop offset="1" style="stop-color:var(--n-well)"/></radialGradient>
        <filter id="ncb" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
      </defs>
      <circle cx="100" cy="100" r="88" style="fill:none;stroke:var(--n-well);stroke-width:14"/>
      <path d="${arc(88,A0,A0+S)}" style="fill:none;stroke:var(--n-dim);stroke-opacity:.35;stroke-width:3;stroke-linecap:round"/>
      ${on?`<path d="${arc(88,A0,ang)}" pathLength="1" filter="url(#ncb)" style="fill:none;stroke:${m1};stroke-width:9;stroke-linecap:round;opacity:.55;stroke-dasharray:1;animation:ncdraw .9s ease-out"/>`:''}
      <path d="${arc(88,A0,ang)}" pathLength="1" style="fill:none;stroke:${main};stroke-width:4;stroke-linecap:round;stroke-dasharray:1;animation:ncdraw .9s ease-out"/>
      <circle cx="100" cy="100" r="72" style="fill:url(#ncf);stroke:var(--primary-color);stroke-opacity:.3;stroke-width:1"/>
      ${ticks}
      ${on?`<circle cx="${k[0]}" cy="${k[1]}" r="11" filter="url(#ncb)" style="fill:${m1};opacity:.55"/>`:''}
      <circle cx="${k[0]}" cy="${k[1]}" r="7.5" style="fill:var(--n-c2);stroke:${on?m2:'var(--n-dim)'};stroke-width:3"/>
      </svg>
      <div style="position:absolute;inset:14%;border-radius:50%;overflow:hidden;pointer-events:none">${FX}</div>
      <div style="position:absolute;inset:0;pointer-events:none">
        <span style="position:absolute;left:0;right:0;top:calc(50% - 47px);text-align:center;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--secondary-text-color);font-weight:600">Target</span>
        <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);animation:ncpop .4s ease-out;font-family:var(--n-font-display);font-weight:500;font-size:${Math.round((variables.dial||210)*0.22)}px;line-height:1;letter-spacing:-.03em;font-variant-numeric:tabular-nums">${t}<span style="position:absolute;left:100%;top:3px;margin-left:3px;font-size:16px;letter-spacing:0">°C</span></span>
        <div style="position:absolute;left:0;right:0;top:69%;display:flex;flex-direction:column;align-items:center;gap:2px;color:${mc};filter:${on?'drop-shadow(0 0 6px '+mc+')':'none'}"><ha-icon icon="${mi}" style="margin:0;--mdc-icon-size:18px"></ha-icon><span style="font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;line-height:1">${ml}</span></div>
      </div></div>` };
const climateLeft = (entity, variables) => { const a=entity.attributes, on=entity.state!=='off';
    const ic={heat:'mdi:fire',cool:'mdi:snowflake',dry:'mdi:water-percent',auto:'mdi:thermostat-auto',fan_only:'mdi:fan'}[entity.state]||'mdi:air-conditioner';
    const WA=`onfocusin="clearTimeout(this._t);const r=this.getRootNode();this._t=setTimeout(()=>{const a=r.activeElement;if(a&&this.contains(a))a.blur()},10000)" onfocusout="clearTimeout(this._t)"`;
    const KA=`onpointerdown="const w=this.parentElement;w.dataset.was=w.matches(':focus-within')?'1':'0'" onclick="const w=this.parentElement;if(w.dataset.was==='1'){const a=w.getRootNode().activeElement;if(a)a.blur()}"`;
    const modes=a.hvac_modes||['auto','cool','dry','heat','off'];
    const MI={auto:['mdi:thermostat-auto','Auto','var(--accent-color)'],cool:['mdi:snowflake','Cool','var(--accent-color)'],dry:['mdi:water-percent','Dry','var(--n-ok)'],heat:['mdi:fire','Heat','var(--n-warn)'],fan_only:['mdi:fan','Fan','var(--accent-color)'],heat_cool:['mdi:thermostat-auto','Auto','var(--accent-color)'],off:['mdi:power','Off','var(--secondary-text-color)']};
    const eid=entity.entity_id;
    const pick=v=>`const h=document.querySelector('home-assistant').hass;${v==='off'?`h.callService('climate','turn_off',{entity_id:'${eid}'})`:`h.callService('climate','set_hvac_mode',{entity_id:'${eid}',hvac_mode:'${v}'})`};this.blur()`;
    const items=modes.map(m=>{const d=MI[m]||['mdi:thermostat',m,'var(--secondary-text-color)'];return `<button class="ncm-i${m===entity.state?' sel':''}" title="${d[1]}" aria-label="${d[1]}" style="color:${m===entity.state?'var(--n-on-accent)':d[2]}" onclick="${pick(m)}"><ha-icon icon="${d[0]}" style="margin:0;--mdc-icon-size:20px"></ha-icon></button>`}).join('');
    const knob=`<div class="ncm" tabindex="0" role="button" aria-haspopup="true" aria-label="Mode" ${WA}><div style="width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:var(--n-raised);box-shadow:var(--n-shadow-md);color:${on?'var(--accent-color)':'var(--secondary-text-color)'};filter:${on?'drop-shadow(0 0 6px var(--n-glow))':'none'};cursor:pointer" ${KA}><ha-icon icon="${ic}" style="margin:0;--mdc-icon-size:22px"></ha-icon></div><div class="ncm-menu">${items}</div></div>`;
    const m=(k,v)=>`<div style="display:flex;flex-direction:column;line-height:1.25;margin-top:10px;width:60px"><span style="font-size:10.5px;color:var(--secondary-text-color)">${k}</span><b style="font-family:var(--n-font-display);font-weight:500;font-size:15px;white-space:normal">${v}</b></div>`;
    const FM={auto:['mdi:fan-auto','Auto'],quiet:['mdi:fan','Quiet'],low:['mdi:fan-speed-1','Low'],med:['mdi:fan-speed-2','Med'],high:['mdi:fan-speed-3','High'],'super high':['mdi:fan-plus','Super high']};
    const fmodes=a.fan_modes||Object.keys(FM);
    const fcur=a.fan_mode;
    const fpick=v=>`const h=document.querySelector('home-assistant').hass;h.callService('climate','set_fan_mode',{entity_id:'${eid}',fan_mode:'${v}'});this.blur()`;
    const fitems=fmodes.map(f=>{const d=FM[f]||['mdi:fan',f];return `<button class="ncm-i${f===fcur?' sel':''}" title="${d[1]}" aria-label="${d[1]}" style="color:${f===fcur?'var(--n-on-accent)':'var(--secondary-text-color)'}" onclick="${fpick(f)}"><ha-icon icon="${d[0]}" style="margin:0;--mdc-icon-size:20px"></ha-icon></button>`}).join('');
    const fd=FM[fcur]||['mdi:fan',fcur||'–'];
    const fanKnob=`<div class="ncm" tabindex="0" role="button" aria-haspopup="true" aria-label="Fan speed" style="margin-top:10px" ${WA}><div style="width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:var(--n-raised);box-shadow:var(--n-shadow-md);color:${on?'var(--accent-color)':'var(--secondary-text-color)'};cursor:pointer" ${KA}><ha-icon icon="${fd[0]}" style="margin:0;--mdc-icon-size:22px"></ha-icon></div><div class="ncm-menu">${fitems}</div></div><div style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:var(--secondary-text-color);margin:4px 0 0 -6px;width:60px;text-align:center;white-space:normal;line-height:1.15">${fd[1]}</div>`;
    return knob + fanKnob + m('Indoor', a.current_temperature!=null ? a.current_temperature+'°' : '–') + m('Humidity', a.current_humidity!=null ? Math.round(a.current_humidity)+'%' : '–') };
