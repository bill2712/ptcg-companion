// Page copy for the match tracker, deck checker and tournament calculator.
// Merged into toolsContent so these pages share the tool page template.
import type { ToolCopy } from './toolsContent';

export const extraToolSlugs = ['match-tracker', 'deck-checker', 'tournament-calculator'] as const;
export type ExtraToolSlug = typeof extraToolSlugs[number];

const en: Record<ExtraToolSlug, ToolCopy> = {
  'match-tracker': {
    icon: '📊',
    tint: 'from-emerald-500/20 to-green-500/5',
    seoTitle: 'Pokémon TCG Match Tracker: Win Rate & Matchup Stats | PTCG Companion',
    title: 'Pokémon TCG Match Tracker',
    description:
      'Log your Pokémon TCG games and see your win rate, matchup spread and going-first vs going-second stats for every deck. Free, private and works offline.',
    card: 'Log games and see your win rate and matchups.',
    intro:
      'Save each game in a few taps: your deck, your opponent\'s deck, the result and whether you went first. The tracker works out your win rate, your best and worst matchups and your recent form. Everything stays in your browser.',
    sections: [
      {
        h: 'Why track your games?',
        p: [
          'Memory is a poor judge of a deck. A painful loss sticks with you longer than three easy wins, so many players think a matchup is worse (or better) than it is. Writing down every game, even casual ones, gives you numbers to decide with: which deck to bring to the next event, which matchups need practice, and which tech cards are worth a slot.',
          'Top players do this as a habit. They keep a record of every testing game, note how each loss happened, and only change their list when the results show a pattern.',
        ],
      },
      {
        h: 'How to read your stats',
        p: [
          'Win rate is the share of games you won; a tie counts as a game you did not win. Around 50% against the field is average. A deck that wins 55% or more over many games is doing well, and anything under 45% in a matchup is a sign to change your plan or your list.',
          'Small samples are noisy. After 10 games a 60% win rate could easily be a 45% deck on a good run, so wait for 20 to 30 games in a matchup before drawing strong conclusions.',
          'The going first and going second numbers help with the coin flip at the start of each game. If your deck wins clearly more often going second, choose to go second when you win the flip.',
        ],
      },
      {
        h: 'Log games straight from the match counter',
        p: [
          'When a game ends in the PTCG Companion match counter, the win screen has a "Save to match tracker" button. It opens this page with the result and who went first already filled in, so you only add the deck names.',
        ],
      },
      {
        h: 'Your data stays on your device',
        p: [
          'Games are saved in your browser\'s local storage. Nothing is uploaded and you do not need an account. Use Export backup to save a file you can import on another phone or computer, or Export CSV to open your games in a spreadsheet.',
        ],
      },
    ],
    faq: [
      {
        q: 'Do I need an account?',
        a: 'No. The tracker saves games in your browser. Export a backup file if you want to move them to another device.',
      },
      {
        q: 'Will my games be lost if I clear my browser data?',
        a: 'Yes. Clearing site data removes the saved games, so export a backup now and then.',
      },
      {
        q: 'How should I name decks?',
        a: 'Use the same short name every time, such as the main attacker. The tracker suggests names you have used before so the stats stay grouped together.',
      },
      {
        q: 'Can I track best-of-three matches?',
        a: 'Log each game separately. That gives you more data for win rate and going first versus second, and you can add the event name to group them.',
      },
    ],
    guides: ['going-first-and-mulligans', 'match-timer-and-tournament-play', 'how-to-use-ptcg-companion'],
  },
  'deck-checker': {
    icon: '🃏',
    tint: 'from-lime-500/20 to-green-500/5',
    seoTitle: 'Pokémon TCG Deck Checker & Opening Hand Simulator | PTCG Companion',
    title: 'Pokémon TCG Deck Checker & Opening Hand Simulator',
    description:
      'Paste a Pokémon TCG Live deck list to check it has 60 cards and no more than 4 copies, see the odds of opening each card, and draw sample hands with Prize cards.',
    card: 'Paste a list, check it, and draw test hands.',
    intro:
      'Paste your deck list to check that it is legal, see how often you open with each card, and draw test hands with 6 Prize cards. Tick your Basic Pokémon to see your exact mulligan rate.',
    sections: [
      {
        h: 'What the checker looks for',
        p: [
          'A Standard or Expanded deck has exactly 60 cards, and no more than 4 cards with the same name, except Basic Energy. The checker counts your Pokémon, Trainer and Energy cards, adds up copies of the same card from different sets, and flags anything over 4.',
          'Some rules depend on the card itself: a deck can have only one ACE SPEC card and one Radiant Pokémon, and only cards legal in the format you play. The checker cannot see card text, so check these yourself.',
        ],
      },
      {
        h: 'How to paste a list from Pokémon TCG Live',
        p: [
          'Open the deck in Pokémon TCG Live and choose Export to copy the list.\nPaste it into the box on this page.\nTick each Basic Pokémon in the card odds table.\nPress "Draw a hand" to test opening hands.',
          'You can also type a list by hand with one card per line, starting with the number of copies, for example "4 Nest Ball". Set codes and collector numbers at the end of a line are ignored when the checker counts copies.',
        ],
      },
      {
        h: 'Why goldfish opening hands?',
        p: [
          'Drawing test hands without an opponent, called goldfishing, is the fastest way to feel how consistent a deck is. Draw 10 or 20 hands and ask: can I set up a Basic and a draw Supporter on my first turn? If most hands cannot, you may need more search cards or more Basic Pokémon.',
          'The Prize cards matter too. Turn them over to see how often a key card is stuck in your Prizes, and whether your deck has a way to play around it.',
        ],
      },
      {
        h: 'Reading the card odds',
        p: [
          'Each row shows the exact chance of having at least one copy in your opening 7 cards, by your first turn (8 cards seen), and in your 6 Prize cards. These use the same hypergeometric maths as our probability calculator, so they are exact for a fairly shuffled deck.',
        ],
      },
    ],
    faq: [
      {
        q: 'Why do I have to tick Basic Pokémon myself?',
        a: 'A deck list only has card names, not whether a Pokémon is a Basic or an Evolution. Tick each Basic once and the tool remembers it with your saved deck.',
      },
      {
        q: 'Does it check whether cards are legal in Standard?',
        a: 'No. It checks the deck size and the 4-copy rule. Check the current Standard rotation and ban list before an event.',
      },
      {
        q: 'Is the shuffle fair?',
        a: 'Yes. The simulator shuffles with your browser\'s cryptographic random number generator, so every order of the deck is equally likely.',
      },
      {
        q: 'Where are saved decks stored?',
        a: 'In your browser only. Saved deck names also appear as suggestions in the match tracker.',
      },
    ],
    guides: ['how-to-build-a-pokemon-deck', 'deck-building-probability', 'going-first-and-mulligans'],
  },
  'tournament-calculator': {
    icon: '🏆',
    tint: 'from-slate-500/20 to-zinc-500/5',
    seoTitle: 'Pokémon TCG Tournament Calculator: Swiss Rounds & Top Cut Odds | PTCG Companion',
    title: 'Pokémon TCG Tournament Calculator',
    description:
      'Find how many Swiss rounds and what top cut a Pokémon TCG tournament has for your player count, the record you need to make top cut, and your odds from your current record.',
    card: 'Swiss rounds, top cut and the record you need.',
    intro:
      'Enter the number of players to see how many Swiss rounds to expect, how big the top cut is, and which records usually make it. Then enter your record during the event to see your chances.',
    sections: [
      {
        h: 'How Swiss rounds work',
        p: [
          'In a Swiss tournament nobody is knocked out early. Every round, players are paired against opponents with the same or a similar number of match points. A win is worth 3 points, a tie 1 point and a loss 0. If there is an odd number of players, one player gets a bye, which counts as a win.',
          'After the last Swiss round, the top players by match points go through to a single-elimination top cut. Players on the same points are separated by tiebreakers, the first of which is Opponents\' Win Percentage: the stronger your opponents\' records, the higher you finish.',
        ],
      },
      {
        h: 'Typical rounds and top cut by player count',
        p: [
          '4 to 8 players: 3 rounds, no top cut.\n9 to 12 players: 4 rounds, top 2.\n13 to 20 players: 5 rounds, top 4.\n21 to 32 players: 5 rounds, top 8.\n33 to 64 players: 6 rounds, top 8.\n65 to 128 players: 7 rounds, top 8.\n129 to 226 players: 8 rounds, top 8.\n227 to 409 players: 9 rounds, top 16.',
          'This is the structure commonly used for one-day, best-of-three events. Larger championships often run over two days with a different structure, and organisers can make changes, so always check the event page. Tick "Set rounds and top cut myself" to enter a different structure.',
        ],
      },
      {
        h: 'What record do I need?',
        p: [
          'The calculator runs thousands of simulated events with your player count, pairs players by points each round, and counts how often each final record makes top cut. A record marked "usually safe" made top cut in at least 90% of simulations. Records "on the bubble" make it some of the time, depending on tiebreakers.',
          'Ties change the maths. A tie is worth one point, which is often more useful than it looks: with 64 players, 6 rounds and a top 8, a 4-1-1 record makes the cut most of the time, while 4-2-0 almost never does. In the final rounds, players who are guaranteed a spot with a tie may agree to an intentional draw, which the simulation does not model.',
        ],
      },
    ],
    faq: [
      {
        q: 'How many points is a win, a tie and a loss?',
        a: 'A win is 3 match points, a tie is 1 and a loss is 0. A bye counts as a win.',
      },
      {
        q: 'Why is my chance not 100% even with a good record?',
        a: 'Players on the same points are ranked by tiebreakers, mostly Opponents\' Win Percentage. On the bubble, two players with the same record can finish on different sides of the cut.',
      },
      {
        q: 'Is the number of rounds always the same?',
        a: 'No. The table shows a common structure, but organisers and large championships can differ. Use the custom option to match your event.',
      },
      {
        q: 'Does the calculator know how good my deck is?',
        a: 'No. Every simulated match is 50/50, so the odds show what a record is worth, not how likely you are to get it.',
      },
    ],
    guides: ['match-timer-and-tournament-play', 'standard-expanded-and-rotation', 'prize-cards-and-winning'],
  },
};

