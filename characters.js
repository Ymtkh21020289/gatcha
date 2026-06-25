export const ELEMENTS = ['fire', 'water', 'earth', 'wind', 'ice', 'poison'];

export const ELEMENT_LABELS = {
  fire: '火', water: '水', earth: '土', wind: '風', ice: '氷', poison: '毒'
};

export const PLAYER_CHARACTERS = [
  {
    id: 'leia_1', name: '特務調査隊・レイア', rarity: 1, element: 'earth', tactic: '埋め込み',
    speed: 105, attack: 25, defense: 20, factionBonusTarget: '異形', pixel: '⚔',
    normal: { name: '斬りつける', manaGain: { earth: 1 }, hits: 1, multiplier: 1, statuses: [{ type: 'pressure', amount: 1 }] },
    skill: { name: '叩きつける', cost: { earth: 2 }, hits: 2, multiplier: 1, buryChance: 0.5 },
    ultimate: { name: '正義の鉄槌', cost: { earth: 6 }, hits: 1, multiplier: 2.6, pressureRelease: true },
    passive: '敵が「異形」である場合、与えるダメージが15%増加する。'
  },
  {
    id: 'leia_3', name: '地殻守護騎士・レイア', rarity: 3, element: 'earth', tactic: '埋め込み',
    speed: 85, attack: 35, defense: 30, pixel: '🛡', guardian: true,
    normal: { name: '精密断層', manaGain: { earth: 2 }, hits: 1, multiplier: 1, statuses: [{ type: 'pressure', amount: 1 }] },
    skill: { name: '断罪の楔', cost: { earth: 3 }, hits: 1, multiplier: 1.7, statuses: [{ type: 'pressure', amount: 1 }], buryChance: 0.6 },
    ultimate: { name: '絶命の鉄槌', cost: { earth: 7 }, targetCount: 2, hits: 2, multiplier: 2.1, firstHitPressure: 2, pressureReleaseSecond: true },
    passive: '味方の防御力+10%。守護対象が倒れると攻撃力増加1、防御力増加1。'
  }
];

export const ENEMIES = [
  { id: 'mold_beast', name: '異形・菌獣', type: '異形', element: 'poison', speed: 92, attack: 22, defense: 16, hp: 165, pixel: '☣', normal: { name: '胞子噛み', hits: 1, multiplier: 1 } },
  { id: 'crystal_imp', name: '水晶小鬼', type: '地底', element: 'ice', speed: 118, attack: 18, defense: 10, hp: 120, pixel: '◆', normal: { name: '水晶針', hits: 1, multiplier: 1 } },
  { id: 'lava_crawler', name: '溶岩這い', type: '異形', element: 'fire', speed: 76, attack: 30, defense: 22, hp: 190, pixel: '▣', normal: { name: '熱牙', hits: 1, multiplier: 1 } }
];
