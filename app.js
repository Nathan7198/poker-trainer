/* GOLD Poker Trainer v2 - keeps old look, adds difficulty, table size, XP, ranges */

const STORAGE_KEY = "goldPokerTrainer_v2";

let app = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  mode: "cash",
  section: "preflop",
  difficulty: "intermediate",
  tableSize: "6",
  xp: 0,
  level: 1,
  current: null,
  shownIds: [],
  stats: {
    cash: { hands: 0, correct: 0, streak: 0, best: 0, leaks: {} },
    tournament: { hands: 0, correct: 0, streak: 0, best: 0, leaks: {} }
  }
};

const positionsByTable = {
  "3": ["BTN", "SB", "BB"],
  "6": ["UTG", "HJ", "CO", "BTN", "SB", "BB"],
  "9": ["UTG", "UTG+1", "UTG+2", "LJ", "HJ", "CO", "BTN", "SB", "BB"]
};

const hands = {
  premium: ["AA", "KK", "QQ", "AKs", "AKo"],
  strong: ["JJ", "TT", "AQs", "AQo", "AJs", "KQs"],
  medium: ["99", "88", "77", "ATs", "KJs", "QJs", "JTs"],
  speculative: ["66", "55", "44", "A5s", "KTs", "T9s", "98s", "87s", "76s"],
  weak: ["K7o", "Q8o", "J6o", "T4s", "93o", "72o"]
};

const boards = {
  dry: ["K♦ 8♣ 3♠", "A♣ 7♦ 2♥", "Q♠ 6♣ 2♦", "J♥ 5♠ 2♣"],
  wet: ["K♦ Q♦ 9♣", "Q♠ J♠ 8♥", "J♦ T♦ 7♣", "A♠ T♠ 9♦"],
  drawHeavy: ["9♠ 8♠ 6♦", "T♦ 9♦ 7♣", "J♣ T♣ 8♥", "8♥ 7♥ 5♠"],
  scaryRiver: ["Q♠ 9♣ 8♣ 7♥ J♣", "K♦ T♦ 6♠ 9♦ 2♦", "A♣ J♠ 7♠ T♠ 4♠"]
};

const ranges6 = {
  UTG: "77+, AJs+, KQs, AQo+",
  HJ: "55+, ATs+, KJs+, QJs, JTs, AQo+, KQo",
  CO: "44+, A8s+, KTs+, QTs+, JTs, T9s, AJo+, KQo",
  BTN: "22+, A2s+, K7s+, Q8s+, J8s+, T8s+, 98s, A8o+, KTo+, QTo+, JTo",
  SB: "22+, A2s+, K8s+, Q9s+, J9s+, T9s, A9o+, KTo+, QTo+",
  BB: "Defend wider versus small opens. 3-bet strong hands and suited blockers."
};

const ranges9 = {
  UTG: "88+, AQs+, AK",
  "UTG+1": "77+, AJs+, KQs, AQo+",
  "UTG+2": "66+, ATs+, KQs, AQo+",
  LJ: "55+, ATs+, KJs+, QJs, JTs, AQo+, KQo",
  HJ: "44+, A9s+, KTs+, QTs+, JTs, AJo+, KQo",
  CO: "33+, A7s+, K9s+, Q9s+, J9s+, T9s, ATo+, KJo+",
  BTN: "22+, A2s+, K6s+, Q8s+, J8s+, T8s+, 98s, A7o+, KTo+, QTo+, JTo",
  SB: "22+, A2s+, K8s+, Q9s+, J9s+, T9s, A9o+, KTo+",
  BB: "Defend based on open size. Wider versus button, tighter versus early position."
};

const leakTypes = [
  "Too passive preflop",
  "Overfolding big blind",
  "Missing profitable jams",
  "Missing value bets",
  "Poor bet sizing",
  "Overcalling rivers",
  "Calling too light in tournaments",
  "Ignoring board texture"
];

function save() {
  app.level = Math.floor(app.xp / 100) + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(app));
}

function stat() {
  return app.stats[app.mode];
}

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function uniqueId(parts) {
  return parts.join("_").replace(/\s+/g, "");
}

function positions() {
  return positionsByTable[app.tableSize] || positionsByTable["6"];
}

