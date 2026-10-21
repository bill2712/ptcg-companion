// Copy for the standalone tool pages (/<lang>/tools/...), in each content language.
// Each tool page has: SEO title and description, the interactive tool, then
// plain-language explanation and FAQ so the page has real content to rank with.

import { extraTools } from './toolsContentExtra';

export const toolSlugs = ['match-tracker', 'deck-checker', 'coin-flip', 'probability-calculator', 'damage-calculator', 'tournament-calculator'] as const;
export type ToolSlug = typeof toolSlugs[number];

type Section = { h: string; p: string[] };
type Faq = { q: string; a: string };
export type ToolCopy = {
  icon: string;
  tint: string;
  /** <title>, keyword first. */
  seoTitle: string;
  title: string;
  description: string;
  card: string;
  intro: string;
  sections: Section[];
  faq: Faq[];
  /** Guide slugs to link to from this tool. */
  guides: string[];
};

type Common = {
  toolsTitle: string;
  toolsSeoTitle: string;
  toolsIntro: string;
  toolsEyebrow: string;
  openTool: string;
  faqTitle: string;
  relatedTitle: string;
  otherTools: string;
  allTools: string;
  home: string;
};

const en: Common & { tools: Record<ToolSlug, ToolCopy> } = {
  toolsTitle: 'Pokémon TCG Tools',
  toolsSeoTitle: 'Free Pokémon TCG Tools: Match Tracker, Deck Checker, Coin Flip & Calculators',
  toolsIntro:
    'Free tools for Pokémon TCG players: track your win rate and matchups, check a deck list and test opening hands, flip coins, work out odds and damage, and plan your tournament. They run in your browser and work offline.',
  toolsEyebrow: 'Free, no sign-up',
  openTool: 'Open tool',
  faqTitle: 'Frequently asked questions',
  relatedTitle: 'Related guides',
  otherTools: 'More tools',
  allTools: 'All tools',
  home: 'PTCG Companion',
  tools: {
    ...extraTools.en,
    'coin-flip': {
      icon: '🪙',
      tint: 'from-amber-500/20 to-yellow-500/5',
      seoTitle: 'Pokémon TCG Coin Flip: Flip 1 to 10 Coins Online | PTCG Companion',
      title: 'Pokémon TCG Coin Flip',
      description:
        'Fair online coin flip for the Pokémon TCG. Flip one coin, several coins at once, or flip until tails, with a running heads and tails count. Free and works offline.',
      card: 'Flip one coin, many coins, or until tails. Fair and instant.',
      intro:
        'Tap the coin to flip. Use the buttons to flip several coins at once for attacks like "Flip 3 coins. This attack does 50 damage for each heads", or keep flipping until you get tails.',
      sections: [
        {
          h: 'Is this coin flip fair?',
          p: [
            'Yes. Every flip uses your browser\'s cryptographic random number generator (crypto.getRandomValues), so heads and tails each have exactly a 50% chance and no flip depends on the one before. Streaks of five or six heads in a row are normal and happen about once every 32 or 64 flips.',
          ],
        },
        {
          h: 'When do you flip coins in the Pokémon TCG?',
          p: [
            'At the start of the game, the winner of a coin flip chooses who goes first. During the game you flip for many attacks, for Asleep (heads wakes up) and Burned (heads recovers) during Pokémon Checkup, and before a Confused Pokémon attacks (tails means the attack fails and the Pokémon takes 30 damage).',
            'If an attack tells you to flip a number of coins, flip them all and then count the heads. If it says "flip a coin until you get tails", the tails flip ends the sequence and does not count as heads.',
          ],
        },
        {
          h: 'Using the coin in a real match',
          p: [
            'Agree with your opponent before the match that you will use a digital coin and that both players can see the result. In sanctioned events, check with the organiser: many allow a phone coin as long as the result is clearly visible to both players. The PTCG Companion match counter has the same coin built in next to the damage controls.',
          ],
        },
      ],
      faq: [
        {
          q: 'What does "flip until tails" mean?',
          a: 'Keep flipping until the first tails. The number of heads before that tails is your result, so the result can be 0 if the first flip is tails.',
        },
        {
          q: 'Can I flip several coins at once?',
          a: 'Yes. Choose 2 to 10 coins and the tool shows every coin and the total number of heads.',
        },
        {
          q: 'Does it work without an internet connection?',
          a: 'Yes. Once the page has loaded it keeps working offline, which is useful in game stores with poor signal.',
        },
      ],
      guides: ['special-conditions', 'turn-structure'],
    },
    'probability-calculator': {
      icon: '🎲',
      tint: 'from-sky-500/20 to-blue-500/5',
      seoTitle: 'Pokémon TCG Probability Calculator: Opening Hand, Prize & Mulligan Odds | PTCG Companion',
      title: 'Pokémon TCG Probability Calculator',
      description:
        'Calculate the chance of drawing a card in your opening hand, having it prized, or mulliganing, for any 60-card Pokémon TCG deck. Free deck-building odds calculator.',
      card: 'Odds of opening a card, prizing it, or mulliganing.',
      intro:
        'Enter how many copies of a card are in your deck to see the chance of drawing it in your opening hand, by your first turn, or having copies stuck in your Prize cards. Enter your Basic Pokémon count to see your mulligan rate.',
      sections: [
        {
          h: 'How the odds are calculated',
          p: [
            'Drawing from a shuffled deck is a hypergeometric problem: there is a fixed number of copies in a fixed-size deck and you draw without putting cards back. The calculator uses the exact hypergeometric formula, not a simulation, so the numbers are exact for a fairly shuffled deck.',
            'Your Prize cards are 6 random cards from the same shuffled deck, so the chance that a card is prized does not depend on what you drew first. On average, 10% of your deck (6 of 60 cards) is in the Prizes.',
          ],
        },
        {
          h: 'Useful numbers for a 60-card deck',
          p: [
            'With 4 copies of a card, you see at least one in your opening 7 cards about 40% of the time, and at least one is prized about 35% of the time. With 1 copy, it is prized 10% of the time, which is why players run 2 copies of key cards or include ways to search the deck.',
            'Your mulligan rate depends on how many Basic Pokémon you run. With 10 Basics the chance of opening with none is about 26%; with 14 Basics it falls to about 14%; with 20 it is about 5%.',
          ],
        },
        {
          h: 'Cards seen by your first turn',
          p: [
            'Both players draw at the start of every turn, including the player who goes first. So by the time you play your first card you have seen 8 cards (7 in your opening hand plus 1 draw). Use the "cards seen" setting to model extra draws from Supporters or search effects.',
          ],
        },
      ],
      faq: [
        {
          q: 'What is the chance of prizing all 4 copies of a card?',
          a: 'In a 60-card deck it is about 0.003%, roughly 1 game in 32,000. Prizing 2 or more of 4 copies happens in about 4.6% of games.',
        },
        {
          q: 'Does a mulligan change the odds?',
          a: 'After a mulligan you shuffle and draw a fresh 7, so the odds for the new hand are the same as the first one, except that you know it contains at least one Basic Pokémon.',
        },
        {
          q: 'Can I use it for groups of cards?',
          a: 'Yes. Enter the total number of cards that do the same job, for example all your draw Supporters, as the number of copies.',
        },
      ],
      guides: ['deck-building-probability', 'prize-cards-and-winning'],
    },
    'damage-calculator': {
      icon: '💥',
      tint: 'from-rose-500/20 to-red-500/5',
      seoTitle: 'Pokémon TCG Damage Calculator: Weakness, Resistance & KO Check | PTCG Companion',
      title: 'Pokémon TCG Damage Calculator',
      description:
        'Work out Pokémon TCG attack damage in the official order: base damage, attacker effects, Weakness ×2, Resistance −30 and defender effects. See if it is a Knock Out.',
      card: 'Weakness, Resistance and modifiers in the right order.',
      intro:
        'Fill in the attack and the Defending Pokémon. The calculator applies each step in the order the rulebook uses and tells you whether the attack Knocks Out the Defending Pokémon.',
      sections: [
        {
          h: 'The official order',
          p: [
            'Base damage printed on the attack (after working out any × or + from the attack text).\nEffects on the attacking Pokémon, such as Tools or Abilities that add damage.\nWeakness: ×2.\nResistance: −30.\nEffects on the Defending Pokémon that reduce damage.',
            'If the result is 0 or less, no damage is done. The order matters because Weakness doubles everything added before it. A 90 damage attack with +30 against a Weak Pokémon does 240, not 210.',
          ],
        },
        {
          h: 'When Weakness and Resistance do not apply',
          p: [
            'Weakness and Resistance only apply to damage done to the Active Pokémon. Damage to Benched Pokémon ignores them unless the attack says otherwise. Effects that "put damage counters" instead of "doing damage" skip every step, as do Poison, Burn and Confusion damage.',
          ],
        },
      ],
      faq: [
        {
          q: 'Is Weakness always ×2?',
          a: 'On cards printed in the modern era, yes. Some older cards list Weakness as +10, +20 or +30; for those, add the amount instead of doubling.',
        },
        {
          q: 'Is Resistance always −30?',
          a: 'On modern cards Resistance is −30. Older cards may show −20. Choose the value printed on the card.',
        },
        {
          q: 'How many damage counters is that?',
          a: 'One damage counter is 10 damage, so divide the final damage by 10.',
        },
      ],
      guides: ['damage-calculation', 'special-conditions'],
    },
  },
};

