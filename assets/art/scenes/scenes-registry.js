/**
 * 尋章摘句 — 故宮宮廷古風 × 封神名陣密室大插圖場景註冊表 (Scenes Registry)
 * @version 1.0.0
 * @author 故宮古風密室場景與大插圖 AI 生圖工程師
 */

export const SCENE_SYSTEM = {
  version: "1.0.0",
  basePath: "assets/art/scenes/",
  theme: "故宮宮廷古風 × 封神密室逃脫",

  // 場景大插圖清單 (Scenes Directory)
  scenes: [
    {
      id: "palace-hero-banner",
      title: "故宮殿宇晨曦迎賓大圖",
      subtitle: "太極初開 · 萬仙破陣",
      type: "hero-banner",
      aspectRatio: "16:9",
      path: "assets/art/scenes/palace-hero-banner.jpg",
      aiPath: "assets/art/scenes/palace-hero-banner.jpg",
      description: "故宮金鑾殿宇巍峨矗立於晨曦金光之中，青綠山水雲霧繚繞，遠方仙閣廊橋凌空懸浮，虛空之中太極符篆與上古金印浮現，展現恢弘大器的破陣迎賓氣魄。",
      visualElements: ["故宮重簷廡殿頂", "青綠山水群峰", "晨曦金光祥雲", "虛空太極神印", "懸浮仙閣廊橋"],
      colorPalette: {
        primary: "#e5a924",   // 故宮琉璃金
        secondary: "#b8332a", // 宮廷硃砂紅
        tertiary: "#2c8577",  // 青綠山水石綠
        accent: "#fde047",    // 仙光耀金
        background: "#1e1635" // 晨曦紫霄
      },
      atmosphere: "恢弘壯闊、仙氣縹緲、莊嚴神聖"
    },
    {
      id: "chamber-taiji",
      title: "乾坤太極殿",
      subtitle: "第一重關 · 陰陽定乾坤",
      type: "chamber-scene",
      aspectRatio: "16:9",
      path: "assets/art/scenes/chamber-taiji.jpg",
      aiPath: "assets/art/scenes/chamber-taiji.jpg",
      description: "太極八卦主殿堂，黑曜石與漢白玉鑲嵌的巨型陰陽太極陣盤於地面散發玄光，蟠龍巨柱金石浮雕，殿頂周天星斗流轉，空中懸浮旋轉金光符文，充滿密室玄機。",
      visualElements: ["陰陽太極陣盤", "盤龍金石巨柱", "周天星斗藻井", "懸浮太極符文光環", "青銅香爐古鼎"],
      colorPalette: {
        primary: "#fde047",   // 太極純陽金
        secondary: "#0f172a", // 玄墨極陰
        tertiary: "#38bdf8",  // 天青星輝
        accent: "#b45309",    // 沉金盤龍
        background: "#090d16" // 幽夜殿閣
      },
      atmosphere: "玄奧深邃、陰陽生化、神秘莊重"
    },
    {
      id: "chamber-huanghe",
      title: "九曲黃河迷仙閣",
      subtitle: "第二重關 · 狂瀾奪造化",
      type: "chamber-scene",
      aspectRatio: "16:9",
      path: "assets/art/scenes/chamber-huanghe.jpg",
      aiPath: "assets/art/scenes/chamber-huanghe.jpg",
      description: "上古名陣九曲黃河，狂濤駭浪中青綠山水環抱，水上懸空九曲廊橋相連；中央上古神重器「混元金斗」懸空凝聚萬丈金光與水龍波瀾，光華萬道。",
      visualElements: ["混元金斗神尊", "九曲波濤狂瀾", "懸空水上廊橋", "青綠山水峭壁", "水煞靈紋光柱"],
      colorPalette: {
        primary: "#14b8a6",   // 碧水青綠
        secondary: "#0284c7", // 浩瀚深藍
        tertiary: "#fde047",  // 金斗耀光
        accent: "#f59e0b",    // 混元金珀
        background: "#09182b" // 怒濤夜幕
      },
      atmosphere: "奔騰澎湃、迷幻玄妙、水木清華"
    },
    {
      id: "chamber-shijue",
      title: "十絕神殿密室",
      subtitle: "第三重關 · 天火破絕煞",
      type: "chamber-scene",
      aspectRatio: "16:9",
      path: "assets/art/scenes/chamber-shijue.jpg",
      aiPath: "assets/art/scenes/chamber-shijue.jpg",
      description: "玄金重鎖封閉的十絕神殿密室，中央上古通天青銅神鼎熾烈天火噴湧，地裂熔金玄煞裂紋流淌，十柄降魔神劍懸浮於虛空之中散發天煞烈芒。",
      visualElements: ["通天青銅神鼎", "熾烈十絕天火", "懸空降魔神劍", "地裂熔金玄煞", "玄鐵重鎖神門"],
      colorPalette: {
        primary: "#dc2626",   // 烈焰朱紅
        secondary: "#ea580c", // 熔火熾橙
        tertiary: "#854d0e",  // 上古沉青銅
        accent: "#fde047",    // 劍芒曜金
        background: "#1f0706" // 焦金玄夜
      },
      atmosphere: "熾烈威嚴、剛猛肅殺、驚心動魄"
    },
    {
      id: "chamber-chaoge",
      title: "朝歌幻境樓閣",
      subtitle: "第四重關 · 摘星破迷障",
      type: "chamber-scene",
      aspectRatio: "16:9",
      path: "assets/art/scenes/chamber-chaoge.jpg",
      aiPath: "assets/art/scenes/chamber-chaoge.jpg",
      description: "朝歌鹿台摘星樓之朱紅宮闕，巨大血月之下九尾天狐仙尾幻光遮天蔽日，粉紫與天青狐火宮燈幽幽浮游，充滿迷離魅惑與破除心魔幻境的挑戰。",
      visualElements: ["摘星樓朱紅宮闕", "九尾天狐幻光仙尾", "浮游狐火宮燈", "迷幻血月", "青丘幻霧"],
      colorPalette: {
        primary: "#be123c",   // 妖魅朱紅
        secondary: "#581c87", // 幻境紫羅蘭
        tertiary: "#67e8f9",  // 幽青狐火
        accent: "#f472b6",    // 仙狐粉霞
        background: "#180c2e" // 青丘夜幕
      },
      atmosphere: "迷幻綺麗、魅影重重、幽玄神秘"
    },
    {
      id: "chamber-wanxian",
      title: "萬仙誅仙封神殿",
      subtitle: "第五重關 · 萬仙歸位",
      type: "chamber-scene",
      aspectRatio: "16:9",
      path: "assets/art/scenes/chamber-wanxian.jpg",
      aiPath: "assets/art/scenes/chamber-wanxian.jpg",
      description: "封神終極破陣之地，太古封神古卷橫貫星河穹頂，金光柱與天青光柱貫穿天地；誅仙、戮仙、陷仙、絕仙四神劍飛舞成陣，太古金文光芒照耀乾坤。",
      visualElements: ["太古封神古卷", "通天文字光柱", "誅仙四神劍飛劍陣", "萬仙大陣太極中央印", "星河金芒法台"],
      colorPalette: {
        primary: "#fde047",   // 封神極曜金
        secondary: "#38bdf8", // 浩然天青
        tertiary: "#a855f7",  // 誅仙神紫
        accent: "#f43f5e",    // 戮仙劍芒
        background: "#050814" // 太古星河
      },
      atmosphere: "史詩震撼、萬仙會盟、天地至尊"
    },
    {
      id: "victory-celebration",
      title: "故宮金鑾破陣通關慶功大插圖",
      subtitle: "金榜題名 · 群仙同慶",
      type: "victory-banner",
      aspectRatio: "16:9",
      path: "assets/art/scenes/victory-celebration.jpg",
      aiPath: "assets/art/scenes/victory-celebration.jpg",
      description: "破陣通關後的故宮金鑾殿前盛大慶功插圖！漫天金花彩帶與璀璨煙火綻放，金榜題名封神金卷高懸，墨靈太公仙童、哪吒、楊戩、妲己、申公豹全體Q版齊聚同賀！",
      visualElements: ["金榜題名敕賜金卷", "故宮金鑾慶功殿台", "漫天璀璨煙火彩帶", "墨靈太公仙童萌態", "哪吒/楊戩/妲己/申公豹歡慶群像"],
      colorPalette: {
        primary: "#eab308",   // 慶功皇金
        secondary: "#dc2626", // 喜慶硃砂紅
        tertiary: "#38bdf8",  // 仙氣天青
        accent: "#f472b6",    // 彩花粉紅
        background: "#4c0519" // 華燈慶典紅
      },
      atmosphere: "歡樂喜慶、金榜題名、成就圓滿"
    }
  ],

  // 輔助函式：根據 ID 獲取場景
  getSceneById(id) {
    return this.scenes.find(scene => scene.id === id);
  },

  // 輔助函式：預載入所有場景圖片
  preloadScenes() {
    const promises = this.scenes.map(scene => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ id: scene.id, status: "loaded", src: scene.path });
        img.onerror = () => resolve({ id: scene.id, status: "error", src: scene.path });
        img.src = scene.path;
      });
    });
    return Promise.all(promises);
  }
};
