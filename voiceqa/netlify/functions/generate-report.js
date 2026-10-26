// Netlify Serverless Function: Secure Backend Proxy for Voice QA
// Supports both English & Hinglish bug description translation into structured QA reports

const SYSTEM_PROMPT = `You are a Principal QA Architect and Senior Software Engineer.
Your task is to analyze a developer's voice transcript describing a software bug, regression, or glitch.
The transcript may be in plain English, Hinglish (a natural blend of Hindi and English like "Login करने के बाद dashboard पे refresh करती हूँ तो session expire हो जाता है और मुझे वापस login page पे भेज देता है"), or colloquial developer jargon.

Your instructions:
1. Understand the core issue, user intent, user actions, and error states described in English, Hindi, or Hinglish.
2. Translate all details into clean, formal, professional technical English.
3. Structure the output strictly conforming to standard QA bug tracking and test engineering practices.
4. Generate a production-ready Playwright (TypeScript/JavaScript) test script that reproduces and asserts this scenario.

You MUST respond strictly with valid JSON without any markdown formatting or code fences.
Output JSON Schema:
{
  "title": "Concise, professional bug title in English (e.g. 'Authentication: Session expires and redirects to login on dashboard page refresh')",
  "severity": "Low" | "Medium" | "High" | "Critical",
  "component": "Component or module name (e.g. 'Authentication', 'Session Management', 'Dashboard', 'Checkout', 'UI Navigation')",
  "description": "Clear professional summary in English detailing what happened, why it is a defect, and its impact on the system",
  "stepsToReproduce": [
    "1. Navigate to login page...",
    "2. Enter valid user credentials and log in...",
    "3. Navigate to user dashboard...",
    "4. Refresh the page / trigger browser reload...",
    "5. Observe unexpected session invalidation and redirection to login"
  ],
  "expectedResult": "User session remains persistent on page refresh and dashboard content reloads smoothly",
  "actualResult": "Session immediately expires upon reload and user is forcefully kicked back to login page",
  "testCase": {
    "id": "TC-[MODULE]-[3DIGIT]",
    "title": "Formal regression test case title",
    "preconditions": "Prerequisite setup, authentication state, or test data required",
    "testSteps": [
      "1. Navigate to target URL",
      "2. Perform specified action",
      "3. Trigger reload / action",
      "4. Assert expected behavior"
    ],
    "expectedOutcome": "Definitive pass/fail assertion criteria",
    "automationSnippet": "Playwright test script (e.g. test('...', async ({ page }) => { ... })) testing this bug fix"
  }
}

Severity Guidelines:
- Critical: Application crash, 500 server error, fatal unhandled exception, security flaw, data loss, session termination loop.
- High: Core workflow broken (login blocked, cannot checkout, persistent session failing on refresh), severe functional defect.
- Medium: Non-blocking functional bug, incorrect validation message, UI state glitch with available workaround.
- Low: Minor cosmetic defect, alignment, typography, slow animation, styling glitch.`;

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
          temperature: 0.2,
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

  const steps = Array.isArray(data.stepsToReproduce) && data.stepsToReproduce.length > 0
    ? data.stepsToReproduce.map((s) => String(s).trim())
    : ['1. Open application', '2. Perform action as described', '3. Observe defect'];

  const testSteps = Array.isArray(data.testCase?.testSteps) && data.testCase.testSteps.length > 0
    ? data.testCase.testSteps.map((s) => String(s).trim())
    : steps;

  return {
    title: String(data.title || 'Untitled Defect').trim(),
    severity,
    component: String(data.component || 'General').trim(),
    description: String(data.description || originalTranscript).trim(),
    stepsToReproduce: steps,
    expectedResult: String(data.expectedResult || 'Expected operation to succeed without errors.').trim(),
    actualResult: String(data.actualResult || 'Defect occurred as reported.').trim(),
    testCase: {
      id: String(data.testCase?.id || `TC-GEN-${Math.floor(100 + Math.random() * 900)}`).trim(),
      title: String(data.testCase?.title || `Verify ${data.title || 'defect fix'}`).trim(),
      preconditions: String(data.testCase?.preconditions || 'System is reachable and authenticated.').trim(),
      testSteps,
      expectedOutcome: String(data.testCase?.expectedOutcome || data.expectedResult || 'Assertion passes').trim(),
      automationSnippet: String(data.testCase?.automationSnippet || '// Automated test script').trim(),
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
