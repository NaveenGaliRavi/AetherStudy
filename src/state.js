/* ----------------------------------------------------
   AetherStudy Central State Management
   ---------------------------------------------------- */

// Storage Keys
const KEYS = {
  TASKS: 'aether_tasks',
  POMODORO_LOGS: 'aether_pomo_logs',
  POMODORO_SETTINGS: 'aether_pomo_settings',
  QUIZZES: 'aether_quizzes',
  FLASHCARD_DECKS: 'aether_decks'
};

// Event emitter system
const listeners = {};

export const State = {
  subscribe(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  },

  notify(event, data) {
    if (listeners[event]) {
      listeners[event].forEach(callback => callback(data));
    }
  },

  // --- INITIALIZATION & SEED DATA ---
  init() {
    // Tasks Seed
    if (!localStorage.getItem(KEYS.TASKS)) {
      const defaultTasks = [
        {
          id: 'task-1',
          title: 'Review Electromagnetism & Gauss\'s Law',
          category: 'Physics',
          priority: 'high',
          completed: false,
          pomodoroCount: 1,
          dueDate: new Date().toISOString().split('T')[0] // today
        },
        {
          id: 'task-2',
          title: 'Study Leitner Box-3 Flashcards',
          category: 'Study Skills',
          priority: 'medium',
          completed: true,
          pomodoroCount: 2,
          dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0] // yesterday
        },
        {
          id: 'task-3',
          title: 'Draft Chapter 2 Thesis Outline',
          category: 'Literature',
          priority: 'low',
          completed: false,
          pomodoroCount: 0,
          dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0] // in 2 days
        }
      ];
      localStorage.setItem(KEYS.TASKS, JSON.stringify(defaultTasks));
    }

    // Pomodoro Settings Seed
    if (!localStorage.getItem(KEYS.POMODORO_SETTINGS)) {
      const defaultSettings = { focus: 25, short: 5, long: 15 };
      localStorage.setItem(KEYS.POMODORO_SETTINGS, JSON.stringify(defaultSettings));
    }

    // Pomodoro Logs Seed
    if (!localStorage.getItem(KEYS.POMODORO_LOGS)) {
      const defaultLogs = [
        { date: new Date(Date.now() - 3600000 * 3).toISOString(), duration: 25, taskName: 'Study Leitner Box-3 Flashcards', type: 'focus' },
        { date: new Date(Date.now() - 3600000 * 2.5).toISOString(), duration: 5, taskName: 'Break', type: 'short' },
        { date: new Date(Date.now() - 3600000 * 2).toISOString(), duration: 25, taskName: 'Study Leitner Box-3 Flashcards', type: 'focus' }
      ];
      localStorage.setItem(KEYS.POMODORO_LOGS, JSON.stringify(defaultLogs));
    }

    // Quizzes Seed
    if (!localStorage.getItem(KEYS.QUIZZES)) {
      const defaultQuizzes = [
        {
          id: 'quiz-1',
          name: 'Core Study Tactics & Productivity',
          scheduleTime: '10:00', // Default scheduled alert time
          lastTaken: null,
          scoreHistory: [],
          questions: [
            {
              q: 'What is the standard focus duration in the Pomodoro Technique?',
              type: 'choice',
              options: ['15 minutes', '25 minutes', '50 minutes', '90 minutes'],
              correct: 1
            },
            {
              q: 'In the Leitner system, cards that you answer incorrectly are moved back to which box?',
              type: 'choice',
              options: ['Box 1 (highest frequency)', 'The next box higher', 'Box 3 (lowest frequency)', 'Discarded'],
              correct: 0
            },
            {
              q: 'The Web Audio API allows developers to synthesize sounds natively in the browser.',
              type: 'tf',
              options: ['True', 'False'],
              correct: 0
            }
          ]
        }
      ];
      localStorage.setItem(KEYS.QUIZZES, JSON.stringify(defaultQuizzes));
    }

    // Flashcard Decks Seed
    if (!localStorage.getItem(KEYS.FLASHCARD_DECKS)) {
      const defaultDecks = [
        {
          id: 'deck-1',
          name: 'Productivity Methods',
          cards: [
            {
              id: 'card-1',
              front: 'What is the Pomodoro Technique named after?',
              back: 'A tomato-shaped kitchen timer (Pomodoro is Italian for tomato). Used by creator Francesco Cirillo.',
              box: 1,
              nextReview: Date.now()
            },
            {
              id: 'card-2',
              front: 'How does the Spaced Repetition (Leitner) Box system work?',
              back: 'Cards in Box 1 are reviewed daily. Correct answers move them to Box 2 (reviewed every 2 days), then Box 3 (every 5 days). Incorrect answers drop them back to Box 1.',
              box: 1,
              nextReview: Date.now()
            },
            {
              id: 'card-3',
              front: 'Explain the Feynman Technique in one sentence.',
              back: 'A learning method where you explain a concept to a child or beginner using simple language to identify gaps in your understanding.',
              box: 2,
              nextReview: Date.now() + 86400000 // due tomorrow
            }
          ]
        }
      ];
      localStorage.setItem(KEYS.FLASHCARD_DECKS, JSON.stringify(defaultDecks));
    }
  },

  // --- TASKS / PLANNER ---
  getTasks() {
    return JSON.parse(localStorage.getItem(KEYS.TASKS)) || [];
  },

  saveTask(task) {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === task.id);
    if (index > -1) {
      tasks[index] = { ...tasks[index], ...task };
    } else {
      tasks.push(task);
    }
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
    this.notify('tasks:change', tasks);
  },

  deleteTask(id) {
    const tasks = this.getTasks().filter(t => t.id !== id);
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
    this.notify('tasks:change', tasks);
  },

  toggleTask(id) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
      this.notify('tasks:change', tasks);
    }
  },

  incrementTaskPomodoro(id) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.pomodoroCount = (task.pomodoroCount || 0) + 1;
      localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
      this.notify('tasks:change', tasks);
    }
  },

  // --- POMODORO ---
  getPomodoroSettings() {
    return JSON.parse(localStorage.getItem(KEYS.POMODORO_SETTINGS)) || { focus: 25, short: 5, long: 15 };
  },

  savePomodoroSettings(settings) {
    localStorage.setItem(KEYS.POMODORO_SETTINGS, JSON.stringify(settings));
    this.notify('pomodoro:settings', settings);
  },

  getPomodoroLogs() {
    return JSON.parse(localStorage.getItem(KEYS.POMODORO_LOGS)) || [];
  },

  addPomodoroLog(log) {
    const logs = this.getPomodoroLogs();
    logs.push({
      date: new Date().toISOString(),
      ...log
    });
    localStorage.setItem(KEYS.POMODORO_LOGS, JSON.stringify(logs));
    this.notify('pomodoro:log', logs);
  },

  // --- QUIZZES ---
  getQuizzes() {
    return JSON.parse(localStorage.getItem(KEYS.QUIZZES)) || [];
  },

  saveQuiz(quiz) {
    const quizzes = this.getQuizzes();
    const index = quizzes.findIndex(q => q.id === quiz.id);
    if (index > -1) {
      quizzes[index] = { ...quizzes[index], ...quiz };
    } else {
      quizzes.push(quiz);
    }
    localStorage.setItem(KEYS.QUIZZES, JSON.stringify(quizzes));
    this.notify('quizzes:change', quizzes);
  },

  deleteQuiz(id) {
    const quizzes = this.getQuizzes().filter(q => q.id !== id);
    localStorage.setItem(KEYS.QUIZZES, JSON.stringify(quizzes));
    this.notify('quizzes:change', quizzes);
  },

  addQuizScore(quizId, score, total) {
    const quizzes = this.getQuizzes();
    const quiz = quizzes.find(q => q.id === quizId);
    if (quiz) {
      if (!quiz.scoreHistory) quiz.scoreHistory = [];
      quiz.scoreHistory.push({
        date: new Date().toISOString(),
        score,
        total
      });
      quiz.lastTaken = new Date().toISOString();
      localStorage.setItem(KEYS.QUIZZES, JSON.stringify(quizzes));
      this.notify('quizzes:change', quizzes);
    }
  },

  // --- FLASHCARDS (LEITNER SYSTEM) ---
  getDecks() {
    return JSON.parse(localStorage.getItem(KEYS.FLASHCARD_DECKS)) || [];
  },

  saveDeck(deckName) {
    const decks = this.getDecks();
    const newDeck = {
      id: 'deck-' + Date.now(),
      name: deckName,
      cards: []
    };
    decks.push(newDeck);
    localStorage.setItem(KEYS.FLASHCARD_DECKS, JSON.stringify(decks));
    this.notify('decks:change', decks);
    return newDeck;
  },

  deleteDeck(id) {
    const decks = this.getDecks().filter(d => d.id !== id);
    localStorage.setItem(KEYS.FLASHCARD_DECKS, JSON.stringify(decks));
    this.notify('decks:change', decks);
  },

  addCardToDeck(deckId, front, back) {
    const decks = this.getDecks();
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
      const card = {
        id: 'card-' + Date.now(),
        front,
        back,
        box: 1,
        nextReview: Date.now() // ready to review immediately
      };
      deck.cards.push(card);
      localStorage.setItem(KEYS.FLASHCARD_DECKS, JSON.stringify(decks));
      this.notify('decks:change', decks);
    }
  },

  deleteCardFromDeck(deckId, cardId) {
    const decks = this.getDecks();
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
      deck.cards = deck.cards.filter(c => c.id !== cardId);
      localStorage.setItem(KEYS.FLASHCARD_DECKS, JSON.stringify(decks));
      this.notify('decks:change', decks);
    }
  },

  updateCardLeitner(deckId, cardId, rating) {
    // rating: 'hard' (returns to box 1), 'medium' (stays or reviews sooner), 'easy' (promoted to higher box)
    const decks = this.getDecks();
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;

    const card = deck.cards.find(c => c.id === cardId);
    if (!card) return;

    let newBox = card.box || 1;
    let delay = 0;

    if (rating === 'easy') {
      newBox = Math.min(newBox + 1, 3);
    } else if (rating === 'hard') {
      newBox = 1;
    }
    // else if 'medium', box number doesn't change

    // Calculate delay based on new Box
    if (newBox === 1) {
      delay = 1000 * 60 * 2; // review again in 2 minutes (for testability, normally 1 day)
    } else if (newBox === 2) {
      delay = 1000 * 60 * 10; // review again in 10 minutes (normally 2 days)
    } else if (newBox === 3) {
      delay = 1000 * 60 * 30; // review again in 30 minutes (normally 5 days)
    }

    card.box = newBox;
    card.nextReview = Date.now() + delay;

    localStorage.setItem(KEYS.FLASHCARD_DECKS, JSON.stringify(decks));
    this.notify('decks:change', decks);
  }
};
