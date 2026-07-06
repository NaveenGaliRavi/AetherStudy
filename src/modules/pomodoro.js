/* ----------------------------------------------------
   AetherStudy Pomodoro Module
   ---------------------------------------------------- */

import { State } from '../state.js';
import { formatTime, showToast, Sound } from '../utils.js';

// Timer Engine State (persists in background when view switches)
let timeLeft = 25 * 60;
let totalDuration = 25 * 60;
let timerState = 'idle'; // 'idle', 'running', 'paused'
let activeMode = 'focus'; // 'focus', 'short', 'long'
let activeTask = null; // linked task from planner
let intervalId = null;

// References to currently rendered DOM elements (to update dynamically if view is open)
let elements = {
  timeNumbers: null,
  progressRing: null,
  phaseDisplay: null,
  btnPlay: null,
  btnPause: null,
  btnReset: null,
  badge: null
};

// Calculate SVG circle properties
const ringRadius = 130;
const ringCircumference = 2 * Math.PI * ringRadius;

export const Pomodoro = {
  // Bind timer alarm triggers globally
  setupAlarmTriggers() {
    // Synchronize initial settings
    const settings = State.getPomodoroSettings();
    timeLeft = settings[activeMode] * 60;
    totalDuration = settings[activeMode] * 60;

    // Start background ticking ticker
    if (!intervalId) {
      intervalId = setInterval(() => {
        this.tick();
      }, 1000);
    }
  },

  setActiveFocusTask(task) {
    activeTask = task;
    activeMode = 'focus';
    const settings = State.getPomodoroSettings();
    timeLeft = settings.focus * 60;
    totalDuration = settings.focus * 60;
    timerState = 'paused'; // Hold timer for start
    
    // Refresh sidebar badge immediately
    this.updatePomoBadge();
  },

  // Main Background Ticker
  tick() {
    if (timerState !== 'running') {
      this.updatePomoBadge();
      return;
    }

    if (timeLeft > 0) {
      timeLeft--;
      this.updateUI();
    } else {
      // Timer Completed!
      timerState = 'idle';
      
      const logName = activeTask ? activeTask.title : (activeMode === 'focus' ? 'General Study' : (activeMode === 'short' ? 'Short Break' : 'Long Break'));
      
      // Save log in database
      State.addPomodoroLog({
        duration: Math.round(totalDuration / 60),
        taskName: logName,
        type: activeMode
      });

      if (activeMode === 'focus') {
        // Trigger sounds & toasts
        Sound.playFocusComplete();
        showToast('Focus Completed!', `Outstanding work! You've finished focusing on "${logName}".`, 'pomodoro');
        
        // Increment Task Pomodoro in central planner state
        if (activeTask) {
          State.incrementTaskPomodoro(activeTask.id);
        }

        // Auto transition to short break
        this.switchMode('short');
      } else {
        // Break Completed
        Sound.playBreakComplete();
        showToast('Break Finished!', 'Ready to jump back in? Start a new focus session.', 'pomodoro');
        this.switchMode('focus');
      }
    }
    this.updatePomoBadge();
  },

  // Switch modes: focus, short break, long break
  switchMode(mode) {
    activeMode = mode;
    const settings = State.getPomodoroSettings();
    timeLeft = settings[mode] * 60;
    totalDuration = settings[mode] * 60;
    timerState = 'idle';
    
    // Clear active task if switching to a break
    if (mode !== 'focus') {
      activeTask = null;
    }

    this.updateUI();
    this.updatePomoBadge();
    
    // Re-render mode selectors if view is open
    const modeBtns = document.querySelectorAll('.timer-mode-btn');
    if (modeBtns.length > 0) {
      modeBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-mode') === mode) btn.classList.add('active');
      });
    }
  },

  // Sync DOM elements if view is open
  updateUI() {
    // 1. Update text clock numbers
    if (elements.timeNumbers) {
      elements.timeNumbers.textContent = formatTime(timeLeft);
    }

    // 2. Update SVG progress ring
    if (elements.progressRing) {
      const offset = ringCircumference - (timeLeft / totalDuration) * ringCircumference;
      elements.progressRing.style.strokeDashoffset = isNaN(offset) ? 0 : offset;
    }

    // 3. Update play/pause buttons states
    if (elements.btnPlay && elements.btnPause) {
      if (timerState === 'running') {
        elements.btnPlay.classList.add('hidden');
        elements.btnPause.classList.remove('hidden');
      } else {
        elements.btnPlay.classList.remove('hidden');
        elements.btnPause.classList.add('hidden');
      }
    }

    // 4. Update task details card inside timer view
    const focusTaskContainer = document.getElementById('focus-task-container');
    if (focusTaskContainer) {
      if (activeTask && activeMode === 'focus') {
        focusTaskContainer.innerHTML = `
          <div class="focus-task-card">
            <span class="pomo-counts">🍅</span>
            <div class="focus-task-text">
              <div class="focus-task-title">CURRENT OBJECTIVE</div>
              <div class="focus-task-name">${activeTask.title}</div>
            </div>
            <button class="btn btn-secondary btn-icon" id="btn-unlink-task" title="Unlink task" style="padding:0; border:none; background:transparent;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--text-muted)" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        `;
        document.getElementById('btn-unlink-task').addEventListener('click', () => {
          activeTask = null;
          this.updateUI();
        });
      } else {
        // Task selection dropdown
        const tasks = State.getTasks().filter(t => !t.completed);
        focusTaskContainer.innerHTML = `
          <div class="form-group" style="margin-top:20px; width:100%; max-width:320px;">
            <label class="form-label" style="font-size:0.75rem; text-transform:uppercase;">Attach Focus Task</label>
            <select id="timer-task-dropdown" class="form-select" style="font-size:0.8rem;">
              <option value="">-- General Study Session --</option>
              ${tasks.map(t => `<option value="${t.id}">${t.title} [${t.category}]</option>`).join('')}
            </select>
          </div>
        `;
        const drop = document.getElementById('timer-task-dropdown');
        drop.addEventListener('change', () => {
          const selectedId = drop.value;
          activeTask = tasks.find(t => t.id === selectedId) || null;
          this.updateUI();
        });
      }
    }
  },

  // Update Sidebar Tab Count Badge
  updatePomoBadge() {
    const badge = document.getElementById('pomo-badge');
    if (!badge) return;

    if (timerState === 'running') {
      badge.textContent = formatTime(timeLeft);
      badge.classList.remove('hidden');
      badge.style.animation = activeMode === 'focus' ? 'pulse 2s infinite' : 'none';
    } else {
      badge.classList.add('hidden');
    }
  },

  render(container) {
    const settings = State.getPomodoroSettings();
    const pomoLogs = State.getPomodoroLogs();

    container.innerHTML = `
      <div class="pomodoro-container">
        
        <!-- Left Column: Circular Timer Visuals & Controls -->
        <div class="timer-wheel-section">
          
          <!-- Mode Pill Selectors -->
          <div class="timer-modes">
            <button class="timer-mode-btn ${activeMode === 'focus' ? 'active' : ''}" data-mode="focus">Focus</button>
            <button class="timer-mode-btn ${activeMode === 'short' ? 'active' : ''}" data-mode="short">Short Break</button>
            <button class="timer-mode-btn ${activeMode === 'long' ? 'active' : ''}" data-mode="long">Long Break</button>
          </div>

          <!-- Circular SVG Counter -->
          <div class="timer-visual">
            <svg width="280" height="280">
              <circle class="timer-ring-bg" stroke-width="8" r="${ringRadius}" cx="140" cy="140" />
              <circle class="timer-ring-progress" 
                      id="timer-stroke-progress"
                      stroke-width="8" 
                      r="${ringRadius}" 
                      cx="140" 
                      cy="140" 
                      style="stroke-dasharray: ${ringCircumference}; stroke-dashoffset: 0;" />
            </svg>
            <div class="timer-display">
              <div class="time-numbers" id="timer-time-text">${formatTime(timeLeft)}</div>
              <div class="timer-phase" id="timer-phase-text">${activeMode === 'focus' ? 'Focus Session' : 'Break Time'}</div>
            </div>
          </div>

          <!-- Linked task representation container -->
          <div id="focus-task-container" style="display:flex; justify-content:center; width:100%;"></div>

          <!-- Focus Controls -->
          <div class="timer-controls">
            <button class="btn btn-secondary btn-icon" id="btn-timer-reset" title="Reset Session">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
            </button>
            
            <button class="btn btn-primary" id="btn-timer-play" style="padding: 12px 28px; border-radius: 30px;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <span>Start Focus</span>
            </button>

            <button class="btn btn-primary hidden" id="btn-timer-pause" style="padding: 12px 28px; border-radius: 30px; background: var(--bg-card); border-color: var(--color-pomodoro); color:#fff; box-shadow:none;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-pomodoro)" stroke-width="2">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
              <span style="color:var(--color-pomodoro);">Pause</span>
            </button>

            <button class="btn btn-secondary btn-icon" id="btn-timer-skip" title="Skip Session">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </button>
          </div>

        </div>

        <!-- Right Column: Settings Panel & Focus Log History -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <!-- Customizable Durations Form -->
          <div class="glass-card">
            <h3 style="font-family:'Outfit'; font-size:1.1rem; font-weight:700; margin-bottom:14px; display:flex; align-items:center; gap:8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--color-pomodoro)" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span>Timer Configurations (Min)</span>
            </h3>

            <form id="pomo-settings-form" style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-size:0.75rem;">Focus</label>
                <input type="number" id="pomo-set-focus" class="form-input" min="1" max="120" value="${settings.focus}" style="padding:6px 10px; text-align:center;">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-size:0.75rem;">Short Break</label>
                <input type="number" id="pomo-set-short" class="form-input" min="1" max="60" value="${settings.short}" style="padding:6px 10px; text-align:center;">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-size:0.75rem;">Long Break</label>
                <input type="number" id="pomo-set-long" class="form-input" min="1" max="60" value="${settings.long}" style="padding:6px 10px; text-align:center;">
              </div>
              <button type="submit" class="btn btn-secondary" style="grid-column: 1 / span 3; font-size: 0.8rem; padding: 6px 12px; margin-top: 10px; justify-content:center;">
                Save custom interval lengths
              </button>
            </form>
          </div>

          <!-- Dynamic logs dashboard -->
          <div class="glass-card" style="flex-grow:1;">
            <h3 style="font-family:'Outfit'; font-size:1.1rem; font-weight:700; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--color-pomodoro)" stroke-width="2">
                <path d="M12 20h9M3 20v-8c0-2.2 1.8-4 4-4h10c2.2 0 4 1.8 4 4v8" />
                <path d="M7 8V5c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v3" />
              </svg>
              <span>Focus Log Summary</span>
            </h3>
            
            <div style="max-height: 180px; overflow-y: auto; display:flex; flex-direction:column; gap:8px;">
              ${pomoLogs.length === 0 ? `
                <div class="empty-state" style="padding: 12px;">No sessions completed today. Let's record your first focus interval!</div>
              ` : pomoLogs.slice().reverse().map(log => `
                <div class="agenda-item" style="border-left-color: ${log.type === 'focus' ? 'var(--color-pomodoro)' : 'var(--color-flashcards)'}; padding: 8px 12px; font-size:0.8rem;">
                  <div>
                    <span style="font-weight:600;">${log.taskName}</span>
                    <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">
                      ${new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • ${log.duration} min ${log.type}
                    </div>
                  </div>
                  <span style="color:var(--text-secondary); font-size:0.75rem;">✓ Saved</span>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

      </div>
    `;

    // Initialize references for background triggers
    elements.timeNumbers = document.getElementById('timer-time-text');
    elements.progressRing = document.getElementById('timer-stroke-progress');
    elements.phaseDisplay = document.getElementById('timer-phase-text');
    elements.btnPlay = document.getElementById('btn-timer-play');
    elements.btnPause = document.getElementById('btn-timer-pause');
    elements.btnReset = document.getElementById('btn-timer-reset');

    // Run active tasks syncing
    this.updateUI();

    // Reset rotation styling for animations
    if (elements.progressRing) {
      elements.progressRing.style.strokeDasharray = ringCircumference;
    }

    // --- SETUP VIEW ACTION HANDLERS ---
    
    // Mode Pills Switcher
    container.querySelectorAll('.timer-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = btn.getAttribute('data-mode');
        this.switchMode(mode);
        Sound.playClick();
      });
    });

    // Timer control buttons
    elements.btnPlay.addEventListener('click', () => {
      timerState = 'running';
      this.updateUI();
      this.updatePomoBadge();
      Sound.playClick();
    });

    elements.btnPause.addEventListener('click', () => {
      timerState = 'paused';
      this.updateUI();
      this.updatePomoBadge();
      Sound.playClick();
    });

    elements.btnReset.addEventListener('click', () => {
      timerState = 'idle';
      const settings = State.getPomodoroSettings();
      timeLeft = settings[activeMode] * 60;
      totalDuration = settings[activeMode] * 60;
      this.updateUI();
      this.updatePomoBadge();
      Sound.playClick();
    });

    elements.btnSkip.addEventListener('click', () => {
      // Toggle Focus -> Short Break -> Focus
      if (activeMode === 'focus') {
        this.switchMode('short');
      } else {
        this.switchMode('focus');
      }
      Sound.playClick();
    });

    // Skip alias mapper
    elements.btnSkip = document.getElementById('btn-timer-skip');
    elements.btnSkip.addEventListener('click', () => {
      if (activeMode === 'focus') {
        this.switchMode('short');
      } else {
        this.switchMode('focus');
      }
      Sound.playClick();
    });

    // Save timer settings
    const settingsForm = document.getElementById('pomo-settings-form');
    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = parseInt(document.getElementById('pomo-set-focus').value) || 25;
      const s = parseInt(document.getElementById('pomo-set-short').value) || 5;
      const l = parseInt(document.getElementById('pomo-set-long').value) || 15;
      
      State.savePomodoroSettings({ focus: f, short: s, long: l });
      Sound.playClick();
      showToast('Settings Saved', 'Pomodoro timers updated successfully!', 'planner');
      
      // Update timer settings
      this.switchMode(activeMode);
    });
  }
};
