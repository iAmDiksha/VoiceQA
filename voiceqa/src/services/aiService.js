// AI service for Voice QA
// Supports both Google Gemini API (when configured) and a zero-config smart rule-based Hinglish/English parser

const SYSTEM_PROMPT = `You are an expert QA Lead and Software Engineer.
Your task is to analyze a spoken bug description provided by a developer. The input may be in plain English, Hinglish (Hindi-English blend), or colloquial speech.
Extract the bug details and convert it into a professional, structured bug report and a formal test case in English.

You MUST respond strictly with valid JSON without any markdown formatting or code blocks.
JSON Schema:
{
  "title": "Concise, professional bug title in English (e.g., 'Checkout fails with 500 error when applying coupon')",
  "severity": "Low" | "Medium" | "High" | "Critical",
  "component": "Name of the module/area (e.g. 'Checkout', 'Auth', 'Profile', 'UI', 'Payment')",
  "description": "Clear professional explanation of the defect and its impact on the system",
  "stepsToReproduce": [
    "Step 1...",
    "Step 2...",
    "Step 3..."
  ],
  "expectedResult": "Expected behavior according to specifications",
  "actualResult": "Observed buggy behavior, crashes, or errors",
  "testCase": {
    "id": "TC-MODULE-001",
    "title": "Formal Test Case Title",
    "preconditions": "Required initial system state",
    "testSteps": [
      "1. Navigate to...",
      "2. Perform action...",
      "3. Verify..."
    ],
    "expectedOutcome": "What the test should assert",
    "automationSnippet": "Playwright or Cypress javascript snippet testing this scenario"
  }
}`;

export async function generateBugReport(transcript, apiKey) {
  const cleanTranscript = (transcript || '').trim();
  if (!cleanTranscript) {
    throw new Error('Please provide or dictate a bug description first.');
  }

  // If API key is available, call Google Gemini 1.5/2.0 Flash
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const response = await callGeminiAPI(cleanTranscript, apiKey.trim());
      return response;
    } catch (err) {
      console.warn('Gemini API call failed, falling back to smart local parser:', err);
      // Fallback to local parser if API error occurs so user is never blocked
      return generateWithLocalParser(cleanTranscript, err.message);
    }
  }

  // Zero-config offline smart parser
  return generateWithLocalParser(cleanTranscript);
}

async function callGeminiAPI(transcript, apiKey) {
  // Use Gemini 2.5 Flash / 1.5 Flash endpoint
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const payload = {
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
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error?.message || `API request failed with status ${res.status}`;
    throw new Error(message);
  }

  const data = await res.json();
  const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error('Received empty response from Gemini API.');
  }

  // Parse JSON output
  try {
    const cleaned = textOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse Gemini JSON output:', textOutput);
    throw new Error('Failed to parse AI response into structured JSON format.');
  }
}

