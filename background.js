// background.js — service worker
// Intent-first, relevance-gated adaptive prompt engine

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ENHANCE_PROMPT') {
    handleEnhance(message, sendResponse);
    return true;
  }
});

// ─── GEMINI API CALL ──────────────────────────────────────────────────────────

async function callGemini(apiKey, promptText, temperature = 0.7) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature,
        thinkingConfig: { thinkingBudget: 0 }
      }
    })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'API error');
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

// ─── STEP 1: INTENT + RELEVANCE GATE ─────────────────────────────────────────
// Determines the user's CURRENT intent first.
// Only extracts enrichment data from history if it is genuinely relevant.
// Context history never overrides current intent.

async function detectIntentAndRelevance(apiKey, chatContext, userPrompt) {
  const gatePrompt = `You are an intent classifier and relevance evaluator.

CURRENT USER MESSAGE (primary signal — this is what matters most):
"${userPrompt}"

RECENT CONVERSATION HISTORY (secondary signal — only relevant if it directly relates to the current message):
${chatContext}

Your job:
1. Identify EXACTLY what the user wants RIGHT NOW based on their current message.
2. Determine whether the conversation history is genuinely relevant to this request.

RELEVANCE RULES:
- Mark as RELEVANT if the user's message: references previous discussion, asks for continuation, refinement, follow-up, or expansion of a prior topic, OR if knowing their background would meaningfully improve the prompt.
- Mark as NOT RELEVANT if the user's message is: a new topic, a general/casual question, unrelated to prior discussion, or self-contained.

Return ONLY a valid JSON object (no markdown fences, no explanation):
{
  "currentIntent": "one sentence describing what the user wants right now",
  "intentCategory": "technical | creative | learning | personal | analytical | casual | continuation | decision",
  "contextRelevant": true or false,
  "relevanceReason": "brief reason why context is or isn't relevant",
  "enrichment": {
    "userLevel": "novice | beginner | intermediate | advanced | expert — only if determinable from history",
    "relevantBackground": ["only background facts from history that directly help the current request"],
    "style": "visual | hands-on | theoretical | mixed | unknown",
    "topicsToSkip": ["only if user has already demonstrated mastery of topics related to current request"]
  }
}`;

  try {
    const raw = await callGemini(apiKey, gatePrompt, 0.2);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    // Gate failed — proceed with no context at all (safe fallback)
    return { contextRelevant: false, currentIntent: userPrompt, intentCategory: 'general', enrichment: {} };
  }
}

// ─── STEP 2: PROMPT BUILDER ───────────────────────────────────────────────────
// Current intent is always the PRIMARY driver.
// Enrichment from context is injected ONLY when relevance gate passes.

function buildPrompt(userPrompt, mode, tone, gateResult) {

  const personas = {
    coding:   'You are an expert software engineer and prompt engineer.',
    study:    'You are an expert educator and adaptive learning coach.',
    writing:  'You are a professional writer and content strategist.',
    business: 'You are a senior business consultant and strategist.',
    general:  'You are a highly empathetic, knowledgeable assistant across health & wellness, mental health, gaming, relationships, lifestyle, fitness, hobbies, travel, nutrition, and personal development.'
  };

  const persona = personas[mode] || personas.general;
  const intent  = gateResult?.currentIntent || userPrompt;
  const enrich  = gateResult?.enrichment || {};
  const useCtx  = gateResult?.contextRelevant === true;

  // ── Context enrichment block — only injected when gate passes ────────────────
  let contextBlock = '';
  if (useCtx && enrich) {
    const bg   = (enrich.relevantBackground || []).join('; ');
    const skip = (enrich.topicsToSkip || []).join(', ');
    const lvl  = enrich.userLevel || 'unknown';
    const style = enrich.style || 'unknown';

    if (bg || skip || lvl !== 'unknown') {
      contextBlock = `
=== RELEVANT USER BACKGROUND (use only to enrich — do not override intent) ===
User Level          : ${lvl}
Relevant Background : ${bg || 'none'}
Topics to Skip      : ${skip || 'none — do not assume mastery'}
Learning Style      : ${style}
IMPORTANT: The above is supplementary. The user's current request below is the primary directive.
=== END BACKGROUND ===
`;
    }
  }

  // ── Instruction block ────────────────────────────────────────────────────────
  const instructions = `
Generate a structured, high-quality prompt for the following request.

REQUIREMENTS for the generated prompt:
1. Role:          Define the precise expert persona the AI should adopt.
2. Goal:          State the user's CURRENT objective clearly and specifically.
3. Approach:      Describe HOW the AI should respond — structure, method, depth.
4. Output Format: Specify exactly what the response should look like.
5. Constraints:   Note any limitations, preferences, or scope boundaries.
6. OMIT sections that add no value — keep it focused.

TAGGING: Where relevant, tag items as:
[CORE] = essential  |  [RECOMMENDED] = important  |  [OPTIONAL] = enrichment  |  [ADVANCED] = post-mastery

Tone: ${tone || 'professional'}
Return ONLY the enhanced prompt. No preamble. No explanation.`;

  return `${persona} You are also an expert prompt engineer.

CURRENT USER INTENT: ${intent}
${contextBlock}
${instructions}

USER'S MESSAGE TO ENHANCE:
"${userPrompt}"`;
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

async function handleEnhance({ prompt, mode, tone, apiKey, chatContext }, sendResponse) {
  try {
    let gateResult = null;

    // Only run relevance gate when context is available
    if (chatContext && chatContext.trim().length > 30) {
      gateResult = await detectIntentAndRelevance(apiKey, chatContext, prompt);
    }

    // Build prompt — context only included if gate marked it relevant
    const metaPrompt = buildPrompt(prompt, mode, tone, gateResult);
    const enhanced   = await callGemini(apiKey, metaPrompt);

    if (!enhanced) {
      sendResponse({ error: 'Empty response from Gemini' });
      return;
    }

    // Only pass enrichment back to UI when context was actually used
    const uiProfile = (gateResult?.contextRelevant && gateResult?.enrichment)
      ? {
          contextUsed:    true,
          relevanceReason: gateResult.relevanceReason,
          knowledgeLevel: gateResult.enrichment.userLevel,
          intentCategory: gateResult.intentCategory,
          currentIntent:  gateResult.currentIntent,
          topicsToSkip:   gateResult.enrichment.topicsToSkip || [],
          demonstratedStrengths: gateResult.enrichment.relevantBackground || []
        }
      : null;

    sendResponse({ enhanced, skillProfile: uiProfile });

  } catch (err) {
    sendResponse({ error: err.message });
  }
}
