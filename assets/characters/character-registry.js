/**
 * 尋章摘句 - 封神國風 Q 版潑墨漫畫角色立繪註冊表 (Character Registry)
 * 畫幅：16:10 滿版角色橫幅、濃黑毛筆動態勾勒 (Comic Inking)、故宮宮廷設色與水墨暈染
 */

export const CHARACTERS = [
  {
    id: "jiang-taigong",
    name: "姜太公",
    title: "封神統帥・太公望",
    ratio: "16:10",
    style: "國風故宮礦物設色水墨 Q版橫幅",
    desc: "仙氣飄飄長鬚老頑童，手持打神鞭與杏黃旗，太極乾坤妙算無雙。",
    themeColor: "#0284c7",
    accentColor: "#facc15",
    exclusiveItem: "dashen-bian",
    artImage: "assets/art/companions-v4/jiang-taigong.png",
    artPalette: ["#0284c7", "#facc15", "#dc2626", "#1e293b", "#f8fafc"],
    artHighlights: ["蓬鬆雪白仙髯與劍眉", "故宮明黃與孔雀藍道袍", "泥金流光勾勒法寶打神鞭", "周身靈動水墨筆觸飛濺"],
    expressions: {
      idle: "assets/art/companions-v4/jiang-taigong.png",
      thinking: "assets/art/companions-v4/jiang-taigong.png",
      victory: "assets/art/companions-v4/jiang-taigong.png",
      panic: "assets/art/companions-v4/jiang-taigong.png"
    },
    quotes: {
      idle: "老夫在此垂釣，願者上鉤～",
      thinking: "且待老夫起一卦，推演字句玄機……",
      victory: "妙哉！天地乾坤，盡在破陣一瞬！",
      panic: "哎呀呀！時辰將至，老夫的杏黃旗呢？！"
    }
  },
  {
    id: "nezha",
    name: "哪吒",
    title: "三壇海會・蓮花童子",
    ratio: "16:10",
    style: "國風故宮礦物設色水墨 Q版橫幅",
    desc: "雙抓髻包包頭、混天紅綢殘影、乾坤金圈、腳踏風火輪，傲嬌熱血的護道小將。",
    themeColor: "#e11d48",
    accentColor: "#10b981",
    exclusiveItem: "qiankun-quan",
    artImage: "assets/art/companions-v4/nezha.png",
    artPalette: ["#e11d48", "#10b981", "#f59e0b", "#1e293b", "#fff1f2"],
    artHighlights: ["雙抓髻包包頭繫紅絲帶", "青碧蓮花護心甲", "環繞周身的飛舞赤紅混天綾", "腳底烈焰風火雙輪"],
    expressions: {
      idle: "assets/art/companions-v4/nezha.png",
      thinking: "assets/art/companions-v4/nezha.png",
      victory: "assets/art/companions-v4/nezha.png",
      panic: "assets/art/companions-v4/nezha.png"
    },
    quotes: {
      idle: "這點字謎小陣，小爺我閉著眼睛也能破！",
      thinking: "哼，這字格藏得挺刁鑽嘛……別吵，我想想！",
      victory: "哈哈！乾坤圈出，萬陣皆破！爽快！",
      panic: "哇啊啊！混天綾打結了！時間要到了啦！"
    }
  },
  {
    id: "yang-jian",
    name: "楊戩",
    title: "清源妙道・二郎真君",
    ratio: "16:10",
    style: "國風故宮礦物設色水墨 Q版橫幅",
    desc: "額間天眼雷光洞察、手持三尖兩刃刀，身伴超萌二哈版哮天犬的高冷小將。",
    themeColor: "#0284c7",
    accentColor: "#ca8a04",
    exclusiveItem: "sanjian-liangren-dao",
    artImage: "assets/art/companions-v4/yang-jian.png",
    artPalette: ["#0284c7", "#ca8a04", "#dc2626", "#334155", "#eff6ff"],
    artHighlights: ["鳳翅紫金頭盔", "額間湛藍金芒天眼神光", "神威三尖兩刃神鋒", "身旁元氣可愛哮天犬"],
    expressions: {
      idle: "assets/art/companions-v4/yang-jian.png",
      thinking: "assets/art/companions-v4/yang-jian.png",
      victory: "assets/art/companions-v4/yang-jian.png",
      panic: "assets/art/companions-v4/yang-jian.png"
    },
    quotes: {
      idle: "哮天，守住陣眼，且看本君破陣。",
      thinking: "天眼已開，虛妄字句無所遁形……",
      victory: "三尖兩刃，一擊破煞！哮天，做得好！",
      panic: "等等……哮天！別咬我的披風！要超時了！"
    }
  },
  {
    id: "su-daji",
    name: "蘇妲己",
    title: "傾國九尾・天狐妖后",
    ratio: "16:10",
    style: "國風故宮礦物設色水墨 Q版橫幅",
    desc: "粉墨九尾狐耳妖仙、幽冥粉紫狐火、手提引魂宮燈，心心眼與調皮狡黠的反派萌主。",
    themeColor: "#db2777",
    accentColor: "#fda4af",
    exclusiveItem: "yinhun-deng",
    artImage: "assets/art/companions-v4/su-daji.png",
    artPalette: ["#db2777", "#fda4af", "#9333ea", "#be185d", "#fdf2f8"],
    artHighlights: ["毛茸茸粉白狐耳與金步搖", "背後如花綻放的九條天狐尾", "手提精緻復古宮燈", "周圍幽藍粉紫靈動狐火"],
    expressions: {
      idle: "assets/art/companions-v4/su-daji.png",
      thinking: "assets/art/companions-v4/su-daji.png",
      victory: "assets/art/companions-v4/su-daji.png",
      panic: "assets/art/companions-v4/su-daji.png"
    },
    quotes: {
      idle: "呵呵～道友，這字謎可比你想像中更有趣呢～",
      thinking: "讓本宮瞧瞧……藏在迷宮裡的小詞兒～",
      victory: "嘻嘻，本宮的媚影仙術，無人能擋！",
      panic: "哎呀討厭！尾巴被陣法夾住了啦！救命喔！"
    }
  },
  {
    id: "shen-gongbao",
    name: "申公豹",
    title: "分水將軍・邪笑國師",
    ratio: "16:10",
    style: "國風故宮礦物設色水墨 Q版橫幅",
    desc: "八字鬍歪嘴喜劇魔頭，騎著圓滾滾胖黑點虎，口喊「道友請留步」的搞笑反派。",
    themeColor: "#7e22ce",
    accentColor: "#eab308",
    exclusiveItem: "yin-yang-jing",
    artImage: "assets/art/companions-v4/shen-gongbao.png",
    artPalette: ["#7e22ce", "#eab308", "#18181b", "#a855f7", "#faf5ff"],
    artHighlights: ["滑稽俏皮的八字鬍與歪嘴笑", "紫金玄色宮廷道袍", "懸浮發光的陰陽八卦鏡", "趴著眨大眼的胖萌黑點虎"],
    expressions: {
      idle: "assets/art/companions-v4/shen-gongbao.png",
      thinking: "assets/art/companions-v4/shen-gongbao.png",
      victory: "assets/art/companions-v4/shen-gongbao.png",
      panic: "assets/art/companions-v4/shen-gongbao.png"
    },
    quotes: {
      idle: "道友請留步！老夫看你骨骼驚奇，不如來解一題？",
      thinking: "待老夫巧施妙計，將這成語暗渡陳倉……",
      victory: "桀桀桀！看到了吧！這就是老夫的道行！",
      panic: "黑點虎快跑！太公望拿著打神鞭追過來啦！"
    }
  },
  {
    id: "lei-zhenzi",
    name: "雷震子",
    title: "九天應元・風雷神將",
    ratio: "16:10",
    style: "國風故宮礦物設色水墨 Q版橫幅",
    desc: "風雷雙翼、青面金睛、金錐落雷，呆萌鳥嘴小金剛元氣少年。",
    themeColor: "#0d9488",
    accentColor: "#f59e0b",
    exclusiveItem: "fenglei-chui",
    artImage: "assets/art/companions-v4/lei-zhenzi.png",
    artPalette: ["#0d9488", "#f59e0b", "#06b6d4", "#134e4a", "#f0fdfa"],
    artHighlights: ["華麗青金羽冠", "大張的風雷流光雙羽翼", "雙持雷霆金錐與重錘", "金光璀璨的呆萌大圓眼"],
    expressions: {
      idle: "assets/art/companions-v4/lei-zhenzi.png",
      thinking: "assets/art/companions-v4/lei-zhenzi.png",
      victory: "assets/art/companions-v4/lei-zhenzi.png",
      panic: "assets/art/companions-v4/lei-zhenzi.png"
    },
    quotes: {
      idle: "雙翼展風雷！今天也要全力以赴破陣！",
      thinking: "滋滋……腦袋裡有雷電在劈，快想出來了！",
      victory: "雷神金錐！轟隆一聲，滿星通關啦！",
      panic: "哇啊啊！羽毛被狂風吹亂了！快剎車！"
    }
  },
  {
    id: "taiyi-zhenren",
    name: "太乙真人",
    title: "乾元洞府・金光大仙",
    ratio: "16:10",
    style: "國風故宮礦物設色水墨 Q版橫幅",
    desc: "圓滾滾酒葫蘆、大肚腩笑瞇瞇，太極拂塵與九龍神火罩護體的搞笑煉丹仙師。",
    themeColor: "#d97706",
    accentColor: "#ef4444",
    exclusiveItem: "jiulong-shenhuozhao",
    artImage: "assets/art/companions-v4/taiyi-zhenren.png",
    artPalette: ["#d97706", "#ef4444", "#fbbf24", "#78350f", "#fffbeb"],
    artHighlights: ["富態討喜的大圓臉與開懷笑顏", "威嚴華貴的純金五嶽冠", "烈焰繚繞的金光神火仙葫蘆", "銀絲太極拂塵"],
    expressions: {
      idle: "assets/art/companions-v4/taiyi-zhenren.png",
      thinking: "assets/art/companions-v4/taiyi-zhenren.png",
      victory: "assets/art/companions-v4/taiyi-zhenren.png",
      panic: "assets/art/companions-v4/taiyi-zhenren.png"
    },
    quotes: {
      idle: "貧道乾元山太乙是也！徒兒莫慌，飲一杯仙酒再破陣！",
      thinking: "待貧道算算……這字句煉進九龍神火罩裡能出幾轉仙丹？",
      victory: "哈哈！神火罩落，妖氛散盡！不愧是貧道親傳妙法！",
      panic: "哎呀呀！丹爐要炸啦！徒兒快替為師頂住！"
    }
  },
  {
    id: "tuxing-sun",
    name: "土行孫",
    title: "地行千載・穿山萌俠",
    ratio: "16:10",
    style: "國風故宮礦物設色水墨 Q版橫幅",
    desc: "地底鑽出、頭戴可愛小鼴鼠兜帽，手握鑌鐵短棍與捆仙金繩的神出鬼沒萌俠。",
    themeColor: "#854d0e",
    accentColor: "#eab308",
    exclusiveItem: "kunxian-sheng",
    artImage: "assets/art/companions-v4/tuxing-sun.png",
    artPalette: ["#854d0e", "#eab308", "#78350f", "#451a03", "#fefce8"],
    artHighlights: ["超萌毛茸茸小鼴鼠兜帽", "盤繞肩膀的璀璨捆仙金繩", "破土而出的碎石與金芒特效", "俏皮開朗的少年笑顏"],
    expressions: {
      idle: "assets/art/companions-v4/tuxing-sun.png",
      thinking: "assets/art/companions-v4/tuxing-sun.png",
      victory: "assets/art/companions-v4/tuxing-sun.png",
      panic: "assets/art/companions-v4/tuxing-sun.png"
    },
    quotes: {
      idle: "嘿咻！地上風光好，且看俺老土如何神出鬼沒！",
      thinking: "字格在地底下也有連線嗎？等俺鑽下去瞧瞧……",
      victory: "地行術破陣！連捆仙繩都沒用上，俺就搞定啦！",
      panic: "哎喲喂！撞到地脈花崗岩了！腦袋卡住拔不出來啦！"
    }
  },
  {
    id: "moling",
    name: "墨靈仙童",
    title: "玄墨小神君・品牌吉祥物",
    ratio: "16:10",
    style: "國風故宮礦物設色水墨 Q版橫幅",
    desc: "太極混元簪、靈動大眼、手握玄天如意毫筆與打神金鞭，文墨神仙雙修的品牌吉祥物。",
    themeColor: "#0284c7",
    accentColor: "#facc15",
    exclusiveItem: "dashen-bian",
    artImage: "assets/art/companions-v4/moling.png",
    artPalette: ["#0284c7", "#facc15", "#0ea5e9", "#0f172a", "#f0f9ff"],
    artHighlights: ["太極陰陽金簪束髮", "揮灑水墨金光的巨型如意毛筆", "飄逸的書法字紋墨藍斗篷", "清澈靈動的湛藍琉璃大眼"],
    expressions: {
      idle: "assets/art/companions-v4/moling.png",
      thinking: "assets/art/companions-v4/moling.png",
      victory: "assets/art/companions-v4/moling.png",
      panic: "assets/art/companions-v4/moling.png"
    },
    quotes: {
      idle: "歡迎來到尋章摘句！文道大千，墨靈伴你破萬陣！",
      thinking: "墨聚成字，字化乾坤……且看小仙童推演一番！",
      victory: "破陣成功！墨靈為你點贊，文思通神！",
      panic: "哎呀呀！靈墨告急，快隨小仙童前去研墨！"
    }
  }
];

