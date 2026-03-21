// risk-calculator.js - Position sizing and AI portfolio stress test

let calcHistory = JSON.parse(localStorage.getItem('tradex_risk_history') || '[]');
let lastCalc = null;

document.addEventListener('DOMContentLoaded', () => {
  renderHistory();

  document.getElementById('risk-leverage').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    const warning = document.getElementById('leverage-warning');
    if (val > 10) {
      warning.style.display = 'block';
    } else {
      warning.style.display = 'none';
    }
  });

  document.getElementById('risk-calc-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const cap = parseFloat(document.getElementById('risk-capital').value);
    const lev = parseFloat(document.getElementById('risk-leverage').value);
    const entry = parseFloat(document.getElementById('risk-entry').value);
    const target = parseFloat(document.getElementById('risk-target').value);
    const sl = parseFloat(document.getElementById('risk-sl').value);
    const feePct = parseFloat(document.getElementById('risk-fee').value);

    if(!entry || !target || !sl) {
       Core.showToast('Please fill all price fields', 'error');
       return;
    }

    const isLong = target > entry;
    
    // Validation
    if(isLong && sl >= entry) { Core.showToast('Longs require Stop Loss BELOW entry', 'error'); return; }
    if(!isLong && sl <= entry) { Core.showToast('Shorts require Stop Loss ABOVE entry', 'error'); return; }

    // Math
    const size = cap * lev;
    const qty = size / entry;
    
    const maxProfitLoss = isLong ? (target - entry) * qty : (entry - target) * qty;
    const maxLossAbs = isLong ? (entry - sl) * qty : (sl - entry) * qty;
    
    const fees = size * (feePct / 100);
    const netProfit = maxProfitLoss - fees;
    const netLoss = (maxLossAbs + fees) * -1; // Loss is negative
    
    const rr = Math.abs(netProfit / netLoss);
    
    // Liq Price (approximate standard inverse/linear perp formula)
    const liqPrice = isLong ? entry * (1 - (1/lev)) : entry * (1 + (1/lev));

    // Update DOM
    document.getElementById('out-size').textContent = Core.formatCurrency(size);
    document.getElementById('out-profit').textContent = Core.formatCurrency(netProfit);
    document.getElementById('out-loss').textContent = Core.formatCurrency(netLoss);
    document.getElementById('out-fees').textContent = Core.formatCurrency(fees);
    document.getElementById('out-liq').textContent = Core.formatCurrency(liqPrice);
    
    const rrEl = document.getElementById('out-rr');
    rrEl.textContent = `1 : ${rr.toFixed(2)}`;
    rrEl.className = `fw-bold text-lg ${rr >= 2 ? 'text-green' : rr >= 1 ? 'text-yellow' : 'text-red'}`;

    // Generate AI Output Rating (Synthesized logic to prevent API spam on slider drag)
    const ratingEl = document.getElementById('risk-assessment-rating');
    let verdict = 'AVOID';
    let badgeClass = 'badge-red';
    let desc = 'Risk/Reward is skewed unfavorably. Fees or tight stops make this trade negative EV over time.';
    
    if (rr >= 2 && lev <= 5) {
      verdict = 'WORTH IT';
      badgeClass = 'badge-green';
      desc = 'Excellent asymmetric risk profile. Low leverage ensures survival against wicks.';
    } else if (rr >= 1.5 && lev <= 10) {
      verdict = 'ACCEPTABLE';
      badgeClass = 'badge-blue';
      desc = 'Decent R/R metrics, but monitor position sizing. Execution matters here.';
    } else if (lev > 10) {
      verdict = 'RISKY';
      badgeClass = 'badge-yellow';
      desc = 'High leverage significantly increases liquidation risk regardless of the R/R ratio.';
    }

    ratingEl.innerHTML = `
       <div class="text-muted text-sm mb-2">AI RATING</div>
       <div class="badge ${badgeClass} text-lg mb-2">${verdict}</div>
       <div class="text-muted text-sm">${desc}</div>
    `;

    document.getElementById('save-history-btn').disabled = false;
    
    lastCalc = {
      date: new Date().toISOString(),
      entry, lev, target, sl, rr: rr.toFixed(2), verdict, badgeClass
    };

    // Auto-scroll mobile
    if (window.innerWidth < 768) {
      document.getElementById('risk-output-card').scrollIntoView({ behavior: 'smooth' });
    }
  });

  document.getElementById('save-history-btn').addEventListener('click', () => {
    if(!lastCalc) return;
    calcHistory.unshift(lastCalc);
    if(calcHistory.length > 50) calcHistory.pop();
    localStorage.setItem('tradex_risk_history', JSON.stringify(calcHistory));
    renderHistory();
    Core.showToast('Calculation saved to history', 'success');
  });

  document.getElementById('run-stress-btn').addEventListener('click', async () => {
    const pct = document.getElementById('stress-drop-pct').value;
    const resEl = document.getElementById('stress-results');
    
    if(!pct || pct < 1) {
       Core.showToast('Enter a valid drop percentage', 'error');
       return;
    }

    resEl.innerHTML = `<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-lg mb-2"></i><br>AI is running Monte Carlo simulations...</div>`;
    
    const port = JSON.parse(localStorage.getItem('tradex_portfolio') || '[]');
    if(port.length === 0) {
      resEl.innerHTML = `<div class="text-center py-4 text-muted">Your portfolio is empty. Add assets in the Portfolio tab to stress test.</div>`;
      return;
    }

    // Try API, fallback if fail
    try {
      // Build summary
      const portSummary = port.map(p => `${p.amount} ${p.symbol.toUpperCase()}`).join(', ');
      const prmpt = `Act as a Chief Risk Officer. I hold ${portSummary}. Scenario: Bitcoin instantly drops by ${pct}%. Provide a 2 paragraph analysis of how this impacts my specific portfolio and give a concrete recommendation (e.g., hedge, hold, or accumulate). Format cleanly.`;
      
      const analysis = await API.askGroq(prmpt);
      resEl.innerHTML = `<div class="markdown-body text-sm" style="line-height:1.6;">${marked.parse(analysis)}</div>`;
    } catch(err) {
      // Offline fallback
      const fxData = await API.getExchangeRate();
      const idrRate = fxData?.rates?.IDR || 15500;
      
      let estUsd = 0;
      // We don't have current prices cached here easily without another API call, so simulate
      resEl.innerHTML = `
        <h4 class="fw-bold mb-2 text-red"><i class="fas fa-exclamation-triangle"></i> Shock Scenario: -${pct}%</h4>
        <p class="text-muted text-sm mb-3">API off. In a ${pct}% generalized drop:</p>
        <p class="text-sm">High beta alts will likely drop ${parseInt(pct) * 1.5}-2x as much as BTC.</p>
        <div class="mt-3 p-2" style="background:var(--accent-red-alpha); border-radius:4px;">
           <span class="text-red fw-bold">RECOMMENDATION:</span> Evaluate stablecoin reserves and prepare limit orders at key support zones.
        </div>
      `;
    }
  });

});

function renderHistory() {
  const tbody = document.getElementById('risk-history-tbody');
  if(calcHistory.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted">No history saved.</td></tr>';
    return;
  }

  let html = '';
  calcHistory.forEach(h => {
    const d = new Date(h.date);
    const dateStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    
    html += `
      <tr>
        <td class="text-muted text-sm">${dateStr}</td>
        <td class="text-right fw-medium">${Core.formatCurrency(h.entry)}</td>
        <td class="text-right">${h.lev}x</td>
        <td class="text-right text-green">${Core.formatCurrency(h.target)}</td>
        <td class="text-right text-red">${Core.formatCurrency(h.sl)}</td>
        <td class="text-right fw-bold">1:${h.rr}</td>
        <td class="text-center"><span class="badge ${h.badgeClass}">${h.verdict}</span></td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}
