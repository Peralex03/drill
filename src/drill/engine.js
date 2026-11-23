/* Drill : tirage des cartes, répétition espacée (boîtes de Leitner), mauvaises réponses du QCM. Fonctions pures. */
'use strict';
const DrillEngine = (() => {
  const DAY = 86400000, GAP = [0, 1, 3, 7, 21];            /* jours avant de revoir une carte, par boîte */
  const hash = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(36); };
  const key = (deck, c) => deck.id + ':' + hash(c.q + '|' + c.a);
  const shuffle = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor((rnd || Math.random)() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  /* cartes d'une séance : d'abord celles à revoir, puis les nouvelles, puis les autres */
  function pick(deck, prog, n, now, rnd) {
    const due = [], fresh = [], rest = [];
    for (const c of deck.cards) { const p = prog[key(deck, c)]; if (!p) fresh.push(c); else if (p.d <= now) due.push(c); else rest.push(c); }
    return [...shuffle(due, rnd), ...shuffle(fresh, rnd), ...shuffle(rest, rnd)].slice(0, n);
  }
  function mark(deck, c, prog, ok, now) {
    const k = key(deck, c), p = prog[k] || { b: 0, d: 0, ok: 0, ko: 0 };
    if (ok) { p.b = Math.min(GAP.length - 1, p.b + 1); p.ok++; } else { p.b = 0; p.ko++; }
    p.d = now + GAP[p.b] * DAY;
    prog[k] = p;
    return p;
  }
  /* quatre propositions : la bonne et trois autres, tirées des mauvaises réponses de la carte ou des cartes du même groupe */
  function options(deck, c, rnd) {
    let pool = c.x ? c.x.slice() : [];
    if (pool.length < 3) { const same = deck.cards.filter(o => o !== c && o.a !== c.a && (c.g ? o.g === c.g : true)).map(o => o.a); pool = pool.concat(shuffle([...new Set(same)], rnd)); }
    if (pool.length < 3) pool = pool.concat(shuffle([...new Set(deck.cards.filter(o => o.a !== c.a).map(o => o.a))], rnd));
    const wrong = [...new Set(pool)].filter(a => a !== c.a).slice(0, 3);
    return shuffle([c.a, ...wrong], rnd);
  }
  function stats(deck, prog, now) {
    let seen = 0, known = 0, due = 0;
    for (const c of deck.cards) { const p = prog[key(deck, c)]; if (!p) { due++; continue; } seen++; if (p.b >= 3) known++; if (p.d <= now) due++; }
    return { n: deck.cards.length, seen, known, due, pct: deck.cards.length ? Math.round(100 * known / deck.cards.length) : 0 };
  }
  return { key, pick, mark, options, stats, shuffle, GAP };
})();
if (typeof module !== 'undefined') module.exports = DrillEngine;
