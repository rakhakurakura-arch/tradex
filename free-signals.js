// free-signals.js - Public delayed community feed 

const FREE_PAIRS = ['BTC', 'ETH', 'SOL', 'MATIC', 'AVAX', 'LINK'];
let freeSignals = [];

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('btn-refresh-free').addEventListener('click', async (e) => {
     const icon = e.currentTarget.querySelector('i');
     icon.classList.add('fa-spin');
     await generateFreeSignals();
     icon.classList.remove('fa-spin');
  });

  await generateFreeSignals();
});

async function generateFreeSignals() {
  const container = document.getElementById('free-feed-container');
  container.innerHTML = Array(3).fill('<div class="card"><div class="skeleton-chart" style="height:80px;"></div></div>').join('');
  
  try {
     const marketData = await API.getTopCoins(30);
     freeSignals = [];
     let bullBias = 0;
     let bearBias = 0;

     // Synthesize delayed signal lookalikes based on real data
     FREE_PAIRS.forEach(sym => {
        const coin = marketData.find(c => c.symbol.toUpperCase() === sym);
        if(!coin) return;

        const px = coin.current_price;
        const chg = coin.price_change_percentage_24h || 0;
        
        let direction = 'NEUTRAL';
        let act = 'HOLD';
        // Base logic on 24h trend to simulate basic TA
        if(chg > 3) { direction = 'LONG'; act = 'BUY'; bullBias++; }
        else if (chg < -3) { direction = 'SHORT'; act = 'SELL'; bearBias++; }
        
        // Target creation (conservative for free feed)
        const tp = direction === 'LONG' ? px * 1.02 : direction === 'SHORT' ? px * 0.98 : px;
        const sl = direction === 'LONG' ? px * 0.97 : direction === 'SHORT' ? px * 1.03 : px;
        
        // Add artificial delay (e.g. signal generated 45 mins ago)
        const timeDelayMs = Math.floor(Math.random() * 3600000) + 900000; 
        
        if (direction !== 'NEUTRAL') {
           freeSignals.push({
              symbol: sym,
              action: act,
              direction: direction,
              priceEntry: px * (direction==='LONG'?0.99:1.01), // fake past entry
              priceCurrent: px,
              tp: tp,
              sl: sl,
              timestamp: Date.now() - timeDelayMs,
              pnlOpen: chg / 2 // synthetic current pnl
           });
        }
     });

     // Sort by newest
     freeSignals.sort((a,b) => b.timestamp - a.timestamp);

     updateMetrics(freeSignals.length, bullBias, bearBias);
     renderFeed();

  } catch(e) {
     console.error("Free signals error", e);
     container.innerHTML = `<div class="card text-center text-red p-4">Error loading market data. Try again later.</div>`;
  }
}

function updateMetrics(count, bull, bear) {
  document.getElementById('free-sig-count').textContent = count;
  
  // Fake accuracy metric for marketing
  document.getElementById('free-sig-accuracy').textContent = '68.4%';
  
  const biasEl = document.getElementById('free-sig-bias');
  if(bull > bear + 1) {
     biasEl.textContent = 'Bullish';
     biasEl.className = 'text-2xl fw-bold text-green';
  } else if (bear > bull + 1) {
     biasEl.textContent = 'Bearish';
     biasEl.className = 'text-2xl fw-bold text-red';
  } else {
     biasEl.textContent = 'Neutral Chop';
     biasEl.className = 'text-2xl fw-bold text-yellow';
  }
}

function renderFeed() {
  const container = document.getElementById('free-feed-container');
  if(freeSignals.length === 0) {
     container.innerHTML = `<div class="card text-center p-4 text-muted">No clear actionable setups found on free pairs right now. Check back later or upgrade to Pro.</div>`;
     return;
  }

  let html = '';
  freeSignals.forEach(s => {
     const badgeClass = s.direction === 'LONG' ? 'badge-green' : 'badge-red';
     const pnlClass = s.pnlOpen > 0 ? 'text-green' : 'text-red';
     
     // Time elapsed
     const minsAgo = Math.floor((Date.now() - s.timestamp) / 60000);

     html += `
        <div class="card p-4 relative fade-in" style="overflow:hidden;">
           <div class="d-flex justify-between align-start mb-3">
              <div class="d-flex align-center gap-2">
                 <div class="fw-bold text-lg">${s.symbol}</div>
                 <div class="badge ${badgeClass}">${s.action}</div>
              </div>
              <div class="text-sm text-muted bg-secondary px-2 py-1 rounded">
                 <i class="fas fa-history mr-1"></i> ${minsAgo}m ago (Delayed view)
              </div>
           </div>
           
           <div class="grid grid-3 text-sm gap-2">
              <div>
                 <div class="text-muted">Orig. Entry</div>
                 <div class="fw-bold">${Core.formatCurrency(s.priceEntry)}</div>
              </div>
              <div>
                 <div class="text-muted">Target (TP1)</div>
                 <div class="fw-bold text-green">${Core.formatCurrency(s.tp)}</div>
              </div>
               <div>
                 <div class="text-muted">Stop Loss</div>
                 <div class="fw-bold text-red">${Core.formatCurrency(s.sl)}</div>
              </div>
           </div>

           <div class="mt-3 pt-3 border-top d-flex justify-between align-center">
              <div>
                 <span class="text-muted text-sm mr-2">Current PnL est:</span>
                 <span class="fw-bold ${pnlClass}">${s.pnlOpen > 0 ? '+' : ''}${s.pnlOpen.toFixed(2)}%</span>
              </div>
              <button class="btn btn-primary btn-sm" onclick="alert('Chart tersedia di versi Pro')"><i class="fas fa-lock mr-1"></i> Unlock Live Chart</button>
           </div>
           
           <div style="position: absolute; top:0; right:0; bottom:0; left:0; pointer-events:none; background: linear-gradient(90deg, transparent 60%, rgba(10,10,10,0.8) 100%);"></div>
        </div>
     `;
  });

  container.innerHTML = html;
}
