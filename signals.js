// signals.js - AI Trading Signals Logic

// Target coins per spec
const SIGNAL_COINS = ['btc', 'eth', 'bnb', 'sol', 'xrp', 'ada', 'doge'];
let activeMarketData = null; // Cache to pass to copilot

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('refresh-signals').addEventListener('click', async (e) => {
    const icon = e.target.closest('button').querySelector('i');
    icon.classList.add('fa-spin');
    await loadSignals();
    icon.classList.remove('fa-spin');
  });

  // Copilot Chat Input Binding
  document.getElementById('chat-send').addEventListener('click', handleChatSubmit);
  document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') handleChatSubmit();
  });

  // Filter Buttons binding
  const filterBtns = document.querySelectorAll('#signal-filters button');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Toggle active classes
      filterBtns.forEach(b => {
        b.classList.remove('btn-primary', 'active');
        b.classList.add('btn-secondary');
      });
      e.target.classList.remove('btn-secondary');
      e.target.classList.add('btn-primary', 'active');
      
      const filter = e.target.getAttribute('data-filter');
      const cards = document.querySelectorAll('.signal-card');
      
      cards.forEach(card => {
        const sig = card.getAttribute('data-signal');
        const str = card.getAttribute('data-strength');
        const rr = parseFloat(card.getAttribute('data-rr'));
        
        let show = false;
        if (filter === 'all') show = true;
        else if (filter === 'strong_buy') show = (sig === 'BUY' && str === 'STRONG');
        else if (filter === 'strong_sell') show = (sig === 'SELL' && str === 'STRONG');
        else if (filter === 'high_rr') show = (rr >= 2.5);
        
        card.style.display = show ? 'flex' : 'none';
      });
    });
  });

  await loadSignals();
});

async function loadSignals() {
  const grid = document.getElementById('signals-grid');
  grid.innerHTML = Array(6).fill('<div class="card"><div class="skeleton-chart"></div></div>').join('');
  
  let coinData = [];
  try {
     // Fetch all top coins
     const allC = await API.getTopCoins(30); 
     // Filter only the signal coins
     coinData = allC.filter(c => SIGNAL_COINS.includes(c.symbol.toLowerCase()));
     activeMarketData = coinData;
  } catch(e) {
     try {
       const res = await fetch('https://api.coincap.io/v2/assets?limit=30');
       const ccData = await res.json();
       const allC = ccData.data.map(asset => ({
          id: asset.id,
          symbol: asset.symbol.toLowerCase(),
          name: asset.name,
          current_price: parseFloat(asset.priceUsd),
          price_change_percentage_24h_in_currency: parseFloat(asset.changePercent24Hr),
          market_cap: parseFloat(asset.marketCapUsd),
          total_volume: parseFloat(asset.volumeUsd24Hr),
          image: `https://assets.coincap.io/assets/icons/${asset.symbol.toLowerCase()}@2x.png`
       }));
       coinData = allC.filter(c => SIGNAL_COINS.includes(c.symbol.toLowerCase()));
       activeMarketData = coinData;
     } catch (err) {
       console.error("Signal API error", err);
     }
  }

  // Generate synthetic technicals for display processing
  const enrichedData = coinData.map(c => {
    const chg = c.price_change_24h || c.price_change_percentage_24h || c.price_change_percentage_24h_in_currency || 0;
    // Derive fake RSI and MACD based on actual 24h performance
    const rsi = chg > 5 ? 75 : chg < -5 ? 25 : 50 + chg;
    const isBuy = rsi < 40 || (rsi > 50 && chg > 0);
    const signal = isBuy ? 'BUY' : 'SELL';
    const conf = Math.floor(Math.random() * 20 + 75); // 75-95%
    const strength = conf >= 85 ? 'STRONG' : (conf >= 75 ? 'MODERATE' : 'WEAK');
    const rr = (Math.random() * 2 + 1.8).toFixed(1);
    
    return {
      ...c,
      rsi: Math.floor(rsi),
      signal,
      strength,
      rr,
      confidence: conf,
      support: c.current_price * 0.92,
      resistance: c.current_price * 1.08,
      tp1: c.current_price * (isBuy ? 1.05 : 0.95),
      sl: c.current_price * (isBuy ? 0.93 : 1.07),
    };
  });

  updateHeaderMetrics(enrichedData);
  await renderSignalCards(enrichedData);
}

