// background.js — service worker
// Gemini-powered adaptive prompt enhancement engine

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ENHANCE_PROMPT') {
    handleEnhance(message, sendResponse);
    return true;
  }
});

// ─── GEMINI API CALL ─────────────────────────────────────────────────────────

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

// ─── STEP 1: UNIVERSAL CONTEXT ANALYZER ──────────────────────────────────────
// Runs for ANY mode when chat context is available.
// Returns a structured userProfile JSON.

async function analyzeContext(apiKey, chatContext, userPrompt) {
  const analysisPrompt = `You are an expert analyst specializing in user profiling, skill assessment, and learning design. Analyze the conversation history and the user's current request to build a precise profile.

CONVERSATION HISTORY:
${chatContext}

USER'S CURRENT REQUEST:
"${userPrompt}"

Return ONLY a valid JSON object (no markdown fences, no explanation) with this exact structure:
{
  "knowledgeLevel": "novice | beginner | intermediate | advanced | expert",
  "primaryObjective": "learning | career_growth | skill_development | research | project_completion | creativity | decision_making",
  "secondaryObjectives": ["array of additional goals inferred from context"],
  "demonstratedStrengths": ["specific topics, tools, or skills the user clearly knows"],
  "identifiedGaps": [
    { "topic": "gap name", "importance": "critical | high | medium | low", "impact": "high | medium | low" }
  ],
  "completedWork": ["projects, tasks, or concepts already demonstrated or completed"],
  "topicsToSkip": ["topics the user has already mastered — do not repeat these"],
  "constraints": {
    "time": "inferred time constraint if any, else null",
    "budget": "inferred budget constraint if any, else null",
    "style": "inferred learning/work style: visual | hands-on | theoretical | mixed | unknown"
  },
  "nextLogicalSteps": ["the 3-5 most logical immediate next steps based on their current level"],
  "domainContext": "the primary domain or field this conversation is about",
  "complexityPreference": "simplified | standard | detailed | expert-level"
}`;

  try {
    const raw = await callGemini(apiKey, analysisPrompt, 0.3);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return null; // analysis failed — proceed without profile
  }
}

// ─── STEP 2: ADAPTIVE META-PROMPT BUILDER ────────────────────────────────────
// Constructs a principle-based meta-prompt from the user profile.
// Domain-agnostic — applies to learning, career, research, creativity, etc.

