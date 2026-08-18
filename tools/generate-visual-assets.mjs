import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const itemsDir = path.join(rootDir, 'assets', 'items');

fs.mkdirSync(itemsDir, { recursive: true });

// Common SVG filters and styles
const commonDefs = `
  <defs>
    <filter id="ink-shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#1c1917" flood-opacity="0.18" />
    </filter>
    <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <linearGradient id="ink-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2c2a29"/>
      <stop offset="100%" stop-color="#141210"/>
    </linearGradient>
    <linearGradient id="gold-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
    <linearGradient id="flame-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f87171"/>
      <stop offset="50%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#b91c1c"/>
    </linearGradient>
    <linearGradient id="cyan-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a5f3fc"/>
      <stop offset="60%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#0891b2"/>
    </linearGradient>
    <linearGradient id="purple-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e9d5ff"/>
      <stop offset="50%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#7e22ce"/>
    </linearGradient>
    <linearGradient id="pink-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbcfe8"/>
      <stop offset="50%" stop-color="#f43f5e"/>
      <stop offset="100%" stop-color="#be123c"/>
    </linearGradient>
    <linearGradient id="skin-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff1f2"/>
      <stop offset="100%" stop-color="#fed7aa"/>
    </linearGradient>
    <radialGradient id="blush-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fb7185" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#fb7185" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="halo-gold" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.6"/>
      <stop offset="70%" stop-color="#eab308" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#ca8a04" stop-opacity="0"/>
    </radialGradient>
  </defs>
`;

/* =========================================================================
   7. ITEM ARTIFACT SVGS (法寶 / 密室道具)
   ========================================================================= */

