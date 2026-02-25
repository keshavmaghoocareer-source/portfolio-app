
// ─── Dashboard ────────────────────────────────────────────────────────────────
async function pageDashboard() {
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loading">Loading dashboard...</div>';
  const data = await GET('/dashboard');
  const clients = data.clientSummaries || [];

  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total AUM</div>
        <div class="stat-value">${fmt.usd(data.totalAUM)}</div>
        <div class="stat-sub neu">Across all clients</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Active Clients</div>
        <div class="stat-value">${data.clientCount}</div>
        <div class="stat-sub neu">${data.portfolioCount} portfolios total</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Base Currency</div>
        <div class="stat-value">USD</div>
        <div class="stat-sub neu">All values in USD</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">${icons.clients} Client AUM Breakdown</div>
        <div class="chart-container"><canvas id="aum-chart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-title">${icons.clients} Client Summary</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Client</th><th class="td-right">AUM</th><th class="td-right">Portfolios</th><th></th></tr></thead>
            <tbody>
              ${clients.length ? clients.map(c => `
                <tr>
                  <td><strong>${c.name}</strong></td>
                  <td class="td-right">${fmt.usd(c.value)}</td>
                  <td class="td-right">${c.portfolios}</td>
                  <td class="td-right"><button class="btn btn-sm btn-secondary" onclick="goToClient('${c._id}')">View</button></td>
                </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:32px">No clients yet. <a href="#" onclick="navigate(\'clients\')">Add your first client</a></td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${icons.dashboard} Quick Actions</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="navigate('clients')">${icons.plus} Add Client</button>
        <button class="btn btn-secondary" onclick="navigate('holdings')">${icons.portfolio} Manage Holdings</button>
        <button class="btn btn-secondary" onclick="navigate('transactions')">${icons.transactions} Record Transaction</button>
        <button class="btn btn-secondary" onclick="navigate('performance')">${icons.performance} View Performance</button>
      </div>
    </div>`;

  if (clients.length) {
    const ctx = document.getElementById('aum-chart').getContext('2d');
    State.charts.aum = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: clients.map(c => c.name),
        datasets: [{ data: clients.map(c => c.value), backgroundColor: ['#2563eb','#059669','#d97706','#7c3aed','#dc2626','#0891b2'], borderWidth: 2, borderColor: '#fff' }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });
  }
}

function goToClient(clientId) {
  State.selectedClient = clientId;
  navigate('holdings');
}

// ─── Clients ──────────────────────────────────────────────────────────────────
async function pageClients() {
  const content = document.getElementById('page-content');
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary" onclick="showClientModal()">${icons.plus} Add Client</button>`;

  async function render() {
    const clients = await GET('/clients');
    State.clients = clients;
    content.innerHTML = `
      <div class="card">
        <div class="card-title">${icons.clients} All Clients</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Risk Profile</th><th>Inception Date</th><th>Notes</th><th></th></tr></thead>
            <tbody>
              ${clients.length ? clients.map(c => `
                <tr>
                  <td><strong>${c.name}</strong></td>
                  <td>${c.email || '—'}</td>
                  <td><span class="badge badge-${c.riskProfile === 'Aggressive' ? 'red' : c.riskProfile === 'Moderate' ? 'amber' : 'green'}">${c.riskProfile || '—'}</span></td>
                  <td>${fmt.date(c.inceptionDate)}</td>
                  <td>${c.notes ? c.notes.substring(0, 40) + (c.notes.length > 40 ? '…' : '') : '—'}</td>
                  <td class="td-right" style="white-space:nowrap">
                    <button class="btn btn-sm btn-secondary" onclick="showClientModal(${JSON.stringify(c).replace(/"/g,'&quot;')})">${icons.edit}</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteClient('${c._id}','${c.name}')" style="margin-left:4px">${icons.trash}</button>
                  </td>
                </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:32px">No clients yet. Click "Add Client" to get started.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  window.showClientModal = function(client) {
    const isEdit = !!client;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="client-modal">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">${isEdit ? 'Edit Client' : 'New Client'}</div>
            <button class="modal-close" onclick="document.getElementById('client-modal').remove()">×</button>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Full Name *</label><input id="c-name" value="${client?.name || ''}" placeholder="Client name"/></div>
            <div class="form-group"><label>Email</label><input id="c-email" value="${client?.email || ''}" placeholder="email@example.com"/></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Risk Profile</label>
              <select id="c-risk">
                ${['Conservative','Moderate','Aggressive'].map(r => `<option ${(client?.riskProfile || 'Moderate') === r ? 'selected' : ''}>${r}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Inception Date</label><input id="c-date" type="date" value="${client?.inceptionDate ? client.inceptionDate.split('T')[0] : ''}"/></div>
          </div>
          <div class="form-group"><label>Notes</label><textarea id="c-notes" rows="3" placeholder="Client notes...">${client?.notes || ''}</textarea></div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('client-modal').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="saveClient('${client?._id || ''}')">Save Client</button>
          </div>
        </div>
      </div>`);
  };

  window.saveClient = async function(id) {
    const body = { name: document.getElementById('c-name').value.trim(), email: document.getElementById('c-email').value.trim(), riskProfile: document.getElementById('c-risk').value, inceptionDate: document.getElementById('c-date').value, notes: document.getElementById('c-notes').value.trim() };
    if (!body.name) return toast('Name is required', 'error');
    const r = id ? await PUT(`/clients/${id}`, body) : await POST('/clients', body);
    if (r.success !== false) { document.getElementById('client-modal').remove(); toast(id ? 'Client updated' : 'Client added'); render(); }
    else toast(r.error || 'Error', 'error');
  };

  window.deleteClient = async function(id, name) {
    if (!confirm(`Delete client "${name}" and all their portfolios?`)) return;
    await DEL(`/clients/${id}`);
    toast('Client deleted'); render();
  };

  render();
}

