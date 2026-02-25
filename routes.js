const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');
const analytics = require('./analytics');
const axios = require('axios');

const router = express.Router();

// ─── Auth middleware ─────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

// ─── Auth routes ─────────────────────────────────────────────────────────────
router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await db.findOne(db.users, { username });
    if (!user) return res.json({ success: false, error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, error: 'Invalid credentials' });
    req.session.userId = user._id;
    req.session.user = { name: user.name, role: user.role, username: user.username };
    res.json({ success: true, user: req.session.user });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.post('/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

router.get('/auth/me', requireAuth, (req, res) => {
  res.json(req.session.user);
});

// ─── Users (admin only) ──────────────────────────────────────────────────────
router.get('/users', requireAuth, async (req, res) => {
  const users = await db.find(db.users, {});
  res.json(users.map(u => ({ _id: u._id, username: u.username, name: u.name, role: u.role })));
});

router.post('/users', requireAuth, async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    const existing = await db.findOne(db.users, { username });
    if (existing) return res.json({ success: false, error: 'Username already exists' });
    const hash = await bcrypt.hash(password, 10);
    const user = await db.insert(db.users, { username, password: hash, name, role: role || 'user', createdAt: new Date() });
    res.json({ success: true, user: { _id: user._id, username, name, role } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.delete('/users/:id', requireAuth, async (req, res) => {
  await db.remove(db.users, { _id: req.params.id });
  res.json({ success: true });
});

// ─── Clients ─────────────────────────────────────────────────────────────────
router.get('/clients', requireAuth, async (req, res) => {
  const clients = await db.find(db.clients, {});
  res.json(clients);
});

router.post('/clients', requireAuth, async (req, res) => {
  try {
    const client = await db.insert(db.clients, { ...req.body, createdAt: new Date() });
    res.json({ success: true, client });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.put('/clients/:id', requireAuth, async (req, res) => {
  await db.update(db.clients, { _id: req.params.id }, { $set: req.body });
  res.json({ success: true });
});

router.delete('/clients/:id', requireAuth, async (req, res) => {
  await db.remove(db.clients, { _id: req.params.id });
  await db.remove(db.portfolios, { clientId: req.params.id }, { multi: true });
  res.json({ success: true });
});

// ─── Portfolios ───────────────────────────────────────────────────────────────
router.get('/portfolios', requireAuth, async (req, res) => {
  const query = req.query.clientId ? { clientId: req.query.clientId } : {};
  const portfolios = await db.find(db.portfolios, query);
  res.json(portfolios);
});

router.post('/portfolios', requireAuth, async (req, res) => {
  try {
    const portfolio = await db.insert(db.portfolios, { ...req.body, createdAt: new Date() });
    res.json({ success: true, portfolio });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.delete('/portfolios/:id', requireAuth, async (req, res) => {
  await db.remove(db.portfolios, { _id: req.params.id });
  await db.remove(db.holdings, { portfolioId: req.params.id }, { multi: true });
  res.json({ success: true });
});

// ─── Holdings ─────────────────────────────────────────────────────────────────
router.get('/holdings', requireAuth, async (req, res) => {
  const query = req.query.portfolioId ? { portfolioId: req.query.portfolioId } : {};
  const holdings = await db.find(db.holdings, query);
  res.json(holdings);
});

router.post('/holdings', requireAuth, async (req, res) => {
  try {
    const holding = await db.insert(db.holdings, { ...req.body, createdAt: new Date() });
    res.json({ success: true, holding });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.put('/holdings/:id', requireAuth, async (req, res) => {
  await db.update(db.holdings, { _id: req.params.id }, { $set: req.body });
  res.json({ success: true });
});

router.delete('/holdings/:id', requireAuth, async (req, res) => {
  await db.remove(db.holdings, { _id: req.params.id });
  res.json({ success: true });
});

// ─── Transactions ────────────────────────────────────────────────────────────
router.get('/transactions', requireAuth, async (req, res) => {
  const query = req.query.portfolioId ? { portfolioId: req.query.portfolioId } : {};
  const txns = await db.find(db.transactions, query);
  txns.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(txns);
});

router.post('/transactions', requireAuth, async (req, res) => {
  try {
    const txn = await db.insert(db.transactions, { ...req.body, createdAt: new Date() });
    // Auto-update holding quantity if buy/sell
    if (['buy', 'sell'].includes(req.body.type)) {
      const holding = await db.findOne(db.holdings, { portfolioId: req.body.portfolioId, ticker: req.body.ticker });
      const qty = parseFloat(req.body.quantity) || 0;
      const price = parseFloat(req.body.price) || 0;
      if (holding) {
        const newQty = req.body.type === 'buy' ? holding.quantity + qty : holding.quantity - qty;
        const newCost = req.body.type === 'buy' ? ((holding.costBasis * holding.quantity) + (price * qty)) / (holding.quantity + qty) : holding.costBasis;
        await db.update(db.holdings, { _id: holding._id }, { $set: { quantity: newQty, costBasis: newCost } });
      } else if (req.body.type === 'buy') {
        await db.insert(db.holdings, {
          portfolioId: req.body.portfolioId, ticker: req.body.ticker, name: req.body.name || req.body.ticker,
          assetClass: req.body.assetClass || 'Equity', sector: req.body.sector || '', geography: req.body.geography || '',
          currency: req.body.currency || 'USD', quantity: qty, costBasis: price,
          currentPrice: price, marketValue: qty * price, createdAt: new Date()
        });
      }
    }
    res.json({ success: true, txn });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.delete('/transactions/:id', requireAuth, async (req, res) => {
  await db.remove(db.transactions, { _id: req.params.id });
  res.json({ success: true });
});

// ─── Prices (manual update) ──────────────────────────────────────────────────
router.post('/prices/update', requireAuth, async (req, res) => {
  try {
    const { portfolioId, prices } = req.body; // prices: [{ticker, price}]
    for (const p of prices) {
      const holding = await db.findOne(db.holdings, { portfolioId, ticker: p.ticker });
      if (holding) {
        const marketValue = holding.quantity * p.price;
        await db.update(db.holdings, { _id: holding._id }, { $set: { currentPrice: p.price, marketValue, lastUpdated: new Date() } });
        // Save price history
        await db.insert(db.prices, { portfolioId, ticker: p.ticker, price: p.price, date: new Date() });
      }
    }
    res.json({ success: true });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ─── Price history for a ticker ──────────────────────────────────────────────
router.get('/prices/:portfolioId/:ticker', requireAuth, async (req, res) => {
  const prices = await db.find(db.prices, { portfolioId: req.params.portfolioId, ticker: req.params.ticker });
  prices.sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(prices);
});

// ─── Analytics: Portfolio Summary ────────────────────────────────────────────
router.get('/analytics/summary/:portfolioId', requireAuth, async (req, res) => {
  try {
    const holdings = await db.find(db.holdings, { portfolioId: req.params.portfolioId });
    const totalValue = holdings.reduce((s, h) => s + (h.marketValue || 0), 0);
    const totalCost = holdings.reduce((s, h) => s + ((h.costBasis || 0) * (h.quantity || 0)), 0);
    const unrealisedPnL = totalValue - totalCost;
    const unrealisedPnLPct = totalCost > 0 ? (unrealisedPnL / totalCost * 100) : 0;

    // Asset class breakdown
    const byClass = {};
    for (const h of holdings) {
      const cls = h.assetClass || 'Unknown';
      byClass[cls] = (byClass[cls] || 0) + (h.marketValue || 0);
    }
    const allocation = Object.entries(byClass).map(([name, value]) => ({
      name, value, pct: totalValue > 0 ? (value / totalValue * 100).toFixed(1) : 0
    }));

    // Factor decomposition
    const factors = analytics.factorDecompose(holdings);

    res.json({ totalValue, totalCost, unrealisedPnL, unrealisedPnLPct, allocation, factors, holdingsCount: holdings.length });
  } catch (e) { res.json({ error: e.message }); }
});

// ─── Analytics: Performance ──────────────────────────────────────────────────
router.get('/analytics/performance/:portfolioId', requireAuth, async (req, res) => {
  try {
    const snapshots = await db.find(db.snapshots, { portfolioId: req.params.portfolioId });
    snapshots.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (snapshots.length < 2) {
      return res.json({ twr: 0, mwr: 0, annualisedReturn: 0, volatility: 0, sharpe: 0, sortino: 0, maxDrawdown: 0, history: snapshots });
    }

    const values = snapshots.map(s => s.totalValue);
    const dailyReturns = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] > 0) dailyReturns.push((values[i] - values[i - 1]) / values[i - 1] * 100);
    }

    const days = (new Date(snapshots[snapshots.length - 1].date) - new Date(snapshots[0].date)) / 86400000;
    const simpleReturn = values[0] > 0 ? (values[values.length - 1] - values[0]) / values[0] * 100 : 0;
    const annualised = analytics.annualise(simpleReturn, days);
    const vol = analytics.calcVolatility(dailyReturns);
    const sharpe = analytics.calcSharpe(annualised, vol);
    const sortino = analytics.calcSortino(dailyReturns, annualised);
    const maxDD = analytics.calcMaxDrawdown(values);

    res.json({ twr: simpleReturn, mwr: simpleReturn, annualisedReturn: annualised, volatility: vol, sharpe, sortino, maxDrawdown: maxDD, history: snapshots });
  } catch (e) { res.json({ error: e.message }); }
});

// ─── Analytics: Risk ─────────────────────────────────────────────────────────
router.get('/analytics/risk/:portfolioId', requireAuth, async (req, res) => {
  try {
    const holdings = await db.find(db.holdings, { portfolioId: req.params.portfolioId });
    const snapshots = await db.find(db.snapshots, { portfolioId: req.params.portfolioId });
    snapshots.sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalValue = holdings.reduce((s, h) => s + (h.marketValue || 0), 0);
    const values = snapshots.map(s => s.totalValue);
    const dailyReturns = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] > 0) dailyReturns.push((values[i] - values[i - 1]) / values[i - 1] * 100);
    }

    const var95 = analytics.calcVaR(dailyReturns, totalValue, 0.95);
    const var99 = analytics.calcVaR(dailyReturns, totalValue, 0.99);
    const vol = analytics.calcVolatility(dailyReturns);
    const maxDD = analytics.calcMaxDrawdown(values);

    // Concentration risk
    const sorted = [...holdings].sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0));
    const top5 = sorted.slice(0, 5).map(h => ({ name: h.name || h.ticker, value: h.marketValue, pct: totalValue > 0 ? (h.marketValue / totalValue * 100).toFixed(1) : 0 }));
    const top1Conc = sorted[0] ? (sorted[0].marketValue / totalValue * 100) : 0;

    res.json({ var95, var99, volatility: vol, maxDrawdown: maxDD, top5Positions: top5, concentrationRisk: top1Conc, totalValue });
  } catch (e) { res.json({ error: e.message }); }
});

// ─── Asset Allocation Targets ─────────────────────────────────────────────────
router.get('/allocations/:portfolioId', requireAuth, async (req, res) => {
  const alloc = await db.findOne(db.allocations, { portfolioId: req.params.portfolioId });
  res.json(alloc || { portfolioId: req.params.portfolioId, targets: {} });
});

router.post('/allocations/:portfolioId', requireAuth, async (req, res) => {
  try {
    const existing = await db.findOne(db.allocations, { portfolioId: req.params.portfolioId });
    if (existing) {
      await db.update(db.allocations, { _id: existing._id }, { $set: { targets: req.body.targets, updatedAt: new Date() } });
    } else {
      await db.insert(db.allocations, { portfolioId: req.params.portfolioId, targets: req.body.targets, createdAt: new Date() });
    }
    res.json({ success: true });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ─── Rebalancing suggestions ──────────────────────────────────────────────────
router.get('/rebalance/:portfolioId', requireAuth, async (req, res) => {
  try {
    const holdings = await db.find(db.holdings, { portfolioId: req.params.portfolioId });
    const alloc = await db.findOne(db.allocations, { portfolioId: req.params.portfolioId });
    const totalValue = holdings.reduce((s, h) => s + (h.marketValue || 0), 0);

    const current = {};
    for (const h of holdings) {
      const cls = h.assetClass || 'Unknown';
      current[cls] = (current[cls] || 0) + (h.marketValue || 0);
    }
    const currentPct = {};
    for (const cls in current) currentPct[cls] = totalValue > 0 ? (current[cls] / totalValue * 100) : 0;

    const targets = alloc ? alloc.targets : {};
    const drift = analytics.calcDrift(currentPct, targets);

    const suggestions = drift.filter(d => d.needsRebalance).map(d => ({
      assetClass: d.assetClass,
      currentPct: d.current.toFixed(1),
      targetPct: d.target,
      drift: d.drift.toFixed(1),
      action: d.drift > 0 ? 'Reduce' : 'Increase',
      amount: Math.abs(d.drift / 100 * totalValue).toFixed(2)
    }));

    res.json({ drift, suggestions, totalValue });
  } catch (e) { res.json({ error: e.message }); }
});

// ─── Snapshots (for performance tracking) ────────────────────────────────────
router.post('/snapshots', requireAuth, async (req, res) => {
  try {
    const { portfolioId } = req.body;
    const holdings = await db.find(db.holdings, { portfolioId });
    const totalValue = holdings.reduce((s, h) => s + (h.marketValue || 0), 0);
    const snap = await db.insert(db.snapshots, { portfolioId, totalValue, date: new Date() });
    res.json({ success: true, snap });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ─── Alternative Assets ───────────────────────────────────────────────────────
router.get('/alternatives', requireAuth, async (req, res) => {
  const query = req.query.portfolioId ? { portfolioId: req.query.portfolioId } : {};
  const alts = await db.find(db.alternatives, query);
  res.json(alts);
});

router.post('/alternatives', requireAuth, async (req, res) => {
  try {
    const alt = await db.insert(db.alternatives, { ...req.body, createdAt: new Date() });
    res.json({ success: true, alt });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.put('/alternatives/:id', requireAuth, async (req, res) => {
  await db.update(db.alternatives, { _id: req.params.id }, { $set: req.body });
  res.json({ success: true });
});

router.delete('/alternatives/:id', requireAuth, async (req, res) => {
  await db.remove(db.alternatives, { _id: req.params.id });
  res.json({ success: true });
});

// ─── Dashboard overview (all clients) ─────────────────────────────────────────
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const clients = await db.find(db.clients, {});
    const portfolios = await db.find(db.portfolios, {});
    const holdings = await db.find(db.holdings, {});
    const alternatives = await db.find(db.alternatives, {});

    const totalAUM = holdings.reduce((s, h) => s + (h.marketValue || 0), 0) +
                     alternatives.reduce((s, a) => s + (parseFloat(a.currentNAV) || 0), 0);

    const clientSummaries = clients.map(c => {
      const cPortfolios = portfolios.filter(p => p.clientId === c._id);
      const cHoldings = holdings.filter(h => cPortfolios.some(p => p._id === h.portfolioId));
      const cAlts = alternatives.filter(a => cPortfolios.some(p => p._id === a.portfolioId));
      const value = cHoldings.reduce((s, h) => s + (h.marketValue || 0), 0) +
                    cAlts.reduce((s, a) => s + (parseFloat(a.currentNAV) || 0), 0);
      return { _id: c._id, name: c.name, value, portfolios: cPortfolios.length };
    });

    res.json({ totalAUM, clientCount: clients.length, portfolioCount: portfolios.length, clientSummaries });
  } catch (e) { res.json({ error: e.message }); }
});

module.exports = router;