function buildMetaPrompt(profile, userPrompt, mode, tone) {

  const baseTemplates = {
    coding:   `You are an expert software engineer and prompt engineer.`,
    study:    `You are an expert educator and adaptive learning coach.`,
    writing:  `You are a professional writer and content strategist.`,
    business: `You are a senior business consultant and strategist.`,
    general:  `You are a highly empathetic, knowledgeable life assistant with expertise across everyday domains including health & wellness, mental health and therapy, gaming, relationships, lifestyle, fitness, hobbies, travel, nutrition, personal development, and general problem-solving.`
  };

  const modePersona = baseTemplates[mode] || baseTemplates.general;

  // ── Build the contextual profile block ──────────────────────────────────────
  let profileBlock = '';
  if (profile) {
    const gaps = (profile.identifiedGaps || [])
      .sort((a, b) => {
        const rank = { critical: 0, high: 1, medium: 2, low: 3 };
        return (rank[a.importance] || 2) - (rank[b.importance] || 2);
      })
      .map(g => `${g.topic} [importance: ${g.importance}, impact: ${g.impact}]`)
      .join(', ');

    profileBlock = `
=== USER CONTEXT PROFILE (derived from conversation) ===
Knowledge Level     : ${profile.knowledgeLevel || 'unknown'}
Primary Objective   : ${(profile.primaryObjective || 'learning').replace(/_/g, ' ')}
Secondary Objectives: ${(profile.secondaryObjectives || []).join(', ') || 'none'}
Domain              : ${profile.domainContext || 'general'}
Demonstrated Skills : ${(profile.demonstratedStrengths || []).join(', ') || 'none detected'}
Completed Work      : ${(profile.completedWork || []).join(', ') || 'none mentioned'}
Topics to SKIP      : ${(profile.topicsToSkip || []).join(', ') || 'none'}
Prioritized Gaps    : ${gaps || 'not identified'}
Next Logical Steps  : ${(profile.nextLogicalSteps || []).join(', ') || 'not identified'}
Time Constraint     : ${profile.constraints?.time || 'not specified'}
Budget Constraint   : ${profile.constraints?.budget || 'not specified'}
Learning Style      : ${profile.constraints?.style || 'unknown'}
Complexity Level    : ${profile.complexityPreference || 'standard'}
=== END PROFILE ===
`;
  }

  // ── Build principle-based instructions ──────────────────────────────────────
  const principles = `
=== PROMPT GENERATION PRINCIPLES — APPLY ALL OF THESE ===

PRINCIPLE 1 — CONTEXT AWARENESS:
- Use the user profile above. Do NOT ask for information already available.
- Calibrate the complexity of the generated prompt to the user's knowledge level.
- Reference their demonstrated skills and completed work where relevant.
- Never recommend content listed under "Topics to SKIP".

PRINCIPLE 2 — GAP ANALYSIS INTEGRATION:
- The generated prompt must instruct the AI to address the "Prioritized Gaps" above.
- Explicitly direct focus toward weaknesses, not general overviews.
- Acknowledge strengths — do not re-teach what is already mastered.

PRINCIPLE 3 — PRACTICAL & OUTCOME-ORIENTED:
- The generated prompt must push for actionable, real-world application.
- Favor outputs like: working code, analysis reports, project plans, creative work, decisions.
- Include instructions for the AI to show examples, demonstrations, or working implementations.

PRINCIPLE 4 — PRIORITIZATION (apply to all recommendations):
- Every topic, resource, or step should be tagged with one of:
  [CORE] — essential, must-know for the objective
  [RECOMMENDED] — important but not blocking
  [OPTIONAL] — enrichment, nice to have
  [ADVANCED] — for after core mastery is achieved
- Order all content by: importance → impact → difficulty progression.

PRINCIPLE 5 — ADAPTIVE PROGRESSION:
- Structure the generated prompt to instruct the AI to:
  a) Start from the user's current competency level — not from zero.
  b) Define clear milestones before moving to more advanced content.
  c) Build on demonstrated strengths as a foundation.
  d) Suggest "logical next steps" that align with: ${profile?.nextLogicalSteps?.join(', ') || 'user goals'}.

PRINCIPLE 6 — SPECIALIZATION PATHS:
- Do NOT use fixed, generic paths. Let the user's stated goal (${profile?.primaryObjective || 'their objective'}) drive the path.
- If the user has a specific goal (project, career, research), optimize every recommendation toward that end.
- Avoid cookie-cutter curricula — make it feel bespoke.

PRINCIPLE 7 — OBJECTIVE OPTIMIZATION:
Primary objective is: ${(profile?.primaryObjective || mode).replace(/_/g, ' ')}
- "learning": Focus on conceptual clarity, examples, analogies.
- "career_growth": Focus on industry-relevant skills, portfolio, networking.
- "skill_development": Focus on deliberate practice, feedback loops, projects.
- "research": Focus on methodology, literature, analysis frameworks.
- "project_completion": Focus on practical steps, architecture, implementation.
- "creativity": Focus on ideation, experimentation, constraints as tools.
- "decision_making": Focus on frameworks, tradeoffs, evidence evaluation.

PRINCIPLE 8 — REDUNDANCY ELIMINATION:
- The generated prompt must NOT include sections, steps, or recommendations that repeat anything listed in "Topics to SKIP" or "Completed Work".
- Actively trim redundant beginner content when the user is intermediate or above.

=== END PRINCIPLES ===
`;

  // ── Final meta-prompt assembly ──────────────────────────────────────────────
  return `${modePersona} You are also an expert prompt engineer. Your task is to generate a highly personalized, principle-driven prompt based on the user's request and their context profile.
${profileBlock}
${principles}

=== INSTRUCTIONS FOR THE GENERATED PROMPT ===
The prompt you generate must:
1. Begin with: "Role:" — define the precise expert persona the AI should adopt for this specific user and goal.
2. Include: "Goal:" — the user's actual objective in specific, measurable terms.
3. Include: "User Context:" — brief summary of their level, completed work, and constraints.
4. Include: "Skill Gaps to Address:" — the critical and high-importance gaps to target (from profile).
5. Include: "Approach:" — how the AI should structure its response, using the CORE/RECOMMENDED/OPTIONAL/ADVANCED tagging system.
6. Include: "Milestones:" — clear progress checkpoints before advancing.
7. Include: "Output Format:" — specify exactly what the response should look like (code, plan, analysis, etc.).
8. Include: "Constraints:" — time, budget, style, level preferences.
9. OMIT any section that doesn't apply — keep only what adds value.

Tone: ${tone || 'professional'}
Return ONLY the enhanced prompt. No preamble. No explanation. No meta-commentary.

=== USER'S REQUEST TO ENHANCE ===
"${userPrompt}"`;
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

async function handleEnhance({ prompt, mode, tone, apiKey, chatContext }, sendResponse) {
  try {
    let profile = null;

    // Step 1: Analyze context for ANY mode (not just roadmap)
    if (chatContext && chatContext.length > 30) {
      profile = await analyzeContext(apiKey, chatContext, prompt);
    }

    // Step 2: Build adaptive meta-prompt and call Gemini
    const metaPrompt = buildMetaPrompt(profile, prompt, mode, tone);
    const enhanced = await callGemini(apiKey, metaPrompt);

    if (!enhanced) {
      sendResponse({ error: 'Empty response from Gemini' });
      return;
    }

    sendResponse({ enhanced, skillProfile: profile });

  } catch (err) {
    sendResponse({ error: err.message });
  }
}
