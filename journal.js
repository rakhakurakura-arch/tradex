// journal.js - Trading Journal and AI Emotional Analysis

let journalData = JSON.parse(localStorage.getItem('tradex_journal') || '[]');
let currentFilter = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
  
  // Set default datetime to now
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('trd-date').value = now.toISOString().slice(0,16);

  renderJournal();
  updateStats();
  checkCoachEligibility();

  // Filters
  const filters = ['all', 'win', 'loss'];
  filters.forEach(f => {
    document.getElementById(`jnl-filter-${f}`).addEventListener('click', (e) => {
      filters.forEach(x => document.getElementById(`jnl-filter-${x}`).classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = f.toUpperCase();
      renderJournal();
    });
  });

  // Form Submission
  document.getElementById('add-trade-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const trade = {
      id: Date.now().toString(),
      date: document.getElementById('trd-date').value,
      asset: document.getElementById('trd-asset').value.toUpperCase(),
      direction: document.getElementById('trd-dir').value,
      entry: parseFloat(document.getElementById('trd-entry').value),
      exit: parseFloat(document.getElementById('trd-exit').value),
      pnl: parseFloat(document.getElementById('trd-pnl').value),
      setup: document.getElementById('trd-setup').value,
      notes: document.getElementById('trd-notes').value
    };

    journalData.unshift(trade);
    localStorage.setItem('tradex_journal', JSON.stringify(journalData));
    
    renderJournal();
    updateStats();
    checkCoachEligibility();
    
    document.getElementById('add-trade-form').reset();
    document.getElementById('add-trade-modal').style.display = 'none';
    Core.showToast('Trade logged successfully', 'success');
  });

  // AI Coach Trigger
  document.getElementById('btn-coach-review').addEventListener('click', generateReview);
});

