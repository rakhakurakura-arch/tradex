// dashboard.js - Main authentication dashboard logic

let btcChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = Core.getUser();
  if (user) {
    document.getElementById('greeting').textContent = `Welcome Back, ${user.username}`;
  }

  await loadDashboardData();
  
  // Set up refresh cycles
  setInterval(loadDashboardData, 60000); // 1 minute price
  
  document.getElementById('refresh-ai-btn').addEventListener('click', async () => {
    const btn = document.getElementById('refresh-ai-btn');
    btn.querySelector('i').classList.add('fa-spin');
    await loadAIPulse();
    btn.querySelector('i').classList.remove('fa-spin');
  });
});

async function loadDashboardData() {
  let coins = [];
  try {
    coins = await API.getTopCoins(20);
  } catch (e) {
    try {
       const res = await fetch('https://api.coincap.io/v2/assets?limit=20');
       const ccData = await res.json();
       coins = ccData.data.map(asset => ({
          id: asset.id,
          symbol: asset.symbol.toLowerCase(),
          name: asset.name,
          current_price: parseFloat(asset.priceUsd),
          price_change_percentage_24h_in_currency: parseFloat(asset.changePercent24Hr),
          market_cap: parseFloat(asset.marketCapUsd),
          total_volume: parseFloat(asset.volumeUsd24Hr),
          image: `https://assets.coincap.io/assets/icons/${asset.symbol.toLowerCase()}@2x.png`
       }));
    } catch (err) {
       Core.showToast('Error loading dashboard data', 'error');
       return;
    }
  }

  try {
    updateTopIndicators(coins);
    renderTopMovers(coins);
    renderBTCChart(coins);
    
    // Non-blocking loads for slower APIs
    loadFearGreed();
    loadAIPulse(coins);
    loadNews();
  } catch (error) {
    Core.showToast('Error loading dashboard data', 'error');
    console.error(error);
  }
}

function updateTopIndicators(coins) {
  const btc = coins.find(c => c.symbol.toLowerCase() === 'btc');
  const eth = coins.find(c => c.symbol.toLowerCase() === 'eth');

  if (btc) {
    document.getElementById('dash-btc-price').textContent = Core.formatCurrency(btc.current_price);
    document.getElementById('dash-btc-price').classList.remove('skeleton-text-short');
    
    const change = btc.price_change_24h || btc.price_change_percentage_24h || 0;
    const badge = document.getElementById('dash-btc-change');
    badge.textContent = change.toFixed(2) + '%';
    badge.className = change >= 0 ? 'badge badge-green' : 'badge badge-red';
  }

  if (eth) {
    document.getElementById('dash-eth-price').textContent = Core.formatCurrency(eth.current_price);
    document.getElementById('dash-eth-price').classList.remove('skeleton-text-short');
    
    const change = eth.price_change_24h || eth.price_change_percentage_24h || 0;
    const badge = document.getElementById('dash-eth-change');
    badge.textContent = change.toFixed(2) + '%';
    badge.className = change >= 0 ? 'badge badge-green' : 'badge badge-red';
  }

  // Calculate generic market cap from top 20
  const totalCap = coins.reduce((acc, c) => acc + (c.market_cap || 0), 0);
  document.getElementById('dash-mcap').textContent = Core.formatCurrency(totalCap).substring(0, 8) + 'B+';
  document.getElementById('dash-mcap').classList.remove('skeleton-text-short');
}

async function loadFearGreed() {
  try {
    const fngData = await API.getFearGreed();
    if(fngData && fngData.data && fngData.data.length > 0) {
      const today = fngData.data[0];
      const valText = document.getElementById('dash-fng-val');
      const label = document.getElementById('dash-fng-label');
      const bar = document.getElementById('dash-fng-bar');

      valText.textContent = today.value;
      valText.className = '';
      label.textContent = today.value_classification;
      
      const v = parseInt(today.value);
      bar.style.width = `${v}%`;

      if (v < 25) { label.className = 'badge badge-red'; bar.style.background = 'var(--accent-red)'; }
      else if (v < 45) { label.className = 'badge badge-yellow'; bar.style.background = 'var(--accent-yellow)'; }
      else if (v <= 55) { label.className = 'badge badge-blue'; bar.style.background = 'var(--accent-blue)'; }
      else if (v <= 75) { label.className = 'badge badge-green'; bar.style.background = 'var(--accent-green)'; }
      else { label.className = 'badge badge-green'; bar.style.background = '#00ffcc'; }
    }
  } catch (err) {
    console.warn(err);
  }
}

