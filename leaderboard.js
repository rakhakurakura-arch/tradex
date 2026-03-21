// leaderboard.js - Global Trader Leaderboard (Simulated Data)

const mockedTraders = [
   { name: "QuantumBot_X", avatar: "🤖", winRate: 82.5, trades: 1450, pnl: 145.2 },
   { name: "Satoshi_Nakamoto_Real", avatar: "👑", winRate: 75.0, trades: 342, pnl: 98.4 },
   { name: "WhaleHunter99", avatar: "🐋", winRate: 68.2, trades: 890, pnl: 85.1 },
   { name: "DegenApe_2024", avatar: "🦧", winRate: 45.5, trades: 2100, pnl: 62.8 },
   { name: "Sniper_Elite", avatar: "🎯", winRate: 72.1, trades: 156, pnl: 45.9 },
   { name: "AlphaSeeker", avatar: "🐺", winRate: 65.4, trades: 430, pnl: 38.2 },
   { name: "MacroBull", avatar: "🐂", winRate: 58.9, trades: 88, pnl: 22.5 },
   { name: "Retail_King", avatar: "🛒", winRate: 54.2, trades: 650, pnl: 15.3 }
];

document.addEventListener('DOMContentLoaded', () => {
   const tbody = document.getElementById('leaderboard-tbody');
   
   // Sort by PnL Desc
   mockedTraders.sort((a,b) => b.pnl - a.pnl);

   let html = '';
   mockedTraders.forEach((t, i) => {
      let rankClass = '';
      let rankIcon = '';
      
      if (i === 0) { rankClass = 'rank-1'; rankIcon = '<i class="fas fa-crown"></i>'; }
      else if (i === 1) { rankClass = 'rank-2'; rankIcon = '2'; }
      else if (i === 2) { rankClass = 'rank-3'; rankIcon = '3'; }
      else { rankIcon = i + 1; }

      html += `
         <tr class="fade-in">
            <td class="text-center fw-bold ${rankClass}">${rankIcon}</td>
            <td>
               <div class="d-flex align-center gap-2">
                  <div class="logo-icon bg-secondary" style="width:32px;height:32px; font-size: 1.2rem;">${t.avatar}</div>
                  <div class="fw-bold">${t.name}</div>
               </div>
            </td>
            <td class="text-right">${t.winRate.toFixed(1)}%</td>
            <td class="text-right text-muted">${t.trades.toLocaleString()}</td>
            <td class="text-right fw-bold text-green">+${t.pnl.toFixed(2)}%</td>
            <td class="text-center">
               <button class="btn btn-primary btn-sm" onclick="alert('Copy trading requires Pro subscription.')">Copy</button>
            </td>
         </tr>
      `;
   });

   tbody.innerHTML = html;
});
