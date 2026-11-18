import fs from 'node:fs';
import path from 'node:path';

/**
 * Генерирует постеры для демо-каталога.
 * Никаких внешних картинок: SVG рисуется локально, поэтому демо выглядит
 * одинаково хорошо и без доступа к сети.
 */

const posters = [
  { kanji: '進撃', label: 'АТАКА', sub: 'ТИТАНОВ', year: '2013', from: '#1e1b4b', via: '#4338ca', to: '#0b1020' },
  { kanji: '鬼滅', label: 'КЛИНОК', sub: 'ДЕМОНОВ', year: '2019', from: '#052e2b', via: '#0f766e', to: '#04121a' },
  { kanji: '一拳', label: 'ВАНПАНЧМЕН', sub: 'ONE PUNCH MAN', year: '2015', from: '#3b0764', via: '#9333ea', to: '#150826' },
  { kanji: '呪術', label: 'МАГИЧЕСКАЯ', sub: 'БИТВА', year: '2020', from: '#1c1917', via: '#b91c1c', to: '#0c0a09' },
  { kanji: '電鋸', label: 'ЧЕЛОВЕК', sub: 'БЕНЗОПИЛА', year: '2022', from: '#431407', via: '#ea580c', to: '#140a05' },
  { kanji: '死亡', label: 'ТЕТРАДЬ', sub: 'СМЕРТИ', year: '2006', from: '#171717', via: '#4b5563', to: '#050505' },
  { kanji: '鋼の', label: 'СТАЛЬНОЙ', sub: 'АЛХИМИК', year: '2009', from: '#422006', via: '#ca8a04', to: '#141005' },
  { kanji: '福音', label: 'ЕВАНГЕЛИОН', sub: 'EVANGELION', year: '1995', from: '#2e1065', via: '#7e22ce', to: '#0d0616' },
  { kanji: '星際', label: 'КОВБОЙ', sub: 'БИБОП', year: '1998', from: '#082f49', via: '#0284c7', to: '#050f18' },
  { kanji: '英雄', label: 'МОЯ ГЕРОЙСКАЯ', sub: 'АКАДЕМИЯ', year: '2016', from: '#0c4a6e', via: '#059669', to: '#04141c' },
  { kanji: '聖杯', label: 'СУДЬБА', sub: 'HEAVEN’S FEEL', year: '2017', from: '#450a0a', via: '#be123c', to: '#140508' },
  { kanji: '家族', label: 'СЕМЬЯ', sub: 'ШПИОНА', year: '2022', from: '#3b0764', via: '#db2777', to: '#160a14' },
  { kanji: '喰種', label: 'ТОКИЙСКИЙ', sub: 'ГУЛЬ', year: '2014', from: '#18181b', via: '#7f1d1d', to: '#0a0a0b' },
  { kanji: '時空', label: 'ВРАТА', sub: 'ШТАЙНА', year: '2011', from: '#0c1a2e', via: '#1d4ed8', to: '#050a13' },
];

const escapeXml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildPoster({ kanji, label, sub, year, from, via, to }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900" role="img" aria-label="${escapeXml(label)} ${escapeXml(sub)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="0.58" stop-color="${via}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <radialGradient id="orb" cx="0.72" cy="0.22" r="0.62">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.34"/>
      <stop offset="0.55" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.45" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.82"/>
    </linearGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="600" height="900" fill="url(#bg)"/>
  <rect width="600" height="900" fill="url(#orb)"/>
  <polygon points="0,900 600,190 600,360 90,900" fill="url(#beam)" opacity="0.5"/>

  <g font-family="'Yu Gothic', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif" font-weight="700" fill="#ffffff" opacity="0.14" text-anchor="middle">
    <text x="452" y="300" font-size="230">${escapeXml(kanji.slice(0, 2))}</text>
    <text x="452" y="520" font-size="150">${escapeXml(kanji.slice(2) || kanji.slice(0, 1))}</text>
  </g>

  <rect width="600" height="900" fill="url(#fade)"/>

  <g font-family="'Segoe UI', 'Inter', Arial, sans-serif" fill="#ffffff">
    <text x="48" y="72" font-size="17" letter-spacing="6" opacity="0.65">${escapeXml(year)}</text>
    <text x="48" y="676" font-size="54" font-weight="800" letter-spacing="-1">${escapeXml(label)}</text>
    <text x="48" y="738" font-size="40" font-weight="700" opacity="0.86">${escapeXml(sub)}</text>
    <text x="48" y="800" font-size="15" letter-spacing="4" opacity="0.5">ANIFLOW · DEMO</text>
  </g>

  <rect x="24" y="24" width="552" height="852" fill="none" stroke="#ffffff" stroke-opacity="0.12" rx="18"/>
</svg>
`;
}

const outputDir = path.join(process.cwd(), 'public', 'demo');
fs.mkdirSync(outputDir, { recursive: true });

posters.forEach((poster, index) => {
  fs.writeFileSync(path.join(outputDir, `poster-${index + 1}.svg`), buildPoster(poster), 'utf8');
});

console.log(`Сгенерировано ${posters.length} постеров в public/demo`);
