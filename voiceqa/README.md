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
- **Dual Engine Architecture**:
  - **Zero-Config Smart Mode**: Works out of the box with zero setup using an intelligent rule and pattern extraction engine.
  - **Gemini AI Engine**: Connect your Google Gemini API key in settings for deep semantic understanding.
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

- **Frontend**: React 19 + Vite 8
- **Icons**: Lucide React
- **Voice Input**: Web Speech API (`webkitSpeechRecognition`) + Wispr Flow input focus
- **AI / Parsing Service**: Modular hybrid service (Google Gemini 1.5/2.0 Flash + intelligent local fallback parser)
- **Persistence**: Browser `localStorage` (reports and preferences)

---

## ⌨️ Hands-Free Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` | Toggle Voice Dictation (when not focused in a text field) |
| `Ctrl + Enter` / `Cmd + Enter` | Generate Bug Report & Test Case |

---

## ⚙️ Manual Configuration Guide

1. **Microphone Permission**:
   - When you click the microphone button for the first time, allow browser microphone access.
2. **Wispr Flow Users**:
   - If using the Wispr Flow app, simply place your cursor in the **Spoken Transcript** box and dictate using your Wispr Flow shortcut.
3. **Google Gemini API Key (Optional)**:
   - Click the **Gear icon (⚙️)** in the top right.
   - Enter your Google Gemini API key.
   - *Note:* If left blank, Voice QA runs seamlessly in offline **Zero-Config Smart Mode**.

---

## 🏃 Running Locally

```bash
# Navigate to project directory
cd voiceqa

# Install dependencies
npm install

# Start development server
npm run dev
```

Dev server will be available at: `http://localhost:5173/`
