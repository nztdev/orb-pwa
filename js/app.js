import { VisualEngine } from './visualEngine.js';
import { AudioEngine } from './audioEngine.js';

// ---- State ----
const state = {
  screen: 'welcome',
  screening: null,       // raw answers
  routing: null,         // 'standard' | 'gentle' | 'not-now'
  duration: 6,           // minutes
  depth: 2,              // 1-3, capped to 1 if gentle routing
  tone: 'low',           // 'low' | 'mid' | 'none'
  sessionTimer: null,
  sessionSecondsLeft: 0,
};

const screens = document.querySelectorAll('.screen');
const groundBtn = document.getElementById('ground-now');

let visual, audio;

function initEngines() {
  const canvas = document.getElementById('orb-canvas');
  visual = new VisualEngine(canvas);
  audio = new AudioEngine();
}

function showScreen(name) {
  screens.forEach(s => {
    const active = s.dataset.screen === name;
    s.setAttribute('aria-hidden', active ? 'false' : 'true');
  });
  state.screen = name;
  groundBtn.classList.toggle('hidden', name !== 'session');
}

// ---- Screening logic ----
// Routes to 'standard', 'gentle' (reduced/static visuals, no intensity choice),
// or 'not-now' (session withheld, supportive message + resources instead).
function evaluateScreening(answers) {
  if (answers.psychosis === 'yes' || answers.dpdr === 'yes' || answers.stable === 'no') {
    return 'not-now';
  }
  if (answers.epilepsy === 'yes' || answers.epilepsy === 'unsure') {
    return 'gentle';
  }
  return 'standard';
}

function renderScreeningResult(routing) {
  const heading = document.getElementById('result-heading');
  const body = document.getElementById('result-body');
  const actions = document.getElementById('result-actions');
  actions.innerHTML = '';

  if (routing === 'standard') {
    heading.textContent = 'You\u2019re a good fit for the full session';
    body.textContent = 'Nothing you shared rules anything out. You\u2019ll still be able to adjust length, visual depth, and sound before it starts.';
    const cont = document.createElement('button');
    cont.className = 'btn btn--primary';
    cont.textContent = 'Continue to consent';
    cont.onclick = () => showScreen('consent');
    const back = document.createElement('button');
    back.className = 'btn btn--ghost';
    back.textContent = 'Back';
    back.onclick = () => showScreen('screening');
    actions.append(back, cont);
  } else if (routing === 'gentle') {
    heading.textContent = 'Let\u2019s use the gentle version';
    body.textContent = 'Because of what you shared about seizures, we\u2019ll keep visuals still rather than moving, and skip the depth setting entirely. Everything else works the same. If you haven\u2019t discussed this kind of practice with a doctor before, it\u2019s worth a quick check-in first.';
    state.depth = 1;
    const cont = document.createElement('button');
    cont.className = 'btn btn--primary';
    cont.textContent = 'Continue to consent';
    cont.onclick = () => showScreen('consent');
    const back = document.createElement('button');
    back.className = 'btn btn--ghost';
    back.textContent = 'Back';
    back.onclick = () => showScreen('screening');
    actions.append(back, cont);
  } else {
    heading.textContent = 'Let\u2019s hold off on this for now';
    body.textContent = 'Based on what you shared, this particular practice isn\u2019t the right fit today \u2014 not as a judgment, just a precaution. If you\u2019re in crisis or need to talk to someone, please reach out to a crisis line or a professional you trust. You\u2019re welcome to come back another time.';
    const back = document.createElement('button');
    back.className = 'btn btn--ghost';
    back.textContent = 'Return home';
    back.onclick = () => showScreen('welcome');
    actions.append(back);
  }

  state.routing = routing;
  showScreen('screening-result');
}

// ---- Consent gating ----
function wireConsent() {
  const checklist = document.getElementById('consent-checklist');
  const beginBtn = document.getElementById('begin-session-btn');
  checklist.addEventListener('change', () => {
    const boxes = checklist.querySelectorAll('input[type="checkbox"]');
    const allChecked = Array.from(boxes).every(b => b.checked);
    beginBtn.disabled = !allChecked;
  });
}