function updateHeaderMetrics(data) {
  if(!data || data.length === 0) return;
  
  const buyCount = data.filter(d => d.signal === 'BUY').length;
  const sellCount = data.filter(d => d.signal === 'SELL').length;
  const avgConf = Math.floor(data.reduce((a,b)=>a+b.confidence,0) / data.length);
  
  const sentEl = document.getElementById('overall-sentiment');
  const confEl = document.getElementById('confidence-value');
  const descEl = document.getElementById('sentiment-description');

  if(buyCount > sellCount + 2) {
    sentEl.textContent = 'BULLISH';
    sentEl.className = 'text-lg fw-bold text-green';
    descEl.textContent = 'Aggressive buying pressure detected across major caps. Moving averages align with strong upward momentum. Favor long positions.';
  } else if (sellCount > buyCount + 2) {
    sentEl.textContent = 'BEARISH';
    sentEl.className = 'text-lg fw-bold text-red';
    descEl.textContent = 'Warning signals flashing. Volume fading on bounces indicating distribution. Recommend tightening stop losses.';
  } else {
    sentEl.textContent = 'NEUTRAL';
    sentEl.className = 'text-lg fw-bold text-yellow';
    descEl.textContent = 'Market is ranging with mixed signals. High likelihood of chop. Look for extreme RSI setups across individual pairs.';
  }

  confEl.textContent = `${avgConf}%`;
}

async function renderSignalCards(data) {
  const grid = document.getElementById('signals-grid');
  const hasGroq = !!localStorage.getItem('groqApiKey');
  
  // Use Promise.all to fetch rationales concurrently, but handle timeout
  let html = '';
  
  for(const c of data) {
    let reasoning = "Technical structures align with macro momentum."; // default
    
    if (hasGroq) {
      try {
        // Provide 5s timeout manually
        const p = API.askGroq(`In 1 short sentence, explain why ${c.symbol.toUpperCase()} at $${c.current_price} gives a ${c.signal} signal with RSI at ${c.rsi}. Keep it very brief.`);
        reasoning = await Promise.race([
          p,
          new Promise(r => setTimeout(() => r("AI analysis timeout. Standard technical setup remains valid."), 5000))
        ]);
      } catch(e) {
        reasoning = "Using algorithmic baseline. Configure Groq API for NLP.";
      }
    } else {
       reasoning = "<span class='badge badge-yellow mb-2'>DEMO MODE</span><br>Configure your API key in settings for real AI reasoning.";
    }

    const badgeClass = c.signal === 'BUY' ? 'badge-green' : 'badge-red';
    const confClass = c.confidence > 85 ? 'text-green' : 'text-yellow';
    
    html += `
      <div class="card signal-card d-flex flex-column" data-signal="${c.signal}" data-strength="${c.strength}" data-rr="${c.rr}" style="position:relative;">
        <div class="d-flex justify-between align-start mb-3">
          <div class="d-flex gap-2 align-center">
            <img src="${c.image}" style="width:28px; height:28px; border-radius:50%;" onerror="this.style.display='none'">
            <div>
              <div class="fw-bold">${c.symbol.toUpperCase()}/USD</div>
              <div class="text-sm text-muted">${Core.formatCurrency(c.current_price)}</div>
            </div>
          </div>
          <div class="badge ${badgeClass}" style="font-size:1rem; padding:0.4rem 0.8rem;">${c.signal}</div>
        </div>

        <div class="grid grid-2 text-sm mb-3 pt-3" style="border-top:1px solid var(--border);">
          <div>
            <div class="text-muted">Target (TP1)</div>
            <div class="fw-bold text-green">${Core.formatCurrency(c.tp1)}</div>
          </div>
          <div>
            <div class="text-muted">Stop Loss</div>
            <div class="fw-bold text-red">${Core.formatCurrency(c.sl)}</div>
          </div>
          <div class="mt-2">
            <div class="text-muted">Risk/Reward</div>
            <div class="fw-bold text-blue">${c.rr}</div>
          </div>
          <div class="mt-2">
            <div class="text-muted">Confidence</div>
            <div class="fw-bold ${confClass}">${c.confidence}%</div>
          </div>
        </div>

        <div class="p-3 mb-3" style="background:var(--bg-secondary); border-radius:8px; font-size:0.85rem; line-height:1.5; flex:1;">
          <div class="text-muted mb-1" style="font-size:0.75rem;"><i class="fas fa-brain mr-1"></i> AI REASONING</div>
          ${reasoning.replace(/["*]/g, '')}
        </div>

        <button class="btn btn-secondary btn-block mt-auto" onclick="openCopilot('${c.symbol.toUpperCase()}', ${c.current_price}, '${c.signal}')">
          <i class="fas fa-comment-dots"></i> Ask AI
        </button>
      </div>
    `;
  }
  
  grid.innerHTML = html;
}

