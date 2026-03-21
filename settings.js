// settings.js - Global App Configuration and Integrations

let settingsDict = JSON.parse(localStorage.getItem('tradex_settings') || '{}');

document.addEventListener('DOMContentLoaded', () => {

  // Load Groq Key
  const storedGroq = localStorage.getItem('groqApiKey');
  if (storedGroq) {
     document.getElementById('groq-key-input').value = storedGroq;
  }

  // Load Prefs
  if (settingsDict.currency) document.getElementById('pref-currency').value = settingsDict.currency;
  if (settingsDict.theme) document.getElementById('pref-theme').value = settingsDict.theme;
  if (settingsDict.notifications) document.getElementById('pref-notif').checked = true;

  // Toggle Groq Visibility
  document.getElementById('toggle-groq-key').addEventListener('click', (e) => {
     const input = document.getElementById('groq-key-input');
     const icon = e.currentTarget.querySelector('i');
     if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
     } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
     }
  });

  // Save Groq
  document.querySelector('#groq-form .btn-primary').addEventListener('click', (e) => {
     e.preventDefault();
     const key = document.getElementById('groq-key-input').value.trim();
     if (key && !key.startsWith('gsk_')) {
        Core.showToast('Invalid Groq API Key Format (Must start with gsk_)', 'error');
        return;
     }
     
     if (key) {
        localStorage.setItem('groqApiKey', key);
        Core.showToast('Groq API Key Saved successfully', 'success');
     } else {
        localStorage.removeItem('groqApiKey');
        Core.showToast('Groq API Key Removed', 'info');
     }
  });

  // Save Prefs
  document.querySelector('#preferences-form .btn-primary').addEventListener('click', (e) => {
     e.preventDefault();
     
     const currency = document.getElementById('pref-currency').value;
     const theme = document.getElementById('pref-theme').value;
     const notifs = document.getElementById('pref-notif').checked;

     settingsDict.currency = currency;
     settingsDict.notifications = notifs;
     
     // Handle Theme explicitly
     if (settingsDict.theme !== theme) {
        settingsDict.theme = theme;
        if(theme === 'light') {
           document.documentElement.setAttribute('data-theme', 'light');
        } else {
           document.documentElement.removeAttribute('data-theme');
        }
        window.dispatchEvent(new Event('themechanged'));
     }

     localStorage.setItem('tradex_settings', JSON.stringify(settingsDict));
     Core.showToast('Preferences saved globally', 'success');
  });

  // Danger Zone - Factory Reset
  document.getElementById('btn-clear-data').addEventListener('click', () => {
     if(confirm("WARNING: This will delete ALL portfolios, journals, chat history, and API keys stored in this browser. This cannot be undone.\n\nType 'delete' to confirm:")) {
        const check = prompt("Type 'delete' to confirm deletion:");
        if (check !== null && check.toLowerCase() === 'delete') {
           
           // Keep user session, delete data
           const user = localStorage.getItem('tradex_session');
           const users = localStorage.getItem('tradex_users');
           
           localStorage.clear();
           
           // Restore auth
           if(user) localStorage.setItem('tradex_session', user);
           if(users) localStorage.setItem('tradex_users', users);
           
           Core.showToast('All app data has been wiped.', 'success');
           
           setTimeout(() => {
              window.location.reload();
           }, 1500);
        } else {
           Core.showToast('Deletion cancelled.', 'info');
        }
     }
  });

});
