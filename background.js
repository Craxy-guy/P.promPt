// background.js — service worker
// Handles secure API communication via Google Gemini

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ENHANCE_PROMPT') {
    handleEnhance(message, sendResponse);
    return true; // keep channel open for async
  }
});

async function handleEnhance({ prompt, mode, tone, apiKey }, sendResponse) {
  const templates = {
    coding: `You are an expert software engineer and prompt engineer.`,
    study: `You are an expert educator and learning coach.`,
    writing: `You are a professional writer and content strategist.`,
    business: `You are a senior business consultant and strategist.`
  };

  const fullPrompt = `${templates[mode] || templates.coding}

Transform the user's vague prompt into a detailed, structured, high-quality prompt.
Use clear labels: Role:, Task:, Requirements:, Output Format:, Constraints:
Tone: ${tone || 'professional'}
Return ONLY the enhanced prompt. No preamble, no explanation.

User prompt to enhance: "${prompt}"`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: fullPrompt }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      })
    });

    if (!res.ok) {
      const err = await res.json();
      sendResponse({ error: err.error?.message || 'API error' });
      return;
    }

    const data = await res.json();
    const enhanced = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!enhanced) {
      sendResponse({ error: 'Empty response from Gemini' });
      return;
    }

    sendResponse({ enhanced });

  } catch (err) {
    sendResponse({ error: err.message });
  }
}

