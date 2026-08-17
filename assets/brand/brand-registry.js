/**
 * 尋章摘句 — 品牌專屬 ICON 與吉祥物系統 (Brand Registry & Mascot System)
 * @version 1.0.0
 * @author 品牌專屬 ICON 與吉祥物設計師
 */

export const BRAND_SYSTEM = {
  name: "尋章摘句",
  subTitle: "封神密室逃脫",
  englishName: "Fengshen Escape Room",
  slogan: "太極初開萬仙會，尋章摘句破重圍",

  // 核心吉祥物設定 (Mascot Specification)
  mascot: {
    id: "ink-spirit-taigong",
    name: "墨靈·太公仙童",
    alias: "玄墨小神君 / 墨墨童子",
    title: "文道破陣守護小仙尊",
    personality: "靈動軟萌、學富五車、揮毫成金、遇難必破",
    appearance: {
      head: "道門混元太極玉簪髮髻，配赤紅長流蘇",
      eyes: "水墨星辰大靈眸，含天青靈光與純白星芒",
      face: "粉嫩水墨暈染腮紅、額生破妄硃砂神印、白皙軟萌小圓臉",
      costume: "純白玄青鑲滾雲紋仙袍，腰繫太極乾坤金佩",
      cloak: "背披如流動潑墨之『飛墨披風』，周身縈繞金墨八卦星屑",
      artifacts: [
        {
          name: "玄天如意毫筆",
          desc: "右手所執，紫毫如鋒，凌空虛劃即可引動太極金光與水墨字韻"
        },
        {
          name: "打神金鞭",
          desc: "左手所斜握，上古封神重器化為七節金光護法雷鞭，降伏字瘴"
        }
      ],
      mount: "足踏半透明文思祥雲，步步生墨蓮"
    }
  },

  // 品牌標準色票 (Brand Color Palette)
  colors: {
    inkDeep: "#0f172a",       // 玄墨深沉
    inkPrimary: "#181411",    // 焦墨主色
    inkSoft: "#53493e",       // 煙墨灰褐
    paper: "#f4ebd9",         // 澄心堂古法宣紙
    paperLight: "#fdfbf7",    // 純淨宣白
    vermilion: "#dc2626",     // 硃砂赤紅（破陣印記）
    goldPrimary: "#eab308",   // 封神太極金
    goldBright: "#fde047",   // 凌霄曜金
    goldDark: "#854d0e",     // 古銅沉金
    cyanSpiritual: "#38bdf8", // 靈氣天青
    indigoNight: "#203847"    // 玄夜幽瀾
  },

  // 資源路徑 (Asset File Paths)
  assets: {
    favicon: "favicon.svg",
    appIcon: "assets/brand/app-icon.svg",
    logoHorizontal: "assets/brand/logo.svg",
    brandBadge: "assets/brand/brand-badge.svg",
    mascotFull: "assets/brand/mascot-full.svg",
    mascotHead: "assets/brand/mascot-head.svg",
    loaderMascot: "assets/brand/loader-mascot.svg",
    watermarkSeal: "assets/brand/watermark-seal.svg",
    appleTouchIcon: "assets/brand/apple-touch-icon.svg",
    pwa192: "assets/brand/pwa-icon-192.svg",
    pwa512: "assets/brand/pwa-icon-512.svg",
    manifest: "assets/brand/manifest.json"
  }
};

/**
 * 取得指定尺寸或變體的吉祥物 HTML / SVG 標籤
 * @param {('full'|'head'|'badge'|'logo'|'loader'|'seal')} variant 
 * @param {Object} options
 * @param {string} [options.className]
 * @param {number|string} [options.width]
 * @param {number|string} [options.height]
 * @param {string} [options.alt]
 * @returns {string} HTML <img> 標記字串
 */
export function getBrandAssetHtml(variant = "head", options = {}) {
  const map = {
    full: BRAND_SYSTEM.assets.mascotFull,
    head: BRAND_SYSTEM.assets.mascotHead,
    badge: BRAND_SYSTEM.assets.brandBadge,
    logo: BRAND_SYSTEM.assets.logoHorizontal,
    loader: BRAND_SYSTEM.assets.loaderMascot,
    seal: BRAND_SYSTEM.assets.watermarkSeal
  };

  const src = map[variant] || BRAND_SYSTEM.assets.mascotHead;
  const className = options.className ? `class="${options.className}"` : "";
  const width = options.width ? `width="${options.width}"` : "";
  const height = options.height ? `height="${options.height}"` : "";
  const alt = options.alt || `${BRAND_SYSTEM.name} — ${BRAND_SYSTEM.mascot.name}`;

  return `<img src="${src}" ${alt ? `alt="${alt}"` : ""} ${className} ${width} ${height} loading="lazy" />`;
}

