/* Event listeners & initialization */
// ============ Event Listeners ============
levelEl.addEventListener('change', (e) => {
  const newTheme = e.target.value;
  applyTheme(newTheme);
});

// ── Language selector — persist to localStorage ──
if (languageEl) {
  // Restore saved language on load
  languageEl.value = currentLanguage;
  languageEl.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    localStorage.setItem('studybuddy-language', currentLanguage);
  });
}

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
