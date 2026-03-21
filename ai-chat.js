// ai-chat.js - TradeX Copilot Interaction Handler

let chatHistory = JSON.parse(localStorage.getItem('tradex_chat_history') || '[]');

document.addEventListener('DOMContentLoaded', () => {

  const inputEl = document.getElementById('chat-composer');
  const sendBtn = document.getElementById('btn-send-chat');

  // Load history
  if (chatHistory.length > 0) {
     chatHistory.forEach(msg => {
       appendMessage(msg.text, msg.role, false);
     });
  }

  // Auto-resize textarea
  inputEl.addEventListener('input', function() {
    this.style.height = '60px'; // Reset
    this.style.height = (this.scrollHeight) + 'px';
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  sendBtn.addEventListener('click', handleSend);

  document.getElementById('btn-clear-chat').addEventListener('click', () => {
    if(confirm('Clear all chat history?')) {
       chatHistory = [];
       localStorage.setItem('tradex_chat_history', JSON.stringify([]));
       const container = document.getElementById('chat-messages-container');
       // keep only the first welcome message
       while(container.children.length > 1) {
          container.removeChild(container.lastChild);
       }
    }
  });

});

async function handleSend() {
  const inputEl = document.getElementById('chat-composer');
  const btn = document.getElementById('btn-send-chat');
  const text = inputEl.value.trim();
  
  if(!text) return;

  // UI Updates
  inputEl.value = '';
  inputEl.style.height = '60px';
  btn.disabled = true;

  // Add user message
  appendMessage(text, 'user');
  chatHistory.push({ role: 'user', text: text });

  // Add loading AI message
  const loadId = appendMessage('<i class="fas fa-circle-notch fa-spin text-green mr-2"></i> Thinking...', 'ai', true);

  // Construct context
  const port = JSON.parse(localStorage.getItem('tradex_portfolio') || '[]');
  const rules = JSON.parse(localStorage.getItem('tradex_settings') || '{}');
  const portStr = port.length > 0 ? `Current Portfolio: ${port.map(p=>p.amount+' '+p.symbol).join(', ')}.` : 'No portfolio assets currently tracked.';
  const systemPrompt = `You are TradeX Copilot, an elite quantitative analyst AI. Your tone is direct, analytical, and professional. You use markdown to format tables, bolding, and code. Current user context: ${portStr} Default fiat: ${rules.currency || 'USD'}. Provide specific, action-oriented responses without fluff.`;

  try {
     const reply = await API.askGroq(text, systemPrompt);
     
     // Update UI
     updateMessage(loadId, marked.parse(reply));
     chatHistory.push({ role: 'ai', text: reply });
     
     // Keep history manageable
     if(chatHistory.length > 50) chatHistory = chatHistory.slice(chatHistory.length - 50);
     localStorage.setItem('tradex_chat_history', JSON.stringify(chatHistory));

  } catch(err) {
     updateMessage(loadId, `<div class="text-red"><i class="fas fa-exclamation-triangle mr-2"></i> Error: Please configure your Groq API key in the settings panel to enable Copilot functionality.</div>`);
  } finally {
     btn.disabled = false;
     inputEl.focus();
  }
}

function appendMessage(text, role, isLoading = false) {
  const container = document.getElementById('chat-messages-container');
  const id = 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5);
  
  let html = '';
  if (role === 'user') {
    // Escape standard HTML for user to prevent simple injection
    const escaped = text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
    html = `
      <div class="d-flex gap-3 align-start justify-end" id="${id}">
        <div class="chat-bubble bubble-user">
          ${escaped}
        </div>
        <div class="logo-icon text-sm" style="width:36px;height:36px;min-width:36px; background:var(--bg-surface);"><i class="fas fa-user mb-0 text-muted"></i></div>
      </div>
    `;
  } else {
    // AI uses markdown parsing, assumed safe from Groq output, but parse if not loading
    const parsedText = isLoading ? text : marked.parse(text);
    html = `
      <div class="d-flex gap-3 align-start" id="${id}">
        <div class="logo-icon text-sm" style="width:36px;height:36px;min-width:36px; background:var(--accent-green);"><i class="fas fa-robot text-black"></i></div>
        <div class="chat-bubble bubble-ai markdown-body">
          ${parsedText}
        </div>
      </div>
    `;
  }
  
  container.insertAdjacentHTML('beforeend', html);
  container.scrollTop = container.scrollHeight;
  return id;
}

function updateMessage(id, htmlContent) {
  const el = document.getElementById(id);
  if(el) {
    el.querySelector('.markdown-body').innerHTML = htmlContent;
    const container = document.getElementById('chat-messages-container');
    container.scrollTop = container.scrollHeight;
  }
}
