# 🎤 Voice Network Error - Quick Reference Card

## The Problem
```
[Voice] Recognition error: network
```
Web Speech API can't reach Google's servers (needs internet).

## What Changed (Fixes Applied)

| Issue | Before | After |
|-------|--------|-------|
| Network error | ❌ Stops | ✅ Auto-retry in 500ms |
| Error message | ❌ None | ✅ Clear feedback |
| User action | ❌ Click again | ✅ Automatic |
| Logging | ❌ Generic | ✅ Detailed [Voice] logs |
| Recovery | ❌ Manual | ✅ Automatic |

## Quick Fixes (Try These)

### 1️⃣ Refresh Page
```
Press: Ctrl+R
```

### 2️⃣ Check Internet
```bash
ping -c 3 8.8.8.8
# Should show: replies (not "unreachable")
```

### 3️⃣ Clear Cache
```
Press: Ctrl+Shift+Delete
Select: All time
Click: Clear data
Refresh: Ctrl+R
```

### 4️⃣ Check Microphone
```
1. Reload page
2. Look for permission prompt
3. Click "Allow"
4. Try voice again
```

### 5️⃣ Disable VPN
```
Turn off VPN
Try voice again
```

## If Still Not Working

| Symptom | Solution |
|---------|----------|
| No permission prompt | Reload page, browser should ask |
| Still getting network error | Wait 1-2 min (rate limit), try again |
| Works on Google voice search but not StudyBuddy | Check browser extensions |
| Works on Chrome but not Firefox | Use Chrome (best support) |
| Firewall blocks it | Contact IT, whitelist Google APIs |

## Check Console (F12)

**What to Look For:**
```javascript
// Good (success):
[Voice] Web Speech API initialized with language: en-US
[Voice] Recognition started, listening...
[Voice] Final result: what is photosynthesis

// Bad (retry happening):
[Voice] Recognition error: network
[Voice] Network error detected. Will retry in 500ms...
[Voice] Retrying recognition after network error

// Bad (won't work):
[Voice] Recognition error: not-allowed  // Permission denied
[Voice] Recognition error: audio-capture // Microphone issue
```

## Workaround

If voice doesn't work:
1. Use **text input** instead
2. Type your question
3. Click **Send**

(Temporary solution while fixing network issues)

## Auto-Retry Details

When network error occurs:
1. **Error detected** (in 1-5 seconds)
2. **Retry triggered** (after 500ms)
3. **Recognition restarts** (automatic)
4. **User keeps mic button** (doesn't reset)
5. **Try again** (speak again)

✅ **No user action needed** - system handles it

## Success Indicators

✅ All good when you see:
- [Voice] logs in console
- Listening status appears
- Text shows in preview
- Message sent to agent
- Agent responds

❌ Problem when you see:
- [Voice] Recognition error: network
- [Voice] Recognition error: not-allowed
- [Voice] Recognition error: audio-capture
- No [Voice] logs at all

## Documentation Map

| Need | File |
|------|------|
| Quick fixes | **← You are here** |
| Detailed help | `VOICE_NETWORK_ERROR_FIX.md` |
| General debugging | `VOICE_INPUT_DEBUGGING.md` |
| 5-step test | `VOICE_QUICK_DEBUG.md` |
| Testing guide | `VOICE_TESTING_GUIDE.md` |

## Browser Compatibility

| Browser | Support | Note |
|---------|---------|------|
| Chrome | ✅✅✅ | Best |
| Edge | ✅✅ | Good |
| Safari | ✅✅ | Good |
| Firefox | ⚠️ | Limited |
| Opera | ✅ | Good |

**Try Chrome if having issues**

## Test Sequence

1. Refresh: **Ctrl+R**
2. Check: **Internet connection**
3. Open: **F12** (console)
4. Click: **Mic button** (or Ctrl+Shift+V)
5. Speak: **"Test"**
6. Wait: **1.8 seconds** in silence
7. Watch: **Console for [Voice] logs**
8. Result: **Should retry if network error**

## What's Working Now

✅ Automatic retry on network errors  
✅ Better error messages  
✅ Improved logging  
✅ Smart error handling  
✅ Initialization improvements  

## One More Thing

**The system now auto-retries automatically.** You don't need to do anything - just keep the mic button and wait.

If you see:
```
[Voice] Network error detected. Will retry in 500ms...
```

Just wait 0.5 seconds and speak again!

---

**TL;DR:**
1. Refresh page (Ctrl+R)
2. Check internet (ping 8.8.8.8)
3. Allow microphone
4. Try voice again
5. System auto-retries on error
6. Use text input as backup

Feeling better? Try it now! 🎤