// ---- Customize screen ----
function wireCustomize() {
  const durationInput = document.getElementById('duration');
  const durationValue = document.getElementById('duration-value');
  durationInput.addEventListener('input', () => {
    state.duration = parseInt(durationInput.value, 10);
    durationValue.textContent = `${state.duration} minute${state.duration === 1 ? '' : 's'}`;
  });

  const intensityInput = document.getElementById('intensity');
  const intensityValue = document.getElementById('intensity-value');
  const intensityLabels = { 1: 'Calm', 2: 'Balanced', 3: 'Deep' };
  intensityInput.addEventListener('input', () => {
    state.depth = parseInt(intensityInput.value, 10);
    intensityValue.textContent = intensityLabels[state.depth];
  });

  document.querySelectorAll('.tone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tone-btn').forEach(b => b.classList.remove('tone-btn--active'));
      btn.classList.add('tone-btn--active');
      state.tone = btn.dataset.tone;
    });
  });
}

function applyGentleModeToCustomizeUI() {
  const intensitySetting = document.getElementById('intensity').closest('.setting');
  if (state.routing === 'gentle') {
    intensitySetting.style.display = 'none';
  } else {
    intensitySetting.style.display = '';
  }
}

// ---- Session ----
const PROMPTS = [
  'Settle in. Notice your breath, without changing it.',
  'Let your attention rest wherever it wants to.',
  'Notice the edges of things softening, or not \u2014 either is fine.',
  'You don\u2019t need to hold on to this moment. Just be in it.',
  'If a thought arrives, let it pass through. No need to follow it.',
  'Notice the space around your thoughts, more than the thoughts themselves.',
];

function startSession() {
  state.sessionSecondsLeft = state.duration * 60;
  visual.setDepth(state.routing === 'gentle' ? 1 : state.depth);
  audio.setMode(state.tone);
  audio.start();

  updateTimerDisplay();
  showScreen('session'); // must happen before cyclePrompt() — it gates on state.screen
  cyclePrompt(0);

  state.sessionTimer = setInterval(() => {
    state.sessionSecondsLeft -= 1;
    updateTimerDisplay();
    if (state.sessionSecondsLeft <= 0) {
      endSession(false);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(state.sessionSecondsLeft / 60);
  const s = state.sessionSecondsLeft % 60;
  document.getElementById('session-timer').textContent =
    `${m}:${s.toString().padStart(2, '0')}`;
}

function cyclePrompt(index) {
  const el = document.getElementById('session-prompt');
  if (state.screen !== 'session') return;
  el.style.opacity = 0;
  setTimeout(() => {
    if (state.screen !== 'session') return;
    el.textContent = PROMPTS[index % PROMPTS.length];
    el.style.opacity = 1;
  }, 800);
  const next = index + 1;
  const delay = 20000 + Math.random() * 6000;
  const handle = setTimeout(() => cyclePrompt(next), delay);
  state._promptHandle = handle;
}

function endSession(interrupted) {
  clearInterval(state.sessionTimer);
  clearTimeout(state._promptHandle);
  audio.stop();

  const groundingText = document.getElementById('grounding-text');
  groundingText.textContent = interrupted
    ? 'That\u2019s okay \u2014 stopping whenever you want is exactly how this should work. Take a breath, and take your time.'
    : 'Name three things you can see. Feel your feet on the floor. Take one slower breath out.';

  showScreen('grounding');
}

// ---- Wiring ----
function wireNavButtons() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'go-welcome') showScreen('welcome');
      else if (action === 'go-disclosure') showScreen('disclosure');
      else if (action === 'go-screening') showScreen('screening');
      else if (action === 'go-consent') showScreen('consent');
      else if (action === 'go-customize') {
        applyGentleModeToCustomizeUI();
        showScreen('customize');
      }
      else if (action === 'go-session') startSession();
    });
  });

  document.getElementById('screening-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const answers = Object.fromEntries(data.entries());
    state.screening = answers;
    const routing = evaluateScreening(answers);
    renderScreeningResult(routing);
  });

  groundBtn.addEventListener('click', () => endSession(true));
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  initEngines();
  wireConsent();
  wireCustomize();
  wireNavButtons();
  showScreen('welcome');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
