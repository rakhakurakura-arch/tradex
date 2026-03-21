// events.js - Simulated Macro Economic Events Calendar

const simulatedEvents = [
  { id: 1, date: offsetHours(2), title: 'US Initial Jobless Claims', impact: 'high', expected: '215K', prior: '210K', flag: 'us' },
  { id: 2, date: offsetHours(5), title: 'Fed Chair Speaking', impact: 'high', expected: 'N/A', prior: 'N/A', flag: 'us' },
  { id: 3, date: offsetHours(12), title: 'SEC ETF Decision Deadline', impact: 'high', expected: 'Approval', prior: 'Delay', flag: 'us' },
  { id: 4, date: offsetHours(24), title: 'Eurozone CPI (YoY)', impact: 'med', expected: '2.5%', prior: '2.6%', flag: 'eu' },
  { id: 5, date: offsetHours(36), title: 'Japan BOJ Rate Decision', impact: 'med', expected: '-0.1%', prior: '-0.1%', flag: 'jp' },
  { id: 6, date: offsetHours(48), title: 'US Non-Farm Payrolls', impact: 'high', expected: '200K', prior: '275K', flag: 'us' },
  { id: 7, date: offsetHours(72), title: 'Core PCE Price Index (MoM)', impact: 'high', expected: '0.3%', prior: '0.4%', flag: 'us' }
];

let currentFilter = 'ALL';

function offsetHours(hours) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('btn-filter-all').addEventListener('click', (e) => setFilter('ALL', e.currentTarget));
  document.getElementById('btn-filter-high').addEventListener('click', (e) => setFilter('HIGH', e.currentTarget));
  
  renderEvents();
  analyzeEvents();
});

function setFilter(type, el) {
  currentFilter = type;
  document.querySelectorAll('.btn-secondary').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderEvents();
}

function renderEvents() {
  const container = document.getElementById('events-container');
  let filtered = simulatedEvents;
  
  if (currentFilter === 'HIGH') {
     filtered = simulatedEvents.filter(e => e.impact === 'high');
  }

  if (filtered.length === 0) {
     container.innerHTML = `<div class="text-center p-4 text-muted border rounded">No events match filter.</div>`;
     return;
  }

  let html = '';
  filtered.forEach(ev => {
     const iClass = ev.impact === 'high' ? 'impact-high' : ev.impact === 'med' ? 'impact-med' : 'impact-low';
     const iBadge = ev.impact === 'high' ? 'badge-red' : ev.impact === 'med' ? 'badge-yellow' : 'badge-secondary';
     
     const timeStr = ev.date.toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit' });
     const dateStr = ev.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

     html += `
       <div class="event-card d-flex align-start gap-4 fade-in">
          <div class="text-center" style="min-width: 80px; border-right: 1px solid var(--border); padding-right: 15px;">
             <div class="fw-bold text-lg mb-1">${timeStr}</div>
             <div class="text-muted text-sm">${dateStr}</div>
             <div class="mt-2 text-xs font-mono badge ${iBadge} d-inline-block">${ev.impact.toUpperCase()}</div>
          </div>
          
          <div class="flex-1">
             <h4 class="fw-bold mb-2">${ev.title}</h4>
             <div class="d-flex gap-4 text-sm mt-3">
                <div>
                   <span class="text-muted mr-1">Expected:</span>
                   <span class="fw-bold">${ev.expected}</span>
                </div>
                <div>
                   <span class="text-muted mr-1">Prior:</span>
                   <span class="fw-bold">${ev.prior}</span>
                </div>
             </div>
          </div>
       </div>
     `;
  });

  container.innerHTML = html;
}

async function analyzeEvents() {
  const out = document.getElementById('events-copilot-analysis');
  
  try {
     const prmpt = `Act as a crypto quantitative macro analyst. Based on this upcoming event schedule, write a 2-paragraph summary on how these events will likely impact Bitcoin and Crypto volatility over the next 72 hours. Be specific. Schedule: ${JSON.stringify(simulatedEvents)}`;
     
     const res = await API.askGroq(prmpt);
     
     out.innerHTML = `
       <div class="markdown-body text-sm" style="line-height: 1.6;">
          ${marked.parse(res.replace(/["*]/g, ''))}
       </div>
     `;
  } catch(e) {
     out.innerHTML = `<div class="text-red p-3"><i class="fas fa-exclamation-triangle mr-2"></i> Groq AI integration offline. Please configure API keys to unlock Copilot macro predictions.</div>`;
  }
}
