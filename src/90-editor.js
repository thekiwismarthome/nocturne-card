/* ============ visual editor ============ */
const LABELS = { kind: 'Card kind', entity: 'Entity', entities: 'Entities', name: 'Name', icon: 'Icon', tap_action: 'Tap action', hold_action: 'Hold action' };
class NocturneCardEditor extends HTMLElement {
  setConfig(config) { this._config = config; this._render(); }
  set hass(h) { this._hass = h; if (this._form) this._form.hass = h; }
  _fields(k) {
    const sel = o => {
      const n = o.k;
      if (o.t === 'sw') return { name: n, selector: { boolean: {} } };
      if (o.t === 'seg' || o.t === 'select') return { name: n, selector: { select: { mode: 'dropdown', options: o.o.map(x => ({ value: x[0], label: x[1] })) } } };
      if (o.t === 'range') return { name: n, selector: { number: { min: o.min, max: o.max, step: 1, mode: 'slider', unit_of_measurement: o.u || '' } } };
      if (o.t === 'entity') return { name: n, selector: { entity: { domain: o.domains, multiple: !!o.multi } } };
      return { name: n, selector: { text: {} } };
    };
    return { main: k.opts.filter(o => !o.g).map(sel), image: k.opts.filter(o => o.g === 'image').map(sel) };
  }
  _schema() {
    const k = KINDS[this._config.kind], kinds = Object.values(KINDS).map(x => ({ value: x.id, label: x.name }));
    const base = [{ name: 'kind', selector: { select: { mode: 'dropdown', options: kinds } } }];
    if (!k) return base;
    const f = this._fields(k), doms = k.domains;
    base.push(k.multi ? { name: 'entities', selector: { entity: { domain: doms, multiple: true } } } : { name: 'entity', selector: { entity: { domain: doms } } });
    base.push({ type: 'grid', name: '', schema: [{ name: 'name', selector: { text: {} } }, { name: 'icon', selector: { icon: {} } }] });
    if (f.main.length) base.push({ type: 'expandable', title: `${k.name} options`, expanded: true, flatten: true, schema: f.main });
    if (f.image.length) base.push({ type: 'expandable', title: 'Background image', flatten: true, schema: f.image });
    base.push({ type: 'expandable', title: 'Actions', flatten: true, schema: [{ name: 'tap_action', selector: { ui_action: {} } }, { name: 'hold_action', selector: { ui_action: {} } }] });
    return base;
  }
  _labels() { const m = Object.assign({}, LABELS); Object.values(KINDS).forEach(k => k.opts.forEach(o => { m[o.k] = o.l; })); return m; }
  _render() {
    if (!this._config) return;
    if (!this._form) {
      this._form = document.createElement('ha-form'); this.appendChild(this._form);
      this._form.addEventListener('value-changed', ev => {
        ev.stopPropagation(); const v = ev.detail.value, old = this._config; let next;
        if (v.kind !== old.kind) { next = { type: 'custom:nocturne-card', kind: v.kind }; if (v.name) next.name = v.name; }
        else { const k = KINDS[v.kind], d = k ? k.defaults : {}; next = {}; Object.keys(v).forEach(key => { if (v[key] === undefined || v[key] === '' || (key in d && v[key] === d[key])) return; next[key] = v[key]; }); next.type = 'custom:nocturne-card'; }
        this._config = next; fire(this, 'config-changed', { config: next }); this._render();
      });
    }
    const k = KINDS[this._config.kind];
    this._form.hass = this._hass; this._form.schema = this._schema(); this._form.data = Object.assign({}, k ? k.defaults : {}, this._config);
    this._form.computeLabel = s => this._labels()[s.name] || nice(s.name);
  }
}
