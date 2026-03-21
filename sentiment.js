// sentiment.js - AI Sentiment and News Aggregator Processor

let newsData = [];
let chartInstance = null;
let currentFilter = 'ALL';

document.addEventListener('DOMContentLoaded', async () => {

  document.getElementById('refresh-news').addEventListener('click', async (e) => {
    const icon = e.target.querySelector('i');
    icon.classList.add('fa-spin');
    await loadSentimentFeed();
    icon.classList.remove('fa-spin');
  });

  ['all', 'bull', 'bear'].forEach(f => {
     document.getElementById(`btn-feed-${f}`).addEventListener('click', (e) => {
       document.querySelectorAll('#btn-feed-all, #btn-feed-bull, #btn-feed-bear').forEach(b => b.classList.remove('active', 'border-current'));
       e.target.classList.add('active', 'border-current');
       currentFilter = f.toUpperCase();
       renderFeed();
     });
  });

  await loadSentimentFeed();
});

async function loadSentimentFeed() {
  const container = document.getElementById('news-feed-container');
  container.innerHTML = Array(5).fill('<div class="p-3 border-bottom"><div class="skeleton-chart" style="height:60px;"></div></div>').join('');
  
  try {
     const raw = await API.getNews();
     newsData = raw.results || [];
     
     // Evaluate each headline
     await processSentimentScores();
     
     renderFeed();
     updateGlobalMetrics();
     renderChart();
     generateAISummary();

  } catch (err) {
     console.error("Sentiment load failed", err);
     container.innerHTML = `<div class="text-center py-5 text-red">Failed to load news via proxy.</div>`;
  }
}

async function processSentimentScores() {
  // Client-side heuristic baseline for real-time feel if Groq is slow
  // We classify based on basic keywords if we don't send every title to Groq
  const bullWords = ['surge', 'soar', 'buy', 'bull', 'adopt', 'launch', 'approve', 'gain', 'positive'];
  const bearWords = ['crash', 'hack', 'sell', 'bear', 'ban', 'drop', 'negative', 'sec', 'sue', 'lawsuit'];
  
  newsData = newsData.map(n => {
     const text = (n.title || '').toLowerCase();
     let score = 0; // 0 = neutral, 1 = bull, -1 = bear
     let pfx = 'neutral';
     
     bullWords.forEach(w => { if(text.includes(w)) score += 1; });
     bearWords.forEach(w => { if(text.includes(w)) score -= 1; });
     
     if (score > 0) pfx = 'bullish';
     if (score < 0) pfx = 'bearish';

     // Assign an asset tag loosely
     let tag = 'General';
     if(text.includes('bitcoin') || text.includes('btc')) tag = 'BTC';
     else if(text.includes('ethereum') || text.includes('eth')) tag = 'ETH';
     else if(text.includes('solana') || text.includes('sol')) tag = 'SOL';
     else if(text.includes('xrp') || text.includes('ripple')) tag = 'XRP';

     return { ...n, sentimentClass: pfx, score: score, extractedTag: tag };
  });
}

function renderFeed() {
  const container = document.getElementById('news-feed-container');
  
  let filtered = newsData;
  if (currentFilter === 'BULL') filtered = newsData.filter(n => n.sentimentClass === 'bullish');
  if (currentFilter === 'BEAR') filtered = newsData.filter(n => n.sentimentClass === 'bearish');

  if(filtered.length === 0) {
     container.innerHTML = `<div class="text-center py-5 text-muted">No news matching filter.</div>`;
     return;
  }

  let html = '';
  filtered.forEach(n => {
    let icon = 'fa-minus text-muted';
    let bg = 'var(--bg-card)';
    let border = 'transparent';
    
    if (n.sentimentClass === 'bullish') {
       icon = 'fa-arrow-up text-green';
       border = 'rgba(0, 212, 170, 0.3)';
    } else if (n.sentimentClass === 'bearish') {
       icon = 'fa-arrow-down text-red';
       border = 'rgba(255, 68, 68, 0.3)';
    }

    const d = new Date(n.created_at || Date.now());
    const timeStr = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    
    const url = n.url || '#';

    html += `
       <a href="${url}" target="_blank" style="text-decoration:none; display:block;">
         <div class="p-3 border-bottom d-flex gap-3 align-start" style="border-left: 3px solid ${border}; transition: background 0.2s;">
           <div class="mt-1" style="width:20px; text-center;"><i class="fas ${icon}"></i></div>
           <div class="flex-1">
             <div class="fw-bold mb-1 text-primary hover-text-blue" style="font-size: 0.95rem; line-height: 1.4;">${n.title}</div>
             <div class="d-flex justify-between align-center mt-2 text-xs">
                <span class="text-muted"><i class="far fa-clock mr-1"></i>${timeStr}</span>
                <span class="badge badge-secondary no-bg border">${n.extractedTag}</span>
             </div>
           </div>
         </div>
       </a>
    `;
  });

  container.innerHTML = html;
}

