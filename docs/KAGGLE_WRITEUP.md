# StudyBuddy — AI-Powered Offline Tutor

**Track:** Future of Education

**Subtitle:** Bringing frontier AI tutoring to every student, everywhere — no internet required.

## The Problem

Millions of students worldwide lack access to quality tutoring due to:
- **Cost barriers**: Traditional tutoring costs $20-50+ per hour, inaccessible for low-income families
- **Connectivity gaps**: Students in rural or developing areas lack reliable internet for cloud-based tutors
- **One-size-fits-all learning**: Most educational platforms don't adapt to individual learning styles and paces
- **Privacy concerns**: Parents worry about data collection on cloud platforms
- **Limited availability**: Tutoring help isn't always available when students need it (late nights, weekends)

StudyBuddy solves these challenges by bringing advanced AI tutoring directly to students' laptops—completely offline, free, and adaptive.

## Our Solution

**StudyBuddy** is an offline-first AI tutor powered by Gemma 4, running locally via Ollama. It provides:

- **Adaptive learning**: Three difficulty levels (Beginner, Intermediate, Advanced) that adjust explanations to the student's knowledge level
- **Multimodal homework help**: Students can photograph homework problems, and StudyBuddy analyzes the image to provide detailed solutions
- **Interactive quizzes**: Generate custom quizzes on any topic with instant feedback and explanations
- **Fully offline**: No internet connection needed—everything runs on the student's machine
- **Zero cost**: Free, open-source software powered by Meta's Gemma 4 model
- **Privacy-first**: All conversations stay on the student's device; no data collection

## How We Used Gemma 4

- **Model**: Gemma 4 E4B (efficient 4-bit quantized variant) for fast local inference
- **Integration**: Ollama HTTP API (`http://localhost:11434/api/chat`) for simple, reliable communication
- **Reasoning**: System prompts with `<|think|>` tokens enable step-by-step reasoning for complex problems
- **Multimodal capability**: Supports image inputs (JPEG, PNG, WebP) for homework photo analysis via vision encoding
- **Adaptive prompting**: Dynamic system prompts adjust explanation depth based on selected difficulty level

### Example System Prompt:
```
<|think|>
You are StudyBuddy, a friendly and patient tutor.
Adapt your explanation complexity to level: intermediate.
- beginner: use simple words, fun analogies, short sentences
- intermediate: use proper terms but still explain them
- advanced: use technical depth and assume strong foundations
Always break explanations into clear steps.
End each response by asking one follow-up question to check understanding.
```

## Architecture

### Frontend (HTML/CSS/JavaScript)
- **Single-page app** with responsive design
- **Dark mode support** using CSS media queries
- **Components**: Chat interface, image upload preview, quiz modal, message bubbles
- **Smooth animations**: Fade-in effects, pulsing status dots, sliding modals

### Backend (Node.js + Express)
```
POST /chat                 → Text-only questions
POST /chat-with-image      → Homework photo + question
POST /quiz                 → Quiz generation on any topic
```

### Image Upload Flow:
1. User selects homework photo via paperclip button
2. Image preview rendered with remove option
3. On send, FormData multipart request to `/chat-with-image`
4. Backend converts image to base64 and sends to Ollama with vision capability
5. Temporary file cleaned up after response

### Quiz Generation:
1. User opens quiz modal, enters topic and question count
2. Backend calls Ollama with clean JSON generation prompt (no `<|think|>` token)
3. Response parsed, markdown code fences stripped if present
4. Quiz rendered as interactive card in chat
5. User selects answers, correct/wrong highlighted, explanations shown
6. Score tracked and displayed

### Ollama Integration:
- Calls `http://localhost:11434/api/chat` (standard Ollama API)
- All requests use `model: gemma4:e4b`
- Streaming disabled for simpler response parsing

## Key Features

✅ **Adaptive Explanation Levels** — Beginner, Intermediate, Advanced difficulty modes that adjust language complexity and depth

✅ **Homework Photo Analysis** — Snap a photo of any math problem, diagram, or text; StudyBuddy analyzes and explains it

✅ **Quiz Generation** — Generate custom quizzes on any topic with multiple-choice questions, instant feedback, and explanations

✅ **Fully Offline** — No internet required; runs 100% locally on any laptop with 8GB+ RAM

✅ **Privacy-First** — All conversations and images stay on your device; zero data collection

