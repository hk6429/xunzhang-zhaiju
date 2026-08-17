// js/fengshen.js — 封神密室逃脫陣法體系、Q版守護仙人與互動對白資料庫
import { CHARACTERS, getCharacterById, getCharacterAvatar } from '../assets/characters/character-registry.js';

export { CHARACTERS, getCharacterById, getCharacterAvatar };

/**
 * 五大封神密室陣法定義（對應 5 大章節 50 關）
 * 第 1 陣：姜太公
 * 第 2 陣：哪吒
 * 第 3 陣：楊戩
 * 第 4 陣：蘇妲己 與 申公豹
 * 第 5 陣：雷震子 與 太乙真人
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
    guardians: [
      {
        id: 'jiang-taigong',
        name: '姜太公',
        title: '封神統帥・太公望',
        shortTitle: '太公引路',
        badge: '玄機天師',
        characterId: 'jiang-taigong',
        role: '主陣統帥',
        greeting: '道友請留步！老夫已在此等候多時。此陣乃太極初開之試煉，心無雜念方能尋出真章！',
        taunt: '「老夫在此垂釣，願者上鉤！這太極字陣，道友可敢一試？」',
        cheer: '「好文采！四字成語如陣法四柱，連點成線，陣眼自破！」',
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
          '答得善哉！博聞強記，文思如泉湧，墨汁自聚！'
        ],
        timeoutQuotes: [
          '陣法逆轉！莫慌，老夫祭出杏黃旗護你出陣，整頓心神再來一次！'
        ],
        winQuotes: [
          '大善！太極陣眼已開，封神榜上當有道友赫赫大名！'
        ]
      }
    ],
    guardian: null, // 後續動態初始化為 guardians[0]
    lore: '殷商未滅，仙陣初啟。太公以杏黃旗引路，助天下士子參悟太極陰陽，開闢文道坦途。',
    treasureShard: {
      id: 'dashanbian_shard',
      name: '打神鞭・靈光碎片',
      icon: '⚡',
      svgPath: 'assets/items/dashen-bian.png',
      imagePath: 'assets/items/dashen-bian.png',
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
    guardians: [
      {
        id: 'nezha',
        name: '哪吒',
        title: '三壇海會・蓮花童子',
        shortTitle: '三太子護法',
        badge: '降妖先鋒',
        characterId: 'nezha',
        role: '降妖先鋒',
        greeting: '嘿！小爺哪吒來也！九曲黃河浪再高，也擋不住小爺的乾坤圈！看準字句，衝啊！',
        taunt: '「這點字謎小陣，小爺我閉著眼睛也能破！你敢跟小爺比比速度嗎？」',
        cheer: '「哈哈！乾坤圈一擲定乾坤，字句連貫就是力量！衝衝衝！」',
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
      }
    ],
    guardian: null,
    lore: '三宵娘娘擺下九曲黃河大陣，內藏混元金斗。哪吒腳踏風火輪，率你乘風破浪，以文破陣。',
    treasureShard: {
      id: 'qiankunquan_shard',
      name: '乾坤圈・純金殘片',
      icon: '⭕',
      svgPath: 'assets/items/qiankun-quan.png',
      imagePath: 'assets/items/qiankun-quan.png',
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
    guardians: [
      {
        id: 'yang-jian',
        name: '楊戩',
        title: '清源妙道・二郎真君',
        shortTitle: '真君神目',
        badge: '昭惠真君',
        characterId: 'yang-jian',
        role: '真君法目',
        greeting: '本君在此。神目所視，洞察秋毫。任憑十絕陣烈火迷障，文字破綻無所遁形！',
        taunt: '「天眼已開，虛妄字句無所遁形。道友若心浮氣躁，恐難出此陣。」',
        cheer: '「神目如電！精準無差，本君的三尖兩刃刀亦為之鳴響！」',
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
      }
    ],
    guardian: null,
    lore: '十絕陣神煞交錯，烈焰焚天。二郎神楊戩攜哮天犬，以通天神目助你勘破萬千字障。',
    treasureShard: {
      id: 'sanjianliangren_shard',
      name: '三尖兩刃刀・神鋒碎刃',
      icon: '🗡️',
      svgPath: 'assets/items/sanjian-liangren-dao.png',
      imagePath: 'assets/items/sanjian-liangren-dao.png',
      desc: '二郎真君斬妖除魔之無上神兵碎片，鋒銳無匹。'
    }
  },
  {
    chapter: 4,
    id: 'array-wanxian',
    name: '萬仙風雷陣',
    title: '妖仙魅影・萬仙風雷陣',
    alias: '風雷萬煞九尾迷宮',
    element: '九天雷煞',
    color: '#1E3C72',
    accentColor: '#DB2777',
    levelRange: [31, 40],
    guardians: [
      {
        id: 'su-daji',
        name: '蘇妲己',
        title: '傾國九尾・天狐妖后',
        shortTitle: '九尾天狐',
        badge: '千幻妖魅',
        characterId: 'su-daji',
        role: '迷魂狐仙',
        greeting: '呵呵～道友請進～萬仙陣中字字迷魂，本宮的引魂燈可正等著為你點亮呢～',
        taunt: '「嘻嘻～這迷宮裡的千回百轉，道友的小腦袋瓜轉得過來嗎～」',
        cheer: '「哎呀～真聰明！連本宮的九尾幻術都困不住你呢～」',
        clickQuotes: [
          '「呵呵～道友，這字謎可比你想像中更有趣呢～」',
          '「讓本宮瞧瞧……藏在迷宮裡的小詞兒～」',
          '「引魂燈幽火微茫，跟隨直覺，方見真章～」',
          '「別盯著本宮看太久，小心被迷了心智解不出題喔～」',
          '「答題賺墨水？本宮最喜歡博學多才的道友了～」'
        ],
        findQuotes: [
          '嘻嘻！本宮的媚影仙術，也被你的慧眼識破了～',
          '好眼力！萬仙迷陣又被你拆下一角！',
          '真厲害，本宮可越來越欣賞你了～'
        ],
        hintQuotes: [
          '引魂幽火為你引出一道微光～',
          '九尾靈狐簪輕點，線索已現！'
        ],
        quizQuotes: [
          '答得真漂亮～本宮賞你滿滿的文墨之氣！'
        ],
        timeoutQuotes: [
          '哎呀討厭！尾巴被狂暴的雷煞夾住了！快隨本宮暫退！'
        ],
        winQuotes: [
          '萬仙臣服！連本宮也甘拜下風，道友真是文曲星下凡！'
        ]
      },
      {
        id: 'shen-gongbao',
        name: '申公豹',
        title: '分水將軍・邪笑國師',
        shortTitle: '公豹道友',
        badge: '幻變國師',
        characterId: 'shen-gongbao',
        role: '邪魅國師',
        greeting: '道友請留步！老夫看你骨骼驚奇，這萬仙陣玄奧莫測，不如讓老夫來考考你！',
        taunt: '「桀桀桀！看到了吧！這就是老夫的道行，你可別落荒而逃啊！」',
        cheer: '「哎呀呀！果然有名堂！老夫這回真是看走眼了！」',
        clickQuotes: [
          '「道友請留步！老夫看你骨骼驚奇，不如來解一題？」',
          '「待老夫巧施妙計，將這成語暗渡陳倉……」',
          '「黑點虎，別睡了！有高人來破咱們的萬仙陣了！」',
          '「陰陽鏡一照，真真假假，文字奧秘全在其中！」',
          '「太公望能給你的提示，老夫一樣給得起！」'
        ],
        findQuotes: [
          '好個道友！竟然真被你找著了！',
          '桀桀！這題破得漂亮，老夫佩服！',
          '陰陽鏡中靈光大作，陣法動搖了！'
        ],
        hintQuotes: [
          '陰陽八卦鏡一轉，天機盡洩！',
          '老夫悄悄給你指個方向，可別告訴太公望！'
        ],
        quizQuotes: [
          '妙哉！連這題都難不倒你，道行不淺啊！'
        ],
        timeoutQuotes: [
          '黑點虎快跑！太公望拿著打神鞭追過來啦！撤！'
        ],
        winQuotes: [
          '桀桀桀！萬仙陣破！老夫輸得心服口服，封神榜上你居首位！'
        ]
      }
    ],
    guardian: null,
    lore: '萬仙大陣包羅萬象，蘇妲己祭出九尾魅影引魂燈，申公豹乘黑點虎口呼「道友請留步」，雙妖仙駐守，考驗文士定力。',
    treasureShard: {
      id: 'yinhundeng_shard',
      name: '引魂燈・幽火晶石',
      icon: '🏮',
      svgPath: 'assets/items/yinhun-deng.png',
      imagePath: 'assets/items/yinhun-deng.png',
      desc: '蘇妲己與申公豹守護之幽冥靈燈碎片，能照徹迷局。'
    }
  },
  {
    chapter: 5,
    id: 'array-zhuxian',
    name: '誅仙萬劫陣',
    title: '宗師試煉・誅仙萬劫陣',
    alias: '九天風雷太乙玄宮',
    element: '先天混沌',
    color: '#634B00',
    accentColor: '#F5A623',
    levelRange: [41, 50],
    guardians: [
      {
        id: 'lei-zhenzi',
        name: '雷震子',
        title: '九天應元・風雷神將',
        shortTitle: '風雷神將',
        badge: '風雷先鋒',
        characterId: 'lei-zhenzi',
        role: '風雷護法',
        greeting: '雙翼展風雷！誅仙萬劫陣就在眼前，俺雷震子願為道友衝鋒開道！',
        taunt: '「滋滋……腦袋裡有雷電在劈！道友，跟上俺的速度了嗎！」',
        cheer: '「雷神金錐！轟隆一聲，成語陣眼全被你敲碎啦！」',
        clickQuotes: [
          '「雙翼展風雷！今天也要全力以赴破陣！」',
          '「黃金棍在手，字字力透紙背！」',
          '「天雷降世，照亮迷津！跟緊俺的雷光！」',
          '「萬仙萬劫變化多端，看準線索，雷霆出擊！」',
          '「墨水充沛，雷力更強！隨時準備全力一擊！」'
        ],
        findQuotes: [
          '轟雷一聲響！陣法封印被你一擊擊碎！',
          '痛快！這成語找得乾淨俐落！',
          '風雷之勢不可擋，萬劫陣眼動搖了！'
        ],
        hintQuotes: [
          '金剛天雷劈開迷局，靈字已現！',
          '風雷雙翼煽起神風，為你指路！'
        ],
        quizQuotes: [
          '答得好！雷霆文思，沛然莫之能禦！'
        ],
        timeoutQuotes: [
          '哇啊啊！羽毛被狂風吹亂了！抓緊俺的翅膀先避一避！'
        ],
        winQuotes: [
          '雷破萬仙，威震乾坤！天下誰人不識君！'
        ]
      },
      {
        id: 'taiyi',
        name: '太乙真人',
        title: '乾元泰斗・九龍真仙',
        shortTitle: '太乙點化',
        badge: '混元大羅',
        characterId: 'taiyi',
        role: '文道宗師',
        greeting: '無量天尊！誅仙大陣乃萬劫之終極試煉。貧道特賜九龍神火罩，助道友摘章尋句，登頂封神！',
        taunt: '「誅仙四劍非同小可，唯胸藏萬卷書者方能化解。道友準備好了嗎？」',
        cheer: '「善哉善哉！造化通天！道友悟性奇高，文道已登峰造極！」',
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
      }
    ],
    guardian: null,
    lore: '誅仙終極殺陣，四劍懸門。雷震子雙翼引雷，太乙真人祭九龍神火罩，文道宗師雙仙坐鎮，助你通神登頂封神榜首。',
    treasureShard: {
      id: 'zhuxianjian_shard',
      name: '誅仙古劍・混元劍鞘',
      icon: '⚔️',
      svgPath: 'assets/items/fenglei-chui.png',
      imagePath: 'assets/items/fenglei-chui.png',
      desc: '上古誅仙四劍之玄金劍鞘，散發萬道祥光。'
    }
  }
];

// 初始化每個陣法的預設 guardian 引用
FENGSHEN_ARRAYS.forEach((arr) => {
  if (arr.guardians && arr.guardians.length) {
    arr.guardian = arr.guardians[0];
  }
});

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
 * 取得出題研墨考官（由太乙真人或姜太公輪流擔任）
 */