function renderJournal() {
  const tbody = document.getElementById('journal-tbody');
  
  let filtered = journalData;
  if(currentFilter === 'WIN') filtered = journalData.filter(t => t.pnl > 0);
  if(currentFilter === 'LOSS') filtered = journalData.filter(t => t.pnl <= 0);

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted">No trades match this filter.</td></tr>';
    return;
  }

  let html = '';
  filtered.forEach(t => {
    const d = new Date(t.date);
    const dateStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    
    const pnlClass = t.pnl > 0 ? 'text-green' : t.pnl < 0 ? 'text-red' : '';
    const dirClass = t.direction === 'LONG' ? 'badge-green' : 'badge-red';
    
    // Calculate simple RR achieved (abs PnL vs entry price)
    const riskBasis = t.entry * 0.01; // assumed 1% risk for display fallback if SL isn't logged
    let rrStr = '-';
    if(t.entry && t.exit) {
       const pctChange = Math.abs((t.exit - t.entry) / t.entry) * 100;
       rrStr = pctChange.toFixed(2) + '%';
    }

    html += `
      <tr>
        <td class="text-sm text-muted">${dateStr}</td>
        <td class="fw-bold">${t.asset}</td>
        <td><span class="badge ${dirClass} text-xs">${t.direction}</span></td>
        <td class="text-sm">${t.setup}</td>
        <td class="text-right text-muted text-sm">${rrStr}</td>
        <td class="text-right fw-bold ${pnlClass}">${Core.formatCurrency(t.pnl)}</td>
        <td class="text-center">
          <button class="btn btn-secondary btn-sm" onclick="viewTrade('${t.id}')"><i class="fas fa-eye"></i></button>
          <button class="btn btn-secondary btn-sm text-red" onclick="deleteTrade('${t.id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function updateStats() {
  if(journalData.length === 0) return;

  const total = journalData.length;
  const wins = journalData.filter(t => t.pnl > 0).length;
  const netPnl = journalData.reduce((sum, t) => sum + t.pnl, 0);
  
  // Best Asset
  const assetPnls = {};
  journalData.forEach(t => {
    assetPnls[t.asset] = (assetPnls[t.asset] || 0) + t.pnl;
  });
  
  let bestAsset = '-';
  let highest = -999999;
  for(const [k,v] of Object.entries(assetPnls)) {
    if(v > highest) { highest = v; bestAsset = k; }
  }

  document.getElementById('jnl-total').textContent = total;
  document.getElementById('jnl-winrate').textContent = Math.round((wins / total) * 100) + '%';
  
  const pnlEl = document.getElementById('jnl-pnl');
  pnlEl.textContent = Core.formatCurrency(netPnl);
  pnlEl.className = `text-2xl fw-bold ${netPnl >= 0 ? 'text-green' : 'text-red'}`;

  document.getElementById('jnl-best').textContent = bestAsset;
}

window.deleteTrade = function(id) {
  if(confirm("Are you sure you want to delete this trade log?")) {
    journalData = journalData.filter(t => t.id !== id);
    localStorage.setItem('tradex_journal', JSON.stringify(journalData));
    renderJournal();
    updateStats();
    checkCoachEligibility();
  }
}

window.viewTrade = function(id) {
  const t = journalData.find(x => x.id === id);
  if(!t) return;
  alert(`Trade Notes for ${t.asset}:\n\n${t.notes || "No notes provided."}`);
}

function checkCoachEligibility() {
  const btn = document.getElementById('btn-coach-review');
  const out = document.getElementById('ai-coach-output');
  
  // Need at least 3 trades with notes
  const complexTrades = journalData.filter(t => t.notes && t.notes.length > 10);
  
  if(complexTrades.length >= 3) {
    btn.disabled = false;
    if(out.innerHTML.includes('unlock AI')) {
      out.innerHTML = `<div class="text-center text-muted"><i class="fas fa-check-circle text-green mb-2 text-2xl"></i><br>Sufficient data gathered. Ready for review.</div>`;
    }
  } else {
    btn.disabled = true;
    out.innerHTML = `<div class="text-muted text-center" style="opacity: 0.6;">
       <i class="fas fa-magic mb-3 text-2xl"></i><br>
       Log at least 3 trades with detailed notes to unlock AI psychological profiling. (${complexTrades.length}/3)
     </div>`;
  }
}

async function generateReview() {
  const out = document.getElementById('ai-coach-output');
  const btn = document.getElementById('btn-coach-review');
  
  btn.disabled = true;
  out.innerHTML = `<div class="text-center py-4"><i class="fas fa-circle-notch fa-spin text-2xl mb-3" style="color:#a855f7;"></i><br>Groq is analyzing your trading psychology...</div>`;

  try {
    // Compile trade summary
    const recent = journalData.slice(0, 10); // Analyze last 10
    const net = recent.reduce((s,t) => s+t.pnl, 0);
    const winRate = (recent.filter(t=>t.pnl>0).length / recent.length * 100).toFixed(0);
    
    let summaryStr = `I am a crypto trader. Here are my last ${recent.length} trades:
    Total Net: $${net}, Win Rate: ${winRate}%. \n\n`;
    
    recent.forEach(t => {
      summaryStr += `Action: ${t.direction} ${t.asset}. Setup: ${t.setup}. PnL: $${t.pnl}. Notes: "${t.notes}"\n`;
    });

    const prompt = `Act as an elite trading psychology coach. Read my recent trade logs below. 
    1. Identify any recurring emotional biases or mistakes (e.g., FOMO, revenge trading, cutting winners early).
    2. Suggest 1 concrete, actionable rule I must follow next week to improve.
    Use formatting (bullet points, bold text). Keep it direct and critical, no fluff.
    
    Logs:
    ${summaryStr}
    `;

    const review = await API.askGroq(prompt);
    
    out.innerHTML = `
      <div class="markdown-body text-sm" style="line-height:1.6; max-height:300px; overflow-y:auto; padding-right:10px;">
        ${marked.parse(review)}
      </div>
    `;

  } catch (err) {
    out.innerHTML = `<div class="text-center text-red p-3"><i class="fas fa-exclamation-triangle mb-2"></i><br>API Error. Please ensure Groq API key is valid in Settings.</div>`;
    console.error("Coach error", err);
  } finally {
    btn.disabled = false;
  }
}
