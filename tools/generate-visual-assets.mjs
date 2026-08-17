import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const charDir = path.join(rootDir, 'assets', 'characters');
const itemsDir = path.join(rootDir, 'assets', 'items');

fs.mkdirSync(charDir, { recursive: true });
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
   1. JIANG TAIGONG (姜太公) - 1:1 Head:Body Chibi, White Hair, Apricot Flag, Whip
   ========================================================================= */
function generateJiangTaigong(mood) {
  let eyes = '';
  let mouth = '';
  let brow = '';
  let effects = '';
  let sweatOrMark = '';
  let arms = '';

  if (mood === 'idle') {
    eyes = `
      <circle cx="102" cy="98" r="7" fill="#1c1917" />
      <circle cx="100" cy="96" r="2.5" fill="#ffffff" />
      <circle cx="138" cy="98" r="7" fill="#1c1917" />
      <circle cx="136" cy="96" r="2.5" fill="#ffffff" />
    `;
    mouth = `<path d="M 115 116 Q 120 121 125 116" stroke="#292524" stroke-width="3" stroke-linecap="round" fill="none"/>`;
    brow = `
      <path d="M 94 88 Q 102 85 110 88" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M 130 88 Q 138 85 146 88" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none"/>
    `;
    arms = `
      <!-- Left arm holding whip -->
      <path d="M 90 160 Q 65 170 60 150" stroke="#292524" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="60" cy="150" r="7" fill="#fed7aa" stroke="#292524" stroke-width="2.5"/>
      <!-- Dashin Whip -->
      <path d="M 60 165 L 50 110" stroke="#ca8a04" stroke-width="5" stroke-linecap="round"/>
      <circle cx="50" cy="110" r="5" fill="#eab308"/>
      <path d="M 52 135 L 45 135" stroke="#78350f" stroke-width="2.5"/>
      <path d="M 54 125 L 47 125" stroke="#78350f" stroke-width="2.5"/>
      <path d="M 56 145 L 49 145" stroke="#78350f" stroke-width="2.5"/>

      <!-- Right arm holding apricot flag -->
      <path d="M 150 160 Q 175 168 180 150" stroke="#292524" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="180" cy="150" r="7" fill="#fed7aa" stroke="#292524" stroke-width="2.5"/>
      <!-- Flagpole -->
      <path d="M 180 185 L 180 85" stroke="#78350f" stroke-width="4.5" stroke-linecap="round"/>
      <!-- Apricot Flag -->
      <path d="M 180 90 Q 210 100 180 120 Z" fill="#facc15" stroke="#ca8a04" stroke-width="3" filter="url(#ink-shadow)"/>
      <circle cx="195" cy="105" r="3" fill="#b45309"/>
    `;
  } else if (mood === 'thinking') {
    eyes = `
      <circle cx="102" cy="94" r="6" fill="#1c1917" />
      <circle cx="101" cy="92" r="2" fill="#ffffff" />
      <circle cx="138" cy="94" r="6" fill="#1c1917" />
      <circle cx="137" cy="92" r="2" fill="#ffffff" />
    `;
    mouth = `<ellipse cx="120" cy="115" rx="3.5" ry="5" fill="#292524"/>`;
    brow = `
      <path d="M 94 85 Q 102 82 110 87" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M 130 89 Q 138 83 146 84" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none"/>
    `;
    arms = `
      <!-- Left arm stroking beard -->
      <path d="M 90 160 Q 95 145 112 135" stroke="#292524" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="112" cy="135" r="7" fill="#fed7aa" stroke="#292524" stroke-width="2.5"/>
      <!-- Right hand resting on hip -->
      <path d="M 150 160 Q 165 170 160 178" stroke="#292524" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="160" cy="178" r="7" fill="#fed7aa" stroke="#292524" stroke-width="2.5"/>
    `;
    sweatOrMark = `
      <g transform="translate(165, 35)">
        <circle cx="10" cy="20" r="5" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
        <circle cx="20" cy="8" r="9" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
        <circle cx="38" cy="-5" r="16" fill="#ffffff" stroke="#64748b" stroke-width="2.5" filter="url(#ink-shadow)"/>
        <text x="38" y="0" font-family="'Noto Serif TC', serif" font-weight="900" font-size="16" fill="#0284c7" text-anchor="middle" dominant-baseline="middle">卦</text>
      </g>
    `;
  } else if (mood === 'victory') {
    eyes = `
      <path d="M 95 98 Q 102 91 109 98" stroke="#1c1917" stroke-width="4.5" stroke-linecap="round" fill="none"/>
      <path d="M 131 98 Q 138 91 145 98" stroke="#1c1917" stroke-width="4.5" stroke-linecap="round" fill="none"/>
    `;
    mouth = `
      <path d="M 112 112 Q 120 126 128 112 Z" fill="#ef4444" stroke="#292524" stroke-width="3"/>
      <path d="M 115 116 Q 120 122 125 116" fill="#fca5a5"/>
    `;
    brow = `
      <path d="M 93 84 Q 102 81 111 84" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" fill="none"/>
      <path d="M 129 84 Q 138 81 147 84" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" fill="none"/>
    `;
    arms = `
      <!-- Raised arms -->
      <path d="M 85 160 Q 60 135 55 115" stroke="#292524" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="55" cy="115" r="7" fill="#fed7aa" stroke="#292524" stroke-width="2.5"/>
      <path d="M 55 125 L 40 75" stroke="#ca8a04" stroke-width="5" stroke-linecap="round"/>

      <path d="M 155 160 Q 180 135 185 115" stroke="#292524" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="185" cy="115" r="7" fill="#fed7aa" stroke="#292524" stroke-width="2.5"/>
      <!-- Waving flag -->
      <path d="M 185 140 L 185 45" stroke="#78350f" stroke-width="4" stroke-linecap="round"/>
      <path d="M 185 50 Q 225 65 185 90 Z" fill="#facc15" stroke="#ca8a04" stroke-width="3" filter="url(#glow-gold)"/>
    `;
    effects = `
      <circle cx="120" cy="120" r="105" fill="url(#halo-gold)"/>
      <g fill="#f59e0b" filter="url(#glow-gold)">
        <polygon points="120,15 124,25 135,25 126,32 129,42 120,36 111,42 114,32 105,25 116,25" />
        <polygon points="45,45 48,52 56,52 50,57 52,64 45,60 38,64 40,57 34,52 42,52" />
        <polygon points="200,45 203,52 211,52 205,57 207,64 200,60 193,64 195,57 189,52 197,52" />
      </g>
    `;
  } else if (mood === 'panic') {
    eyes = `
      <ellipse cx="102" cy="98" rx="8" ry="10" fill="#ffffff" stroke="#1c1917" stroke-width="3.5"/>
      <circle cx="102" cy="99" r="4" fill="#1c1917"/>
      <ellipse cx="138" cy="98" rx="8" ry="10" fill="#ffffff" stroke="#1c1917" stroke-width="3.5"/>
      <circle cx="138" cy="99" r="4" fill="#1c1917"/>
    `;
    mouth = `<path d="M 112 120 Q 116 114 120 120 T 128 120" stroke="#292524" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    brow = `
      <path d="M 94 82 Q 102 88 110 84" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M 130 84 Q 138 88 146 82" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none"/>
    `;
    arms = `
      <path d="M 85 160 Q 60 145 65 130" stroke="#292524" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="65" cy="130" r="7" fill="#fed7aa" stroke="#292524" stroke-width="2.5"/>
      <path d="M 155 160 Q 180 145 175 130" stroke="#292524" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="175" cy="130" r="7" fill="#fed7aa" stroke="#292524" stroke-width="2.5"/>
    `;
    sweatOrMark = `
      <path d="M 75 80 C 75 75 82 70 82 65 C 82 70 89 75 89 80 A 7 7 0 1 1 75 80 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2" transform="rotate(-20 82 75)"/>
      <path d="M 160 80 C 160 75 167 70 167 65 C 167 70 174 75 174 80 A 7 7 0 1 1 160 80 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2" transform="rotate(20 167 75)"/>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="100%" height="100%">
  ${commonDefs}
  ${effects}
  <g id="jiang-taigong-${mood}">
    <!-- Taoist Robe (Body - 1:1 ratio height approx 80px) -->
    <path d="M 90 150 L 70 215 C 70 220 170 220 170 215 L 150 150 Z" fill="#f8fafc" stroke="#1e293b" stroke-width="4.5" stroke-linejoin="round" filter="url(#ink-shadow)"/>
    <!-- Robe inner trim & Tai Chi belt -->
    <path d="M 120 150 L 120 215" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round"/>
    <path d="M 85 180 Q 120 190 155 180" stroke="#0284c7" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="120" cy="183" r="7" fill="#fef08a" stroke="#ca8a04" stroke-width="2.5"/>

    <!-- Tiny Feet -->
    <ellipse cx="98" cy="216" rx="10" ry="5" fill="#1c1917"/>
    <ellipse cx="142" cy="216" rx="10" ry="5" fill="#1c1917"/>

    <!-- Arms -->
    ${arms}

    <!-- Huge Chibi Head (approx 100px diameter) -->
    <ellipse cx="120" cy="100" rx="46" ry="42" fill="url(#skin-grad)" stroke="#1c1917" stroke-width="4.5" filter="url(#ink-shadow)"/>

    <!-- Rosy Cheeks -->
    <ellipse cx="88" cy="106" rx="9" ry="5" fill="url(#blush-grad)"/>
    <ellipse cx="152" cy="106" rx="9" ry="5" fill="url(#blush-grad)"/>

    <!-- Facial Features -->
    ${brow}
    ${eyes}
    <ellipse cx="120" cy="104" rx="2.5" ry="1.5" fill="#ea580c"/>
    ${mouth}

    <!-- White Hair & Topknot / Daoist Crown -->
    <path d="M 74 100 C 65 70 95 45 120 45 C 145 45 175 70 166 100 C 160 80 145 60 120 60 C 95 60 80 80 74 100 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
    <!-- Hair bun -->
    <circle cx="120" cy="40" r="16" fill="#ffffff" stroke="#1c1917" stroke-width="4"/>
    <!-- Daoist Jade Hairpin & Lotus Cap -->
    <path d="M 106 42 L 134 42 L 130 30 L 110 30 Z" fill="#0284c7" stroke="#1c1917" stroke-width="3"/>
    <path d="M 98 38 L 142 38" stroke="#ca8a04" stroke-width="4" stroke-linecap="round"/>

    <!-- Fluffy Long White Beard -->
    <path d="M 102 115 Q 120 145 120 160 Q 120 145 138 115 C 130 120 110 120 102 115 Z" fill="#ffffff" stroke="#e2e8f0" stroke-width="3.5" filter="url(#ink-shadow)"/>
    <path d="M 112 122 Q 120 145 120 152" stroke="#cbd5e1" stroke-width="2" fill="none"/>

    <!-- Sweat or marks -->
    ${sweatOrMark}
  </g>
</svg>`;
}

/* =========================================================================
   2. NEZHA (哪吒) - 1:1 Head:Body Chibi, Buns, Armillary Sash, Fire Wheels
   ========================================================================= */
function generateNezha(mood) {
  let eyes = '';
  let mouth = '';
  let brow = '';
  let effects = '';
  let sweatOrMark = '';
  let arms = '';

  if (mood === 'idle') {
    eyes = `
      <ellipse cx="102" cy="98" rx="7" ry="7.5" fill="#1c1917" />
      <circle cx="100" cy="95" r="2.5" fill="#ffffff" />
      <ellipse cx="138" cy="98" rx="7" ry="7.5" fill="#1c1917" />
      <circle cx="136" cy="95" r="2.5" fill="#ffffff" />
    `;
    mouth = `<path d="M 116 114 Q 124 118 128 112" stroke="#881337" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
    brow = `
      <path d="M 94 88 L 110 91" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
      <path d="M 146 88 L 130 91" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
    `;
    arms = `
      <!-- Left arm with Qiankun Ring -->
      <path d="M 88 155 Q 65 160 62 145" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="62" cy="145" r="7" fill="#fed7aa" stroke="#1c1917" stroke-width="2.5"/>
      <ellipse cx="60" cy="145" rx="16" ry="12" fill="none" stroke="url(#gold-grad)" stroke-width="5" filter="url(#glow-gold)"/>

      <!-- Right hand on hip -->
      <path d="M 152 155 Q 170 162 172 150" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="172" cy="150" r="7" fill="#fed7aa" stroke="#1c1917" stroke-width="2.5"/>
    `;
  } else if (mood === 'thinking') {
    eyes = `
      <circle cx="104" cy="94" r="6.5" fill="#1c1917" />
      <circle cx="103" cy="92" r="2" fill="#ffffff" />
      <circle cx="140" cy="94" r="6.5" fill="#1c1917" />
      <circle cx="139" cy="92" r="2" fill="#ffffff" />
    `;
    mouth = `<ellipse cx="120" cy="115" rx="4" ry="4.5" fill="#be123c"/>`;
    brow = `
      <path d="M 94 85 L 110 90" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
      <path d="M 146 87 L 130 85" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
    `;
    arms = `
      <path d="M 88 155 Q 65 120 75 75" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="75" cy="75" r="7" fill="#fed7aa" stroke="#1c1917" stroke-width="2.5"/>
      <path d="M 152 155 Q 165 170 162 178" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="162" cy="178" r="7" fill="#fed7aa" stroke="#1c1917" stroke-width="2.5"/>
    `;
    sweatOrMark = `
      <g transform="translate(170, 30)">
        <circle cx="15" cy="20" r="4" fill="#fca5a5"/>
        <circle cx="25" cy="10" r="7" fill="#fee2e2"/>
        <circle cx="42" cy="-2" r="16" fill="#ffffff" stroke="#ef4444" stroke-width="2.5" filter="url(#ink-shadow)"/>
        <text x="42" y="3" font-family="'Noto Sans TC', sans-serif" font-weight="900" font-size="18" fill="#ef4444" text-anchor="middle" dominant-baseline="middle">？</text>
      </g>
    `;
  } else if (mood === 'victory') {
    eyes = `
      <path d="M 95 98 Q 102 88 109 98" stroke="#1c1917" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M 131 98 Q 138 88 145 98" stroke="#1c1917" stroke-width="5" stroke-linecap="round" fill="none"/>
    `;
    mouth = `
      <path d="M 112 110 Q 120 128 128 110 Z" fill="#e11d48" stroke="#1c1917" stroke-width="3"/>
      <polygon points="117,110 120,115 123,110" fill="#ffffff"/>
    `;
    brow = `
      <path d="M 92 84 L 110 88" stroke="#1c1917" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M 148 84 L 130 88" stroke="#1c1917" stroke-width="4.5" stroke-linecap="round"/>
    `;
    arms = `
      <path d="M 85 155 Q 55 130 50 100" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="100" r="7" fill="#fed7aa" stroke="#1c1917" stroke-width="2.5"/>
      <ellipse cx="45" cy="85" rx="16" ry="12" fill="none" stroke="url(#gold-grad)" stroke-width="5" filter="url(#glow-gold)"/>

      <path d="M 155 155 Q 185 130 190 100" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="190" cy="100" r="7" fill="#fed7aa" stroke="#1c1917" stroke-width="2.5"/>
    `;
    effects = `
      <circle cx="120" cy="120" r="105" fill="url(#halo-gold)"/>
      <g fill="#ef4444" filter="url(#glow-red)">
        <polygon points="120,15 124,25 135,25 126,32 129,42 120,36 111,42 114,32 105,25 116,25" />
        <polygon points="40,50 43,56 50,56 45,60 47,67 40,63 33,67 35,60 30,56 37,56" />
        <polygon points="205,50 208,56 215,56 210,60 212,67 205,63 198,67 200,60 195,56 202,56" />
      </g>
    `;
  } else if (mood === 'panic') {
    eyes = `
      <path d="M 97 98 A 5 5 0 0 1 107 98 A 5 5 0 0 1 99 102 A 3 3 0 0 1 105 101" fill="none" stroke="#1c1917" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M 133 98 A 5 5 0 0 1 143 98 A 5 5 0 0 1 135 102 A 3 3 0 0 1 141 101" fill="none" stroke="#1c1917" stroke-width="2.5" stroke-linecap="round"/>
    `;
    mouth = `<ellipse cx="120" cy="116" rx="8" ry="10" fill="#be123c" stroke="#1c1917" stroke-width="3"/>`;
    brow = `
      <path d="M 94 85 Q 102 92 110 88" stroke="#1c1917" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M 130 88 Q 138 92 146 85" stroke="#1c1917" stroke-width="4" stroke-linecap="round" fill="none"/>
    `;
    arms = `
      <path d="M 85 155 Q 60 140 68 120" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="68" cy="120" r="7" fill="#fed7aa" stroke="#1c1917" stroke-width="2.5"/>
      <path d="M 155 155 Q 180 140 172 120" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="172" cy="120" r="7" fill="#fed7aa" stroke="#1c1917" stroke-width="2.5"/>
    `;
    sweatOrMark = `
      <path d="M 75 80 C 75 75 82 70 82 65 C 82 70 89 75 89 80 A 7 7 0 1 1 75 80 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2" transform="rotate(-20 82 75)"/>
      <path d="M 160 80 C 160 75 167 70 167 65 C 167 70 174 75 174 80 A 7 7 0 1 1 160 80 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2" transform="rotate(20 167 75)"/>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="100%" height="100%">
  ${commonDefs}
  ${effects}
  <g id="nezha-${mood}">
    <!-- Floating Red Armillary Sash (混天綾) -->
    <path d="M 45 75 C 20 110 40 180 65 210 C 95 240 145 240 175 210 C 200 180 220 110 195 75 C 175 45 190 10 170 20 C 145 35 95 35 70 20 C 50 10 65 45 45 75 Z" fill="none" stroke="url(#flame-grad)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" filter="url(#glow-red)"/>

    <!-- Wind Fire Wheels (風火輪 under feet) -->
    <g transform="translate(85, 218)">
      <circle cx="0" cy="0" r="14" fill="url(#flame-grad)" filter="url(#glow-red)"/>
      <circle cx="0" cy="0" r="7" fill="#fef08a"/>
      <path d="M -12 0 L 12 0 M 0 -12 L 0 12" stroke="#ffffff" stroke-width="2"/>
    </g>
    <g transform="translate(155, 218)">
      <circle cx="0" cy="0" r="14" fill="url(#flame-grad)" filter="url(#glow-red)"/>
      <circle cx="0" cy="0" r="7" fill="#fef08a"/>
      <path d="M -12 0 L 12 0 M 0 -12 L 0 12" stroke="#ffffff" stroke-width="2"/>
    </g>

    <!-- Lotus Vest / Body (1:1 proportion, compact cute robe) -->
    <path d="M 92 145 L 80 205 C 80 212 160 212 160 205 L 148 145 Z" fill="#10b981" stroke="#1c1917" stroke-width="4.5" stroke-linejoin="round" filter="url(#ink-shadow)"/>
    <!-- Lotus Petal Collar -->
    <path d="M 96 145 Q 120 168 144 145 Z" fill="#fda4af" stroke="#e11d48" stroke-width="2.5"/>
    <circle cx="120" cy="170" r="5" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>

    <!-- Tiny White Trousers & Feet -->
    <ellipse cx="94" cy="208" rx="8" ry="5" fill="#f8fafc" stroke="#1c1917" stroke-width="2"/>
    <ellipse cx="146" cy="208" rx="8" ry="5" fill="#f8fafc" stroke="#1c1917" stroke-width="2"/>

    <!-- Arms -->
    ${arms}

    <!-- Huge Chibi Head -->
    <ellipse cx="120" cy="100" rx="45" ry="42" fill="url(#skin-grad)" stroke="#1c1917" stroke-width="4.5" filter="url(#ink-shadow)"/>

    <!-- Rosy Cheeks -->
    <ellipse cx="88" cy="108" rx="9" ry="5.5" fill="url(#blush-grad)"/>
    <ellipse cx="152" cy="108" rx="9" ry="5.5" fill="url(#blush-grad)"/>

    <!-- Forehead Cinnabar Dot (硃砂痣) -->
    <circle cx="120" cy="80" r="4" fill="#e11d48"/>

    <!-- Facial Features -->
    ${brow}
    ${eyes}
    <ellipse cx="120" cy="104" rx="2" ry="1.5" fill="#e11d48"/>
    ${mouth}

    <!-- Nezha Black Hair with Twin Buns & Red Ribbons -->
    <path d="M 76 92 C 75 65 95 56 120 56 C 145 56 165 65 164 92 C 152 75 138 72 120 72 C 102 72 88 75 76 92 Z" fill="#1c1917"/>
    <path d="M 112 68 Q 120 80 128 68" stroke="#1c1917" stroke-width="3" fill="#1c1917"/>

    <!-- Left Bun -->
    <circle cx="70" cy="50" r="16" fill="#1c1917" stroke="#1c1917" stroke-width="3"/>
    <ellipse cx="70" cy="62" rx="10" ry="4" fill="#e11d48"/>
    <path d="M 64 64 Q 50 80 45 95" stroke="#e11d48" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M 72 64 Q 65 85 62 100" stroke="#e11d48" stroke-width="3" stroke-linecap="round" fill="none"/>
    <circle cx="70" cy="50" r="6" fill="url(#gold-grad)"/>

    <!-- Right Bun -->
    <circle cx="170" cy="50" r="16" fill="#1c1917" stroke="#1c1917" stroke-width="3"/>
    <ellipse cx="170" cy="62" rx="10" ry="4" fill="#e11d48"/>
    <path d="M 176 64 Q 190 80 195 95" stroke="#e11d48" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M 168 64 Q 175 85 178 100" stroke="#e11d48" stroke-width="3" stroke-linecap="round" fill="none"/>
    <circle cx="170" cy="50" r="6" fill="url(#gold-grad)"/>

    ${sweatOrMark}
  </g>
</svg>`;
}

/* =========================================================================
   3. YANG JIAN (楊戩) - Third Eye, Silver Armor, 3-Point Spear, Chibi Xiaotian Dog
   ========================================================================= */
function generateYangJian(mood) {
  let eyes = '';
  let thirdEye = '';
  let mouth = '';
  let brow = '';
  let effects = '';
  let sweatOrMark = '';
  let armsAndDog = '';

  if (mood === 'idle') {
    eyes = `
      <polygon points="96,98 108,94 108,102" fill="#1e293b"/>
      <circle cx="103" cy="98" r="4.5" fill="#0284c7"/>
      <circle cx="102" cy="96" r="1.5" fill="#ffffff"/>
      <polygon points="144,98 132,94 132,102" fill="#1e293b"/>
      <circle cx="137" cy="98" r="4.5" fill="#0284c7"/>
      <circle cx="136" cy="96" r="1.5" fill="#ffffff"/>
    `;
    thirdEye = `
      <g transform="translate(120, 76)">
        <path d="M 0 -7 Q 6 0 0 7 Q -6 0 0 -7 Z" fill="#0284c7" stroke="#ca8a04" stroke-width="2" filter="url(#glow-gold)"/>
        <circle cx="0" cy="0" r="2.5" fill="#fef08a"/>
      </g>
    `;
    mouth = `<path d="M 115 116 L 125 116" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>`;
    brow = `
      <path d="M 94 90 L 110 93" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
      <path d="M 146 90 L 130 93" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
    `;
    armsAndDog = `
      <!-- Right hand holding Three-pointed blade -->
      <path d="M 152 155 Q 175 165 180 145" stroke="#1e293b" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="180" cy="145" r="7" fill="#fed7aa" stroke="#1e293b" stroke-width="2.5"/>
      <path d="M 180 215 L 180 60" stroke="#475569" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M 180 60 L 180 30 L 175 45 L 168 52 L 176 56 Z" fill="#e2e8f0" stroke="#0284c7" stroke-width="2"/>
      <path d="M 180 60 L 180 30 L 185 45 L 192 52 L 184 56 Z" fill="#e2e8f0" stroke="#0284c7" stroke-width="2"/>
      <circle cx="180" cy="58" r="4" fill="#ca8a04"/>

      <!-- Left arm on waist -->
      <path d="M 88 155 Q 70 162 68 150" stroke="#1e293b" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="68" cy="150" r="7" fill="#fed7aa" stroke="#1e293b" stroke-width="2.5"/>

      <!-- Super Cute Chibi Xiaotian Dog sitting -->
      <g id="xiaotian-dog" transform="translate(42, 175)">
        <ellipse cx="15" cy="20" rx="12" ry="10" fill="#1c1917" stroke="#475569" stroke-width="2"/>
        <circle cx="15" cy="5" r="10" fill="#1c1917" stroke="#475569" stroke-width="2"/>
        <ellipse cx="5" cy="5" rx="3.5" ry="7" fill="#334155" transform="rotate(20 5 5)"/>
        <ellipse cx="25" cy="5" rx="3.5" ry="7" fill="#334155" transform="rotate(-20 25 5)"/>
        <circle cx="12" cy="4" r="2.5" fill="#fef08a"/>
        <circle cx="18" cy="4" r="2.5" fill="#fef08a"/>
        <circle cx="12" cy="3.5" r="1" fill="#ffffff"/>
        <circle cx="18" cy="3.5" r="1" fill="#ffffff"/>
        <circle cx="15" cy="8" r="1.5" fill="#f43f5e"/>
        <path d="M 2 18 Q -5 12 0 8" stroke="#1c1917" stroke-width="3" stroke-linecap="round" fill="none"/>
        <rect x="9" y="11" width="12" height="3" fill="#ef4444" rx="1.5"/>
      </g>
    `;
  } else if (mood === 'thinking') {
    eyes = `
      <circle cx="103" cy="94" r="6" fill="#1e293b"/>
      <circle cx="102" cy="92" r="2" fill="#ffffff"/>
      <circle cx="137" cy="94" r="6" fill="#1e293b"/>
      <circle cx="136" cy="92" r="2" fill="#ffffff"/>
    `;
    thirdEye = `
      <g transform="translate(120, 76)">
        <path d="M 0 -7 Q 6 0 0 7 Q -6 0 0 -7 Z" fill="#0284c7" stroke="#ca8a04" stroke-width="2"/>
        <line x1="-3" y1="0" x2="3" y2="0" stroke="#fef08a" stroke-width="2"/>
      </g>
    `;
    mouth = `<ellipse cx="120" cy="115" rx="3.5" ry="4" fill="#1e293b"/>`;
    brow = `
      <path d="M 94 86 L 110 90" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
      <path d="M 146 89 L 130 87" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
    `;
    armsAndDog = `
      <path d="M 88 155 Q 92 140 108 128" stroke="#1e293b" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="108" cy="128" r="7" fill="#fed7aa" stroke="#1e293b" stroke-width="2.5"/>
      <path d="M 152 155 Q 165 170 162 178" stroke="#1e293b" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="162" cy="178" r="7" fill="#fed7aa" stroke="#1e293b" stroke-width="2.5"/>
      <g id="xiaotian-dog" transform="translate(42, 175) rotate(-10 15 15)">
        <ellipse cx="15" cy="20" rx="12" ry="10" fill="#1c1917" stroke="#475569" stroke-width="2"/>
        <circle cx="15" cy="5" r="10" fill="#1c1917" stroke="#475569" stroke-width="2"/>
        <circle cx="12" cy="4" r="2.5" fill="#fef08a"/>
        <circle cx="18" cy="4" r="2.5" fill="#fef08a"/>
        <circle cx="15" cy="8" r="1.5" fill="#f43f5e"/>
      </g>
    `;
    sweatOrMark = `
      <g transform="translate(170, 30)">
        <circle cx="15" cy="20" r="4" fill="#93c5fd"/>
        <circle cx="25" cy="10" r="7" fill="#dbeafe"/>
        <circle cx="42" cy="-2" r="16" fill="#ffffff" stroke="#0284c7" stroke-width="2.5" filter="url(#ink-shadow)"/>
        <text x="42" y="3" font-family="'Noto Sans TC', sans-serif" font-weight="900" font-size="18" fill="#0284c7" text-anchor="middle" dominant-baseline="middle">破</text>
      </g>
    `;
  } else if (mood === 'victory') {
    eyes = `
      <path d="M 95 98 Q 102 90 109 98" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round" fill="none"/>
      <path d="M 131 98 Q 138 90 145 98" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round" fill="none"/>
    `;
    thirdEye = `
      <g transform="translate(120, 76)">
        <path d="M 0 -8 Q 8 0 0 8 Q -8 0 0 -8 Z" fill="#38bdf8" stroke="#fef08a" stroke-width="2.5" filter="url(#glow-gold)"/>
        <circle cx="0" cy="0" r="3" fill="#ffffff"/>
      </g>
    `;
    mouth = `
      <path d="M 112 112 Q 120 125 128 112 Z" fill="#0284c7" stroke="#1e293b" stroke-width="3"/>
    `;
    brow = `
      <path d="M 92 84 L 110 88" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
      <path d="M 148 84 L 130 88" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
    `;
    armsAndDog = `
      <path d="M 152 155 Q 180 130 185 105" stroke="#1e293b" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="185" cy="105" r="7" fill="#fed7aa" stroke="#1e293b" stroke-width="2.5"/>
      <path d="M 185 170 L 185 30" stroke="#475569" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M 185 30 L 185 0 L 178 18 L 170 26 L 180 30 Z" fill="#e2e8f0" stroke="#0284c7" stroke-width="2" filter="url(#glow-gold)"/>
      <path d="M 185 30 L 185 0 L 192 18 L 200 26 L 190 30 Z" fill="#e2e8f0" stroke="#0284c7" stroke-width="2" filter="url(#glow-gold)"/>

      <path d="M 88 155 Q 60 135 55 110" stroke="#1e293b" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="55" cy="110" r="7" fill="#fed7aa" stroke="#1e293b" stroke-width="2.5"/>

      <g id="xiaotian-dog" transform="translate(38, 170)">
        <ellipse cx="15" cy="22" rx="12" ry="10" fill="#1c1917" stroke="#475569" stroke-width="2"/>
        <path d="M 10 12 L 18 2 L 25 10 Z" fill="#1c1917"/>
        <ellipse cx="18" cy="2" rx="4" ry="3" fill="#f43f5e"/>
        <path d="M 2 20 Q -8 15 -2 8" stroke="#1c1917" stroke-width="3" stroke-linecap="round" fill="none"/>
      </g>
    `;
    effects = `
      <circle cx="120" cy="120" r="105" fill="url(#halo-gold)"/>
      <g fill="#38bdf8" filter="url(#glow-gold)">
        <polygon points="120,15 124,25 135,25 126,32 129,42 120,36 111,42 114,32 105,25 116,25" />
        <polygon points="45,45 48,52 56,52 50,57 52,64 45,60 38,64 40,57 34,52 42,52" />
        <polygon points="200,45 203,52 211,52 205,57 207,64 200,60 193,64 195,57 189,52 197,52" />
      </g>
    `;
  } else if (mood === 'panic') {
    eyes = `
      <ellipse cx="102" cy="98" rx="8" ry="10" fill="#ffffff" stroke="#1e293b" stroke-width="3.5"/>
      <circle cx="102" cy="99" r="4" fill="#1e293b"/>
      <ellipse cx="138" cy="98" rx="8" ry="10" fill="#ffffff" stroke="#1e293b" stroke-width="3.5"/>
      <circle cx="138" cy="99" r="4" fill="#1e293b"/>
    `;
    thirdEye = `
      <g transform="translate(120, 76)">
        <ellipse cx="0" cy="0" rx="6" ry="7" fill="#ffffff" stroke="#ca8a04" stroke-width="2"/>
        <circle cx="0" cy="0" r="3" fill="#ef4444"/>
      </g>
    `;
    mouth = `<path d="M 112 120 Q 116 114 120 120 T 128 120" stroke="#1e293b" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    brow = `
      <path d="M 94 83 Q 102 90 110 86" stroke="#1e293b" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M 130 86 Q 138 90 146 83" stroke="#1e293b" stroke-width="4" stroke-linecap="round" fill="none"/>
    `;
    armsAndDog = `
      <path d="M 85 155 Q 60 140 68 120" stroke="#1e293b" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="68" cy="120" r="7" fill="#fed7aa" stroke="#1e293b" stroke-width="2.5"/>
      <path d="M 155 155 Q 180 140 172 120" stroke="#1e293b" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="172" cy="120" r="7" fill="#fed7aa" stroke="#1e293b" stroke-width="2.5"/>
      <g id="xiaotian-dog" transform="translate(38, 178)">
        <ellipse cx="15" cy="18" rx="12" ry="8" fill="#1c1917" stroke="#475569" stroke-width="2"/>
        <circle cx="15" cy="6" r="9" fill="#1c1917"/>
        <ellipse cx="12" cy="5" rx="3" ry="3.5" fill="#ffffff"/>
        <ellipse cx="18" cy="5" rx="3" ry="3.5" fill="#ffffff"/>
        <circle cx="12" cy="5" r="1.5" fill="#1c1917"/>
        <circle cx="18" cy="5" r="1.5" fill="#1c1917"/>
      </g>
    `;
    sweatOrMark = `
      <path d="M 75 80 C 75 75 82 70 82 65 C 82 70 89 75 89 80 A 7 7 0 1 1 75 80 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2" transform="rotate(-20 82 75)"/>
      <path d="M 160 80 C 160 75 167 70 167 65 C 167 70 174 75 174 80 A 7 7 0 1 1 160 80 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2" transform="rotate(20 167 75)"/>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="100%" height="100%">
  ${commonDefs}
  ${effects}
  <g id="yang-jian-${mood}">
    <path d="M 80 150 C 50 180 60 225 70 230 C 120 235 170 235 210 215 C 200 170 160 150 160 150 Z" fill="#0284c7" opacity="0.9" filter="url(#ink-shadow)"/>

    <!-- Silver Armor Body (1:1 Ratio) -->
    <path d="M 90 148 L 78 212 C 78 218 162 218 162 212 L 150 148 Z" fill="#e2e8f0" stroke="#1e293b" stroke-width="4.5" stroke-linejoin="round" filter="url(#ink-shadow)"/>
    <circle cx="120" cy="175" r="11" fill="url(#gold-grad)" stroke="#ca8a04" stroke-width="2.5"/>
    <circle cx="120" cy="175" r="5" fill="#f8fafc"/>
    <path d="M 86 188 Q 120 196 154 188" stroke="#ca8a04" stroke-width="4" fill="none"/>

    <ellipse cx="96" cy="214" rx="9" ry="5" fill="#334155" stroke="#1e293b" stroke-width="2"/>
    <ellipse cx="144" cy="214" rx="9" ry="5" fill="#334155" stroke="#1e293b" stroke-width="2"/>

    <!-- Arms & Xiaotian Dog -->
    ${armsAndDog}

    <!-- Huge Chibi Head -->
    <ellipse cx="120" cy="100" rx="45" ry="42" fill="url(#skin-grad)" stroke="#1e293b" stroke-width="4.5" filter="url(#ink-shadow)"/>

    <!-- Rosy Cheeks -->
    <ellipse cx="88" cy="108" rx="8" ry="4.5" fill="url(#blush-grad)"/>
    <ellipse cx="152" cy="108" rx="8" ry="4.5" fill="url(#blush-grad)"/>

    <!-- Third Eye -->
    ${thirdEye}

    <!-- Facial Features -->
    ${brow}
    ${eyes}
    <ellipse cx="120" cy="105" rx="2" ry="1.5" fill="#ea580c"/>
    ${mouth}

    <!-- Silver Warrior Crown & Black Hair -->
    <path d="M 74 95 C 72 65 95 56 120 56 C 145 56 168 65 166 95 C 155 76 138 72 120 72 C 102 72 85 76 74 95 Z" fill="#1e293b"/>
    <polygon points="120,38 126,56 114,56" fill="url(#gold-grad)" stroke="#ca8a04" stroke-width="2"/>
    <polygon points="105,44 114,58 102,58" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
    <polygon points="135,44 138,58 126,58" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
    <circle cx="120" cy="56" r="5" fill="#0284c7" stroke="#ffffff" stroke-width="1.5"/>

    ${sweatOrMark}
  </g>
</svg>`;
}

/* =========================================================================
   4. SU DAJI (蘇妲己) - Nine Tails, Fox Ears, Soul Lantern, Mischievous Vibe
   ========================================================================= */
function generateSuDaji(mood) {
  let eyes = '';
  let mouth = '';
  let brow = '';
  let effects = '';
  let sweatOrMark = '';
  let arms = '';

  if (mood === 'idle') {
    eyes = `
      <path d="M 94 95 Q 102 90 110 98" stroke="#be123c" stroke-width="4" stroke-linecap="round" fill="none"/>
      <circle cx="104" cy="98" r="6" fill="#831843"/>
      <circle cx="102" cy="96" r="2" fill="#ffffff"/>
      <path d="M 146 95 Q 138 90 130 98" stroke="#be123c" stroke-width="4" stroke-linecap="round" fill="none"/>
      <circle cx="136" cy="98" r="6" fill="#831843"/>
      <circle cx="134" cy="96" r="2" fill="#ffffff"/>
    `;
    mouth = `<path d="M 115 115 Q 120 121 127 114" stroke="#be123c" stroke-width="3" stroke-linecap="round" fill="none"/>`;
    brow = `
      <path d="M 94 86 Q 102 82 108 86" stroke="#831843" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M 146 86 Q 138 82 132 86" stroke="#831843" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    `;
    arms = `
      <!-- Left arm holding Soul Lantern -->
      <path d="M 88 155 Q 60 165 55 145" stroke="#1c1917" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <circle cx="55" cy="145" r="6.5" fill="#fed7aa" stroke="#1c1917" stroke-width="2"/>
      <path d="M 55 145 L 55 160" stroke="#ca8a04" stroke-width="2.5"/>
      <g transform="translate(55, 175)">
        <polygon points="0,-12 12,0 0,12 -12,0" fill="#f43f5e" filter="url(#glow-red)"/>
        <polygon points="0,-7 7,0 0,7 -7,0" fill="#fef08a"/>
        <path d="M -12 0 L 12 0" stroke="#ca8a04" stroke-width="2"/>
        <path d="M 0 12 L 0 24" stroke="#e11d48" stroke-width="3" stroke-linecap="round"/>
      </g>

      <!-- Right hand touching cheek playfully -->
      <path d="M 152 155 Q 165 140 156 120" stroke="#1c1917" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <circle cx="156" cy="120" r="6.5" fill="#fed7aa" stroke="#1c1917" stroke-width="2"/>
    `;
  } else if (mood === 'thinking') {
    eyes = `
      <circle cx="104" cy="94" r="6" fill="#831843"/>
      <circle cx="102" cy="92" r="2" fill="#ffffff"/>
      <circle cx="138" cy="94" r="6" fill="#831843"/>
      <circle cx="136" cy="92" r="2" fill="#ffffff"/>
    `;
    mouth = `<ellipse cx="120" cy="115" rx="3" ry="4" fill="#be123c"/>`;
    brow = `
      <path d="M 94 85 Q 102 81 110 86" stroke="#831843" stroke-width="3" fill="none"/>
      <path d="M 146 88 Q 138 82 130 84" stroke="#831843" stroke-width="3" fill="none"/>
    `;
    arms = `
      <path d="M 88 155 Q 95 135 115 125" stroke="#1c1917" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <circle cx="115" cy="125" r="6.5" fill="#fed7aa" stroke="#1c1917" stroke-width="2"/>
      <path d="M 152 155 Q 165 170 162 178" stroke="#1c1917" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <circle cx="162" cy="178" r="6.5" fill="#fed7aa" stroke="#1c1917" stroke-width="2"/>
    `;
    sweatOrMark = `
      <g transform="translate(170, 30)">
        <circle cx="15" cy="20" r="4" fill="#fbcfe8"/>
        <circle cx="25" cy="10" r="7" fill="#fce7f3"/>
        <circle cx="42" cy="-2" r="16" fill="#ffffff" stroke="#f43f5e" stroke-width="2.5" filter="url(#ink-shadow)"/>
        <text x="42" y="3" font-family="'Noto Serif TC', serif" font-weight="900" font-size="16" fill="#f43f5e" text-anchor="middle" dominant-baseline="middle">惑</text>
      </g>
    `;
  } else if (mood === 'victory') {
    eyes = `
      <path d="M 95 98 Q 102 90 109 98" stroke="#be123c" stroke-width="4.5" stroke-linecap="round" fill="none"/>
      <path d="M 131 98 Q 138 90 145 98" stroke="#be123c" stroke-width="4.5" stroke-linecap="round" fill="none"/>
    `;
    mouth = `
      <path d="M 112 110 Q 120 126 128 110 Z" fill="#e11d48" stroke="#be123c" stroke-width="3"/>
      <polygon points="115,110 118,114 120,110" fill="#ffffff"/>
    `;
    brow = `
      <path d="M 94 84 Q 102 80 110 84" stroke="#831843" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M 146 84 Q 138 80 130 84" stroke="#831843" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    `;
    arms = `
      <path d="M 85 155 Q 60 130 55 105" stroke="#1c1917" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <circle cx="55" cy="105" r="6.5" fill="#fed7aa" stroke="#1c1917" stroke-width="2"/>
      <path d="M 155 155 Q 180 130 185 105" stroke="#1c1917" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <circle cx="185" cy="105" r="6.5" fill="#fed7aa" stroke="#1c1917" stroke-width="2"/>
    `;
    effects = `
      <circle cx="120" cy="120" r="105" fill="url(#halo-gold)"/>
      <g fill="#f43f5e" filter="url(#glow-red)">
        <circle cx="120" cy="20" r="6"/>
        <circle cx="45" cy="50" r="5"/>
        <circle cx="195" cy="50" r="5"/>
      </g>
    `;
  } else if (mood === 'panic') {
    eyes = `
      <ellipse cx="102" cy="98" rx="8" ry="10" fill="#ffffff" stroke="#be123c" stroke-width="3.5"/>
      <circle cx="102" cy="99" r="4" fill="#831843"/>
      <ellipse cx="138" cy="98" rx="8" ry="10" fill="#ffffff" stroke="#be123c" stroke-width="3.5"/>
      <circle cx="138" cy="99" r="4" fill="#831843"/>
    `;
    mouth = `<path d="M 112 120 Q 116 114 120 120 T 128 120" stroke="#be123c" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    brow = `
      <path d="M 94 83 Q 102 90 110 86" stroke="#831843" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M 130 86 Q 138 90 146 83" stroke="#831843" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    `;
    arms = `
      <path d="M 85 155 Q 60 140 68 120" stroke="#1c1917" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <circle cx="68" cy="120" r="6.5" fill="#fed7aa" stroke="#1c1917" stroke-width="2"/>
      <path d="M 155 155 Q 180 140 172 120" stroke="#1c1917" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <circle cx="172" cy="120" r="6.5" fill="#fed7aa" stroke="#1c1917" stroke-width="2"/>
    `;
    sweatOrMark = `
      <path d="M 75 80 C 75 75 82 70 82 65 C 82 70 89 75 89 80 A 7 7 0 1 1 75 80 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2" transform="rotate(-20 82 75)"/>
      <path d="M 160 80 C 160 75 167 70 167 65 C 167 70 174 75 174 80 A 7 7 0 1 1 160 80 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2" transform="rotate(20 167 75)"/>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="100%" height="100%">
  ${commonDefs}
  ${effects}
  <g id="su-daji-${mood}">
    <!-- Nine Fluffy Fox Tails (九尾) -->
    <g id="fox-tails" opacity="0.95">
      <path d="M 120 170 Q 30 190 20 130 Q 35 100 65 150 Z" fill="url(#pink-grad)" filter="url(#ink-shadow)"/>
      <path d="M 120 170 Q 210 190 220 130 Q 205 100 175 150 Z" fill="url(#pink-grad)" filter="url(#ink-shadow)"/>
      <path d="M 120 170 Q 45 220 30 170 Q 60 140 85 165 Z" fill="#fda4af"/>
      <path d="M 120 170 Q 195 220 210 170 Q 180 140 155 165 Z" fill="#fda4af"/>
      <path d="M 120 175 Q 120 235 110 225 Q 130 225 120 175 Z" fill="#f43f5e"/>
    </g>

    <!-- Silk Kimono / Hanfu Dress (1:1 Ratio) -->
    <path d="M 92 148 L 76 215 C 76 220 164 220 164 215 L 148 148 Z" fill="#fff1f2" stroke="#be123c" stroke-width="4" stroke-linejoin="round" filter="url(#ink-shadow)"/>
    <path d="M 88 175 Q 120 185 152 175" stroke="#e11d48" stroke-width="8" fill="none"/>
    <circle cx="120" cy="180" r="5" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
    <path d="M 120 185 L 115 210 M 120 185 L 125 210" stroke="#be123c" stroke-width="3" stroke-linecap="round"/>

    <ellipse cx="98" cy="216" rx="8" ry="4.5" fill="#be123c"/>
    <ellipse cx="142" cy="216" rx="8" ry="4.5" fill="#be123c"/>

    <!-- Arms -->
    ${arms}

    <!-- Huge Chibi Head -->
    <ellipse cx="120" cy="100" rx="45" ry="42" fill="url(#skin-grad)" stroke="#1c1917" stroke-width="4.5" filter="url(#ink-shadow)"/>

    <!-- Fluffy Fox Ears on top of head -->
    <g id="fox-ears">
      <path d="M 75 75 L 60 30 L 95 55 Z" fill="#f43f5e" stroke="#1c1917" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M 73 68 L 66 40 L 88 56 Z" fill="#fed7aa"/>
      <path d="M 165 75 L 180 30 L 145 55 Z" fill="#f43f5e" stroke="#1c1917" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M 167 68 L 174 40 L 152 56 Z" fill="#fed7aa"/>
    </g>

    <!-- Rosy Cheeks -->
    <ellipse cx="88" cy="108" rx="9" ry="6" fill="url(#blush-grad)"/>
    <ellipse cx="152" cy="108" rx="9" ry="6" fill="url(#blush-grad)"/>

    <!-- Facial Features -->
    ${brow}
    ${eyes}
    <ellipse cx="120" cy="105" rx="2" ry="1.5" fill="#be123c"/>
    ${mouth}

    <!-- Beautiful Jet-Black Hair with Pink Peony Hairpin -->
    <path d="M 76 92 C 72 65 95 56 120 56 C 145 56 168 65 164 92 C 150 75 138 72 120 72 C 102 72 90 75 76 92 Z" fill="#1c1917"/>
    <circle cx="120" cy="50" r="12" fill="#1c1917"/>
    <circle cx="120" cy="50" r="7" fill="#f43f5e" stroke="#fef08a" stroke-width="2"/>
    <path d="M 108 52 L 132 52" stroke="#ca8a04" stroke-width="3" stroke-linecap="round"/>

    ${sweatOrMark}
  </g>
</svg>`;
}

/* =========================================================================
   5. SHEN GONGBAO (申公豹) - Crooked Smirk, Riding Black Tiger, Dark Daoist Robe
   ========================================================================= */
function generateShenGongbao(mood) {
  let eyes = '';
  let mouth = '';
  let brow = '';
  let effects = '';
  let sweatOrMark = '';
  let armsAndTiger = '';

  if (mood === 'idle') {
    eyes = `
      <polygon points="96,98 108,94 108,102" fill="#1c1917"/>
      <circle cx="104" cy="98" r="4.5" fill="#7e22ce"/>
      <circle cx="102" cy="96" r="1.5" fill="#ffffff"/>
      <polygon points="144,98 132,94 132,102" fill="#1c1917"/>
      <circle cx="136" cy="98" r="4.5" fill="#7e22ce"/>
      <circle cx="134" cy="96" r="1.5" fill="#ffffff"/>
    `;
    mouth = `<path d="M 112 118 Q 120 120 130 110" stroke="#1c1917" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
    brow = `
      <path d="M 94 92 L 110 88" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
      <path d="M 146 86 L 130 90" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
    `;
    armsAndTiger = `
      <!-- Left arm beckoning ("道友請留步") -->
      <path d="M 88 155 Q 60 150 55 135" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="55" cy="135" r="7" fill="#fed7aa" stroke="#1c1917" stroke-width="2.5"/>
      <path d="M 48 130 L 55 135 L 50 142" stroke="#1c1917" stroke-width="2" fill="none"/>

      <!-- Right arm holding dark whisk -->
      <path d="M 152 155 Q 175 160 178 145" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="178" cy="145" r="7" fill="#fed7aa" stroke="#1c1917" stroke-width="2.5"/>
      <path d="M 178 155 L 178 125" stroke="#ca8a04" stroke-width="4" stroke-linecap="round"/>
      <path d="M 178 125 Q 195 110 185 90" stroke="#a855f7" stroke-width="5" fill="none" stroke-linecap="round"/>

      <!-- Mini Black-Spotted Tiger at his feet -->
      <g id="black-tiger" transform="translate(38, 172)">
        <ellipse cx="20" cy="20" rx="14" ry="10" fill="#334155" stroke="#0f172a" stroke-width="2"/>
        <circle cx="20" cy="8" r="11" fill="#334155" stroke="#0f172a" stroke-width="2"/>
        <circle cx="12" cy="0" r="4" fill="#0f172a"/>
        <circle cx="28" cy="0" r="4" fill="#0f172a"/>
        <path d="M 20 2 L 20 6 M 16 4 L 18 6 M 24 4 L 22 6" stroke="#0f172a" stroke-width="1.5"/>
        <circle cx="16" cy="8" r="2.5" fill="#facc15"/>
        <circle cx="24" cy="8" r="2.5" fill="#facc15"/>
        <circle cx="20" cy="12" r="1.5" fill="#f43f5e"/>
        <path d="M 4 20 Q -4 14 2 8" stroke="#334155" stroke-width="4" stroke-linecap="round" fill="none"/>
      </g>
    `;
  } else if (mood === 'thinking') {
    eyes = `
      <circle cx="104" cy="94" r="6" fill="#7e22ce"/>
      <circle cx="102" cy="92" r="2" fill="#ffffff"/>
      <circle cx="138" cy="94" r="6" fill="#7e22ce"/>
      <circle cx="136" cy="92" r="2" fill="#ffffff"/>
    `;
    mouth = `<ellipse cx="120" cy="115" rx="3.5" ry="4" fill="#1c1917"/>`;
    brow = `
      <path d="M 94 86 L 110 90" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
      <path d="M 146 90 L 130 86" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
    `;
    armsAndTiger = `
      <path d="M 88 155 Q 92 140 108 128" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="108" cy="128" r="7" fill="#fed7aa" stroke="#1c1917" stroke-width="2.5"/>
      <path d="M 152 155 Q 165 170 162 178" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="162" cy="178" r="7" fill="#fed7aa" stroke="#1c1917" stroke-width="2.5"/>
      <g id="black-tiger" transform="translate(38, 176)">
        <ellipse cx="20" cy="18" rx="14" ry="9" fill="#334155" stroke="#0f172a" stroke-width="2"/>
        <circle cx="20" cy="8" r="10" fill="#334155" stroke="#0f172a" stroke-width="2"/>
        <path d="M 14 8 Q 17 10 20 8 M 20 8 Q 23 10 26 8" stroke="#facc15" stroke-width="2" fill="none"/>
      </g>
    `;
    sweatOrMark = `
      <g transform="translate(170, 30)">
        <circle cx="15" cy="20" r="4" fill="#e9d5ff"/>
        <circle cx="25" cy="10" r="7" fill="#f3e8ff"/>
        <circle cx="42" cy="-2" r="16" fill="#ffffff" stroke="#9333ea" stroke-width="2.5" filter="url(#ink-shadow)"/>
        <text x="42" y="3" font-family="'Noto Serif TC', serif" font-weight="900" font-size="16" fill="#9333ea" text-anchor="middle" dominant-baseline="middle">計</text>
      </g>
    `;
  } else if (mood === 'victory') {
    eyes = `
      <path d="M 95 98 Q 102 90 109 98" stroke="#1c1917" stroke-width="4.5" stroke-linecap="round" fill="none"/>
      <path d="M 131 98 Q 138 90 145 98" stroke="#1c1917" stroke-width="4.5" stroke-linecap="round" fill="none"/>
    `;
    mouth = `
      <path d="M 112 110 Q 120 128 132 108 Z" fill="#7e22ce" stroke="#1c1917" stroke-width="3"/>
      <polygon points="116,110 119,114 122,110" fill="#ffffff"/>
    `;
    brow = `
      <path d="M 92 84 L 110 88" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
      <path d="M 148 84 L 130 88" stroke="#1c1917" stroke-width="4" stroke-linecap="round"/>
    `;
    armsAndTiger = `
      <path d="M 85 155 Q 55 130 50 100" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="100" r="7" fill="#fed7aa" stroke="#1c1917" stroke-width="2.5"/>
      <path d="M 155 155 Q 185 130 190 100" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="190" cy="100" r="7" fill="#fed7aa" stroke="#1c1917" stroke-width="2.5"/>

      <g id="black-tiger" transform="translate(38, 170)">
        <ellipse cx="20" cy="20" rx="14" ry="10" fill="#334155" stroke="#0f172a" stroke-width="2"/>
        <circle cx="20" cy="8" r="11" fill="#334155" stroke="#0f172a" stroke-width="2"/>
        <path d="M 15 8 Q 20 14 25 8 Z" fill="#ef4444"/>
      </g>
    `;
    effects = `
      <circle cx="120" cy="120" r="105" fill="url(#halo-gold)"/>
      <g fill="#9333ea" filter="url(#glow-red)">
        <polygon points="120,15 124,25 135,25 126,32 129,42 120,36 111,42 114,32 105,25 116,25" />
        <polygon points="45,45 48,52 56,52 50,57 52,64 45,60 38,64 40,57 34,52 42,52" />
        <polygon points="200,45 203,52 211,52 205,57 207,64 200,60 193,64 195,57 189,52 197,52" />
      </g>
    `;
  } else if (mood === 'panic') {
    eyes = `
      <ellipse cx="102" cy="98" rx="8" ry="10" fill="#ffffff" stroke="#1c1917" stroke-width="3.5"/>
      <circle cx="102" cy="99" r="4" fill="#7e22ce"/>
      <ellipse cx="138" cy="98" rx="8" ry="10" fill="#ffffff" stroke="#1c1917" stroke-width="3.5"/>
      <circle cx="138" cy="99" r="4" fill="#7e22ce"/>
    `;
    mouth = `<path d="M 112 120 Q 116 114 120 120 T 128 120" stroke="#1c1917" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    brow = `
      <path d="M 94 83 Q 102 90 110 86" stroke="#1c1917" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M 130 86 Q 138 90 146 83" stroke="#1c1917" stroke-width="4" stroke-linecap="round" fill="none"/>
    `;
    armsAndTiger = `
      <path d="M 85 155 Q 60 140 68 120" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="68" cy="120" r="7" fill="#fed7aa" stroke="#1c1917" stroke-width="2.5"/>
      <path d="M 155 155 Q 180 140 172 120" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="172" cy="120" r="7" fill="#fed7aa" stroke="#1c1917" stroke-width="2.5"/>
      <g id="black-tiger" transform="translate(38, 175)">
        <ellipse cx="20" cy="18" rx="14" ry="9" fill="#334155" stroke="#0f172a" stroke-width="2"/>
        <circle cx="20" cy="8" r="10" fill="#334155"/>
        <ellipse cx="16" cy="7" rx="3" ry="3.5" fill="#ffffff"/>
        <ellipse cx="24" cy="7" rx="3" ry="3.5" fill="#ffffff"/>
      </g>
    `;
    sweatOrMark = `
      <path d="M 75 80 C 75 75 82 70 82 65 C 82 70 89 75 89 80 A 7 7 0 1 1 75 80 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2" transform="rotate(-20 82 75)"/>
      <path d="M 160 80 C 160 75 167 70 167 65 C 167 70 174 75 174 80 A 7 7 0 1 1 160 80 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2" transform="rotate(20 167 75)"/>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="100%" height="100%">
  ${commonDefs}
  ${effects}
  <g id="shen-gongbao-${mood}">
    <!-- Dark Daoist Robe (1:1 Ratio) -->
    <path d="M 90 148 L 76 215 C 76 220 164 220 164 215 L 150 148 Z" fill="#3b0764" stroke="#1c1917" stroke-width="4.5" stroke-linejoin="round" filter="url(#ink-shadow)"/>
    <path d="M 120 148 L 120 215" stroke="#9333ea" stroke-width="5" stroke-linecap="round"/>
    <circle cx="120" cy="180" r="7" fill="#facc15" stroke="#1c1917" stroke-width="2"/>

    <ellipse cx="96" cy="216" rx="9" ry="5" fill="#1c1917"/>
    <ellipse cx="144" cy="216" rx="9" ry="5" fill="#1c1917"/>

    <!-- Arms & Black Tiger -->
    ${armsAndTiger}

    <!-- Huge Chibi Head -->
    <ellipse cx="120" cy="100" rx="45" ry="42" fill="url(#skin-grad)" stroke="#1c1917" stroke-width="4.5" filter="url(#ink-shadow)"/>

    <!-- Cheeks -->
    <ellipse cx="88" cy="108" rx="8" ry="4.5" fill="url(#blush-grad)"/>
    <ellipse cx="152" cy="108" rx="8" ry="4.5" fill="url(#blush-grad)"/>

    <!-- Facial Features -->
    ${brow}
    ${eyes}
    <ellipse cx="120" cy="105" rx="2" ry="1.5" fill="#7e22ce"/>
    ${mouth}

    <!-- Black Daoist Cap with Jade Finial & Mustache -->
    <path d="M 74 95 C 72 65 95 56 120 56 C 145 56 168 65 166 95 C 155 76 138 72 120 72 C 102 72 85 76 74 95 Z" fill="#1c1917"/>
    <path d="M 108 56 L 132 56 L 128 32 L 112 32 Z" fill="#581c87" stroke="#1c1917" stroke-width="3"/>
    <circle cx="120" cy="32" r="5" fill="#a855f7" stroke="#facc15" stroke-width="2"/>

    <!-- Cute Sly Thin Mustache -->
    <path d="M 112 112 Q 102 116 98 120" stroke="#1c1917" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M 128 112 Q 138 116 142 120" stroke="#1c1917" stroke-width="2.5" stroke-linecap="round" fill="none"/>

    ${sweatOrMark}
  </g>
</svg>`;
}

/* =========================================================================
   6. LEI ZHENZI (雷震子) - Wind & Thunder Wings, Cyan/Green Face, Golden Eyes
   ========================================================================= */
function generateLeiZhenzi(mood) {
  let eyes = '';
  let mouth = '';
  let brow = '';
  let effects = '';
  let sweatOrMark = '';
  let arms = '';

  if (mood === 'idle') {
    eyes = `
      <circle cx="102" cy="98" r="7" fill="#ca8a04" stroke="#1c1917" stroke-width="2"/>
      <circle cx="102" cy="98" r="4" fill="#fef08a"/>
      <circle cx="100" cy="96" r="1.5" fill="#ffffff"/>
      <circle cx="138" cy="98" r="7" fill="#ca8a04" stroke="#1c1917" stroke-width="2"/>
      <circle cx="138" cy="98" r="4" fill="#fef08a"/>
      <circle cx="136" cy="96" r="1.5" fill="#ffffff"/>
    `;
    mouth = `<polygon points="120,108 127,116 113,116" fill="#f59e0b" stroke="#1c1917" stroke-width="2.5"/>`;
    brow = `
      <path d="M 94 88 L 110 92" stroke="#047857" stroke-width="4" stroke-linecap="round"/>
      <path d="M 146 88 L 130 92" stroke="#047857" stroke-width="4" stroke-linecap="round"/>
    `;
    arms = `
      <!-- Left arm holding Golden Chisel -->
      <path d="M 88 155 Q 65 160 62 145" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="62" cy="145" r="7" fill="#a7f3d0" stroke="#1c1917" stroke-width="2.5"/>
      <polygon points="62,145 55,120 68,125" fill="#ca8a04" stroke="#1c1917" stroke-width="2"/>

      <!-- Right arm holding Thunder Hammer -->
      <path d="M 152 155 Q 175 160 178 145" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="178" cy="145" r="7" fill="#a7f3d0" stroke="#1c1917" stroke-width="2.5"/>
      <rect x="172" y="125" width="12" height="15" fill="#64748b" stroke="#1c1917" stroke-width="2" rx="2"/>
      <line x1="178" y1="140" x2="178" y2="160" stroke="#ca8a04" stroke-width="4" stroke-linecap="round"/>
    `;
  } else if (mood === 'thinking') {
    eyes = `
      <circle cx="104" cy="94" r="6" fill="#ca8a04"/>
      <circle cx="104" cy="94" r="3.5" fill="#fef08a"/>
      <circle cx="138" cy="94" r="6" fill="#ca8a04"/>
      <circle cx="138" cy="94" r="3.5" fill="#fef08a"/>
    `;
    mouth = `<polygon points="120,110 125,117 115,117" fill="#f59e0b" stroke="#1c1917" stroke-width="2"/>`;
    brow = `
      <path d="M 94 86 L 110 90" stroke="#047857" stroke-width="4" stroke-linecap="round"/>
      <path d="M 146 90 L 130 86" stroke="#047857" stroke-width="4" stroke-linecap="round"/>
    `;
    arms = `
      <path d="M 88 155 Q 92 140 108 128" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="108" cy="128" r="7" fill="#a7f3d0" stroke="#1c1917" stroke-width="2.5"/>
      <path d="M 152 155 Q 165 170 162 178" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="162" cy="178" r="7" fill="#a7f3d0" stroke="#1c1917" stroke-width="2.5"/>
    `;
    sweatOrMark = `
      <g transform="translate(170, 30)">
        <circle cx="15" cy="20" r="4" fill="#a7f3d0"/>
        <circle cx="25" cy="10" r="7" fill="#ccfbf1"/>
        <circle cx="42" cy="-2" r="16" fill="#ffffff" stroke="#0d9488" stroke-width="2.5" filter="url(#ink-shadow)"/>
        <text x="42" y="3" font-family="'Noto Serif TC', serif" font-weight="900" font-size="16" fill="#0d9488" text-anchor="middle" dominant-baseline="middle">雷</text>
      </g>
    `;
  } else if (mood === 'victory') {
    eyes = `
      <path d="M 95 98 Q 102 88 109 98" stroke="#ca8a04" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M 131 98 Q 138 88 145 98" stroke="#ca8a04" stroke-width="5" stroke-linecap="round" fill="none"/>
    `;
    mouth = `<polygon points="120,106 128,118 112,118" fill="#f59e0b" stroke="#1c1917" stroke-width="2.5"/>`;
    brow = `
      <path d="M 92 84 L 110 88" stroke="#047857" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M 148 84 L 130 88" stroke="#047857" stroke-width="4.5" stroke-linecap="round"/>
    `;
    arms = `
      <path d="M 85 155 Q 55 130 50 100" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="100" r="7" fill="#a7f3d0" stroke="#1c1917" stroke-width="2.5"/>
      <path d="M 155 155 Q 185 130 190 100" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="190" cy="100" r="7" fill="#a7f3d0" stroke="#1c1917" stroke-width="2.5"/>
    `;
    effects = `
      <circle cx="120" cy="120" r="105" fill="url(#halo-gold)"/>
      <g stroke="#06b6d4" stroke-width="3" fill="none" filter="url(#glow-gold)">
        <path d="M 30 50 L 45 65 L 38 75 L 55 90"/>
        <path d="M 210 50 L 195 65 L 202 75 L 185 90"/>
        <path d="M 120 10 L 125 25 L 118 35 L 128 48"/>
      </g>
    `;
  } else if (mood === 'panic') {
    eyes = `
      <ellipse cx="102" cy="98" rx="8" ry="10" fill="#ffffff" stroke="#ca8a04" stroke-width="3.5"/>
      <circle cx="102" cy="99" r="4" fill="#047857"/>
      <ellipse cx="138" cy="98" rx="8" ry="10" fill="#ffffff" stroke="#ca8a04" stroke-width="3.5"/>
      <circle cx="138" cy="99" r="4" fill="#047857"/>
    `;
    mouth = `<polygon points="120,112 126,122 114,122" fill="#f59e0b" stroke="#1c1917" stroke-width="2.5"/>`;
    brow = `
      <path d="M 94 83 Q 102 90 110 86" stroke="#047857" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M 130 86 Q 138 90 146 83" stroke="#047857" stroke-width="4" stroke-linecap="round" fill="none"/>
    `;
    arms = `
      <path d="M 85 155 Q 60 140 68 120" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="68" cy="120" r="7" fill="#a7f3d0" stroke="#1c1917" stroke-width="2.5"/>
      <path d="M 155 155 Q 180 140 172 120" stroke="#1c1917" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="172" cy="120" r="7" fill="#a7f3d0" stroke="#1c1917" stroke-width="2.5"/>
    `;
    sweatOrMark = `
      <path d="M 75 80 C 75 75 82 70 82 65 C 82 70 89 75 89 80 A 7 7 0 1 1 75 80 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2" transform="rotate(-20 82 75)"/>
      <path d="M 160 80 C 160 75 167 70 167 65 C 167 70 174 75 174 80 A 7 7 0 1 1 160 80 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2" transform="rotate(20 167 75)"/>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="100%" height="100%">
  ${commonDefs}
  ${effects}
  <g id="lei-zhenzi-${mood}">
    <!-- Giant Feathered Wind & Thunder Wings in background -->
    <g id="thunder-wings">
      <path d="M 80 140 C 20 110 5 60 25 35 C 45 65 60 95 85 120 Z" fill="url(#cyan-grad)" stroke="#0e7490" stroke-width="3" filter="url(#ink-shadow)"/>
      <path d="M 35 45 C 50 80 65 110 85 135" stroke="#ffffff" stroke-width="2" fill="none"/>
      <path d="M 160 140 C 220 110 235 60 215 35 C 195 65 180 95 155 120 Z" fill="url(#cyan-grad)" stroke="#0e7490" stroke-width="3" filter="url(#ink-shadow)"/>
      <path d="M 205 45 C 190 80 175 110 155 135" stroke="#ffffff" stroke-width="2" fill="none"/>
    </g>

    <!-- Leopard Skin Tunic / Armor Body (1:1 Ratio) -->
    <path d="M 90 148 L 76 215 C 76 220 164 220 164 215 L 150 148 Z" fill="#0f766e" stroke="#1c1917" stroke-width="4.5" stroke-linejoin="round" filter="url(#ink-shadow)"/>
    <circle cx="120" cy="180" r="8" fill="url(#gold-grad)" stroke="#ca8a04" stroke-width="2"/>
    <path d="M 88 185 Q 120 195 152 185" stroke="#facc15" stroke-width="4" fill="none"/>

    <ellipse cx="96" cy="216" rx="9" ry="5" fill="#ca8a04" stroke="#1c1917" stroke-width="2"/>
    <ellipse cx="144" cy="216" rx="9" ry="5" fill="#ca8a04" stroke="#1c1917" stroke-width="2"/>

    <!-- Arms -->
    ${arms}

    <!-- Cyan / Green Tinted Chibi Head (青面金睛) -->
    <ellipse cx="120" cy="100" rx="45" ry="42" fill="#a7f3d0" stroke="#047857" stroke-width="4.5" filter="url(#ink-shadow)"/>

    <!-- Cheeks -->
    <ellipse cx="88" cy="108" rx="8" ry="4.5" fill="url(#blush-grad)"/>
    <ellipse cx="152" cy="108" rx="8" ry="4.5" fill="url(#blush-grad)"/>

    <!-- Facial Features -->
    ${brow}
    ${eyes}
    ${mouth}

    <!-- Spiky Red / Cyan Thunder Hair -->
    <path d="M 74 95 C 65 60 90 45 120 45 C 150 45 175 60 166 95 C 155 76 138 68 120 68 C 102 68 85 76 74 95 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
    <polygon points="120,25 128,50 112,50" fill="#ef4444" stroke="#1c1917" stroke-width="2.5"/>
    <polygon points="100,32 112,54 96,54" fill="#f97316" stroke="#1c1917" stroke-width="2"/>
    <polygon points="140,32 144,54 128,54" fill="#f97316" stroke="#1c1917" stroke-width="2"/>

    ${sweatOrMark}
  </g>
</svg>`;
}

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

// Write character SVGs
const characters = [
  { id: 'jiang-taigong', name: '姜太公', title: '封神統帥・太公望', desc: '手持打神鞭、杏黃旗，白髮長鬚的呆萌智者。', generator: generateJiangTaigong },
  { id: 'nezha', name: '哪吒', title: '三壇海會・蓮花童子', desc: '乾坤圈、混天綾、風火輪，傲嬌熱血的護道小將。', generator: generateNezha },
  { id: 'yang-jian', name: '楊戩', title: '清源妙道・二郎真君', desc: '天眼洞察、三尖兩刃刀，身伴超萌哮天犬的冷面小將。', generator: generateYangJian },
  { id: 'su-daji', name: '蘇妲己', title: '傾國九尾・天狐妖后', desc: '粉墨狐耳九尾、手提引魂燈，調皮狡黠的反派萌主。', generator: generateSuDaji },
  { id: 'shen-gongbao', name: '申公豹', title: '分水將軍・邪笑國師', desc: '座騎黑點虎、歪嘴邪笑「道友請留步」的滑稽魔頭。', generator: generateShenGongbao },
  { id: 'lei-zhenzi', name: '雷震子', title: '九天應元・風雷神將', desc: '風雷雙翼、青面金睛、金錐落雷的元氣雷電少年。', generator: generateLeiZhenzi },
];

const moods = ['idle', 'thinking', 'victory', 'panic'];

console.log('Generating Characters...');
for (const char of characters) {
  const cPath = path.join(charDir, char.id);
  fs.mkdirSync(cPath, { recursive: true });
  for (const mood of moods) {
    const svgCode = char.generator(mood);
    fs.writeFileSync(path.join(cPath, `${mood}.svg`), svgCode.trim(), 'utf8');
  }
}

console.log('Generating Items...');
for (const item of itemsData) {
  fs.writeFileSync(path.join(itemsDir, `${item.id}.svg`), item.svg.trim(), 'utf8');
}

// Generate Character Registry JS & JSON
const charRegistry = characters.map(c => ({
  id: c.id,
  name: c.name,
  title: c.title,
  desc: c.desc,
  ratio: '1:1',
  style: '水墨國風 Q版',
  expressions: {
    idle: `assets/characters/${c.id}/idle.png`,
    thinking: `assets/characters/${c.id}/thinking.png`,
    victory: `assets/characters/${c.id}/victory.png`,
    panic: `assets/characters/${c.id}/panic.png`,
  }
}));

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
  path.join(charDir, 'character-registry.js'),
  `// Auto-generated Character Registry for 尋章摘句
export const CHARACTERS = ${JSON.stringify(charRegistry, null, 2)};
export default CHARACTERS;
`,
  'utf8'
);

fs.writeFileSync(
  path.join(charDir, 'characters.json'),
  JSON.stringify(charRegistry, null, 2),
  'utf8'
);

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