// ─── Holdings ─────────────────────────────────────────────────────────────────
async function pageHoldings() {
  const content = document.getElementById('page-content');

  async function render() {
    await loadGlobalData();
    const portfolios = State.portfolios;

    let portfolioOptions = '';
    for (const c of State.clients) {
      const cp = portfolios.filter(p => p.clientId === c._id);
      if (cp.length) portfolioOptions += cp.map(p => `<option value="${p._id}">${c.name} — ${p.name}</option>`).join('');
    }

    const selectedId = State.selectedPortfolio || (portfolios[0] ? portfolios[0]._id : null);
    if (selectedId && !State.selectedPortfolio) State.selectedPortfolio = selectedId;

    const holdings = selectedId ? await GET(`/holdings?portfolioId=${selectedId}`) : [];
    const summary = selectedId ? await GET(`/analytics/summary/${selectedId}`) : null;
    const totalValue = summary ? summary.totalValue : 0;

    document.getElementById('topbar-actions').innerHTML = `
      <button class="btn btn-secondary" onclick="showPortfolioModal()">${icons.plus} New Portfolio</button>
      ${selectedId ? `<button class="btn btn-primary" onclick="showHoldingModal()">${icons.plus} Add Holding</button>` : ''}
      ${selectedId ? `<button class="btn btn-secondary" onclick="showPriceModal()">${icons.refresh} Update Prices</button>` : ''}
      ${selectedId ? `<button class="btn btn-success" onclick="takeSnapshot('${selectedId}')">${icons.camera} Record Snapshot</button>` : ''}`;

    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
        <label style="font-size:13px;font-weight:600;color:var(--muted)">Portfolio:</label>
        <select id="portfolio-select" style="min-width:280px" onchange="State.selectedPortfolio=this.value;pageHoldings()">
          ${portfolios.length ? portfolios.map(p => {
            const c = State.clients.find(cl => cl._id === p.clientId);
            return `<option value="${p._id}" ${p._id === selectedId ? 'selected' : ''}>${c ? c.name + ' — ' : ''}${p.name}</option>`;
          }).join('') : '<option>— No portfolios yet —</option>'}
        </select>
        ${selectedId ? `<button class="btn btn-sm btn-danger" onclick="deletePortfolio('${selectedId}')">${icons.trash} Delete Portfolio</button>` : ''}
      </div>

      ${summary ? `
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card"><div class="stat-label">Total Value</div><div class="stat-value">${fmt.usd(summary.totalValue)}</div></div>
        <div class="stat-card"><div class="stat-label">Cost Basis</div><div class="stat-value">${fmt.usd(summary.totalCost)}</div></div>
        <div class="stat-card"><div class="stat-label">Unrealised P&L</div><div class="stat-value ${fmt.pnlClass(summary.unrealisedPnL)}">${fmt.usd(summary.unrealisedPnL)}</div><div class="stat-sub ${fmt.pnlClass(summary.unrealisedPnLPct)}">${fmt.pct(summary.unrealisedPnLPct)}</div></div>
        <div class="stat-card"><div class="stat-label">Holdings</div><div class="stat-value">${summary.holdingsCount}</div></div>
      </div>
      <div class="grid-2" style="margin-bottom:20px">
        <div class="card"><div class="card-title">Asset Allocation</div><div class="chart-container"><canvas id="alloc-pie"></canvas></div></div>
        <div class="card"><div class="card-title">Allocation Breakdown</div><div>
          ${(summary.allocation || []).map(a => `
            <div style="margin-bottom:14px">
              <div class="flex-between mb-1"><span style="font-size:13px;font-weight:600">${a.name}</span><span style="font-size:13px">${fmt.usd(a.value)} <span class="text-muted">(${a.pct}%)</span></span></div>
              <div class="progress-bar"><div class="progress-fill" style="width:${a.pct}%"></div></div>
            </div>`).join('')}
        </div></div>
      </div>` : ''}

      <div class="card">
        <div class="card-title">${icons.portfolio} Holdings</div>
        ${holdings.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Security</th><th>Ticker</th><th>Asset Class</th><th>Sector</th><th>Geography</th><th class="td-right">Quantity</th><th class="td-right">Cost Basis</th><th class="td-right">Current Price</th><th class="td-right">Market Value</th><th class="td-right">P&L</th><th class="td-right">Weight</th><th></th></tr></thead>
            <tbody>
              ${holdings.map(h => {
                const pnl = (h.marketValue || 0) - ((h.costBasis || 0) * (h.quantity || 0));
                const pnlPct = h.costBasis && h.quantity ? (pnl / (h.costBasis * h.quantity) * 100) : 0;
                const weight = totalValue > 0 ? (h.marketValue / totalValue * 100) : 0;
                return `<tr>
                  <td><strong>${h.name || h.ticker}</strong></td>
                  <td><span class="badge badge-blue">${h.ticker || '—'}</span></td>
                  <td>${h.assetClass || '—'}</td>
                  <td>${h.sector || '—'}</td>
                  <td>${h.geography || '—'}</td>
                  <td class="td-right">${fmt.num(h.quantity)}</td>
                  <td class="td-right">${fmt.usd(h.costBasis)}</td>
                  <td class="td-right">${fmt.usd(h.currentPrice)}</td>
                  <td class="td-right"><strong>${fmt.usd(h.marketValue)}</strong></td>
                  <td class="td-right">${colorPnL(pnl)}<br><small>${colorPct(pnlPct)}</small></td>
                  <td class="td-right">${weight.toFixed(1)}%</td>
                  <td class="td-right" style="white-space:nowrap">
                    <button class="btn btn-sm btn-secondary" onclick='showHoldingModal(${JSON.stringify(h).replace(/'/g,"&#39;")})'>${icons.edit}</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteHolding('${h._id}')" style="margin-left:4px">${icons.trash}</button>
                  </td>
                </tr>`;}).join('')}
            </tbody>
          </table>
        </div>` : `<div class="empty-state">${icons.portfolio}<p>No holdings yet. Add your first holding to get started.</p></div>`}
      </div>`;

    if (summary && summary.allocation && summary.allocation.length) {
      const ctx = document.getElementById('alloc-pie').getContext('2d');
      State.charts.alloc = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: summary.allocation.map(a => a.name), datasets: [{ data: summary.allocation.map(a => a.value), backgroundColor: ['#2563eb','#059669','#d97706','#7c3aed','#dc2626','#0891b2','#6366f1'], borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
      });
    }
  }

  window.showPortfolioModal = function() {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="port-modal">
        <div class="modal">
          <div class="modal-header"><div class="modal-title">New Portfolio</div><button class="modal-close" onclick="document.getElementById('port-modal').remove()">×</button></div>
          <div class="form-group"><label>Client *</label>
            <select id="p-client">
              ${State.clients.map(c => `<option value="${c._id}">${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Portfolio Name *</label><input id="p-name" placeholder="e.g. Growth Portfolio"/></div>
          <div class="form-group"><label>Description</label><input id="p-desc" placeholder="Brief description"/></div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('port-modal').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="savePortfolio()">Create Portfolio</button>
          </div>
        </div>
      </div>`);
  };

  window.savePortfolio = async function() {
    const clientId = document.getElementById('p-client').value;
    const name = document.getElementById('p-name').value.trim();
    if (!name) return toast('Name required', 'error');
    const r = await POST('/portfolios', { clientId, name, description: document.getElementById('p-desc').value });
    if (r.success) { document.getElementById('port-modal').remove(); State.selectedPortfolio = r.portfolio._id; toast('Portfolio created'); render(); }
    else toast(r.error || 'Error', 'error');
  };

  window.deletePortfolio = async function(id) {
    if (!confirm('Delete this portfolio and all its holdings?')) return;
    await DEL(`/portfolios/${id}`);
    State.selectedPortfolio = null; toast('Portfolio deleted'); render();
  };

  window.showHoldingModal = function(h) {
    const isEdit = !!h;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="holding-modal">
        <div class="modal">
          <div class="modal-header"><div class="modal-title">${isEdit ? 'Edit Holding' : 'Add Holding'}</div><button class="modal-close" onclick="document.getElementById('holding-modal').remove()">×</button></div>
          <div class="form-row">
            <div class="form-group"><label>Security Name *</label><input id="h-name" value="${h?.name || ''}" placeholder="Apple Inc."/></div>
            <div class="form-group"><label>Ticker *</label><input id="h-ticker" value="${h?.ticker || ''}" placeholder="AAPL"/></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Asset Class</label>
              <select id="h-class">
                ${['Equity','Fixed Income','Cash','Real Estate','Commodity','Fund','Other'].map(a => `<option ${(h?.assetClass||'Equity')===a?'selected':''}>${a}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Currency</label>
              <select id="h-currency">
                ${['USD','EUR','GBP','JPY','CHF','MUR'].map(c => `<option ${(h?.currency||'USD')===c?'selected':''}>${c}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Sector</label><input id="h-sector" value="${h?.sector || ''}" placeholder="Technology"/></div>
            <div class="form-group"><label>Geography</label><input id="h-geo" value="${h?.geography || ''}" placeholder="USA"/></div>
          </div>
          <div class="form-row-3">
            <div class="form-group"><label>Quantity *</label><input id="h-qty" type="number" value="${h?.quantity || ''}" placeholder="100"/></div>
            <div class="form-group"><label>Cost Basis (per unit)</label><input id="h-cost" type="number" step="0.01" value="${h?.costBasis || ''}" placeholder="150.00"/></div>
            <div class="form-group"><label>Current Price</label><input id="h-price" type="number" step="0.01" value="${h?.currentPrice || ''}" placeholder="175.00"/></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('holding-modal').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="saveHolding('${h?._id||''}')">Save Holding</button>
          </div>
        </div>
      </div>`);
  };

  window.saveHolding = async function(id) {
    const qty = parseFloat(document.getElementById('h-qty').value) || 0;
    const costBasis = parseFloat(document.getElementById('h-cost').value) || 0;
    const currentPrice = parseFloat(document.getElementById('h-price').value) || costBasis;
    const body = { name: document.getElementById('h-name').value.trim(), ticker: document.getElementById('h-ticker').value.trim().toUpperCase(), assetClass: document.getElementById('h-class').value, currency: document.getElementById('h-currency').value, sector: document.getElementById('h-sector').value, geography: document.getElementById('h-geo').value, quantity: qty, costBasis, currentPrice, marketValue: qty * currentPrice, portfolioId: State.selectedPortfolio };
    if (!body.name || !body.ticker) return toast('Name and ticker required', 'error');
    const r = id ? await PUT(`/holdings/${id}`, body) : await POST('/holdings', body);
    if (r.success !== false) { document.getElementById('holding-modal').remove(); toast(id ? 'Holding updated' : 'Holding added'); render(); }
    else toast(r.error || 'Error', 'error');
  };

  window.deleteHolding = async function(id) {
    if (!confirm('Remove this holding?')) return;
    await DEL(`/holdings/${id}`);
    toast('Holding removed'); render();
  };

  window.showPriceModal = async function() {
    const holdings = await GET(`/holdings?portfolioId=${State.selectedPortfolio}`);
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="price-modal">
        <div class="modal">
          <div class="modal-header"><div class="modal-title">Update Prices</div><button class="modal-close" onclick="document.getElementById('price-modal').remove()">×</button></div>
          <p class="text-muted" style="margin-bottom:16px">Enter current market prices for each holding:</p>
          ${holdings.map(h => `
            <div class="form-row" style="align-items:center;margin-bottom:8px">
              <div style="font-weight:600;font-size:13px;padding:8px 0">${h.name} <span class="badge badge-blue">${h.ticker}</span></div>
              <div class="form-group" style="margin-bottom:0"><input type="number" step="0.01" id="price-${h._id}" value="${h.currentPrice || ''}" placeholder="Current price"/></div>
            </div>`).join('')}
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('price-modal').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="savePrices()">Update All Prices</button>
          </div>
        </div>
      </div>`);
  };

  window.savePrices = async function() {
    const holdings = await GET(`/holdings?portfolioId=${State.selectedPortfolio}`);
    const prices = holdings.map(h => ({ ticker: h.ticker, price: parseFloat(document.getElementById(`price-${h._id}`).value) || h.currentPrice }));
    await POST('/prices/update', { portfolioId: State.selectedPortfolio, prices });
    document.getElementById('price-modal').remove(); toast('Prices updated'); render();
  };

  window.takeSnapshot = async function(portfolioId) {
    const r = await POST('/snapshots', { portfolioId });
    if (r.success) toast('Performance snapshot recorded ✓');
    else toast('Error recording snapshot', 'error');
  };

  render();
}
