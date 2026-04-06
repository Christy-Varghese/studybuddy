# 🎤 Voice Input - Testing Guide

## Quick Test Steps

### Step 1: Open Browser Console
Press **F12** to open developer console (for error checking)

### Step 2: Click Mic Button
- Look for the **🎤 mic button** between the textarea and send button
- It should be red circular button
- Click it OR press **Ctrl+Shift+V**

### Step 3: Listen for Feedback
- Mic button should **turn red with pulse animation**
- **Sound wave animation** should appear above the input area
- Status bar should say **"Listening..."**
- You should hear a sound indicating recording started

### Step 4: Speak Your Question
Say something natural like:
- "What is photosynthesis?"
- "How does gravity work?"
- "Explain quantum mechanics"

### Step 5: Watch Live Preview
- As you speak, text should appear in a **floating pill above the mic button**
- This is the live transcript

### Step 6: Stop Speaking
Option A: **Wait 1.8 seconds in silence**
- After 1.8 seconds of silence, the system should:
  1. ✅ Mic button turns amber (processing)
  2. ✅ Text appears in input field
  3. ✅ Message auto-sends
  4. ✅ Agent responds with answer

Option B: **Click Stop Button**
- Click the "Stop" button in the status bar
- Text should appear in input field
- Message does NOT auto-send
- You can edit the text manually
- Click send button to send

## Expected Results

### Success Indicators
✅ Mic button animates (red pulse)  
✅ Sound waves visualize  
✅ Live text preview appears  
✅ Text enters input field  
✅ Message sends automatically  
✅ Agent provides response  

### What Should Appear in Input Field
- "What is photosynthesis?" (if you said that)
- Text should be visible in textarea
- May have slight spacing differences (normal)

## Troubleshooting

### If Mic Doesn't Start
- Check browser console (F12) for errors
- Verify microphone permissions are granted
- Try refreshing the page
- Check browser compatibility:
  - ✅ Chrome/Edge: Full support
  - ✅ Safari: Full support  
  - ❌ Firefox: Not supported (button hidden)

### If Text Doesn't Appear in Input
- Check browser console for errors
- Verify you're using Chrome, Edge, or Safari
- Check microphone is working
- Try using "Stop" button instead of waiting for silence

### If Message Doesn't Send
- Check if text actually appeared in input field
- Verify you waited 1.8 seconds of silence
- Try clicking "Send" button manually
- Check browser console for errors

### If You Get Errors in Console
Look for these and report:
- "Voice API init error"
- "Voice start error"
- "Voice recognition error"

## Browser Specific Notes

### Chrome/Edge
- Works best online and offline
- Supports all features
- No special setup needed

### Safari
- Requires internet connection (uses Apple servers)
- May prompt for microphone permission first time
- All features work normally

### Firefox
- Web Speech API not supported
- Mic button will be hidden
- No errors, everything else works fine

## Settings

### Language
- Currently set to English (en-US)
- Can be changed in future versions

### Silence Timeout
- Currently 1.8 seconds
- Time between when you stop speaking and auto-send
- Can be adjusted in code (SILENCE_MS variable)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+Shift+V** | Toggle voice on/off |
| **Escape** | Close any modals |

## Performance Notes

- ⚡ Fast (<500ms response time)
- 🎙️ Real-time transcription
- 🔊 No server-side processing (browser handles it)
- 📱 Works on desktop and tablet
- 📱 Mobile: Device-dependent (needs working mic)

## Tips for Best Results

1. **Speak Clearly**: Pronounce words distinctly
2. **Normal Speed**: Don't rush or speak too slowly
3. **Complete Thoughts**: Finish sentences before stopping
4. **Quiet Environment**: Minimize background noise
5. **Face Microphone**: Orient yourself toward device mic
6. **Steady Pace**: Maintain consistent speaking speed

## If Everything Works

Great! 🎉 Voice input is now fully functional.

Key features you can enjoy:
- ✅ Hands-free question asking
- ✅ Accessible input method
- ✅ Quick interaction
- ✅ Theme-aware (works with all themes)
- ✅ Keyboard shortcuts

## If You Find Issues

1. **Check console** (F12) for error messages
2. **Try different browser** (Chrome/Edge/Safari)
3. **Clear cache** and refresh
4. **Check microphone permissions** in browser settings
5. **Report error messages** from console

---

**Status**: ✅ Voice Input Ready to Use

Enjoy hands-free learning with StudyBuddy! 🎤📚
