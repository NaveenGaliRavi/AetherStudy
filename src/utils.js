/* ----------------------------------------------------
   AetherStudy Core Utilities
   ---------------------------------------------------- */

// Web Audio API Audio Synthesizer
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const Sound = {
  // Satisfying synth bell chime for session completed
  playFocusComplete() {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Chime 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.1); // Slide up to A6
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.8);

      // Chime 2 (delayed slightly)
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
        osc2.frequency.exponentialRampToValueAtTime(2093, ctx.currentTime + 0.15); // Slide to C7
        gain2.gain.setValueAtTime(0.15, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 1.2);
      }, 150);

    } catch (e) {
      console.warn('Audio context playback failed:', e);
    }
  },

  // Relaxing chord for breaks
  playBreakComplete() {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Arpeggio notes: E5, G#5, B5, E6 (E Major chord)
      const notes = [659.25, 830.61, 987.77, 1318.51];
      
      notes.forEach((freq, idx) => {
        const delay = idx * 0.12;
        const noteTime = now + delay;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);
        
        gain.gain.setValueAtTime(0.0, noteTime);
        gain.gain.linearRampToValueAtTime(0.1, noteTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 1.0);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(noteTime);
        osc.stop(noteTime + 1.0);
      });
    } catch (e) {
      console.warn('Audio context playback failed:', e);
    }
  },

  // Soft subtle click sound for user interactions
  playClick() {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
      
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }
};

// Custom Floating UI Toast Notifications
export function showToast(title, message, type = 'pomodoro') {
  // Look for existing container or create it
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '24px';
    container.style.right = '24px';
    container.style.zIndex = '1000';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '12px';
    document.body.appendChild(container);
  }

  // Create Toast Element
  const toast = document.createElement('div');
  toast.className = `web-notification ${type}`;
  toast.style.width = '320px';
  toast.innerHTML = `
    <div class="notification-accent-bar"></div>
    <div style="flex-grow: 1;">
      <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 2px;">${title}</div>
      <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.3;">${message}</div>
    </div>
    <button class="btn-icon" style="align-self: flex-start; margin-top: -4px;" onclick="this.parentElement.remove()">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;

  container.appendChild(toast);

  // Play Sound on chime alert
  if (type === 'pomodoro') {
    Sound.playFocusComplete();
  } else if (type === 'quiz') {
    Sound.playBreakComplete();
  }

  // Auto remove toast after 5 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'slideIn 0.3s reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);

  // Native Browser Notification (Fallback / Multi-tasking support)
  if (Notification.permission === 'granted') {
    new Notification(title, { body: message });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body: message });
      }
    });
  }
}

// Format Seconds to MM:SS
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Calculate days remaining or display relative date
export function formatRelativeDate(dateString) {
  if (!dateString) return 'No due date';
  const target = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0,0,0,0);
  target.setHours(0,0,0,0);
  
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays === -1) return 'Overdue by 1 day';
  if (diffDays < -1) return `Overdue by ${Math.abs(diffDays)} days`;
  return `Due in ${diffDays} days`;
}
