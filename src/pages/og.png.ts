import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { getProjects, getLanguages } from '../services/portfolioData.js';
import careerData from '../data/career.json';

const FONT_STACK = "Consolas, 'DejaVu Sans Mono', 'Liberation Mono', 'Courier New', monospace";

let cachedPhotoBase64: string | null = null;

async function loadPhotoBase64(): Promise<string> {
  if (cachedPhotoBase64 !== null) return cachedPhotoBase64;

  const candidatePaths = [
    new URL('../../client/imgs/HD.png', import.meta.url),
    new URL('../../public/imgs/HD.png', import.meta.url),
    path.join(process.cwd(), 'dist', 'client', 'imgs', 'HD.png'),
    path.join(process.cwd(), 'public', 'imgs', 'HD.png'),
    path.join(process.cwd(), 'client', 'imgs', 'HD.png'),
  ];

  for (const candidate of candidatePaths) {
    try {
      const photoBuffer = await fs.readFile(candidate);
      cachedPhotoBase64 = `data:image/png;base64,${photoBuffer.toString('base64')}`;
      return cachedPhotoBase64;
    } catch {
      continue;
    }
  }

  return '';
}

function escapeXml(unsafe: unknown): string {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateGameOfLife(width = 1200, height = 630, cellSize = 10): string {
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const total = cols * rows;

  let current = new Uint8Array(total);
  let next = new Uint8Array(total);

  const initialDensity = 0.12 + Math.random() * 0.05;
  for (let i = 0; i < total; i++) {
    if (Math.random() < initialDensity) current[i] = 1;
  }

  const glider = [
    [0, 1], [1, 2], [2, 0], [2, 1], [2, 2]
  ];
  const numGliders = 8 + Math.floor(Math.random() * 6);
  for (let g = 0; g < numGliders; g++) {
    const gx = Math.floor(Math.random() * (cols - 4));
    const gy = Math.floor(Math.random() * (rows - 4));
    for (const [dx, dy] of glider) current[(gy + dy) * cols + (gx + dx)] = 1;
  }

  const steps = 6 + Math.floor(Math.random() * 6);
  for (let s = 0; s < steps; s++) {
    for (let r = 0; r < rows; r++) {
      const top = (r === 0 ? rows - 1 : r - 1) * cols;
      const mid = r * cols;
      const bot = (r === rows - 1 ? 0 : r + 1) * cols;

      for (let c = 0; c < cols; c++) {
        const left = c === 0 ? cols - 1 : c - 1;
        const right = c === cols - 1 ? 0 : c + 1;

        const count =
          (current[top + left] > 0 ? 1 : 0) +
          (current[top + c] > 0 ? 1 : 0) +
          (current[top + right] > 0 ? 1 : 0) +
          (current[mid + left] > 0 ? 1 : 0) +
          (current[mid + right] > 0 ? 1 : 0) +
          (current[bot + left] > 0 ? 1 : 0) +
          (current[bot + c] > 0 ? 1 : 0) +
          (current[bot + right] > 0 ? 1 : 0);

        const idx = mid + c;
        if (current[idx] > 0) {
          next[idx] = count === 2 || count === 3 ? 1 : 0;
        } else {
          next[idx] = count === 3 ? 1 : 0;
        }
      }
    }
    const temp = current;
    current = next;
    next = temp;
  }

  let pathD = '';
  for (let r = 0; r < rows; r++) {
    const rowOffset = r * cols;
    const y = r * cellSize;
    const topRow = (r === 0 ? rows - 1 : r - 1) * cols;
    const botRow = (r === rows - 1 ? 0 : r + 1) * cols;

    for (let c = 0; c < cols; c++) {
      if (current[rowOffset + c] > 0) {
        const x = c * cellSize;
        const left = c === 0 ? cols - 1 : c - 1;
        const right = c === cols - 1 ? 0 : c + 1;

        if (current[topRow + c] === 0) {
          pathD += `M${x},${y}h${cellSize} `;
        }
        if (current[botRow + c] === 0) {
          pathD += `M${x},${y + cellSize}h${cellSize} `;
        }
        if (current[rowOffset + left] === 0) {
          pathD += `M${x},${y}v${cellSize} `;
        }
        if (current[rowOffset + right] === 0) {
          pathD += `M${x + cellSize},${y}v${cellSize} `;
        }
      }
    }
  }

  return `<path d="${pathD}" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" />`;
}

export const GET: APIRoute = async () => {
  const photoBase64 = await loadPhotoBase64();
  const currentJob = careerData[0] || {
    period: 'AGO 2026 — PRESENTE',
    role: 'Desenvolvedor Júnior',
    organization: 'Avizo Health',
  };

  const projectsData = await getProjects();
  const languages = await getLanguages();

  const totalProjects = projectsData?.all?.length || 0;
  const topLangs = languages.slice(0, 5);

  let barX = 20;
  const barWidth = 525;
  const totalPct = topLangs.reduce((sum, l) => sum + l.percentage, 0) || 100;
  const barSegments = topLangs
    .map((lang) => {
      const width = Math.max(4, (lang.percentage / totalPct) * barWidth);
      const segX = barX;
      barX += width;
      return `<rect x="${segX.toFixed(1)}" y="44" width="${width.toFixed(1)}" height="8" fill="${escapeXml(lang.color)}" />`;
    })
    .join('');

  const langCards = topLangs
    .map((lang, idx) => {
      const y = 88 + idx * 76;
      const trackWidth = 502;
      const fillWidth = Math.max(4, (lang.percentage / 100) * trackWidth);
      return `
      <g transform="translate(20, ${y})">
        <rect x="0" y="0" width="525" height="64" fill="#111113" stroke="#27272a" stroke-width="1" />
        <circle cx="20" cy="24" r="6" fill="${escapeXml(lang.color)}" />
        <text x="36" y="30" fill="#ffffff" font-size="16" font-weight="bold" font-family="${FONT_STACK}">${escapeXml(lang.name)}</text>

        <text x="506" y="30" text-anchor="end" font-family="${FONT_STACK}">
          <tspan fill="#71717a" font-size="13">${lang.projects} ${lang.projects === 1 ? 'projeto' : 'projetos'}</tspan>
          <tspan fill="#3f3f46" font-size="13">  •  </tspan>
          <tspan fill="#38bdf8" font-size="15" font-weight="bold">${lang.percentage.toFixed(1)}%</tspan>
        </text>

        <rect x="12" y="46" width="${trackWidth}" height="4" fill="#27272a" rx="2" />
        <rect x="12" y="46" width="${fillWidth.toFixed(1)}" height="4" fill="${escapeXml(lang.color)}" rx="2" />
      </g>
    `;
    })
    .join('');

  const stackTags = [
    'Python',
    'TypeScript',
    'JavaScript',
    'React',
    'Node.js',
    'PHP',
    'Delphi',
    'Lazarus',
    'PostgreSQL',
    'MySQL',
    'Docker',
    'FastAPI',
    'Linux',
    'Git',
  ];

  let tagX = 22;
  let tagY = 40;
  const tagElements = stackTags
    .map((tag) => {
      const tagWidth = Math.round(tag.length * 8.0 + 22);
      if (tagX + tagWidth > 488) {
        tagX = 22;
        tagY += 46;
      }
      const currentX = tagX;
      tagX += tagWidth + 10;
      return `
      <g transform="translate(${currentX}, ${tagY})">
        <rect x="0" y="-18" width="${tagWidth}" height="32" fill="rgba(56, 189, 248, 0.08)" stroke="rgba(56, 189, 248, 0.25)" rx="0" />
        <text x="${(tagWidth / 2).toFixed(1)}" y="3" text-anchor="middle" fill="#38bdf8" font-size="13" font-family="${FONT_STACK}" font-weight="bold">${escapeXml(tag)}</text>
      </g>
    `;
    })
    .join('');

  const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#141416" />
  ${generateGameOfLife(1200, 630, 10)}

  <g transform="translate(50, 44)">
    <rect x="0" y="0" width="124" height="124" fill="#000000" stroke="#38bdf8" stroke-width="2" />
    ${
      photoBase64
        ? `<image href="${photoBase64}" x="4" y="4" width="116" height="116" preserveAspectRatio="xMidYMid slice" />`
        : ''
    }

    <text x="144" y="28" fill="#ffffff" font-size="25" font-weight="bold" font-family="${FONT_STACK}">
      Rafael Eduardo Azzi Lopes
    </text>
    <text x="144" y="56" fill="#71717a" font-size="16" font-family="${FONT_STACK}">
      @obertobr
    </text>
    <text x="144" y="88" fill="#38bdf8" font-size="14" font-weight="bold" font-family="${FONT_STACK}">
      Engenheiro de Software Full Stack &amp; Dados
    </text>
    <text x="144" y="112" fill="#71717a" font-size="12" font-family="${FONT_STACK}">
      FATEC — Análise e Desenv. de Sistemas (2022–2024)
    </text>
  </g>

  <g transform="translate(50, 186)">
    <rect x="0" y="0" width="510" height="130" fill="#101013" stroke="#27272a" stroke-width="1" />
    <line x1="0" y1="0" x2="510" y2="0" stroke="#27272a" stroke-width="2" />

    <text x="24" y="34" fill="#38bdf8" font-size="13" font-weight="bold" font-family="${FONT_STACK}">${escapeXml(currentJob.period)}</text>
    <text x="24" y="70" fill="#ffffff" font-size="28" font-weight="bold" font-family="${FONT_STACK}">${escapeXml(currentJob.role)}</text>
    <text x="24" y="102" fill="#e2e8f0" font-size="19" font-family="${FONT_STACK}">${escapeXml(currentJob.organization)}</text>
  </g>

  <g transform="translate(50, 332)">
    <rect x="0" y="0" width="510" height="216" fill="#101013" stroke="#27272a" stroke-width="1" />
    <line x1="0" y1="0" x2="510" y2="0" stroke="#27272a" stroke-width="2" />
    ${tagElements}
  </g>

  <g transform="translate(585, 44)">
    <rect x="0" y="0" width="565" height="504" fill="#101013" stroke="#27272a" stroke-width="1" />
    <line x1="0" y1="0" x2="565" y2="0" stroke="#27272a" stroke-width="2" />

    <text x="20" y="30" fill="#ffffff" font-size="14" font-weight="bold" font-family="${FONT_STACK}">
      REPOSITÓRIOS NO GITHUB <tspan fill="#38bdf8">(${totalProjects})</tspan>
    </text>

    <rect x="20" y="44" width="525" height="8" fill="#1e1e24" rx="4" />
    ${barSegments}

    ${langCards}
  </g>

  <line x1="50" y1="570" x2="1150" y2="570" stroke="#27272a" stroke-width="1" />
  <text x="50" y="595" fill="#71717a" font-size="12" font-family="${FONT_STACK}">
    github.com/obertobr • linkedin.com/in/realopes • real.azzi@gmail.com
  </text>
</svg>
`;

  const resvg = new Resvg(svg, {
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'Consolas',
    },
  });

  const pngData = resvg.render().asPng();

  return new Response(pngData, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
};
