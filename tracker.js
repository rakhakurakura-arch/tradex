// tracker.js - Live Price Tracker Logic

let allCoins = [];
let filteredCoins = [];
let currentFilter = 'all'; // all, gainers, losers
let refreshTimer = 30;

document.addEventListener('DOMContentLoaded', async () => {
  await fetchAndRender();
  
  // Setup countdown timer
  setInterval(() => {
    refreshTimer--;
    if (refreshTimer <= 0) {
      refreshTimer = 30;
      fetchAndRender(true); // silent refresh
    }
    const cdEl = document.getElementById('refresh-countdown');
    if(cdEl) cdEl.textContent = refreshTimer;
  }, 1000);

  // Bind UI
  document.getElementById('tracker-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    applyFilters(term);
  });

  const filterBtns = {
    'filter-all': 'all',
    'filter-gainers': 'gainers',
    'filter-losers': 'losers'
  };

  for(const [id, filterVal] of Object.entries(filterBtns)) {
    document.getElementById(id).addEventListener('click', (e) => {
      // Update active btn styling
      Object.keys(filterBtns).forEach(bid => {
        const btn = document.getElementById(bid);
        if(bid === id) {
          btn.classList.remove('btn-secondary');
          btn.classList.add('btn-primary');
        } else {
          btn.classList.add('btn-secondary');
          btn.classList.remove('btn-primary');
        }
      });
      currentFilter = filterVal;
      applyFilters(document.getElementById('tracker-search').value.toLowerCase());
    });
  }
});

async function fetchAndRender(silent = false) {
  if (!silent) {
    document.getElementById('tracker-tbody').innerHTML = `<tr><td colspan="9" class="text-center py-5">
      <i class="fas fa-spinner fa-spin text-green text-lg"></i>
    </td></tr>`;
  }

  try {
    allCoins = await API.getTopCoins(100);
    applyFilters(document.getElementById('tracker-search').value.toLowerCase());
  } catch (e) {
    try {
       const res = await fetch('https://api.coincap.io/v2/assets?limit=100');
       const ccData = await res.json();
       allCoins = ccData.data.map(asset => ({
          id: asset.id,
          symbol: asset.symbol.toLowerCase(),
          name: asset.name,
          current_price: parseFloat(asset.priceUsd),
          price_change_percentage_24h_in_currency: parseFloat(asset.changePercent24Hr),
          market_cap: parseFloat(asset.marketCapUsd),
          total_volume: parseFloat(asset.volumeUsd24Hr),
          image: `https://assets.coincap.io/assets/icons/${asset.symbol.toLowerCase()}@2x.png`
       }));
       applyFilters(document.getElementById('tracker-search').value.toLowerCase());
    } catch (err) {
       if (!silent) {
       }
    }
  }
}

function applyFilters(searchTerm) {
  filteredCoins = allCoins.filter(c => {
    // Search filter
    const searchMatch = c.symbol.toLowerCase().includes(searchTerm) || c.name.toLowerCase().includes(searchTerm);
    if (!searchMatch) return false;
    
    // Type filter
    if (currentFilter === 'gainers') return c.price_change_percentage_24h_in_currency > 0;
    if (currentFilter === 'losers') return c.price_change_percentage_24h_in_currency < 0;
    return true;
  });

  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('tracker-tbody');
  
  if (filteredCoins.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-5 text-muted">No coins match your filters</td></tr>`;
    return;
  }

  let html = '';
  filteredCoins.forEach((c, index) => {
    const p1h = c.price_change_1h || c.price_change_percentage_1h_in_currency || 0;
    const p24h = c.price_change_24h || c.price_change_percentage_24h || c.price_change_percentage_24h_in_currency || 0;
    const p7d = c.price_change_7d || c.price_change_percentage_7d_in_currency || 0;
    
    const isUp = p7d >= 0;
    const sparkId = `spark-${c.id}-${index}`;
    // Provide colored fallback for broken coin icons
    const fallbackLetter = c.symbol.substring(0,1).toUpperCase();
    
    html += `
      <tr>
        <td class="text-muted fw-bold">${c.market_cap_rank || index + 1}</td>
        <td>
          <div class="coin-cell">
            <div class="coin-icon" style="background: var(--bg-surface); color: var(--text-primary);"><img src="${c.image}" onerror="this.outerHTML='<span>${fallbackLetter}</span>'"></div>
            <div class="coin-info">
              <span class="coin-symbol">${c.symbol}</span>
              <span class="coin-name">${c.name}</span>
            </div>
          </div>
        </td>
        <td class="text-right fw-medium">${Core.formatCurrency(c.current_price)}</td>
        <td class="text-right ${Core.getColorClass(p1h)}">${p1h.toFixed(2)}%</td>
        <td class="text-right ${Core.getColorClass(p24h)}">${p24h.toFixed(2)}%</td>
        <td class="text-right hide-mobile ${Core.getColorClass(p7d)}">${p7d.toFixed(2)}%</td>
        <td class="text-right hide-mobile">${Core.formatCurrency(c.market_cap).slice(0, -3)}</td>
        <td class="text-right hide-mobile">${Core.formatCurrency(c.total_volume).slice(0, -3)}</td>
        <td class="text-center">
          <canvas id="${sparkId}" width="120" height="40" style="display:block; margin: 0 auto;"></canvas>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // Draw sparklines after DOM insertion
  filteredCoins.forEach((c, index) => {
    const p7d = c.price_change_7d || c.price_change_percentage_7d_in_currency || 0;
    if (c.sparkline_in_7d && c.sparkline_in_7d.price) {
      drawSparkline(`spark-${c.id}-${index}`, c.sparkline_in_7d.price, p7d >= 0);
    }
  });
}
