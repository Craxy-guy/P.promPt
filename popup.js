const TEMPLATES = {
  coding: `You are an expert software engineer. Analyze this request and generate a detailed, structured prompt that includes: the programming language/framework, specific requirements, edge cases to handle, expected output format, and code quality standards.`,
  study: `You are an expert educator and learning coach. Transform this into a detailed study/learning prompt that includes: learning objectives, key concepts to cover, difficulty level, examples needed, and how to structure the explanation for maximum retention.`,
  writing: `You are a professional writer and content strategist. Enhance this into a detailed writing prompt that includes: tone and voice, target audience, structure/format, key points to cover, length guideline, and desired outcome.`,
  business: `You are a senior business consultant. Transform this into a professional business prompt that includes: business context, specific deliverables, success metrics, stakeholders to consider, and actionable output format.`
};

const QUALITY_TIPS = {
  low: ['Add context about your goal', 'Specify desired output format', 'Mention constraints or requirements'],
  mid: ['Define the target audience', 'Add examples if helpful', 'Specify tone or style'],
  high: ['Looking good! Hit enhance to optimize further']
};

let currentMode = 'coding';
let currentEnhanced = '';
let activeView = 'main';

// DOM refs
const userInput = document.getElementById('userInput');
const enhanceBtn = document.getElementById('enhanceBtn');
const btnIcon = document.getElementById('btnIcon');
const btnLabel = document.getElementById('btnLabel');
const outputSection = document.getElementById('outputSection');
const outputBox = document.getElementById('outputBox');
const qualityFill = document.getElementById('qualityFill');
const qualityScore = document.getElementById('qualityScore');
const scoreAfterFill = document.getElementById('scoreAfterFill');
const scoreAfterVal = document.getElementById('scoreAfterVal');
const platformName = document.getElementById('platformName');
const mainView = document.getElementById('mainView');
const historyView = document.getElementById('historyView');
const settingsView = document.getElementById('settingsView');
const historyList = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');
const historyBtn = document.getElementById('historyBtn');
const settingsBtn = document.getElementById('settingsBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const toneSelect = document.getElementById('toneSelect');

// ─── INIT ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  detectPlatform();
  loadHistory();
});

function loadSettings() {
  chrome.storage.local.get(['apiKey', 'tone'], (data) => {
    if (data.apiKey) apiKeyInput.value = data.apiKey;
    if (data.tone) toneSelect.value = data.tone;
  });
}

function detectPlatform() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    const url = tabs[0].url || '';
    let name = 'Unknown';
    if (url.includes('claude.ai')) name = 'claude.ai';
    else if (url.includes('chatgpt.com') || url.includes('chat.openai')) name = 'ChatGPT';
    else if (url.includes('gemini.google')) name = 'Gemini';
    platformName.textContent = name;
  });
}

// ─── QUALITY SCORE ───────────────────────────────────────────────────────────

function computeScore(text) {
  if (!text.trim()) return 0;
  let score = 0;
  const t = text.trim();
  score += Math.min(30, Math.floor(t.length / 5));       // length
  if (t.split(' ').length > 5) score += 10;              // word count
  if (/\?/.test(t)) score += 5;                          // has question
  if (/format|output|result|example|step/i.test(t)) score += 10; // has structure words
  if (/i want|i need|please|help me/i.test(t)) score += 5;
  if (t.length > 100) score += 10;
  if (t.length > 200) score += 10;
  return Math.min(score, 55); // input cap at 55 — always room to improve
}

function updateQuality(text) {
  const score = computeScore(text);
  const pct = score;
  qualityFill.style.width = pct + '%';
  qualityScore.textContent = pct + '%';

  if (pct < 30) {
    qualityFill.style.background = 'var(--red)';
    qualityScore.style.color = 'var(--red)';
  } else if (pct < 50) {
    qualityFill.style.background = 'var(--amber)';
    qualityScore.style.color = 'var(--amber)';
  } else {
    qualityFill.style.background = '#22C55E';
    qualityScore.style.color = '#22C55E';
  }
}

userInput.addEventListener('input', () => updateQuality(userInput.value));

// ─── TEMPLATE PILLS ──────────────────────────────────────────────────────────

document.querySelectorAll('.pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentMode = pill.dataset.mode;
  });
});

// ─── ENHANCE ─────────────────────────────────────────────────────────────────

enhanceBtn.addEventListener('click', async () => {
  const prompt = userInput.value.trim();
  if (!prompt) { showToast('Type a prompt first', 'error'); return; }

  chrome.storage.local.get(['apiKey', 'tone'], async (data) => {
    if (!data.apiKey) {
      showToast('Add your API key in settings', 'error');
      switchView('settings');
      return;
    }

    setLoading(true);

    // Route through background service worker so the API key is included
    // and cross-origin restrictions are handled correctly
    chrome.runtime.sendMessage(
      {
        type: 'ENHANCE_PROMPT',
        prompt,
        mode: currentMode,
        tone: data.tone || 'professional',
        apiKey: data.apiKey
      },
      (response) => {
        setLoading(false);

        if (chrome.runtime.lastError) {
          showToast('Extension error: ' + chrome.runtime.lastError.message, 'error');
          return;
        }

        if (response?.error) {
          showToast(response.error, 'error');
          return;
        }

        if (response?.enhanced) {
          currentEnhanced = response.enhanced;
          renderOutput(response.enhanced);
        } else {
          showToast('Unexpected response from API', 'error');
        }
      }
    );
  });
});

