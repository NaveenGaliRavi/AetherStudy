# AetherStudy — Premium Study Suite & Spaced Repetition Suite

**AetherStudy** is a visually stunning, glassmorphic single-page web application (SPA) designed to optimize student focus and information retention. Developed as a Capstone project, this application synthesizes multiple productivity frameworks—specifically the **Pomodoro Technique**, **Active Recall Testing**, and the **Leitner Spaced Repetition System**—into a single unified dashboard interface.

---

## 🌌 Project Overview

Modern learners struggle with distraction and cognitive overload. **AetherStudy** solves this by providing a distraction-free, aesthetically premium cockpit containing all necessary study utilities.

### Objective
To build an integrated, responsive study ecosystem that guides the user from **task planning (Planner)** to **timed deep work (Pomodoro)**, followed by **knowledge consolidation (Flashcards)** and **knowledge validation (Quizzes)**, utilizing native browser capabilities (Web Audio, LocalStorage, Web Notifications).

---

## 🛠️ Core Feature Modules

### 1. Unified Dashboard
*   **Progress Analytics**: Visualizes daily task completion ratio using a dynamic **SVG Circular Gauge**.
*   **System Synchronizer**: Keeps a running, 1-second system clock and displays statistics of total focus sessions, quiz alerts, and cards due today.
*   **Study Agenda**: Filters high-priority items and links them directly to the timer focus panel.
*   **Motivational Module**: Implements quote rotation engine to combat study fatigue.

### 2. Hierarchical Study Planner (Todo List)
*   **Categorization**: Organizes study materials by subjects (e.g. Physics, Math, Chemistry) with custom subject generators.
*   **Relative Deadlines**: Calculates days remaining or overdue periods using dynamic date-math formulas.
*   **Pomodoro Linkage**: Displays focus count chimes (`🍅`) next to tasks and lets users trigger immediate timer sessions linked to specific tasks.

### 3. Background-Persistent Pomodoro Timer
*   **Task Association**: Selects a task from the planner and logs completed focus counts directly against that task.
*   **Persistent Clock**: Utilizes a singleton state ticker that runs in the background and keeps ticking, updating navigation badges even when navigating other views.
*   **Web Audio Synth**: Creates high-frequency chime bells and low-frequency chords using **Web Audio API Oscillators** to alert users at interval ends without relying on heavy external audio files.

### 4. Spaced Repetition Flashcards (Leitner System)
*   **3D Card Flipping**: Creates a tactile flipping motion utilizing CSS3 3D transformations (`preserve-3d`, `rotateY`).
*   **Leitner Algorithm**: Implements a 3-box Leitner scheduling system.
    *   *Easy* responses promote cards to Box 3 (delayed reviews).
    *   *Medium* responses retain cards in their active box.
    *   *Hard* responses drop cards back to Box 1 (daily reviews).

### 5. Reminder Quiz Maker & Player
*   **Dynamic Editor**: Allows users to build multiple-choice or true/false question banks.
*   **Alert Engine**: Compares client times against quiz schedules to pop up modal reminder triggers and trigger chime notifications.
*   **Satisfying Interactive Player**: Reveals immediate correct (emerald green) or incorrect (ruby red) button feedback upon clicking options.

---

## 📐 System Architecture & Data Flow

```mermaid
graph TD
    A[index.html / main.js Router] -->|Loads View| B(Dashboard View)
    A -->|Loads View| C(Planner View)
    A -->|Loads View| D(Pomodoro View)
    A -->|Loads View| E(Flashcards View)
    A -->|Loads View| F(Quizzes View)

    subgraph Central State Manager (state.js)
        LS[(LocalStorage)] <--> S[State Object]
    end

    C -->|Creates / Toggles Tasks| S
    D -->|Increments Pomo Count / Logs Session| S
    E -->|Updates Leitner NextReview Timestamps| S
    F -->|Saves Quiz Scores / History| S

    S -->|Triggers UI Badges / Renders Updates| A
```

---

## 💻 Tech Stack & Design System

*   **Core Logic**: Pure ES6+ JavaScript modules (Vanilla JS) ensuring fast performance.
*   **Styling**: Vanilla CSS3 custom properties with high-end dark mode aesthetics, `backdrop-filter` glassmorphic cards, custom keyframe pulsing animations, and thin luminous borders.
*   **Asset Synthesis**: Native **Web Audio API** (synth chimes) and standard HTML5 Canvas/SVGs.
*   **Build System**: Pinned **Vite v4.5.3** (ensuring perfect compatibility with Node.js v16.14.0).

---

## 🚀 Installation & Running

### Requirements
*   **Node.js**: v16.14.0 or newer
*   **NPM**: v8.3.0 or newer

### Setup Steps
1.  **Clone or Open project directory**:
    ```bash
    cd 'path_to_clone'
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Start local development server**:
    ```bash
    npm run dev
    ```
    The application will launch on: **`http://localhost:3000/`**

4.  **Build production package**:
    ```bash
    npm run build
    ```
    Static bundle will output to the `/dist` directory.