export function getExaminer(levelId = 1) {
  const isOdd = (Number(levelId) || 1) % 2 === 1;
  if (isOdd) {
    return {
      id: 'taiyi',
      name: '太乙真人',
      title: '文道主考仙官',
      avatar: 'assets/characters/taiyi/thinking.png',
      happyAvatar: 'assets/characters/taiyi/victory.png',
      panicAvatar: 'assets/characters/taiyi/panic.png',
      speech: '「無量天尊！貧道特設此道成語考題，道友若能通曉其意，松煙墨氣自會化生！」',
      correctQuote: '「善哉善哉！博通經籍，文心通神！＋墨水滿載！」',
      wrongQuote: '「無妨，文道博大精深，記取此題，下回自能答對。」'
    };
  }
  return {
    id: 'jiang-taigong',
    name: '姜太公',
    title: '文道策問天師',
    avatar: 'assets/characters/jiang-taigong/thinking.png',
    happyAvatar: 'assets/characters/jiang-taigong/victory.png',
    panicAvatar: 'assets/characters/jiang-taigong/panic.png',
    speech: '「老夫以字句為卦，推演乾坤。道友請凝神作答，研墨增智！」',
    correctQuote: '「妙哉！文思如泉湧，真乃棟樑之才！墨汁已聚！」',
    wrongQuote: '「莫急莫躁，勝敗乃兵家常事，下題定能中鵠。」'
  };
}

