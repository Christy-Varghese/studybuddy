/* Event listeners & initialization */
// ============ Event Listeners ============
levelEl.addEventListener('change', (e) => {
  const newTheme = e.target.value;
  applyTheme(newTheme);
});

sendBtn.addEventListener('click', sendMessage);
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeQuizModal();
  }
});
