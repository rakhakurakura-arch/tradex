// alerts.js - Price custom alerting simulator

let userAlerts = JSON.parse(localStorage.getItem('tradex_alerts') || '[]');

document.addEventListener('DOMContentLoaded', () => {

   document.getElementById('add-alert-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const st = {
         id: Date.now().toString(),
         asset: document.getElementById('alt-asset').value.toUpperCase(),
         cond: document.getElementById('alt-cond').value,
         target: parseFloat(document.getElementById('alt-price').value),
         active: true
      };
      
      userAlerts.push(st);
      localStorage.setItem('tradex_alerts', JSON.stringify(userAlerts));
      
      document.getElementById('add-alert-form').reset();
      document.getElementById('add-alert-modal').style.display = 'none';
      Core.showToast(`Alert created for ${st.asset}`, 'success');
      
      renderAlerts();
   });

   renderAlerts();
   // Check prices every 10 seconds conceptually
   setInterval(checkAlerts, 10000);
});

function renderAlerts() {
   const container = document.getElementById('alerts-container');
   
   if (userAlerts.length === 0) {
      document.getElementById('no-alerts-msg').style.display = 'block';
      container.innerHTML = '';
      return;
   }
   
   // Keep generic msg hidden if we render items
   const msg = document.getElementById('no-alerts-msg');
   if(msg) msg.style.display = 'none';

   let html = '';
   userAlerts.forEach(a => {
      const cls = a.active ? 'border-blue bg-surface fade-in' : 'border-dashed text-muted bg-primary';
      const condTxt = a.cond === '>' ? 'Rises Above' : 'Drops Below';
      
      html += `
         <div class="card p-3 d-flex justify-between align-center ${cls}" style="border-width: 1px;">
            <div class="d-flex align-center gap-3">
               <div class="logo-icon bg-secondary" style="width: 40px; height:40px;"><i class="fas ${a.active ? 'fa-bell text-blue' : 'fa-bell-slash text-muted'}"></i></div>
               <div>
                  <div class="fw-bold mb-1">${a.asset} ${condTxt} $${a.target.toLocaleString()}</div>
                  <div class="text-sm ${a.active ? 'text-green' : 'text-muted'}">${a.active ? 'Monitoring Active' : 'Triggered'}</div>
               </div>
            </div>
            <button class="btn btn-secondary btn-sm text-red" onclick="deleteAlert('${a.id}')"><i class="fas fa-trash"></i></button>
         </div>
      `;
   });
   
   container.innerHTML = html;
}

window.deleteAlert = function(id) {
   userAlerts = userAlerts.filter(a => a.id !== id);
   localStorage.setItem('tradex_alerts', JSON.stringify(userAlerts));
   renderAlerts();
   
   if(userAlerts.length === 0) {
      document.getElementById('alerts-container').innerHTML = `
         <div class="p-4 text-center text-muted border border-dashed rounded" id="no-alerts-msg">
            No active alerts. Click "New Alert" to configure one.
         </div>
      `;
   }
}

async function checkAlerts() {
   const active = userAlerts.filter(a => a.active);
   if(active.length === 0) return;

   try {
      const coins = await API.getTopCoins(50);
      
      active.forEach(a => {
         const coin = coins.find(c => c.symbol.toUpperCase() === a.asset);
         if (!coin) return;
         
         const px = coin.current_price;
         let triggered = false;
         
         if (a.cond === '>' && px > a.target) triggered = true;
         if (a.cond === '<' && px < a.target) triggered = true;
         
         if (triggered) {
            Core.showToast(`🚨 ALERT: ${a.asset} price crossed $${a.target}!`, 'warning');
            a.active = false;
         }
      });
      
      localStorage.setItem('tradex_alerts', JSON.stringify(userAlerts));
      renderAlerts();

   } catch(e) {}
}
