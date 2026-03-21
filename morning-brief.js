// morning-brief.js - AI Daily Market Synthesis

document.addEventListener('DOMContentLoaded', async () => {
  const d = new Date();
  document.getElementById('brief-date').textContent = `${d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

  document.getElementById('btn-generate-brief').addEventListener('click', async (e) => {
     const i = e.currentTarget.querySelector('i');
     i.classList.add('fa-spin');
     await generateBrief();
     i.classList.remove('fa-spin');
  });

  generateBrief();
});

async function generateBrief() {
  const ctn = document.getElementById('brief-content-container');
  const loader = document.getElementById('brief-loading');
  const out = document.getElementById('brief-markdown');

  out.style.display = 'none';
  loader.style.display = 'block';

  try {
     // Fetch macro drivers
     const coins = await API.getTopCoins(15);
     const newsRaw = await API.getNews();
     const fngRaw = await API.getFearGreed();
     
     const fng = fngRaw.data ? fngRaw.data[0].value : 'Unknown';
     const btc = coins.find(c => c.symbol === 'btc');
     const eth = coins.find(c => c.symbol === 'eth');
     
     const topNews = (newsRaw.results || []).slice(0, 5).map(n => n.title).join(' | ');
     const movers = coins.sort((a,b) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0,2);
     const losers = coins.sort((a,b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0,2);
     const btcPrice = btc?.current_price ?? 0;
     const ethPrice = eth?.current_price ?? 0;
     const btcChg = btc?.price_change_percentage_24h ?? btc?.price_change_percentage_24h_in_currency ?? 0;
     const ethChg = eth?.price_change_percentage_24h ?? eth?.price_change_percentage_24h_in_currency ?? 0;

     let promptCtx = `
       Format the response as an HTML-ready Markdown briefing using these custom sections wrapped in <div class="brief-section"> headers:
       <h2>1. Macro Overview</h2>
       <h2>2. Key Movers</h2>
       <h2>3. Narrative Watch</h2>
       <h2>4. AI Action Plan</h2>
       
       Context for today:
       Fear & Greed: ${fng}/100
       BTC: $${btcPrice} (${btcChg.toFixed(2)}%)
       ETH: $${ethPrice} (${ethChg.toFixed(2)}%)
       Top Movers: ${movers.map(m=>m.symbol + ' +' + (m?.price_change_percentage_24h ?? m?.price_change_percentage_24h_in_currency ?? 0).toFixed(1)+'%').join(', ')}
       Laggers: ${losers.map(m=>m.symbol + ' ' + (m?.price_change_percentage_24h ?? m?.price_change_percentage_24h_in_currency ?? 0).toFixed(1)+'%').join(', ')}
       Recent Headlines: ${topNews}
       
       Keep it extremely professional, analytical, and crisp (like an institutional desk brief). Don't use standard generic robot pleasantries. Just the data and interpretation.
     `;

     const brief = await API.askGroq(promptCtx);
     
     out.innerHTML = marked.parse(brief);
     
  } catch(e) {
     console.error("Brief generation failed", e);
     out.innerHTML = `
        <div class="card text-red text-center py-5">
           <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
           <h3 class="fw-bold">API Integration Missing</h3>
           <p>Failed to synthesize daily brief. Please ensure Groq API Key is active in Settings, or check CorsProxy limits.</p>
        </div>
     `;
  } finally {
     loader.style.display = 'none';
     out.style.display = 'block';
  }
}
