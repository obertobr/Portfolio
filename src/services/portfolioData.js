import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'src', 'data');
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const GITHUB_USERNAME = 'obertobr';

const HEADERS = {
  'User-Agent': 'obertobr-portfolio-sync',
  'Accept': 'application/vnd.github.v3+json',
};

if (process.env.GITHUB_TOKEN) {
  HEADERS['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
}

const LANGUAGE_COLORS = {
  JavaScript: '#facc15',
  TypeScript: '#38bdf8',
  Rust: '#f97316',
  Python: '#10b981',
  PHP: '#a855f7',
  HTML: '#e34c26',
  CSS: '#38bdf8',
  'C#': '#178600',
  Java: '#b07219',
  Shell: '#4ade80',
  Batchfile: '#94a3b8',
  'Visual Basic .NET': '#9333ea',
  Makefile: '#64748b',
  Jinja: '#b91c1c',
  Pascal: '#B0CE4E',
  Delphi: '#B0CE4E'
};

let cachedProjects = null;
let cachedLanguages = null;
let inFlightSync = null;

async function fetchJSON(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    if (res.status === 403) {
      const resetTime = res.headers.get('x-ratelimit-reset');
      const resetDate = resetTime ? new Date(Number(resetTime) * 1000).toLocaleTimeString() : 'em breve';
      throw new Error(`Rate limit do GitHub excedido (403). Liberação às ${resetDate}.`);
    }
    throw new Error(`Erro na API (${res.status} ${res.statusText}): ${url}`);
  }
  return res.json();
}

