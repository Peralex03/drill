/* Drill : instruction de base en cartes, QCM et chrono. Interface. Tout reste sur l'appareil. */
'use strict';
(() => {
const E = DrillEngine;
const store = makeStore('drill.v1', { prog: {}, mine: [], hideDraft: false, day: '', dayN: 0, dayOk: 0 });
const D = store.data;
const fixDeck = d => { if (!d || typeof d.t !== 'string' || !Array.isArray(d.cards)) return null; return { id: typeof d.id === 'string' && d.id.startsWith('m_') ? d.id : 'm_' + uid(), t: d.t.slice(0, 40) || 'Mes cartes', icon: 'edit', v: 1, mine: true, src: 'Cartes ajoutées sur cet appareil', cards: d.cards.filter(c => c && typeof c.q === 'string' && typeof c.a === 'string' && c.q.trim() && c.a.trim()).slice(0, 300).map(c => ({ q: c.q.slice(0, 200), a: c.a.slice(0, 200) })) }; };
D.mine = D.mine.map(fixDeck).filter(Boolean);
const decks = () => [...DECKS.filter(d => !(D.hideDraft && !d.v)), ...D.mine];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const count = ok => { if (D.day !== today()) { D.day = today(); D.dayN = 0; D.dayOk = 0; } D.dayN++; if (ok) D.dayOk++; store.save(); };
const app = $('#app');

/* ---------- accueil ---------- */
function viewHome() {
  const now = Date.now(), main = h('div', { class: 'main' });
  if (D.day !== today()) { D.dayN = 0; D.dayOk = 0; }
  const all = decks(), dueAll = all.reduce((a, d) => a + E.stats(d, D.prog, now).due, 0);
  main.append(h('div', { class: 'card today' }, h('div', { class: 'big', text: D.dayN ? `${D.dayN} réponse${D.dayN > 1 ? 's' : ''} aujourd’hui` : 'Rien encore aujourd’hui' }),
    h('p', { class: 'note', style: 'margin:4px 0 12px', text: D.dayN ? `${Math.round(100 * D.dayOk / D.dayN)} % de justes. ${dueAll} carte${dueAll > 1 ? 's' : ''} à voir ou à revoir.` : `${dueAll} cartes à voir. Dix minutes par jour suffisent.` }),
    h('div', { class: 'acts', style: 'margin-top:0' }, h('button', { type: 'button', class: 'btn', html: icon('play') + '<span>Tout mélanger</span>', onclick: () => start({ id: 'all', t: 'Tout mélanger', cards: [] }, 'qcm', all) }),
      h('button', { type: 'button', class: 'btn sec', style: 'flex:0 0 auto', html: icon('clock') + '<span>Chrono</span>', onclick: () => start({ id: 'all', t: 'Chrono', cards: [] }, 'chrono', all) }))));
  main.append(h('div', { class: 'label', text: 'Thèmes' }));
  main.append(h('div', { class: 'list' }, ...all.map(d => { const s = E.stats(d, D.prog, now);
    return h('button', { type: 'button', class: 'row deck', onclick: () => openDeck(d) }, h('span', { class: 'ic', html: icon(d.icon) }),
      h('div', { class: 't' }, h('b', { text: d.t }), h('small', { text: `${s.n} carte${s.n > 1 ? 's' : ''} · ${s.pct} % acquis${s.due ? ` · ${s.due} à voir` : ''}` }), h('div', { class: 'bar' }, h('i', { style: `width:${s.pct}%` }))),
      !d.v ? h('span', { class: 'badge amber', text: 'À valider' }) : null, h('span', { class: 'chev', html: icon('chev') })); })));
  main.append(h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn sec', html: icon('plus') + '<span>Mes cartes</span>', onclick: () => { const d = fixDeck({ t: 'Mes cartes', cards: [] }); D.mine.push(d); store.save(); editDeck(d); } }),
    h('button', { type: 'button', class: 'btn sec', html: icon('import') + '<span>Ouvrir un fichier</span>', onclick: async () => { const f = await pickFile('.json,application/json'); if (!f) return; const d = readFileData('drill', f.text); if (d) incoming(d); else toast('Ce fichier n’est pas un thème Drill'); } })));
  main.append(frow('Masquer les thèmes à valider', 'Contenu pas encore relu sur le règlement en vigueur', sw(D.hideDraft, v => { D.hideDraft = v; store.save(); viewHome(); })),
    h('p', { class: 'note', text: 'Contenu reformulé d’après les règlements de l’Armée suisse cités dans chaque thème. Les règlements en vigueur font foi. Rien ne quitte ce téléphone.' }));
  app.replaceChildren(h('header', { class: 'head' }, h('h1', { text: 'Drill' })), main);
}
function openDeck(d) {
  const s = E.stats(d, D.prog, Date.now()), body = [];
  body.push(h('p', { class: 'note', style: 'margin-top:0', text: `${s.n} cartes, ${s.known} acquises, ${s.due} à voir ou à revoir.` }));
  const mode = (i, t, sub, m) => h('button', { type: 'button', class: 'row', disabled: d.cards.length ? null : true, onclick: () => { closeSheet(true); start(d, m); } }, h('span', { class: 'ic', html: icon(i) }), h('div', { class: 't' }, h('b', { text: t }), h('small', { text: sub })), h('span', { class: 'chev', html: icon('chev') }));
  const rows = [mode('cards', 'Cartes', 'Retourner la carte, puis dire si c’était su', 'cards')];
  if (d.cards.length >= 4) rows.push(mode('check', 'QCM', 'Quatre propositions, une seule juste', 'qcm'), mode('clock', 'Chrono', 'Le plus de bonnes réponses en 60 secondes', 'chrono'));
  if (d.id === 'alpha') rows.push(mode('bolt', 'Épeler', 'Un mot ou une plaque à épeler à voix haute', 'spell'));
  body.push(h('div', { class: 'list', style: 'margin-top:10px' }, ...rows));
  body.push(h('p', { class: 'ref', text: 'Source : ' + d.src + (d.v ? '' : ' À valider avant emploi en instruction.') }));
  if (d.mine) body.push(h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn sec', html: icon('edit') + '<span>Modifier</span>', onclick: () => editDeck(d) }),
    h('button', { type: 'button', class: 'btn sec', html: icon('share') + '<span>Partager</span>', onclick: () => shareSheet('Partager le thème', 'drill', { t: d.t, cards: d.cards }, 'drill_' + d.t.replace(/\W+/g, '_') + '.json') })));
  else body.push(h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn sec wide', text: 'Remettre ce thème à zéro', onclick: () => confirmSheet('Remettre à zéro ?', `La progression du thème « ${d.t} » sera effacée.`, 'Remettre à zéro', () => { for (const c of d.cards) delete D.prog[E.key(d, c)]; store.save(); viewHome(); }, true) })));
  openSheet(d.t, body);
}
function editDeck(d) {
  const box = h('div');
  const draw = () => box.replaceChildren(...d.cards.map((c, i) => h('div', { class: 'card item' }, textField(c.q, v => { c.q = v; store.save(); }, { ph: 'Question', max: 200 }), h('div', { style: 'margin-top:8px' }, textField(c.a, v => { c.a = v; store.save(); }, { ph: 'Réponse', max: 200 })),
    h('button', { type: 'button', class: 'del', 'aria-label': 'Retirer', html: icon('x'), onclick: () => { d.cards.splice(i, 1); store.save(); draw(); } }))),
    h('button', { type: 'button', class: 'btn sec wide', html: icon('plus') + '<span>Carte</span>', onclick: () => { if (d.cards.length >= 300) return; d.cards.push({ q: '', a: '' }); draw(); const f = box.querySelectorAll('.item input'); if (f.length) f[f.length - 2].focus(); } }));
  draw();
  openSheet('Mes cartes', [textField(d.t, v => { d.t = v.trim().slice(0, 40) || 'Mes cartes'; store.save(); }, { ph: 'Nom du thème', max: 40 }), h('div', { class: 'label', text: 'Cartes' }), box,
    h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn danger wide', text: 'Supprimer ce thème', onclick: () => { const i = D.mine.indexOf(d); if (i >= 0) D.mine.splice(i, 1); closeSheet(); } }))],
    () => { d.cards = d.cards.filter(c => c.q.trim() && c.a.trim()); store.save(); viewHome(); });
}
function incoming(x) {
  const d = fixDeck(Object.assign({}, x, { id: '' }));
  if (!d || !d.cards.length) { toast('Thème illisible'); return; }
  confirmSheet('Thème reçu', `« ${d.t} » : ${d.cards.length} carte${d.cards.length > 1 ? 's' : ''}. L’ajouter à cet appareil ?`, 'Ajouter', () => { D.mine.push(d); store.save(); viewHome(); });
}

/* ---------- séance ---------- */
let S = null, timer = 0;
function start(deck, mode, pool) {
  const now = Date.now(); let items;
  if (mode === 'spell') items = E.shuffle(SPELL).slice(0, 8).map(w => ({ w }));
  else if (pool) items = E.shuffle(pool.flatMap(d => E.pick(d, D.prog, mode === 'chrono' ? 12 : 4, now).map(c => ({ d, c })))).slice(0, mode === 'chrono' ? 80 : 15);
  else items = E.pick(deck, D.prog, mode === 'chrono' ? 60 : 12, now).map(c => ({ d: deck, c }));
  items = items.filter(x => x.w || x.d.cards.length >= (mode === 'cards' ? 1 : 4));
  if (!items.length) { toast('Pas assez de cartes'); return; }
  S = { deck, mode, pool, items, i: 0, ok: 0, miss: [], end: mode === 'chrono' ? now + 60000 : 0 };
  clearInterval(timer);
  if (S.end) timer = setInterval(() => { if (!S) return clearInterval(timer); const left = S.end - Date.now(); const b = $('.tbar i'); if (b) b.style.width = Math.max(0, left / 600) + '%'; if (left <= 0) finish(); }, 200);
  step();
}
function shell(body) {
  const pct = S.end ? 100 : Math.round(100 * S.i / S.items.length);
  app.replaceChildren(h('header', { class: 'head' }, h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Arrêter la séance', html: icon('x'), onclick: () => { clearInterval(timer); S = null; viewHome(); } }),
    h('h1', { class: 'sm', text: S.deck.t }), h('span', { class: 'sub', text: S.end ? `${S.ok} juste${S.ok > 1 ? 's' : ''}` : `${Math.min(S.i + 1, S.items.length)} / ${S.items.length}` })),
    h('div', { class: 'bar tbar' + (S.end ? ' chrono' : '') }, h('i', { style: `width:${pct}%` })), h('div', { class: 'main play' }, ...body));
}
function answer(ok) { const it = S.items[S.i]; if (it.c) { E.mark(it.d, it.c, D.prog, ok, Date.now()); count(ok); } if (ok) S.ok++; else if (it.c) S.miss.push(it.c); }
function next() { S.i++; if (S.i >= S.items.length) finish(); else step(); }
function step() {
  const it = S.items[S.i];
  if (S.mode === 'spell') {
    const ans = h('div', { class: 'spell', hidden: true }, ...[...it.w].map(ch => h('span', { text: /[A-Z]/.test(ch) ? ALPHA[ch.charCodeAt(0) - 65] : ch === ' ' ? '·' : ch })));
    const acts = h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn wide', text: 'Voir la réponse', onclick: () => { ans.hidden = false; acts.replaceChildren(h('button', { type: 'button', class: 'btn sec', text: 'À revoir', onclick: next }), h('button', { type: 'button', class: 'btn', text: 'Juste', onclick: () => { S.ok++; next(); } })); } }));
    return shell([h('div', { class: 'qcard' }, h('small', { text: 'Épeler à voix haute' }), h('div', { class: 'q word', text: it.w })), ans, acts]);
  }
  const c = it.c;
  if (S.mode === 'cards') {
    const back = h('div', { class: 'qcard back', hidden: true }, h('small', { text: 'Réponse' }), h('div', { class: 'a', text: c.a }), c.n ? h('p', { class: 'note', text: c.n }) : null);
    const acts = h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn wide', text: 'Retourner', onclick: () => { back.hidden = false; acts.replaceChildren(h('button', { type: 'button', class: 'btn sec', text: 'À revoir', onclick: () => { answer(false); next(); } }), h('button', { type: 'button', class: 'btn', text: 'Su', onclick: () => { answer(true); next(); } })); } }));
    return shell([h('div', { class: 'qcard' }, h('small', { text: it.d.t }), h('div', { class: 'q', text: c.q })), back, acts]);
  }
  const opts = E.options(it.d, c), box = h('div', { class: 'opts' }), after = h('div');
  let done = false;
  for (const o of opts) box.append(h('button', { type: 'button', class: 'opt', text: o, onclick: e => {
    if (done) return; done = true;
    const ok = o === c.a; answer(ok);
    for (const b of box.children) { if (b.textContent === c.a) b.classList.add('good'); else if (b === e.currentTarget) b.classList.add('bad'); }
    if (ok || S.end) setTimeout(() => { if (S) next(); }, ok ? 550 : 1100);
    else after.replaceChildren(c.n ? h('p', { class: 'note', text: c.n }) : '', h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn wide', text: 'Suivant', onclick: next })));
  } }));
  shell([h('div', { class: 'qcard' }, h('small', { text: it.d.t }), h('div', { class: 'q', text: c.q })), box, after]);
}
function finish() {
  clearInterval(timer);
  const s = S, total = s.end ? s.i : s.items.length, body = [];
  S = null;
  body.push(h('div', { class: 'card', style: 'text-align:center;padding:26px 14px' }, h('div', { class: 'score', text: s.end ? String(s.ok) : `${s.ok} / ${total}` }),
    h('p', { class: 'note', style: 'margin:6px 0 0', text: s.end ? `bonne${s.ok > 1 ? 's' : ''} réponse${s.ok > 1 ? 's' : ''} en 60 secondes` : s.ok === total ? 'Sans faute.' : 'Les cartes manquées reviendront en premier.' })));
  if (s.miss.length) body.push(h('div', { class: 'label', text: 'À revoir' }), h('div', { class: 'list' }, ...[...new Set(s.miss)].slice(0, 30).map(c => h('div', { class: 'row' }, h('div', { class: 't' }, h('small', { class: 'wrap', text: c.q }), h('b', { class: 'wrap', text: c.a }))))));
  body.push(h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn sec', text: 'Terminer', onclick: viewHome }), h('button', { type: 'button', class: 'btn', text: 'Encore', onclick: () => start(s.deck, s.mode, s.pool) })));
  app.replaceChildren(h('header', { class: 'head' }, h('h1', { class: 'sm', text: s.deck.t })), h('div', { class: 'main' }, ...body));
}
viewHome(); bootSW();
readIncoming('drill', incoming);
})();