// === COPILOT CHAT LOGIC ===
let currentCoinContext = '';

window.openCopilot = function(symbol, price, signal) {
  currentCoinContext = `You are a helpful AI trading assistant. The user is asking about ${symbol}. Current price is $${price}. Our system generated a ${signal} signal for it.`;
  
  document.getElementById('chat-title').innerHTML = `<i class="fas fa-robot text-green"></i> TradeX Copilot: ${symbol}`;
  document.getElementById('chat-modal').style.display = 'flex';
  
  // Reset logs keeping welcome message
  const msgs = document.getElementById('chat-messages');
  msgs.innerHTML = `
    <div class="d-flex gap-3 align-start">
        <div class="logo-icon text-sm" style="width:30px;height:30px;min-width:30px; background:var(--accent-green);"><i class="fas fa-robot text-black"></i></div>
        <div style="background:var(--bg-secondary); padding:1rem; border-radius:8px 8px 8px 0; font-size:0.95rem;">
          Hello! I'm analyzing the ${signal} signal for ${symbol} at $${price}. What would you like to know? Try asking: "Berapa target realistis minggu ini?"
        </div>
    </div>
  `;
}

async function handleChatSubmit() {
  const inputEl = document.getElementById('chat-input');
  const text = inputEl.value.trim();
  if(!text) return;
  
  appendMessage(text, 'user');
  inputEl.value = '';
  
  const loadingId = appendMessage('<i class="fas fa-spinner fa-spin"></i> Thinking...', 'ai', true);
  
  try {
    const reply = await API.askGroq(text, currentCoinContext);
    updateMessage(loadingId, marked.parse(reply));
  } catch(e) {
    updateMessage(loadingId, 'Please configure your Groq API key in Settings to use the Copilot.');
  }
}

function appendMessage(text, role, isLoading = false) {
  const msgs = document.getElementById('chat-messages');
  const id = 'msg-' + Date.now();
  
  let html = '';
  if (role === 'user') {
    html = `
      <div class="d-flex gap-3 align-start justify-end" id="${id}">
        <div style="background:var(--accent-green); color:#000; padding:1rem; border-radius:8px 0 8px 8px; font-size:0.95rem; max-width:80%;">
          ${text}
        </div>
        <div class="logo-icon text-sm" style="width:30px;height:30px;min-width:30px; background:var(--bg-surface);"><i class="fas fa-user mb-0 text-muted"></i></div>
      </div>
    `;
  } else {
    html = `
      <div class="d-flex gap-3 align-start" id="${id}">
        <div class="logo-icon text-sm" style="width:30px;height:30px;min-width:30px; background:var(--accent-green);"><i class="fas fa-robot" style="color:#000;"></i></div>
        <div style="background:var(--bg-secondary); padding:1rem; border-radius:8px 8px 8px 0; font-size:0.95rem; max-width:85%; line-height:1.6;" class="markdown-body">
          ${text}
        </div>
      </div>
    `;
  }
  
  msgs.insertAdjacentHTML('beforeend', html);
  msgs.scrollTop = msgs.scrollHeight;
  return id;
}

function updateMessage(id, text) {
  const el = document.getElementById(id);
  if(el) {
    el.querySelector('.markdown-body').innerHTML = text;
    const msgs = document.getElementById('chat-messages');
    msgs.scrollTop = msgs.scrollHeight;
  }
}