function pickLeakFocus() {
  const leaks = stat().leaks;
  const entries = Object.entries(leaks);

  if (!entries.length || Math.random() < 0.35) return rand(leakTypes);

  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function stackDepth() {
  if (app.mode === "cash") {
    if (app.difficulty === "beginner") return rand([80, 100]);
    if (app.difficulty === "advanced") return rand([100, 150, 200]);
    return rand([80, 100, 120, 150]);
  }

  if (app.difficulty === "beginner") return rand([8, 10, 12, 15]);
  if (app.difficulty === "advanced") return rand([12, 18, 25, 35, 45]);
  return rand([10, 15, 20, 25, 30]);
}

function generatePreflop() {
  const stack = stackDepth();
  const position = rand(positions());
  const leak = pickLeakFocus();
  let hand, spot, correct, explanation, options;

  options = ["Fold", "Call", "Raise", "3-bet", "All-in"];

  if (leak === "Missing profitable jams" && app.mode === "tournament" && stack <= 15) {
    hand = rand([...hands.strong, ...hands.medium]);
    spot = `Tournament, ${app.tableSize}-max, ${position}, ${stack}bb effective. Action folds to you.`;
    correct = "All-in";
    explanation = `${hand} is strong enough to shove at ${stack}bb. Short stacks benefit from fold equity.`;
  } else if (position === "BB") {
    hand = rand([...hands.medium, ...hands.speculative]);
    spot = `${app.mode} game, ${app.tableSize}-max, Big Blind, ${stack}bb effective. Button raises.`;
    correct = "Call";
    explanation = `${hand} is often good enough to defend versus a Button open. Folding too much in the BB is a leak.`;
  } else if (["BTN", "CO", "HJ"].includes(position)) {
    hand = rand([...hands.strong, ...hands.medium, ...hands.speculative]);
    spot = `${app.mode} game, ${app.tableSize}-max, ${position}, ${stack}bb effective. Folds to you.`;
    correct = "Raise";
    explanation = `${hand} should usually be opened from ${position}. You want initiative and fold equity.`;
  } else {
    hand = rand([...hands.premium, ...hands.strong, ...hands.medium, ...hands.weak]);
    spot = `${app.mode} game, ${app.tableSize}-max, ${position}, ${stack}bb effective. Folds to you.`;
    correct = hands.premium.includes(hand) || hands.strong.includes(hand) ? "Raise" : "Fold";
    explanation = correct === "Raise"
      ? `${hand} is strong enough to open from ${position}.`
      : `${hand} is too loose from early position. Fold and avoid dominated spots.`;
  }

  return {
    id: uniqueId(["preflop", app.mode, app.difficulty, app.tableSize, position, stack, hand, correct, Math.random().toString(36).slice(2, 8)]),
    title: `${app.mode === "cash" ? "Cash" : "Tournament"} Preflop Decision`,
    type: "preflop",
    hand,
    spot,
    options,
    correct,
    leak,
    explanation
  };
}

function generatePostflop() {
  const leak = pickLeakFocus();
  const stack = stackDepth();
  const pot = rand([6.5, 8, 10, 12, 16, 24, 38]);
  const openSize = app.mode === "cash" ? rand([2.5, 3]) : rand([2, 2.2, 2.5]);
  const caller = rand(["BB calls", "BTN calls", "CO calls", "SB calls"]);
  const hand = rand(["A♠ K♠", "A♦ Q♦", "K♣ Q♣", "Q♠ J♠", "J♦ T♦", "9♠ 9♦"]);
  let board, street, action, legal, bestAction, idealBet, minBet, maxBet, explanation;

  if (leak === "Missing value bets") {
    board = rand(boards.dry);
    street = "Flop";
    legal = ["check", "bet"];
    bestAction = "bet";
    idealBet = Math.round(pot * 0.55 * 2) / 2;
    minBet = Math.round(pot * 0.35 * 2) / 2;
    maxBet = Math.round(pot * 0.8 * 2) / 2;
    explanation = "You have a strong value hand on a fairly safe board. Betting builds the pot and charges worse hands.";
  } else if (leak === "Overcalling rivers" || leak === "Calling too light in tournaments") {
    board = rand(boards.scaryRiver);
    street = "River";
    legal = ["fold", "call", "raise"];
    bestAction = "fold";
    explanation = "This river completes too many straights and flushes. One pair or a marginal made hand should usually fold.";
  } else if (leak === "Poor bet sizing") {
    board = rand(boards.wet);
    street = "Flop";
    legal = ["check", "bet"];
    bestAction = "bet";
    idealBet = Math.round(pot * 0.75 * 2) / 2;
    minBet = Math.round(pot * 0.55 * 2) / 2;
    maxBet = Math.round(pot * 0.95 * 2) / 2;
    explanation = "On wet boards, your bet should usually be larger. Small bets give draws too good a price.";
  } else {
    board = rand(boards.drawHeavy);
    street = rand(["Flop", "Turn"]);
    legal = ["fold", "call", "raise"];
    bestAction = "call";
    explanation = "This is a medium-strength spot. Calling controls the pot while keeping worse hands and bluffs in.";
  }

  action = `
    Preflop: Hero opens to ${openSize}bb. ${caller}.<br>
    Pot going to flop: ${pot}bb.<br>
    Flop: ${board}.<br>
    ${street === "Flop" ? "Villain checks. Hero to act." : ""}
    ${street === "Turn" ? "Hero bets flop, villain calls. Turn is dealt. Villain now bets. Hero to act." : ""}
    ${street === "River" ? "Hero bet flop and turn. Villain calls. River completes draws and villain bets large. Hero to act." : ""}
  `;

  return {
    id: uniqueId(["postflop", app.mode, app.difficulty, app.tableSize, leak, hand, board, street, stack, pot, Math.random().toString(36).slice(2, 8)]),
    title: `${app.mode === "cash" ? "Cash" : "Tournament"} Postflop Scenario`,
    type: "postflop",
    hand,
    board,
    street,
    pot,
    stack,
    action,
    legal,
    bestAction,
    idealBet,
    minBet,
    maxBet,
    leak,
    explanation
  };
}

function generateUniqueQuestion() {
  let question;

  for (let i = 0; i < 100; i++) {
    question = app.section === "preflop" ? generatePreflop() : generatePostflop();

    if (!app.shownIds.includes(question.id)) {
      app.shownIds.push(question.id);
      save();
      return question;
    }
  }

  return question;
}

function newQuestion() {
  app.current = generateUniqueQuestion();
  save();
  render();
}

function selectMode(mode) {
  app.mode = mode;
  newQuestion();
}

function selectSection(section) {
  app.section = section;
  newQuestion();
}

function selectDifficulty(difficulty) {
  app.difficulty = difficulty;
  newQuestion();
}

function selectTableSize(size) {
  app.tableSize = size;
  newQuestion();
}

function answerPreflop(choice) {
  const s = stat();
  const correct = choice === app.current.correct;

  s.hands++;

  if (correct) {
    s.correct++;
    s.streak++;
    s.best = Math.max(s.best, s.streak);
    app.xp += 10;
  } else {
    s.streak = 0;
    s.leaks[app.current.leak] = (s.leaks[app.current.leak] || 0) + 1;
    app.xp += 2;
  }

  save();

  showResult(correct, `Correct answer: ${app.current.correct}`, app.current.explanation);
}

function answerPostflop(action) {
  const q = app.current;
  const betInput = document.getElementById("betSize");
  const betSize = betInput ? Number(betInput.value) : null;

  if (!q.legal.includes(action)) {
    showResult(false, "Illegal action", "That action is not available in this spot.");
    return;
  }

  if (action === "bet" || action === "raise") {
    if (!betSize || betSize <= 0) {
      showResult(false, "Enter a bet size", "You need to enter your bet size in big blinds.");
      return;
    }

    if (q.minBet && betSize < q.minBet) {
      recordMistake(q.leak);
      showResult(false, "Bet too small", `Better sizing is around ${q.idealBet}bb.`);
      return;
    }

    if (q.maxBet && betSize > q.maxBet) {
      recordMistake(q.leak);
      showResult(false, "Bet too large", `Better sizing is around ${q.idealBet}bb.`);
      return;
    }
  }

  const correct = action === q.bestAction;

  if (correct) {
    const s = stat();
    s.hands++;
    s.correct++;
    s.streak++;
    s.best = Math.max(s.best, s.streak);
    app.xp += 10;
  } else {
    recordMistake(q.leak);
    app.xp += 2;
  }

  save();

  showResult(
    correct,
    `Best action: ${q.bestAction.toUpperCase()}`,
    q.explanation + (q.idealBet ? ` Ideal size: about ${q.idealBet}bb.` : "")
  );
}

function recordMistake(leak) {
  const s = stat();
  s.hands++;
  s.streak = 0;
  s.leaks[leak] = (s.leaks[leak] || 0) + 1;
  save();
}

function showResult(correct, title, explanation) {
  document.getElementById("result").innerHTML = `
    <div class="${correct ? "correct" : "wrong"}">
      <h3>${correct ? "✅ Correct" : "❌ Not quite"}</h3>
      <p><strong>${title}</strong></p>
      <p>${explanation}</p>
      <button onclick="newQuestion()">Next hand</button>
    </div>
  `;

  renderStats();
}

function resetProgress() {
  if (confirm("Reset all stats and question history?")) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
}

function renderStats() {
  const s = stat();
  const accuracy = s.hands ? Math.round((s.correct / s.hands) * 100) : 0;
  const leaks = Object.entries(s.leaks).sort((a, b) => b[1] - a[1]);

  document.getElementById("stats").innerHTML = `
    <h3>${app.mode === "cash" ? "Cash Game" : "Tournament"} Stats</h3>
    <p><strong>Level:</strong> ${app.level}</p>
    <p><strong>XP:</strong> ${app.xp}</p>
    <p><strong>Hands:</strong> ${s.hands}</p>
    <p><strong>Accuracy:</strong> ${accuracy}%</p>
    <p><strong>Current streak:</strong> ${s.streak}</p>
    <p><strong>Best streak:</strong> ${s.best}</p>
    <p><strong>Unique questions shown:</strong> ${app.shownIds.length}</p>

    <h4>Common leaks</h4>
    ${
      leaks.length
        ? leaks.map(([leak, count]) => `<p>${leak}: ${count}</p>`).join("")
        : "<p>No leaks yet.</p>"
    }

    <button onclick="resetProgress()">Reset progress</button>
  `;
}

function renderRanges() {
  return `
    <div class="card">
      <h2>Starting hand ranges</h2>

      <h3>6-max</h3>
      ${Object.entries(ranges6).map(([pos, range]) => `<p><strong>${pos}:</strong> ${range}</p>`).join("")}

      <h3>9-max</h3>
      ${Object.entries(ranges9).map(([pos, range]) => `<p><strong>${pos}:</strong> ${range}</p>`).join("")}
    </div>
  `;
}

function render() {
  const q = app.current;
  const root = document.getElementById("app") || document.body;

  root.innerHTML = `
    <div class="trainer">
      <h1>Poker Edge Trainer</h1>

      <div class="tabs">
        <button onclick="selectMode('cash')" class="${app.mode === "cash" ? "active" : ""}">Cash Game</button>
        <button onclick="selectMode('tournament')" class="${app.mode === "tournament" ? "active" : ""}">Tournament</button>
      </div>

      <div class="tabs">
        <button onclick="selectSection('preflop')" class="${app.section === "preflop" ? "active" : ""}">Preflop</button>
        <button onclick="selectSection('postflop')" class="${app.section === "postflop" ? "active" : ""}">Postflop</button>
      </div>

      <div class="tabs">
        <button onclick="selectDifficulty('beginner')" class="${app.difficulty === "beginner" ? "active" : ""}">Beginner</button>
        <button onclick="selectDifficulty('intermediate')" class="${app.difficulty === "intermediate" ? "active" : ""}">Intermediate</button>
        <button onclick="selectDifficulty('advanced')" class="${app.difficulty === "advanced" ? "active" : ""}">Advanced</button>
      </div>

      <div class="tabs">
        <button onclick="selectTableSize('3')" class="${app.tableSize === "3" ? "active" : ""}">3-max</button>
        <button onclick="selectTableSize('6')" class="${app.tableSize === "6" ? "active" : ""}">6-max</button>
        <button onclick="selectTableSize('9')" class="${app.tableSize === "9" ? "active" : ""}">9-max</button>
      </div>

      <div class="card">
        <h2>${q.title}</h2>
        <p><strong>Difficulty:</strong> ${app.difficulty}</p>
        <p><strong>Table:</strong> ${app.tableSize}-max</p>
        <p><strong>Your hand:</strong> ${q.hand}</p>

        ${
          q.type === "preflop"
            ? `
              <p><strong>Spot:</strong> ${q.spot}</p>
              ${q.options.map(option => `<button onclick="answerPreflop('${option}')">${option}</button>`).join("")}
            `
            : `
              <p><strong>Board:</strong> ${q.board}</p>
              <p><strong>Street:</strong> ${q.street}</p>
              <p><strong>Pot:</strong> ${q.pot}bb</p>
              <p><strong>Your stack:</strong> ${q.stack}bb</p>
              <p><strong>Full action:</strong><br>${q.action}</p>

              <div class="actions">
                ${q.legal.includes("fold") ? `<button onclick="answerPostflop('fold')">Fold</button>` : ""}
                ${q.legal.includes("check") ? `<button onclick="answerPostflop('check')">Check</button>` : ""}
                ${q.legal.includes("call") ? `<button onclick="answerPostflop('call')">Call</button>` : ""}
                ${q.legal.includes("bet") ? `<button onclick="answerPostflop('bet')">Bet</button>` : ""}
                ${q.legal.includes("raise") ? `<button onclick="answerPostflop('raise')">Raise</button>` : ""}
              </div>

              ${
                q.legal.includes("bet") || q.legal.includes("raise")
                  ? `<input id="betSize" type="number" step="0.5" placeholder="Enter bet size in bb">`
                  : ""
              }
            `
        }

        <div id="result"></div>
      </div>

      <div id="stats"></div>

      ${renderRanges()}
    </div>
  `;

  renderStats();
}

document.addEventListener("DOMContentLoaded", () => {
  newQuestion();
});