// Smart zero-config Hinglish & English local QA parser
function generateWithLocalParser(rawText, fallbackNotice = null) {
  const text = rawText.toLowerCase();

  // Detect component
  let component = 'General';
  if (/login|signin|sign in|auth|password|otp|logout/i.test(text)) component = 'Authentication';
  else if (/checkout|cart|payment|order|coupon|discount|upi|stripe|razorpay/i.test(text)) component = 'Checkout & Payments';
  else if (/profile|avatar|user info|account|settings/i.test(text)) component = 'User Profile';
  else if (/navbar|sidebar|menu|header|footer|modal|popup|dropdown/i.test(text)) component = 'UI Navigation';
  else if (/search|filter|sort|pagination/i.test(text)) component = 'Search & Discovery';
  else if (/upload|download|export|import|file|pdf|image/i.test(text)) component = 'File Management';

  // Detect severity
  let severity = 'Medium';
  if (/crash|500|fatal|freeze|hang|unresponsive|data loss|corrupt|security|blank screen|white screen/i.test(text)) {
    severity = 'Critical';
  } else if (/404|cannot|unable|fail|block|stuck|timeout|nahi ho raha|nahi chal raha|error/i.test(text)) {
    severity = 'High';
  } else if (/minor|typo|color|alignment|slow|delay|glitch|spacing|cosmetic/i.test(text)) {
    severity = 'Low';
  }

  // Extract / translate core problem from Hinglish
  let actualObserved = '';
  let expectedBehavior = '';

  if (/500|internal server/i.test(text)) {
    actualObserved = 'Application returns HTTP 500 Internal Server Error, stopping execution.';
    expectedBehavior = 'Request should process successfully or return a user-friendly error message.';
  } else if (/blank screen|white screen|safed screen/i.test(text)) {
    actualObserved = 'Screen renders completely blank with unhandled React runtime error.';
    expectedBehavior = 'Component should render gracefully with proper error boundaries.';
  } else if (/crash|freeze|hang|band ho jata/i.test(text)) {
    actualObserved = 'Application freezes or crashes without error recovery.';
    expectedBehavior = 'Application should remain responsive and stable during user interaction.';
  } else if (/loader|spinner.*ghoomta|stuck.*loading/i.test(text)) {
    actualObserved = 'Infinite loading spinner is displayed; state is never resolved.';
    expectedBehavior = 'Loading spinner should dismiss upon API response or error timeout.';
  } else {
    actualObserved = `Unexpected behavior observed: "${rawText.substring(0, 140)}..."`;
    expectedBehavior = 'System should complete the requested action without error.';
  }

  // Construct structured steps to reproduce
  const steps = [];
  steps.push(`Open the application and navigate to the ${component} section.`);

  if (/login|sign in|auth/i.test(text)) {
    steps.push('Enter user credentials on the login screen.');
    steps.push('Click on the "Sign In" / "Submit" button.');
  } else if (/checkout|cart|payment/i.test(text)) {
    steps.push('Add an item to the shopping cart and proceed to Checkout.');
    if (/coupon|discount/i.test(text)) {
      steps.push('Enter a promo / coupon code in the discount input field and click Apply.');
    }
    steps.push('Click on the "Proceed to Payment" or "Place Order" button.');
  } else if (/profile|avatar|upload/i.test(text)) {
    steps.push('Go to the user profile or account settings page.');
    steps.push('Attempt to upload a file / image or edit information.');
    steps.push('Click on "Save Changes".');
  } else {
    steps.push('Perform the specific user interaction described in the bug scenario.');
    steps.push('Trigger the target submission or button click.');
  }
  steps.push('Observe the resulting application behavior and console logs.');

  // Generate automated test snippet (Playwright)
  const testId = `TC-${component.replace(/[^A-Z]/g, '').slice(0, 4) || 'GEN'}-${Math.floor(100 + Math.random() * 900)}`;
  const cleanTitle = generateCleanTitle(rawText, component);

  const automationSnippet = `test('${cleanTitle}', async ({ page }) => {
  // 1. Arrange: Go to target view
  await page.goto('/${component.toLowerCase().replace(/\s+/g, '-')}');

  // 2. Act: Replicate developer spoken steps
  // e.g., click target elements
  await page.getByRole('button', { name: /submit|apply|checkout/i }).click();

  // 3. Assert: Verify bug does not reoccur
  await expect(page.locator('.error-banner')).toBeHidden();
  await expect(page).not.toHaveURL(/error|500/);
});`;

  return {
    title: cleanTitle,
    severity,
    component,
    description: `Voice QA defect identified in [${component}]: User reported: "${rawText}". ${
      fallbackNotice ? `(Note: Parsed in offline smart mode. Configure Gemini API key in settings for custom AI generation).` : ''
    }`,
    stepsToReproduce: steps,
    expectedResult: expectedBehavior,
    actualResult: actualObserved,
    testCase: {
      id: testId,
      title: `Verify ${component} handles scenario without defect: ${cleanTitle}`,
      preconditions: 'User is authenticated and system services are reachable.',
      testSteps: steps.map((s, idx) => `${idx + 1}. ${s}`),
      expectedOutcome: expectedBehavior,
      automationSnippet,
    },
  };
}

function generateCleanTitle(rawText, component) {
  // Extract key keywords to build a concise title
  const words = rawText.split(/\s+/).slice(0, 10).join(' ');
  if (/500|internal server/i.test(rawText)) {
    return `${component}: Returns HTTP 500 error during transaction`;
  }
  if (/blank screen|white screen/i.test(rawText)) {
    return `${component}: Renders blank white screen on user action`;
  }
  if (/crash|freeze|hang/i.test(rawText)) {
    return `${component}: Application freezes unexpectedly upon interaction`;
  }
  if (/button|click/i.test(rawText) && /fail|nahi/i.test(rawText)) {
    return `${component}: Action button is unresponsive to user click`;
  }
  return `${component}: Defect reported - ${words.slice(0, 50)}...`;
}
