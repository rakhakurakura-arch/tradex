// fear-greed.js - Sentiment tracker logic
let fngChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadFngData();
});

async function loadFngData() {
  try {
    const raw = await API.getFearGreed();
    const data = raw.data;
    if(!data || data.length < 30) throw new Error("Incomplete historical data");

    const today = data[0];
    const yesterday = data[1];
    const lastWeek = data[7];
    const lastMonth = data[29]; // approximate 30 days ago

    // Update gauge
    const val = parseInt(today.value);
    document.getElementById('fng-value').textContent = val;
    const label = document.getElementById('fng-label');
    label.textContent = today.value_classification;

    // Semicircle rotates from -135deg (0%) to 45deg (100%)
    // Range is 180 degrees total based on 0-100 logic.
    const rotation = -135 + (val * 1.8);
    const fillLine = document.getElementById('fng-gauge-fill');
    
    // Set color dynamically on the filling border
    let activeColor = '#ff4444'; // Extreme Fear
    if(val > 25) activeColor = '#f59e0b'; // Fear/Neutral
    if(val > 55) activeColor = '#00d4aa'; // Greed
    if(val > 75) activeColor = '#00eabf'; // Extreme Greed
    
    label.style.color = activeColor;
    fillLine.style.borderColor = `transparent transparent ${activeColor} ${activeColor}`;
    // Force reflow for animation initial state
    void fillLine.offsetWidth;
    fillLine.style.transform = `rotate(${rotation}deg)`;

    // Update history blocks
    updateHistoryBlock('1', yesterday);
    updateHistoryBlock('7', lastWeek);
    updateHistoryBlock('30', lastMonth);

    // Plot 30 day chart
    plotChart([...data].reverse());

  } catch (error) {
    Core.showToast('Failed to load full F&G dataset', 'error');
    console.error(error);
  }
}

function updateHistoryBlock(idNum, obj) {
  const textEl = document.getElementById(`fng-hist-${idNum}`);
  const labelEl = document.getElementById(`fng-hist-${idNum}-label`);
  
  if(textEl && obj) {
     textEl.textContent = obj.value;
     textEl.classList.remove('skeleton-text-short', 'w-50');
     
     const val = parseInt(obj.value);
     let cls = 'text-red';
     if(val > 25) cls = 'text-yellow';
     if(val > 55) cls = 'text-green';
     
     textEl.className = `text-2xl fw-bold ${cls} mt-2`;
     if(labelEl) labelEl.textContent = obj.value_classification;
  }
}

function plotChart(data) {
  const ctx = document.getElementById('fng-chart').getContext('2d');
  
  const labels = data.map(d => {
    const date = new Date(parseInt(d.timestamp) * 1000);
    return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
  });
  const values = data.map(d => parseInt(d.value));
  
  const green = getComputedStyle(document.documentElement).getPropertyValue('--accent-green').trim();

  if(fngChartInstance) fngChartInstance.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 350);
  gradient.addColorStop(0, green + '66');
  gradient.addColorStop(1, green + '00');

  // Multi-colored points based on value zones
  const pointColors = values.map(v => {
    if(v <= 25) return '#ff4444';
    if(v <= 55) return '#f59e0b';
    return '#00d4aa';
  });

  fngChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'F&G Index',
        data: values,
        borderColor: green,
        borderWidth: 2,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: pointColors,
        pointBorderColor: '#000',
        pointBorderWidth: 1,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: function(ctx) { return ctx[0].label; },
            label: function(ctx) {
              const val = ctx.raw;
              let zone = 'Extreme Fear';
              if(val>25) zone = 'Fear';
              if(val>45) zone = 'Neutral';
              if(val>55) zone = 'Greed';
              if(val>75) zone = 'Extreme Greed';
              return `Index: ${val} (${zone})`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 7 }
        },
        y: {
          min: 0, max: 100,
          grid: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--border').trim()
          }
        }
      }
    }
  });

  window.addEventListener('themechanged', () => { plotChart(data); }, {once: true});
}