const itemsData = [
  {
    id: 'dashen-bian',
    name: '打神鞭',
    owner: '姜太公',
    desc: '元始天尊所賜天庭神器，節節盤龍符印，破邪鎮煞。',
    rarity: 'SSR',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  ${commonDefs}
  <circle cx="100" cy="100" r="90" fill="#fefce8" stroke="#ca8a04" stroke-width="3" opacity="0.4"/>
  <g transform="rotate(-30 100 100)" filter="url(#ink-shadow)">
    <rect x="94" y="30" width="12" height="120" fill="url(#gold-grad)" stroke="#78350f" stroke-width="2.5" rx="3"/>
    <line x1="90" y1="45" x2="110" y2="45" stroke="#78350f" stroke-width="3"/>
    <line x1="90" y1="60" x2="110" y2="60" stroke="#78350f" stroke-width="3"/>
    <line x1="90" y1="75" x2="110" y2="75" stroke="#78350f" stroke-width="3"/>
    <line x1="90" y1="90" x2="110" y2="90" stroke="#78350f" stroke-width="3"/>
    <line x1="90" y1="105" x2="110" y2="105" stroke="#78350f" stroke-width="3"/>
    <line x1="90" y1="120" x2="110" y2="120" stroke="#78350f" stroke-width="3"/>
    <line x1="90" y1="135" x2="110" y2="135" stroke="#78350f" stroke-width="3"/>
    <polygon points="100,18 108,30 92,30" fill="#fef08a" stroke="#ca8a04" stroke-width="2" filter="url(#glow-gold)"/>
    <rect x="86" y="150" width="28" height="8" fill="#ca8a04" stroke="#78350f" stroke-width="2" rx="2"/>
    <rect x="95" y="158" width="10" height="26" fill="#854d0e" stroke="#1c1917" stroke-width="2" rx="2"/>
    <circle cx="100" cy="188" r="6" fill="#ca8a04" stroke="#78350f" stroke-width="2"/>
  </g>
</svg>`
  },
  {
    id: 'xinhuang-qi',
    name: '戊己杏黃旗',
    owner: '姜太公',
    desc: '金蓮萬朵護體，諸邪避退、萬法不侵之第一防禦聖物。',
    rarity: 'SSR',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  ${commonDefs}
  <circle cx="100" cy="100" r="90" fill="#fefce8" stroke="#ca8a04" stroke-width="3" opacity="0.4"/>
  <g fill="#facc15" filter="url(#glow-gold)">
    <circle cx="50" cy="60" r="6"/>
    <circle cx="150" cy="140" r="8"/>
    <circle cx="160" cy="50" r="5"/>
  </g>
  <line x1="60" y1="180" x2="60" y2="30" stroke="#78350f" stroke-width="6" stroke-linecap="round"/>
  <circle cx="60" cy="25" r="7" fill="url(#gold-grad)" stroke="#ca8a04" stroke-width="2"/>
  <path d="M 62 35 Q 165 50 145 95 Q 110 125 62 135 Z" fill="#facc15" stroke="#ca8a04" stroke-width="4" filter="url(#ink-shadow)"/>
  <path d="M 85 70 Q 110 85 125 75" stroke="#ca8a04" stroke-width="3" fill="none"/>
  <circle cx="95" cy="80" r="10" fill="#ffffff" stroke="#78350f" stroke-width="2"/>
  <circle cx="95" cy="80" r="4" fill="#1c1917"/>
</svg>`
  },
  {
    id: 'qiankun-quan',
    name: '乾坤圈',
    owner: '哪吒',
    desc: '崑崙至寶金鐲，祭出可碎山裂石，威震四海八荒。',
    rarity: 'SSR',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  ${commonDefs}
  <circle cx="100" cy="100" r="90" fill="#fff1f2" stroke="#f43f5e" stroke-width="3" opacity="0.4"/>
  <ellipse cx="100" cy="100" rx="65" ry="65" fill="none" stroke="url(#gold-grad)" stroke-width="16" filter="url(#glow-gold)"/>
  <ellipse cx="100" cy="100" rx="65" ry="65" fill="none" stroke="#78350f" stroke-width="2"/>
  <circle cx="100" cy="35" r="7" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
  <circle cx="100" cy="165" r="7" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
  <circle cx="35" cy="100" r="7" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
  <circle cx="165" cy="100" r="7" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
</svg>`
  },
  {
    id: 'huntian-ling',
    name: '混天綾',
    owner: '哪吒',
    desc: '七尺紅綾，翻江倒海、晃動乾坤之靈動飄帶。',
    rarity: 'SR',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  ${commonDefs}
  <circle cx="100" cy="100" r="90" fill="#fff1f2" stroke="#f43f5e" stroke-width="3" opacity="0.4"/>
  <path d="M 30 160 C 20 100 80 50 120 60 C 170 70 180 130 140 150 C 90 170 80 120 110 100 C 130 90 160 110 170 130" fill="none" stroke="url(#flame-grad)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-red)"/>
  <path d="M 30 160 C 20 100 80 50 120 60 C 170 70 180 130 140 150 C 90 170 80 120 110 100 C 130 90 160 110 170 130" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.5" stroke-dasharray="4,6"/>
</svg>`
  },
  {
    id: 'fenghuo-lun',
    name: '風火輪',
    owner: '哪吒',
    desc: '足踏雙輪，風火呼嘯，瞬息萬里之行空仙器。',
    rarity: 'SSR',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  ${commonDefs}
  <circle cx="100" cy="100" r="90" fill="#fff7ed" stroke="#f97316" stroke-width="3" opacity="0.4"/>
  <g transform="translate(100, 100)" filter="url(#glow-red)">
    <path d="M 0 -60 Q 30 -30 0 0 Q -30 -30 0 -60 Z" fill="url(#flame-grad)"/>
    <path d="M 60 0 Q 30 30 0 0 Q 30 -30 60 0 Z" fill="url(#flame-grad)"/>
    <path d="M 0 60 Q -30 30 0 0 Q 30 30 0 60 Z" fill="url(#flame-grad)"/>
    <path d="M -60 0 Q -30 30 0 0 Q -30 -30 -60 0 Z" fill="url(#flame-grad)"/>
    <circle cx="0" cy="0" r="25" fill="url(#gold-grad)" stroke="#ca8a04" stroke-width="3"/>
    <circle cx="0" cy="0" r="10" fill="#ffffff"/>
  </g>
</svg>`
  },
  {
    id: 'sanjian-liangren-dao',
    name: '三尖兩刃刀',
    owner: '楊戩',
    desc: '天界戰神兵刃，三刃寒芒吐露，劈山破海無堅不摧。',
    rarity: 'SSR',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  ${commonDefs}
  <circle cx="100" cy="100" r="90" fill="#f0f9ff" stroke="#0284c7" stroke-width="3" opacity="0.4"/>
  <g transform="rotate(45 100 100)" filter="url(#ink-shadow)">
    <rect x="96" y="70" width="8" height="110" fill="#334155" stroke="#0f172a" stroke-width="2" rx="2"/>
    <circle cx="100" cy="70" r="8" fill="url(#gold-grad)" stroke="#ca8a04" stroke-width="2"/>
    <path d="M 100 70 L 100 15 L 90 38 L 78 48 L 92 56 Z" fill="#e2e8f0" stroke="#0284c7" stroke-width="3"/>
    <path d="M 100 70 L 100 15 L 110 38 L 122 48 L 108 56 Z" fill="#cbd5e1" stroke="#0284c7" stroke-width="3"/>
    <line x1="100" y1="15" x2="100" y2="70" stroke="#0284c7" stroke-width="2"/>
  </g>
</svg>`
  },
  {
    id: 'xiaotian-quan',
    name: '哮天神犬玉符',
    owner: '楊戩',
    desc: '喚出神犬哮天之護道靈符，撲咬妖邪、循味追凶。',
    rarity: 'SR',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  ${commonDefs}
  <circle cx="100" cy="100" r="90" fill="#f8fafc" stroke="#334155" stroke-width="3" opacity="0.4"/>
  <polygon points="100,25 160,60 160,140 100,175 40,140 40,60" fill="#0f172a" stroke="#0284c7" stroke-width="4" filter="url(#ink-shadow)"/>
  <g transform="translate(70, 65)">
    <circle cx="30" cy="25" r="18" fill="#f8fafc"/>
    <polygon points="20,12 10,2 25,18" fill="#f8fafc"/>
    <circle cx="25" cy="22" r="3.5" fill="#ca8a04"/>
    <circle cx="35" cy="22" r="3.5" fill="#ca8a04"/>
    <circle cx="30" cy="30" r="2.5" fill="#ef4444"/>
  </g>
  <circle cx="100" cy="35" r="4" fill="#facc15"/>
</svg>`
  },
  {
    id: 'yinhun-deng',
    name: '引魂燈',
    owner: '蘇妲己',
    desc: '幽幽粉火，魅惑心神，引百獸群妖之幽冥宮燈。',
    rarity: 'SSR',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  ${commonDefs}
  <circle cx="100" cy="100" r="90" fill="#fdf2f8" stroke="#ec4899" stroke-width="3" opacity="0.4"/>
  <path d="M 100 20 L 100 45" stroke="#ca8a04" stroke-width="4"/>
  <path d="M 70 45 Q 100 35 130 45 L 120 55 L 80 55 Z" fill="#831843" stroke="#ca8a04" stroke-width="2"/>
  <ellipse cx="100" cy="100" rx="40" ry="45" fill="url(#pink-grad)" filter="url(#glow-red)"/>
  <ellipse cx="100" cy="100" rx="20" ry="25" fill="#fef08a"/>
  <rect x="80" y="145" width="40" height="10" fill="#831843" rx="2"/>
  <path d="M 90 155 L 90 185 M 100 155 L 100 190 M 110 155 L 110 185" stroke="#e11d48" stroke-width="3" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'jiuwei-linghu',
    name: '九尾妖狐簪',
    owner: '蘇妲己',
    desc: '千年天狐靈力凝結之玉簪，佩之可通魅惑千幻法。',
    rarity: 'SR',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  ${commonDefs}
  <circle cx="100" cy="100" r="90" fill="#fdf2f8" stroke="#ec4899" stroke-width="3" opacity="0.4"/>
  <g transform="rotate(-40 100 100)" filter="url(#ink-shadow)">
    <rect x="97" y="50" width="6" height="130" fill="url(#gold-grad)" stroke="#ca8a04" stroke-width="1.5" rx="3"/>
    <polygon points="100,20 125,50 75,50" fill="#f43f5e" stroke="#831843" stroke-width="2"/>
    <polygon points="85,30 75,15 95,28" fill="#f43f5e"/>
    <polygon points="115,30 125,15 105,28" fill="#f43f5e"/>
    <circle cx="92" cy="40" r="2.5" fill="#ffffff"/>
    <circle cx="108" cy="40" r="2.5" fill="#ffffff"/>
  </g>
</svg>`
  },
  {
    id: 'fenglei-chui',
    name: '風雷黃金錐',
    owner: '雷震子',
    desc: '天雷雙擊之神器，敲擊時雷聲轟鳴，電光四射。',
    rarity: 'SSR',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  ${commonDefs}
  <circle cx="100" cy="100" r="90" fill="#ecfeff" stroke="#06b6d4" stroke-width="3" opacity="0.4"/>
  <g stroke="#06b6d4" stroke-width="3" fill="none" filter="url(#glow-gold)">
    <path d="M 40 40 L 60 55 L 50 65 L 70 80"/>
    <path d="M 160 40 L 140 55 L 150 65 L 130 80"/>
  </g>
  <g transform="rotate(30 100 100)" filter="url(#ink-shadow)">
    <rect x="94" y="30" width="12" height="120" fill="url(#gold-grad)" stroke="#ca8a04" stroke-width="2" rx="2"/>
    <polygon points="100,15 110,30 90,30" fill="#ca8a04"/>
  </g>
  <g transform="rotate(-30 100 100)" filter="url(#ink-shadow)">
    <rect x="75" y="45" width="50" height="25" fill="#475569" stroke="#1c1917" stroke-width="2.5" rx="4"/>
    <rect x="96" y="70" width="8" height="90" fill="#78350f" stroke="#1c1917" stroke-width="2" rx="2"/>
  </g>
</svg>`
  },
  {
    id: 'yin-yang-jing',
    name: '陰陽八卦鏡',
    owner: '通用秘寶',
    desc: '照徹世間虛實，反轉吉凶之太極仙鏡。',
    rarity: 'SSR',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  ${commonDefs}
  <circle cx="100" cy="100" r="90" fill="#f8fafc" stroke="#1e293b" stroke-width="3" opacity="0.4"/>
  <polygon points="100,20 156,44 180,100 156,156 100,180 44,156 20,100 44,44" fill="url(#gold-grad)" stroke="#78350f" stroke-width="4" filter="url(#ink-shadow)"/>
  <circle cx="100" cy="100" r="50" fill="#ffffff" stroke="#1c1917" stroke-width="3"/>
  <path d="M 100 50 A 50 50 0 0 1 100 150 A 25 25 0 0 1 100 100 A 25 25 0 0 0 100 50 Z" fill="#1c1917"/>
  <circle cx="100" cy="75" r="7" fill="#ffffff"/>
  <circle cx="100" cy="125" r="7" fill="#1c1917"/>
</svg>`
  },
  {
    id: 'dingshen-fu',
    name: '太上定身籙',
    owner: '通用秘寶',
    desc: '硃砂靈符一貼，定住時辰，萬物靜止。',
    rarity: 'SR',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  ${commonDefs}
  <circle cx="100" cy="100" r="90" fill="#fefce8" stroke="#ca8a04" stroke-width="3" opacity="0.4"/>
  <g transform="rotate(-5 100 100)" filter="url(#ink-shadow)">
    <rect x="65" y="30" width="70" height="140" fill="#fef08a" stroke="#ca8a04" stroke-width="3" rx="4"/>
    <path d="M 80 50 Q 100 40 120 50 L 100 65 Z" fill="#ef4444"/>
    <text x="100" y="95" font-family="'Noto Serif TC', serif" font-weight="900" font-size="26" fill="#dc2626" text-anchor="middle" dominant-baseline="middle">定</text>
    <path d="M 82 120 L 118 120 M 100 120 L 100 155 M 88 140 L 112 140 M 85 155 L 115 155" stroke="#dc2626" stroke-width="3.5" stroke-linecap="round"/>
  </g>
</svg>`
  }
];

console.log('Character raster artwork is maintained in assets/art/companions-v4/.');

console.log('Generating Items...');
for (const item of itemsData) {
  fs.writeFileSync(path.join(itemsDir, `${item.id}.svg`), item.svg.trim(), 'utf8');
}

const itemsRegistry = itemsData.map(i => ({
  id: i.id,
  name: i.name,
  owner: i.owner,
  desc: i.desc,
  rarity: i.rarity,
  svgPath: `assets/items/${i.id}.png`,
  imagePath: `assets/items/${i.id}.png`
}));

fs.writeFileSync(
  path.join(itemsDir, 'items-registry.js'),
  `// Auto-generated Items Registry for 尋章摘句
export const ITEMS = ${JSON.stringify(itemsRegistry, null, 2)};
export default ITEMS;
`,
  'utf8'
);

fs.writeFileSync(
  path.join(itemsDir, 'items.json'),
  JSON.stringify(itemsRegistry, null, 2),
  'utf8'
);

console.log('Visual assets generation finished successfully!');