async function getPinnedRepoNames() {
  try {
    const res = await fetch(`https://github.com/${GITHUB_USERNAME}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!res.ok) return [];
    const html = await res.text();
    const regex = /class="repo"[^>]*>([^<]+)<\/span>/g;
    const pinned = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      pinned.push(match[1].trim());
    }
    return pinned;
  } catch {
    return [];
  }
}

function cleanTags(repo) {
  const rawTopics = Array.isArray(repo.topics) ? repo.topics : [];
  const banned = new Set(['open-source', 'opensource', 'open source']);
  const filteredTopics = rawTopics.filter(t => !banned.has(t.toLowerCase()));

  const tags = [];
  if (repo.language) {
    tags.push(repo.language);
  }
  for (const topic of filteredTopics) {
    if (!tags.some(t => t.toLowerCase() === topic.toLowerCase())) {
      tags.push(topic);
    }
  }
  return tags.length > 0 ? tags.join(' • ') : (repo.language || 'Software');
}

async function ensureDataFilesExist() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const projPath = path.join(DATA_DIR, 'projects.json');
  const langPath = path.join(DATA_DIR, 'languages.json');

  try {
    await fs.access(projPath);
  } catch {
    await fs.writeFile(projPath, JSON.stringify({ featured: [], all: [] }, null, 2) + '\n');
  }

  try {
    await fs.access(langPath);
  } catch {
    await fs.writeFile(langPath, JSON.stringify([], null, 2) + '\n');
  }
}

async function readFromDisk() {
  await ensureDataFilesExist();
  try {
    const pRaw = await fs.readFile(path.join(DATA_DIR, 'projects.json'), 'utf-8');
    cachedProjects = JSON.parse(pRaw);
  } catch {
    cachedProjects = { featured: [], all: [] };
  }

  try {
    const lRaw = await fs.readFile(path.join(DATA_DIR, 'languages.json'), 'utf-8');
    cachedLanguages = JSON.parse(lRaw);
  } catch {
    cachedLanguages = [];
  }
}

export async function syncGitHubData() {
  if (inFlightSync) {
    return inFlightSync;
  }

  inFlightSync = (async () => {
    await ensureDataFilesExist();

    let repos = [];
    try {
      repos = await fetchJSON(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`);
    } catch (err) {
      console.warn(`[sync] Aviso: ${err.message}`);
      return;
    }

    repos.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const pinnedNames = await getPinnedRepoNames();
    const langWeights = {};
    const langProjectCount = {};

    for (const repo of repos) {
      if (repo.fork) continue;

      if (repo.language) {
        langProjectCount[repo.language] = (langProjectCount[repo.language] || 0) + 1;
      }

      if (Boolean(process.env.GITHUB_TOKEN)) {
        try {
          const langs = await fetchJSON(repo.languages_url);
          for (const [lang, bytes] of Object.entries(langs)) {
            langWeights[lang] = (langWeights[lang] || 0) + bytes;
          }
        } catch {
          if (repo.language) {
            langWeights[repo.language] = (langWeights[repo.language] || 0) + 1000;
          }
        }
      } else {
        if (repo.language) {
          langWeights[repo.language] = (langWeights[repo.language] || 0) + 1;
        }
      }
    }

    const relevantLangs = Object.entries(langWeights)
      .filter(([name]) => !['HTML', 'CSS', 'Makefile', 'Batchfile', 'Jinja'].includes(name));

    const totalFilteredWeight = relevantLangs.reduce((acc, [, val]) => acc + val, 0) || 1;

    const rawList = relevantLangs
      .map(([name, weight]) => ({
        name,
        weight,
        percentage: (weight / totalFilteredWeight) * 100,
        color: LANGUAGE_COLORS[name] || '#38bdf8',
        projects: langProjectCount[name] || 1
      }))
      .sort((a, b) => b.weight - a.weight);

    const languagesList = rawList
      .map((item) => ({
        name: item.name,
        percentage: Number(item.percentage.toFixed(1)),
        color: item.color,
        projects: item.projects
      }))
      .filter((l) => l.percentage > 0 || l.projects > 0);

    const allProjects = repos.map((repo) => ({
      name: repo.name,
      language: repo.language || 'Geral',
      description: repo.description ? repo.description.trim() : 'Sem descrição.',
      url: repo.html_url,
      stars: repo.stargazers_count,
      fork: repo.fork,
      updated_at: repo.updated_at
    }));

    let featuredProjects = [];
    if (pinnedNames.length > 0) {
      featuredProjects = pinnedNames
        .map((pName) => repos.find((r) => r.name.toLowerCase() === pName.toLowerCase()))
        .filter(Boolean)
        .map((repo) => ({
          name: repo.name,
          slug: repo.name.toLowerCase(),
          stack: cleanTags(repo),
          description: repo.description ? repo.description.trim() : 'Sem descrição.',
          url: repo.html_url,
          highlight: true
        }));
    }

    if (featuredProjects.length === 0) {
      featuredProjects = repos.slice(0, 4).map((repo) => ({
        name: repo.name,
        slug: repo.name.toLowerCase(),
        stack: cleanTags(repo),
        description: repo.description ? repo.description.trim() : 'Sem descrição.',
        url: repo.html_url,
        highlight: true
      }));
    }

    const projectsPayload = { featured: featuredProjects, all: allProjects };

    await fs.writeFile(
      path.join(DATA_DIR, 'languages.json'),
      JSON.stringify(languagesList, null, 2) + '\n',
      'utf-8'
    );

    await fs.writeFile(
      path.join(DATA_DIR, 'projects.json'),
      JSON.stringify(projectsPayload, null, 2) + '\n',
      'utf-8'
    );

    cachedLanguages = languagesList;
    cachedProjects = projectsPayload;
  })().finally(() => {
    inFlightSync = null;
  });

  return inFlightSync;
}

export async function getProjects() {
  if (!cachedProjects) {
    await readFromDisk();
  }
  return cachedProjects || { featured: [], all: [] };
}

export async function getLanguages() {
  if (!cachedLanguages) {
    await readFromDisk();
  }
  return cachedLanguages || [];
}

async function init() {
  await readFromDisk();
  if (!cachedProjects?.all?.length) {
    await syncGitHubData().catch(() => {});
  }
}

init();

if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    syncGitHubData().catch(() => {});
  }, ONE_DAY_MS);
  if (timer.unref) {
    timer.unref();
  }
}
