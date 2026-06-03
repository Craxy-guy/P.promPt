# P.promPt — Chrome Extension

> Transform vague prompts into powerful, structured AI instructions — instantly.

![P.promPt Banner](icons/icon128.png)

---

## ✦ Features

- **One-click prompt enhancement** via Google Gemini API (free!)
- **Quality score bar** — before & after comparison
- **4 templates**: Coding, Study, Writing, Business
- **Inject directly** into ChatGPT / Claude / Gemini textarea
- **Copy to clipboard**
- **Save to history** (last 20 prompts)
- **Tone selector**: Professional / Casual / Technical / Concise
- **Platform detection** — knows which AI site you're on

---

## 🚀 Setup

### 1. Get a free Gemini API Key
- Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- Sign in with Google → Click **"Create API Key"**
- Copy your key (starts with `AIza...`)
- **No billing required — it's free!**

### 2. Load the extension in Chrome
1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer Mode** (toggle, top right)
3. Click **Load unpacked**
4. Select this `P.promPt/` folder
5. The **P.** icon will appear in your toolbar — pin it!

### 3. Add your API Key
1. Click the **P.** icon in the Chrome toolbar
2. Click the **⚙** settings icon (top right of popup)
3. Paste your Gemini API key
4. Click **Save Key**

---

## 🧠 How to use

1. Go to **claude.ai**, **chatgpt.com**, or **gemini.google.com**
2. Click the **P.** icon in your toolbar
3. Type or paste your vague prompt
4. Pick a template (Coding / Study / Writing / Business)
5. Hit **✦ Enhance Prompt**
6. Click **Inject** to paste directly into the chat, or **Copy**

---

## 📁 File Structure

```
P.promPt/
├── manifest.json     ← Extension config (Manifest V3)
├── popup.html        ← Extension popup UI
├── popup.css         ← Dark theme styles
├── popup.js          ← UI logic + API calls
├── background.js     ← Service worker (Gemini API handler)
├── content.js        ← Textarea injection on AI platforms
├── content.css       ← Reserved for future floating UI
└── icons/            ← Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## ⚙️ Tech Stack

- Chrome Manifest V3
- Vanilla HTML + CSS + JS (no build step needed)
- Google Gemini API (`gemini-2.5-flash`) — **free tier**
- `chrome.storage.local` for persistence

---

## 🔒 Privacy

Your API key is stored **locally** in Chrome's storage and is **only ever sent to Google's Gemini API**. No data is collected or shared.

---

## 📄 License

MIT — free to use, modify, and distribute.
