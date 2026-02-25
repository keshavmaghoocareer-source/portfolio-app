
// ─── Transactions ─────────────────────────────────────────────────────────────
async function pageTransactions() {
  const content = document.getElementById('page-content');

  async function render() {
    await loadGlobalData();
    const selectedId = State.selectedPortfolio || (State.portfolios[0] ? State.portfolios[0]._id : null);
    if (selectedId && !State.selectedPortfolio) State.selectedPortfolio = selectedId;
    const txns = selectedId ? await GET(`/transactions?portfolioId=${selectedId}`) : [];
    const typeColors = { buy: 'badge-green', sell: 'badge-red', dividend: 'badge-blue', fee: 'badge-amber', deposit: 'badge-green', withdrawal: 'badge-red' };

    document.getElementById('topbar-actions').innerHTML = selectedId ? `<button class="btn btn-primary" onclick="showTxnModal()">${icons.plus} Record Transaction</button>` : '';

    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <label style="font-size:13px;font-weight:600;color:var(--muted)">Portfolio:</label>
        <select id="portfolio-select" style="min-width:280px" onchange="State.selectedPortfolio=this.value;pageTransactions()">
          ${State.portfolios.map(p => {
            const c = State.clients.find(cl => cl._id === p.clientId);
            return `<option value="${p._id}" ${p._id === selectedId ? 'selected' : ''}>${c ? c.name + ' — ' : ''}${p.name}</option>`;
          }).join('')}
        </select>
      </div>
      <div class="card">
        <div class="card-title">${icons.transactions} Transaction Ledger</div>
        ${txns.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Security</th><th>Ticker</th><th class="td-right">Quantity</th><th class="td-right">Price</th><th class="td-right">Amount</th><th>Currency</th><th>Notes</th><th></th></tr></thead>
            <tbody>
              ${txns.map(t => `
                <tr>
                  <td>${fmt.date(t.date)}</td>
                  <td><span class="badge ${typeColors[t.type] || 'badge-gray'}">${(t.type||'').toUpperCase()}</span></td>
                  <td>${t.name || t.ticker || '—'}</td>
                  <td>${t.ticker ? `<span class="badge badge-blue">${t.ticker}</span>` : '—'}</td>
                  <td class="td-right">${t.quantity ? fmt.num(t.quantity) : '—'}</td>
                  <td class="td-right">${t.price ? fmt.usd(t.price) : '—'}</td>
                  <td class="td-right"><strong>${fmt.usd(t.amount || (t.quantity * t.price))}</strong></td>
                  <td>${t.currency || 'USD'}</td>
                  <td>${t.notes ? t.notes.substring(0,30) : '—'}</td>
                  <td class="td-right"><button class="btn btn-sm btn-danger" onclick="deleteTxn('${t._id}')">${icons.trash}</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `<div class="empty-state">${icons.transactions}<p>No transactions yet.</p></div>`}
      </div>`;
  }

  window.showTxnModal = function() {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="txn-modal">
        <div class="modal">
          <div class="modal-header"><div class="modal-title">Record Transaction</div><button class="modal-close" onclick="document.getElementById('txn-modal').remove()">×</button></div>
          <div class="form-row">
            <div class="form-group"><label>Date *</label><input id="t-date" type="date" value="${new Date().toISOString().split('T')[0]}"/></div>
            <div class="form-group"><label>Type *</label>
              <select id="t-type">
                ${['buy','sell','dividend','fee','deposit','withdrawal'].map(t => `<option>${t}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Security Name</label><input id="t-name" placeholder="Apple Inc."/></div>
            <div class="form-group"><label>Ticker</label><input id="t-ticker" placeholder="AAPL"/></div>
          </div>
          <div class="form-row-3">
            <div class="form-group"><label>Quantity</label><input id="t-qty" type="number" step="0.0001" placeholder="100"/></div>
            <div class="form-group"><label>Price per Unit</label><input id="t-price" type="number" step="0.01" placeholder="150.00"/></div>
            <div class="form-group"><label>Currency</label>
              <select id="t-currency">${['USD','EUR','GBP','MUR'].map(c=>`<option>${c}</option>`).join('')}</select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Asset Class</label>
              <select id="t-class">${['Equity','Fixed Income','Cash','Real Estate','Fund','Other'].map(a=>`<option>${a}</option>`).join('')}</select>
            </div>
            <div class="form-group"><label>Notes</label><input id="t-notes" placeholder="Optional notes"/></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('txn-modal').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="saveTxn()">Record Transaction</button>
          </div>
        </div>
      </div>`);
  };

  window.saveTxn = async function() {
    const qty = parseFloat(document.getElementById('t-qty').value) || 0;
    const price = parseFloat(document.getElementById('t-price').value) || 0;
    const body = { portfolioId: State.selectedPortfolio, date: document.getElementById('t-date').value, type: document.getElementById('t-type').value, name: document.getElementById('t-name').value, ticker: document.getElementById('t-ticker').value.toUpperCase(), quantity: qty, price, amount: qty * price || price, currency: document.getElementById('t-currency').value, assetClass: document.getElementById('t-class').value, notes: document.getElementById('t-notes').value };
    const r = await POST('/transactions', body);
    if (r.success !== false) { document.getElementById('txn-modal').remove(); toast('Transaction recorded'); render(); }
    else toast(r.error || 'Error', 'error');
  };

  window.deleteTxn = async function(id) {
    if (!confirm('Delete this transaction?')) return;
    await DEL(`/transactions/${id}`);
    toast('Transaction deleted'); render();
  };

  render();
}

// ─── Performance ──────────────────────────────────────────────────────────────
async function pagePerformance() {
  const content = document.getElementById('page-content');
  await loadGlobalData();
  const selectedId = State.selectedPortfolio || (State.portfolios[0] ? State.portfolios[0]._id : null);

  const portfolioSelect = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <label style="font-size:13px;font-weight:600;color:var(--muted)">Portfolio:</label>
      <select style="min-width:280px" onchange="State.selectedPortfolio=this.value;pagePerformance()">
        ${State.portfolios.map(p => {
          const c = State.clients.find(cl => cl._id === p.clientId);
          return `<option value="${p._id}" ${p._id === selectedId ? 'selected' : ''}>${c ? c.name + ' — ' : ''}${p.name}</option>`;
        }).join('')}
      </select>
    </div>`;

  if (!selectedId) { content.innerHTML = portfolioSelect + '<div class="alert alert-info">Please create a portfolio first.</div>'; return; }

  const data = await GET(`/analytics/performance/${selectedId}`);
  const history = data.history || [];

  content.innerHTML = portfolioSelect + `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Return (TWR)</div><div class="stat-value ${fmt.pnlClass(data.twr)}">${fmt.pct(data.twr)}</div><div class="stat-sub neu">Since inception</div></div>
      <div class="stat-card"><div class="stat-label">Annualised Return</div><div class="stat-value ${fmt.pnlClass(data.annualisedReturn)}">${fmt.pct(data.annualisedReturn)}</div></div>
      <div class="stat-card"><div class="stat-label">Volatility (Ann.)</div><div class="stat-value">${fmt.pctAbs(data.volatility)}</div><div class="stat-sub neu">Standard deviation</div></div>
      <div class="stat-card"><div class="stat-label">Sharpe Ratio</div><div class="stat-value">${fmt.ratio(data.sharpe)}</div><div class="stat-sub neu">Risk-free: 4.5%</div></div>
      <div class="stat-card"><div class="stat-label">Sortino Ratio</div><div class="stat-value">${fmt.ratio(data.sortino)}</div></div>
      <div class="stat-card"><div class="stat-label">Max Drawdown</div><div class="stat-value neg">-${fmt.pctAbs(data.maxDrawdown)}</div></div>
    </div>

    <div class="card">
      <div class="card-title">${icons.performance} Portfolio Value History</div>
      ${history.length >= 2 ? `<div class="chart-container" style="height:300px"><canvas id="perf-chart"></canvas></div>` : `
        <div class="alert alert-info">
          <strong>No history yet.</strong> Use the <strong>"Record Snapshot"</strong> button on the Portfolio Tracking page regularly (daily or weekly) to build performance history. Each snapshot captures the current portfolio value.
        </div>`}
    </div>`;

  if (history.length >= 2) {
    const ctx = document.getElementById('perf-chart').getContext('2d');
    State.charts.perf = new Chart(ctx, {
      type: 'line',
      data: {
        labels: history.map(s => fmt.date(s.date)),
        datasets: [{ label: 'Portfolio Value (USD)', data: history.map(s => s.totalValue), fill: true, backgroundColor: 'rgba(37,99,235,0.08)', borderColor: '#2563eb', borderWidth: 2, tension: 0.3, pointRadius: 3 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => '$' + (v/1000).toFixed(0) + 'k' } } } }
    });
  }
}

// ─── Risk Analytics ───────────────────────────────────────────────────────────
async function pageRisk() {
  const content = document.getElementById('page-content');
  await loadGlobalData();
  const selectedId = State.selectedPortfolio || (State.portfolios[0] ? State.portfolios[0]._id : null);

  const portfolioSelect = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <label style="font-size:13px;font-weight:600;color:var(--muted)">Portfolio:</label>
      <select style="min-width:280px" onchange="State.selectedPortfolio=this.value;pageRisk()">
        ${State.portfolios.map(p => {
          const c = State.clients.find(cl => cl._id === p.clientId);
          return `<option value="${p._id}" ${p._id === selectedId ? 'selected' : ''}>${c ? c.name + ' — ' : ''}${p.name}</option>`;
        }).join('')}
      </select>
    </div>`;

  if (!selectedId) { content.innerHTML = portfolioSelect + '<div class="alert alert-info">Please create a portfolio first.</div>'; return; }

  const data = await GET(`/analytics/risk/${selectedId}`);

  const riskLevel = data.volatility > 20 ? 'High' : data.volatility > 10 ? 'Moderate' : 'Low';
  const riskFilled = riskLevel === 'High' ? 5 : riskLevel === 'Moderate' ? 3 : 1;

  content.innerHTML = portfolioSelect + `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">VaR (95%, 1-day)</div>
        <div class="stat-value neg">-${fmt.usd(data.var95)}</div>
        <div class="stat-sub neu">Max expected daily loss</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">VaR (99%, 1-day)</div>
        <div class="stat-value neg">-${fmt.usd(data.var99)}</div>
        <div class="stat-sub neu">Extreme loss estimate</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Volatility</div>
        <div class="stat-value">${fmt.pctAbs(data.volatility)}</div>
        <div class="stat-sub neu">Annualised</div>
        <div class="risk-meter">${[1,2,3,4,5].map(i=>`<div class="risk-bar${i<=riskFilled?' '+(riskLevel==='High'?'high':'filled'):''}"></div>`).join('')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Max Drawdown</div>
        <div class="stat-value neg">-${fmt.pctAbs(data.maxDrawdown)}</div>
        <div class="stat-sub neu">Worst peak-to-trough</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Concentration Risk</div>
        <div class="stat-value ${data.concentrationRisk > 30 ? 'neg' : 'pos'}">${parseFloat(data.concentrationRisk||0).toFixed(1)}%</div>
        <div class="stat-sub neu">Largest single position</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Risk Level</div>
        <div class="stat-value"><span class="badge badge-${riskLevel==='High'?'red':riskLevel==='Moderate'?'amber':'green'}">${riskLevel}</span></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">${icons.risk} Top 5 Positions by Weight</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Security</th><th class="td-right">Value</th><th class="td-right">Weight</th><th>Risk Contribution</th></tr></thead>
            <tbody>
              ${(data.top5Positions || []).map(p => `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td class="td-right">${fmt.usd(p.value)}</td>
                  <td class="td-right"><strong>${p.pct}%</strong></td>
                  <td><div class="progress-bar" style="margin-top:4px"><div class="progress-fill ${parseFloat(p.pct)>25?'':''}` + `" style="width:${Math.min(p.pct,100)}%;background:${parseFloat(p.pct)>30?'var(--red)':'var(--accent)'}"></div></div></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-title">${icons.risk} Risk Interpretation</div>
        ${data.volatility === 0 ? `<div class="alert alert-info">Record portfolio snapshots regularly to enable risk calculations based on historical returns.</div>` : ''}
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="alert alert-${data.var95 > data.totalValue * 0.05 ? 'danger' : 'success'}">
            <strong>Daily VaR (95%):</strong> There is a 5% chance of losing more than ${fmt.usd(data.var95)} in a single day.
          </div>
          <div class="alert alert-${data.concentrationRisk > 30 ? 'warning' : 'success'}">
            <strong>Concentration:</strong> ${data.concentrationRisk > 30 ? 'High concentration detected. Consider diversifying.' : 'Concentration levels appear acceptable.'}
          </div>
          <div class="alert alert-${data.maxDrawdown > 20 ? 'warning' : 'success'}">
            <strong>Max Drawdown:</strong> The portfolio has experienced a maximum peak-to-trough decline of ${fmt.pctAbs(data.maxDrawdown)}.
          </div>
        </div>
      </div>
    </div>`;
}

// ─── Asset Allocation & Rebalancing ──────────────────────────────────────────
async function pageAllocation() {
  const content = document.getElementById('page-content');
  await loadGlobalData();
  const selectedId = State.selectedPortfolio || (State.portfolios[0] ? State.portfolios[0]._id : null);

  const portfolioSelect = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <label style="font-size:13px;font-weight:600;color:var(--muted)">Portfolio:</label>
      <select style="min-width:280px" onchange="State.selectedPortfolio=this.value;pageAllocation()">
        ${State.portfolios.map(p => {
          const c = State.clients.find(cl => cl._id === p.clientId);
          return `<option value="${p._id}" ${p._id === selectedId ? 'selected' : ''}>${c ? c.name + ' — ' : ''}${p.name}</option>`;
        }).join('')}
      </select>
    </div>`;

  if (!selectedId) { content.innerHTML = portfolioSelect + '<div class="alert alert-info">Create a portfolio first.</div>'; return; }

  const [alloc, rebal, summary] = await Promise.all([GET(`/allocations/${selectedId}`), GET(`/rebalance/${selectedId}`), GET(`/analytics/summary/${selectedId}`)]);
  const targets = alloc.targets || {};
  const assetClasses = ['Equity', 'Fixed Income', 'Cash', 'Real Estate', 'Commodity', 'Fund', 'Alternative'];

  content.innerHTML = portfolioSelect + `
    <div class="grid-2">
      <div class="card">
        <div class="card-title">${icons.allocation} Set Target Allocation</div>
        <p class="text-muted" style="margin-bottom:16px">Set target % for each asset class (should total 100%)</p>
        ${assetClasses.map(cls => `
          <div class="form-row" style="align-items:center;margin-bottom:8px">
            <label style="font-size:13px;font-weight:600;margin:0">${cls}</label>
            <input type="number" min="0" max="100" id="target-${cls.replace(/ /g,'_')}" value="${targets[cls] || 0}" placeholder="0" style="text-align:right"/>
            <span style="font-size:13px;color:var(--muted)">%</span>
          </div>`).join('')}
        <div id="target-total" style="margin-top:12px;font-size:13px;font-weight:600"></div>
        <button class="btn btn-primary mt-4" onclick="saveTargets()">Save Targets</button>
      </div>

      <div class="card">
        <div class="card-title">${icons.allocation} Current vs Target</div>
        <div class="chart-container"><canvas id="alloc-chart"></canvas></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${icons.refresh} Rebalancing Suggestions</div>
      ${rebal.suggestions && rebal.suggestions.length ? `
        <div class="alert alert-warning" style="margin-bottom:16px">⚠️ ${rebal.suggestions.length} asset class(es) have drifted beyond ±5% from target. Rebalancing recommended.</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Asset Class</th><th class="td-right">Current</th><th class="td-right">Target</th><th class="td-right">Drift</th><th>Action Required</th><th class="td-right">Approx. Amount</th></tr></thead>
            <tbody>
              ${rebal.suggestions.map(s => `
                <tr>
                  <td><strong>${s.assetClass}</strong></td>
                  <td class="td-right">${s.currentPct}%</td>
                  <td class="td-right">${s.targetPct}%</td>
                  <td class="td-right"><span class="${parseFloat(s.drift)>0?'neg':'pos'}">${s.drift > 0 ? '+' : ''}${s.drift}%</span></td>
                  <td><span class="badge ${s.action==='Reduce'?'badge-red':'badge-green'}">${s.action}</span></td>
                  <td class="td-right"><strong>${fmt.usd(s.amount)}</strong></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `<div class="alert alert-success">✓ Portfolio is within target allocation bands. No rebalancing needed at this time.</div>`}
    </div>`;

  // Chart
  const drift = rebal.drift || [];
  if (drift.length) {
    const ctx = document.getElementById('alloc-chart').getContext('2d');
    State.charts.alloc2 = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: drift.map(d => d.assetClass),
        datasets: [
          { label: 'Current %', data: drift.map(d => d.current.toFixed(1)), backgroundColor: '#2563eb' },
          { label: 'Target %', data: drift.map(d => d.target), backgroundColor: '#e2e8f0' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { ticks: { callback: v => v + '%' } } } }
    });
  }

  window.saveTargets = async function() {
    const targets = {};
    assetClasses.forEach(cls => { const v = parseFloat(document.getElementById(`target-${cls.replace(/ /g,'_')}`).value) || 0; if (v > 0) targets[cls] = v; });
    const total = Object.values(targets).reduce((a,b) => a+b, 0);
    document.getElementById('target-total').innerHTML = `Total: <span class="${Math.abs(total-100)<1?'pos':'neg'}">${total.toFixed(1)}%</span> ${Math.abs(total-100)<1?'✓':'(should be 100%)'}`;
    const r = await POST(`/allocations/${selectedId}`, { targets });
    if (r.success) { toast('Targets saved'); pageAllocation(); }
  };
}

// ─── Factor Analysis ──────────────────────────────────────────────────────────
async function pageFactor() {
  const content = document.getElementById('page-content');
  await loadGlobalData();
  const selectedId = State.selectedPortfolio || (State.portfolios[0] ? State.portfolios[0]._id : null);

  const portfolioSelect = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <label style="font-size:13px;font-weight:600;color:var(--muted)">Portfolio:</label>
      <select style="min-width:280px" onchange="State.selectedPortfolio=this.value;pageFactor()">
        ${State.portfolios.map(p => {
          const c = State.clients.find(cl => cl._id === p.clientId);
          return `<option value="${p._id}" ${p._id === selectedId ? 'selected' : ''}>${c ? c.name + ' — ' : ''}${p.name}</option>`;
        }).join('')}
      </select>
    </div>`;

  if (!selectedId) { content.innerHTML = portfolioSelect + '<div class="alert alert-info">Create a portfolio first.</div>'; return; }

  const summary = await GET(`/analytics/summary/${selectedId}`);
  const factors = summary.factors || {};

  const geoData = Object.entries(factors.geography || {}).sort((a,b) => b[1]-a[1]);
  const sectorData = Object.entries(factors.sector || {}).sort((a,b) => b[1]-a[1]);

  content.innerHTML = portfolioSelect + `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Equity Exposure</div><div class="stat-value">${factors.equityPct || 0}%</div><div class="progress-bar mt-4"><div class="progress-fill" style="width:${factors.equityPct||0}%"></div></div></div>
      <div class="stat-card"><div class="stat-label">Fixed Income</div><div class="stat-value">${factors.fixedIncomePct || 0}%</div><div class="progress-bar mt-4"><div class="progress-fill" style="width:${factors.fixedIncomePct||0}%;background:#059669"></div></div></div>
      <div class="stat-card"><div class="stat-label">Alternatives</div><div class="stat-value">${factors.alternativesPct || 0}%</div><div class="progress-bar mt-4"><div class="progress-fill" style="width:${factors.alternativesPct||0}%;background:#d97706"></div></div></div>
      <div class="stat-card"><div class="stat-label">Cash</div><div class="stat-value">${factors.cashPct || 0}%</div><div class="progress-bar mt-4"><div class="progress-fill" style="width:${factors.cashPct||0}%;background:#64748b"></div></div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">${icons.factor} Geographic Exposure</div>
        ${geoData.length ? `
          <div class="chart-container"><canvas id="geo-chart"></canvas></div>
          <div class="table-wrap mt-4"><table><thead><tr><th>Region/Country</th><th class="td-right">Weight</th></tr></thead><tbody>
            ${geoData.map(([g,pct]) => `<tr><td>${g}</td><td class="td-right">${pct}%</td></tr>`).join('')}
          </tbody></table></div>` : '<div class="alert alert-info">Add "Geography" to holdings to see geographic breakdown.</div>'}
      </div>
      <div class="card">
        <div class="card-title">${icons.factor} Sector Exposure</div>
        ${sectorData.length ? `
          <div class="chart-container"><canvas id="sector-chart"></canvas></div>
          <div class="table-wrap mt-4"><table><thead><tr><th>Sector</th><th class="td-right">Weight</th></tr></thead><tbody>
            ${sectorData.map(([s,pct]) => `<tr><td>${s}</td><td class="td-right">${pct}%</td></tr>`).join('')}
          </tbody></table></div>` : '<div class="alert alert-info">Add "Sector" to holdings to see sector breakdown.</div>'}
      </div>
    </div>`;

  if (geoData.length) {
    const ctx = document.getElementById('geo-chart').getContext('2d');
    State.charts.geo = new Chart(ctx, { type: 'doughnut', data: { labels: geoData.map(d=>d[0]), datasets: [{ data: geoData.map(d=>d[1]), backgroundColor: ['#2563eb','#059669','#d97706','#7c3aed','#dc2626','#0891b2'], borderWidth: 2, borderColor: '#fff' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } } });
  }
  if (sectorData.length) {
    const ctx = document.getElementById('sector-chart').getContext('2d');
    State.charts.sector = new Chart(ctx, { type: 'doughnut', data: { labels: sectorData.map(d=>d[0]), datasets: [{ data: sectorData.map(d=>d[1]), backgroundColor: ['#6366f1','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#06b6d4'], borderWidth: 2, borderColor: '#fff' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } } });
  }
}

// ─── Alternative Assets ───────────────────────────────────────────────────────
async function pageAlternatives() {
  const content = document.getElementById('page-content');
  await loadGlobalData();
  const selectedId = State.selectedPortfolio || (State.portfolios[0] ? State.portfolios[0]._id : null);

  document.getElementById('topbar-actions').innerHTML = selectedId ? `<button class="btn btn-primary" onclick="showAltModal()">${icons.plus} Add Alternative Asset</button>` : '';

  async function render() {
    const alts = selectedId ? await GET(`/alternatives?portfolioId=${selectedId}`) : [];
    const totalAlt = alts.reduce((s,a) => s + (parseFloat(a.currentNAV)||0), 0);

    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <label style="font-size:13px;font-weight:600;color:var(--muted)">Portfolio:</label>
        <select style="min-width:280px" onchange="State.selectedPortfolio=this.value;pageAlternatives()">
          ${State.portfolios.map(p => {
            const c = State.clients.find(cl => cl._id === p.clientId);
            return `<option value="${p._id}" ${p._id === selectedId ? 'selected' : ''}>${c ? c.name + ' — ' : ''}${p.name}</option>`;
          }).join('')}
        </select>
      </div>
      ${alts.length ? `<div class="stat-card" style="margin-bottom:20px"><div class="stat-label">Total Alternative Assets Value</div><div class="stat-value">${fmt.usd(totalAlt)}</div></div>` : ''}
      <div class="card">
        <div class="card-title">${icons.alternatives} Alternative Assets</div>
        ${alts.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Type</th><th>Vintage</th><th class="td-right">Committed</th><th class="td-right">Called</th><th class="td-right">Distributions</th><th class="td-right">Current NAV</th><th class="td-right">MOIC</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${alts.map(a => {
                const moic = a.capitalCalled > 0 ? ((parseFloat(a.currentNAV||0) + parseFloat(a.distributions||0)) / parseFloat(a.capitalCalled)).toFixed(2) : '—';
                return `<tr>
                  <td><strong>${a.name}</strong></td>
                  <td><span class="badge badge-blue">${a.type||'—'}</span></td>
                  <td>${a.vintage || '—'}</td>
                  <td class="td-right">${fmt.usd(a.committed)}</td>
                  <td class="td-right">${fmt.usd(a.capitalCalled)}</td>
                  <td class="td-right">${fmt.usd(a.distributions)}</td>
                  <td class="td-right"><strong>${fmt.usd(a.currentNAV)}</strong></td>
                  <td class="td-right">${moic}x</td>
                  <td><span class="badge badge-${a.status==='Active'?'green':'gray'}">${a.status||'Active'}</span></td>
                  <td class="td-right" style="white-space:nowrap">
                    <button class="btn btn-sm btn-secondary" onclick='showAltModal(${JSON.stringify(a).replace(/'/g,"&#39;")})'>${icons.edit}</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAlt('${a._id}')" style="margin-left:4px">${icons.trash}</button>
                  </td>
                </tr>`;}).join('')}
            </tbody>
          </table>
        </div>` : `<div class="empty-state">${icons.alternatives}<p>No alternative assets yet.</p></div>`}
      </div>`;
  }

  window.showAltModal = function(a) {
    const isEdit = !!a;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="alt-modal">
        <div class="modal">
          <div class="modal-header"><div class="modal-title">${isEdit ? 'Edit' : 'Add'} Alternative Asset</div><button class="modal-close" onclick="document.getElementById('alt-modal').remove()">×</button></div>
          <div class="form-row">
            <div class="form-group"><label>Name *</label><input id="a-name" value="${a?.name||''}" placeholder="Fund name or asset"/></div>
            <div class="form-group"><label>Type</label>
              <select id="a-type">${['Private Equity','Venture Capital','Hedge Fund','Real Estate','Infrastructure','Private Credit','Other'].map(t=>`<option ${(a?.type||'Private Equity')===t?'selected':''}>${t}</option>`).join('')}</select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Vintage Year</label><input id="a-vintage" value="${a?.vintage||''}" placeholder="2022"/></div>
            <div class="form-group"><label>Status</label>
              <select id="a-status">${['Active','Realised','Partially Realised'].map(s=>`<option ${(a?.status||'Active')===s?'selected':''}>${s}</option>`).join('')}</select>
            </div>
          </div>
          <div class="form-row-3">
            <div class="form-group"><label>Committed Capital</label><input id="a-committed" type="number" step="1000" value="${a?.committed||''}" placeholder="1000000"/></div>
            <div class="form-group"><label>Capital Called</label><input id="a-called" type="number" step="1000" value="${a?.capitalCalled||''}" placeholder="750000"/></div>
            <div class="form-group"><label>Distributions</label><input id="a-dist" type="number" step="1000" value="${a?.distributions||''}" placeholder="200000"/></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Current NAV</label><input id="a-nav" type="number" step="1000" value="${a?.currentNAV||''}" placeholder="850000"/></div>
            <div class="form-group"><label>Notes</label><input id="a-notes" value="${a?.notes||''}" placeholder="Fund manager, terms..."/></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('alt-modal').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="saveAlt('${a?._id||''}')">Save Asset</button>
          </div>
        </div>
      </div>`);
  };

  window.saveAlt = async function(id) {
    const body = { portfolioId: selectedId, name: document.getElementById('a-name').value.trim(), type: document.getElementById('a-type').value, vintage: document.getElementById('a-vintage').value, status: document.getElementById('a-status').value, committed: parseFloat(document.getElementById('a-committed').value)||0, capitalCalled: parseFloat(document.getElementById('a-called').value)||0, distributions: parseFloat(document.getElementById('a-dist').value)||0, currentNAV: parseFloat(document.getElementById('a-nav').value)||0, notes: document.getElementById('a-notes').value };
    if (!body.name) return toast('Name required', 'error');
    const r = id ? await PUT(`/alternatives/${id}`, body) : await POST('/alternatives', body);
    if (r.success !== false) { document.getElementById('alt-modal').remove(); toast(id ? 'Asset updated' : 'Asset added'); render(); }
    else toast(r.error || 'Error', 'error');
  };

  window.deleteAlt = async function(id) {
    if (!confirm('Remove this asset?')) return;
    await DEL(`/alternatives/${id}`);
    toast('Asset removed'); render();
  };

  render();
}

