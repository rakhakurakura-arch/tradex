// landing.js - Handles logic specific to the unauthenticated Landing page

document.addEventListener('DOMContentLoaded', async () => {
  // If user is already logged in, they optionally could be redirected to dashboard
  // But spec says index.html is fully public.

  await renderTicker();
  await updateHeroPrices();
  
  // Refresh hero prices every 60 seconds
  setInterval(updateHeroPrices, 60000);
});

async function renderTicker() {
  const tickerEl = document.getElementById('landing-ticker');
  if(!tickerEl) return;

  try {
    const coins = await API.getTopCoins(15);
    let html = '';
    
    // Duplicate for seamless infinite scrolling loop
    const combinedCoins = [...coins, ...coins];
    
    combinedCoins.forEach(coin => {
      const chg = coin.price_change_24h || coin.price_change_percentage_24h || coin.price_change_percentage_24h_in_currency || 0;
      const isUp = chg >= 0;
      const colorCls = isUp ? 'text-green' : 'text-red';
      const arrow = isUp ? 'fa-caret-up' : 'fa-caret-down';
      
      html += `
        <div class="ticker-item">
          <img src="${coin.image}" style="width:16px; height:16px;" alt="${coin.symbol}">
          <span>${coin.symbol.toUpperCase()}</span>
          <span>${Core.formatCurrency(coin.current_price)}</span>
          <span class="${colorCls}"><i class="fas ${arrow}"></i> ${chg.toFixed(2)}%</span>
        </div>
      `;
    });
    
    tickerEl.innerHTML = html;
  } catch (err) {
    tickerEl.innerHTML = '<div class="ticker-item text-red">Error loading market data.</div>';
  }
}

async function updateHeroPrices() {
  try {
    const coins = await API.getTopCoins(10);
    const btc = coins.find(c => c.symbol.toLowerCase() === 'btc');
    const eth = coins.find(c => c.symbol.toLowerCase() === 'eth');

    if(btc) {
      document.getElementById('btc-price').textContent = Core.formatCurrency(btc.current_price);
      document.getElementById('btc-price').classList.remove('skeleton-text-short');
      
      const change = btc.price_change_24h || btc.price_change_percentage_24h || btc.price_change_percentage_24h_in_currency || 0;
      const changeEl = document.getElementById('btc-change');
      changeEl.textContent = change.toFixed(2) + '%';
      changeEl.className = change >= 0 ? 'badge badge-green' : 'badge badge-red';
    }

    if(eth) {
      document.getElementById('eth-price').textContent = Core.formatCurrency(eth.current_price);
      document.getElementById('eth-price').classList.remove('skeleton-text-short');
      
      const change = eth.price_change_24h || eth.price_change_percentage_24h || eth.price_change_percentage_24h_in_currency || 0;
      const changeEl = document.getElementById('eth-change');
      changeEl.textContent = change.toFixed(2) + '%';
      changeEl.className = change >= 0 ? 'badge badge-green' : 'badge badge-red';
    }
  } catch (err) {
    console.error("Hero pricing issue:", err);
  }
}
