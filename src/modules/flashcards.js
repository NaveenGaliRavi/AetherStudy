/* ----------------------------------------------------
   AetherStudy Flashcards Module
   ---------------------------------------------------- */

import { State } from '../state.js';
import { Sound, showToast } from '../utils.js';

let viewMode = 'index'; // 'index', 'studio', 'study'
let selectedDeck = null; // Current deck object being studied or managed

// Study Flow States
let studyQueue = []; // Cards due for study
let studyIdx = 0; // Index of active card in studyQueue
let isCardFlipped = false; // State of card rotation

export const Flashcards = {
  render(container) {
    if (viewMode === 'index') {
      this.renderIndex(container);
    } else if (viewMode === 'studio') {
      this.renderStudio(container);
    } else if (viewMode === 'study') {
      this.renderStudy(container);
    }
  },

  // --- 1. DECK DIRECTORY VIEW ---
  renderIndex(container) {
    const decks = State.getDecks();
    const now = Date.now();

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 style="font-family:'Outfit'; font-size:1.3rem; font-weight:700;">My Study Decks</h2>
        <button class="btn btn-primary" id="btn-create-deck-trigger">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Create New Deck</span>
        </button>
      </div>

      <div class="deck-grid">
        ${decks.length === 0 ? `
          <div class="glass-card empty-state" style="grid-column: 1/-1; padding: 48px;">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin-bottom:12px;">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9"/>
            </svg>
            <div>No study decks created yet. Add a new deck to start memorizing!</div>
          </div>
        ` : decks.map(deck => {
          // Count cards due today
          const dueToday = deck.cards.filter(c => !c.nextReview || c.nextReview <= now).length;
          
          return `
            <div class="glass-card deck-card glass-card-hover">
              <div>
                <h3 class="deck-title">${deck.name}</h3>
                <span class="deck-count">${deck.cards.length} cards total</span>
                ${dueToday > 0 
                  ? `<div style="font-size:0.75rem; color:var(--color-flashcards); font-weight:600; margin-top:8px;">🔥 ${dueToday} cards due for review</div>`
                  : `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px;">✓ All caught up!</div>`
                }
              </div>

              <div class="deck-actions">
                <button class="btn btn-primary start-study-btn" data-id="${deck.id}" style="padding: 6px 14px; font-size:0.8rem; flex-grow:1; justify-content:center;" ${deck.cards.length === 0 ? 'disabled' : ''}>
                  Review Deck
                </button>
                <button class="btn btn-secondary manage-deck-btn" data-id="${deck.id}" style="padding: 6px 10px;" title="Manage Cards">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                </button>
                <button class="btn btn-danger delete-deck-btn" data-id="${deck.id}" style="padding: 6px 10px;" title="Delete Deck">
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
    const triggerBtn = document.getElementById('btn-create-deck-trigger');
    if (triggerBtn) {
      triggerBtn.addEventListener('click', () => {
        const name = prompt("Enter a name for your new study deck:");
        if (name && name.trim()) {
          State.saveDeck(name.trim());
          Sound.playClick();
          this.render(container);
        }
      });
    }

    container.querySelectorAll('.start-study-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const deck = decks.find(d => d.id === id);
        if (deck && deck.cards.length > 0) {
          // Prepare queue of cards that are due for review
          const timeNow = Date.now();
          // Filter cards due or show all cards if user explicitly wants to review
          studyQueue = deck.cards.filter(c => !c.nextReview || c.nextReview <= timeNow);
          
          if (studyQueue.length === 0) {
            if (confirm("You have no reviews due today for this deck. Would you like to review all cards anyway?")) {
              studyQueue = [...deck.cards];
            } else {
              return;
            }
          }

          selectedDeck = deck;
          studyIdx = 0;
          isCardFlipped = false;
          viewMode = 'study';
          
          Sound.playClick();
          this.render(container);
        }
      });
    });

    container.querySelectorAll('.manage-deck-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const deck = decks.find(d => d.id === id);
        if (deck) {
          selectedDeck = deck;
          viewMode = 'studio';
          Sound.playClick();
          this.render(container);
        }
      });
    });

    container.querySelectorAll('.delete-deck-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm("Delete this deck and all of its flashcards permanently?")) {
          State.deleteDeck(id);
          this.render(container);
        }
      });
    });
  },

  // --- 2. DECK CARDS STUDIO (MANAGE) ---
  renderStudio(container) {
    const decks = State.getDecks();
    // Refetch latest deck instance
    const deck = decks.find(d => d.id === selectedDeck.id) || selectedDeck;

    container.innerHTML = `
      <div style="margin-bottom:20px; display:flex; align-items:center; gap:12px;">
        <button class="btn btn-secondary btn-icon" id="btn-back-decks" title="Back to Decks">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 style="font-family:'Outfit'; font-size:1.3rem; font-weight:700;">Manage Deck: ${deck.name}</h2>
      </div>

      <div class="planner-layout">
        
        <!-- Left: Current cards list -->
        <div class="glass-card" style="max-height: 480px; overflow-y: auto;">
          <h3 style="font-size:1rem; font-weight:700; margin-bottom:14px;">Cards inside this deck (${deck.cards.length})</h3>
          
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${deck.cards.length === 0 ? `
              <div class="empty-state">This deck is empty. Add a flashcard on the right.</div>
            ` : deck.cards.map((card, index) => `
              <div class="agenda-item" style="border-left-color: var(--color-flashcards); padding:12px;">
                <div style="flex-grow:1; padding-right:12px;">
                  <div style="font-weight:600; font-size:0.85rem; color:var(--text-primary); margin-bottom:4px;">Q: ${card.front}</div>
                  <div style="font-size:0.8rem; color:var(--text-secondary);">A: ${card.back}</div>
                  <span class="badge" style="position:static; display:inline-block; font-size:0.65rem; margin-top:8px; padding: 1px 6px;">Box ${card.box || 1}</span>
                </div>
                <button class="btn btn-secondary btn-icon delete-card-btn" data-id="${card.id}" title="Remove Card">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--priority-high)" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Right: Add card form -->
        <div class="glass-card">
          <h3 style="font-size:1rem; font-weight:700; margin-bottom:16px;">Add Flashcard</h3>
          
          <form id="add-card-form">
            <div class="form-group">
              <label class="form-label">Front Side (Question/Term)</label>
              <textarea id="card-front-input" class="form-input" placeholder="e.g. What is the derivative of sin(x)?" required style="min-height: 80px; resize: vertical; font-size: 0.85rem;"></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Back Side (Answer/Formula)</label>
              <textarea id="card-back-input" class="form-input" placeholder="e.g. cos(x)" required style="min-height: 80px; resize: vertical; font-size: 0.85rem;"></textarea>
            </div>

            <button type="submit" class="btn btn-primary" style="width:100%; margin-top:8px;">
              Save Flashcard
            </button>
          </form>
        </div>

      </div>
    `;

    // --- ATTACH STUDIO EVENTS ---
    document.getElementById('btn-back-decks').addEventListener('click', () => {
      viewMode = 'index';
      selectedDeck = null;
      this.render(container);
      Sound.playClick();
    });

    const addForm = document.getElementById('add-card-form');
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const front = document.getElementById('card-front-input').value.trim();
      const back = document.getElementById('card-back-input').value.trim();

      if (!front || !back) return;

      State.addCardToDeck(deck.id, front, back);
      Sound.playClick();
      showToast('Card Added', 'Flashcard inserted into deck successfully.', 'planner');

      this.render(container);
    });

    container.querySelectorAll('.delete-card-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cardId = e.currentTarget.getAttribute('data-id');
        State.deleteCardFromDeck(deck.id, cardId);
        this.render(container);
      });
    });
  },

  // --- 3. LEITNER STUDY PLAYER VIEW ---
  renderStudy(container) {
    const totalC = studyQueue.length;
    
    // Check if review finished
    if (studyIdx >= totalC) {
      this.renderStudySummary(container);
      return;
    }

    const card = studyQueue[studyIdx];
    isCardFlipped = false;

    container.innerHTML = `
      <div class="study-zone">
        
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; font-size:0.85rem; color:var(--text-secondary);">
          <span>Studying: ${selectedDeck.name}</span>
          <span style="font-family:'JetBrains Mono';">Card ${studyIdx + 1} of ${totalC}</span>
        </div>

        <div class="study-progress-bar">
          <div class="study-progress-fill" style="width: ${(studyIdx / totalC) * 100}%;"></div>
        </div>

        <!-- 3D Flippable Card Viewport -->
        <div class="card-viewport" id="card-viewport-click">
          <div class="flashcard-inner">
            
            <!-- Front of Card -->
            <div class="flashcard-front">
              <span class="card-hint">Question (Click to flip)</span>
              <div class="card-content" style="margin-top:auto; margin-bottom:auto;">
                ${card.front}
              </div>
              <span class="badge" style="position:static;">Box ${card.box || 1}</span>
            </div>

            <!-- Back of Card -->
            <div class="flashcard-back">
              <span class="card-hint">Answer (Click to flip)</span>
              <div class="card-content" style="margin-top:auto; margin-bottom:auto;">
                ${card.back}
              </div>
              <span class="badge" style="position:static; background:rgba(0, 242, 254, 0.15); color:var(--color-flashcards); border-color:rgba(0, 242, 254, 0.3);">
                Box ${card.box || 1}
              </span>
            </div>

          </div>
        </div>

        <!-- Feedback control grading options (only show when flipped) -->
        <div class="study-controls hidden" id="study-grade-controls">
          <button class="btn btn-secondary btn-leitner-1 grade-btn" data-rating="hard" style="flex-grow:1; justify-content:center;">
            Hard (Box 1)
          </button>
          <button class="btn btn-secondary btn-leitner-2 grade-btn" data-rating="medium" style="flex-grow:1; justify-content:center;">
            Medium (Same)
          </button>
          <button class="btn btn-secondary btn-leitner-3 grade-btn" data-rating="easy" style="flex-grow:1; justify-content:center;">
            Easy (Box +1)
          </button>
        </div>

        <!-- Footer helper text -->
        <p style="font-size:0.75rem; color:var(--text-muted); text-align:center; max-width:400px;" id="study-help-text">
          Read the question, recall the answer, then click the card to reveal the back.
        </p>

        <button class="btn btn-secondary" id="btn-quit-study" style="margin-top: 10px;">
          Quit Session
        </button>

      </div>
    `;

    // --- ATTACH STUDY EVENT LISTENERS ---
    const viewport = document.getElementById('card-viewport-click');
    const controls = document.getElementById('study-grade-controls');
    const helpText = document.getElementById('study-help-text');

    viewport.addEventListener('click', () => {
      isCardFlipped = !isCardFlipped;
      if (isCardFlipped) {
        viewport.classList.add('flipped');
        controls.classList.remove('hidden');
        helpText.textContent = "Rate your recall quality. Easy schedules cards further away; Hard schedules them immediately.";
      } else {
        viewport.classList.remove('flipped');
        controls.classList.add('hidden');
        helpText.textContent = "Read the question, recall the answer, then click the card to reveal the back.";
      }
      Sound.playClick();
    });

    // Rating buttons triggers
    container.querySelectorAll('.grade-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Prevent click bubbling to card flip
        e.stopPropagation();
        
        const rating = btn.getAttribute('data-rating');
        State.updateCardLeitner(selectedDeck.id, card.id, rating);
        Sound.playClick();

        // Load next card
        studyIdx++;
        this.render(container);
      });
    });

    document.getElementById('btn-quit-study').addEventListener('click', () => {
      if (confirm("Are you sure you want to stop this study session? Your progress on already answered cards is saved.")) {
        viewMode = 'index';
        selectedDeck = null;
        this.render(container);
        Sound.playClick();
      }
    });
  },

  renderStudySummary(container) {
    // Collect counts per box in current deck
    const decks = State.getDecks();
    const deck = decks.find(d => d.id === selectedDeck.id);
    
    const box1 = deck.cards.filter(c => c.box === 1).length;
    const box2 = deck.cards.filter(c => c.box === 2).length;
    const box3 = deck.cards.filter(c => c.box === 3).length;

    container.innerHTML = `
      <div class="glass-card text-center" style="max-width:500px; margin: 0 auto; width:100%; text-align:center; padding: 48px 32px;">
        <div class="alert-icon" style="background:rgba(0, 242, 254, 0.1); color:var(--color-flashcards); margin: 0 auto 20px auto; width:56px; height:56px;">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h3 style="font-family:'Outfit'; font-size:1.5rem; font-weight:800; margin-bottom:8px;">Deck Completed!</h3>
        <p style="color:var(--text-secondary); font-size:0.95rem; margin-bottom:28px;">Deck: "${selectedDeck.name}"</p>

        <!-- Box breakdown display -->
        <div style="display:flex; justify-content:space-around; align-items:center; margin-bottom:32px; background:rgba(0,0,0,0.15); padding:16px; border-radius:12px; border:1px solid var(--border-glass);">
          <div style="display:flex; flex-direction:column; align-items:center;">
            <span style="font-weight:700; font-size:1.4rem; color:var(--priority-high);">${box1}</span>
            <span style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Box 1 (Daily)</span>
          </div>
          <div style="display:flex; flex-direction:column; align-items:center;">
            <span style="font-weight:700; font-size:1.4rem; color:var(--priority-medium);">${box2}</span>
            <span style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Box 2 (2 Days)</span>
          </div>
          <div style="display:flex; flex-direction:column; align-items:center;">
            <span style="font-weight:700; font-size:1.4rem; color:var(--priority-low);">${box3}</span>
            <span style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Box 3 (5 Days)</span>
          </div>
        </div>

        <p style="color:var(--text-secondary); font-size:0.9rem; line-height:1.4; margin-bottom:24px;">
          Outstanding work. The Leitner algorithm has rescheduled cards based on your performance. Keep reviewing daily!
        </p>

        <button class="btn btn-primary" id="btn-flash-summary-done" style="padding:10px 24px;">
          Back to Decks
        </button>
      </div>
    `;

    document.getElementById('btn-flash-summary-done').addEventListener('click', () => {
      viewMode = 'index';
      selectedDeck = null;
      this.render(container);
      Sound.playClick();
    });
  }
};
