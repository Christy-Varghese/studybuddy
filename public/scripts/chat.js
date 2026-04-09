/* sendMessage dispatcher */
// ============ Send Message Handler ============
async function sendMessage() {
  const message = inputEl.value.trim();
  if (!message && !pendingImage) return;

  inputEl.value = '';
  sendBtn.disabled = true;

  // Show user message with optional image (handled by sendToChat)
  if (!pendingImage) {
    addBubble(message, 'user');
  }
  // If there's an image, sendToChat will handle displaying it

  const thinkingBubble = addBubble('Thinking...', 'thinking');
  thinkingBubble.remove();

  if (socraticMode) {
    await sendToSocratic(message);
  } else if (agentMode) {
    await sendToAgent(message);
  } else {
    await sendToChat(message);
  }

  sendBtn.disabled = false;
  inputEl.focus();
}
