/* ----------------------------------------------------
   AetherStudy Quiz Module
   ---------------------------------------------------- */

import { State } from '../state.js';
import { Sound, showToast } from '../utils.js';

let viewMode = 'index'; // 'index', 'editor', 'runner'
let activeQuiz = null; // Quiz object being taken
let activeQuestionIdx = 0; // Current question index in runner
let userAnswers = []; // Array of user selected indices
let selectedOptionIdx = null; // Option index selected for current question

// Editing state
let editingQuiz = null; 

export const Quizzes = {
  // Starts a quiz directly from the reminder prompt
  startQuizDirectly(quizId) {
    const quizzes = State.getQuizzes();
    const quiz = quizzes.find(q => q.id === quizId);
    if (quiz) {
      this.startQuiz(quiz);
    }
  },

  startQuiz(quiz) {
    activeQuiz = quiz;
    activeQuestionIdx = 0;
    userAnswers = [];
    selectedOptionIdx = null;
    viewMode = 'runner';
    
    // Switch UI views
    const container = document.getElementById('view-quizzes');
    if (container) this.render(container);
  },

  render(container) {
    if (viewMode === 'index') {
      this.renderIndex(container);
    } else if (viewMode === 'editor') {
      this.renderEditor(container);
    } else if (viewMode === 'runner') {
      this.renderRunner(container);
    }
  },

  // --- 1. RENDER QUIZ INDEX ---
  renderIndex(container) {
    const quizzes = State.getQuizzes();

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 style="font-family:'Outfit'; font-size:1.3rem; font-weight:700;">My Study Quizzes</h2>
        <button class="btn btn-primary" id="btn-create-quiz-trigger">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Create Custom Quiz</span>
        </button>
      </div>

      <div class="quiz-grid">
        ${quizzes.length === 0 ? `
          <div class="glass-card empty-state" style="grid-column: 1/-1; padding: 48px;">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin-bottom:12px;">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            </svg>
            <div>No quizzes created yet. Tap "Create Custom Quiz" to test your knowledge!</div>
          </div>
        ` : quizzes.map(quiz => {
          const lastScore = quiz.scoreHistory && quiz.scoreHistory.length > 0 
            ? quiz.scoreHistory[quiz.scoreHistory.length - 1] 
            : null;
          
          return `
            <div class="glass-card quiz-card glass-card-hover">
              <div class="quiz-card-header">
                <div>
                  <h3 class="deck-title">${quiz.name}</h3>
                  <span class="deck-count">${quiz.questions.length} Questions</span>
                </div>
                ${quiz.scheduleTime ? `
                  <span class="quiz-schedule" title="Scheduled Reminder Alert">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    </svg>
                    <span>${quiz.scheduleTime}</span>
                  </span>
                ` : ''}
              </div>

              <div style="margin-top: 14px; font-size: 0.8rem; color: var(--text-secondary);">
                ${lastScore 
                  ? `Last attempt: <strong style="color:var(--color-quiz);">${lastScore.score}/${lastScore.total}</strong> (${Math.round((lastScore.score / lastScore.total) * 100)}%)` 
                  : 'Never attempted yet'}
              </div>

              <div class="quiz-actions">
                <button class="btn btn-primary start-quiz-btn" data-id="${quiz.id}" style="padding: 6px 14px; font-size:0.8rem; flex-grow:1; justify-content:center;">
                  Start Test
                </button>
                <button class="btn btn-secondary edit-quiz-btn" data-id="${quiz.id}" style="padding: 6px 10px;" title="Edit settings">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                </button>
                <button class="btn btn-danger delete-quiz-btn" data-id="${quiz.id}" style="padding: 6px 10px;" title="Delete Quiz">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                  </svg>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // --- ATTACH INDEX EVENTS ---
    const triggerBtn = document.getElementById('btn-create-quiz-trigger');
    if (triggerBtn) {
      triggerBtn.addEventListener('click', () => {
        editingQuiz = {
          id: 'quiz-' + Date.now(),
          name: '',
          scheduleTime: '',
          questions: []
        };
        viewMode = 'editor';
        this.render(container);
        Sound.playClick();
      });
    }

    container.querySelectorAll('.start-quiz-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const q = quizzes.find(item => item.id === id);
        if (q) {
          this.startQuiz(q);
          Sound.playClick();
        }
      });
    });

    container.querySelectorAll('.edit-quiz-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const q = quizzes.find(item => item.id === id);
        if (q) {
          editingQuiz = JSON.parse(JSON.stringify(q)); // deep copy
          viewMode = 'editor';
          this.render(container);
          Sound.playClick();
        }
      });
    });

    container.querySelectorAll('.delete-quiz-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        State.deleteQuiz(id);
        this.render(container);
      });
    });
  },

  // --- 2. RENDER QUIZ CREATOR/EDITOR ---
  renderEditor(container) {
    container.innerHTML = `
      <div class="glass-card" style="max-width: 650px; margin: 0 auto; width:100%;">
        <h2 style="font-family:'Outfit'; font-size:1.3rem; font-weight:700; margin-bottom:20px;">
          ${editingQuiz.name ? `Edit Quiz: ${editingQuiz.name}` : 'Create Study Quiz'}
        </h2>

        <form id="quiz-editor-form">
          <div class="form-group">
            <label class="form-label">Quiz Name</label>
            <input type="text" id="edit-quiz-name" class="form-input" placeholder="e.g. Physics Midterm Prep" value="${editingQuiz.name}" required autocomplete="off">
          </div>

          <div class="form-group" style="margin-bottom: 24px;">
            <label class="form-label">Daily Reminder Alarm (Optional)</label>
            <input type="time" id="edit-quiz-time" class="form-input" value="${editingQuiz.scheduleTime || ''}">
            <span style="font-size:0.75rem; color:var(--text-muted);">Set a specific time (HH:MM) to receive an alert reminder daily.</span>
          </div>

          <div style="border-top:1px solid var(--border-glass); padding-top:20px; margin-bottom:16px;">
            <div style="display:flex; justify-content:between; align-items:center; margin-bottom:12px;">
              <h3 style="font-size:1rem; font-weight:700;">Quiz Questions</h3>
              <button type="button" class="btn btn-secondary" id="btn-add-question" style="font-size:0.8rem; padding: 5px 12px;">
                + Add Question
              </button>
            </div>

            <!-- Questions container list -->
            <div id="editor-questions-list"></div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:28px;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-quiz-edit">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Quiz</button>
          </div>
        </form>
      </div>
    `;

    // Render questions
    const qList = document.getElementById('editor-questions-list');
    this.renderEditorQuestions(qList);

    // --- ATTACH EDITOR EVENTS ---
    document.getElementById('btn-cancel-quiz-edit').addEventListener('click', () => {
      viewMode = 'index';
      editingQuiz = null;
      this.render(container);
      Sound.playClick();
    });

    document.getElementById('btn-add-question').addEventListener('click', () => {
      editingQuiz.questions.push({
        q: '',
        type: 'choice',
        options: ['', '', '', ''],
        correct: 0
      });
      this.renderEditorQuestions(qList);
      Sound.playClick();
    });

    const form = document.getElementById('quiz-editor-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const quizName = document.getElementById('edit-quiz-name').value.trim();
      const quizTime = document.getElementById('edit-quiz-time').value;

      if (!quizName) return;
      if (editingQuiz.questions.length === 0) {
        showToast('No questions', 'Please add at least one question to save the quiz.', 'planner');
        return;
      }

      // Read form data for questions
      let valid = true;
      editingQuiz.questions.forEach((q, idx) => {
        const qText = document.getElementById(`q-${idx}-text`).value.trim();
        if (!qText) {
          valid = false;
          return;
        }
        q.q = qText;

        const qType = document.getElementById(`q-${idx}-type`).value;
        q.type = qType;

        if (qType === 'choice') {
          const opt0 = document.getElementById(`q-${idx}-opt-0`).value.trim();
          const opt1 = document.getElementById(`q-${idx}-opt-1`).value.trim();
          const opt2 = document.getElementById(`q-${idx}-opt-2`).value.trim();
          const opt3 = document.getElementById(`q-${idx}-opt-3`).value.trim();
          
          if (!opt0 || !opt1 || !opt2 || !opt3) {
            valid = false;
            return;
          }
          q.options = [opt0, opt1, opt2, opt3];
          q.correct = parseInt(document.getElementById(`q-${idx}-correct`).value);
        } else {
          // True / False
          q.options = ['True', 'False'];
          q.correct = parseInt(document.getElementById(`q-${idx}-correct-tf`).value);
        }
      });

      if (!valid) {
        showToast('Incomplete Quiz', 'Please write out all questions and answers options.', 'planner');
        return;
      }

      editingQuiz.name = quizName;
      editingQuiz.scheduleTime = quizTime || '';
      editingQuiz.scoreHistory = editingQuiz.scoreHistory || [];

      State.saveQuiz(editingQuiz);
      showToast('Quiz Saved', `"${quizName}" has been successfully saved!`, 'quiz');
      Sound.playClick();
      
      viewMode = 'index';
      editingQuiz = null;
      this.render(container);
    });
  },

  renderEditorQuestions(qListContainer) {
    if (editingQuiz.questions.length === 0) {
      qListContainer.innerHTML = `<div class="empty-state" style="padding:16px;">Click "+ Add Question" to begin.</div>`;
      return;
    }

    qListContainer.innerHTML = editingQuiz.questions.map((q, idx) => `
      <div class="question-builder-item" data-idx="${idx}">
        <button type="button" class="btn btn-secondary btn-icon btn-remove-question" data-idx="${idx}">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--priority-high)" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div class="form-group">
          <label class="form-label">Question #${idx + 1}</label>
          <input type="text" id="q-${idx}-text" class="form-input" placeholder="e.g. What does API stand for?" value="${q.q}" required autocomplete="off">
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
          <div class="form-group">
            <label class="form-label">Question Format</label>
            <select id="q-${idx}-type" class="form-select q-format-select" data-idx="${idx}">
              <option value="choice" ${q.type === 'choice' ? 'selected' : ''}>Multiple Choice</option>
              <option value="tf" ${q.type === 'tf' ? 'selected' : ''}>True / False</option>
            </select>
          </div>

          <!-- Correct choice dropdown (Multi-choice) -->
          <div class="form-group q-correct-choice-box ${q.type === 'tf' ? 'hidden' : ''}" id="q-${idx}-correct-wrapper">
            <label class="form-label">Correct Answer</label>
            <select id="q-${idx}-correct" class="form-select">
              <option value="0" ${q.correct === 0 ? 'selected' : ''}>Option A</option>
              <option value="1" ${q.correct === 1 ? 'selected' : ''}>Option B</option>
              <option value="2" ${q.correct === 2 ? 'selected' : ''}>Option C</option>
              <option value="3" ${q.correct === 3 ? 'selected' : ''}>Option D</option>
            </select>
          </div>

          <!-- Correct choice dropdown (True/False) -->
          <div class="form-group q-correct-tf-box ${q.type === 'choice' ? 'hidden' : ''}" id="q-${idx}-correct-tf-wrapper">
            <label class="form-label">Correct Value</label>
            <select id="q-${idx}-correct-tf" class="form-select">
              <option value="0" ${q.correct === 0 ? 'selected' : ''}>True</option>
              <option value="1" ${q.correct === 1 ? 'selected' : ''}>False</option>
            </select>
          </div>
        </div>

        <!-- Options Container (Multi choice options form) -->
        <div class="q-options-container ${q.type === 'tf' ? 'hidden' : ''}" id="q-${idx}-options-container" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
          <div class="form-group">
            <input type="text" id="q-${idx}-opt-0" class="form-input" placeholder="Option A" value="${q.options ? q.options[0] || '' : ''}">
          </div>
          <div class="form-group">
            <input type="text" id="q-${idx}-opt-1" class="form-input" placeholder="Option B" value="${q.options ? q.options[1] || '' : ''}">
          </div>
          <div class="form-group">
            <input type="text" id="q-${idx}-opt-2" class="form-input" placeholder="Option C" value="${q.options ? q.options[2] || '' : ''}">
          </div>
          <div class="form-group">
            <input type="text" id="q-${idx}-opt-3" class="form-input" placeholder="Option D" value="${q.options ? q.options[3] || '' : ''}">
          </div>
        </div>

      </div>
    `).join('');

    // Attach local question building events
    qListContainer.querySelectorAll('.btn-remove-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-idx'));
        editingQuiz.questions.splice(index, 1);
        this.renderEditorQuestions(qListContainer);
        Sound.playClick();
      });
    });

    qListContainer.querySelectorAll('.q-format-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const index = parseInt(sel.getAttribute('data-idx'));
        const type = sel.value;
        
        const correctChoice = document.getElementById(`q-${index}-correct-wrapper`);
        const correctTF = document.getElementById(`q-${index}-correct-tf-wrapper`);
        const optionsList = document.getElementById(`q-${index}-options-container`);

        if (type === 'tf') {
          correctChoice.classList.add('hidden');
          correctTF.classList.remove('hidden');
          optionsList.classList.add('hidden');
        } else {
          correctChoice.classList.remove('hidden');
          correctTF.classList.add('hidden');
          optionsList.classList.remove('hidden');
        }
      });
    });
  },

  // --- 3. RENDER RUNNER PLAYER ---
  renderRunner(container) {
    const totalQ = activeQuiz.questions.length;
    
    // Check if finished
    if (activeQuestionIdx >= totalQ) {
      this.renderScoreSummary(container);
      return;
    }

    const currentQ = activeQuiz.questions[activeQuestionIdx];
    selectedOptionIdx = null;

    container.innerHTML = `
      <div class="glass-card quiz-runner-container">
        
        <div class="quiz-progress">
          <span>Testing: ${activeQuiz.name}</span>
          <span>Question ${activeQuestionIdx + 1} of ${totalQ}</span>
        </div>

        <div class="study-progress-bar" style="margin-bottom:24px;">
          <div class="study-progress-fill" style="width: ${((activeQuestionIdx) / totalQ) * 100}%;"></div>
        </div>

        <div class="quiz-question-box">
          <h3 class="quiz-question-text">${currentQ.q}</h3>
          
          <div class="quiz-options-list">
            ${currentQ.options.map((opt, oIdx) => `
              <button class="quiz-option-btn" data-oidx="${oIdx}">
                <span class="pomo-counts" style="font-weight:700; color:var(--text-muted); font-size:0.9rem;">${String.fromCharCode(65 + oIdx)}</span>
                <span style="flex-grow:1;">${opt}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:28px;">
          <button class="btn btn-secondary" id="btn-quit-quiz-runner">Quit Test</button>
          <button class="btn btn-primary hidden" id="btn-next-question-runner">Next Question</button>
        </div>

      </div>
    `;

    // --- ATTACH RUNNER EVENTS ---
    const optButtons = container.querySelectorAll('.quiz-option-btn');
    const btnNext = document.getElementById('btn-next-question-runner');

    optButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // If option already selected, skip
        if (selectedOptionIdx !== null) return;
        
        selectedOptionIdx = parseInt(btn.getAttribute('data-oidx'));
        userAnswers.push(selectedOptionIdx);
        
        const correctIdx = currentQ.correct;

        // Reveal animations
        optButtons.forEach((b, idx) => {
          if (idx === correctIdx) {
            b.classList.add('correct-reveal');
          } else if (idx === selectedOptionIdx) {
            b.classList.add('wrong-reveal');
          }
        });

        // Play feedback sounds
        if (selectedOptionIdx === correctIdx) {
          Sound.playClick();
        } else {
          // Play click fallback
          Sound.playClick();
        }

        // Show Next button
        btnNext.classList.remove('hidden');
      });
    });

    btnNext.addEventListener('click', () => {
      activeQuestionIdx++;
      this.render(container);
      Sound.playClick();
    });

    document.getElementById('btn-quit-quiz-runner').addEventListener('click', () => {
      if (confirm("Are you sure you want to quit this quiz? Your score won't be saved.")) {
        viewMode = 'index';
        activeQuiz = null;
        this.render(container);
        Sound.playClick();
      }
    });
  },

  renderScoreSummary(container) {
    const totalQ = activeQuiz.questions.length;
    let score = 0;
    
    activeQuiz.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correct) score++;
    });

    const percent = Math.round((score / totalQ) * 100);
    
    // Save score in database state
    State.addQuizScore(activeQuiz.id, score, totalQ);

    let evaluation = '';
    if (percent === 100) {
      evaluation = 'Perfect! You have mastered this deck completely.';
    } else if (percent >= 70) {
      evaluation = 'Superb job! You have a great grasp on this material.';
    } else if (percent >= 40) {
      evaluation = 'Good effort! Review your flashcards and take the quiz again.';
    } else {
      evaluation = 'Keep learning. Go through your study guides and try again!';
    }

    container.innerHTML = `
      <div class="glass-card quiz-runner-container text-center" style="text-align: center; padding:48px 32px;">
        <div class="alert-icon" style="background:rgba(57, 255, 20, 0.1); color:var(--color-quiz); margin: 0 auto 20px auto; width:56px; height:56px;">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h3 style="font-family:'Outfit'; font-size:1.6rem; font-weight:800; margin-bottom:8px;">Test Complete!</h3>
        <p style="color:var(--text-secondary); font-size:0.95rem; margin-bottom:24px;">Quiz: "${activeQuiz.name}"</p>

        <!-- Big Score Number -->
        <div style="margin-bottom:28px;">
          <div style="font-family:'Outfit'; font-size:4rem; font-weight:800; color:var(--color-quiz); line-height:1;">
            ${score} <span style="font-size:1.8rem; color:var(--text-secondary); font-weight:400;">/ ${totalQ}</span>
          </div>
          <div style="font-size:1.1rem; color:var(--text-primary); font-weight:600; margin-top:8px;">Score: ${percent}%</div>
        </div>

        <p style="color:var(--text-secondary); font-size:0.95rem; line-height:1.5; max-width:380px; margin: 0 auto 32px auto;">
          ${evaluation}
        </p>

        <button class="btn btn-primary" id="btn-quiz-score-finish" style="padding: 10px 24px;">
          Back to My Quizzes
        </button>
      </div>
    `;

    document.getElementById('btn-quiz-score-finish').addEventListener('click', () => {
      viewMode = 'index';
      activeQuiz = null;
      this.render(container);
      Sound.playClick();
    });
  }
};
