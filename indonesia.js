// indonesia.js - Local IDR market handling

let idrRate = 15500;
let allCryptoIdr = [];

document.addEventListener('DOMContentLoaded', async () => {
   
   // Tax Calculator binding
   const taxInp = document.getElementById('tax-input');
   taxInp.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      // PPh 0.1% + PPN 0.11% = 0.21%
      const tax = val * 0.0021; 
      document.getElementById('tax-result').textContent = `Rp ${tax.toLocaleString('id-ID')}`;
   });

   // USD/IDR Converter binding
   const cvUsd = document.getElementById('conv-usd');
   const cvIdr = document.getElementById('conv-idr');
   
   cvUsd.addEventListener('input', (e) => {
      const usd = parseFloat(e.target.value) || 0;
      cvIdr.value = (usd * idrRate).toFixed(0);
   });
   cvIdr.addEventListener('input', (e) => {
      const idr = parseFloat(e.target.value) || 0;
      cvUsd.value = (idr / idrRate).toFixed(2);
   });

   // Search 
   document.getElementById('idr-search').addEventListener('input', (e) => {
      renderIdrTable(e.target.value);
   });

   await fetchIdrData();
});

async function fetchIdrData() {
   try {
      // 1. Fetch Global Data
      const coins = await API.getTopCoins(20);
      
      // 2. Fetch or mock IDR rate (since CoinGecko free doesn't always have live forex easily without another endpoint)
      // Using a static realistic rate for the demo
      idrRate = 15550; 
      document.getElementById('usd-idr-rate').textContent = `Rp ${idrRate.toLocaleString('id-ID')} / USD`;

      // 3. Process into IDR
      let totalMcapIdr = 0;
      let totalVolIdr = 0;

      allCryptoIdr = coins.map(c => {
         const priceIdr = c.current_price * idrRate;
         const mcapIdr = c.market_cap * idrRate;
         const volIdr = c.total_volume * idrRate;

         totalMcapIdr += mcapIdr;
         totalVolIdr += volIdr;

         return { ...c, priceIdr, mcapIdr, volIdr };
      });

      // 4. Update Header Stats
      document.getElementById('idr-mcap').textContent = `Rp ${(totalMcapIdr / 1e12).toFixed(2)} Triliun`;
      document.getElementById('idr-vol').textContent = `Rp ${(totalVolIdr / 1e12).toFixed(2)} Triliun`;

      // 5. Mock Exchange Spread for core assets (BTC)
      const btc = allCryptoIdr.find(c => c.symbol === 'btc');
      if(btc) {
         const basePrice = btc.priceIdr;
         document.getElementById('exc-indodax').textContent = `Rp ${(basePrice * 1.002).toLocaleString('id-ID', {maximumFractionDigits:0})}`;
         document.getElementById('exc-toko').textContent = `Rp ${(basePrice * 1.001).toLocaleString('id-ID', {maximumFractionDigits:0})}`;
         document.getElementById('exc-pintu').textContent = `Rp ${(basePrice * 1.003).toLocaleString('id-ID', {maximumFractionDigits:0})}`;
      }

      renderIdrTable('');

   } catch (err) {
      console.error("IDR Load Error", err);
      document.getElementById('idr-tbody').innerHTML = `<tr><td colspan="5" class="text-center py-5 text-red">Gagal memuat data dari server global.</td></tr>`;
   }
}

function renderIdrTable(searchQuery = '') {
   const tbody = document.getElementById('idr-tbody');
   const query = searchQuery.toLowerCase();

   const filtered = allCryptoIdr.filter(c => 
      c.symbol.toLowerCase().includes(query) || c.name.toLowerCase().includes(query)
   );

   if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-muted">Aset tidak ditemukan.</td></tr>`;
      return;
   }

   let html = '';
   filtered.forEach(c => {
      const pnl = c.price_change_24h || c.price_change_percentage_24h || c.price_change_percentage_24h_in_currency || 0;
      const pnlClass = pnl >= 0 ? 'text-green' : 'text-red';
      const arrow = pnl >= 0 ? 'fa-caret-up' : 'fa-caret-down';

      html += `
         <tr class="fade-in">
            <td>
               <div class="d-flex align-center gap-2">
                  <img src="${c.image}" style="width:24px;height:24px;border-radius:50%;" onerror="this.style.display='none'">
                  <div class="fw-bold">${c.symbol.toUpperCase()}</div>
               </div>
            </td>
            <td class="text-right fw-bold">Rp ${c.priceIdr.toLocaleString('id-ID', {maximumFractionDigits:0})}</td>
            <td class="text-right fw-bold ${pnlClass}"><i class="fas ${arrow} mr-1"></i>${Math.abs(pnl).toFixed(2)}%</td>
            <td class="text-right d-none-mobile text-muted">Rp ${(c.volIdr / 1e9).toFixed(1)} Miliar</td>
            <td class="text-center">
               <button class="btn btn-secondary btn-sm" onclick="window.location.href='signals.html?asset=${c.symbol}'">Analisa</button>
            </td>
         </tr>
      `;
   });

   tbody.innerHTML = html;
}
