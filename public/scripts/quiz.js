/* Quiz modal, loading, generation, rendering */
// ============ Quiz Modal Handlers ============
function openQuizModal() {
  quizModal.classList.add('active');
  document.getElementById('quizTopic').focus();
}

function closeQuizModal(event) {
  if (event && event.target !== quizModal) return;
  quizModal.classList.remove('active');
}

// ============ Quiz Loading Animation ============
const quizLoadingMessages = [
  "🧠 Thinking of challenging questions...",
  "📚 Researching the topic...",
  "✨ Crafting perfect answers...",
  "🎯 Making it fun and educational...",
  "🔍 Double-checking facts...",
  "📝 Preparing your quiz..."
];

function showQuizLoading(topic) {
  const modalContent = document.querySelector('#quizModal .modal-content');
  modalContent.innerHTML = `
    <div class="quiz-loading-container">
      <div class="quiz-loading-spinner">
        <div class="quiz-loading-book">📖</div>
      </div>
      <div class="quiz-loading-dots">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="quiz-loading-text">Generating Your Quiz</div>
      <div class="quiz-loading-subtext">Creating questions about <strong>${topic}</strong></div>
      <div class="quiz-loading-message" id="quizLoadingMessage">${quizLoadingMessages[0]}</div>
      <div class="quiz-loading-progress">
        <div class="quiz-loading-progress-bar"></div>
      </div>
    </div>
  `;

  // Cycle through loading messages
  let messageIndex = 0;
  let isTransitioning = false;
  window.quizLoadingInterval = setInterval(() => {
    if (isTransitioning) return;
    const msgEl = document.getElementById('quizLoadingMessage');
    if (!msgEl) return;
    isTransitioning = true;
    msgEl.style.opacity = '0';
    setTimeout(() => {
      messageIndex = (messageIndex + 1) % quizLoadingMessages.length;
      msgEl.textContent = quizLoadingMessages[messageIndex];
      msgEl.style.opacity = '1';
      setTimeout(() => { isTransitioning = false; }, 250);
    }, 250);
  }, 2500);
}

function hideQuizLoading() {
  if (window.quizLoadingInterval) {
    clearInterval(window.quizLoadingInterval);
    window.quizLoadingInterval = null;
  }
  // Reset modal content
  const modalContent = document.querySelector('#quizModal .modal-content');
  modalContent.innerHTML = `
    <h2>Create a Quiz</h2>
    <div class="modal-field">
      <label for="quizTopic">Topic</label>
      <input type="text" id="quizTopic" placeholder="e.g. Photosynthesis, World War II, Algebra">
    </div>
    <div class="modal-field">
      <label for="quizCount">Number of Questions</label>
      <input type="number" id="quizCount" min="3" max="10" value="5">
    </div>
    <div class="modal-buttons">
      <button class="modal-btn secondary" onclick="closeQuizModal()">Cancel</button>
      <button class="modal-btn primary" onclick="generateQuiz()">Generate Quiz</button>
    </div>
  `;
}

async function generateQuiz() {
  const topic = document.getElementById('quizTopic').value.trim();
  const numQuestions = parseInt(document.getElementById('quizCount').value, 10);

  if (!topic) {
    alert('Please enter a topic');
    return;
  }

  // Show loading animation
  showQuizLoading(topic);

  try {
    const res = await fetch('/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        level: levelEl.value,
        numQuestions
      })
    });

    const data = await res.json();

    // Hide loading animation
    hideQuizLoading();

    if (data.error) {
      alert('⚠️ ' + data.error);
    } else {
      currentQuiz = data.questions;
      quizAnswers = {};
      closeQuizModal();
      renderQuizCard();
    }
  } catch (e) {
    hideQuizLoading();
    alert('⚠️ Could not generate quiz. Is Ollama running?');
  }
}

// ============ Quiz Rendering ============
function renderQuizCard() {
  if (!currentQuiz || currentQuiz.length === 0) return;

  let quizHTML = `<div class="quiz-card">`;

  currentQuiz.forEach((q, idx) => {
    const qNum = idx + 1;
    quizHTML += `
      <div id="quiz-q-${idx}" style="margin-bottom: 24px;">
        <div class="quiz-question">${qNum}. ${q.question}</div>
        <div class="quiz-options">
    `;

    q.options.forEach((option, optIdx) => {
      const answered = quizAnswers[idx] !== undefined;
      const isCorrect = option === q.answer;
      const wasSelected = quizAnswers[idx] === option;

      let btnClass = 'quiz-option';
      if (answered) {
        if (isCorrect) btnClass += ' correct';
        else if (wasSelected && !isCorrect) btnClass += ' wrong';
        btnClass += ' disabled';
      }

      quizHTML += `
        <button 
          class="${btnClass}" 
          onclick="selectAnswer(${idx}, '${option.replace(/'/g, "&#39;")}')"
          ${answered ? 'disabled' : ''}
        >
          ${option}
        </button>
      `;
    });

    quizHTML += `</div>`;

    // Show explanation if answered
    if (quizAnswers[idx] !== undefined) {
      quizHTML += `<div class="quiz-explanation">✓ ${q.explanation}</div>`;
    }

    quizHTML += `</div>`;
  });

  // Score tracker
  const score = Object.keys(quizAnswers).filter(
    idx => currentQuiz[idx].answer === quizAnswers[idx]
  ).length;
  const total = currentQuiz.length;

  quizHTML += `<div class="quiz-score">Score: ${score} / ${total}</div>`;

  // Restart button (if all answered)
  if (Object.keys(quizAnswers).length === total) {
    quizHTML += `
      <button class="quiz-restart" onclick="restartQuiz()">Restart Quiz</button>
    `;
  }

  quizHTML += `</div>`;

  // Clear existing quiz bubble if any
  const existingQuiz = chatEl.querySelector('.quiz-card');
  if (existingQuiz) {
    const parentBubble = existingQuiz.closest('.bubble');
    if (parentBubble) parentBubble.remove();
    else existingQuiz.remove();
  }

  addBubble(quizHTML, 'bot', true, false);
}

function selectAnswer(questionIdx, option) {
  quizAnswers[questionIdx] = option;
  renderQuizCard();

  // Smoothly scroll to the next unanswered question, or to the score
  setTimeout(() => {
    const nextIdx = questionIdx + 1;
    let target;
    if (nextIdx < currentQuiz.length) {
      target = document.getElementById('quiz-q-' + nextIdx);
    } else {
      target = chatEl.querySelector('.quiz-score');
    }
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

function restartQuiz() {
  currentQuiz = null;
  quizAnswers = {};
  const quizCard = chatEl.querySelector('.quiz-card');
  if (quizCard) {
    quizCard.closest('.bubble').remove();
  }
  openQuizModal();
}