/**
 * 在指定容器中展示「墨靈仙童開卷」全螢幕或局部的沉浸式載入畫面
 * @param {HTMLElement|string} targetContainer 
 * @param {string} [customText] 
 * @returns {() => void} 關閉此載入器的回調函式
 */
export function showBrandLoader(targetContainer = document.body, customText = "文道開卷・破陣載入中...") {
  const container = typeof targetContainer === "string" 
    ? document.querySelector(targetContainer) 
    : targetContainer;

  if (!container) return () => {};

  const loaderOverlay = document.createElement("div");
  loaderOverlay.className = "brand-mascot-loader-overlay";
  loaderOverlay.setAttribute("role", "status");
  loaderOverlay.setAttribute("aria-live", "polite");

  loaderOverlay.innerHTML = `
    <div class="brand-mascot-loader-box">
      <img src="${BRAND_SYSTEM.assets.loaderMascot}" alt="載入中..." class="brand-mascot-loader-img" />
      ${customText ? `<p class="brand-mascot-loader-text">${customText}</p>` : ""}
    </div>
  `;

  // 注入內聯樣式保護
  if (!document.getElementById("brand-loader-style")) {
    const style = document.createElement("style");
    style.id = "brand-loader-style";
    style.textContent = `
      .brand-mascot-loader-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at 50% 50%, rgba(244, 235, 217, 0.96) 0%, rgba(229, 215, 190, 0.98) 100%);
        backdrop-filter: blur(10px);
        transition: opacity 0.4s ease, visibility 0.4s ease;
      }
      .brand-mascot-loader-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        max-width: 360px;
        text-align: center;
        padding: 2rem;
      }
      .brand-mascot-loader-img {
        width: 240px;
        height: 240px;
        filter: drop-shadow(0 12px 24px rgba(24, 20, 17, 0.15));
      }
      .brand-mascot-loader-text {
        margin-top: 0.5rem;
        font-family: var(--font-serif, serif);
        font-weight: 700;
        font-size: 1.1rem;
        letter-spacing: 0.15em;
        color: var(--ink-deep, #181411);
        text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.8);
      }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(loaderOverlay);

  return function hide() {
    loaderOverlay.style.opacity = "0";
    loaderOverlay.style.pointerEvents = "none";
    setTimeout(() => {
      if (loaderOverlay.parentNode) {
        loaderOverlay.parentNode.removeChild(loaderOverlay);
      }
    }, 400);
  };
}

/**
 * 注入與更新網頁 Favicon 與 PWA Meta Tags
 */
export function injectBrandFavicons() {
  if (typeof document === "undefined") return;

  // 1. Favicon
  let fav = document.querySelector("link[rel~='icon']");
  if (!fav) {
    fav = document.createElement("link");
    fav.rel = "icon";
    document.head.appendChild(fav);
  }
  fav.type = "image/svg+xml";
  fav.href = BRAND_SYSTEM.assets.favicon;

  // 2. Apple Touch Icon
  let appleIcon = document.querySelector("link[rel='apple-touch-icon']");
  if (!appleIcon) {
    appleIcon = document.createElement("link");
    appleIcon.rel = "apple-touch-icon";
    document.head.appendChild(appleIcon);
  }
  appleIcon.href = BRAND_SYSTEM.assets.appleTouchIcon;

  // 3. Manifest
  let manifest = document.querySelector("link[rel='manifest']");
  if (!manifest) {
    manifest = document.createElement("link");
    manifest.rel = "manifest";
    document.head.appendChild(manifest);
  }
  manifest.href = BRAND_SYSTEM.assets.manifest;
}

// 自動在客戶端環境運行基礎注入
if (typeof window !== "undefined") {
  window.BRAND_SYSTEM = BRAND_SYSTEM;
  window.getBrandAssetHtml = getBrandAssetHtml;
  window.showBrandLoader = showBrandLoader;
}