function renderTopMovers(coins) {
  const moversContainer = document.getElementById('top-movers-list');
  
  const gainers = [...coins]
     .filter(c => (c.price_change_24h || c.price_change_percentage_24h || 0) > 0)
     .sort((a, b) => (b.price_change_24h || b.price_change_percentage_24h || 0) - (a.price_change_24h || a.price_change_percentage_24h || 0))
     .slice(0, 5);
     
  const losers = [...coins]
     .filter(c => (c.price_change_24h || c.price_change_percentage_24h || 0) < 0)
     .sort((a, b) => (a.price_change_24h || a.price_change_percentage_24h || 0) - (b.price_change_24h || b.price_change_percentage_24h || 0))
     .slice(0, 5);

  let html = '<div class="fw-bold mb-2 text-green">Top Gainers</div>';
  if(gainers.length === 0) html += '<div class="text-muted mb-3">No Gainers</div>';
  gainers.forEach(c => {
    const chg = c.price_change_24h || c.price_change_percentage_24h || 0;
    const color = chg >= 0 ? 'text-green' : 'text-red';
    html += `
      <div class="d-flex justify-between align-center mb-3">
        <div class="coin-cell" style="gap:0.5rem;">
          <div class="coin-icon" style="width:24px;height:24px;"><img src="${c.image}"></div>
          <div>
            <div class="fw-bold">${c.symbol.toUpperCase()}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="fw-medium">${Core.formatCurrency(c.current_price)}</div>
          <div class="text-sm ${color}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</div>
        </div>
      </div>
    `;
  });

  html += '<div class="fw-bold mt-4 mb-2 text-red">Top Losers</div>';
  if(losers.length === 0) html += '<div class="text-muted mb-3">No Losers</div>';
  losers.forEach(c => {
    const chg = c.price_change_24h || c.price_change_percentage_24h || 0;
    const color = chg >= 0 ? 'text-green' : 'text-red';
    html += `
      <div class="d-flex justify-between align-center mb-3">
        <div class="coin-cell" style="gap:0.5rem;">
          <div class="coin-icon" style="width:24px;height:24px;"><img src="${c.image}"></div>
          <div>
            <div class="fw-bold">${c.symbol.toUpperCase()}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="fw-medium">${Core.formatCurrency(c.current_price)}</div>
          <div class="text-sm ${color}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</div>
        </div>
      </div>
    `;
  });

  moversContainer.innerHTML = html;
}

function renderBTCChart(coins) {
  const ctx = document.getElementById('btcChart').getContext('2d');
  const btc = coins.find(c => c.symbol.toLowerCase() === 'btc');
  
  if(!btc || !btc.sparkline_in_7d || !btc.sparkline_in_7d.price) return;
  
  const prices = btc.sparkline_in_7d.price;
  const labels = prices.map((_, i) => i);
  
  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? getComputedStyle(document.documentElement).getPropertyValue('--accent-green').trim() 
                     : getComputedStyle(document.documentElement).getPropertyValue('--accent-red').trim();
  
  if (btcChartInstance) {
    btcChartInstance.destroy();
  }

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, color + '66'); // 40% opacity
  gradient.addColorStop(1, color + '00'); // 0% opacity

  btcChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'BTC Price',
        data: prices,
        borderColor: color,
        borderWidth: 2,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              return Core.formatCurrency(context.raw);
            }
          }
        }
      },
      scales: {
        x: { display: false },
        y: { 
          display: true, 
          position: 'right',
          grid: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--border').trim(),
            drawBorder: false,
          },
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(),
            callback: function(value) { return '$' + value.toLocaleString(); }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });

  // Re-render chart on theme change to update axis colors
  window.addEventListener('themechanged', () => {
     renderBTCChart(coins);
  });
}

async function loadAIPulse(coins = null) {
  const container = document.getElementById('ai-pulse-content');
  
  if(!localStorage.getItem('groqApiKey')) {
    container.innerHTML = `
      <div class="text-center py-3">
        <i class="fas fa-lock text-muted text-lg mb-2"></i>
        <p class="mb-2">Connect your Groq API key to unlock real-time AI market analysis.</p>
        <a href="settings.html" class="btn btn-outline btn-sm">Set API Key</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text-short"></div>
  `;

  try {
    let summaryData = "Current Market Check";
    if (coins) {
       const btc = coins.find(c => c.symbol.toLowerCase() === 'btc');
       const eth = coins.find(c => c.symbol.toLowerCase() === 'eth');
       summaryData = `BTC is ${btc.current_price} (${btc.price_change_percentage_24h_in_currency}% 24h). ETH is ${eth.current_price} (${eth.price_change_percentage_24h_in_currency}% 24h).`;
    }

    const prompt = `Analyze this brief market data and provide a 2 sentence pulse check on the market sentiment. Be professional, concise, and act as an institutional trader. Data: ${summaryData}`;
    const analysis = await API.askGroq(prompt);
    
    container.innerHTML = marked.parse(analysis);
  } catch (error) {
     container.innerHTML = `<p class="text-red"><i class="fas fa-exclamation-triangle"></i> API Error. Check your Groq Key in Settings.</p>`;
  }
}

async function loadNews() {
  const container = document.getElementById('dash-news-list');
  try {
    const news = await API.getNews();
    if(news && news.results) {
      let html = '';
      news.results.slice(0, 4).forEach(item => {
        const timeAgo = Math.floor((new Date() - new Date(item.created_at)) / 60000);
        const timeStr = timeAgo > 60 ? `${Math.floor(timeAgo/60)}h ago` : `${timeAgo}m ago`;
        
        html += `
          <div style="border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
            <a href="${item.url || '#'}" target="_blank" class="fw-medium text-primary d-block mb-1 text-sm" style="line-height:1.4;">
               ${item.title.substring(0,60)}${item.title.length > 60 ? '...' : ''}
            </a>
            <div class="d-flex justify-between text-muted" style="font-size:0.75rem;">
              <span>${item.source.title}</span>
              <span>${timeStr}</span>
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
    }
  } catch(err) {
     container.innerHTML = `<p class="text-muted">News aggregation currently unavailable.</p>`;
  }
}
