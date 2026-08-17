// js/fengshen.js — 封神密室逃脫陣法體系、Q版守護仙人與互動對白資料庫

/**
 * 五大封神密室陣法定義（對應 5 大章節 50 關）
 */
export const FENGSHEN_ARRAYS = [
  {
    chapter: 1,
    id: 'array-taiji',
    name: '乾坤太極陣',
    title: '初窺門徑・乾坤太極陣',
    alias: '太極清虛密室',
    element: '金石玄氣',
    color: '#2A4D69',
    accentColor: '#4A90E2',
    levelRange: [1, 10],
    guardian: {
      id: 'jiangziya',
      name: '姜子牙',
      title: '封神統帥・太公望',
      shortTitle: '太公引路',
      badge: '玄機天師',
      greeting: '道友請留步！老夫已在此等候多時。此陣乃太極初開之試煉，心無雜念方能尋出真章！',
      clickQuotes: [
        '「太極生兩儀，字句藏玄機。若遇窒礙，不妨研墨求籤。」',
        '「四字成語如陣法四柱，連點成線，陣眼自破！」',
        '「莫慌莫急，老夫的打神鞭正為你照亮文思。」',
        '「文王得吾而興周，你得墨寶而通神！」',
        '「細觀橫豎之間，文字之美，正是破陣之匙。」'
      ],
      findQuotes: [
        '妙哉！此句一出，太極陰陽生生不息！',
        '正中陣眼！道友文采斐然！',
        '太極符印解開一角，破陣指日可待！'
      ],
      hintQuotes: [
        '老夫以杏黃旗為你指引一線天機！',
        '打神鞭金光現，答案就在眼前！'
      ],
      quizQuotes: [
        '答善哉！博聞強記，文思如泉湧，墨汁自聚！'
      ],
      timeoutQuotes: [
        '陣法逆轉！莫慌，老夫祭出杏黃旗護你出陣，整頓心神再來一次！'
      ],
      winQuotes: [
        '大善！太極陣眼已開，封神榜上當有道友赫赫大名！'
      ]
    },
    lore: '殷商未滅，仙陣初啟。太公以杏黃旗引路，助天下士子參悟太極陰陽，開闢文道坦途。',
    treasureShard: {
      id: 'dashanbian_shard',
      name: '打神鞭・靈光碎片',
      icon: '⚡',
      desc: '姜太公號令三界諸神之法寶碎片，凝聚浩然正氣。'
    }
  },
  {
    chapter: 2,
    id: 'array-huanghe',
    name: '九曲黃河陣',
    title: '廟口智慧・九曲黃河陣',
    alias: '濁浪混元金斗密室',
    element: '萬頃金斗',
    color: '#B3402A',
    accentColor: '#FF6B4A',
    levelRange: [11, 20],
    guardian: {
      id: 'nezha',
      name: '哪吒',
      title: '中壇元帥・蓮花童子',
      shortTitle: '三太子護法',
      badge: '降妖先鋒',
      greeting: '嘿！小爺哪吒來也！九曲黃河浪再高，也擋不住小爺的乾坤圈！看準字句，衝啊！',
      clickQuotes: [
        '「三頭六臂顯神通，區區九曲陣，小爺一槍挑破！」',
        '「風火輪轉動起來，找成語的速度就要像踩風一樣快！」',
        '「別怕迷失在黃河浪濤裡，點我隨時給你打氣！」',
        '「乾坤圈一擲定乾坤，字句連貫就是力量！」',
        '「想要墨水？快去答題，小爺陪你贏個痛快！」'
      ],
      findQuotes: [
        '好耶！一擊即中！乾坤圈都為你閃閃發光啦！',
        '太帥了！九曲浪潮退避三分！',
        '哈哈！又破掉一個封印，小爺佩服你！'
      ],
      hintQuotes: [
        '看小爺的風火輪為你照亮此字！',
        '混天綾一揮，陣法迷霧散開！'
      ],
      quizQuotes: [
        '太厲害了！墨水滿滿，小爺給你點讚！'
      ],
      timeoutQuotes: [
        '哇呀！浪頭打過來了！抓緊小爺的混天綾，我們飛出去重整旗鼓再來！'
      ],
      winQuotes: [
        '乾坤破浪，凱旋而歸！九曲黃河陣被我們踩在腳下啦！'
      ]
    },
    lore: '三宵娘娘擺下九曲黃河大陣，內藏混元金斗。哪吒腳踏風火輪，率你乘風破浪，以文破陣。',
    treasureShard: {
      id: 'qiankunquan_shard',
      name: '乾坤圈・純金殘片',
      icon: '⭕',
      desc: '哪吒降妖伏魔之至寶碎片，擲出如流星破空。'
    }
  },
  {
    chapter: 3,
    id: 'array-shijue',
    name: '十絕烈焰陣',
    title: '成語風雲・十絕烈焰陣',
    alias: '烈火神瞳密室',
    element: '三昧天火',
    color: '#5C3D75',
    accentColor: '#9D65C9',
    levelRange: [21, 30],
    guardian: {
      id: 'yangjian',
      name: '楊戩',
      title: '清源妙道・二郎真君',
      shortTitle: '真君神目',
      badge: '昭惠真君',
      greeting: '本君在此。神目所視，洞察秋毫。任憑十絕陣烈火迷障，文字破綻無所遁形！',
      clickQuotes: [
        '「天眼所及，萬法歸真。凝神靜氣，自能勘破陣眼。」',
        '「哮天犬已嗅出字句線索，道友切莫急躁。」',
        '「三尖兩刃刀利可斷金，成語亦須精準無誤方能落筆。」',
        '「七十二變應萬變，遇到交叉字格更要靈活轉變。」',
        '「臨危不亂，方顯大將之風。」'
      ],
      findQuotes: [
        '神目如電！此句正是十絕陣關鍵陣眼！',
        '精準無差，真君天眼亦為之讚許！',
        '烈焰煞氣削弱一層，破陣已在眼前！'
      ],
      hintQuotes: [
        '天眼開！陣法虛妄盡破，此處便是天機！',
        '三尖兩刃刀引出靈光，道友請看！'
      ],
      quizQuotes: [
        '智勇雙全，博學多聞，真不愧破陣英豪！'
      ],
      timeoutQuotes: [
        '烈焰漫天！哮天犬已撕開生門裂隙，隨本君退回重思破陣良策！'
      ],
      winQuotes: [
        '十絕陣破，神光普照！道友真有昭惠真君之智謀！'
      ]
    },
    lore: '十絕陣神煞交錯，烈焰焚天。二郎神楊戩攜哮天犬，以通天神目助你勘破萬千字障。',
    treasureShard: {
      id: 'sanjianliangren_shard',
      name: '三尖兩刃刀・神鋒碎刃',
      icon: '🗡️',
      desc: '二郎真君斬妖除魔之無上神兵碎片，鋒銳無匹。'
    }
  },
  {
    chapter: 4,
    id: 'array-wanxian',
    name: '萬仙風雷陣',
    title: '龍虎混戰・萬仙風雷陣',
    alias: '風雷萬煞密室',
    element: '九天雷霆',
    color: '#1E3C72',
    accentColor: '#38EF7D',
    levelRange: [31, 40],
    guardian: {
      id: 'leizhenzi',
      name: '雷震子',
      title: '九天風雷・金剛飛將',
      shortTitle: '風雷破陣',
      badge: '雷部神將',
      greeting: '雷聲滾滾，風雷雙翼！萬仙陣煞氣雖重，有俺雷震子一棒為你掃開重重迷霧！',
      clickQuotes: [
        '「雙翼生風雷，震碎妖邪膽！破陣就要一氣呵成！」',
        '「黃金棍在手，字字力透紙背！」',
        '「天雷降世，照亮迷津！跟緊俺的雷光！」',
        '「萬仙陣變化多端，看準線索，雷霆出擊！」',
        '「墨水充沛，雷力更強！隨時準備全力一擊！」'
      ],
      findQuotes: [
        '轟雷一聲響！陣法封印被你一擊擊碎！',
        '痛快！這成語找得乾淨俐落！',
        '風雷之勢不可擋，萬仙陣眼動搖了！'
      ],
      hintQuotes: [
        '金剛天雷劈開迷局，靈字已現！',
        '風雷雙翼煽起神風，為你指路！'
      ],
      quizQuotes: [
        '答得好！雷霆文思，沛然莫之能禦！'
      ],
      timeoutQuotes: [
        '萬仙陣煞雲合攏！上俺的風雷雙翼，俺帶你衝破重圍重新殺回！'
      ],
      winQuotes: [
        '雷破萬仙，威震乾坤！天下誰人不識君！'
      ]
    },
    lore: '萬仙大陣包羅萬象，二十八宿、風雷交加。雷震子手持黃金棍，以風雷之力為你破開重重字劫。',
    treasureShard: {
      id: 'fengleiyi_shard',
      name: '風雷雙翼・神金羽翎',
      icon: '🪶',
      desc: '雷震子御風御雷之雙翼羽翎，蘊含疾風與雷霆之力。'
    }
  },
  {
    chapter: 5,
    id: 'array-zhuxian',
    name: '誅仙萬劫陣',
    title: '宗師試煉・誅仙萬劫陣',
    alias: '太乙混元玄宮',
    element: '先天混沌',
    color: '#634B00',
    accentColor: '#F5A623',
    levelRange: [41, 50],
    guardian: {
      id: 'taiyi',
      name: '太乙真人',
      title: '乾元泰斗・九龍真仙',
      shortTitle: '太乙點化',
      badge: '混元大羅',
      greeting: '無量天尊！誅仙大陣乃萬劫之終極試煉。貧道特賜九龍神火罩，助道友摘章尋句，登頂封神！',
      clickQuotes: [
        '「誅仙四劍非同小可，唯胸藏萬卷書者方能化解。」',
        '「道生一，一生二，二生三，三生萬物。字字皆道法。」',
        '「九龍真火煉真金，歷經磨礪方成文道大宗師。」',
        '「心如止水，自能看穿最複雜的字格縱橫。」',
        '「貧道拂塵一揮，便是萬千乾坤！」'
      ],
      findQuotes: [
        '善哉善哉！誅仙劍意為之化解，文道通玄！',
        '妙絕！此乃大宗師之手筆！',
        '神火九龍盤旋，最後的封印即將全開！'
      ],
      hintQuotes: [
        '九龍神火罩靈光普照，天機字跡現！',
        '拂塵輕擺，撥雲見日，道友請看！'
      ],
      quizQuotes: [
        '大智大慧！貧道亦為道友之淵博讚嘆不已！'
      ],
      timeoutQuotes: [
        '煞氣沖霄！貧道祭出九龍神火罩護住靈台，且回法壇稍歇，再破萬劫！'
      ],
      winQuotes: [
        '造化通天！誅仙陣破，封神榜首！道友功德圓滿，名垂青史！'
      ]
    },
    lore: '通天教主布下誅仙陣，四劍懸門，天下無雙。太乙真人以九龍神火護航，助你摘句通神，封神榜上永留芳名。',
    treasureShard: {
      id: 'zhuxianjian_shard',
      name: '誅仙古劍・混元劍鞘',
      icon: '⚔️',
      desc: '上古誅仙四劍之玄金劍鞘，散發萬道祥光。'
    }
  }
];

