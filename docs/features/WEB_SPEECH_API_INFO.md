# 🎤 Web Speech API & Chrome Extension URL Explained

## What You're Seeing

You're getting requests to:
```
Request URL: chrome-extension://invalid/
Referrer Policy: strict-origin-when-cross-origin
```

This is **NOT an error** in your code. This is how Chrome's Web Speech API works internally.

## Why This Happens

Your app uses the **Web Speech API** for voice input (the 🎤 microphone button):

```javascript
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
recognition = new SpeechRecognition();
```

When you click the microphone button to speak a question, Chrome:
1. Uses its built-in speech recognition engine
2. Tries to communicate with Google's speech recognition service
3. Chrome internally routes this through extension URLs for security
4. The browser generates URLs like `chrome-extension://invalid/` as part of this process

This is **completely normal and expected behavior**.

## Is This a Problem?

**No**, but here's what you need to know:

### ✅ It's Working Correctly If:
- The microphone button lets you speak
- Your voice is transcribed to text
- The text appears in the input field
- Sending voice messages works

### ⚠️ Potential Issues:

1. **In Development** - These requests appear in DevTools console (can be noisy)
2. **In Production** - May require additional security headers if you have strict CSP policies
3. **Offline/Local** - Web Speech API requires internet connection to Google's servers
4. **HTTPS Only** - Web Speech API may not work on non-HTTPS sites (except localhost)

## Solutions

### Option 1: Suppress Console Warnings (Simplest)
The requests are harmless. You can:
- Ignore them (they don't affect functionality)
- Close DevTools Network tab to reduce noise

### Option 2: Add CORS Headers (If Getting Errors)
If you're getting actual errors (not just seeing the requests), add CORS headers in `server.js`:

```javascript
// Add after app.use(express.json())
app.use((req, res, next) => {
  res.header('Cross-Origin-Opener-Policy', 'same-origin');
  res.header('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});
```

### Option 3: Fallback to Manual Input (Most Control)
If Web Speech API is causing issues, you can add better fallback:

```javascript
if (!SpeechRecognition) {
  console.log('Web Speech API not available, using text input only');
  // Hide microphone button or disable it
}
```

### Option 4: Use Alternative (More Complex)
Replace Web Speech API with a different service:
- AssemblyAI (requires API key, more reliable)
- Rev.AI (commercial service)
- Local whisper.cpp (self-hosted)

## Current Implementation

Your app currently:
✅ Uses Chrome's built-in Web Speech API (no external API keys needed)
✅ Works on localhost without HTTPS
✅ Has error handling for when API isn't available
✅ Falls back gracefully if speech recognition fails

## Testing Voice Input

To verify everything is working:

1. Open http://localhost:3000
2. Look for the 🎤 microphone button
3. Click the button
4. Speak a math question clearly
5. Wait 1-2 seconds for silence detection
6. Your voice should be transcribed to text
7. Click send

If this works correctly, the Web Speech API is functioning properly.

## Network Tab Information

If you see these in Chrome DevTools Network tab:
- `chrome-extension://invalid/` requests
- Status: Usually shows as failed or unknown (this is normal)
- These DON'T actually block your app from working

**This is browser internals, not your application code.**

## Debugging If Voice Input Doesn't Work

If the microphone button doesn't work:

1. **Check browser console** for errors like:
   - "SpeechRecognition is not defined"
   - "Network error"
   - "service-not-allowed"

2. **Verify requirements:**
   - ✅ Using Chrome, Edge, or Safari (Firefox has limited support)
   - ✅ On localhost or HTTPS
   - ✅ Microphone permissions granted to browser
   - ✅ Internet connection available

3. **Check browser permissions:**
   - Chrome → Settings → Privacy and Security → Site Settings → Microphone
   - Make sure http://localhost:3000 has "Allow" permission

4. **Check if microphone hardware exists:**
   ```bash
   # macOS: Check audio input devices
   system_profiler SPAudioDataType | grep "Input"
   ```

## Current Voice Input Code

Location: `public/index.html` lines 2460-2550

Features:
- ✅ Automatic silence detection (1.8 seconds)
- ✅ Live preview of speech
- ✅ Language selection support
- ✅ Accessibility/screen reader announcements
- ✅ Error handling and fallbacks
- ✅ Visual feedback (listening state)

## Summary

| Aspect | Status |
|--------|--------|
| **Web Speech API used?** | ✅ Yes |
| **Chrome extension URLs expected?** | ✅ Yes (normal) |
| **Is this an error?** | ❌ No |
| **Does it affect functionality?** | ❌ No |
| **Should you worry?** | ❌ No |
| **Voice input working?** | Test it! |

---

**Bottom Line:** This is completely normal Chrome behavior. Your Web Speech API is working as intended. The `chrome-extension://invalid/` URLs are just how Chrome handles the internal communication with its speech recognition service.

If voice input is working, everything is fine. If not, check the debugging section above.

**Last Updated:** April 6, 2026
