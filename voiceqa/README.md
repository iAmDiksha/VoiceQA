# Voice QA 🎙️⚡
> **Voice-Powered Bug Reporting & Test Case Studio for Developers**  
> Built for the **Wemakedevs × Wispr Flow "No-Hands Challenge"** (Builder Track)

---

## 🎯 The Problem
Software developers and QA engineers waste up to 30 minutes writing each detailed bug report:
- Manually formatting markdown
- Typing out repetitive reproduction steps
- Specifying expected vs actual results
- Authoring regression test cases and automated scripts

When testing or dogfooding, developers naturally explain bugs verbally—often in conversational **English** or **Hinglish** (*"Checkout page pe coupon apply karte hi 500 error aa gaya"*). Traditional bug trackers force them to stop their workflow and manually type formal tickets.

---

## 💡 The Solution: Voice QA
**Voice QA** allows developers to speak naturally (hands-free with Wispr Flow or in-browser voice recognition). It instantly parses colloquial speech into an industry-standard QA ticket containing:
1. **Bug Title** (Jira / GitHub format)
2. **Component & Severity Level** (Critical, High, Medium, Low)
3. **Executive Description & Impact**
4. **Interactive Steps to Reproduce** (fully editable, reorderable, add/delete steps)
5. **Expected Result vs Actual Result**
6. **Formal Test Case Suite** (ID, Preconditions, Verification Steps, and automated **Playwright** test script)

---

## 🚀 Key Features

- **No Chatbot Gimmicks**: Designed as a sleek, professional developer workbench (Linear / Raycast aesthetic), not an AI chatbot.
- **Hinglish & English Native**: Understands colloquial developer expressions (*"click kiya"*, *"screen freeze ho gayi"*, *"loader ghoom raha hai"*).
- **Secure Serverless Proxy (Netlify Functions)**:
  - **Zero Client Exposure**: The API key is stored strictly on the server side (`process.env.GEMINI_API_KEY`). It is **never** bundled into frontend code or stored in browser storage.
  - Built-in validation checks every AI response before returning it to the UI.
- **Dual Engine Architecture**:
  - **Gemini AI Engine**: Powered by Google Gemini 1.5 Flash (or 2.0 Flash) through a secure Netlify backend function.
  - **Zero-Config Smart Fallback**: If the backend key is not configured or an API error occurs, Voice QA seamlessly falls back to an intelligent local heuristic parser so developers are never blocked.
- **Hands-Free Dictation**:
  - Full compatibility with **Wispr Flow** desktop dictation.
  - Native Web Speech API with language toggles (`en-IN`, `en-US`, `hi-IN`).
  - Keyboard shortcuts (`Space` to toggle mic, `Ctrl + Enter` to generate).
- **Interactive Studio**: Edit any generated field directly before exporting.
- **Export & Storage**:
  - One-click copy formatted Markdown for GitHub Issues / Jira.
  - One-click download `.md` or copy JSON.
  - Local workbench history saved in browser `localStorage`.

---

## 🛠️ Tech Stack & Architecture

```
┌────────────────────────────────────────────────────────┐
│                   BROWSER (CLIENT)                     │
│  • React 19 + Vite 8 UI (Workbench Studio)             │
│  • Web Speech API (en-IN/US) + Wispr Flow input focus  │
│  • Local History & Preferences (localStorage)          │
└───────────────────────────┬────────────────────────────┘
                            │ POST /.netlify/functions/generate-report
                            ▼
┌────────────────────────────────────────────────────────┐
│            NETLIFY SERVERLESS FUNCTION                 │
│  • Path: netlify/functions/generate-report.js          │
│  • Reads: process.env.GEMINI_API_KEY                   │
│  • Translates Hinglish to professional technical QA    │
│  • Enforces & validates strict JSON schema             │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS (Secure Backend Call)
                            ▼
┌────────────────────────────────────────────────────────┐
│             GOOGLE GEMINI 1.5 FLASH API                │
│  • Generative AI Multilingual & Code Generation        │
└────────────────────────────────────────────────────────┘
```

---

## 🔑 AI Provider & Free API Key Setup

Voice QA uses **Google Gemini 1.5 Flash** (with support for **Gemini 2.0 Flash**):
- **Requires Paid Account?**: **NO.** Google AI Studio provides a free tier with 15 requests per minute, 1,500 requests per day, and 1 million tokens/min without entering credit card details.
- **Get your Free Key**: [https://aistudio.google.com/](https://aistudio.google.com/)

---

## ⚙️ How to Configure the API Key

### A. For Local Development
1. Create a `.env` file in the `voiceqa` directory (copied from `.env.example`):
   ```bash
   GEMINI_API_KEY=AIzaSyYourActualGeminiKeyHere
   ```
2. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   *The Vite dev server automatically proxies `/.netlify/functions/generate-report` with your `.env` key locally.*

### B. For Netlify Deployment
1. Push your repository to GitHub / GitLab.
2. In the [Netlify Dashboard](https://app.netlify.com/):
   - Click **Add new site** > **Import an existing project**.
   - Select your repository.
   - Build Settings (pre-configured via `netlify.toml`):
     - **Base directory**: `voiceqa` (or project root if repo is at root)
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
     - **Functions directory**: `netlify/functions`
3. Add Environment Variable:
   - Go to **Site configuration** > **Environment variables**.
   - Add a new variable:
     - **Key**: `GEMINI_API_KEY`
     - **Value**: `AIzaSyYourActualGeminiKeyHere`
4. Click **Deploy**. Your app and secure serverless function are live!

---

## ⌨️ Hands-Free Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` | Toggle Voice Dictation (when not focused in a text field) |
| `Ctrl + Enter` / `Cmd + Enter` | Generate Bug Report & Test Case |

---

## 🧪 Testing the Integration

To verify that the Netlify function endpoint and client fallback are functioning properly:

```bash
cd voiceqa
npm run test:integration
```
Expected output:
```
--- Test 1: Testing missing transcript (400 validation) ---
Result 1 status: 400 body: { success: false, error: 'Voice transcript cannot be empty.' }
--- Test 2: Testing unconfigured backend key (graceful fallback signal) ---
Result 2 status: 200 fallbackRequired: true
--- Test 3: Testing HTTP endpoint via running Vite dev server ---
Ping endpoint response: { status: 'ok', ... }
--- Test 4: Testing POST request via running Vite dev server ---
POST endpoint response: { success: false, fallbackRequired: true, ... }
--- Test 5: Testing Frontend aiService.js end-to-end ---
✅ All integration tests passed successfully!
```
