// screener.js - Dynamic Crypto Asset Screener

let allAssets = [];
let filteredAssets = [];
let currentSort = { column: 'mcap', asc: false };

document.addEventListener('DOMContentLoaded', async () => {
  await loadScreenerData();
  
  // Bind filters
  const filters = ['perf', 'vol', 'mcap', 'price'];
  filters.forEach(f => {
    document.getElementById(`filter-${f}`).addEventListener('change', applyFilters);
  });

  document.getElementById('screener-search').addEventListener('input', applyFilters);
  
  document.getElementById('btn-reset-filters').addEventListener('click', () => {
    filters.forEach(f => document.getElementById(`filter-${f}`).value = 'ALL');
    document.getElementById('screener-search').value = '';
    applyFilters();
  });
});

async function loadScreenerData() {
  try {
    // Fetch a larger set for screening
    allAssets = await API.getTopCoins(250);
    filteredAssets = [...allAssets];
    applyFilters();
  } catch (err) {
    console.error("Screener data load error", err);
    document.getElementById('screener-tbody').innerHTML = `<tr><td colspan="6" class="text-center text-red py-5">Failed to load market data. Check API connection.</td></tr>`;
  }
}

function applyFilters() {
  const fPerf = document.getElementById('filter-perf').value;
  const fVol = document.getElementById('filter-vol').value;
  const fMcap = document.getElementById('filter-mcap').value;
  const fPrice = document.getElementById('filter-price').value;
  const searchT = document.getElementById('screener-search').value.toLowerCase();

  filteredAssets = allAssets.filter(c => {
    // Search match
    if (searchT && !c.symbol.toLowerCase().includes(searchT) && !c.name.toLowerCase().includes(searchT)) return false;

    // Performance match
    const chg = c.price_change_24h || c.price_change_percentage_24h || c.price_change_percentage_24h_in_currency || 0;
    if (fPerf === 'GAINERS_10' && chg < 10) return false;
    if (fPerf === 'GAINERS_5' && chg < 5) return false;
    if (fPerf === 'LOSERS_5' && chg > -5) return false;
    if (fPerf === 'LOSERS_10' && chg > -10) return false;

    // Volume Match
    const vol = c.total_volume || 0;
    if (fVol === 'HIGH' && vol < 100000000) return false;
    if (fVol === 'MED' && (vol < 10000000 || vol >= 100000000)) return false;
    if (fVol === 'LOW' && vol >= 10000000) return false;

    // Market Cap Match
    const mcap = c.market_cap || 0;
    if (fMcap === 'LARGE' && mcap < 10000000000) return false;
    if (fMcap === 'MID' && (mcap < 1000000000 || mcap >= 10000000000)) return false;
    if (fMcap === 'SMALL' && mcap >= 1000000000) return false;

    // Price Match
    const px = c.current_price || 0;
    if (fPrice === 'PENNY' && px >= 1) return false;
    if (fPrice === 'MID' && (px < 1 || px >= 100)) return false;
    if (fPrice === 'HIGH' && px < 100) return false;

    return true;
  });

  document.getElementById('matches-count').textContent = filteredAssets.length;
  executeSort(); // Re-sort and render
}

window.sortScreener = function(col) {
  if (currentSort.column === col) {
    currentSort.asc = !currentSort.asc; // toggle
  } else {
    currentSort.column = col;
    currentSort.asc = false; // default new cols to descending
  }
  executeSort();
}

function executeSort() {
  filteredAssets.sort((a, b) => {
    let valA, valB;
    switch(currentSort.column) {
      case 'price': valA = a.current_price || 0; valB = b.current_price || 0; break;
      case 'change': valA = a.price_change_24h || a.price_change_percentage_24h || a.price_change_percentage_24h_in_currency || 0; valB = b.price_change_24h || b.price_change_percentage_24h || b.price_change_percentage_24h_in_currency || 0; break;
      case 'vol': valA = a.total_volume || 0; valB = b.total_volume || 0; break;
      case 'mcap': valA = a.market_cap || 0; valB = b.market_cap || 0; break;
      default: valA = a.market_cap || 0; valB = b.market_cap || 0;
    }
    
    if (valA < valB) return currentSort.asc ? -1 : 1;
    if (valA > valB) return currentSort.asc ? 1 : -1;
    return 0;
  });

  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('screener-tbody');
  
  if (filteredAssets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted">No assets found matching exact criteria.</td></tr>';
    return;
  }

  let html = '';
  // Paginate first 50 for performance
  const displaySet = filteredAssets.slice(0, 50);

  displaySet.forEach(c => {
    const pnl = c.price_change_24h || c.price_change_percentage_24h || c.price_change_percentage_24h_in_currency || 0;
    const pnlCls = Core.getColorClass(pnl);
    
    html += `
      <tr class="fade-in">
        <td>
          <div class="d-flex align-center gap-2">
            <img src="${c.image}" style="width:24px;height:24px;border-radius:50%;" onerror="this.style.display='none'">
            <div>
              <div class="fw-bold">${c.symbol.toUpperCase()}</div>
              <div class="text-sm text-muted">${c.name}</div>
            </div>
          </div>
        </td>
        <td class="text-right fw-medium">${Core.formatCurrency(c.current_price)}</td>
        <td class="text-right fw-bold ${pnlCls}">${pnl.toFixed(2)}%</td>
        <td class="text-right d-none-mobile text-muted">${Core.formatCurrency(c.total_volume).split('.')[0]}</td>
        <td class="text-right d-none-mobile text-muted">${Core.formatCurrency(c.market_cap).split('.')[0]}</td>
        <td class="text-center">
          <button class="btn btn-secondary btn-sm" onclick="window.location.href='signals.html?asset=${c.symbol}'"><i class="fas fa-chart-line"></i></button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}