/**
 * 依關卡 ID 或章節取得對應陣法設定
 */
export function getArrayByChapter(chapter) {
  const ch = Number(chapter) || 1;
  return FENGSHEN_ARRAYS.find((a) => a.chapter === ch) || FENGSHEN_ARRAYS[0];
}

export function getArrayByLevelId(levelId) {
  const id = Number(levelId) || 1;
  const chapter = Math.min(5, Math.max(1, Math.ceil(id / 10)));
  return getArrayByChapter(chapter);
}

/**
 * 隨機挑選守護者對白
 */
export function getRandomQuote(quotes) {
  if (!quotes || !quotes.length) return '';
  const idx = Math.floor(Math.random() * quotes.length);
  return quotes[idx];
}

/**
 * 產生高品質 Q 版守護仙人向量 SVG
 */
export function renderGuardianSvg(guardianId, mood = 'idle') {
  const isHappy = mood === 'happy' || mood === 'win';
  const isShock = mood === 'shock' || mood === 'timeout';

  switch (guardianId) {
    case 'jiangziya': // 姜子牙：杏黃道袍、白鬚、打神鞭、八卦道冠
      return `
        <svg viewBox="0 0 100 100" class="fengshen-avatar-svg jiangziya" aria-hidden="true">
          <defs>
            <linearGradient id="jzy-robe" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#F7D358"/>
              <stop offset="100%" stop-color="#D4AC0D"/>
            </linearGradient>
            <linearGradient id="jzy-whip" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#FFF"/>
              <stop offset="50%" stop-color="#F39C12"/>
              <stop offset="100%" stop-color="#9C640C"/>
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="#FFFDF6" stroke="#D4AC0D" stroke-width="2"/>
          <ellipse cx="50" cy="85" rx="32" ry="10" fill="#E8D8B0" opacity="0.6"/>
          
          <path d="M 28 62 Q 50 56 72 62 L 80 92 Q 50 96 20 92 Z" fill="url(#jzy-robe)" stroke="#8A6D14" stroke-width="1.5"/>
          <path d="M 44 60 L 50 92 L 56 60 Z" fill="#FDFEFE" opacity="0.8"/>
          <circle cx="50" cy="74" r="5" fill="#2C3E50" stroke="#FFF" stroke-width="1"/>
          
          <circle cx="50" cy="40" r="22" fill="#FDEBD0"/>
          
          <circle cx="36" cy="45" r="4" fill="#F5B7B1" opacity="0.7"/>
          <circle cx="64" cy="45" r="4" fill="#F5B7B1" opacity="0.7"/>
          
          ${isHappy ? `
            <path d="M 36 38 Q 42 32 48 38" fill="none" stroke="#2C3E50" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M 52 38 Q 58 32 64 38" fill="none" stroke="#2C3E50" stroke-width="2.5" stroke-linecap="round"/>
          ` : isShock ? `
            <circle cx="42" cy="36" r="3.5" fill="#2C3E50"/>
            <circle cx="58" cy="36" r="3.5" fill="#2C3E50"/>
          ` : `
            <ellipse cx="42" cy="37" rx="3.5" ry="4" fill="#2C3E50"/>
            <circle cx="43.5" cy="35.5" r="1.5" fill="#FFF"/>
            <ellipse cx="58" cy="37" rx="3.5" ry="4" fill="#2C3E50"/>
            <circle cx="59.5" cy="35.5" r="1.5" fill="#FFF"/>
          `}
          
          <path d="M 34 31 Q 42 27 48 32" fill="none" stroke="#FFF" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M 52 32 Q 58 27 66 31" fill="none" stroke="#FFF" stroke-width="2.5" stroke-linecap="round"/>
          
          <path d="M 44 48 Q 50 62 42 70 Q 50 66 58 70 Q 52 58 56 48 Z" fill="#FFFFFF" stroke="#E5E7E9" stroke-width="1"/>
          
          <path d="M 38 20 Q 50 10 62 20 Z" fill="#7D6608"/>
          <circle cx="50" cy="14" r="6" fill="#F39C12" stroke="#FFF" stroke-width="1"/>
          <line x1="32" y1="17" x2="68" y2="17" stroke="#AF601A" stroke-width="2.5" stroke-linecap="round"/>
          
          <g transform="rotate(-25 75 55)">
            <rect x="73" y="28" width="4" height="42" rx="2" fill="url(#jzy-whip)" stroke="#B7950B" stroke-width="1"/>
            <circle cx="75" cy="26" r="3" fill="#F1C40F"/>
            <circle cx="75" cy="35" r="2" fill="#E67E22"/>
            <circle cx="75" cy="45" r="2" fill="#E67E22"/>
            <circle cx="75" cy="55" r="2" fill="#E67E22"/>
          </g>
        </svg>
      `;

    case 'nezha': // 哪吒：蓮花荷葉領、雙髻紅帶、乾坤圈、混天綾
      return `
        <svg viewBox="0 0 100 100" class="fengshen-avatar-svg nezha" aria-hidden="true">
          <defs>
            <linearGradient id="nzh-ling" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#E74C3C"/>
              <stop offset="100%" stop-color="#C0392B"/>
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="#FFFDF6" stroke="#E74C3C" stroke-width="2"/>
          <ellipse cx="50" cy="85" rx="30" ry="9" fill="#FADBD8" opacity="0.6"/>
          
          <path d="M 12 40 Q 22 20 45 28 Q 75 15 88 42 Q 95 70 76 85" fill="none" stroke="url(#nzh-ling)" stroke-width="4" stroke-linecap="round" opacity="0.85"/>
          
          <path d="M 32 64 Q 50 58 68 64 L 75 92 Q 50 95 25 92 Z" fill="#2ECC71" stroke="#27AE60" stroke-width="1.5"/>
          <path d="M 35 62 Q 50 72 65 62" fill="#F1948A" stroke="#E74C3C" stroke-width="1.5"/>
          
          <circle cx="50" cy="42" r="21" fill="#FDEBD0"/>
          <circle cx="34" cy="46" r="4" fill="#F1948A" opacity="0.75"/>
          <circle cx="66" cy="46" r="4" fill="#F1948A" opacity="0.75"/>
          
          <circle cx="28" cy="24" r="9" fill="#2C3E50"/>
          <circle cx="72" cy="24" r="9" fill="#2C3E50"/>
          <path d="M 22 28 Q 15 36 20 44" fill="none" stroke="#E74C3C" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M 78 28 Q 85 36 80 44" fill="none" stroke="#E74C3C" stroke-width="2.5" stroke-linecap="round"/>
          
          <circle cx="50" cy="30" r="2.5" fill="#E74C3C"/>
          
          ${isHappy ? `
            <path d="M 36 40 Q 42 34 48 40" fill="none" stroke="#2C3E50" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M 52 40 Q 58 34 64 40" fill="none" stroke="#2C3E50" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M 44 48 Q 50 54 56 48" fill="#E74C3C" stroke="#2C3E50" stroke-width="1"/>
          ` : `
            <circle cx="41" cy="40" r="4" fill="#2C3E50"/>
            <circle cx="42.5" cy="38" r="1.5" fill="#FFF"/>
            <circle cx="59" cy="40" r="4" fill="#2C3E50"/>
            <circle cx="60.5" cy="38" r="1.5" fill="#FFF"/>
            <path d="M 46 48 Q 50 51 54 48" fill="none" stroke="#2C3E50" stroke-width="1.5" stroke-linecap="round"/>
          `}
          
          <circle cx="22" cy="62" r="11" fill="none" stroke="#F1C40F" stroke-width="3.5"/>
          <circle cx="22" cy="62" r="11" fill="none" stroke="#FFF" stroke-width="1" opacity="0.6"/>
        </svg>
      `;

    case 'yangjian': // 楊戩：銀甲天眼、三尖兩刃刀、哮天犬
      return `
        <svg viewBox="0 0 100 100" class="fengshen-avatar-svg yangjian" aria-hidden="true">
          <defs>
            <linearGradient id="yj-armor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#E5E8E8"/>
              <stop offset="100%" stop-color="#95A5A6"/>
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="#FFFDF6" stroke="#8E44AD" stroke-width="2"/>
          <ellipse cx="50" cy="85" rx="30" ry="9" fill="#E8DAEF" opacity="0.6"/>
          
          <path d="M 26 64 Q 50 56 74 64 L 80 92 Q 50 95 20 92 Z" fill="url(#yj-armor)" stroke="#5D6D7E" stroke-width="1.5"/>
          <path d="M 22 60 Q 30 54 38 64" fill="#8E44AD"/>
          <path d="M 78 60 Q 70 54 62 64" fill="#8E44AD"/>
          
          <circle cx="50" cy="40" r="21" fill="#FDEBD0"/>
          
          <path d="M 32 28 Q 50 18 68 28 Z" fill="#1C2833"/>
          <path d="M 44 18 L 50 10 L 56 18 Z" fill="#F1C40F" stroke="#B7950B" stroke-width="1"/>
          
          <ellipse cx="50" cy="27" rx="3" ry="5" fill="#9B59B6" stroke="#F1C40F" stroke-width="1.2"/>
          <circle cx="50" cy="27" r="1.5" fill="#FFF"/>
          
          <path d="M 34 32 L 46 34" stroke="#1C2833" stroke-width="2" stroke-linecap="round"/>
          <path d="M 66 32 L 54 34" stroke="#1C2833" stroke-width="2" stroke-linecap="round"/>
          
          <circle cx="41" cy="39" r="3.5" fill="#1C2833"/>
          <circle cx="42" cy="38" r="1.2" fill="#FFF"/>
          <circle cx="59" cy="39" r="3.5" fill="#1C2833"/>
          <circle cx="60" cy="38" r="1.2" fill="#FFF"/>
          
          <g transform="rotate(15 78 50)">
            <line x1="78" y1="20" x2="78" y2="85" stroke="#7F8C8D" stroke-width="2.5"/>
            <path d="M 78 12 L 83 24 L 78 20 L 73 24 Z" fill="#BDC3C7" stroke="#2C3E50" stroke-width="1"/>
          </g>
          
          <g transform="translate(14, 66) scale(0.65)">
            <ellipse cx="20" cy="20" rx="14" ry="10" fill="#2C3E50"/>
            <circle cx="28" cy="14" r="8" fill="#2C3E50"/>
            <path d="M 22 8 Q 20 4 25 6" fill="#1A252F"/>
            <circle cx="30" cy="13" r="1.8" fill="#F1C40F"/>
            <circle cx="34" cy="15" r="1.5" fill="#E74C3C"/>
          </g>
        </svg>
      `;

    case 'leizhenzi': // 雷震子：青藍小臉、風雷金羽雙翼、黃金雷棍
      return `
        <svg viewBox="0 0 100 100" class="fengshen-avatar-svg leizhenzi" aria-hidden="true">
          <circle cx="50" cy="50" r="46" fill="#FFFDF6" stroke="#2980B9" stroke-width="2"/>
          <ellipse cx="50" cy="85" rx="30" ry="9" fill="#D4E6F1" opacity="0.6"/>
          
          <g fill="#3498DB" stroke="#1B4F72" stroke-width="1.5">
            <path d="M 30 45 Q 8 25 10 50 Q 8 68 28 65 Z"/>
            <path d="M 24 45 Q 4 35 12 55" fill="none" stroke="#F1C40F" stroke-width="1.5"/>
            <path d="M 70 45 Q 92 25 90 50 Q 92 68 72 65 Z"/>
            <path d="M 76 45 Q 96 35 88 55" fill="none" stroke="#F1C40F" stroke-width="1.5"/>
          </g>
          
          <path d="M 30 64 Q 50 58 70 64 L 75 92 Q 50 95 25 92 Z" fill="#D35400" stroke="#A04000" stroke-width="1.5"/>
          <circle cx="50" cy="74" r="5" fill="#F1C40F"/>
          
          <circle cx="50" cy="40" r="21" fill="#AED6F1"/>
          
          <path d="M 28 32 Q 50 12 72 32 Q 60 20 50 22 Q 40 20 28 32 Z" fill="#C0392B"/>
          <circle cx="50" cy="18" r="6" fill="#E74C3C"/>
          
          <circle cx="41" cy="38" r="4" fill="#1B4F72"/>
          <circle cx="42.5" cy="36.5" r="1.5" fill="#FFF"/>
          <circle cx="59" cy="38" r="4" fill="#1B4F72"/>
          <circle cx="60.5" cy="36.5" r="1.5" fill="#FFF"/>
          
          <path d="M 46 43 Q 50 48 54 43 Q 50 45 46 43 Z" fill="#F39C12"/>
          
          <g transform="rotate(-30 75 55)">
            <rect x="73" y="25" width="4" height="46" rx="2" fill="#F1C40F" stroke="#B7950B" stroke-width="1"/>
            <path d="M 75 22 L 72 28 L 78 30 L 74 36" fill="none" stroke="#F39C12" stroke-width="1.5"/>
          </g>
        </svg>
      `;

    case 'taiyi': // 太乙真人：仙翁白眉、九龍神火罩、拂塵
    default:
      return `
        <svg viewBox="0 0 100 100" class="fengshen-avatar-svg taiyi" aria-hidden="true">
          <circle cx="50" cy="50" r="46" fill="#FFFDF6" stroke="#D4AC0D" stroke-width="2"/>
          <ellipse cx="50" cy="85" rx="30" ry="9" fill="#FCF3CF" opacity="0.6"/>
          
          <path d="M 18 88 Q 30 78 45 84 Q 60 76 75 84 Q 85 88 80 94 Z" fill="#FFFFFF" opacity="0.9"/>
          
          <path d="M 28 62 Q 50 56 72 62 L 78 92 Q 50 96 22 92 Z" fill="#EBF5FB" stroke="#AED6F1" stroke-width="1.5"/>
          <path d="M 42 60 L 50 92 L 58 60 Z" fill="#FADBD8" opacity="0.7"/>
          
          <circle cx="50" cy="40" r="21" fill="#FDEBD0"/>
          <circle cx="35" cy="45" r="4" fill="#FADBD8" opacity="0.8"/>
          <circle cx="65" cy="45" r="4" fill="#FADBD8" opacity="0.8"/>
          
          <path d="M 36 38 Q 42 32 48 38" fill="none" stroke="#2C3E50" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M 52 38 Q 58 32 64 38" fill="none" stroke="#2C3E50" stroke-width="2.5" stroke-linecap="round"/>
          
          <path d="M 32 32 Q 44 26 48 34 Q 28 36 22 42" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M 68 32 Q 56 26 52 34 Q 72 36 78 42" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
          
          <path d="M 44 48 Q 50 68 40 76 Q 50 72 60 76 Q 52 64 56 48 Z" fill="#FFFFFF" stroke="#E5E7E9" stroke-width="1"/>
          
          <circle cx="50" cy="18" r="6" fill="#F39C12" stroke="#FFF" stroke-width="1"/>
          <line x1="36" y1="20" x2="64" y2="20" stroke="#AF601A" stroke-width="2" stroke-linecap="round"/>
          
          <g transform="rotate(-20 22 55)">
            <line x1="22" y1="40" x2="22" y2="75" stroke="#795548" stroke-width="2.5"/>
            <path d="M 22 40 Q 14 26 22 18 Q 30 26 22 40" fill="#FFFFFF" stroke="#E0E0E0" stroke-width="1"/>
          </g>
          
          <circle cx="76" cy="48" r="8" fill="#F39C12" opacity="0.85"/>
          <circle cx="76" cy="48" r="5" fill="#FFF" opacity="0.9"/>
        </svg>
      `;
  }
}
