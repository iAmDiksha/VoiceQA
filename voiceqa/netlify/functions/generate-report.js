// Netlify Serverless Function: Secure Backend Proxy for Voice QA
// Supports both English & Hinglish bug description translation into structured QA reports

const SYSTEM_PROMPT = `You are a Principal QA Architect and Senior Software Engineer.
Your task is to analyze a developer's voice transcript describing a software bug, regression, or glitch.
The transcript may be in plain English, Hinglish (a mix of Hindi and English), or colloquial developer jargon.

════════════════════════════════════════
CORE DIRECTIVE — READ BEFORE ANYTHING ELSE
════════════════════════════════════════
You MUST derive every field STRICTLY from what the developer explicitly stated in the transcript.

NEVER invent, assume, or fabricate:
- URLs, routes, or page paths not mentioned in the transcript
- CSS selectors, element IDs, ARIA roles, or DOM queries
- Login credentials, usernames, passwords, or test accounts
- API endpoints, HTTP status codes, or error message text not stated
- Browser names, OS versions, device types unless explicitly mentioned
- Technical root causes, backend reasons, or code-level explanations
- Specific reproduction steps beyond what the speaker described

If a piece of information is MISSING from the transcript, write exactly:
  "[MISSING — not stated in transcript]"

Do NOT substitute a plausible-sounding value for missing information.

════════════════════════════════════════
FACT vs. ASSUMPTION RULES
════════════════════════════════════════
- Separate what the developer explicitly said (facts) from what you infer (assumptions).
- In the "description" field: present confirmed facts first, then mark any inferences clearly with the prefix "Assumption:".
- In "stepsToReproduce": only include steps the developer explicitly described. Do NOT add steps that sound logical but were not mentioned. Use "[MISSING — step not described]" as a placeholder if a critical step cannot be determined.
- In "expectedResult": if not stated, write "[MISSING — expected behavior not described in transcript]".
- In "actualResult": use only what the developer reported. Do not embellish or add technical detail not in the transcript.

════════════════════════════════════════
TEST CASE RULES
════════════════════════════════════════
- Generate specific, non-generic test cases grounded in the reported scenario.
- Avoid boilerplate test steps like "navigate to the application" unless that is literally what was described.
- Each test step must correspond to an action the transcript implies.
- Do NOT repeat the bug report steps verbatim — rephrase them as verifiable QA assertions.

════════════════════════════════════════
PLAYWRIGHT SCRIPT RULES (CRITICAL)
════════════════════════════════════════
The automationSnippet field MUST follow these strict rules:

1. Do NOT invent any page.goto() URL. If the URL is not in the transcript, use:
     await page.goto(/* [PLACEHOLDER: insert actual app URL] */);
2. Do NOT invent CSS selectors, data-testid values, or getByRole locators based on guesses.
   Use descriptive placeholders:
     await page.locator(/* [PLACEHOLDER: selector for login button] */).click();
3. Do NOT invent credentials. Use:
     const email = process.env.TEST_USER_EMAIL; // [PLACEHOLDER: set in .env]
     const password = process.env.TEST_USER_PASSWORD; // [PLACEHOLDER: set in .env]
4. Mark the entire script with a comment at the top:
     // DRAFT — Requires application-specific configuration before it can be run.
     // Replace all [PLACEHOLDER] comments with real values from your application.
5. Only assert behaviors that were explicitly mentioned in the transcript.
6. Do NOT add assertions for things not mentioned (e.g. do not assert on .error-banner if that was not described).

════════════════════════════════════════
OUTPUT FORMAT
════════════════════════════════════════
You MUST respond strictly with valid JSON — no markdown, no code fences, no prose outside JSON.

{
  "title": "Concise, professional bug title derived strictly from the transcript (max 100 chars)",
  "severity": "Low | Medium | High | Critical",
  "component": "Component or module name inferred from transcript context (e.g. 'Authentication', 'Session Management', 'Dashboard'). If unclear, write 'General'.",
  "description": "Professional English summary of: (1) what the developer explicitly reported, (2) the defect's impact. Prefix any inference with 'Assumption:'. Do not invent technical root causes.",
  "stepsToReproduce": [
    "Only steps the developer explicitly described.",
    "Use '[MISSING — step not described]' for any gap in the reproduction path.",
    "Do NOT add invented steps to make the list look complete."
  ],
  "expectedResult": "What the developer said they expected, in their own words translated to professional English. If not stated: '[MISSING — expected behavior not described in transcript]'.",
  "actualResult": "What the developer said actually happened, strictly from transcript. No added technical speculation.",
  "testCase": {
    "id": "TC-[COMPONENT_ABBREV]-[3-digit number]",
    "title": "Specific regression test title for this exact scenario",
    "preconditions": "Only preconditions derivable from the transcript. Use '[MISSING — not stated]' for unknown prerequisites.",
    "testSteps": [
      "Rephrase reproduction steps as verifiable QA actions.",
      "Each step must be specific to this bug, not generic.",
      "Do NOT add steps not implied by the transcript."
    ],
    "expectedOutcome": "Specific, verifiable assertion criteria derived from transcript's expected behavior.",
    "automationSnippet": "// DRAFT — Requires application-specific configuration before it can be run.\\n// Replace all [PLACEHOLDER] comments with real values from your application.\\ntest('[test name from transcript]', async ({ page }) => {\\n  // [PLACEHOLDER: add real steps derived only from transcript]\\n});"
  }
}

════════════════════════════════════════
SEVERITY GUIDELINES
════════════════════════════════════════
- Critical: Application crash, data loss, security vulnerability, complete feature failure, unrecoverable session loop.
- High: Core workflow broken (cannot log in, cannot check out, session lost on refresh), blocking defect.
- Medium: Non-blocking functional bug, incorrect validation, UI state glitch with a workaround available.
- Low: Minor cosmetic issue, typo, alignment, slow animation, non-functional styling glitch.`;

