// whale-tracker.js - Institutional flow simulator & feed

// Since WebSocket to real WhaleAlert API requires enterprise keys mapping
// We use a high quality generative simulator matching current market prices
// and realistic patterns to demonstrate the functionality and styling for the proto.

const ASSETS = ['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'XRP'];
const EXCHANGES = ['Binance', 'Coinbase', 'Kraken', 'OKX', 'Bitfinex', 'Bybit'];
const UNKNOWN = ['Unknown Wallet', 'Cold Storage'];

let feedInterval;
let isLive = true;
let flowStats = { inflow: 0, outflow: 0, unknown: 0 };
let allAlerts = [];
let currentFilter = 'ALL';

document.addEventListener('DOMContentLoaded', async () => {
  
  // Try to snag real prices for magnitude accuracy
  try {
     const coins = await API.getTopCoins(10);
     ASSETS.forEach(sym => {
        const found = coins.find(c => c.symbol.toUpperCase() === sym);
        if(found) window[`price_${sym}`] = found.current_price;
     });
  } catch(e) {}
  
  // Default fallbacks if API fails
  window.price_BTC = window.price_BTC || 65000;
  window.price_ETH = window.price_ETH || 3500;
  window.price_USDT = 1;
  window.price_USDC = 1;
  window.price_SOL = window.price_SOL || 150;
  window.price_XRP = window.price_XRP || 0.6;

  // Filter handlers
  document.getElementById('btn-filter-all').addEventListener('click', (e) => setFilter('ALL', e.target));
  document.getElementById('btn-filter-tcex').addEventListener('click', (e) => setFilter('TO_EX', e.target));
  document.getElementById('btn-filter-fcex').addEventListener('click', (e) => setFilter('FROM_EX', e.target));
  
  // Toggle
  document.getElementById('live-feed-toggle').addEventListener('change', (e) => {
    isLive = e.target.checked;
    if(isLive) generateFeed();
    else clearInterval(feedInterval);
  });

  // Init
  document.getElementById('whale-tbody').innerHTML = '';
  // Generate a few historical initial
  for(let i=0; i<15; i++) {
    const alert = createMockAlert(true);
    allAlerts.push(alert);
  }
  allAlerts.sort((a,b) => b.ts - a.ts);
  renderTable();
  updateStats();
  
  // Start LIVE
  generateFeed();
});

function setFilter(type, btnEl) {
  currentFilter = type;
  document.querySelectorAll('.btn-secondary').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
  renderTable();
}

function generateFeed() {
  clearInterval(feedInterval);
  feedInterval = setInterval(() => {
    if(!isLive) return;
    
    const alert = createMockAlert(false);
    allAlerts.unshift(alert);
    if(allAlerts.length > 50) allAlerts.pop(); // keep last 50
    
    updateStatsRealtime(alert);
    renderTable();
    
  }, 4500); // New alert roughly every 4.5s
}

function createMockAlert(isHistorical = false) {
  const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
  const price = window[`price_${asset}`];
  
  // USD Value > 5M, < 250M mostly
  const usdValue = Math.floor(Math.random() * 200000000) + 5000000;
  const amount = usdValue / price;
  
  // Source & Dest
  const typeRnd = Math.random();
  let from, to;
  let type = "UNKNOWN"; // TO_EX, FROM_EX, UNKNOWN
  
  if (typeRnd < 0.3) {
     from = UNKNOWN[Math.floor(Math.random() * UNKNOWN.length)];
     to = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
     type = "TO_EX";
  } else if (typeRnd < 0.6) {
     from = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
     to = UNKNOWN[Math.floor(Math.random() * UNKNOWN.length)];
     type = "FROM_EX";
  } else {
     from = UNKNOWN[Math.floor(Math.random() * UNKNOWN.length)];
     to = UNKNOWN[1];
  }

  const ts = isHistorical ? Date.now() - (Math.random() * 3600000) : Date.now();
  
  const hash = '0x' + Array(Math.floor(Math.random()*4)+6).fill(0).map(()=>Math.random().toString(36).charAt(2)).join('');

  return { ts, asset, amount, usdValue, from, to, type, hash, isNew: !isHistorical };
}

function updateStatsRealtime(newAlert) {
  if (newAlert.type === 'TO_EX') flowStats.inflow += newAlert.usdValue;
  else if (newAlert.type === 'FROM_EX') flowStats.outflow += newAlert.usdValue;
  else flowStats.unknown += newAlert.usdValue;
  
  updateDOMStats();
}

function updateStats() { // Rebuild from array
  flowStats = { inflow: 0, outflow: 0, unknown: 0 };
  allAlerts.forEach(a => {
    if (a.type === 'TO_EX') flowStats.inflow += a.usdValue;
    else if (a.type === 'FROM_EX') flowStats.outflow += a.usdValue;
    else flowStats.unknown += a.usdValue;
  });
  updateDOMStats();
}

function updateDOMStats() {
  document.getElementById('whale-inflow').textContent = Core.formatCurrency(flowStats.inflow);
  document.getElementById('whale-outflow').textContent = Core.formatCurrency(flowStats.outflow);
  document.getElementById('whale-unknown').textContent = Core.formatCurrency(flowStats.unknown);
}

function renderTable() {
  const tbody = document.getElementById('whale-tbody');
  
  const filtered = allAlerts.filter(a => {
    if(currentFilter === 'ALL') return true;
    return a.type === currentFilter;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted">No flows matching filters.</td></tr>';
    return;
  }

  let html = '';
  filtered.forEach((a, idx) => {
    const d = new Date(a.ts);
    const timeStr = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
    
    // Impact calculation
    let impactText = 'Neutral';
    let impactClass = 'badge-secondary';
    
    if (a.type === 'TO_EX') {
       impactText = 'Bearish (Sell Pressure)';
       impactClass = 'badge-red';
    } else if (a.type === 'FROM_EX') {
       impactText = 'Bullish (Accumulation)';
       impactClass = 'badge-green';
    }

    // Huge amounts flashing
    const amountClass = a.usdValue > 100000000 ? 'text-red fw-bold text-lg' : 'fw-bold';
    const highlightRow = a.isNew ? 'style="animation: pulse 2s ease-out;"' : '';
    
    if(a.isNew) a.isNew = false; // clear flash flag

    html += `
      <tr class="fade-in" ${highlightRow}>
        <td>
          <div class="fw-bold">${timeStr}</div>
          <div class="text-xs text-muted font-mono">${a.hash}...</div>
        </td>
        <td class="text-right">
          <div class="${amountClass}">${Core.formatNumber(a.amount, 2)} ${a.asset}</div>
          <div class="text-muted text-sm">${Core.formatCurrency(a.usdValue)}</div>
        </td>
        <td class="text-center">
           <div class="badge badge-blue font-mono">${a.asset}</div>
        </td>
        <td>
           <div class="fw-bold">${a.from}</div>
        </td>
        <td>
           <i class="fas fa-arrow-right text-muted mx-2 text-sm" style="display:inline-block; margin:0 5px;"></i>
           <div class="fw-bold d-inline-block">${a.to}</div>
        </td>
        <td class="text-center">
           <span class="badge ${impactClass}">${impactText}</span>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}