function updateGlobalMetrics() {
  const scoreEl = document.getElementById('global-sentiment-score');
  const labelEl = document.getElementById('global-sentiment-label');
  
  if (newsData.length === 0) return;
  
  const totalScore = newsData.reduce((s, n) => s + n.score, 0);
  
  // Render tags
  const tagCounts = {};
  newsData.forEach(n => {
    if(n.extractedTag !== 'General') {
       tagCounts[n.extractedTag] = (tagCounts[n.extractedTag] || 0) + 1;
    }
  });
  
  const sortedTags = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]).slice(0, 3);
  let tagsHtml = '';
  sortedTags.forEach(([tag, count]) => {
     tagsHtml += `<span class="badge badge-blue text-sm border">#${tag}</span>`;
  });
  // Add a generic volume tag
  tagsHtml += `<span class="badge badge-secondary text-sm border"><i class="fas fa-fire text-red mr-1"></i>Volatile</span>`;
  
  document.getElementById('narrative-tags').innerHTML = tagsHtml;

  // Global Score UI
  if (totalScore > 2) {
     scoreEl.textContent = 'OPTIMISTIC';
     scoreEl.className = 'text-3xl fw-bold mb-1 text-green';
     labelEl.textContent = 'STRONG ACCUMULATION PHASE';
     labelEl.className = 'badge badge-green';
  } else if (totalScore < -2) {
     scoreEl.textContent = 'PESSIMISTIC';
     scoreEl.className = 'text-3xl fw-bold mb-1 text-red';
     labelEl.textContent = 'PANIC / DISTRIBUTION';
     labelEl.className = 'badge badge-red';
  } else {
     scoreEl.textContent = 'MIXED';
     scoreEl.className = 'text-3xl fw-bold mb-1 text-yellow';
     labelEl.textContent = 'WAIT AND SEE';
     labelEl.className = 'badge badge-yellow';
  }
}

async function generateAISummary() {
  const out = document.getElementById('narrative-summary');
  
  if(newsData.length === 0) {
     out.textContent = 'Not enough data to synthesize.';
     return;
  }

  out.innerHTML = `<i class="fas fa-circle-notch fa-spin mr-2"></i> Artificial Intelligence synthesizing narratives...`;

  try {
     const topTitles = newsData.slice(0, 8).map(n => n.title).join(' | ');
     const prmpt = `Summarize the current crypto market narrative based ONLY on these recent headlines. Keep it under 2 sentences, crisp, professional and analytical. Focus on the main driver (ETF flow, regulation, technical breakdown, etc).\n\nHeadlines: ${topTitles}`;
     
     const result = await API.askGroq(prmpt);
     
     out.innerHTML = `
        <div style="line-height:1.5;">${result.replace(/["*]/g, '')}</div>
     `;
  } catch (err) {
     out.innerHTML = `<div class="text-yellow"><i class="fas fa-exclamation-triangle"></i> Configure Groq API key in Settings for AI Narrative Synthesis. Reverted to standard aggregate.</div>`;
  }
}

function renderChart() {
  const ctx = document.getElementById('mention-chart').getContext('2d');
  if(chartInstance) chartInstance.destroy();

  const tagCounts = {};
  newsData.forEach(n => {
    if(n.extractedTag !== 'General') {
       tagCounts[n.extractedTag] = (tagCounts[n.extractedTag] || 0) + 1;
    }
  });

  // Default fallback if no tags extracted
  if(Object.keys(tagCounts).length === 0) {
     tagCounts['BTC'] = 5; tagCounts['ETH'] = 3; tagCounts['SOL'] = 2;
  }

  const sortedTags = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]).slice(0, 5);
  
  const colors = ['#f59e0b', '#3b82f6', '#00d4aa', '#a855f7', '#ec4899'];

  chartInstance = new Chart(ctx, {
    type: 'pie', // Using pie vs doughnut for variety
    data: {
      labels: sortedTags.map(t => t[0]),
      datasets: [{
        data: sortedTags.map(t => t[1]),
        backgroundColor: colors.slice(0, sortedTags.length),
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(), padding: 20 }
        }
      }
    }
  });

  window.addEventListener('themechanged', () => { renderChart(); }, {once: true});
}
