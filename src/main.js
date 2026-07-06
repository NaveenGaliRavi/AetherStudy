/* ----------------------------------------------------
   AetherStudy Controller & Application Router
   ---------------------------------------------------- */

import { State } from './state.js';
import { showToast, Sound } from './utils.js';
import { Dashboard } from './modules/dashboard.js';
import { Planner } from './modules/planner.js';
import { Pomodoro } from './modules/pomodoro.js';
import { Flashcards } from './modules/flashcards.js';
import { Quizzes } from './modules/quizzes.js';

// Elements
const viewTitle = document.getElementById('view-title');
const viewSubtitle = document.getElementById('view-subtitle');
const systemTimeEl = document.getElementById('system-time');
const navItems = document.querySelectorAll('.nav-item');
const panels = document.querySelectorAll('.view-panel');

// Modal Elements
const reminderModal = document.getElementById('reminder-modal');
const reminderTitle = document.getElementById('reminder-title');
const reminderMessage = document.getElementById('reminder-message');
const btnReminderSkip = document.getElementById('btn-reminder-skip');
const btnReminderStart = document.getElementById('btn-reminder-start');

// Badges
const flashcardBadge = document.getElementById('flashcard-badge');
const quizBadge = document.getElementById('quiz-badge');

let currentActiveView = 'dashboard';
let activeQuizIdForReminder = null;

// View Configuration Metadata
const VIEW_METADATA = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Welcome back to AetherStudy. Here is your progress today.',
    module: Dashboard
  },
  planner: {
    title: 'Study Planner',
    subtitle: 'Manage your tasks, assign deadlines, and allocate focus sessions.',
    module: Planner
  },
  pomodoro: {
    title: 'Pomodoro Focus Timer',
    subtitle: 'Tune out distractions, log focus intervals, and sync with your agenda.',
    module: Pomodoro
  },
  flashcards: {
    title: 'Leitner Flashcards',
    subtitle: 'Train your memory with interactive spaced-repetition study decks.',
    module: Flashcards
  },
  quizzes: {
    title: 'Quiz Maker & Reminders',
    subtitle: 'Build custom quizzes and schedule automated alerts to test your memory.',
    module: Quizzes
  }
};

// --- INITIALIZE APPLICATION ---
function initApp() {
  State.init(); // Seed default state
  
  // Navigation Handler
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      navigateTo(target);
      Sound.playClick();
    });
  });

  // Clock Ticker
  setInterval(updateClock, 1000);
  updateClock();

  // Scheduled Quiz Checker
  setInterval(checkQuizReminders, 15000); // Check every 15s

  // State Change Listeners for badges
  State.subscribe('decks:change', updateBadges);
  State.subscribe('quizzes:change', updateBadges);
  
  // Initialize Pomodoro sound triggers
  Pomodoro.setupAlarmTriggers();

  // Handle reminder buttons
  btnReminderSkip.addEventListener('click', () => {
    reminderModal.classList.add('hidden');
    activeQuizIdForReminder = null;
  });

  btnReminderStart.addEventListener('click', () => {
    reminderModal.classList.add('hidden');
    if (activeQuizIdForReminder) {
      navigateTo('quizzes');
      Quizzes.startQuizDirectly(activeQuizIdForReminder);
      activeQuizIdForReminder = null;
    }
  });

  // Render initial dashboard view
  navigateTo('dashboard');
  updateBadges();
}

// --- ROUTER ROUTINE ---
export function navigateTo(viewId) {
  if (!VIEW_METADATA[viewId]) return;
  currentActiveView = viewId;

  // Toggle active view class
  panels.forEach(panel => {
    panel.classList.remove('active');
    if (panel.id === `view-${viewId}`) {
      panel.classList.add('active');
    }
  });

  // Toggle active nav class
  navItems.forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-target') === viewId) {
      item.classList.add('active');
    }
  });

  // Update headers
  const meta = VIEW_METADATA[viewId];
  viewTitle.textContent = meta.title;
  viewSubtitle.textContent = meta.subtitle;

  // Render module layout into the targeted panel
  const container = document.getElementById(`view-${viewId}`);
  meta.module.render(container);
  
  // Sync badges on nav
  updateBadges();
}

// --- SYSTEM CLOCK ---
function updateClock() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  systemTimeEl.textContent = `${hours}:${minutes}:${seconds}`;
}

// --- BADGES SYNCHRONIZER ---
function updateBadges() {
  // Flashcards Badge: count cards due today
  const decks = State.getDecks();
  let dueCount = 0;
  const now = Date.now();
  
  decks.forEach(deck => {
    deck.cards.forEach(card => {
      if (!card.nextReview || card.nextReview <= now) {
        dueCount++;
      }
    });
  });

  if (dueCount > 0) {
    flashcardBadge.textContent = dueCount;
    flashcardBadge.classList.remove('hidden');
  } else {
    flashcardBadge.classList.add('hidden');
  }

  // Quizzes Badge: Check if there's any quizzes scheduled today that haven't been taken since they were due
  const quizzes = State.getQuizzes();
  let unscheduledAlertCount = 0;
  quizzes.forEach(quiz => {
    if (quiz.scheduleTime) {
      // If quiz hasn't been taken today
      const todayStr = new Date().toISOString().split('T')[0];
      const lastTakenStr = quiz.lastTaken ? quiz.lastTaken.split('T')[0] : '';
      if (lastTakenStr !== todayStr) {
        unscheduledAlertCount++;
      }
    }
  });

  if (unscheduledAlertCount > 0) {
    quizBadge.classList.remove('hidden');
  } else {
    quizBadge.classList.add('hidden');
  }
}

// --- SCHEDULED QUIZ REMINDERS ENGINE ---
let triggeredReminders = {}; // Keep track of triggered reminders for the current hour-minute to avoid repeats

function checkQuizReminders() {
  const now = new Date();
  const currentHM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  // Clear tracker daily or at new times
  if (now.getSeconds() < 5 && triggeredReminders[currentHM]) {
    // Keep it clean
  }

  const quizzes = State.getQuizzes();
  quizzes.forEach(quiz => {
    if (quiz.scheduleTime === currentHM && !triggeredReminders[`${quiz.id}-${currentHM}`]) {
      triggeredReminders[`${quiz.id}-${currentHM}`] = true;

      // Show Custom overlay modal and trigger sound/toast
      activeQuizIdForReminder = quiz.id;
      reminderTitle.textContent = `Time for Quiz: ${quiz.name}!`;
      reminderMessage.textContent = `Your scheduled study reminder is active. Test your knowledge right now to lock down your retention!`;
      reminderModal.classList.remove('hidden');

      showToast(`Quiz Reminder`, `Ready to test: "${quiz.name}"`, 'quiz');
    }
  });
}

// Bootstrap
window.addEventListener('DOMContentLoaded', initApp);
