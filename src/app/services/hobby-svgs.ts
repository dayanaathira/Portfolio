const SVG_ATTRS = `xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100" style="display:block;margin:8px 0"`;

function fishingSvg(): string {
  return `<svg ${SVG_ATTRS}>
  <defs><style>
    @keyframes hf1{0%,100%{transform:translateX(0)}50%{transform:translateX(48px)}}
    @keyframes hf2{0%,100%{transform:translateX(0)}50%{transform:translateX(-35px)}}
  </style></defs>
  <line x1="5" y1="45" x2="94" y2="9" stroke="#4b5563" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="94" y1="9" x2="94" y2="54" stroke="#374151" stroke-width="0.8"/>
  <circle cx="94" r="4.5" fill="#60a5fa"><animate attributeName="cy" dur="1.8s" repeatCount="indefinite" values="56;60;56"/></circle>
  <rect x="0" y="62" width="160" height="38" fill="#060e1f"/>
  <path fill="none" stroke="#1d4ed8" stroke-width="1.3"><animate attributeName="d" dur="2.5s" repeatCount="indefinite" values="M0 64 Q40 60 80 64 Q120 68 160 64;M0 66 Q40 62 80 66 Q120 70 160 66;M0 64 Q40 60 80 64 Q120 68 160 64"/></path>
  <g style="animation:hf1 3.5s ease-in-out infinite">
    <ellipse cx="22" cy="78" rx="13" ry="5.5" fill="#22c55e"/>
    <polygon points="9,78 1,72 1,84" fill="#16a34a"/>
    <circle cx="32" cy="76" r="2" fill="#052e16"/>
    <circle cx="33" cy="75" r="0.8" fill="#fff" opacity="0.5"/>
  </g>
  <g style="animation:hf2 4s ease-in-out 0.5s infinite">
    <ellipse cx="128" cy="89" rx="9" ry="4" fill="#16a34a"/>
    <polygon points="137,89 145,85 145,93" fill="#166534"/>
    <circle cx="121" cy="88" r="1.5" fill="#052e16"/>
  </g>
  <path fill="none" stroke="#1e3a8a" stroke-width="0.9" opacity="0.55"><animate attributeName="d" dur="3s" repeatCount="indefinite" begin="0.8s" values="M0 75 Q40 71 80 75 Q120 79 160 75;M0 77 Q40 73 80 77 Q120 81 160 77;M0 75 Q40 71 80 75 Q120 79 160 75"/></path>
</svg>`;
}

function farmingSvg(): string {
  const esc = (v: number) => v.toString();
  const plants = [{ x: 18, h: 19 }, { x: 43, h: 24 }, { x: 80, h: 30 }, { x: 117, h: 24 }, { x: 142, h: 19 }]
    .map(({ x, h }, i) => {
      const top = 76 - h, d = (i * 0.4).toFixed(1), rw = h > 24 ? 6 : 5, rh = h > 24 ? 11 : 9;
      return `<g style="transform-box:fill-box;transform-origin:50% 100%;animation:hpl 3s ease-in-out ${d}s infinite">
    <line x1="${esc(x)}" y1="76" x2="${esc(x)}" y2="${esc(top)}" stroke="#22c55e" stroke-width="2"/>
    <ellipse cx="${esc(x - 8)}" cy="${esc(top + 10)}" rx="8" ry="3.5" fill="#16a34a" transform="rotate(-25,${esc(x - 8)},${esc(top + 10)})"/>
    <ellipse cx="${esc(x + 8)}" cy="${esc(top + 7)}" rx="8" ry="3.5" fill="#15803d" transform="rotate(25,${esc(x + 8)},${esc(top + 7)})"/>
    <ellipse cx="${esc(x)}" cy="${esc(top - 2)}" rx="${rw}" ry="${rh}" fill="#22c55e"/>
  </g>`;
    }).join('');

  return `<svg ${SVG_ATTRS}>
  <defs><style>@keyframes hpl{0%,100%{transform:rotate(0deg)}50%{transform:rotate(3deg)}}</style></defs>
  <circle cx="80" cy="22" r="20" fill="#713f12" opacity="0.25"><animate attributeName="r" dur="2.5s" repeatCount="indefinite" values="18;25;18"/><animate attributeName="opacity" dur="2.5s" repeatCount="indefinite" values="0.2;0.38;0.2"/></circle>
  <circle cx="80" cy="22" r="11" fill="#facc15"><animate attributeName="r" dur="2.5s" repeatCount="indefinite" values="11;13;11"/></circle>
  <g stroke="#facc15" stroke-width="1.8" stroke-linecap="round" style="animation:t-sun 2.5s ease-in-out infinite">
    <line x1="80" y1="4" x2="80" y2="8"/><line x1="96" y1="8" x2="93" y2="11"/>
    <line x1="102" y1="22" x2="98" y2="22"/><line x1="96" y1="36" x2="93" y2="33"/>
    <line x1="80" y1="40" x2="80" y2="36"/><line x1="64" y1="36" x2="67" y2="33"/>
    <line x1="58" y1="22" x2="62" y2="22"/><line x1="64" y1="8" x2="67" y2="11"/>
  </g>
  <rect x="0" y="76" width="160" height="24" fill="#1a0f00"/>
  <line x1="0" y1="76" x2="160" y2="76" stroke="#2d1a00" stroke-width="1.5"/>
  ${plants}
</svg>`;
}

function genericSvg(): string {
  return `<svg ${SVG_ATTRS}>
  <circle cx="80" cy="50" r="28" fill="none" stroke="#22c55e" stroke-width="1" opacity="0.3"><animate attributeName="r" dur="2.5s" repeatCount="indefinite" values="28;36;28"/><animate attributeName="opacity" dur="2.5s" repeatCount="indefinite" values="0.3;0.05;0.3"/></circle>
  <circle cx="80" cy="50" r="18" fill="none" stroke="#22c55e" stroke-width="1.5" opacity="0.55"><animate attributeName="r" dur="2.5s" repeatCount="indefinite" values="18;24;18"/><animate attributeName="opacity" dur="2.5s" repeatCount="indefinite" values="0.55;0.2;0.55"/></circle>
  <circle cx="80" cy="50" r="8" fill="#22c55e" opacity="0.85"/>
  <line x1="80" y1="26" x2="80" y2="74" stroke="#22c55e" stroke-width="1" opacity="0.3"/>
  <line x1="56" y1="50" x2="104" y2="50" stroke="#22c55e" stroke-width="1" opacity="0.3"/>
</svg>`;
}

const svgMap = new Map<number, () => string>([
  [1, fishingSvg],
  [2, farmingSvg],
]);

export function getHobbySvg(categoryId: number): string {
  return (svgMap.get(categoryId) ?? genericSvg)();
}
