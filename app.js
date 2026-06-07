let mode = "mixed";
let selected = null;
let current = null;
let answered = false;

let stats = JSON.parse(localStorage.getItem("pokerStats") || JSON.stringify({
  hands: 0,
  correct: 0,
  streak: 0,
  best: 0,
  xp: 0,
  leaks: {}
}));

let seenQuestions = JSON.parse(localStorage.getItem("seenQuestions") || "[]");

const positions = {
  3: ["BTN", "SB", "BB"],
  6: ["UTG", "HJ", "CO", "BTN", "SB", "BB"],
  9: ["UTG", "UTG+1", "UTG+2", "LJ", "HJ", "CO", "BTN", "SB", "BB"]
};

const hands = [
  "A♠ A♦", "K♠ K♥", "Q♠ Q♦", "J♠ J♣", "T♠ T♥", "9♠ 9♦", "8♣ 8♦", "7♠ 7♥",
  "A♠ K♠", "A♦ Q♦", "A♣ J♣", "A♥ T♥", "K♠ Q♠", "K♦ J♦", "Q♠ J♠", "J♥ T♥",
  "T♠ 9♠", "9♦ 8♦", "8♣ 7♣", "7♥ 6♥", "A♠ K♦", "A♣ Q♥", "A♦ J♣", "K♠ Q♦",
  "K♣ J♥", "Q♦ T♣", "J♣ 9♦", "A♠ 5♠", "A♥ 4♥", "K♠ 9♠", "Q♣ 8♣", "6♦ 6♣",
  "5♠ 5♦", "4♣ 4♥", "A♦ 7♣", "K♠ 4♠", "Q♥ 3♣", "J♦ 7♠", "9♣ 4♦"
];

const boards = [
  "A♥ 9♠ 4♣", "K♣ 8♦ 2♠", "Q♠ T♠ 9♦", "J♥ 7♣ 2♦", "T♦ 8♦ 4♠",
  "9♣ 6♣ 3♥", "A♠ K♦ 7♣", "Q♥ Q♣ 5♦", "8♠ 7♥ 6♠", "K♠ J♠ 3♦",
  "A♦ 5♣ 2♥", "T♣ T♥ 9♠", "J♠ 9♦ 4♣", "6♥ 5♥ 2♠", "K♦ 7♦ 4♣"
];

const turns = ["2♣", "3♦", "4♥", "5♠", "6♦", "7♠", "8♥", "9♣", "T♦", "J♣", "Q♦", "K♥", "A♣"];
const rivers = ["2♥", "3♠", "4♦", "5♣", "6♠", "7♦", "8♣", "9♥", "T♠", "J♦", "Q♣", "K♣", "A♥"];

const villainTypes = [
  "tight regular",
  "loose passive player",
  "aggressive reg",
  "calling station",
  "unknown low-stakes player",
  "nitty player",
  "maniac"
];

const range6 = {
  "UTG": "77+, AJs+, KQs, AQo+",
  "HJ": "55+, ATs+, KJs+, QJs, JTs, AQo+, KQo",
  "CO": "44+, A8s+, KTs+, QTs+, JTs, T9s, AJo+, KQo",
  "BTN": "22+, A2s+, K7s+, Q8s+, J8s+, T8s+, 98s, A8o+, KTo+, QTo+, JTo",
  "SB": "22+, A2s+, K8s+, Q9s+, J9s+, T9s, A9o+, KTo+, QTo+",
  "BB": "Defend wide versus small opens. 3-bet strong hands and suited blockers."
};

