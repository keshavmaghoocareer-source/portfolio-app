// ─── Global State ─────────────────────────────────────────────────────────────
const State = {
  user: null,
  page: 'dashboard',
  clients: [],
  portfolios: [],
  selectedClient: null,
  selectedPortfolio: null,
  charts: {}
};

// ─── API Helper ───────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch('/api' + path, opts);
  return r.json();
}
const GET = (p) => api('GET', p);
const POST = (p, b) => api('POST', p, b);
const PUT = (p, b) => api('PUT', p, b);
const DEL = (p) => api('DELETE', p);

// ─── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `show ${type}`;
  setTimeout(() => t.className = '', 2500);
}

// ─── Format helpers ───────────────────────────────────────────────────────────
const fmt = {
  usd: v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0),
  pct: v => (v !== undefined && v !== null) ? (parseFloat(v) >= 0 ? '+' : '') + parseFloat(v).toFixed(2) + '%' : '—',
  pctAbs: v => parseFloat(v || 0).toFixed(2) + '%',
  num: v => new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(v || 0),
  date: d => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—',
  ratio: v => parseFloat(v || 0).toFixed(3),
  pnlClass: v => parseFloat(v) >= 0 ? 'pos' : 'neg',
};

function colorPnL(val) {
  const n = parseFloat(val);
  return `<span class="${n >= 0 ? 'pos' : 'neg'}">${fmt.usd(n)}</span>`;
}
function colorPct(val) {
  const n = parseFloat(val);
  return `<span class="${n >= 0 ? 'pos' : 'neg'}">${fmt.pct(n)}</span>`;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const icons = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  clients: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  portfolio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`,
  performance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  risk: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  allocation: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v10l6 3"/></svg>`,
  transactions: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  factor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  alternatives: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
};

// ─── App Bootstrap ────────────────────────────────────────────────────────────
async function init() {
  document.getElementById('app').innerHTML = `<div id="toast"></div>`;
  try {
    const user = await GET('/auth/me');
    if (user && user.name) {
      State.user = user;
      await loadGlobalData();
      renderApp();
    } else {
      renderLogin();
    }
  } catch (e) { renderLogin(); }
}

async function loadGlobalData() {
  [State.clients, State.portfolios] = await Promise.all([GET('/clients'), GET('/portfolios')]);
}

// ─── Login ────────────────────────────────────────────────────────────────────
function renderLogin() {
  document.getElementById('app').innerHTML = `
  <div id="login-screen">
    <div class="login-card">
      <div class="login-logo">
        <div class="login-icon"><svg viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
        <h1>Portfolio Manager</h1>
        <p>Professional Investment Management</p>
      </div>
      <div id="login-error" class="alert alert-danger" style="display:none"></div>
      <div class="form-group"><label>Username</label><input id="usr" type="text" placeholder="Enter username" autocomplete="username"/></div>
      <div class="form-group"><label>Password</label><input id="pwd" type="password" placeholder="Enter password" autocomplete="current-password"/></div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px" onclick="doLogin()">Sign In</button>
      <p class="text-muted" style="text-align:center;margin-top:16px">Default: admin / admin123</p>
    </div>
  </div><div id="toast"></div>`;
  document.getElementById('pwd').addEventListener('keydown', e => e.key === 'Enter' && doLogin());
}

async function doLogin() {
  const username = document.getElementById('usr').value.trim();
  const password = document.getElementById('pwd').value;
  if (!username || !password) return;
  const r = await POST('/auth/login', { username, password });
  if (r.success) {
    State.user = r.user;
    await loadGlobalData();
    renderApp();
  } else {
    const el = document.getElementById('login-error');
    el.textContent = r.error || 'Login failed'; el.style.display = 'block';
  }
}

// ─── Main App Shell ───────────────────────────────────────────────────────────
function renderApp() {
  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', section: 'Overview' },
    { id: 'clients', label: 'Clients', icon: 'clients', section: 'Management' },
    { id: 'holdings', label: 'Portfolio Tracking', icon: 'portfolio', section: 'Management' },
    { id: 'transactions', label: 'Transactions', icon: 'transactions', section: 'Management' },
    { id: 'performance', label: 'Performance', icon: 'performance', section: 'Analytics' },
    { id: 'risk', label: 'Risk Analytics', icon: 'risk', section: 'Analytics' },
    { id: 'allocation', label: 'Allocation & Rebalancing', icon: 'allocation', section: 'Analytics' },
    { id: 'factor', label: 'Factor Analysis', icon: 'factor', section: 'Analytics' },
    { id: 'alternatives', label: 'Alternative Assets', icon: 'alternatives', section: 'Analytics' },
    { id: 'users', label: 'Team', icon: 'users', section: 'Settings' },
  ];

  const sections = [...new Set(nav.map(n => n.section))];
  const navHtml = sections.map(sec => `
    <div class="nav-section">
      <div class="nav-section-label">${sec}</div>
      ${nav.filter(n => n.section === sec).map(n => `
        <div class="nav-item${State.page === n.id ? ' active' : ''}" onclick="navigate('${n.id}')">
          ${icons[n.icon]} ${n.label}
        </div>`).join('')}
    </div>`).join('');

  document.getElementById('app').innerHTML = `
  <div id="main-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>PORTFOLIO MANAGER</h2>
        <p>Investment Management System</p>
      </div>
      <nav class="sidebar-nav">${navHtml}</nav>
      <div class="sidebar-footer">
        <div class="user-info"><p>${State.user.name}</p><span>${State.user.role}</span></div>
        <div class="nav-item" onclick="doLogout()">${icons.logout} Sign Out</div>
      </div>
    </aside>
    <div class="content-area">
      <div class="topbar">
        <div class="topbar-title" id="page-title">Dashboard</div>
        <div class="topbar-actions" id="topbar-actions"></div>
      </div>
      <div class="page" id="page-content"><div class="loading">Loading...</div></div>
    </div>
  </div>
  <div id="toast"></div>`;

  loadPage(State.page);
}

function navigate(page) {
  State.page = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => { if (el.textContent.trim().startsWith(navLabelFor(page))) el.classList.add('active'); });
  loadPage(page);
}

function navLabelFor(page) {
  const map = { dashboard: 'Dashboard', clients: 'Clients', holdings: 'Portfolio', transactions: 'Trans', performance: 'Perf', risk: 'Risk', allocation: 'Alloc', factor: 'Factor', alternatives: 'Alt', users: 'Team' };
  return map[page] || '';
}

async function doLogout() {
  await POST('/auth/logout');
  State.user = null;
  renderLogin();
}

function loadPage(page) {
  const titles = { dashboard: 'Dashboard', clients: 'Clients', holdings: 'Portfolio Tracking', transactions: 'Transaction Management', performance: 'Performance Measurement', risk: 'Risk Analytics', allocation: 'Asset Allocation & Rebalancing', factor: 'Factor Analysis', alternatives: 'Alternative Assets', users: 'Team Management' };
  document.getElementById('page-title').textContent = titles[page] || page;
  document.getElementById('topbar-actions').innerHTML = '';
  // Destroy old charts
  Object.values(State.charts).forEach(c => { try { c.destroy(); } catch(e) {} });
  State.charts = {};
  const pages = { dashboard: pageDashboard, clients: pageClients, holdings: pageHoldings, transactions: pageTransactions, performance: pagePerformance, risk: pageRisk, allocation: pageAllocation, factor: pageFactor, alternatives: pageAlternatives, users: pageUsers };
  if (pages[page]) pages[page]();
}