const zhTW: typeof en = {
  toolsTitle: '寶可夢卡牌工具',
  toolsSeoTitle: '免費寶可夢卡牌工具：戰績記錄、牌組檢查、擲硬幣及計算器',
  toolsIntro:
    '為寶可夢卡牌（PTCG）玩家而設的免費工具：記錄勝率和對局表現、檢查牌表並模擬起手、擲硬幣、計算機率和傷害，以及規劃比賽。全部在瀏覽器執行，也可離線使用。',
  toolsEyebrow: '免費・無需註冊',
  openTool: '開啟工具',
  faqTitle: '常見問題',
  relatedTitle: '相關攻略',
  otherTools: '更多工具',
  allTools: '全部工具',
  home: 'PTCG Companion',
  tools: {
    ...extraTools['zh-TW'],
    'coin-flip': {
      icon: '🪙',
      tint: 'from-amber-500/20 to-yellow-500/5',
      seoTitle: '寶可夢卡牌擲硬幣：線上一次擲 1 至 10 枚硬幣 | PTCG Companion',
      title: '寶可夢卡牌擲硬幣',
      description:
        '公平的寶可夢卡牌線上擲硬幣工具。可擲一枚、一次擲多枚，或擲到反面為止，並自動統計正反面次數。免費，可離線使用。',
      card: '擲一枚、多枚或擲到反面為止，公平又即時。',
      intro:
        '點一下硬幣即可擲出。招式寫明「擲 3 次硬幣，每次正面造成 50 傷害」時，可用下方按鈕一次擲多枚；也可以一直擲到出現反面為止。',
      sections: [
        {
          h: '這個擲硬幣公平嗎？',
          p: [
            '公平。每次擲硬幣都使用瀏覽器的加密級亂數產生器（crypto.getRandomValues），正面和反面的機率各為 50%，每次結果互不影響。連續五、六次正面是正常現象，大約每 32 或 64 次就會出現一次。',
          ],
        },
        {
          h: '寶可夢卡牌甚麼時候要擲硬幣？',
          p: [
            '對戰開始時，擲硬幣猜中的一方可以選擇先攻或後攻。對戰期間，很多招式需要擲硬幣；寶可夢檢查時，睡眠（正面會醒來）和灼傷（正面會復原）也要擲硬幣；混亂的寶可夢使用招式前也要擲硬幣（反面的話招式失敗，並在自己身上放 3 個傷害指示物）。',
            '招式要求擲多次硬幣時，先全部擲完再數正面次數。如果寫明「擲硬幣直到出現反面為止」，最後那次反面只是結束，不計作正面。',
          ],
        },
        {
          h: '在正式對戰中使用',
          p: [
            '開打前先和對手說好使用電子硬幣，並確保雙方都看得到結果。參加官方賽事時，請先向主辦單位確認；很多比賽只要結果清楚讓雙方看見，就允許使用手機擲硬幣。PTCG Companion 的對戰計分器內也有同一個擲硬幣功能。',
          ],
        },
      ],
      faq: [
        {
          q: '「擲到反面為止」是甚麼意思？',
          a: '一直擲硬幣，直到第一次出現反面。反面之前出現了多少次正面，就是結果；如果第一次就是反面，結果便是 0。',
        },
        {
          q: '可以一次擲多枚硬幣嗎？',
          a: '可以。選擇 2 至 10 枚，工具會顯示每一枚的結果和正面總數。',
        },
        {
          q: '沒有網絡也能用嗎？',
          a: '可以。頁面載入一次後就能離線使用，在訊號差的卡店也不受影響。',
        },
      ],
      guides: ['special-conditions', 'turn-structure'],
    },
    'probability-calculator': {
      icon: '🎲',
      tint: 'from-sky-500/20 to-blue-500/5',
      seoTitle: '寶可夢卡牌機率計算器：起手、獎賞卡及重抽機率 | PTCG Companion',
      title: '寶可夢卡牌機率計算器',
      description:
        '計算 60 張牌組中，起手抽到某張卡、該卡被壓在獎賞卡，以及需要重抽（沒有基礎寶可夢）的機率。免費組牌機率工具。',
      card: '起手抽到、被壓獎賞卡和重抽的機率。',
      intro:
        '輸入某張卡在牌組中的張數，即可看到起手、第一回合前抽到它的機率，以及它被壓在獎賞卡的機率。輸入基礎寶可夢的數量，就能看到重抽的機率。',
      sections: [
        {
          h: '機率是怎樣計算的？',
          p: [
            '從洗好的牌組抽牌屬於「超幾何分佈」問題：牌組張數和某張卡的數量固定，抽出的牌不會放回。計算器使用精確的超幾何公式，而不是模擬，所以只要牌組洗得公平，結果就是準確的。',
            '獎賞卡是同一副洗好的牌組中隨機的 6 張，所以某張卡被壓在獎賞卡的機率，與你先抽到甚麼無關。平均而言，牌組有 10%（60 張中的 6 張）會成為獎賞卡。',
          ],
        },
        {
          h: '60 張牌組的常用數字',
          p: [
            '放 4 張同一張卡時，起手 7 張中至少有一張的機率約為 40%，至少一張被壓在獎賞卡的機率約為 35%。只放 1 張的話，有 10% 機率被壓，所以玩家通常會為關鍵卡放 2 張，或加入檢索牌組的卡。',
            '重抽機率取決於基礎寶可夢的數量。放 10 張基礎寶可夢時，起手沒有基礎寶可夢的機率約為 26%；14 張時約為 14%；20 張時約為 5%。',
          ],
        },
        {
          h: '第一回合時看過的牌數',
          p: [
            '雙方每個回合開始時都會抽一張牌，包括先攻玩家的第一回合。所以當你打出第一張牌時，已經看過 8 張（起手 7 張加 1 張抽牌）。可以調整「看過的牌數」，模擬支援者或檢索效果帶來的額外抽牌。',
          ],
        },
      ],
      faq: [
        {
          q: '4 張同名卡全部被壓在獎賞卡的機率是多少？',
          a: '60 張牌組中約為 0.003%，大約每 32,000 局才會發生一次。4 張之中有 2 張或以上被壓的機率約為 4.6%。',
        },
        {
          q: '重抽會影響機率嗎？',
          a: '重抽時會洗牌再抽 7 張，所以新手牌的機率與第一次相同，只是你知道新手牌至少有一張基礎寶可夢。',
        },
        {
          q: '可以計算一組功能相同的卡嗎？',
          a: '可以。把功能相同的卡加起來當作張數輸入，例如所有抽牌用的支援者。',
        },
      ],
      guides: ['deck-building-probability', 'prize-cards-and-winning'],
    },
    'damage-calculator': {
      icon: '💥',
      tint: 'from-rose-500/20 to-red-500/5',
      seoTitle: '寶可夢卡牌傷害計算器：弱點、抵抗力與擊倒判斷 | PTCG Companion',
      title: '寶可夢卡牌傷害計算器',
      description:
        '按官方次序計算寶可夢卡牌招式傷害：基本傷害、攻擊方效果、弱點 ×2、抵抗力 −30 及防守方效果，並判斷是否擊倒。',
      card: '按正確次序計算弱點、抵抗力和加成。',
      intro:
        '填入招式和防守方寶可夢的資料。計算器會按規則書的次序逐步計算，並告訴你這次攻擊能否擊倒對手的戰鬥寶可夢。',
      sections: [
        {
          h: '官方計算次序',
          p: [
            '招式印著的基本傷害（如果招式文字有 × 或 +，先按文字計好）。\n攻擊方寶可夢身上的效果，例如增加傷害的寶可夢道具或特性。\n弱點：×2。\n抵抗力：−30。\n防守方寶可夢身上減少傷害的效果。',
            '結果為 0 或以下即不造成傷害。次序之所以重要，是因為弱點會把之前加上的傷害一併加倍。90 傷害的招式加 30，打中有弱點的寶可夢是 240，而不是 210。',
          ],
        },
        {
          h: '弱點和抵抗力不適用的情況',
          p: [
            '弱點和抵抗力只計算對戰鬥場寶可夢造成的傷害。對備戰寶可夢造成的傷害不計弱點和抵抗力，除非招式另有說明。「放置傷害指示物」而不是「造成傷害」的效果，會跳過所有步驟；中毒、灼傷和混亂的傷害也一樣。',
          ],
        },
      ],
      faq: [
        {
          q: '弱點一定是 ×2 嗎？',
          a: '現代印刷的卡牌都是 ×2。部分舊卡的弱點寫作 +10、+20 或 +30，這類卡要直接加上數值，而不是加倍。',
        },
        {
          q: '抵抗力一定是 −30 嗎？',
          a: '現代卡牌的抵抗力是 −30，舊卡可能是 −20。請按卡上印著的數值選擇。',
        },
        {
          q: '要放多少個傷害指示物？',
          a: '一個傷害指示物代表 10 傷害，把最終傷害除以 10 即可。',
        },
      ],
      guides: ['damage-calculation', 'special-conditions'],
    },
  },
};

