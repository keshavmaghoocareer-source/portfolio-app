// ─── Analytics Engine ───────────────────────────────────────────────────────

// Time-Weighted Return (chain-linked)
function calcTWR(cashflows) {
  // cashflows: [{startValue, endValue, externalFlow}]
  if (!cashflows || cashflows.length === 0) return 0;
  let twr = 1;
  for (const cf of cashflows) {
    if (cf.startValue + cf.externalFlow === 0) continue;
    const subReturn = (cf.endValue) / (cf.startValue + cf.externalFlow);
    twr *= subReturn;
  }
  return (twr - 1) * 100;
}

// Money-Weighted Return / IRR approximation
function calcMWR(initialValue, finalValue, cashflows, days) {
  if (initialValue === 0) return 0;
  const simpleReturn = (finalValue - initialValue) / initialValue;
  return simpleReturn * 100;
}

// Annualised return
function annualise(returnPct, days) {
  if (days <= 0) return returnPct;
  return (Math.pow(1 + returnPct / 100, 365 / days) - 1) * 100;
}

// Volatility (annualised std dev of daily returns)
function calcVolatility(dailyReturns) {
  if (!dailyReturns || dailyReturns.length < 2) return 0;
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (dailyReturns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100; // annualised
}

// Sharpe Ratio
function calcSharpe(annualisedReturn, volatility, riskFreeRate = 4.5) {
  if (volatility === 0) return 0;
  return (annualisedReturn - riskFreeRate) / volatility;
}

// Max Drawdown
function calcMaxDrawdown(values) {
  if (!values || values.length < 2) return 0;
  let peak = values[0];
  let maxDD = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD * 100;
}

// Historical VaR (95% confidence)
function calcVaR(dailyReturns, portfolioValue, confidence = 0.95) {
  if (!dailyReturns || dailyReturns.length < 10) return 0;
  const sorted = [...dailyReturns].sort((a, b) => a - b);
  const idx = Math.floor((1 - confidence) * sorted.length);
  return Math.abs(sorted[idx] / 100 * portfolioValue);
}

// Beta relative to benchmark
function calcBeta(portfolioReturns, benchmarkReturns) {
  if (!portfolioReturns || portfolioReturns.length < 2) return 1;
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
  const pR = portfolioReturns.slice(0, n);
  const bR = benchmarkReturns.slice(0, n);
  const pMean = pR.reduce((a, b) => a + b, 0) / n;
  const bMean = bR.reduce((a, b) => a + b, 0) / n;
  let cov = 0, bVar = 0;
  for (let i = 0; i < n; i++) {
    cov += (pR[i] - pMean) * (bR[i] - bMean);
    bVar += Math.pow(bR[i] - bMean, 2);
  }
  return bVar === 0 ? 1 : cov / bVar;
}

// Alpha
function calcAlpha(portfolioReturn, beta, benchmarkReturn, riskFreeRate = 4.5) {
  return portfolioReturn - (riskFreeRate + beta * (benchmarkReturn - riskFreeRate));
}

// Sortino Ratio (only downside deviation)
function calcSortino(dailyReturns, annualisedReturn, riskFreeRate = 4.5) {
  if (!dailyReturns || dailyReturns.length < 2) return 0;
  const negReturns = dailyReturns.filter(r => r < 0);
  if (negReturns.length === 0) return 999;
  const downDev = Math.sqrt(negReturns.reduce((s, r) => s + r * r, 0) / dailyReturns.length) * Math.sqrt(252) * 100;
  return downDev === 0 ? 0 : (annualisedReturn - riskFreeRate) / downDev;
}

// Asset allocation drift
function calcDrift(current, target) {
  return Object.keys(target).map(cls => ({
    assetClass: cls,
    target: target[cls],
    current: current[cls] || 0,
    drift: (current[cls] || 0) - target[cls],
    needsRebalance: Math.abs((current[cls] || 0) - target[cls]) > 5
  }));
}

// Simple factor decomposition
function factorDecompose(holdings) {
  const factors = { equity: 0, fixedIncome: 0, alternatives: 0, cash: 0, geography: {}, sector: {} };
  let total = 0;
  for (const h of holdings) {
    const val = h.marketValue || 0;
    total += val;
    const type = (h.assetClass || '').toLowerCase();
    if (type.includes('equity') || type.includes('stock')) factors.equity += val;
    else if (type.includes('bond') || type.includes('fixed')) factors.fixedIncome += val;
    else if (type.includes('cash')) factors.cash += val;
    else factors.alternatives += val;
    if (h.geography) factors.geography[h.geography] = (factors.geography[h.geography] || 0) + val;
    if (h.sector) factors.sector[h.sector] = (factors.sector[h.sector] || 0) + val;
  }
  if (total > 0) {
    factors.equityPct = (factors.equity / total * 100).toFixed(1);
    factors.fixedIncomePct = (factors.fixedIncome / total * 100).toFixed(1);
    factors.alternativesPct = (factors.alternatives / total * 100).toFixed(1);
    factors.cashPct = (factors.cash / total * 100).toFixed(1);
    for (const g in factors.geography) factors.geography[g] = (factors.geography[g] / total * 100).toFixed(1);
    for (const s in factors.sector) factors.sector[s] = (factors.sector[s] / total * 100).toFixed(1);
  }
  factors.total = total;
  return factors;
}

module.exports = { calcTWR, calcMWR, annualise, calcVolatility, calcSharpe, calcMaxDrawdown, calcVaR, calcBeta, calcAlpha, calcSortino, calcDrift, factorDecompose };