✅ **Beautiful UI** — Polished gradient design with dark mode, smooth animations, and responsive layout

✅ **Multi-Turn Conversations** — Maintains conversation history for follow-up questions and coherent learning sessions

✅ **Real-Time Feedback** — Instant responses with typing indicators and error handling

## Technical Challenges & Solutions

### Challenge 1: Image Handling in Vision API
**Problem**: Ollama's vision capability required base64-encoded images in specific format.

**Solution**: Server-side image reading with FileReader API, conversion to base64, MIME type preservation in data URI format.

### Challenge 2: JSON Parsing for Quiz Generation
**Problem**: Gemma sometimes wraps JSON in markdown code fences (```json...```).

**Solution**: Regex-based sanitization to strip markdown before JSON.parse().

### Challenge 3: File Upload Cleanup
**Problem**: Uploaded images consumed disk space if not deleted.

**Solution**: Automatic cleanup with fs.unlinkSync() after Ollama response, wrapped in try-catch for safety.

### Challenge 4: Responsive Mobile UI
**Problem**: Chat layout breaks on small screens.

**Solution**: CSS max-width 800px with flex wrapping, mobile-optimized buttons, textarea auto-height.

### Challenge 5: Quiz Interactivity
**Problem**: Regenerating entire quiz card on each answer click was inefficient.

**Solution**: Client-side state management with quizAnswers object, selective re-render only when needed.

## Real-World Impact

### Who benefits?

1. **Underserved students**: Kids in low-income families who can't afford $30/hour tutors
2. **Rural/remote learners**: Students without reliable internet for cloud platforms
3. **Non-English speakers**: Learn in their own language with adaptive explanations
4. **Students with privacy concerns**: Parents who don't want data sent to Silicon Valley
5. **Night owls & self-paced learners**: Get help 24/7, whenever it's convenient

### Scale:
- Deployable to any device with Node.js and Ollama
- Works offline—can distribute via USB or local network
- Free to run once Ollama is installed
- Potential to serve 100M+ students globally, especially in underserved regions

### Real-world usage scenario:
> *12-year-old Priya in rural India receives WhatsApp homework about photosynthesis. No way to pay for tutoring. She uses StudyBuddy on her family's shared laptop—takes a photo of the problem, gets step-by-step explanation adapted for her level, generates a quiz to test herself. No internet needed; no cost. She learns deeply instead of just getting the answer.*

## Demo

### Local Setup (5 minutes):
```bash
# 1. Install Ollama from ollama.ai
# 2. Pull Gemma 4 model:
ollama pull gemma4:e4b

# 3. Start Ollama (runs on localhost:11434)
ollama serve

# 4. In another terminal, install StudyBuddy:
cd studybuddy
npm install
npm start

# 5. Open http://localhost:3000
```

### Live Features to Try:
- Ask "What is photosynthesis?" at Beginner level
- Switch to Advanced and ask the same question—notice the difference!
- Take a photo of a math problem and upload it
- Generate a 5-question quiz on "World War II"
- Click different answers to see instant feedback

## Code Repository

[StudyBuddy on GitHub](https://github.com/yourusername/studybuddy)
- `server.js`: All three API routes with multer image handling
- `public/index.html`: Full UI, quiz logic, image preview
- `package.json`: Dependencies (express, multer)

## Live Demo / How to Run Locally

### Requirements:
- **Ollama** (download from [ollama.ai](https://ollama.ai))
- **Node.js 14+**
- **8GB RAM** (for comfortable Gemma 4 inference)

### Quick Start:
```bash
# Step 1: Install and run Ollama
# (Download from ollama.ai, then in terminal:)
ollama pull gemma4:e4b
ollama serve

# Step 2: In another terminal, run StudyBuddy
git clone <repo-url>
cd studybuddy
npm install
npm start

# Step 3: Open browser
# Navigate to http://localhost:3000
```

### First-time experience:
1. Greet StudyBuddy with a question
2. Watch adaptive responses change by level
3. Take a homework photo and ask for help
4. Generate a quiz and test yourself
5. Share with friends/family—it's free!

---

**Built with ❤️ to make quality education accessible to everyone.**

*StudyBuddy is an open-source educational tool. Privacy-first, offline-capable, powered by frontier AI (Gemma 4 via Ollama).*