/**
 * 產生高品質 Q 版角色立繪標籤
 * 統一對接 assets/characters/ 的 1:1 點陣/立繪
 */
export function renderGuardianSvg(guardianId, mood = 'idle') {
  // 將舊 id 規範化為 characterId
  let charId = guardianId;
  if (charId === 'jiangziya') charId = 'jiang-taigong';
  if (charId === 'yangjian') charId = 'yang-jian';
  if (charId === 'sudaji') charId = 'su-daji';
  if (charId === 'shengongbao') charId = 'shen-gongbao';
  if (charId === 'leizhenzi') charId = 'lei-zhenzi';

  // 映射情緒名稱
  let exprKey = 'idle';
  if (mood === 'thinking' || mood === 'think') exprKey = 'thinking';
  else if (mood === 'victory' || mood === 'happy' || mood === 'win') exprKey = 'victory';
  else if (mood === 'panic' || mood === 'shock' || mood === 'timeout') exprKey = 'panic';

  const char = getCharacterById(charId);
  const src = (char && char.expressions && char.expressions[exprKey]) || `assets/characters/${charId}/${exprKey}.png`;
  const name = (char && char.name) || guardianId;

  return `<img src="${src}" alt="${name}" class="fengshen-avatar-img ${charId}" data-char="${charId}" data-mood="${exprKey}" loading="lazy" />`;
}
