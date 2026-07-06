/* ----------------------------------------------------
   AetherStudy Dashboard Panel Module
   ---------------------------------------------------- */

import { State } from '../state.js';
import { formatTime, formatRelativeDate } from '../utils.js';
import { navigateTo } from '../main.js';
import { Pomodoro } from './pomodoro.js';

const MOTIVATIONAL_QUOTES = [
  { text: "Deep Work is the superpower of the 21st century.", author: "Cal Newport" },
  { text: "Spaced repetition transforms transient cramming into lifelong knowledge.", author: "Sebastian Leitner" },
  { text: "The secret of change is to focus all of your energy, not on fighting the old, but on building the new.", author: "Socrates" },
  { text: "Focus is a muscle, and you build it by focusing on one single task at a time.", author: "Anonymous" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" }
];

export const Dashboard = {
  render(container) {
    const tasks = State.getTasks();
    const pomoLogs = State.getPomodoroLogs();
    const decks = State.getDecks();
    const quizzes = State.getQuizzes();
    
    // 1. Calculations
    const totalPomos = pomoLogs.filter(log => log.type === 'focus').length;
    
    // Tasks stats
    const todayStr = new Date().toISOString().split('T')[0];
    const tasksToday = tasks.filter(t => t.dueDate === todayStr);
    const completedToday = tasksToday.filter(t => t.completed).length;
    const totalTasksToday = tasksToday.length;
    
    // Overall completion percentage for today
    const taskProgressPct = totalTasksToday > 0 ? Math.round((completedToday / totalTasksToday) * 100) : 0;

    // Flashcard due count
    let flashcardsDue = 0;
    const now = Date.now();
    decks.forEach(d => {
      d.cards.forEach(c => {
        if (!c.nextReview || c.nextReview <= now) flashcardsDue++;
      });
    });

    // Quiz reminder status
    const quizzesDueToday = quizzes.filter(q => {
      if (!q.scheduleTime) return false;
      const lastTakenDate = q.lastTaken ? q.lastTaken.split('T')[0] : '';
      return lastTakenDate !== todayStr;
    }).length;

    // Filter high priority tasks
    const activeHighPriorityTasks = tasks
      .filter(t => !t.completed && t.priority === 'high')
      .slice(0, 4);

    // Filter recent logs
    const recentLogs = [...pomoLogs]
      .reverse()
      .slice(0, 3);

    // Get a random quote
    const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];

    // SVG Circular Ring parameters
    const ringRadius = 50;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringStrokeOffset = ringCircumference - (taskProgressPct / 100) * ringCircumference;

    // Generate UI Content
    container.innerHTML = `
      <!-- Stats widgets row -->
      <div class="dashboard-grid">
        <div class="glass-card stat-card">
          <div class="stat-info">
            <span class="text-secondary" style="font-size: 0.85rem;">Focus Sessions</span>
            <span class="stat-value">${totalPomos}</span>
            <span class="text-muted" style="font-size: 0.75rem;">Total Pomodoros logged</span>
          </div>
          <div class="stat-icon" style="background: rgba(255, 94, 98, 0.1); color: var(--color-pomodoro);">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-info">
            <span class="text-secondary" style="font-size: 0.85rem;">Flashcards Due</span>
            <span class="stat-value">${flashcardsDue}</span>
            <span class="text-muted" style="font-size: 0.75rem;">Awaiting Leitner review</span>
          </div>
          <div class="stat-icon" style="background: rgba(0, 242, 254, 0.1); color: var(--color-flashcards);">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-info">
            <span class="text-secondary" style="font-size: 0.85rem;">Quiz Reminders</span>
            <span class="stat-value">${quizzesDueToday}</span>
            <span class="text-muted" style="font-size: 0.75rem;">Quizzes pending today</span>
          </div>
          <div class="stat-icon" style="background: rgba(57, 255, 20, 0.1); color: var(--color-quiz);">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Dashboard details grid -->
      <div class="dashboard-details">
        
        <!-- Left Side: High Priority Agenda -->
        <div class="glass-card">
          <div class="dashboard-section-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>Priority Study Agenda</span>
          </div>

          <div class="agenda-list" id="dashboard-agenda">
            ${activeHighPriorityTasks.length === 0 ? `
              <div class="empty-state">No urgent priority tasks pending! Click 'Study Planner' to create some.</div>
            ` : activeHighPriorityTasks.map(task => `
              <div class="agenda-item priority-${task.priority}">
                <div style="display: flex; align-items: center; gap: 12px; flex-grow: 1;">
                  <label class="checkbox-container">
                    <input type="checkbox" class="toggle-task-db" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
                    <span class="checkmark"></span>
                  </label>
                  <div>
                    <div class="agenda-item-name">${task.title}</div>
                    <div class="agenda-item-due" style="margin-top:2px;">
                      <span class="task-tag" style="padding:1px 5px; font-size:0.7rem;">${task.category}</span>
                      <span>${formatRelativeDate(task.dueDate)}</span>
                    </div>
                  </div>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-secondary btn-icon start-focus-db" data-id="${task.id}" title="Focus on this task">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--color-pomodoro)" stroke-width="3">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Right Side: Today's Tasks Progress & Quote -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <!-- SVG Progress Circle Card -->
          <div class="glass-card circle-progress-container">
            <span class="form-label" style="text-transform: uppercase; letter-spacing: 1px; font-size: 0.75rem;">Today's Task Completion</span>
            
            <div style="position: relative; width: 120px; height: 120px;">
              <svg width="120" height="120" class="progress-ring-svg">
                <circle class="timer-ring-bg" stroke-width="6" r="${ringRadius}" cx="60" cy="60" />
                <circle class="timer-ring-progress" 
                        stroke="url(#db-circle-grad)"
                        stroke-width="7" 
                        r="${ringRadius}" 
                        cx="60" 
                        cy="60" 
                        style="stroke-dasharray: ${ringCircumference}; stroke-dashoffset: ${ringStrokeOffset};" />
                <defs>
                  <linearGradient id="db-circle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#00f0ff" />
                    <stop offset="100%" stop-color="#7f00ff" />
                  </linearGradient>
                </defs>
              </svg>
              <div style="position: absolute; top:0; left:0; width:120px; height:120px; display:flex; align-items:center; justify-content:center; flex-direction:column;">
                <span style="font-family:'Outfit'; font-size: 1.5rem; font-weight: 800;">${taskProgressPct}%</span>
              </div>
            </div>
            
            <div style="font-size: 0.8rem; text-align: center; color: var(--text-secondary);">
              ${totalTasksToday > 0 ? `<strong>${completedToday}/${totalTasksToday}</strong> tasks completed today` : 'No tasks scheduled for today'}
            </div>
          </div>

          <!-- Motivational Quote card -->
          <div class="glass-card" style="padding: 20px; background: rgba(127, 0, 255, 0.03); border-color: rgba(127, 0, 255, 0.15); display: flex; flex-direction: column; justify-content: center; min-height: 120px;">
            <p style="font-size: 0.85rem; font-style: italic; line-height: 1.5; color: var(--text-primary);">"${randomQuote.text}"</p>
            <span style="font-size: 0.75rem; color: var(--color-dashboard); margin-top: 10px; align-self: flex-end; font-weight: 600; font-family:'Outfit';">— ${randomQuote.author}</span>
          </div>
        </div>

      </div>

      <!-- Recent Pomodoro logs section -->
      <div class="glass-card" style="margin-top: 24px;">
        <div class="dashboard-section-title" style="margin-bottom:14px;">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span>Recent Focus Sessions</span>
        </div>
        <div class="agenda-list">
          ${recentLogs.length === 0 ? `
            <div class="empty-state" style="padding: 16px;">No focus logs recorded yet. Head over to the Pomodoro Timer to start.</div>
          ` : recentLogs.map(log => `
            <div class="agenda-item" style="border-left-color: var(--color-pomodoro); padding: 10px 16px;">
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span class="agenda-item-name" style="font-size: 0.85rem;">Focused on: ${log.taskName}</span>
                <span style="font-size: 0.7rem; color: var(--text-muted);">${new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • ${log.duration} min focus slot</span>
              </div>
              <span class="pomo-counts" style="font-size:0.75rem;">✓ Complete</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // 2. Attach Event Handlers
    container.querySelectorAll('.toggle-task-db').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const taskId = e.target.getAttribute('data-id');
        State.toggleTask(taskId);
        // Re-render dashboard
        this.render(container);
      });
    });

    container.querySelectorAll('.start-focus-db').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const btnEl = e.currentTarget;
        const taskId = btnEl.getAttribute('data-id');
        const tasksList = State.getTasks();
        const task = tasksList.find(t => t.id === taskId);
        
        if (task) {
          // Link this task in Pomodoro state
          Pomodoro.setActiveFocusTask(task);
          // Navigate to pomodoro tab
          navigateTo('pomodoro');
        }
      });
    });
  }
};
