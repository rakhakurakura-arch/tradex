// news.js - CryptoPanic News Feed

let allNews = [];
let displayedCount = 0;
const BATCH_SIZE = 15;
let currentFilter = '';
let currentSearch = '';

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('btn-refresh-news').addEventListener('click', async (e) => {
     const i = e.currentTarget.querySelector('i');
     i.classList.add('fa-spin');
     await fetchNews();
     i.classList.remove('fa-spin');
  });

  document.getElementById('btn-load-more').addEventListener('click', () => {
     renderNews(true);
  });

  const searchInp = document.getElementById('news-search');
  searchInp.addEventListener('input', (e) => {
     currentSearch = e.target.value.toLowerCase();
     resetAndRender();
  });

  // Filter bindings
  document.querySelectorAll('#news-filters button').forEach(b => {
     b.addEventListener('click', (e) => {
        document.querySelectorAll('#news-filters button').forEach(btn => {
           btn.classList.remove('active');
           btn.classList.add('no-bg');
        });
        e.currentTarget.classList.add('active');
        e.currentTarget.classList.remove('no-bg');
        
        currentFilter = e.currentTarget.dataset.filter.toLowerCase();
        resetAndRender();
     });
  });

  await fetchNews();
});

async function fetchNews() {
  const container = document.getElementById('news-feed-main');
  container.innerHTML = Array(4).fill('<div class="news-card"><div class="skeleton-chart" style="height: 60px;"></div></div>').join('');
  document.getElementById('btn-load-more').style.display = 'none';

  try {
     const res = await API.getNews();
     allNews = res.results || [];
     resetAndRender();
  } catch (err) {
     console.error("News Load Error", err);
     container.innerHTML = `<div class="p-5 text-center text-red">Failed to load news feed.</div>`;
  }
}

function resetAndRender() {
  displayedCount = 0;
  document.getElementById('news-feed-main').innerHTML = '';
  renderNews(false);
}

function renderNews(append = false) {
  const container = document.getElementById('news-feed-main');
  const btnMore = document.getElementById('btn-load-more');

  let filtered = allNews.filter(n => {
     const text = n.title.toLowerCase();
     // Text Search
     if (currentSearch && !text.includes(currentSearch)) return false;
     // Filter Tag
     if (currentFilter && !text.includes(currentFilter)) return false;
     return true;
  });

  if (filtered.length === 0) {
     if(!append) container.innerHTML = `<div class="p-5 text-center text-muted">No news articles found matching criteria.</div>`;
     btnMore.style.display = 'none';
     return;
  }

  const batch = filtered.slice(displayedCount, displayedCount + BATCH_SIZE);
  let html = '';

  batch.forEach(n => {
     const d = new Date(n.created_at || Date.now());
     const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
     const domain = n.domain || 'cryptopanic.com';
     const sourceUrl = n.url || '#';

     let icon = 'fas fa-newspaper';
     let iconCol = 'text-blue';
     
     if(n.title.toLowerCase().includes('sec') || n.title.toLowerCase().includes('regulation')) { icon = 'fas fa-balance-scale'; iconCol = 'text-yellow'; }
     else if(n.title.toLowerCase().includes('hack') || n.title.toLowerCase().includes('exploit')) { icon = 'fas fa-shield-alt'; iconCol = 'text-red'; }
     else if(n.title.toLowerCase().includes('etf')) { icon = 'fas fa-university'; iconCol = 'text-green'; }

     html += `
        <div class="news-card fade-in d-flex gap-3 align-start">
           <div class="mt-1" style="width: 25px; text-align:center;">
              <i class="${icon} ${iconCol}"></i>
           </div>
           <div class="flex-1">
              <div class="news-meta">
                 <span class="mr-3"><i class="far fa-clock mr-1"></i>${dateStr}</span>
                 <span><i class="fas fa-link mr-1"></i>${domain}</span>
              </div>
              <a href="${sourceUrl}" target="_blank" class="news-title d-block mb-2">${n.title}</a>
           </div>
        </div>
     `;
  });

  if (append) {
     container.insertAdjacentHTML('beforeend', html);
  } else {
     container.innerHTML = html;
  }

  displayedCount += batch.length;

  if (displayedCount >= filtered.length) {
     btnMore.style.display = 'none';
  } else {
     btnMore.style.display = 'inline-block';
  }
}
