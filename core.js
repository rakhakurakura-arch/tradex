// core.js - TradeX AI Infrastructure, State & Auth

const Core = {
  init() {
    this.checkAuth();
    this.initTheme();
    this.injectSidebar();
    this.injectNavbar();
    this.bindEvents();
  },

  checkAuth() {
    // 7. Auth guard ONLY on: dashboard, tracker, signals, portfolio, fear-greed, premium pages
    // 8. NO auth guard on: index.html, login.html, register.html
    const path = window.location.pathname;
    let page = path.split('/').pop().split('?')[0];
    
    // Default root falls to index.html
    if (page === '') page = 'index.html';

    const publicPages = ['index.html', 'login.html', 'register.html'];
    
    if (!publicPages.includes(page)) {
      const session = localStorage.getItem('tradex_session');
      if (!session) {
        window.location.href = 'login.html';
      }
    }
  },

  login(username, password) {
    const users = JSON.parse(localStorage.getItem('tradex_users') || '[]');
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      localStorage.setItem('tradex_session', JSON.stringify(user));
      return true;
    }
    return false;
  },

  register(username, password) {
    const users = JSON.parse(localStorage.getItem('tradex_users') || '[]');
    if (users.find(u => u.username === username)) {
      return false; // User exists
    }
    const newUser = { username, password, joined: new Date().toISOString() };
    users.push(newUser);
    localStorage.setItem('tradex_users', JSON.stringify(users));
    return true;
  },

  logout() {
    localStorage.removeItem('tradex_session');
    window.location.href = 'login.html';
  },

  getUser() {
    const session = localStorage.getItem('tradex_session');
    return session ? JSON.parse(session) : null;
  },

  initTheme() {
    const settings = this.getSettings();
    if (settings.theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  },

  getSettings() {
    return JSON.parse(localStorage.getItem('tradex_settings') || '{"theme":"dark", "currency":"USD"}');
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'light' ? 'dark' : 'light';
    
    if (newTheme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
    
    const settings = this.getSettings();
    settings.theme = newTheme;
    localStorage.setItem('tradex_settings', JSON.stringify(settings));
    
    // Dispatch custom event for charts to redraw
    window.dispatchEvent(new Event('themechanged'));
  },

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    
    toast.innerHTML = `
      <i class="fas fa-${icon}"></i>
      <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  formatCurrency(value, currencyStr = null) {
    if(value === undefined || value === null) return '$0.00';
    
    const settings = this.getSettings();
    const isIDR = currencyStr ? currencyStr === 'IDR' : settings.currency === 'IDR';
    
    if (isIDR) {
      const rateStr = localStorage.getItem('tradex_idr_rate');
      let rate = rateStr ? parseFloat(rateStr) : 15500;
      
      return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(value * rate);
    }
    
    // Formatting for USD
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: value < 1 ? 4 : 2,
      maximumFractionDigits: value < 1 ? 6 : 2
    }).format(value);
  },

  formatNumber(value, maxDecimals = 2) {
    if(!value) return '0';
    if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(2) + 'K';
    return parseFloat(value).toFixed(maxDecimals);
  },
  
  formatPercent(value) {
    if(!value) return '0.00%';
    const valObj = parseFloat(value);
    const sign = valObj > 0 ? '+' : '';
    return `${sign}${valObj.toFixed(2)}%`;
  },

  getColorClass(value) {
    if (!value) return '';
    return parseFloat(value) >= 0 ? 'text-green' : 'text-red';
  },

  injectSidebar() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;

    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    
    // Do not inject on public pages handled by layout differences
    if(['index.html', 'login.html', 'register.html', ''].includes(page)) return;

    const navSections = [
      {
        label: 'Dashboard',
        links: [
          { url: 'dashboard.html', icon: 'fa-home', text: 'Overview' },
          { url: 'tracker.html', icon: 'fa-chart-line', text: 'Live Tracker' },
          { url: 'portfolio.html', icon: 'fa-wallet', text: 'Portfolio' },
        ]
      },
      {
        label: 'AI Tools (Pro)',
        links: [
          { url: 'signals.html', icon: 'fa-robot', text: 'AI Signals' },
          { url: 'fear-greed.html', icon: 'fa-tachometer-alt', text: 'Fear & Greed' },
          { url: 'screener.html', icon: 'fa-filter', text: 'Screener PRO' },
          { url: 'whale-tracker.html', icon: 'fa-water', text: 'Whale Tracker' },
          { url: 'risk-calculator.html', icon: 'fa-calculator', text: 'Risk Manager' },
          { url: 'journal.html', icon: 'fa-book', text: 'AI Journal' },
        ]
      },
      {
        label: 'Intel',
        links: [
          { url: 'news.html', icon: 'fa-newspaper', text: 'Crypto News' },
          { url: 'sentiment.html', icon: 'fa-users', text: 'Social Sentiment' },
          { url: 'events.html', icon: 'fa-calendar-alt', text: 'Events Cal' },
          { url: 'morning-brief.html', icon: 'fa-sun', text: 'Morning Brief' },
        ]
      },
      {
        label: 'Social & Local',
        links: [
          { url: 'indonesia.html', icon: 'fa-flag', text: 'Indonesia 🇮🇩' },
          { url: 'leaderboard.html', icon: 'fa-trophy', text: 'Leaderboard' },
          { url: 'alerts.html', icon: 'fa-bell', text: 'Alerts' },
          { url: 'free-signals.html', icon: 'fa-gift', text: 'Free Signals' },
        ]
      }
    ];

    let html = `
      <div class="sidebar">
        <div class="sidebar-header">
          <a href="dashboard.html" class="logo">
            <div class="logo-icon">TX</div>
            <span>TradeX AI</span>
          </a>
        </div>
        <div class="sidebar-nav">
    `;

    navSections.forEach(sec => {
      html += `<div class="nav-label">${sec.label}</div>`;
      sec.links.forEach(link => {
        const isActive = page === link.url ? 'active' : '';
        html += `
          <a href="${link.url}" class="nav-item ${isActive}">
            <i class="fas ${link.icon}"></i>
            ${link.text}
          </a>
        `;
      });
    });

    html += `
        </div>
      </div>
    `;

    sidebarContainer.innerHTML = html;
  },

  injectNavbar() {
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) return;

    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    if(['index.html', 'login.html', 'register.html', ''].includes(page)) return;

    const user = this.getUser();
    
    const settings = this.getSettings();
    const isLight = settings.theme === 'light';

    navbarContainer.innerHTML = `
      <div class="navbar">
        <div class="d-flex align-center gap-2">
          <button class="mobile-toggle" id="mobile-toggle-btn">
            <i class="fas fa-bars"></i>
          </button>
          
          <div class="search-wrap hide-mobile" style="position: relative; width: 300px;">
            <i class="fas fa-search" style="position: absolute; left: 1rem; top: 1rem; color: var(--text-muted)"></i>
            <input type="text" class="form-control" placeholder="Search coins..." style="padding-left: 2.5rem; border-radius: 20px;">
          </div>
        </div>

        <div class="navbar-right d-flex gap-3 align-center">
          <a href="settings.html" class="btn btn-secondary" style="padding: 0.5rem; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items:center; justify-content:center;">
             <i class="fas fa-cog"></i>
          </a>
          <button class="btn btn-secondary" onclick="Core.toggleTheme()" style="padding: 0.5rem; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items:center; justify-content:center;">
            <i class="fas ${isLight ? 'fa-moon' : 'fa-sun'}"></i>
          </button>
          
          <div style="width: 1px; height: 30px; background: var(--border);"></div>

          ${user ? `
            <div class="user-profile d-flex gap-2 align-center">
              <div class="avatar" style="width: 36px; height: 36px; border-radius: 50%; background: var(--accent-green); color: #000; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1rem;">
                ${user.username.charAt(0).toUpperCase()}
              </div>
              <div class="hide-mobile">
                <div style="font-weight: 600; line-height: 1;">${user.username}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">PRO Member</div>
              </div>
              <button class="btn btn-secondary text-red hide-mobile" onclick="Core.logout()" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; margin-left: 0.5rem;">
                <i class="fas fa-sign-out-alt"></i>
              </button>
            </div>
          ` : `
            <a href="login.html" class="btn btn-primary btn-sm">Sign In</a>
          `}
        </div>
      </div>
    `;
  },
  
  bindEvents() {
    // Mobile sidebar toggle
    document.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('#mobile-toggle-btn');
      const sidebar = document.querySelector('.sidebar');
      
      if (toggleBtn && sidebar) {
        sidebar.classList.toggle('active');
      } else if (sidebar && sidebar.classList.contains('active') && !e.target.closest('.sidebar')) {
        // click outside closes sidebar
        sidebar.classList.remove('active');
      }
    });

    // Logout handling on mobile or if needed elsewhere
    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.logout();
      });
    });
  }
};

// Check auth and init on load unless it's a page that shouldn't
document.addEventListener('DOMContentLoaded', () => {
    Core.init();
});
