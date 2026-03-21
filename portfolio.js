// portfolio.js - Portfolio builder and tracker

let portfolioData = JSON.parse(localStorage.getItem('tradex_portfolio') || '[]');
let allCoinsData = [];
let chartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  await fetchCoinsData();
  renderPortfolio();

  // Search autocomplete logic
  const searchInput = document.getElementById('coin-search-input');
  const resultsDiv = document.getElementById('coin-search-results');

  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    if (term.length < 2) {
      resultsDiv.style.display = 'none';
      return;
    }

    const matches = allCoinsData.filter(c => 
      c.symbol.toLowerCase().includes(term) || c.name.toLowerCase().includes(term)
    ).slice(0, 5);

    if (matches.length > 0) {
      resultsDiv.innerHTML = matches.map(m => `
        <div class="p-2 border-bottom" style="cursor:pointer; border-color:var(--border);" onclick="selectCoin('${m.id}', '${m.symbol}', '${m.name}')">
          <div class="d-flex align-center gap-2">
            <img src="${m.image}" style="width:20px;height:20px;border-radius:50%;">
            <span class="fw-bold">${m.symbol.toUpperCase()}</span>
            <span class="text-muted text-sm">${m.name}</span>
          </div>
        </div>
      `).join('');
      resultsDiv.style.display = 'block';
    } else {
      resultsDiv.innerHTML = '<div class="p-2 text-muted text-sm text-center">No matches found</div>';
      resultsDiv.style.display = 'block';
    }
  });

  document.getElementById('add-asset-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('selected-coin-id').value;
    const symbol = document.getElementById('selected-coin-symbol').value;
    const amount = parseFloat(document.getElementById('asset-amount').value);
    const buyPrice = parseFloat(document.getElementById('asset-price').value);

    if (!id || amount <= 0 || buyPrice < 0) {
      Core.showToast('Please select a valid coin and enter positive amounts', 'error');
      return;
    }

    // Add or merge holding
    const existing = portfolioData.findIndex(p => p.id === id);
    if (existing >= 0) {
      const old = portfolioData[existing];
      const newAmount = old.amount + amount;
      // Recalculate average cost basis
      portfolioData[existing].buyPrice = ((old.amount * old.buyPrice) + (amount * buyPrice)) / newAmount;
      portfolioData[existing].amount = newAmount;
    } else {
      portfolioData.push({ id, symbol, amount, buyPrice });
    }

    savePortfolio();
    renderPortfolio();
    document.getElementById('add-asset-form').reset();
    document.getElementById('add-asset-modal').style.display = 'none';
    Core.showToast('Asset added to portfolio', 'success');
  });

  document.getElementById('export-csv').addEventListener('click', exportCSV);
  
  // Refresh live prices
  setInterval(async () => {
    await fetchCoinsData();
    renderPortfolio();
  }, 60000);
});

window.selectCoin = function(id, symbol, name) {
  document.getElementById('selected-coin-id').value = id;
  document.getElementById('selected-coin-symbol').value = symbol;
  document.getElementById('selected-coin-name').value = name;
  document.getElementById('coin-search-input').value = `${name} (${symbol.toUpperCase()})`;
  document.getElementById('coin-search-results').style.display = 'none';
};

window.removeAsset = function(id) {
  portfolioData = portfolioData.filter(p => p.id !== id);
  savePortfolio();
  renderPortfolio();
  Core.showToast('Asset removed', 'info');
};

function savePortfolio() {
  localStorage.setItem('tradex_portfolio', JSON.stringify(portfolioData));
}

async function fetchCoinsData() {
  try {
    // API spec required method `getTopCoins` cache integrated
    allCoinsData = await API.getTopCoins(150); 
  } catch (err) {
    console.error('Portfolio fail to load coins:', err);
  }
}