const range9 = {
  "UTG": "88+, AQs+, AK",
  "UTG+1": "77+, AJs+, KQs, AQo+",
  "UTG+2": "66+, ATs+, KQs, AQo+",
  "LJ": "55+, ATs+, KJs+, QJs, JTs, AQo+, KQo",
  "HJ": "44+, A9s+, KTs+, QTs+, JTs, AJo+, KQo",
  "CO": "33+, A7s+, K9s+, Q9s+, J9s+, T9s, ATo+, KJo+",
  "BTN": "22+, A2s+, K6s+, Q8s+, J8s+, T8s+, 98s, A7o+, KTo+, QTo+, JTo",
  "SB": "22+, A2s+, K8s+, Q9s+, J9s+, T9s, A9o+, KTo+",
  "BB": "Defend based on open size. Wider versus button, tighter versus early position."
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getLevel() {
  return Math.floor(stats.xp / 100) + 1;
}

function difficultyLevel(difficulty) {
  if (difficulty === "beginner") return 1;
  if (difficulty === "intermediate") return 2;
  if (difficulty === "advanced") return 3;
  return pick([1, 2, 3]);
}

function makeAnswers(correct, wrongs) {
  const all = shuffle([correct, ...shuffle(wrongs).slice(0, 3)]);
  return {
    answers: all,
    rightIndex: all.indexOf(correct)
  };
}

function getStack(trainingType, difficulty) {
  if (trainingType === "cash") return pick(["80bb", "100bb", "120bb", "150bb"]);
  if (trainingType === "tournament") {
    if (difficulty === "beginner") return pick(["8bb", "10bb", "12bb", "15bb"]);
    if (difficulty === "intermediate") return pick(["15bb", "20bb", "25bb", "30bb"]);
    return pick(["18bb", "25bb", "35bb", "45bb"]);
  }
  return pick(["10bb", "15bb", "25bb", "40bb", "100bb"]);
}

function generatePreflop(settings) {
  const level = difficultyLevel(settings.difficulty);
  const position = pick(positions[settings.tableSize]);
  const hand = pick(hands);
  const stack = getStack(settings.trainingType, settings.difficulty);
  const villain = pick(villainTypes);

  let correct;
  let reason;
  let leak;

  if (position === "BTN" || position === "CO") {
    correct = "Open raise";
    reason = "Late position means fewer players left to act, so you can play wider and apply pressure.";
    leak = "playing too tight in late position";
  } else if (position === "SB") {
    correct = level === 1 ? "Raise or fold, avoid limping too much" : "Use a mixed strategy of raises and selective limps";
    reason = "Small blind is awkward because you are out of position postflop. Do not complete weak hands automatically.";
    leak = "calling too wide from small blind";
  } else if (position === "BB") {
    correct = "Defend selectively";
    reason = "Big blind gets a discount, but you still need to consider position, hand quality and open size.";
    leak = "defending big blind too wide";
  } else {
    correct = "Play tighter";
    reason = "Early position ranges must be tighter because many players still act behind you.";
    leak = "opening too loose from early position";
  }

  const wrongs = ["Fold every time", "Open jam", "Limp/call automatically", "3-bet regardless of action", "Call because the cards look nice"];
  const answerSet = makeAnswers(correct, wrongs);

  return {
    type: "preflop",
    level,
    format: `${settings.tableSize}-max`,
    title: `${position}, ${stack}. You have ${hand}. What is the best default preflop approach?`,
    cards: hand,
    history: `
      <b>Game:</b> ${settings.trainingType}<br>
      <b>Table:</b> ${settings.tableSize}-max<br>
      <b>Position:</b> ${position}<br>
      <b>Stack:</b> ${stack}<br>
      <b>Villain type:</b> ${villain}<br>
      <b>Action:</b> Folds to you, or action is unopened before your decision.
    `,
    answers: answerSet.answers,
    rightIndex: answerSet.rightIndex,
    hint: "Think about position first, then stack depth, then hand strength.",
    explanation: reason,
    leak,
    idParts: [settings.trainingType, settings.tableSize, settings.difficulty, "preflop", position, hand, stack, villain, correct]
  };
}

function generatePostflop(settings) {
  const level = difficultyLevel(settings.difficulty);
  const table = positions[settings.tableSize];

  const preflopOrder = table;
  const postflopOrder = ["SB", "BB", "UTG", "UTG+1", "UTG+2", "LJ", "HJ", "CO", "BTN"];

  const hero = pick(table.filter(p => p !== "BB"));
  const possibleCallers = table.filter(p => p !== hero);
  const villainPos = pick(possibleCallers);

  const heroActsFirst =
    postflopOrder.indexOf(hero) < postflopOrder.indexOf(villainPos);

  const hand = pick(hands);
  const board = pick(boards);
  const turn = pick(turns);
  const river = pick(rivers);
  const stack = getStack(settings.trainingType, settings.difficulty);
  const villain = pick(villainTypes);
  const street = pick(["flop", "turn", "river"]);

  const openSize = settings.trainingType === "cash" ? pick(["2.5bb", "3bb"]) : pick(["2bb", "2.2bb", "2.5bb"]);
  const preflopPot = pick(["5.5bb", "6.5bb", "7bb"]);
  const flopBet = pick(["33%", "50%", "66%"]);
  const turnPot = pick(["10bb", "13bb", "16bb", "20bb"]);
  const riverPot = pick(["22bb", "28bb", "36bb", "44bb"]);
  const villainBet = pick(["50%", "66%", "75%", "pot-sized"]);

  let facingBet = false;
  let correct;
  let wrongs;
  let reason;
  let leak;
  let idealBet;

  if (street === "river" && (villain.includes("passive") || villain.includes("nitty"))) {
    facingBet = true;
    correct = "Fold";
    wrongs = ["Call because you are curious", "Raise bluff", "Jam for protection", "Min-raise"];
    reason = "A passive or nitty player betting big on the river is usually value-heavy. Without a very strong hand, folding is best.";
    leak = "calling too wide on rivers";
    idealBet = "No bet size — you are facing a bet.";
  } else if (board.includes("Q") && board.includes("Q")) {
    correct = "Check";
    wrongs = ["Bet 100% pot", "Jam", "Bet for protection", "Raise"];
    reason = "Paired boards are often good boards to control the pot, especially with marginal showdown value.";
    leak = "overplaying paired boards";
    idealBet = "Check often, or use a small bet.";
  } else if (board.includes("A") || board.includes("K")) {
    correct = "Bet 50% pot";
    wrongs = ["Check always", "Jam", "Fold", "Min-bet"];
    reason = "High-card boards are good for the preflop raiser. You can value bet and deny equity.";
    leak = "missing value bets";
    idealBet = "Around 50% pot.";
  } else if (board.includes("T") && board.includes("9")) {
    correct = "Bet 33% pot";
    wrongs = ["Jam", "Bet 100% pot", "Fold", "Check always"];
    reason = "Connected boards hit the caller more often, so a smaller bet or cautious check is better.";
    leak = "overplaying one pair";
    idealBet = "Around 25–40% pot.";
  } else {
    correct = "Bet 50% pot";
    wrongs = ["Jam", "Fold", "Check always", "Min-bet for information"];
    reason = "A medium bet gets value from worse hands and charges draws without risking too much.";
    leak = "poor bet sizing";
    idealBet = "Around 50% pot.";
  }

  if (facingBet) {
    wrongs = wrongs.filter(x => !x.toLowerCase().includes("check"));
  }

  const answerSet = makeAnswers(correct, wrongs);

  let actionText = "";

  if (street === "flop") {
    actionText = heroActsFirst
      ? `<b>Current pot:</b> ${preflopPot}<br><b>Action:</b> Hero is first to act.`
      : `<b>Current pot:</b> ${preflopPot}<br><b>Action:</b> Villain checks. Hero to act.`;
  }

  if (street === "turn") {
    actionText = `
      <b>Action:</b> ${heroActsFirst ? "Hero bets " + flopBet + " pot. Villain calls." : "Villain checks. Hero bets " + flopBet + " pot. Villain calls."}<br><br>
      <b>Turn:</b> ${turn}<br>
      <b>Current pot:</b> ${turnPot}<br>
      <b>Action:</b> ${heroActsFirst ? "Hero is first to act." : "Villain checks. Hero to act."}
    `;
  }

  if (street === "river") {
    actionText = `
      <b>Action:</b> ${heroActsFirst ? "Hero bets " + flopBet + " pot. Villain calls." : "Villain checks. Hero bets " + flopBet + " pot. Villain calls."}<br><br>
      <b>Turn:</b> ${turn}<br>
      <b>Current pot:</b> ${turnPot}<br>
      <b>Action:</b> ${heroActsFirst ? "Hero checks. Villain checks back." : "Villain checks. Hero checks back."}<br><br>
      <b>River:</b> ${river}<br>
      <b>Current pot:</b> ${riverPot}<br>
      <b>Action:</b> ${heroActsFirst ? `Hero checks. Villain bets ${villainBet} pot. Hero to act.` : `Villain bets ${villainBet} pot. Hero to act.`}
    `;
  }

  return {
    type: "postflop",
    level,
    format: `${settings.tableSize}-max`,
    title: `${street.toUpperCase()} decision. You have ${hand}. Board: ${board}${street !== "flop" ? " " + turn : ""}${street === "river" ? " " + river : ""}. What is your best play?`,
    cards: hand,
    history: `
      <b>Game:</b> ${settings.trainingType}<br>
      <b>Table:</b> ${settings.tableSize}-max<br>
      <b>Hero position:</b> ${hero}<br>
      <b>Villain position:</b> ${villainPos}<br>
      <b>Effective stack:</b> ${stack}<br>
      <b>Villain:</b> ${villain}<br><br>

      <b>Preflop:</b> Hero opens to ${openSize}. ${villainPos} calls.<br>
      <b>Pot going to flop:</b> ${preflopPot}<br><br>

      <b>Flop:</b> ${board}<br>
      ${actionText}
    `,
    answers: answerSet.answers,
    rightIndex: answerSet.rightIndex,
    hint: "First check who acts first. Then ask: am I facing a bet, or choosing whether to bet/check?",
    explanation: `${reason}<br><br><b>Suggested sizing:</b> ${idealBet}`,
    leak,
    idParts: [
      settings.trainingType,
      settings.tableSize,
      settings.difficulty,
      "postflop",
      hero,
      villainPos,
      hand,
      board,
      turn,
      river,
      street,
      villain,
      correct
    ]
  };
}

function generatePotOdds(settings) {
  const level = difficultyLevel(settings.difficulty);
  const pot = pick([10, 20, 30, 40, 50, 75, 100]);
  const bet = pick([5, 10, 15, 20, 30, 50]);
  const finalPot = pot + bet + bet;
  const equity = Math.round((bet / finalPot) * 100);

  const correct = `${equity}% equity needed`;
  const wrongs = [`${Math.max(5, equity - 10)}% equity needed`, `${equity + 10}% equity needed`, `${equity + 20}% equity needed`, "50% equity needed"];
  const answerSet = makeAnswers(correct, wrongs);

  return {
    type: "potodds",
    level,
    format: "Math",
    title: `Pot is £${pot}. Villain bets £${bet}. You must call £${bet}. What equity do you need?`,
    cards: "",
    history: `
      <b>Formula:</b> Call amount ÷ final pot<br>
      <b>Current pot:</b> £${pot}<br>
      <b>Villain bet:</b> £${bet}<br>
      <b>Your call:</b> £${bet}<br>
      <b>Final pot if you call:</b> £${finalPot}
    `,
    answers: answerSet.answers,
    rightIndex: answerSet.rightIndex,
    hint: "Use call amount divided by final pot after your call.",
    explanation: `You call £${bet} to win a final pot of £${finalPot}. ${bet} ÷ ${finalPot} = about ${equity}%.`,
    leak: "pot odds mistakes",
    idParts: [settings.trainingType, settings.tableSize, settings.difficulty, "potodds", pot, bet, finalPot, equity]
  };
}

function generateReading(settings) {
  const level = difficultyLevel(settings.difficulty);
  const villain = pick(villainTypes);
  const board = pick(boards);
  const hand = pick(hands);

  let correct;
  let reason;
  let leak;

  if (villain.includes("passive") || villain.includes("nitty")) {
    correct = "Respect big aggression";
    reason = "Passive or nitty players are usually value-heavy when they suddenly make large bets or raises.";
    leak = "paying off passive players";
  } else if (villain.includes("maniac")) {
    correct = "Call wider but do not stack off blindly";
    reason = "Aggressive players bluff more, but you still need blockers, pot odds and board texture.";
    leak = "over-adjusting versus maniacs";
  } else {
    correct = "Assign a range, not one exact hand";
    reason = "Good hand reading means building a range based on preflop action, board texture and betting line.";
    leak = "guessing exact hands";
  }

  const wrongs = ["Assume they always bluff", "Assume they always have the nuts", "Ignore position", "Call because you want to see it"];
  const answerSet = makeAnswers(correct, wrongs);

  return {
    type: "reading",
    level,
    format: `${settings.tableSize}-max`,
    title: `${villain} takes an unusual aggressive line on ${board}. What should you think about first?`,
    cards: hand,
    history: `
      <b>Villain type:</b> ${villain}<br>
      <b>Board:</b> ${board}<br>
      <b>Your hand:</b> ${hand}<br>
      <b>Action:</b> Villain's line does not match their normal style. You need to interpret their range.
    `,
    answers: answerSet.answers,
    rightIndex: answerSet.rightIndex,
    hint: "Think in ranges and player types, not fear or curiosity.",
    explanation: reason,
    leak,
    idParts: [settings.trainingType, settings.tableSize, settings.difficulty, "reading", villain, board, hand, correct]
  };
}

function generatePushFold(settings) {
  const level = difficultyLevel(settings.difficulty);
  const position = pick(positions[settings.tableSize]);
  const stack = pick(["5bb", "7bb", "9bb", "11bb", "13bb", "15bb"]);
  const hand = pick(["A♠ 7♦", "K♠ 4♠", "Q♥ T♥", "5♦ 5♣", "A♣ 2♣", "J♠ 9♠", "8♦ 8♣", "K♥ Q♦"]);

  let correct;
  let reason;
  let leak;

  if (position === "BTN" || position === "SB") {
    correct = "Open jam many playable hands";
    reason = "At short stacks, fold equity is valuable, especially from late position or blind-vs-blind.";
    leak = "too passive short stacked";
  } else {
    correct = "Jam tighter from early position";
    reason = "Early position jams need to be stronger because more players can wake up with a hand.";
    leak = "jamming too loose from early position";
  }

  const wrongs = ["Limp/fold", "Min-raise/fold every hand", "Fold all non-premiums", "Call and see a flop"];
  const answerSet = makeAnswers(correct, wrongs);

  return {
    type: "pushfold",
    level,
    format: "Tournament",
    title: `${position}, ${stack}. You have ${hand}. What is the best short-stack default?`,
    cards: hand,
    history: `
      <b>Game:</b> Tournament<br>
      <b>Table:</b> ${settings.tableSize}-max<br>
      <b>Position:</b> ${position}<br>
      <b>Stack:</b> ${stack}<br>
      <b>Action:</b> Folds to you. Antes are in play.
    `,
    answers: answerSet.answers,
    rightIndex: answerSet.rightIndex,
    hint: "At short stacks, fold equity matters. Position changes how wide you can jam.",
    explanation: reason,
    leak,
    idParts: [settings.trainingType, settings.tableSize, settings.difficulty, "pushfold", position, stack, hand, correct]
  };
}

function getSettings() {
  return {
    trainingType: document.getElementById("trainingType").value,
    difficulty: document.getElementById("difficulty").value,
    tableSize: Number(document.getElementById("tableSize").value)
  };
}

function generateScenario() {
  const settings = getSettings();
  const available = mode === "mixed"
    ? ["preflop", "postflop", "potodds", "reading", settings.trainingType === "cash" ? "postflop" : "pushfold"]
    : [mode];

  const chosen = pick(available);

  if (chosen === "preflop") return generatePreflop(settings);
  if (chosen === "postflop") return generatePostflop(settings);
  if (chosen === "potodds") return generatePotOdds(settings);
  if (chosen === "reading") return generateReading(settings);
  if (chosen === "pushfold") return generatePushFold(settings);

  return generatePreflop(settings);
}

function newSpot() {
  let attempt = 0;
  let scenario;

  do {
    scenario = generateScenario();
    scenario.id = scenario.idParts.join("|");
    attempt++;
  } while (seenQuestions.includes(scenario.id) && attempt < 300);

  current = scenario;
  selected = null;
  answered = false;

  if (!seenQuestions.includes(current.id)) {
    seenQuestions.push(current.id);
    localStorage.setItem("seenQuestions", JSON.stringify(seenQuestions));
  }

  document.getElementById("type").innerText = current.type.toUpperCase();
  document.getElementById("format").innerText = current.format;
  document.getElementById("level").innerText = "Level " + getLevel();
  document.getElementById("xp").innerText = stats.xp + " XP";
  document.getElementById("trainingLabel").innerText = getSettings().trainingType.toUpperCase();
  document.getElementById("spot").innerText = current.title;
  document.getElementById("handHistory").innerHTML = current.history;
  document.getElementById("cards").innerText = current.cards;
  document.getElementById("feedback").classList.add("hidden");
  document.getElementById("answers").innerHTML = "";

  current.answers.forEach((answer, index) => {
    const button = document.createElement("button");
    button.className = "answer";
    button.innerText = String.fromCharCode(65 + index) + ") " + answer;
    button.onclick = () => select(index, button);
    document.getElementById("answers").appendChild(button);
  });

  update();
}

function select(index, button) {
  if (answered) return;
  selected = index;
  document.querySelectorAll(".answer").forEach(x => x.classList.remove("selected"));
  button.classList.add("selected");
}

function check() {
  if (selected === null) {
    alert("Pick an answer first");
    return;
  }

  if (answered) return;
  answered = true;

  const ok = selected === current.rightIndex;
  stats.hands++;

  if (ok) {
    stats.correct++;
    stats.streak++;
    stats.best = Math.max(stats.best, stats.streak);
    stats.xp += current.level * 10;
  } else {
    stats.streak = 0;
    stats.leaks[current.leak] = (stats.leaks[current.leak] || 0) + 1;
    stats.xp += 2;
  }

  document.querySelectorAll(".answer").forEach((button, index) => {
    if (index === current.rightIndex) button.classList.add("correct");
    if (index === selected && index !== current.rightIndex) button.classList.add("wrong");
  });

  const feedback = document.getElementById("feedback");
  feedback.classList.remove("hidden");
  feedback.innerHTML = `
    <b>${ok ? "✅ Correct" : "❌ Not quite"}</b><br><br>
    ${current.explanation}<br><br>
    <b>Coach note:</b> ${ok ? "Good decision. Keep thinking in position, ranges and stack depth." : "This mistake has been added to your leak tracker."}
  `;

  localStorage.setItem("pokerStats", JSON.stringify(stats));
  update();
}

function hint() {
  const feedback = document.getElementById("feedback");
  feedback.classList.remove("hidden");
  feedback.innerHTML = "💡 <b>Hint:</b> " + current.hint;
}

function update() {
  const accuracy = stats.hands ? Math.round((stats.correct / stats.hands) * 100) : 0;

  document.getElementById("hands").innerText = stats.hands;
  document.getElementById("correct").innerText = stats.correct;
  document.getElementById("accuracy").innerText = accuracy + "%";
  document.getElementById("streak").innerText = stats.streak;
  document.getElementById("best").innerText = stats.best;
  document.getElementById("seen").innerText = seenQuestions.length;
  document.getElementById("level").innerText = "Level " + getLevel();
  document.getElementById("xp").innerText = stats.xp + " XP";

  const leaks = Object.entries(stats.leaks).sort((a, b) => b[1] - a[1]);

  document.getElementById("leaks").innerHTML = leaks.length
    ? leaks.map(x => `• ${x[0]}: ${x[1]} mistake${x[1] > 1 ? "s" : ""}`).join("<br>")
    : "Your mistakes will appear here.";
}

function renderRanges() {
  const r6 = document.getElementById("ranges6");
  const r9 = document.getElementById("ranges9");

  r6.innerHTML = Object.entries(range6).map(([pos, range]) => `
    <div class="range-box">
      <h4>${pos}</h4>
      <p>${range}</p>
    </div>
  `).join("");

  r9.innerHTML = Object.entries(range9).map(([pos, range]) => `
    <div class="range-box">
      <h4>${pos}</h4>
      <p>${range}</p>
    </div>
  `).join("");
}

document.querySelectorAll(".tab").forEach(button => {
  button.onclick = () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    button.classList.add("active");
    mode = button.dataset.mode;
    newSpot();
  };
});

document.getElementById("trainingType").onchange = newSpot;
document.getElementById("difficulty").onchange = newSpot;
document.getElementById("tableSize").onchange = newSpot;

document.getElementById("check").onclick = check;
document.getElementById("next").onclick = newSpot;
document.getElementById("hint").onclick = hint;

document.getElementById("resetSeen").onclick = () => {
  if (confirm("Reset seen questions? This allows old spots to appear again.")) {
    seenQuestions = [];
    localStorage.setItem("seenQuestions", JSON.stringify(seenQuestions));
    update();
    newSpot();
  }
};

renderRanges();
newSpot();