const zhTW: Record<ExtraToolSlug, ToolCopy> = {
  'match-tracker': {
    icon: '📊',
    tint: 'from-emerald-500/20 to-green-500/5',
    seoTitle: '寶可夢卡牌戰績記錄：勝率及對局數據統計 | PTCG Companion',
    title: '寶可夢卡牌戰績記錄',
    description:
      '記錄每一局寶可夢卡牌對戰，自動統計每副牌組的勝率、各對局勝率，以及先攻和後攻的表現。免費、資料只保存在你的裝置，可離線使用。',
    card: '記錄對局，自動計算勝率和對局表現。',
    intro:
      '只需幾下就能記錄一局：你的牌組、對手的牌組、結果，以及你是先攻還是後攻。工具會自動計算勝率、最強和最弱的對局，以及近期狀態。所有資料只保存在你的瀏覽器。',
    sections: [
      {
        h: '為甚麼要記錄戰績？',
        p: [
          '單憑記憶判斷一副牌組並不可靠。一場慘敗往往比三場輕鬆的勝利更令人難忘，所以很多玩家會誤判某個對局的強弱。把每一局都記下來，即使只是練習，就有數據幫你決定：下次比賽帶哪副牌組、哪些對局需要多練，以及哪張針對卡值得放進牌組。',
          '頂尖玩家都有這個習慣。他們會記錄每一局練習，寫下每次落敗的原因，只有在數據顯示出規律時才修改牌表。',
        ],
      },
      {
        h: '怎樣解讀你的數據',
        p: [
          '勝率是勝出局數佔總局數的比例，和局當作沒有勝出。面對各種牌組時，50% 左右屬於平均水平。長期勝率達到 55% 或以上的牌組表現不錯；如果某個對局低於 45%，就應考慮改變打法或調整牌表。',
          '樣本太少時，數字會有很大波動。只打了 10 局的話，60% 勝率也可能只是一副 45% 的牌組剛好手氣好，所以同一對局最好累積 20 至 30 局，才下明確的結論。',
          '先攻和後攻的勝率，可以幫你決定開局擲硬幣猜中後的選擇。如果你的牌組後攻明顯勝得較多，猜中時就可以選擇後攻。',
        ],
      },
      {
        h: '從對戰計分器直接記錄',
        p: [
          '在 PTCG Companion 對戰計分器中分出勝負後，勝利畫面會出現「記錄到戰績」按鈕。按下後會開啟本頁，並自動填好結果和先後攻，你只需補上牌組名稱即可。',
        ],
      },
      {
        h: '資料只保存在你的裝置',
        p: [
          '對局記錄保存在瀏覽器的本機儲存空間，不會上傳，也不需要註冊帳戶。你可以使用「匯出備份」儲存檔案，再在另一部手機或電腦匯入；也可以「匯出 CSV」，用試算表開啟所有對局。',
        ],
      },
    ],
    faq: [
      {
        q: '需要註冊帳戶嗎？',
        a: '不需要。所有對局都保存在你的瀏覽器。如想轉移到另一部裝置，可以匯出備份檔案。',
      },
      {
        q: '清除瀏覽器資料後，記錄會消失嗎？',
        a: '會。清除網站資料會一併刪除已儲存的對局，所以建議定期匯出備份。',
      },
      {
        q: '牌組應該怎樣命名？',
        a: '每次都用同一個簡短的名稱，例如主要攻擊手的名字。工具會建議你用過的名稱，讓數據歸類在一起。',
      },
      {
        q: '可以記錄三局兩勝的比賽嗎？',
        a: '建議每一局分開記錄，這樣勝率和先後攻的數據會更多。你也可以填上賽事名稱，方便歸類。',
      },
    ],
    guides: ['going-first-and-mulligans', 'match-timer-and-tournament-play', 'how-to-use-ptcg-companion'],
  },
  'deck-checker': {
    icon: '🃏',
    tint: 'from-lime-500/20 to-green-500/5',
    seoTitle: '寶可夢卡牌牌組檢查及起手模擬器 | PTCG Companion',
    title: '寶可夢卡牌牌組檢查及起手模擬器',
    description:
      '貼上 Pokémon TCG Live 牌表，即可檢查是否剛好 60 張、有沒有超過 4 張同名卡，查看每張卡的起手機率，並模擬抽起手和獎賞卡。',
    card: '貼上牌表，檢查牌組並模擬起手。',
    intro:
      '貼上你的牌表，檢查牌組是否合規，查看每張卡在起手出現的機率，並模擬抽 7 張起手和 6 張獎賞卡。勾選基礎寶可夢後，還能看到精確的重抽機率。',
    sections: [
      {
        h: '檢查甚麼項目？',
        p: [
          '標準及開放賽制的牌組必須剛好 60 張，同名的卡最多 4 張，基本能量除外。本工具會統計寶可夢、訓練家和能量卡的數量，把不同系列的同名卡合併計算，並標示超過 4 張的卡。',
          '部分規則取決於卡牌本身：每副牌組只可放 1 張 ACE SPEC 卡和 1 隻光輝寶可夢，而且只能使用該賽制允許的卡。本工具無法讀取卡牌文字，請自行檢查這些項目。',
        ],
      },
      {
        h: '如何貼上 Pokémon TCG Live 的牌表',
        p: [
          '在 Pokémon TCG Live 開啟牌組，選擇「匯出」複製牌表。\n貼到本頁的輸入框。\n在每張卡的機率表中勾選基礎寶可夢。\n按「抽起手」測試開局手牌。',
          '你也可以自行輸入牌表，每行一張卡，以張數開頭，例如「4 巢穴球」。行末的系列代號和卡號在計算張數時會被忽略。',
        ],
      },
      {
        h: '為甚麼要模擬起手？',
        p: [
          '在沒有對手的情況下抽測試手牌，是最快了解牌組穩定性的方法。抽 10 至 20 手，問問自己：第一回合能否放出基礎寶可夢並使用抽牌支援者？如果大部分手牌都做不到，就可能需要更多檢索卡或基礎寶可夢。',
          '獎賞卡同樣重要。翻開獎賞卡，看看關鍵卡被壓的頻率，以及牌組有沒有方法應對。',
        ],
      },
      {
        h: '怎樣解讀卡牌機率',
        p: [
          '每一行顯示該卡至少一張出現在起手 7 張、第一回合（看過 8 張）以及 6 張獎賞卡中的精確機率。計算方法與我們的機率計算器相同，都是超幾何分佈，只要牌組洗得公平，結果就是準確的。',
        ],
      },
    ],
    faq: [
      {
        q: '為甚麼要自己勾選基礎寶可夢？',
        a: '牌表只有卡名，無法分辨寶可夢是基礎還是進化。每張基礎寶可夢只需勾選一次，工具會隨牌組一併儲存。',
      },
      {
        q: '會檢查卡牌是否可在標準賽制使用嗎？',
        a: '不會。本工具只檢查牌組張數和 4 張限制。參加比賽前，請查閱最新的標準賽制輪替和禁卡表。',
      },
      {
        q: '洗牌公平嗎？',
        a: '公平。模擬器使用瀏覽器的加密級亂數產生器洗牌，牌組每一種排列出現的機率都相同。',
      },
      {
        q: '已儲存的牌組放在哪裏？',
        a: '只保存在你的瀏覽器。已儲存的牌組名稱也會在戰績記錄中出現，方便選擇。',
      },
    ],
    guides: ['how-to-build-a-pokemon-deck', 'deck-building-probability', 'going-first-and-mulligans'],
  },
  'tournament-calculator': {
    icon: '🏆',
    tint: 'from-slate-500/20 to-zinc-500/5',
    seoTitle: '寶可夢卡牌賽事計算器：瑞士輪數及晉級決賽圈機率 | PTCG Companion',
    title: '寶可夢卡牌賽事計算器',
    description:
      '按參賽人數計算寶可夢卡牌比賽的瑞士輪數和決賽圈人數、晉級需要的戰績，以及按目前戰績計算的晉級機率。',
    card: '瑞士輪數、決賽圈和晉級所需戰績。',
    intro:
      '輸入參賽人數，即可知道大約要打多少輪瑞士輪、決賽圈取多少人，以及甚麼戰績通常可以晉級。比賽期間輸入目前戰績，就能看到晉級機率。',
    sections: [
      {
        h: '瑞士輪是怎樣運作的？',
        p: [
          '瑞士輪賽制中，沒有人會提早被淘汰。每一輪，系統會安排積分相同或相近的玩家對戰。勝出得 3 分，和局得 1 分，落敗得 0 分。如果參賽人數是單數，會有一名玩家輪空，輪空當作勝出。',
          '最後一輪瑞士輪結束後，積分最高的玩家晉級單淘汰制的決賽圈。積分相同的玩家以小分排名，首要的小分是「對手勝率」：你遇到的對手戰績越好，你的排名就越高。',
        ],
      },
      {
        h: '不同人數的常見輪數和決賽圈',
        p: [
          '4 至 8 人：3 輪，不設決賽圈。\n9 至 12 人：4 輪，前 2 名晉級。\n13 至 20 人：5 輪，前 4 名晉級。\n21 至 32 人：5 輪，前 8 名晉級。\n33 至 64 人：6 輪，前 8 名晉級。\n65 至 128 人：7 輪，前 8 名晉級。\n129 至 226 人：8 輪，前 8 名晉級。\n227 至 409 人：9 輪，前 16 名晉級。',
          '以上是單日、三局兩勝賽事常用的賽制。大型錦標賽通常分兩天進行，賽制有所不同，主辦單位亦可能作出調整，請以賽事公佈為準。勾選「自行設定輪數和晉級人數」即可輸入其他賽制。',
        ],
      },
      {
        h: '需要甚麼戰績才能晉級？',
        p: [
          '計算器會按你輸入的人數模擬數千場賽事，每輪按積分配對，再統計每種最終戰績晉級決賽圈的比例。標示為「通常穩入」的戰績，在至少 90% 的模擬中晉級；「邊緣位置」的戰績則視乎小分，有時晉級，有時落選。',
          '和局會改變計算結果。和局有 1 分，往往比想像中有用：64 人、6 輪取前 8 名時，4-1-1 大多可以晉級，而 4-2-0 幾乎一定落選。在最後幾輪，已確保和局即可晉級的玩家可能會協議和局，模擬並未計算這種情況。',
        ],
      },
    ],
    faq: [
      {
        q: '勝、和、負各得多少分？',
        a: '勝出得 3 分，和局得 1 分，落敗得 0 分。輪空當作勝出。',
      },
      {
        q: '為甚麼戰績很好，機率仍然不是 100%？',
        a: '積分相同的玩家以小分排名，主要是對手勝率。在邊緣位置，兩名戰績相同的玩家可能一個晉級、一個落選。',
      },
      {
        q: '輪數一定相同嗎？',
        a: '不一定。表中是常見的賽制，主辦單位和大型錦標賽可能不同。可使用自訂選項配合你的賽事。',
      },
      {
        q: '計算器知道我的牌組有多強嗎？',
        a: '不知道。每場模擬對戰都是勝負各半，所以機率反映的是某個戰績的價值，而不是你取得這個戰績的可能性。',
      },
    ],
    guides: ['match-timer-and-tournament-play', 'standard-expanded-and-rotation', 'prize-cards-and-winning'],
  },
};

export const extraTools = { en, 'zh-TW': zhTW } as const;