export const toolsContent = { en, 'zh-TW': zhTW } as const;

/** Labels used inside the interactive tools. */
export const toolUi = {
  en: {
    tapToFlip: 'Tap the coin to flip',
    flip: 'Flip',
    flipN: 'Flip {n} coins',
    coins: 'Coins',
    untilTails: 'Flip until tails',
    heads: 'Heads',
    tails: 'Tails',
    headsOf: '{h} heads of {n}',
    headsBeforeTails: '{h} heads before tails',
    history: 'Session tally',
    resetTally: 'Reset',
    flips: 'flips',
    deckSize: 'Deck size',
    copies: 'Copies of the card',
    seen: 'Cards seen',
    seenHint: '7 = opening hand, 8 = after your first draw',
    basics: 'Basic Pokémon in deck',
    atLeastOne: 'At least 1 in the first {n} cards',
    inOpening: 'At least 1 in your opening hand',
    prizedAny: 'At least 1 prized',
    prizedAll: 'All copies prized',
    mulligan: 'Chance of a mulligan',
    exactly: 'Exactly',
    inHand: 'In opening hand',
    inPrizes: 'In Prize cards',
    distribution: 'How many copies you get',
    oneIn: '1 in {n}',
    baseDamage: 'Base damage',
    attackerBonus: 'Attacker effects (+)',
    weakness: 'Weakness',
    resistance: 'Resistance',
    defenderReduction: 'Defender effects (−)',
    hp: 'Defending Pokémon HP',
    existing: 'Damage already on it',
    none: 'None',
    result: 'Damage done',
    counters: '{n} damage counters',
    ko: 'Knock Out!',
    noKo: '{n} HP left',
    hitsToKo: '{n} more attacks like this to KO',
    steps: 'Step by step',
    stepBase: 'Base damage',
    stepAttacker: 'Attacker effects',
    stepWeak: 'Weakness',
    stepRes: 'Resistance',
    stepDef: 'Defender effects',
    reset: 'Reset',
  },
  'zh-TW': {
    tapToFlip: '點一下硬幣擲出',
    flip: '擲硬幣',
    flipN: '擲 {n} 枚',
    coins: '硬幣數量',
    untilTails: '擲到反面為止',
    heads: '正面',
    tails: '反面',
    headsOf: '{n} 枚中 {h} 枚正面',
    headsBeforeTails: '出現反面前有 {h} 次正面',
    history: '本次統計',
    resetTally: '重設',
    flips: '次',
    deckSize: '牌組張數',
    copies: '該卡張數',
    seen: '看過的牌數',
    seenHint: '7 = 起手，8 = 第一次抽牌後',
    basics: '牌組中的基礎寶可夢',
    atLeastOne: '首 {n} 張中至少 1 張',
    inOpening: '起手至少 1 張',
    prizedAny: '至少 1 張被壓獎賞卡',
    prizedAll: '全部被壓獎賞卡',
    mulligan: '需要重抽的機率',
    exactly: '剛好',
    inHand: '起手手牌',
    inPrizes: '獎賞卡',
    distribution: '會拿到多少張',
    oneIn: '約 {n} 局 1 次',
    baseDamage: '基本傷害',
    attackerBonus: '攻擊方效果（+）',
    weakness: '弱點',
    resistance: '抵抗力',
    defenderReduction: '防守方效果（−）',
    hp: '防守方寶可夢 HP',
    existing: '已有傷害',
    none: '無',
    result: '造成傷害',
    counters: '{n} 個傷害指示物',
    ko: '擊倒！',
    noKo: '剩餘 {n} HP',
    hitsToKo: '還需同樣攻擊 {n} 次才能擊倒',
    steps: '計算步驟',
    stepBase: '基本傷害',
    stepAttacker: '攻擊方效果',
    stepWeak: '弱點',
    stepRes: '抵抗力',
    stepDef: '防守方效果',
    reset: '重設',
  },
} as const;
export type ToolUi = { [K in keyof typeof toolUi.en]: string };
