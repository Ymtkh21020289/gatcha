import { ELEMENTS, ELEMENT_LABELS, PLAYER_CHARACTERS, ENEMIES } from './characters.js';

const AV_BASE = 10000;
const state = { screen: 'title', roster: [], partyIds: ['leia_1', 'leia_3'], team: [], enemies: [], mana: {}, log: [], selected: null, over: false };
const $app = document.querySelector('#app');

const floor = Math.floor;
const avOf = (speed) => floor(AV_BASE / Math.max(1, speed));
const alive = (u) => u.hp > 0;
const byId = (id) => state.roster.find((c) => c.id === id);
const hasMana = (cost = {}) => Object.entries(cost).every(([e, n]) => (state.mana[e] || 0) >= n);
const spendMana = (cost = {}) => Object.entries(cost).forEach(([e, n]) => state.mana[e] -= n);
const gainMana = (gain = {}) => Object.entries(gain).forEach(([e, n]) => state.mana[e] = (state.mana[e] || 0) + n);
const log = (msg) => { state.log.unshift(msg); state.log = state.log.slice(0, 8); };

function boot() { state.roster = structuredClone(PLAYER_CHARACTERS); resetMana(); render(); }
function resetMana() { state.mana = Object.fromEntries(ELEMENTS.map((e) => [e, 0])); }
function unitFromCharacter(c, side) {
  return { ...structuredClone(c), side, maxHp: side === 'ally' ? 150 + c.rarity * 35 : c.hp, hp: side === 'ally' ? 150 + c.rarity * 35 : c.hp, av: avOf(c.speed), statuses: {}, buffs: { atk: 0, def: 0 }, airborne: 0, buried: 0, guardTarget: false };
}
function startBattle() {
  state.team = state.partyIds.map((id) => unitFromCharacter(byId(id), 'ally'));
  state.enemies = structuredClone(ENEMIES).map((e) => unitFromCharacter(e, 'enemy'));
  resetMana(); state.log = ['地底坑道で敵影を確認。']; state.over = false; state.selected = null;
  if (state.team.some((u) => u.guardian)) state.team.filter((u) => !u.guardian).forEach((u) => u.guardTarget = true);
  state.screen = 'battle'; normalizeTimeline(); render();
}
function allUnits() { return [...state.team, ...state.enemies]; }
function effectiveSpeed(u) { return u.speed + (u.statuses.tailwind || 0) * 2 - (u.statuses.permeate || 0) * u.speed * 0.01; }
function effectiveAtk(u) { return u.attack * (1 + (u.buffs.atk || 0) * .05); }
function effectiveDef(u) {
  const guardian = u.side === 'ally' && state.team.some((x) => x.guardian && alive(x)) ? 1.1 : 1;
  return u.defense * guardian * (1 + (u.buffs.def || 0) * .05) * (1 - Math.min(10, u.statuses.pressure || 0) * .025);
}
function normalizeTimeline() {
  const candidates = allUnits().filter(alive).filter((u) => !u.statuses.freeze);
  const minAv = Math.min(...candidates.map((u) => u.av));
  allUnits().filter(alive).forEach((u) => { if (u.statuses.freeze) u.statuses.freeze--; else u.av = Math.max(0, u.av - minAv); });
}
function currentActor() { return allUnits().filter(alive).find((u) => u.av === 0); }
function damage(attacker, target, mult = 1) {
  let dm = floor(effectiveAtk(attacker) * mult * (100 / (100 + effectiveDef(target))));
  if (attacker.factionBonusTarget && target.type === attacker.factionBonusTarget) dm = floor(dm * 1.15);
  if (target.buried) dm = floor(dm * 1.5);
  if (target.statuses.fireMark) dm = floor(dm * (1 + Math.min(5, target.statuses.fireMark) * .2));
  if (target.statuses.freeze) { dm *= 3; delete target.statuses.freeze; log('粉砕！凍結中の被ダメージが3倍。'); }
  target.hp = Math.max(0, target.hp - dm); return dm;
}
function addStatus(target, type, amount, source) {
  target.statuses[type] = Math.min(type === 'pressure' ? 10 : 50, (target.statuses[type] || 0) + amount);
  if (type === 'pressure') log(`${target.name}に重圧${amount}。`);
  if (type === 'blaze' && target.statuses.blaze >= 7) { target.statuses.blaze = 0; target.statuses.fireMark = (target.statuses.fireMark || 0) + 1; const d = damage(source, target, 2.5); log(`烈火が大爆発し${d}ダメージ。`); }
}
function pressureRelease(target) { const p = target.statuses.pressure || 0; if (!p) return; target.av += p * 10; target.statuses.pressure = Math.max(0, p - 1); log(`重圧解放: ${target.name}のAV+${p * 10}。`); }
function bury(target, source) { target.buried = avOf(effectiveSpeed(target)); target.av += target.buried; if (target.statuses.corrosion) { target.statuses.lethalPoison = (target.statuses.lethalPoison || 0) + target.statuses.corrosion; target.statuses.corrosion = 0; } log(`${source.name}が${target.name}を埋め込み状態にした。`); intercept(target); }
function intercept(target) { const striker = state.team.find((u) => alive(u) && u.tactic === '埋め込み' && u.av > 0); if (!striker || target.side !== 'enemy') return; const d = damage(striker, target, .75); striker.av = avOf(effectiveSpeed(striker)); log(`${striker.name}が埋め込み迎撃で${d}ダメージ。`); }
function useAction(actor, kind, target) {
  if (!actor || state.over) return;
  const action = kind === 'normal' ? actor.normal : actor[kind];
  if (!action) { log(`${actor.name}は${kind}の行動データが未定義です。`); endTurn(actor); render(); return; }
  if (actor.buried || actor.airborne) { log(`${actor.name}は拘束中で行動不能。`); endTurn(actor); return; }
  if (action.cost && !hasMana(action.cost)) return log('マナが不足しています。');
  if (action.cost) spendMana(action.cost); if (action.manaGain) gainMana(action.manaGain);
  const targets = actor.side === 'ally' ? state.enemies.filter(alive).slice(0, action.targetCount || 1) : state.team.filter(alive).slice(0, 1);
  (target ? [target] : targets).filter(alive).forEach((t) => {
    for (let i = 1; i <= (action.hits || 1); i++) { const d = damage(actor, t, action.multiplier || 1); log(`${actor.name}の${action.name}: ${t.name}へ${d}。`); if (action.firstHitPressure && i === 1) addStatus(t, 'pressure', action.firstHitPressure, actor); if (action.pressureReleaseSecond && i === 2) pressureRelease(t); }
    (action.statuses || []).forEach((s) => addStatus(t, s.type, s.amount, actor));
    if (action.pressureRelease) pressureRelease(t);
    if (action.buryChance && Math.random() < action.buryChance) bury(t, actor);
  });
  endTurn(actor); checkEnd(); render();
}
function endTurn(actor) { actor.av = avOf(effectiveSpeed(actor)); tickBinding(actor); normalizeTimeline(); }
function tickBinding(u) { if (u.buried) { u.buried = Math.max(0, u.buried - u.speed); if (!u.buried && u.statuses.lethalPoison) { u.hp -= u.statuses.lethalPoison * 2; u.statuses.corrosion = 2; delete u.statuses.lethalPoison; } } }
function enemyAct() { const actor = currentActor(); if (actor?.side !== 'enemy') return; const target = state.team.filter(alive).sort((a,b)=>a.hp-b.hp)[0]; useAction(actor, 'normal', target); }
function checkEnd() { if (!state.enemies.some(alive)) { state.over = true; log('勝利！地底の調査を継続可能。'); } if (!state.team.some(alive)) { state.over = true; log('敗北……拠点へ撤退。'); } }
function summon() { const pick = structuredClone(PLAYER_CHARACTERS[Math.floor(Math.random()*PLAYER_CHARACTERS.length)]); pick.id += '_' + Date.now(); state.roster.push(pick); log(`ガチャ結果: ${pick.name} ☆${pick.rarity}`); render(); }

