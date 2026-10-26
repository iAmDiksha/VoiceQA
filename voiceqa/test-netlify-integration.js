// End-to-End Netlify Function Integration Verification Script
import { processReportGeneration } from './netlify/functions/generate-report.js';

async function runTests() {
  console.log('--- Test 1: Testing missing transcript (400 validation) ---');
  const res1 = await processReportGeneration({ transcript: '' });
  console.log('Result 1 status:', res1.status, 'body:', res1.body);
  if (res1.status !== 400 || res1.body.success !== false) {
    throw new Error('Test 1 failed: expected 400 for empty transcript');
  }

  console.log('\n--- Test 2: Testing unconfigured backend key (graceful fallback signal) ---');
  const res2 = await processReportGeneration(
    { transcript: 'Payment gateway pe click karne pe 500 error aa gaya' },
    '' // No key
  );
  console.log('Result 2 status:', res2.status, 'fallbackRequired:', res2.body.fallbackRequired);
  if (!res2.body.fallbackRequired) {
    throw new Error('Test 2 failed: expected fallbackRequired: true');
  }

  console.log('\n--- Test 3: Testing HTTP endpoint via running Vite dev server ---');
  const pingResponse = await fetch('http://localhost:5173/.netlify/functions/generate-report?ping=true');
  const pingData = await pingResponse.json();
  console.log('Ping endpoint response:', pingData);
  if (pingData.status !== 'ok') {
    throw new Error('Test 3 failed: ping endpoint did not return status ok');
  }

  console.log('\n--- Test 4: Testing POST request via running Vite dev server ---');
  const postResponse = await fetch('http://localhost:5173/.netlify/functions/generate-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: 'Checkout page pe coupon apply kiya toh 500 internal server error aaya',
      model: 'gemini-1.5-flash',
    }),
  });
  const postData = await postResponse.json();
  console.log('POST endpoint response:', postData);
  if (!postData || typeof postData.fallbackRequired !== 'boolean') {
    throw new Error('Test 4 failed: endpoint did not return expected response structure');
  }

  console.log('\n--- Test 5: Testing Frontend aiService.js end-to-end ---');
  // Simulate client-side call
  const { generateBugReport } = await import('./src/services/aiService.js');
  const clientResult = await generateBugReport('Checkout page pe coupon apply kiya toh 500 error aaya', 'gemini-1.5-flash');
  console.log('Client parsed result:', {
    title: clientResult.title,
    severity: clientResult.severity,
    component: clientResult.component,
    stepsCount: clientResult.stepsToReproduce.length,
    hasTestCase: Boolean(clientResult.testCase?.automationSnippet),
    source: clientResult._source,
  });

  if (!clientResult.title || !clientResult.stepsToReproduce.length || !clientResult.testCase?.automationSnippet) {
    throw new Error('Test 5 failed: client result missing critical QA fields');
  }

  console.log('\n✅ All integration tests passed successfully!');
}

runTests().catch((err) => {
  console.error('❌ Test failure:', err);
  process.exit(1);
});