async function renderPortfolio() {
  // We need current rates for conversions
  const fxData = await API.getExchangeRate();
  const idrRate = fxData?.rates?.IDR || 15500;

  const tbody = document.getElementById('holdings-tbody');
  
  if (portfolioData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted">Portfolio is empty. Click "Add Asset" to begin.</td></tr>';
    updateSummaries(0, 0, 0, null, idrRate);
    renderChart([]);
    return;
  }

  let totalValue = 0;
  let totalCost = 0;
  let bestPerformer = { symbol: '-', pct: -999, abs: 0 };
  let chartPoints = [];
  
  let html = '';

  portfolioData.forEach(item => {
    // Match against current market data
    const liveData = allCoinsData.find(c => c.id === item.id) || { current_price: item.buyPrice, image: '', name: item.id };
    const currentPrice = liveData.current_price;
    const value = currentPrice * item.amount;
    const cost = item.buyPrice * item.amount;
    const pnl = value - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
    
    totalValue += value;
    totalCost += cost;

    if (pnlPct > bestPerformer.pct) {
      bestPerformer = { symbol: item.symbol.toUpperCase(), pct: pnlPct, abs: pnl };
    }

    chartPoints.push({ label: item.symbol.toUpperCase(), value: value });

    html += `
      <tr>
        <td>
          <div class="d-flex align-center gap-2">
            <img src="${liveData.image}" style="width:24px;height:24px;border-radius:50%;" onerror="this.style.display='none'">
            <div>
              <div class="fw-bold">${item.symbol.toUpperCase()}</div>
              <div class="text-sm text-muted">${liveData.name}</div>
            </div>
          </div>
        </td>
        <td class="text-right">
          <div>${Core.formatCurrency(currentPrice)}</div>
          <div class="text-muted text-sm">Avg: ${Core.formatCurrency(item.buyPrice)}</div>
        </td>
        <td class="text-right fw-medium">${Core.formatNumber(item.amount, 4)}</td>
        <td class="text-right fw-medium">${Core.formatCurrency(value)}</td>
        <td class="text-right">
           <span class="alloc-pct" data-val="${value}">0%</span>
        </td>
        <td class="text-right">
           <div class="${Core.getColorClass(pnl)}">${Core.formatCurrency(pnl)}</div>
           <div class="text-sm ${Core.getColorClass(pnlPct)}">${Core.formatPercent(pnlPct)}</div>
        </td>
        <td class="text-center">
          <button class="btn btn-secondary btn-sm text-red" onclick="removeAsset('${item.id}')" title="Remove Asset"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  
  // Post-process allocations once total is known
  document.querySelectorAll('.alloc-pct').forEach(el => {
    const val = parseFloat(el.getAttribute('data-val'));
    const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;
    el.textContent = `${pct.toFixed(2)}%`;
  });

  updateSummaries(totalValue, (totalValue - totalCost), totalCost, bestPerformer, idrRate);
  renderChart(chartPoints);
}

function updateSummaries(totalValue, totalPnl, totalCost, bestPerformer, idrRate) {
  document.getElementById('port-total-usd').textContent = Core.formatCurrency(totalValue);
  document.getElementById('port-total-idr').textContent = Core.formatCurrency(totalValue * idrRate, 'IDR').replace('$', 'Rp');
  
  const pnlEl = document.getElementById('port-pnl-usd');
  pnlEl.textContent = Core.formatCurrency(totalPnl);
  pnlEl.className = `mb-1 ${Core.getColorClass(totalPnl)}`;

  const pnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const pnlBadge = document.getElementById('port-pnl-percent');
  pnlBadge.textContent = Core.formatPercent(pnlPct);
  pnlBadge.className = `badge ${pnlPct >= 0 ? 'badge-green' : 'badge-red'}`;

  const bestCard = document.getElementById('port-best-card');
  if (bestPerformer && bestPerformer.symbol !== '-') {
    bestCard.innerHTML = `
      <div class="fw-bold text-lg">${bestPerformer.symbol}</div>
      <div class="text-right">
         <div class="${Core.getColorClass(bestPerformer.pct)}">${Core.formatPercent(bestPerformer.pct)}</div>
         <div class="text-sm text-muted">${Core.formatCurrency(bestPerformer.abs)}</div>
      </div>
    `;
  } else {
    bestCard.innerHTML = '<div class="text-muted">No profit data</div>';
  }
}

function renderChart(dataPoints) {
  const ctx = document.getElementById('allocation-chart').getContext('2d');
  
  if(chartInstance) chartInstance.destroy();
  
  if (dataPoints.length === 0) return;

  // Generate colors procedurally
  const colors = [
    getComputedStyle(document.documentElement).getPropertyValue('--accent-green').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--accent-blue').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--accent-yellow').trim(),
    '#a855f7', '#ec4899', '#f97316', '#06b6d4', '#8b5cf6'
  ];

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: dataPoints.map(d => d.label),
      datasets: [{
        data: dataPoints.map(d => d.value),
        backgroundColor: colors.slice(0, dataPoints.length).concat(Array(Math.max(0, dataPoints.length - 8)).fill('#666')),
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'right',
          labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const total = context.chart._metasets[context.datasetIndex].total;
              const pct = ((val / total) * 100).toFixed(1);
              return `${context.label}: ${Core.formatCurrency(val)} (${pct}%)`;
            }
          }
        }
      }
    }
  });

  // Rebind theme changes
  window.addEventListener('themechanged', () => { renderChart(dataPoints); }, {once: true});
}

function exportCSV() {
  if (portfolioData.length === 0) return;
  
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Coin,Amount,AvgBuyPrice\n";
  
  portfolioData.forEach(p => {
    csvContent += `${p.symbol.toUpperCase()},${p.amount},${p.buyPrice}\n`;
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `tradex_portfolio_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