function render() { $app.innerHTML = screens[state.screen](); if (state.screen === 'battle') setTimeout(enemyAct, 450); }
const button = (txt, cb, dis='') => `<button ${dis?'disabled':''} onclick="${cb}">${txt}</button>`;
window.goto = (s) => { state.screen = s; render(); }; window.startBattle = startBattle; window.summon = summon;
window.toggleParty = (id) => { state.partyIds = state.partyIds.includes(id) ? state.partyIds.filter((x)=>x!==id) : [...state.partyIds, id].slice(-3); render(); };
window.act = (kind) => useAction(currentActor(), kind, state.enemies.find(alive));

const screens = {
  title: () => `<main class="title panel"><h1>GATCHA<br><span>地底タイムラインRPG</span></h1><p>AV・属性マナ・埋め込み戦術で坑道を突破せよ。</p>${button('開始', "goto('menu')")}</main>`,
  menu: () => `<main class="panel"><h2>拠点メニュー</h2><div class="menu">${button('戦闘開始','startBattle()')}${button('編成','goto(\'formation\')')}${button('ガチャ','summon()')}${button('タイトル','goto(\'title\')')}</div><section class="log">${state.log.map(x=>`<p>${x}</p>`).join('')}</section></main>`,
  formation: () => `<main class="panel"><h2>編成</h2><p>最大3人。選択中: ${state.partyIds.length}</p><div class="cards">${state.roster.map(c=>`<article class="card ${state.partyIds.includes(c.id)?'on':''}" onclick="toggleParty('${c.id}')"><b>${c.pixel} ${c.name}</b><span>☆${c.rarity} ${ELEMENT_LABELS[c.element]} / ${c.tactic}</span><small>速${c.speed} 攻${c.attack} 防${c.defense}</small><em>${c.passive}</em></article>`).join('')}</div>${button('戻る','goto(\'menu\')')}</main>`,
  battle: () => { const actor = currentActor(); return `<main class="battle"><section class="timeline"><h3>TIMELINE</h3>${allUnits().filter(alive).sort((a,b)=>b.av-a.av).map(u=>`<p class="${u.side}">${u.name}<b>AV ${u.av}</b></p>`).join('')}</section><section class="field"><div class="side allies">${state.team.map(unit).join('')}</div><div class="vs">⚒</div><div class="side enemies">${state.enemies.map(unit).join('')}</div></section><aside class="mana"><h3>MANA</h3>${ELEMENTS.map(e=>`<p>${ELEMENT_LABELS[e]} <b>${state.mana[e]}</b></p>`).join('')}</aside><section class="commands"><b>行動: ${actor?.name || '-'}</b>${actor?.side==='ally'&&!state.over ? `${button('通常攻撃', 'act(\'normal\')')}${button('スキル', 'act(\'skill\')', !hasMana(actor.skill?.cost))}${button('必殺技', 'act(\'ultimate\')', !hasMana(actor.ultimate?.cost))}` : '<span>敵行動中...</span>'}</section><section class="log battlelog">${state.log.map(x=>`<p>${x}</p>`).join('')}</section></main>`; }
};
function unit(u) { return `<article class="unit ${u.side} ${alive(u)?'':'dead'}"><div class="sprite">${u.pixel}</div><b>${u.name}</b><meter min="0" max="${u.maxHp}" value="${u.hp}"></meter><small>HP ${u.hp}/${u.maxHp} ${u.buried?'埋め込み':''}</small><small>${Object.entries(u.statuses).filter(([,v])=>v).map(([k,v])=>`${k}:${v}`).join(' ')}</small></article>`; }

boot();