// ─── Team / Users ─────────────────────────────────────────────────────────────
async function pageUsers() {
  const content = document.getElementById('page-content');
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary" onclick="showUserModal()">${icons.plus} Add Team Member</button>`;

  async function render() {
    const users = await GET('/users');
    content.innerHTML = `
      <div class="card">
        <div class="card-title">${icons.users} Team Members</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th></th></tr></thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td><strong>${u.name}</strong></td>
                  <td>${u.username}</td>
                  <td><span class="badge ${u.role==='admin'?'badge-blue':'badge-gray'}">${u.role}</span></td>
                  <td class="td-right">${u.username !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteUser('${u._id}','${u.name}')">${icons.trash}</button>` : ''}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  window.showUserModal = function() {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="user-modal">
        <div class="modal">
          <div class="modal-header"><div class="modal-title">Add Team Member</div><button class="modal-close" onclick="document.getElementById('user-modal').remove()">×</button></div>
          <div class="form-row">
            <div class="form-group"><label>Full Name *</label><input id="u-name" placeholder="John Smith"/></div>
            <div class="form-group"><label>Username *</label><input id="u-user" placeholder="jsmith"/></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Password *</label><input id="u-pass" type="password" placeholder="Min 8 characters"/></div>
            <div class="form-group"><label>Role</label>
              <select id="u-role"><option value="user">User</option><option value="admin">Admin</option></select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('user-modal').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="saveUser()">Add Member</button>
          </div>
        </div>
      </div>`);
  };

  window.saveUser = async function() {
    const name = document.getElementById('u-name').value.trim();
    const username = document.getElementById('u-user').value.trim();
    const password = document.getElementById('u-pass').value;
    const role = document.getElementById('u-role').value;
    if (!name || !username || !password) return toast('All fields required', 'error');
    if (password.length < 6) return toast('Password must be at least 6 characters', 'error');
    const r = await POST('/users', { name, username, password, role });
    if (r.success) { document.getElementById('user-modal').remove(); toast('Team member added'); render(); }
    else toast(r.error || 'Error', 'error');
  };

  window.deleteUser = async function(id, name) {
    if (!confirm(`Remove ${name} from the team?`)) return;
    await DEL(`/users/${id}`);
    toast('User removed'); render();
  };

  render();
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', init);
