// JS 도매 주문 웹앱 — 화면 코드
// 프레임워크 없이 순수 자바스크립트로 만들어서 Capacitor/PWABuilder로 그대로 앱 포장이 가능합니다.
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const view = $('#view');

  const S = {
    catalog: null,
    lang: Store.get('js.lang', 'ko'),
    user: API.currentUser(),
    cart: Store.get('js.cart', []),   // [{id, qty}]
    cat: 'all', q: '',
    qty: 1, qtyFor: null,
    admin: false,
    installEvt: null
  };

  // ── 도우미 ─────────────────────────────────────────────
  const t = (k, p = {}) => {
    let s = (I18N[S.lang] && I18N[S.lang][k]) ?? I18N.ko[k] ?? k;
    for (const [a, b] of Object.entries(p)) s = s.split('{' + a + '}').join(b);
    return s;
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L = o => (o && typeof o === 'object') ? (o[S.lang] || o.ko || '') : (o || '');
  const money = n => new Intl.NumberFormat(S.lang === 'vi' ? 'vi-VN' : 'ko-KR', {
    style: 'currency', currency: (S.catalog && S.catalog.currency) || 'KRW', maximumFractionDigits: 0
  }).format(n);
  const find = id => S.catalog.products.find(p => p.id === id);
  const saveCart = () => Store.set('js.cart', S.cart);

  // 브라우저 확인창(confirm) 대신 버튼을 두 번 눌러 확인 — 앱 포장·미리보기 환경에서도 동작
  function confirmTap(b) {
    if (b.dataset.armed) return true;
    b.dataset.armed = '1';
    const orig = b.textContent;
    b.textContent = '한 번 더 누르면 실행돼요';
    setTimeout(() => { delete b.dataset.armed; b.textContent = orig; }, 3000);
    return false;
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 1800);
  }

  // ── 라인 아이콘 (이모지 대신 고급스러운 선 아이콘) ─────────
  const ICONS = {
    leaf: '<path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z"/><path d="M5 19l8-8"/>',
    grain: '<path d="M12 21V7"/><path d="M12 7c-1.6-.8-2.5-2.4-2.5-4.2 1.7.2 2.5 1.8 2.5 4.2zM12 7c1.6-.8 2.5-2.4 2.5-4.2-1.7.2-2.5 1.8-2.5 4.2z"/><path d="M12 12.5c-2.4-.4-3.9-1.9-4.4-3.9 2.4.3 3.9 1.8 4.4 3.9zM12 12.5c2.4-.4 3.9-1.9 4.4-3.9-2.4.3-3.9 1.8-4.4 3.9zM12 17.5c-2.4-.4-3.9-1.9-4.4-3.9 2.4.3 3.9 1.8 4.4 3.9zM12 17.5c2.4-.4 3.9-1.9 4.4-3.9-2.4.3-3.9 1.8-4.4 3.9z"/>',
    cup: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3"/><path d="M3 21h14"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
    bottle: '<path d="M10 2h4v3h-4z"/><path d="M9 5h6l1 3v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8z"/><path d="M8 12h8"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>',
    box: '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r=".8"/><circle cx="4" cy="12" r=".8"/><circle cx="4" cy="18" r=".8"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
    star: '<path d="M12 4l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 21h16"/>',
    truck: '<path d="M2 6h12v10H2z"/><path d="M14 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16"/><path d="M20 21v-5h-5"/>',
    back: '<path d="M15 5l-7 7 7 7"/>'
  };
  const PRODUCT_ICONS = ['box', 'leaf', 'grain', 'cup', 'drop', 'bottle', 'sparkle'];
  const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ICONS.box}</svg>`;

  // ── 가격 계산 (수량별 단가) ─────────────────────────────
  function tierIndex(p, qty) {
    let idx = 0;
    p.tiers.forEach((tr, i) => { if (qty >= tr.min) idx = i; });
    return idx;
  }
  const unitPrice = (p, qty) => p.tiers[tierIndex(p, qty)].price;
  const clampQty = (p, v) => Math.max(p.moq, Math.min(99999, parseInt(v, 10) || p.moq));

  // ── 공통 조각 ─────────────────────────────────────────
  function Thumb(p, size = '') {
    const img = (p.images && p.images[0]) || p.image;
    if (img) return `<div class="thumb photo ${size}"><img src="${esc(img)}" alt="" loading="lazy"></div>`;
    return `<div class="thumb ${size}" style="--tone:${esc(p.color || '#E8E4DA')}">${icon(p.icon || 'box')}</div>`;
  }

  function Stock(p) {
    const map = { in: ['ok', t('stock_in')], low: ['warn', t('stock_low')], out: ['bad', t('stock_out')] };
    const [cls, label] = map[p.stock] || map.in;
    const extra = p.stock === 'out' && p.restock ? ' · ' + t('stock_restock', { d: esc(p.restock) }) : '';
    return `<span class="stock ${cls}">${label}${extra}</span>`;
  }

  function Stepper(key, val, min, id = '') {
    return `<div class="stepper">
      <button type="button" data-act="dec" data-k="${key}" data-id="${esc(id)}" aria-label="-">−</button>
      <input type="number" inputmode="numeric" min="${min}" value="${val}" data-k="${key}" data-id="${esc(id)}">
      <button type="button" data-act="inc" data-k="${key}" data-id="${esc(id)}" aria-label="+">+</button>
    </div>`;
  }

  function Locked() {
    return `<section class="panel locked-panel">
      <div class="lock-icon">${icon('lock')}</div>
      <h2>${t('locked_title')}</h2>
      <p class="muted">${t('locked_sub')}</p>
      <a class="btn btn-primary" href="#/login">${t('login')}</a>
      <button class="btn btn-ghost demo-btn" data-act="demo">${t('demo_browse')}</button>
    </section>`;
  }

  // ── 홈 (제품 목록) ─────────────────────────────────────
  function Home() {
    const c = S.catalog;
    const cats = ['all', ...Object.keys(c.categories || {})];
    return `
      <section class="hero">
        <p class="eyebrow">${esc(L(c.company.tagline))}</p>
        <h1>${t('hero_title')}</h1>
        <span class="rule"></span>
        <p class="hero-sub">${t('hero_sub')}</p>
        ${S.user
          ? `<p class="hello">${t('welcome', { c: esc(S.user.company) })}</p>`
          : `<a class="btn btn-accent" href="#/login">${t('hero_login')}</a>`}
      </section>
      <div class="search"><input id="q" type="search" placeholder="${t('search_ph')}" value="${esc(S.q)}" autocomplete="off"></div>
      <div class="chips">${cats.map(k => `<button class="chip ${S.cat === k ? 'on' : ''}" data-act="cat" data-k="${esc(k)}">${k === 'all' ? t('cat_all') : esc(L(c.categories[k]))}</button>`).join('')}</div>
      ${!S.q && S.cat === 'all' ? `
      <div class="sec-head"><h2>${t('featured')}</h2></div>
      <div class="hscroll">${c.products.slice(0, 4).map(Feature).join('')}</div>
      <div class="sec-head"><h2>${t('all_products')}</h2></div>` : ''}
      <div class="grid" id="grid">${Grid()}</div>`;
  }

  function Feature(p) {
    return `<a class="feature" href="#/p/${esc(p.id)}">
      ${Thumb(p)}
      <div class="feature-body">
        <p class="muted small">${esc(L((S.catalog.categories || {})[p.category]))}</p>
        <h3>${esc(L(p.name))}</h3>
        <p class="small feature-sum">${esc(L(p.summary))}</p>
        ${S.user ? `<p class="price">${t('price_from', { p: money(p.tiers[p.tiers.length - 1].price) })}</p>` : `<p class="locked">${icon('lock')} ${t('price_locked')}</p>`}
      </div></a>`;
  }

  function Grid() {
    const q = S.q.trim().toLowerCase();
    const list = S.catalog.products.filter(p =>
      (S.cat === 'all' || p.category === S.cat) &&
      (!q || [p.name.ko, p.name.vi, L(p.desc)].join(' ').toLowerCase().includes(q)));
    if (!list.length) return `<p class="empty">${t('no_result')}</p>`;
    return list.map(p => `
      <a class="card" href="#/p/${esc(p.id)}">
        ${Thumb(p)}
        <div class="card-body">
          <h3>${esc(L(p.name))}</h3>
          <p class="muted small">${t('per_unit', { n: p.perBox })} · ${t('moq', { n: p.moq })}</p>
          ${S.user
            ? `<p class="price">${t('price_from', { p: money(p.tiers[p.tiers.length - 1].price) })}</p>`
            : `<p class="locked">${icon('lock')} ${t('price_locked')}</p>`}
          ${p.stock !== 'in' ? Stock(p) : ''}
        </div>
      </a>`).join('');
  }

  // ── 제품 상세 (실제 쇼핑앱형 상세페이지) ───────────────
  function Detail(id) {
    const p = find(id);
    if (!p) return `<p class="empty">${t('not_found')}</p>`;
    if (S.qtyFor !== id) { S.qty = p.moq; S.qtyFor = id; }
    const imgs = (p.images && p.images.length) ? p.images : (p.image ? [p.image] : []);
    const low = p.tiers[p.tiers.length - 1].price, high = p.tiers[0].price;
    const related = [...S.catalog.products.filter(x => x.id !== p.id && x.category === p.category),
                     ...S.catalog.products.filter(x => x.id !== p.id && x.category !== p.category)].slice(0, 4);
    const svc = S.catalog.service;
    return `
    <div class="detail">
      <div class="gallery-wrap">
        <a class="fab-back" href="#/" aria-label="back">${icon('back')}</a>
        ${imgs.length ? `<div class="gallery" id="gallery">${imgs.map(src => `<div class="slide"><img src="${esc(src)}" alt=""></div>`).join('')}</div>
          ${imgs.length > 1 ? `<div class="dots" id="dots">${imgs.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}`
          : Thumb(p, 'lg')}
      </div>

      <section class="info">
        <div class="info-top"><span class="cat">${esc(L((S.catalog.categories || {})[p.category]))}</span>${Stock(p)}</div>
        <h1 class="title">${esc(L(p.name))}</h1>
        ${p.summary ? `<p class="summary-line">${esc(L(p.summary))}</p>` : ''}
        ${S.user
          ? `<p class="price-range"><strong>${money(low)}</strong> ~ ${money(high)} <span>${t('per_box')}</span></p>`
          : `<p class="price-range locked">${icon('lock')} ${t('price_locked')}</p>`}
        <div class="facts">
          <span>${t('per_unit', { n: p.perBox })}</span><span>${t('moq', { n: p.moq })}</span><span>${t('ship_today')}</span>
        </div>
      </section>

      <nav class="dtabs">
        <button data-act="jump" data-k="sec-detail" class="on">${t('tab_detail')}</button>
        <button data-act="jump" data-k="sec-price">${t('tab_price')}</button>
        <button data-act="jump" data-k="sec-info">${t('tab_info')}</button>
      </nav>

      <section id="sec-detail" class="anchor">
        ${p.points ? `<div class="points">${p.points.map(pt => `
          <div class="point"><div class="point-ic">${icon(pt.icon)}</div><b>${esc(L(pt.t))}</b><span>${esc(L(pt.d))}</span></div>`).join('')}</div>` : ''}
        <p class="desc pad">${esc(L(p.desc))}</p>
        ${(p.sections || []).map((sec, i) => `
          <article class="story">
            ${sec.img ? `<div class="story-img"><img src="${esc(sec.img)}" alt="" loading="lazy"></div>` : ''}
            <div class="story-text"><span class="story-no">0${i + 1}</span><h2>${esc(L(sec.t))}</h2><p>${esc(L(sec.d))}</p></div>
          </article>`).join('')}
        ${p.recommend ? `<div class="pad"><h3 class="mini-title">${t('recommend_for')}</h3>
          <div class="tags">${(p.recommend[S.lang] || p.recommend.ko).map(r => `<span>${esc(r)}</span>`).join('')}</div></div>` : ''}
      </section>

      <section id="sec-price" class="anchor">${S.user ? PriceBlock(p) : Locked()}</section>

      <section id="sec-info" class="anchor">
        <div class="panel">
          <h2>${t('specs')}</h2>
          <dl class="specs">
            <div><dt>${t('spec_pack')}</dt><dd>${t('per_unit', { n: p.perBox })}</dd></div>
            <div><dt>${t('spec_moq')}</dt><dd>${t('moq', { n: p.moq })}</dd></div>
            <div><dt>${t('spec_origin')}</dt><dd>${esc(L(p.origin))}</dd></div>
            ${p.shelf ? `<div><dt>${t('spec_shelf')}</dt><dd>${esc(L(p.shelf))}</dd></div>` : ''}
            <div><dt>${t('spec_size')}</dt><dd>${esc(p.size)}</dd></div>
            <div><dt>${t('spec_weight')}</dt><dd>${esc(p.weight)}</dd></div>
          </dl>
        </div>
        ${svc ? `<div class="panel"><h2>${esc(L(svc.title))}</h2>
          ${svc.items.map(it => `<div class="svc"><div class="svc-ic">${icon(it.icon)}</div><div><b>${esc(L(it.t))}</b><p>${esc(L(it.d))}</p></div></div>`).join('')}
        </div>` : ''}
      </section>

      ${related.length ? `<div class="sec-head"><h2>${t('related')}</h2></div>
        <div class="hscroll small-cards">${related.map(r => `
          <a class="mini-card" href="#/p/${esc(r.id)}">${Thumb(r)}<b>${esc(L(r.name))}</b>
          ${S.user ? `<span class="price">${t('price_from', { p: money(r.tiers[r.tiers.length - 1].price) })}</span>` : ''}</a>`).join('')}</div>` : ''}
    </div>
    ${BuyBar(p)}`;
  }

  function BuyBar(p) {
    if (!S.user) return `<div class="buybar">
      <button class="btn btn-ghost" data-act="demo">${t('demo_browse')}</button>
      <a class="btn btn-primary" href="#/login">${t('login')}</a></div>`;
    return `<div class="buybar">
      <div class="buybar-total"><span>${t('est_total')} · ${S.qty}${S.lang === 'ko' ? '' : ' '}${t('unit_box')}</span><strong id="buyTotal">${money(unitPrice(p, S.qty) * S.qty)}</strong></div>
      <button class="btn btn-primary" data-act="add" data-id="${esc(p.id)}">${t('add_cart')}</button></div>`;
  }

  function PriceBlock(p) {
    return `
      <section class="panel">
        <h2>${t('tier_title')}</h2>
        <table class="tiers" id="tiers">${TierRows(p)}</table>
        <div class="qtyrow"><span>${t('qty')}</span>${Stepper('qty', S.qty, p.moq, p.id)}<span class="muted">${t('unit_box')}</span></div>
        <div id="calc">${Calc(p)}</div>
      </section>`;
  }

  function TierRows(p) {
    const cur = tierIndex(p, S.qty);
    return `<thead><tr><th>${t('tier_qty')}</th><th>${t('tier_price')}</th><th>${t('tier_each')}</th></tr></thead><tbody>` +
      p.tiers.map((tr, i) => {
        const nx = p.tiers[i + 1];
        const range = nx ? t('tier_range', { a: tr.min, b: nx.min - 1 }) : t('tier_range_from', { n: tr.min });
        return `<tr class="${i === cur ? 'cur' : ''}"><td>${range}</td><td>${money(tr.price)}</td><td>${money(Math.round(tr.price / p.perBox))}</td></tr>`;
      }).join('') + '</tbody>';
  }

  function Calc(p) {
    const q = S.qty, up = unitPrice(p, q), nx = p.tiers[tierIndex(p, q) + 1];
    const hint = nx
      ? t('next_tier', { n: nx.min - q, p: money(nx.price), s: money(up - nx.price) })
      : t('best_tier');
    return `
      <div class="total"><span>${t('total')}</span><strong>${money(up * q)}</strong></div>
      <p class="muted small right">${money(up)} × ${q}${S.lang === 'ko' ? '' : ' '}${t('unit_box')} · ${t('each_price', { p: money(Math.round(up / p.perBox)) })}</p>
      <p class="hint ${nx ? '' : 'best'}">${icon(nx ? 'star' : 'check')}<span>${hint}</span></p>`;
  }

  function setDetailQty(v) {
    const p = find(S.qtyFor);
    if (!p) return;
    S.qty = clampQty(p, v);
    const input = view.querySelector('input[data-k="qty"]');
    if (input) input.value = S.qty;
    $('#tiers').innerHTML = TierRows(p);
    $('#calc').innerHTML = Calc(p);
    const bar = view.querySelector('.buybar-total');
    if (bar) bar.outerHTML = BuyBar(p).match(/<div class="buybar-total">[\s\S]*?<\/strong><\/div>/)[0];
  }

  // ── 견적함 ─────────────────────────────────────────────
  function Cart() {
    if (!S.user) return Locked();
    const lines = S.cart.map(it => {
      const p = find(it.id);
      if (!p) return null;
      const up = unitPrice(p, it.qty);
      return { p, qty: it.qty, up, sum: up * it.qty };
    }).filter(Boolean);
    if (!lines.length) return `
      <div class="emptybox"><div class="big">${icon('receipt')}</div><p>${t('cart_empty')}</p>
      <a class="btn btn-primary" href="#/">${t('browse')}</a></div>`;
    const total = lines.reduce((a, l) => a + l.sum, 0);
    const u = S.user;
    return `
      <h1 class="pagetitle">${t('nav_cart')}</h1>
      <div class="lines">${lines.map(l => `
        <div class="line">
          ${Thumb(l.p, 'sm')}
          <div class="line-main">
            <a href="#/p/${esc(l.p.id)}"><b>${esc(L(l.p.name))}</b></a>
            <p class="muted small">${money(l.up)} / ${t('unit_box')}</p>
            ${Stepper('cart', l.qty, l.p.moq, l.p.id)}
          </div>
          <div class="line-end">
            <b>${money(l.sum)}</b>
            <button class="link danger" data-act="rm" data-id="${esc(l.p.id)}">${t('remove')}</button>
          </div>
        </div>`).join('')}
      </div>
      <div class="total pad"><span>${t('subtotal')}</span><strong>${money(total)}</strong></div>
      <form id="reqform" class="panel form" novalidate>
        <h2>${t('form_title')}</h2>
        <label>${t('f_company')}<input name="company" value="${esc(u.company)}" autocomplete="organization"></label>
        <label>${t('f_name')}<input name="name" value="${esc(u.name || '')}" autocomplete="name"></label>
        <label>${t('f_phone')}<input name="phone" type="tel" value="${esc(u.phone || '')}" autocomplete="tel"></label>
        <label>${t('f_date')}<input name="date" type="date"></label>
        <label>${t('f_memo')}<textarea name="memo" rows="3" placeholder="${t('f_memo_ph')}"></textarea></label>
        <p class="note">${t('pay_note')}</p>
        <button class="btn btn-primary block" type="submit">${t('submit')}</button>
      </form>`;
  }

  function setCartQty(id, v) {
    const it = S.cart.find(x => x.id === id), p = find(id);
    if (!it || !p) return;
    it.qty = clampQty(p, v);
    saveCart();
    rerender();
  }

  async function submitRequest(form) {
    const f = Object.fromEntries(new FormData(form).entries());
    if (!f.company.trim() || !f.name.trim() || !f.phone.trim()) { toast(t('required')); return; }
    const items = S.cart.map(it => {
      const p = find(it.id);
      if (!p) return null;
      const up = unitPrice(p, it.qty);
      return { id: p.id, name: L(p.name), qty: it.qty, unitPrice: up, sum: up * it.qty };
    }).filter(Boolean);
    const total = items.reduce((a, i) => a + i.sum, 0);
    const saved = await API.submitRequest({ ...f, items, total, currency: S.catalog.currency, lang: S.lang });
    S.user = API.updateUser({ company: f.company.trim(), name: f.name.trim(), phone: f.phone.trim() });
    S.cart = []; saveCart();
    location.hash = '#/done/' + saved.id;
  }

  function requestText(r) {
    return [
      `[${S.catalog.company.name}] ${r.id}`,
      `${t('f_company')}: ${r.company} / ${t('f_name')}: ${r.name} / ${t('f_phone')}: ${r.phone}`,
      r.date ? `${t('f_date')}: ${r.date}` : '',
      ...r.items.map(i => `- ${i.name} × ${i.qty}${t('unit_box')} = ${money(i.sum)}`),
      `${t('subtotal')}: ${money(r.total)}`,
      r.memo ? `${t('f_memo')}: ${r.memo}` : ''
    ].filter(Boolean).join('\n');
  }

  function Done(id) {
    const r = API.getRequest(id);
    if (!r) return `<p class="empty">—</p>`;
    return `
      <section class="panel done">
        <div class="big gold">${icon('check')}</div>
        <h1>${t('done_title')}</h1>
        <p class="muted">${t('done_sub', { id: esc(r.id) })}</p>
        <pre class="summary">${esc(requestText(r))}</pre>
        <button class="btn btn-ghost block" data-act="copy" data-id="${esc(r.id)}">${t('copy')}</button>
        <a class="btn btn-primary block" href="#/">${t('back_home')}</a>
      </section>`;
  }

  // ── 요청 내역 ─────────────────────────────────────────
  function Orders() {
    if (!S.user) return Locked();
    const list = API.listRequests();
    if (!list.length) return `<div class="emptybox"><div class="big">${icon('list')}</div><p>${t('orders_empty')}</p></div>`;
    return `<h1 class="pagetitle">${t('nav_orders')}</h1>` + list.map(r => `
      <article class="panel order">
        <div class="order-head"><b>${esc(r.id)}</b><span class="badge">${t('status_' + r.status)}</span></div>
        <p class="muted small">${new Date(r.createdAt).toLocaleString(S.lang === 'vi' ? 'vi-VN' : 'ko-KR')} · ${t('items_n', { n: r.items.length })}</p>
        <ul class="order-items">${r.items.map(i => `<li><span>${esc(i.name)} × ${i.qty}</span><span>${money(i.sum)}</span></li>`).join('')}</ul>
        <div class="total"><span>${t('subtotal')}</span><strong>${money(r.total)}</strong></div>
        <button class="btn btn-ghost block" data-act="reorder" data-id="${esc(r.id)}">${t('reorder')}</button>
      </article>`).join('');
  }

  // ── 로그인 / 내 정보 ──────────────────────────────────
  function Login() {
    return `
      <section class="panel form">
        <h1>${t('login_title')}</h1>
        <p class="muted">${t('login_sub')}</p>
        <form id="loginform" novalidate>
          <label>${t('company_ph')}<input name="company" autocomplete="organization"></label>
          <label>${t('code_ph')}<input name="code" autocapitalize="characters" autocomplete="off"></label>
          <button class="btn btn-primary block" type="submit">${t('login')}</button>
        </form>
        <p class="note center">${t('demo_hint')}</p>
      </section>`;
  }

  function Account() {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    return `
      <h1 class="pagetitle">${t('account_title')}</h1>
      <section class="panel">
        ${S.user
          ? `<p><b>${esc(S.user.company)}</b></p>${S.user.name ? `<p class="muted small">${esc(S.user.name)} · ${esc(S.user.phone || '')}</p>` : ''}
             <button class="btn btn-ghost block" data-act="logout">${t('logout')}</button>`
          : `<p class="muted">${t('not_logged')}</p><a class="btn btn-primary block" href="#/login">${t('login')}</a>`}
      </section>
      <section class="panel">
        <h2>${t('language')}</h2>
        <div class="seg">
          <button class="${S.lang === 'ko' ? 'on' : ''}" data-act="setlang" data-k="ko">한국어</button>
          <button class="${S.lang === 'vi' ? 'on' : ''}" data-act="setlang" data-k="vi">Tiếng Việt</button>
        </div>
      </section>
      <section class="panel">
        ${S.installEvt ? `<button class="btn btn-accent block" data-act="install">${icon('download')} ${t('install')}</button>`
          : `<p class="muted small iconline">${icon('download')} ${isIOS ? t('install_ios') : t('install')}</p>`}
      </section>
      <a class="panel linkrow" href="#/admin"><span class="iconline">${icon('settings')} ${t('admin')}</span><span class="chev">›</span></a>
      <p class="muted small center ver">JS Web App v0.1</p>`;
  }

  // ── 관리자 (제품·가격 관리) ────────────────────────────
  function Admin(id) {
    if (!S.admin) return `
      <section class="panel form">
        <h1>관리자 로그인</h1>
        <form id="adminlogin" novalidate>
          <label>관리자 PIN<input name="pin" type="password" inputmode="numeric" autocomplete="off"></label>
          <button class="btn btn-primary block" type="submit">확인</button>
        </form>
        <p class="note center">데모 PIN: 0000</p>
      </section>`;
    if (id) return AdminEdit(id === 'new' ? null : find(id));
    return `
      <h1 class="pagetitle">제품·가격 관리</h1>
      <div class="notice">
        여기서 바꾼 내용은 <b>이 기기에만</b> 저장돼요. 모든 거래처 화면에 반영하려면
        <b>products.json 내보내기</b>로 받은 파일을 GitHub의 <code>data/products.json</code>에 덮어 올리세요.
        ${API.hasLocalCatalog() ? '<br><b>※ 아직 내보내지 않은 수정 사항이 있을 수 있어요.</b>' : ''}
      </div>
      <div class="admin-actions">
        <a class="btn btn-primary" href="#/admin/new">+ 새 제품</a>
        <button class="btn btn-ghost" data-act="export">products.json 내보내기</button>
        <button class="btn btn-ghost" data-act="copyjson">JSON 복사</button>
        <button class="btn btn-ghost" data-act="reset">원래 데이터로 되돌리기</button>
      </div>
      <div class="lines">${S.catalog.products.map(p => `
        <a class="line" href="#/admin/${esc(p.id)}">
          ${Thumb(p, 'sm')}
          <div class="line-main"><b>${esc(p.name.ko)}</b>
            <p class="muted small">${p.tiers.map(tr => `${tr.min}+ ${money(tr.price)}`).join(' · ')}</p></div>
          <span class="chev">›</span>
        </a>`).join('')}</div>
      <button class="btn btn-ghost block" data-act="adminout">관리자 나가기</button>`;
  }

  function AdminEdit(p) {
    const isNew = !p;
    p = p || { id: '', icon: 'box', color: '#E8E4DA', images: [], category: Object.keys(S.catalog.categories)[0],
      name: { ko: '', vi: '' }, desc: { ko: '', vi: '' }, perBox: 1, moq: 1,
      tiers: [{ min: 1, price: 0 }], stock: 'in', restock: '', origin: { ko: '대한민국', vi: 'Hàn Quốc' }, size: '', weight: '' };
    const cats = S.catalog.categories;
    const tierRow = tr => `<div class="tier-row"><input type="number" name="tmin" min="1" value="${tr.min}" placeholder="박스 이상">
      <input type="number" name="tprice" min="0" step="100" value="${tr.price}" placeholder="박스당 가격"><button type="button" class="link danger" data-act="deltier">삭제</button></div>`;
    return `
      <a class="back" href="#/admin">‹ 목록</a>
      <form id="editform" class="panel form" data-new="${isNew ? 1 : 0}" novalidate>
        <h1>${isNew ? '새 제품' : '제품 수정'}</h1>
        <label>제품 ID (영문·숫자, 주소에 쓰여요)<input name="id" value="${esc(p.id)}" ${isNew ? '' : 'readonly'} pattern="[a-z0-9-]+"></label>
        <label>아이콘</label>
        <div class="iconpick">${PRODUCT_ICONS.map(n => `<label class="${(p.icon || 'box') === n ? 'on' : ''}"><input type="radio" name="icon" value="${n}" ${(p.icon || 'box') === n ? 'checked' : ''}>${icon(n)}</label>`).join('')}</div>
        <label>배경 톤<input name="color" type="color" value="${esc(p.color)}"></label>
        <label>사진 주소 (여러 장은 쉼표로 구분 — 첫 장이 대표 사진)<input name="images" value="${esc((p.images || (p.image ? [p.image] : [])).join(', '))}" placeholder="images/제품-1.jpg, images/제품-2.jpg"></label>
        <label>카테고리<select name="category">${Object.keys(cats).map(k => `<option value="${esc(k)}" ${k === p.category ? 'selected' : ''}>${esc(cats[k].ko)}</option>`).join('')}</select></label>
        <label>제품명 (한국어)<input name="name_ko" value="${esc(p.name.ko)}"></label>
        <label>제품명 (베트남어)<input name="name_vi" value="${esc(p.name.vi)}"></label>
        <label>설명 (한국어)<textarea name="desc_ko" rows="3">${esc(p.desc.ko)}</textarea></label>
        <label>설명 (베트남어)<textarea name="desc_vi" rows="3">${esc(p.desc.vi)}</textarea></label>
        <label>1박스당 개수<input name="perBox" type="number" min="1" value="${p.perBox}"></label>

        <h2>수량별 단가 (박스 기준)</h2>
        <p class="note">첫 줄의 수량이 최소 주문 수량이 돼요.</p>
        <div id="tierlist">${p.tiers.map(tierRow).join('')}</div>
        <button type="button" class="btn btn-ghost" data-act="addtier">+ 구간 추가</button>

        <h2>재고·사양</h2>
        <div class="two"><label>재고<select name="stock">
            <option value="in" ${p.stock === 'in' ? 'selected' : ''}>재고 있음</option>
            <option value="low" ${p.stock === 'low' ? 'selected' : ''}>재고 적음</option>
            <option value="out" ${p.stock === 'out' ? 'selected' : ''}>품절</option></select></label>
          <label>입고 예정일<input name="restock" type="date" value="${esc(p.restock)}"></label></div>
        <div class="two"><label>원산지 (한국어)<input name="origin_ko" value="${esc(p.origin.ko)}"></label>
          <label>원산지 (베트남어)<input name="origin_vi" value="${esc(p.origin.vi)}"></label></div>
        <div class="two"><label>박스 크기<input name="size" value="${esc(p.size)}"></label>
          <label>박스 무게<input name="weight" value="${esc(p.weight)}"></label></div>

        <button class="btn btn-primary block" type="submit">저장</button>
        ${isNew ? '' : `<button type="button" class="btn btn-ghost block danger" data-act="delprod" data-id="${esc(p.id)}">이 제품 삭제</button>`}
      </form>`;
  }

  function saveProduct(form) {
    const f = Object.fromEntries(new FormData(form).entries());
    const isNew = form.dataset.new === '1';
    const id = f.id.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(id)) return toast('제품 ID는 영문 소문자·숫자·- 만 쓸 수 있어요');
    if (isNew && find(id)) return toast('이미 있는 제품 ID예요');
    if (!f.name_ko.trim()) return toast('제품명(한국어)을 입력해 주세요');
    const mins = [...form.querySelectorAll('[name="tmin"]')].map(i => parseInt(i.value, 10));
    const prices = [...form.querySelectorAll('[name="tprice"]')].map(i => parseInt(i.value, 10));
    let tiers = mins.map((m, i) => ({ min: m, price: prices[i] })).filter(x => x.min > 0 && x.price >= 0);
    tiers.sort((a, b) => a.min - b.min);
    tiers = tiers.filter((x, i) => i === 0 || x.min !== tiers[i - 1].min);
    if (!tiers.length) return toast('가격 구간을 하나 이상 입력해 주세요');
    const old = find(id) || {};
    const p = {
      ...old, id, icon: f.icon || 'box', color: f.color, images: f.images.split(',').map(x => x.trim()).filter(Boolean), category: f.category,
      name: { ko: f.name_ko.trim(), vi: f.name_vi.trim() }, desc: { ko: f.desc_ko.trim(), vi: f.desc_vi.trim() },
      perBox: Math.max(1, parseInt(f.perBox, 10) || 1), moq: tiers[0].min, tiers,
      stock: f.stock, restock: f.restock, origin: { ko: f.origin_ko.trim(), vi: f.origin_vi.trim() },
      size: f.size.trim(), weight: f.weight.trim()
    };
    const list = S.catalog.products;
    const i = list.findIndex(x => x.id === id);
    if (i >= 0) list[i] = p; else list.push(p);
    API.saveCatalog(S.catalog);
    S.qtyFor = null;
    toast('저장했어요');
    location.hash = '#/admin';
  }

  function exportCatalog() {
    const blob = new Blob([JSON.stringify(S.catalog, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'products.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ── 라우터 ───────────────────────────────────────────
  function route(keepScroll) {
    const y = window.scrollY;
    const parts = (location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean);
    let html, tab = 'home';
    switch (parts[0]) {
      case 'p': html = Detail(decodeURIComponent(parts[1] || '')); break;
      case 'cart': html = Cart(); tab = 'cart'; break;
      case 'done': html = Done(parts[1]); tab = 'cart'; break;
      case 'orders': html = Orders(); tab = 'orders'; break;
      case 'login': html = Login(); tab = 'account'; break;
      case 'account': html = Account(); tab = 'account'; break;
      case 'admin': html = Admin(parts[1] && decodeURIComponent(parts[1])); tab = 'account'; break;
      default: html = Home();
    }
    view.innerHTML = html;
    document.body.classList.toggle('detail-mode', parts[0] === 'p');
    const g = $('#gallery');
    if (g) g.addEventListener('scroll', () => {
      const i = Math.round(g.scrollLeft / g.clientWidth);
      document.querySelectorAll('#dots i').forEach((d, k) => d.classList.toggle('on', k === i));
    }, { passive: true });
    renderNav(tab);
    window.scrollTo(0, keepScroll === true ? y : 0);
  }
  const rerender = () => route(true);

  function renderNav(tab) {
    const n = S.cart.length;
    const items = [
      ['home', '#/', 'home', t('nav_home')],
      ['cart', '#/cart', 'receipt', t('nav_cart')],
      ['orders', '#/orders', 'list', t('nav_orders')],
      ['account', '#/account', 'user', t('nav_account')]
    ];
    $('#tabbar').innerHTML = items.map(([k, href, ic, label]) => `
      <a href="${href}" class="${k === tab ? 'on' : ''}"><span class="ic">${icon(ic)}${k === 'cart' && n ? `<i class="dot">${n}</i>` : ''}</span><span>${label}</span></a>`).join('');
    $('#langBtn').textContent = S.lang.toUpperCase();
  }

  function setLang(l) {
    S.lang = l;
    Store.set('js.lang', l);
    document.documentElement.lang = l;
    rerender();
  }

  // ── 이벤트 ───────────────────────────────────────────
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const { act, k, id } = b.dataset;
    switch (act) {
      case 'lang': setLang(S.lang === 'ko' ? 'vi' : 'ko'); break;
      case 'demo':
        S.user = await API.login(S.lang === 'vi' ? 'Đối tác demo' : '데모 거래처', 'DEMO');
        toast(t('welcome', { c: S.user.company })); rerender();
        break;
      case 'jump': {
        const el = document.getElementById(k);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 118, behavior: 'smooth' });
        document.querySelectorAll('.dtabs button').forEach(x => x.classList.toggle('on', x === b));
        break;
      }
      case 'setlang': setLang(k); break;
      case 'cat': S.cat = k; rerender(); break;
      case 'dec':
      case 'inc': {
        const d = act === 'inc' ? 1 : -1;
        if (k === 'qty') setDetailQty(S.qty + d);
        else { const it = S.cart.find(x => x.id === id); if (it) setCartQty(id, it.qty + d); }
        break;
      }
      case 'add': {
        const it = S.cart.find(x => x.id === id);
        if (it) it.qty += S.qty; else S.cart.push({ id, qty: S.qty });
        saveCart(); renderNav('home'); toast(t('added'));
        break;
      }
      case 'rm': S.cart = S.cart.filter(x => x.id !== id); saveCart(); rerender(); break;
      case 'copy': {
        const text = requestText(API.getRequest(id));
        try { await navigator.clipboard.writeText(text); }
        catch (err) {
          const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
          ta.select(); try { document.execCommand('copy'); } catch (e2) { /* ignore */ } ta.remove();
        }
        toast(t('copied'));
        break;
      }
      case 'reorder': {
        const r = API.getRequest(id);
        r.items.forEach(i => {
          if (!find(i.id)) return;
          const it = S.cart.find(x => x.id === i.id);
          if (it) it.qty += i.qty; else S.cart.push({ id: i.id, qty: i.qty });
        });
        saveCart(); toast(t('reordered')); location.hash = '#/cart';
        break;
      }
      case 'logout': API.logout(); S.user = null; rerender(); break;
      case 'install':
        if (S.installEvt) { S.installEvt.prompt(); S.installEvt = null; }
        break;
      case 'adminout': S.admin = false; location.hash = '#/account'; break;
      case 'export': exportCatalog(); break;
      case 'copyjson':
        try { await navigator.clipboard.writeText(JSON.stringify(S.catalog, null, 2)); toast('복사했어요 — GitHub의 products.json에 붙여넣으세요'); }
        catch (err) { toast('복사가 안 되는 환경이에요. 내보내기를 써 주세요'); }
        break;
      case 'reset':
        if (confirmTap(b)) {
          API.resetCatalog(); S.catalog = await API.loadOriginalCatalog(); S.qtyFor = null; rerender(); toast('되돌렸어요');
        }
        break;
      case 'addtier': {
        const last = [...document.querySelectorAll('#tierlist .tier-row')].pop();
        const nextMin = last ? (parseInt(last.querySelector('[name="tmin"]').value, 10) || 0) * 2 || 1 : 1;
        $('#tierlist').insertAdjacentHTML('beforeend', `<div class="tier-row"><input type="number" name="tmin" min="1" value="${nextMin}" placeholder="박스 이상">
          <input type="number" name="tprice" min="0" step="100" value="" placeholder="박스당 가격"><button type="button" class="link danger" data-act="deltier">삭제</button></div>`);
        break;
      }
      case 'deltier':
        if (document.querySelectorAll('#tierlist .tier-row').length > 1) b.closest('.tier-row').remove();
        else toast('구간은 최소 1개가 필요해요');
        break;
      case 'delprod':
        if (confirmTap(b)) {
          S.catalog.products = S.catalog.products.filter(p => p.id !== id);
          S.cart = S.cart.filter(x => x.id !== id); saveCart();
          API.saveCatalog(S.catalog); location.hash = '#/admin'; toast('삭제했어요');
        }
        break;
    }
  });

  document.addEventListener('change', e => {
    const el = e.target;
    if (el.name === 'icon') {
      document.querySelectorAll('.iconpick label').forEach(l => l.classList.toggle('on', l.contains(el)));
      return;
    }
    if (!el.matches('.stepper input')) return;
    if (el.dataset.k === 'qty') setDetailQty(el.value);
    else setCartQty(el.dataset.id, el.value);
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'q') { S.q = e.target.value; $('#grid').innerHTML = Grid(); }
  });

  document.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const fid = form.getAttribute('id'); // form.id 대신 (name="id" 입력칸과 충돌 방지)
    if (fid === 'reqform') submitRequest(form);
    else if (fid === 'loginform') {
      const f = Object.fromEntries(new FormData(form).entries());
      try {
        S.user = await API.login(f.company, f.code);
        toast(t('welcome', { c: S.user.company }));
        location.hash = '#/';
      } catch (err) { toast(t('login_fail')); }
    } else if (fid === 'adminlogin') {
      if (API.checkAdminPin(new FormData(form).get('pin'))) { S.admin = true; rerender(); }
      else toast('PIN이 맞지 않아요');
    } else if (fid === 'editform') saveProduct(form);
  });

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; });

  // ── 시작 ─────────────────────────────────────────────
  async function init() {
    document.documentElement.lang = S.lang;
    try { S.catalog = await API.loadCatalog(); }
    catch (err) { view.innerHTML = '<p class="empty">데이터를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>'; return; }
    $('#brandName').textContent = S.catalog.company.name;
    window.addEventListener('hashchange', () => route());
    route();
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (err) { /* ignore */ }
    }
  }
  init();
})();
