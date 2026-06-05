<div align="center">

# P.promPt

### AI Prompt Enhancement Chrome Extension

*Transform vague ideas into structured, context-aware, high-quality AI prompts — instantly.*

[![GitHub](https://img.shields.io/badge/Open%20Source-MIT-6C5CE7?style=flat-square)](https://github.com/Craxy-guy/P.promPt)
[![Gemini](https://img.shields.io/badge/Powered%20by-Gemini%202.5%20Flash-4285F4?style=flat-square)](https://aistudio.google.com)
[![Chrome](https://img.shields.io/badge/Chrome-Manifest%20V3-green?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/)
[![Free](https://img.shields.io/badge/API-Free%20Tier-22C55E?style=flat-square)](https://aistudio.google.com/app/apikey)

</div>

---

## What is P.promPt?

P.promPt is a Chrome extension that sits on top of your favourite AI platforms — **ChatGPT, Claude, and Gemini** — and upgrades the quality of every prompt you type.

Instead of sending a vague message and getting a generic response, P.promPt:

1. **Detects your intent** from your current message
2. **Reads the conversation** (when relevant) to personalise the output
3. **Generates a structured, role-based prompt** with clear sections, priorities, and output format directives
4. **Injects it directly** into the chat with one click

---

## Features

### Core

| Feature | Description |
|---|---|
| ✦ **One-click enhancement** | Transforms any vague prompt into a detailed, structured AI instruction |
| 📋 **Copy to clipboard** | Copy the enhanced prompt with one click |
| ↗ **Direct injection** | Inject the prompt straight into ChatGPT / Claude / Gemini's text box |
| 🔖 **Prompt history** | Saves the last 20 enhanced prompts for quick recall |
| 🎨 **Tone selector** | Professional · Casual · Technical · Concise |
| 🌐 **Platform detection** | Automatically detects whether you're on ChatGPT, Claude, or Gemini |

---

### Template Modes

Five domain-specific modes, each with a tailored AI persona:

| Mode | Persona | Best For |
|---|---|---|
| ⌥ **Coding** | Senior software engineer | Algorithms, debugging, architecture, code review |
| ◎ **Study** | Adaptive learning coach | Concepts, explanations, revision, exam prep |
| ✍ **Writing** | Content strategist | Blog posts, essays, copy, storytelling |
| ◈ **Business** | Senior business consultant | Strategy, analysis, reports, decision-making |
| ◉ **General** | Life & wellness assistant | Health, gaming, therapy, relationships, lifestyle, travel, nutrition |

---

### Intent-First Context Engine

P.promPt features an advanced two-step pipeline that makes every prompt smarter when you're mid-conversation.

#### How it works

```
Your message → Intent Detection → Relevance Gate
                                        │
                    ┌───────────────────┴──────────────────────┐
               Relevant? YES                           Relevant? NO
          Context used to enrich                  Context discarded
          prompt with background                  Intent-only prompt
```

#### Step 1 — Intent Detection + Relevance Gate

Before doing anything with your conversation history, the engine:

- Identifies **exactly what you want right now** from your current message
- Evaluates whether the conversation history is **genuinely relevant** to that request
- Only proceeds to use context if the gate passes

**Gate rules — context IS used when your message:**
- References or continues the previous discussion
- Asks for a follow-up, refinement, or expansion of a prior topic
- Would meaningfully benefit from knowing your background

**Gate rules — context is IGNORED when your message:**
- Is a completely new topic
- Is a general/casual question
- Is self-contained with no dependency on history

> **Example:** If your previous conversation was about Clash Royale deck optimisation and you type *"How was your day?"*, the gate correctly ignores all gaming context and generates a clean, general prompt.

#### Step 2 — Adaptive Prompt Generation

The prompt builder uses **8 core principles** to generate the final structured prompt:

1. **Context Awareness** — Uses your background only when relevant; never asks for info already available
2. **Gap Analysis** — Targets weaknesses and missing skills, not generic overviews
3. **Practical Outcomes** — Pushes for actionable, real-world results: working code, decisions, plans
4. **Prioritisation** — Tags every item with a priority badge:
   - `[CORE]` — essential, must-know
   - `[RECOMMENDED]` — important but not blocking
   - `[OPTIONAL]` — enrichment and nice-to-have
   - `[ADVANCED]` — post-mastery content
5. **Adaptive Progression** — Starts from your current level; defines milestones before advancing
6. **Dynamic Specialisation** — Goal-driven paths, never generic cookie-cutter curricula
7. **Objective Optimisation** — Adapts structure to: learning · career growth · research · project completion · creativity · decision-making
8. **Redundancy Elimination** — Actively skips topics you've already mastered

---

### Context Analysis Card

When the context gate passes, the extension displays a **Context Applied** card above the enhanced prompt showing:

- **Intent** — what the engine understood you to want
- **Level** — your inferred knowledge level
- **Background** — relevant facts pulled from your history
- **Skipped** — topics crossed out as already mastered
- **Why** — the reason context was included

When the gate rejects history as irrelevant, a **◎ Context Not Applied** notice is shown instead so you always know what the engine decided.

---

### Include Chat Context Toggle

A toggle switch above the Enhance button lets you turn context reading on or off at any time.

- **ON** (default) — reads your current chat history and passes it through the relevance gate
- **OFF** — skips all context scraping; generates purely from the text you typed

Your preference is respected regardless of the platform you're on.

---

## Setup

### Step 1 — Get a free Gemini API Key

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the key (starts with `AIza…`)

> No billing required. The Gemini 2.5 Flash free tier is sufficient.

### Step 2 — Install the extension in Chrome

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer Mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `P.promPt/` folder
6. The **P.** icon will appear in your Chrome toolbar — pin it for easy access

### Step 3 — Add your API Key

1. Click the **P.** icon in the toolbar
2. Click the **⚙** icon (top-right of the popup)
3. Paste your Gemini API key
4. Click **Save Key**

---

## How to use

1. Navigate to **chatgpt.com**, **claude.ai**, or **gemini.google.com**
2. Click the **P.** icon in your Chrome toolbar
3. Type or paste your rough idea into the text box
4. Select a template mode (Coding / Study / Writing / Business / General)
5. Choose your tone from the settings if needed
6. Click **✦ Enhance Prompt**
7. Review the enhanced prompt and the context card
8. Click **↗ Inject** to paste it directly into the chat, or **📋 Copy**

---

## File Structure

```
P.promPt/
├── manifest.json      ← Chrome Extension config (Manifest V3)
├── popup.html         ← Extension popup UI
├── popup.css          ← Dark theme design system
├── popup.js           ← UI logic, context scraping, injection
├── background.js      ← Service worker — Gemini API + intent engine
├── content.js         ← Page script for textarea injection
├── content.css        ← Reserved for future floating UI
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension | Chrome Manifest V3 |
| Language | Vanilla JavaScript (no build step) |
| Styling | Vanilla CSS with custom design tokens |
| AI Model | Google Gemini 2.5 Flash |
| Storage | `chrome.storage.local` (local only) |
| Injection | `chrome.scripting.executeScript` |

---

## Privacy

- Your API key is stored **locally** in Chrome's storage only
- It is **never sent anywhere** except directly to Google's Gemini API
- Conversation context is scraped **locally from the active tab** and sent to Gemini solely for prompt generation
- No analytics, no tracking, no external servers

---

## License

MIT — free to use, modify, and distribute.

---

<div align="center">
Built with ✦ by <a href="https://github.com/Craxy-guy">Craxy-guy</a>
</div>
