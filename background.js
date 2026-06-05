// background.js — service worker
// Handles secure API communication via Google Gemini

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ENHANCE_PROMPT') {
    handleEnhance(message, sendResponse);
    return true; // keep channel open for async
  }
});

async function callGemini(apiKey, promptText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
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

async function handleEnhance({ prompt, mode, tone, apiKey, chatContext }, sendResponse) {

  const baseTemplates = {
    coding:   `You are an expert software engineer and prompt engineer.`,
    study:    `You are an expert educator and adaptive learning coach.`,
    writing:  `You are a professional writer and content strategist.`,
    business: `You are a senior business consultant and strategist.`,
    roadmap:  `You are an expert career advisor, skill-gap analyst, and adaptive learning architect.`
  };

  try {

    // ─── ROADMAP MODE: Two-step Skill-Gap Analysis ─────────────────────────────
    if (mode === 'roadmap' && chatContext && chatContext.length > 20) {

      // STEP 1: Analyze the conversation for demonstrated skills
      const analysisPrompt = `You are an expert skill-gap analyst. Analyze the following conversation history and extract a structured JSON profile of the learner.

CONVERSATION HISTORY:
${chatContext}

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "demonstratedSkills": ["list of technologies/concepts the user has clearly used or built"],
  "completedProjects": ["list of projects or achievements mentioned"],
  "currentLevel": "beginner | intermediate | advanced",
  "inferredGoals": ["list of career goals or learning objectives inferred"],
  "topicsToSkip": ["list of topics the user already has mastery of — these should NOT be in the roadmap"],
  "criticalGaps": ["list of the most important missing skills ranked by priority for their goals"]
}`;

      let skillProfile = null;
      try {
        const rawAnalysis = await callGemini(apiKey, analysisPrompt);
        // Strip markdown code fences if present
        const cleaned = rawAnalysis.replace(/```json|```/g, '').trim();
        skillProfile = JSON.parse(cleaned);
      } catch (e) {
        // Analysis failed — continue without it
        skillProfile = null;
      }

      // STEP 2: Generate the context-aware, gap-focused roadmap prompt
      let skillContext = '';
      if (skillProfile) {
        skillContext = `
--- LEARNER PROFILE (from conversation analysis) ---
Current Level: ${skillProfile.currentLevel || 'unknown'}
Demonstrated Skills: ${(skillProfile.demonstratedSkills || []).join(', ') || 'none detected'}
Completed Projects: ${(skillProfile.completedProjects || []).join(', ') || 'none detected'}
Inferred Goals: ${(skillProfile.inferredGoals || []).join(', ') || 'not specified'}
Topics to SKIP (already mastered): ${(skillProfile.topicsToSkip || []).join(', ') || 'none'}
Critical Skill Gaps (prioritized): ${(skillProfile.criticalGaps || []).join(', ') || 'not identified'}
----------------------------------------------------

IMPORTANT RULES based on this profile:
1. DO NOT include topics listed in "Topics to SKIP" anywhere in the roadmap.
2. START the roadmap at the user's current level (${skillProfile.currentLevel || 'adjust appropriately'}).
3. PRIORITIZE closing the "Critical Skill Gaps" listed above.
4. Acknowledge their completed projects as evidence of mastery — don't suggest re-learning them.`;
      }

      const roadmapPrompt = `${baseTemplates.roadmap}
${skillContext}

Generate a highly personalized, gap-focused learning roadmap prompt based on the user's request below.

The enhanced prompt must include:
Role: (who the AI should act as)
Goal: (the learner's specific objective)
Current State: (their demonstrated skills and level)
Skill Gaps to Close: (what they are missing, ranked by priority)
Roadmap Structure: (phases, not a generic beginner list — skip what they already know)
Milestones: (specific, measurable outcomes per phase)
Resources Format: (how the AI should format resources: courses, projects, timelines)
Constraints: (time, budget, or learning style preferences from their request)

Tone: ${tone || 'professional'}
Return ONLY the enhanced prompt. No preamble, no explanation.

User request: "${prompt}"`;

      const enhanced = await callGemini(apiKey, roadmapPrompt);
      if (!enhanced) { sendResponse({ error: 'Empty response from Gemini' }); return; }
      sendResponse({ enhanced, skillProfile });
      return;
    }

    // ─── STANDARD MODES (coding, study, writing, business) ─────────────────────
    let contextInjection = '';
    if (chatContext && chatContext.length > 0) {
      contextInjection = `\n--- ONGOING CONVERSATION CONTEXT ---\nThe user is currently in the middle of a chat. Here is the recent conversation history:\n\n${chatContext}\n------------------------------------\nEnsure the enhanced prompt naturally follows and builds upon this context.\n`;
    }

    const fullPrompt = `${baseTemplates[mode] || baseTemplates.coding}
${contextInjection}
Transform the user's vague prompt into a detailed, structured, high-quality prompt.
Use clear labels: Role:, Task:, Requirements:, Output Format:, Constraints:
Tone: ${tone || 'professional'}
Return ONLY the enhanced prompt. No preamble, no explanation.

User prompt to enhance: "${prompt}"`;

    const enhanced = await callGemini(apiKey, fullPrompt);
    if (!enhanced) { sendResponse({ error: 'Empty response from Gemini' }); return; }
    sendResponse({ enhanced });

  } catch (err) {
    sendResponse({ error: err.message });
  }
}