// Supported active Gemini models verified via Google AI Studio API
export const DEFAULT_MODEL = 'gemini-3.5-flash';
export const ALLOWED_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-pro-latest',
];

export async function processReportGeneration(payload, apiKeyOverride) {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  const transcript = (payload.transcript || '').trim();
  const requestedModel = payload.model || DEFAULT_MODEL;
  const primaryModel = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : DEFAULT_MODEL;

  if (!transcript) {
    return {
      status: 400,
      body: { success: false, error: 'Voice transcript cannot be empty.' },
    };
  }

  // If no API key is configured on backend, instruct client to use smart fallback
  if (!apiKey || apiKey.trim().length < 10) {
    return {
      status: 200,
      body: {
        success: false,
        fallbackRequired: true,
        error: 'GEMINI_API_KEY is not configured in backend environment variables. Using smart local parser fallback.',
      },
    };
  }

  // Try primary model first, with automatic fallback across allowed models if 503/404 occurs
  const candidateModels = [primaryModel, ...ALLOWED_MODELS.filter((m) => m !== primaryModel)];
  let lastErrorMessage = '';

  for (const modelToTry of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:generateContent?key=${apiKey.trim()}`;

      const requestPayload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: SYSTEM_PROMPT },
              { text: `Developer Spoken Input:\n"${transcript}"` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topP: 0.85,
          responseMimeType: 'application/json',
        },
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const message = errJson.error?.message || `Gemini API returned status ${res.status}`;
        lastErrorMessage = message;
        console.warn(`Model ${modelToTry} attempt failed (${res.status}): ${message}. Trying next candidate...`);
        // If 503 (high demand) or 404 (model not found), continue loop to next model
        if (res.status === 503 || res.status === 404) {
          continue;
        }
        // For other fatal errors (e.g. invalid key 400/403), stop
        return {
          status: 200,
          body: {
            success: false,
            fallbackRequired: true,
            error: `AI Provider Error: ${message}`,
          },
        };
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        lastErrorMessage = 'Received empty response from AI model.';
        continue;
      }

      // Clean and validate the JSON
      const parsed = cleanAndParseJSON(rawText);
      const validated = validateAndSanitizeReport(parsed, transcript);

      return {
        status: 200,
        body: {
          success: true,
          data: validated,
          modelUsed: modelToTry,
        },
      };
    } catch (err) {
      console.warn(`Exception calling ${modelToTry}:`, err.message);
      lastErrorMessage = err.message;
    }
  }

  // If all models failed
  return {
    status: 200,
    body: {
      success: false,
      fallbackRequired: true,
      error: `AI Provider Error: ${lastErrorMessage || 'All available Gemini models failed'}`,
    },
  };
}

function cleanAndParseJSON(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

function validateAndSanitizeReport(data, originalTranscript) {
  const severities = ['Low', 'Medium', 'High', 'Critical'];
  const severity = severities.includes(data.severity) ? data.severity : 'High';

  // Preserve [MISSING] markers returned by AI — do not overwrite with invented fallbacks
  const isMissing = (val) =>
    !val || String(val).trim().toLowerCase().startsWith('[missing');

  const steps =
    Array.isArray(data.stepsToReproduce) && data.stepsToReproduce.length > 0
      ? data.stepsToReproduce.map((s) => String(s).trim())
      : ['[MISSING — reproduction steps not described in transcript]'];

  const testSteps =
    Array.isArray(data.testCase?.testSteps) && data.testCase.testSteps.length > 0
      ? data.testCase.testSteps.map((s) => String(s).trim())
      : steps;

  const expectedResult = isMissing(data.expectedResult)
    ? (data.expectedResult || '[MISSING — expected behavior not described in transcript]')
    : String(data.expectedResult).trim();

  const actualResult = isMissing(data.actualResult)
    ? (data.actualResult || '[MISSING — actual behavior not described in transcript]')
    : String(data.actualResult).trim();

  const preconditions = isMissing(data.testCase?.preconditions)
    ? (data.testCase?.preconditions || '[MISSING — preconditions not stated in transcript]')
    : String(data.testCase.preconditions).trim();

  return {
    title: String(data.title || 'Untitled Defect').trim(),
    severity,
    component: String(data.component || 'General').trim(),
    description: String(data.description || originalTranscript).trim(),
    stepsToReproduce: steps,
    expectedResult,
    actualResult,
    testCase: {
      id: String(data.testCase?.id || `TC-GEN-${Math.floor(100 + Math.random() * 900)}`).trim(),
      title: String(data.testCase?.title || `Verify ${data.title || 'defect fix'}`).trim(),
      preconditions,
      testSteps,
      expectedOutcome: String(
        data.testCase?.expectedOutcome || data.expectedResult || '[MISSING — expected outcome not stated]'
      ).trim(),
      automationSnippet: String(
        data.testCase?.automationSnippet ||
          '// DRAFT — Requires application-specific configuration before it can be run.\n// Replace all [PLACEHOLDER] comments with real values from your application.'
      ).trim(),
    },
  };
}

// Netlify Functions v2 standard export
export default async (req) => {
  // Health check ping
  const url = new URL(req.url);
  if (req.method === 'GET' && url.searchParams.get('ping') === 'true') {
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10);
    return new Response(
      JSON.stringify({
        status: 'ok',
        aiConfigured: hasKey,
        defaultModel: DEFAULT_MODEL,
        availableModels: ALLOWED_MODELS,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  let payload = {};
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const result = await processReportGeneration(payload);
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Netlify Functions v1 handler export (backward compatibility)
export async function handler(event) {
  if (event.httpMethod === 'GET' && event.queryStringParameters?.ping === 'true') {
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ok',
        aiConfigured: hasKey,
        defaultModel: DEFAULT_MODEL,
        availableModels: ALLOWED_MODELS,
      }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const result = await processReportGeneration(payload);
  return {
    statusCode: result.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.body),
  };
}
