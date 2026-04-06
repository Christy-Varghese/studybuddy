# ⚡ Quick Fix: Voice Network Error

## What You Saw
```
[Voice] Recognition error: network
```

## Quick Solutions (Try These First)

### 1. Check Internet (30 seconds)
```bash
# In terminal:
ping -c 3 8.8.8.8

# Should show replies, not "Network is unreachable"
```

### 2. Refresh Browser (10 seconds)
```
Ctrl+R (or Cmd+R on Mac)
```

### 3. Clear Cache (15 seconds)
```
Ctrl+Shift+Delete
Select: All time
Click: Clear data
Refresh page
```

### 4. Check Microphone Permission
```
1. Reload page
2. Look for permission prompt
3. Click "Allow"
4. Try voice input again
```

### 5. Disable VPN (if using one)
```
Turn off VPN
Refresh page
Try voice input
```

## If Still Not Working

### Try These:
- [ ] Switch to Chrome (best browser for Web Speech API)
- [ ] Wait 1-2 minutes (may be rate limited)
- [ ] Check if Google voice search works (google.com)
- [ ] Restart your browser completely
- [ ] Use text input instead of voice

### Check Console (F12)
```
Press: F12
Tab: Console
Look for: [Voice] logs

Should see retry happening automatically
```

## What Was Fixed

✅ **Automatic Retry** - Now retries after 500ms  
✅ **Better Messages** - Clear error descriptions  
✅ **Improved Logging** - Detailed console output  
✅ **Smart Handling** - Recovers from temporary issues  

## Why This Happens

The Web Speech API uses Google's servers (free cloud service). 

Common causes:
- Unstable internet connection
- Network timeout
- Firewall/VPN blocking Google APIs
- Browser permission issues
- Rate limiting (too many requests)

## Action Plan

**Immediate (Right Now):**
1. Refresh page (Ctrl+R)
2. Click voice button
3. Speak clearly
4. Wait for automatic retry

**If Still Failing:**
1. Check internet: `ping 8.8.8.8`
2. Clear browser cache (Ctrl+Shift+Del)
3. Try Chrome instead of Firefox
4. Disable VPN if you have one

**Workaround:**
- Use text input instead
- Type your question and click Send

## Network Troubleshooting

**Test Google Voice Search:**
1. Go to google.com
2. Click microphone icon
3. Speak something
4. If Google's voice works → StudyBuddy will too
5. If Google's voice fails → Network issue on your end

**Check Your Connection:**
```bash
# Test to Google's servers
curl -I https://www.google.com
ping 8.8.8.8
```

## Browser Support

| Browser | Works? | Note |
|---------|--------|------|
| Chrome | ✅ Yes | Best support |
| Edge | ✅ Yes | Chromium-based |
| Safari | ✅ Yes | Good support |
| Firefox | ⚠️ Limited | Limited support |
| Opera | ✅ Yes | Chromium-based |

**Try Chrome if using Firefox**

## Still Having Issues?

1. **Check docs/voice-input/VOICE_NETWORK_ERROR_FIX.md** for detailed guide
2. **Check docs/voice-input/VOICE_INPUT_DEBUGGING.md** for full troubleshooting
3. **Use text input** as temporary workaround
4. **Wait and retry** - sometimes temporary issues resolve

---

**TL;DR:**
- Refresh page (Ctrl+R)
- Check internet connection
- Check microphone permission
- Try Chrome browser
- System now auto-retries on network errors

Good news: The system now **automatically retries** when network errors occur! 🎉
