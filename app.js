let mode="mixed", selected=null, current=null;
let stats=JSON.parse(localStorage.getItem("pokerStats")||'{"hands":0,"correct":0,"streak":0,"best":0,"leaks":{}}');

const drills={
preflop:[
{f:"3-max",l:1,s:"Button, 40bb. You have AJo. Best default?",c:"A♠ J♦",a:["Fold","Limp","Raise 2.2–2.5bb","Jam"],r:2,h:"Strong hand + position.",w:"AJo is a strong 3-max button open. Raise small, don't jam 40bb."},
{f:"6-max",l:2,s:"UTG opens 3bb. You are small blind with KJo, 100bb deep.",c:"K♦ J♣",a:["3-bet","Call","Fold most of the time","Jam"],r:2,h:"Think domination.",w:"KJo is dominated by UTG range and plays badly out of position."},
{f:"3-max",l:2,s:"Small blind, button folds. You have Q8 suited, 25bb.",c:"Q♥ 8♥",a:["Fold","Mix limp/small raise","Jam 25bb","Raise 6bb"],r:1,h:"Blind-vs-blind is wide.",w:"Q8s is playable. Use limps and small raises, not huge raises."}
],
postflop:[
{f:"6-max",l:2,s:"You raise AK. Flop A♥ 9♠ 4♣. You bet and get called. Turn 7♠. Best default?",c:"A♣ K♦",a:["Check always","Bet again for value","Jam","Give up"],r:1,h:"Can worse call?",w:"Top pair top kicker gets called by worse Ax and draws. Bet for value."},
{f:"3-max",l:3,s:"You have QJ on Q♠ T♠ 9♦. Villain check-raises large. What worries you?",c:"Q♥ J♣",a:["Only bluffs","Straights/two pair/sets/draws","Ace high","Small pairs"],r:1,h:"Wet boards smash ranges.",w:"This board connects heavily. Top pair is vulnerable to strong made hands and huge draws."}
],
potodds:[
{f:"Math",l:1,s:"Pot £10. Villain bets £5. You call £5 to win final pot £20. Required equity?",c:"",a:["20%","25%","33%","50%"],r:1,h:"Call ÷ final pot.",w:"£5 ÷ £20 = 25%."},
{f:"Math",l:2,s:"Pot £30. Villain bets £10. You call £10 to win final pot £50. Required equity?",c:"",a:["16.7%","20%","25%","33%"],r:1,h:"Include your call.",w:"£10 ÷ £50 = 20%."},
{f:"Draw",l:3,s:"Turn flush draw, 9 outs, one card to come. Villain bets pot. Default?",c:"A♥ 5♥",a:["Always call","Usually fold without implied odds","Flush draw is 50%","Min-raise for info"],r:1,h:"One-card flush draw is about 20%.",w:"Facing pot you need about 33%. A naked flush draw usually needs implied odds or fold equity."}
],
reading:[
{f:"Low stakes",l:2,s:"Passive player checks flop/turn then overbets river all-in when straight/flush completes. You have one pair.",c:"A♠ T♣",a:["Hero call","Fold often","Raise","Call because pair"],r:1,h:"Passive river aggression is under-bluffed.",w:"At low stakes, passive players massively under-bluff big river bets. Fold one pair often."},
{f:"Range",l:3,s:"Tight UTG opens. You call button with 88. Flop K♣ 8♦ 2♠. UTG bets, you raise, UTG 3-bets large.",c:"8♥ 8♣",a:["Mostly air","AA/AK/KK/strong Kx","Only missed draws","Any two"],r:1,h:"Dry board + tight player.",w:"This is value-heavy. You have a monster, but their range is strong, not random."}
],
pushfold:[
{f:"3-max",l:1,s:"Button, 9bb. You have A7o. Folds to you.",c:"A♥ 7♣",a:["Fold","Min-raise/fold","Open jam","Limp/fold"],r:2,h:"Below 10bb fold equity matters.",w:"A7o is strong enough to jam from button at 9bb."},
{f:"3-max",l:2,s:"Small blind, button folds, 7bb. You have K4s.",c:"K♠ 4♠",a:["Fold","Open jam","Raise/fold","Complete"],r:1,h:"Blind-vs-blind is very wide.",w:"K4s has enough equity and fold equity to jam at 7bb."},
{f:"6-max",l:2,s:"Tournament UTG, 12bb. You have 55.",c:"5♦ 5♣",a:["Open jam","Fold always","Limp","Raise/fold"],r:0,h:"Small pairs like fold equity.",w:"At 10–15bb, small pairs are often clean open jams."}
]
};

function pick(arr){return arr[Math.floor(Math.random()*arr.length)]}

function newSpot(){
  const keys=mode==="mixed"?Object.keys(drills):[mode];
  const type=pick(keys);
  current={...pick(drills[type]),type};
  selected=null;
  document.getElementById("type").innerText=type.toUpperCase();
  document.getElementById("format").innerText=current.f;
  document.getElementById("level").innerText="Level "+current.l;
  document.getElementById("spot").innerText=current.s;
  document.getElementById("cards").innerText=current.c;
  document.getElementById("feedback").classList.add("hidden");
  document.getElementById("answers").innerHTML="";
  current.a.forEach((x,i)=>{
    let b=document.createElement("button");
    b.className="answer";
    b.innerText=String.fromCharCode(65+i)+") "+x;
    b.onclick=()=>select(i,b);
    document.getElementById("answers").appendChild(b);
  });
  update();
}

function select(i,b){
  selected=i;
  document.querySelectorAll(".answer").forEach(x=>x.classList.remove("selected"));
  b.classList.add("selected");
}

function check(){
  if(selected===null){alert("Pick an answer first");return}
  let ok=selected===current.r;
  stats.hands++;
  if(ok){stats.correct++;stats.streak++;stats.best=Math.max(stats.best,stats.streak)}
  else{stats.streak=0;stats.leaks[current.type]=(stats.leaks[current.type]||0)+1}
  document.querySelectorAll(".answer").forEach((b,i)=>{
    if(i===current.r)b.classList.add("correct");
    if(i===selected && i!==current.r)b.classList.add("wrong");
  });
  let fb=document.getElementById("feedback");
  fb.classList.remove("hidden");
  fb.innerHTML=(ok?"✅ Correct":"❌ Not quite")+"<br><br>"+current.w;
  localStorage.setItem("pokerStats",JSON.stringify(stats));
  update();
}

function hint(){
  let fb=document.getElementById("feedback");
  fb.classList.remove("hidden");
  fb.innerHTML="💡 Hint: "+current.h;
}

function update(){
  let acc=stats.hands?Math.round(stats.correct/stats.hands*100):0;
  document.getElementById("hands").innerText=stats.hands;
  document.getElementById("correct").innerText=stats.correct;
  document.getElementById("accuracy").innerText=acc+"%";
  document.getElementById("streak").innerText=stats.streak;
  document.getElementById("best").innerText=stats.best;
  let leaks=Object.entries(stats.leaks);
  document.getElementById("leaks").innerHTML=leaks.length?leaks.map(x=>"• "+x[0]+": "+x[1]+" mistakes").join("<br>"):"Your mistakes will appear here.";
}

document.querySelectorAll(".tab").forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    mode=b.dataset.mode;
    newSpot();
  }
});

document.getElementById("check").onclick=check;
document.getElementById("next").onclick=newSpot;
document.getElementById("hint").onclick=hint;

newSpot();
