/* Utility functions: scrollToBottom, addBubble, escapeHtml */

// ============ XSS Guard ============
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============ Performance: Batched Scroll Helper ============
// Uses requestAnimationFrame to batch scroll updates and prevent layout thrashing
let scrollRAF = null;
function scrollToBottom() {
  if (scrollRAF) return; // Already scheduled
  scrollRAF = requestAnimationFrame(() => {
    chatEl.scrollTop = chatEl.scrollHeight;
    scrollRAF = null;
  });
}

// ============ Message Bubble Helper ============
function addBubble(content, role, isHTML = false, autoScroll = true) {
  const div = document.createElement('div');
  div.className = `bubble ${role}`;
  if (isHTML) {
    div.innerHTML = content;
  } else {
    div.textContent = content;
  }
  chatEl.appendChild(div);
  if (autoScroll) scrollToBottom();
  return div;
}