export const GROUP_ILLUSTRATIONS = [
  {
    id: "trio-welcome",
    title: "封神三仙・共破文陣",
    desc: "姜太公、哪吒、楊戩與哮天犬三仙齊聚，迎賓破陣！",
    svgPath: "assets/characters/trio-welcome.svg",
    imagePath: "assets/characters/trio-welcome.svg"
  },
  {
    id: "escape-party",
    title: "密室狂歡・群仙大逃脫",
    desc: "太乙真人、蘇妲己、雷震子、土行孫與申公豹全員狂歡逃脫盛典！",
    svgPath: "assets/characters/escape-party.svg",
    imagePath: "assets/characters/escape-party.svg"
  },
  {
    id: "battle-clash",
    title: "仙魔字謎・宿命決戰",
    desc: "少年熱血漫畫分鏡：哪吒與楊戩聯手 VS 申公豹與蘇妲己！",
    svgPath: "assets/characters/battle-clash.svg",
    imagePath: "assets/characters/battle-clash.svg"
  }
];

export function getCharacterById(id) {
  if (id === 'taiyi' || id === 'taiyi-zhenren') {
    return CHARACTERS.find(c => c.id === 'taiyi-zhenren' || c.id === 'taiyi') || CHARACTERS[0];
  }
  return CHARACTERS.find(c => c.id === id) || CHARACTERS[0];
}

export function getCharacterAvatar(id, mood = 'idle') {
  const char = getCharacterById(id);
  if (char && char.expressions) {
    return char.expressions[mood] || char.expressions.idle;
  }
  return `assets/art/companions-v4/${char?.id || 'jiang-taigong'}.png`;
}

export function getCharacterArt(id) {
  const char = getCharacterById(id);
  return char?.artImage || 'assets/art/companions-v4/jiang-taigong.png';
}

export default CHARACTERS;
