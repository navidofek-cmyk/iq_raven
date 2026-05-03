// Test engine — manages questions, scoring, timing

const TOTAL_QUESTIONS = 12;
const TIME_PER_Q = 30; // seconds

// difficulty ramp: questions 1-4 → 1, 5-8 → 2, 9-12 → 3
function getDifficulty(qIndex) {
  if (qIndex < 4) return 1;
  if (qIndex < 8) return 2;
  return 3;
}

const state = {
  questions:    [],   // array of { matrix, correctCell, choices, correctIndex }
  current:      0,
  answers:      [],   // true/false per question
  timings:      [],   // seconds taken per question
  timerHandle:  null,
  secondsLeft:  TIME_PER_Q,
  onTick:       null, // callback(secondsLeft)
  onEnd:        null, // callback()
};

function buildQuestion(qIndex) {
  const difficulty = getDifficulty(qIndex);
  const matrix = generatePuzzle(difficulty);
  const correctCell = matrix[2][2];
  const choices = generateChoices(correctCell, difficulty);
  const correctIndex = choices.findIndex(c =>
    c.shape === correctCell.shape &&
    c.fill  === correctCell.fill  &&
    c.size  === correctCell.size  &&
    c.color === correctCell.color &&
    (c.rotation || 0) === (correctCell.rotation || 0)
  );
  return { matrix, correctCell, choices, correctIndex };
}

function initTest() {
  state.questions = [];
  state.answers   = [];
  state.timings   = [];
  state.current   = 0;

  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    state.questions.push(buildQuestion(i));
  }
}

function startTimer(onTick, onTimeout) {
  clearInterval(state.timerHandle);
  state.secondsLeft = TIME_PER_Q;
  state.onTick = onTick;

  state.timerHandle = setInterval(() => {
    state.secondsLeft--;
    onTick(state.secondsLeft);
    if (state.secondsLeft <= 0) {
      clearInterval(state.timerHandle);
      onTimeout();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerHandle);
}

// Call when user picks an answer (answerIndex = -1 means timeout/skip)
function submitAnswer(answerIndex) {
  stopTimer();
  const q = state.questions[state.current];
  const timeTaken = TIME_PER_Q - state.secondsLeft;
  const correct = answerIndex === q.correctIndex;
  state.answers.push(correct);
  state.timings.push(timeTaken);
  return { correct, correctIndex: q.correctIndex };
}

function nextQuestion() {
  state.current++;
  return state.current < TOTAL_QUESTIONS;
}

// ── Scoring ──────────────────────────────────────────────────────────────────

function calcResults() {
  const correct = state.answers.filter(Boolean).length;
  const total   = TOTAL_QUESTIONS;
  const pct     = correct / total;

  // Rough IQ estimate: mean 100, sd ~15
  // Map 0%→60, 50%→100, 100%→140 with slight curve
  const iq = Math.round(60 + pct * 80 + (pct > 0.5 ? (pct - 0.5) * 20 : 0));

  // Percentile lookup (approximate normal distribution)
  const percentile = iqToPercentile(iq);

  const avgTime = state.timings.length
    ? Math.round(state.timings.reduce((a, b) => a + b, 0) / state.timings.length)
    : 0;

  return { correct, total, iq, percentile, avgTime };
}

function iqToPercentile(iq) {
  // Approximate percentile from IQ (mean 100, sd 15)
  const table = [
    [70, 2], [75, 5], [80, 9], [85, 16], [90, 25], [95, 37],
    [100, 50], [105, 63], [110, 75], [115, 84], [120, 91],
    [125, 95], [130, 98], [135, 99], [140, 99.6],
  ];
  for (let i = table.length - 1; i >= 0; i--) {
    if (iq >= table[i][0]) return table[i][1];
  }
  return 1;
}
