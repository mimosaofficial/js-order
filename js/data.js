// ─────────────────────────────────────────────────────────────
// 데이터 계층 (API)
// 화면 코드(app.js)는 이 파일의 API만 사용합니다.
// 나중에 실제 서버(Supabase, Firebase 등)를 붙일 때는 이 파일만 바꾸면
// 웹·안드로이드·아이폰 앱이 모두 그대로 동작합니다.
// ─────────────────────────────────────────────────────────────

// 기기 저장소 (저장소를 못 쓰는 환경에서는 메모리에 보관)
const Store = (() => {
  const mem = {};
  return {
    get(k, d) {
      try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }
      catch (e) { return k in mem ? mem[k] : d; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); }
      catch (e) { mem[k] = v; }
    },
    del(k) {
      try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
      delete mem[k];
    }
  };
})();

const API = {
  // 제품 목록 — 지금은 data/products.json, 나중엔 서버
  async loadOriginalCatalog() {
    const res = await fetch('data/products.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('catalog ' + res.status);
    return res.json();
  },
  async loadCatalog() {
    const local = Store.get('js.adminCatalog', null); // 관리자 화면에서 이 기기에 저장한 수정본
    return local || this.loadOriginalCatalog();
  },
  saveCatalog(catalog) { Store.set('js.adminCatalog', catalog); },
  resetCatalog() { Store.del('js.adminCatalog'); },
  hasLocalCatalog() { return !!Store.get('js.adminCatalog', null); },

  // 거래처 로그인 — 지금은 데모 코드, 나중엔 서버 인증
  async login(company, code) {
    if (String(code).trim().toUpperCase() !== 'DEMO') throw new Error('login_fail');
    const user = { company: String(company).trim() || '데모 거래처', grade: 'A' };
    Store.set('js.user', user);
    return user;
  },
  currentUser() { return Store.get('js.user', null); },
  updateUser(patch) {
    const u = { ...(this.currentUser() || {}), ...patch };
    Store.set('js.user', u);
    return u;
  },
  logout() { Store.del('js.user'); },

  // 견적·주문 요청 — 지금은 이 기기에만 저장, 나중엔 서버로 전송 + 알림
  async submitRequest(req) {
    const list = Store.get('js.requests', []);
    const now = new Date();
    const id = 'Q' + now.toISOString().slice(2, 10).replace(/-/g, '') + '-' + String(now.getTime()).slice(-4);
    const saved = { ...req, id, createdAt: now.toISOString(), status: 'received' };
    list.unshift(saved);
    Store.set('js.requests', list);
    return saved;
  },
  listRequests() { return Store.get('js.requests', []); },
  getRequest(id) { return this.listRequests().find(r => r.id === id) || null; },

  // 관리자 PIN — 데모용. 실제 서비스에서는 서버 인증으로 바꿔야 합니다.
  checkAdminPin(pin) { return String(pin).trim() === '0000'; }
};