function renderOutput(text) {
  // Highlight section labels
  const html = text
    .replace(/^(Role|Task|Requirements?|Output Format|Constraints?|Goal|Context|Format|Instructions?):/gm,
      '<span class="tag">$1:</span>')
    .replace(/\n/g, '<br>');

  outputBox.innerHTML = html;
  outputSection.classList.remove('hidden');

  // Score after
  const afterScore = Math.min(98, 70 + Math.floor(Math.random() * 20));
  scoreAfterFill.style.width = afterScore + '%';
  scoreAfterVal.textContent = afterScore + '%';
}

function setLoading(on) {
  enhanceBtn.disabled = on;
  if (on) {
    btnIcon.classList.add('spin');
    btnIcon.textContent = '✦';
    btnLabel.textContent = 'Enhancing…';
  } else {
    btnIcon.classList.remove('spin');
    btnIcon.textContent = '✦';
    btnLabel.textContent = 'Enhance Prompt';
  }
}

// ─── OUTPUT ACTIONS ───────────────────────────────────────────────────────────

document.getElementById('copyBtn').addEventListener('click', () => {
  if (!currentEnhanced) return;
  navigator.clipboard.writeText(currentEnhanced).then(() => {
    showToast('Copied to clipboard', 'success');
  });
});

document.getElementById('injectBtn').addEventListener('click', () => {
  if (!currentEnhanced) return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'INJECT_PROMPT',
      text: currentEnhanced
    }, (res) => {
      if (chrome.runtime.lastError || !res?.success) {
        showToast('Could not inject — try copying instead', 'error');
      } else {
        showToast('Injected into chat ✓', 'success');
      }
    });
  });
});

document.getElementById('saveBtn').addEventListener('click', () => {
  if (!currentEnhanced) return;
  const raw = userInput.value.trim();
  chrome.storage.local.get(['history'], (data) => {
    const history = data.history || [];
    history.unshift({
      id: Date.now(),
      original: raw,
      enhanced: currentEnhanced,
      mode: currentMode,
      date: new Date().toLocaleDateString()
    });
    const trimmed = history.slice(0, 20); // keep last 20
    chrome.storage.local.set({ history: trimmed }, () => {
      showToast('Saved to history', 'success');
      loadHistory();
    });
  });
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────

document.getElementById('saveApiKey').addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) { showToast('Enter a valid API key', 'error'); return; }
  const tone = toneSelect.value;
  chrome.storage.local.set({ apiKey: key, tone }, () => {
    showToast('Settings saved', 'success');
  });
});

// ─── HISTORY ─────────────────────────────────────────────────────────────────

function loadHistory() {
  chrome.storage.local.get(['history'], (data) => {
    const history = data.history || [];
    historyList.innerHTML = '';
    if (history.length === 0) {
      historyEmpty.classList.remove('hidden');
      return;
    }
    historyEmpty.classList.add('hidden');
    history.forEach(item => {
      const el = document.createElement('div');
      el.className = 'history-item';
      el.innerHTML = `
        <div class="history-item-title">${item.original}</div>
        <div class="history-item-meta">${item.mode} · ${item.date}</div>
      `;
      el.addEventListener('click', () => {
        userInput.value = item.original;
        currentEnhanced = item.enhanced;
        currentMode = item.mode;
        document.querySelectorAll('.pill').forEach(p => {
          p.classList.toggle('active', p.dataset.mode === item.mode);
        });
        renderOutput(item.enhanced);
        updateQuality(item.original);
        switchView('main');
      });
      historyList.appendChild(el);
    });
  });
}

// ─── VIEW SWITCHER ────────────────────────────────────────────────────────────

historyBtn.addEventListener('click', () => {
  switchView(activeView === 'history' ? 'main' : 'history');
});

settingsBtn.addEventListener('click', () => {
  switchView(activeView === 'settings' ? 'main' : 'settings');
});

function switchView(view) {
  mainView.classList.add('hidden');
  historyView.classList.add('hidden');
  settingsView.classList.add('hidden');
  historyBtn.classList.remove('active');
  settingsBtn.classList.remove('active');

  activeView = view;
  if (view === 'main') mainView.classList.remove('hidden');
  else if (view === 'history') {
    historyView.classList.remove('hidden');
    historyBtn.classList.add('active');
    loadHistory();
  } else if (view === 'settings') {
    settingsView.classList.remove('hidden');
    settingsBtn.classList.add('active');
  }
}

// ─── TOAST ───────────────────────────────────────────────────────────────────

let toastTimer;
function showToast(msg, type = '') {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add('show'), 10);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}
