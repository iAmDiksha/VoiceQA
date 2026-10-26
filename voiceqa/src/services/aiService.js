// AI service for Voice QA
// Proxies all AI requests securely through the Netlify Serverless Function
// Maintains the smart rule-based parser as an offline/instant fallback

export async function checkBackendAIStatus() {
  try {
    const endpoint = typeof window !== 'undefined'
      ? '/.netlify/functions/generate-report?ping=true'
      : 'http://localhost:5173/.netlify/functions/generate-report?ping=true';
    const res = await fetch(endpoint);
    if (!res.ok) return { online: false, aiConfigured: false };
    const data = await res.json();
    return {
      online: true,
      aiConfigured: Boolean(data.aiConfigured),
      defaultModel: data.defaultModel || 'gemini-3.5-flash',
      availableModels: data.availableModels || ['gemini-3.5-flash', 'gemini-3.5-flash-lite'],
    };
  } catch (err) {
    console.warn('Backend ping failed:', err);
    return { online: false, aiConfigured: false, error: err.message };
  }
}

export async function generateBugReport(transcript, selectedModel = 'gemini-3.5-flash') {
  const cleanTranscript = (transcript || '').trim();
  if (!cleanTranscript) {
    throw new Error('Please provide or dictate a bug description first.');
  }

  // Attempt generation via Netlify Function Backend Proxy
  try {
    const endpoint = typeof window !== 'undefined'
      ? '/.netlify/functions/generate-report'
      : 'http://localhost:5173/.netlify/functions/generate-report';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: cleanTranscript,
        model: selectedModel,
      }),
    });

    if (response.ok) {
      const result = await response.json();

      // If AI succeeded and returned structured report
      if (result.success && result.data) {
        const validated = validateStructuredReport(result.data, cleanTranscript);
        return {
          ...validated,
          _source: 'ai',
          _model: result.modelUsed || selectedModel,
        };
      }

      // If backend explicitly told us to fall back (e.g. key missing or AI provider error)
      if (result.fallbackRequired) {
        console.info('Backend requested fallback:', result.error);
        const fallbackReport = generateWithLocalParser(cleanTranscript, result.error);
        return {
          ...fallbackReport,
          _source: 'fallback',
          _fallbackReason: result.error,
        };
      }
    }
  } catch (netErr) {
    console.warn('Network call to Netlify function failed, switching to local fallback:', netErr);
  }

  // Seamless local fallback if backend endpoint was unreachable
  const localFallback = generateWithLocalParser(cleanTranscript, 'Backend function unreachable');
  return {
    ...localFallback,
    _source: 'fallback',
    _fallbackReason: 'Backend function unreachable; generated using local smart engine.',
  };
}

// Client-side validation of structured JSON schema (Requirement 4)
function validateStructuredReport(data, originalTranscript) {
  if (!data || typeof data !== 'object') {
    throw new Error('Malformed AI response: expected JSON object.');
  }

  const severities = ['Low', 'Medium', 'High', 'Critical'];
  const severity = severities.includes(data.severity) ? data.severity : 'Medium';

  const stepsToReproduce = Array.isArray(data.stepsToReproduce) && data.stepsToReproduce.length > 0
    ? data.stepsToReproduce.map((s) => String(s).trim())
    : ['1. Perform the user interaction described in the bug scenario.'];

  const testSteps = Array.isArray(data.testCase?.testSteps) && data.testCase.testSteps.length > 0
    ? data.testCase.testSteps.map((s) => String(s).trim())
    : stepsToReproduce;

  return {
    title: String(data.title || 'Untitled Defect').trim(),
    severity,
    component: String(data.component || 'General').trim(),
    description: String(data.description || originalTranscript).trim(),
    stepsToReproduce,
    expectedResult: String(data.expectedResult || 'Expected operation to succeed without error.').trim(),
    actualResult: String(data.actualResult || 'Defect occurred as described.').trim(),
    testCase: {
      id: String(data.testCase?.id || `TC-GEN-${Math.floor(100 + Math.random() * 900)}`).trim(),
      title: String(data.testCase?.title || `Verify ${data.title || 'reported defect fix'}`).trim(),
      preconditions: String(data.testCase?.preconditions || 'User authenticated and system operational.').trim(),
      testSteps,
      expectedOutcome: String(data.testCase?.expectedOutcome || data.expectedResult || 'Assertion passes.').trim(),
      automationSnippet: String(data.testCase?.automationSnippet || '// Playwright test script').trim(),
    },
  };
}

// Smart zero-config Hinglish & English local QA fallback parser
export function generateWithLocalParser(rawText, fallbackNotice = null) {
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

  const testId = `TC-${component.replace(/[^A-Z]/g, '').slice(0, 4) || 'GEN'}-${Math.floor(100 + Math.random() * 900)}`;
  const cleanTitle = generateCleanTitle(rawText, component);

  const automationSnippet = `test('${cleanTitle}', async ({ page }) => {
  // 1. Arrange: Go to target view
  await page.goto('/${component.toLowerCase().replace(/\s+/g, '-')}');

  // 2. Act: Replicate developer spoken steps
  await page.getByRole('button', { name: /submit|apply|checkout/i }).click();

  // 3. Assert: Verify bug does not reoccur
  await expect(page.locator('.error-banner')).toBeHidden();
  await expect(page).not.toHaveURL(/error|500/);
});`;

  return {
    title: cleanTitle,
    severity,
    component,
    description: `Defect identified in [${component}]: User reported: "${rawText}".${
      fallbackNotice ? ` (Notice: ${fallbackNotice})` : ''
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
