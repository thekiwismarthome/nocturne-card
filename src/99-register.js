/* ============ register ============ */
if (!customElements.get('nocturne-card')) customElements.define('nocturne-card', NocturneCard);
if (!customElements.get('nocturne-card-editor')) customElements.define('nocturne-card-editor', NocturneCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some(x => x.type === 'nocturne-card')) window.customCards.push({ type: 'nocturne-card', name: 'Nocturne Card', description: 'One glass card for lights, climate, media, weather, people and more. Pick a kind, pick an entity.', preview: true, documentationURL: 'https://thekiwismarthome.github.io/nocturne-card/' });
console.info(`%c NOCTURNE-CARD %c ${VERSION} `, 'background:#7c6cff;color:#fff;border-radius:4px 0 0 4px;padding:2px 6px', 'background:#151a2c;color:#9ff4ff;border-radius:0 4px 4px 0;padding:2px 6px');
