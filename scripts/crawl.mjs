#!/usr/bin/env node
// scripts/crawl.mjs
//
// Daily GitHub repo-discovery crawler for Git-Repo-Select-List.
//
// - Node 20+, ESM, zero npm dependencies (uses global fetch).
// - Queries the GitHub Search API (repositories) per category below.
// - Excludes repos already listed in README.md and repos already
//   surfaced in a previous run (tracked in data/seen.json).
// - Appends newly-found repos to candidates.md for manual triage,
//   and records them in data/seen.json so future runs don't repeat them.
//
// Usage:
//   GITHUB_TOKEN=<token> node scripts/crawl.mjs
//   node scripts/crawl.mjs        # unauthenticated, throttled to the
//                                  # 10 req/min unauth Search API limit
//
// No tokens or secrets are ever written to output files.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const README_PATH = path.join(REPO_ROOT, 'README.md');
const CANDIDATES_PATH = path.join(REPO_ROOT, 'candidates.md');
const SEEN_PATH = path.join(REPO_ROOT, 'data', 'seen.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// Dynamically compute a `pushed:>YYYY-MM-DD` cutoff N days before today.
function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------
// CATEGORIES — mirrors the README.md section structure (## N. Title).
// Each category has one or more GitHub Search API queries; results
// from all queries in a category are merged, deduped, and sorted by
// stars before taking the top N. Tune queries here as search quality
// dictates — keep them readable and self-contained.
// ---------------------------------------------------------------------
const CATEGORIES = [
  {
    title: 'Spreadsheet / Document engines',
    queries: [
      `spreadsheet engine in:name,description,topics stars:>500 pushed:>${daysAgo(90)}`,
    ],
  },
  {
    title: 'Embeddable editor SDK model (architecture references)',
    queries: [
      `topic:editor topic:sdk stars:>1000 pushed:>${daysAgo(90)}`,
      // Split rather than OR'd in one query: GitHub Search's `OR` has low
      // precedence and no parentheses support, so "A OR B C" silently
      // widens to "A OR (B C)" and drags in unrelated repos. Two precise
      // queries, merged by the caller, stay narrow.
      `whiteboard embeddable in:description stars:>1000 pushed:>${daysAgo(90)}`,
      `"rich text editor" embeddable in:description stars:>500 pushed:>${daysAgo(90)}`,
    ],
  },
  {
    title: 'Real-time collaboration / CRDT',
    queries: [
      `topic:crdt stars:>300 pushed:>${daysAgo(90)}`,
    ],
  },
  {
    title: 'File I/O (office formats)',
    queries: [
      // Same OR-precedence pitfall as above — kept as two queries so
      // "parser" alone never widens the match to unrelated repos.
      `xlsx parser in:name,description stars:>300 pushed:>${daysAgo(90)}`,
      `docx parser in:name,description stars:>300 pushed:>${daysAgo(90)}`,
    ],
  },
  {
    title: 'Charts / visualization',
    queries: [
      `topic:charts topic:visualization language:typescript stars:>1000 pushed:>${daysAgo(90)}`,
    ],
  },
  {
    title: 'Self-hosting / Docker / release-engineering patterns',
    queries: [
      `topic:self-hosted stars:>2000 pushed:>${daysAgo(30)}`,
    ],
  },
];

const TOP_N_PER_CATEGORY = 10;
const RESULTS_PER_QUERY = 30; // fetch extra so post-filter still yields ~10 new
const API_BASE = 'https://api.github.com/search/repositories';

// ---------------------------------------------------------------------
// Rate limiting helpers
// ---------------------------------------------------------------------

// Unauthenticated Search API: 10 req/min => >=6s between requests.
// Authenticated Search API: 30 req/min => >=2s between requests.
const MIN_DELAY_MS = GITHUB_TOKEN ? 2100 : 6100;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttledFetch(url) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Git-Repo-Select-List-crawler',
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers });

  const remaining = Number(res.headers.get('x-ratelimit-remaining') ?? '1');
  const resetEpoch = Number(res.headers.get('x-ratelimit-reset') ?? '0');

  if (res.status === 403 || res.status === 429) {
    // Rate limited (primary or secondary). Back off until reset, or a
    // reasonable default if we can't tell.
    const nowSec = Math.floor(Date.now() / 1000);
    const waitMs = resetEpoch > nowSec ? (resetEpoch - nowSec + 2) * 1000 : 60_000;
    console.warn(`  [rate-limit] ${res.status} received; waiting ${Math.round(waitMs / 1000)}s before retry`);
    await sleep(waitMs);
    return throttledFetch(url);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API error ${res.status} for ${url}: ${body.slice(0, 300)}`);
  }

  const json = await res.json();

  // Preemptively slow down if we're close to exhausting the quota.
  if (remaining <= 1) {
    const nowSec = Math.floor(Date.now() / 1000);
    const waitMs = resetEpoch > nowSec ? (resetEpoch - nowSec + 2) * 1000 : MIN_DELAY_MS;
    console.warn(`  [rate-limit] remaining=${remaining}; waiting ${Math.round(waitMs / 1000)}s`);
    await sleep(waitMs);
  } else {
    await sleep(MIN_DELAY_MS);
  }

  return json;
}

async function searchRepos(query) {
  const url = `${API_BASE}?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${RESULTS_PER_QUERY}`;
  const json = await throttledFetch(url);
  return Array.isArray(json.items) ? json.items : [];
}

// ---------------------------------------------------------------------
// README / seen-state parsing
// ---------------------------------------------------------------------

function extractOwnerRepoSlugs(text) {
  const slugs = new Set();
  const re = /github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const owner = m[1];
    let name = m[2];
    name = name.replace(/\.git$/i, '').replace(/[)\]'".,]+$/, '');
    slugs.add(`${owner}/${name}`.toLowerCase());
  }
  return slugs;
}

async function loadSeen() {
  if (!existsSync(SEEN_PATH)) return new Set();
  try {
    const raw = await readFile(SEEN_PATH, 'utf8');
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.map((s) => String(s).toLowerCase()));
  } catch (err) {
    console.warn(`  [warn] failed to parse ${SEEN_PATH}: ${err.message}. Starting fresh.`);
  }
  return new Set();
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------

async function main() {
  console.log(`GitHub token: ${GITHUB_TOKEN ? 'present (authenticated)' : 'absent (unauthenticated, throttled)'}`);

  const readmeText = await readFile(README_PATH, 'utf8');
  const readmeSlugs = extractOwnerRepoSlugs(readmeText);
  const seenSlugs = await loadSeen();

  const runDate = new Date().toISOString().slice(0, 10);
  const categoryResults = []; // { title, entries: [...] }
  const newlySeen = [];

  for (const category of CATEGORIES) {
    console.log(`\n== ${category.title} ==`);
    const merged = new Map(); // slug -> repo item

    for (const query of category.queries) {
      console.log(`  query: ${query}`);
      try {
        const items = await searchRepos(query);
        for (const item of items) {
          const slug = item.full_name.toLowerCase();
          if (!merged.has(slug)) merged.set(slug, item);
        }
      } catch (err) {
        console.error(`  [error] query failed, skipping: ${err.message}`);
      }
    }

    // Rank by stars first, within the current top N, THEN filter out
    // repos already in README/seen — not the other way around. Filtering
    // before slicing would mean an unchanged GitHub result set keeps
    // "discovering" rank 11, 21, 30... on every rerun (never idempotent).
    // Ranking first means a rerun against unchanged search results always
    // yields the same top N, all already in `seen`, so nothing new shows up
    // until the actual top N changes (a repo re-ranks in, or is new to GitHub).
    const candidates = [...merged.values()]
      .filter((item) => !readmeSlugs.has(item.full_name.toLowerCase()))
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, TOP_N_PER_CATEGORY)
      .filter((item) => !seenSlugs.has(item.full_name.toLowerCase()));

    console.log(`  -> ${candidates.length} new candidate(s)`);

    if (candidates.length > 0) {
      categoryResults.push({ title: category.title, entries: candidates });
      for (const item of candidates) {
        const slug = item.full_name.toLowerCase();
        seenSlugs.add(slug);
        newlySeen.push(slug);
      }
    }
  }

  const totalNew = categoryResults.reduce((sum, c) => sum + c.entries.length, 0);

  if (totalNew === 0) {
    console.log('\nNo new candidates found this run. candidates.md left untouched.');
    return;
  }

  await mkdir(path.dirname(SEEN_PATH), { recursive: true });

  // Persist seen.json (full set, sorted for stable diffs).
  const allSeen = [...seenSlugs].sort();
  await writeFile(SEEN_PATH, JSON.stringify(allSeen, null, 2) + '\n', 'utf8');

  // Build/refresh candidates.md.
  await updateCandidatesMd(categoryResults, runDate);

  console.log(`\nDone. ${totalNew} new candidate(s) written across ${categoryResults.length} categories.`);
}

function formatEntry(item, runDate) {
  const stars = item.stargazers_count.toLocaleString('en-US');
  const license = item.license?.spdx_id && item.license.spdx_id !== 'NOASSERTION'
    ? item.license.spdx_id
    : 'unknown';
  const desc = (item.description || '').replace(/\|/g, '\\|').trim() || '(no description)';
  const pushedAt = item.pushed_at ? item.pushed_at.slice(0, 10) : 'unknown';
  return `| [${item.full_name}](${item.html_url}) | ${stars} | ${license} | ${desc} | ${pushedAt} | ${runDate} |`;
}

async function updateCandidatesMd(categoryResults, runDate) {
  const header = `# Candidates

Auto-generated by \`scripts/crawl.mjs\` (daily GitHub Actions crawl). These are
**not yet vetted** — manually triage each entry and, if it merits inclusion,
promote it into \`README.md\` with a proper ranking and assessment note, then
remove it from here. New runs are appended under each category's heading,
newest first; entries already surfaced (tracked in \`data/seen.json\`) are
never repeated.
`;

  let body = '';
  if (existsSync(CANDIDATES_PATH)) {
    const existing = await readFile(CANDIDATES_PATH, 'utf8');
    // Strip the header block (everything up to the first "## " heading)
    // so we can re-render the header fresh but keep prior category content.
    const firstHeading = existing.indexOf('\n## ');
    body = firstHeading === -1 ? '' : existing.slice(firstHeading + 1);
  }

  // Parse existing body into a map of title -> content block (including
  // the "## " line), so we can prepend new entries under the right
  // category and append any categories not touched this run.
  const sections = new Map();
  const order = [];
  if (body) {
    const parts = body.split(/(?=^## )/m).filter(Boolean);
    for (const part of parts) {
      const titleMatch = part.match(/^## (.+)$/m);
      if (!titleMatch) continue;
      const title = titleMatch[1].trim();
      sections.set(title, part.trimEnd() + '\n');
      order.push(title);
    }
  }

  const tableHeader = '| Repo | Stars | License | Description | Last push | Run date |\n|------|-------|---------|-------------|-----------|----------|\n';

  for (const { title, entries } of categoryResults) {
    const newRows = entries.map((item) => formatEntry(item, runDate)).join('\n');

    if (sections.has(title)) {
      const existingBlock = sections.get(title);
      // Insert new rows right after the table header (newest run at top).
      const headerIdx = existingBlock.indexOf(tableHeader);
      if (headerIdx !== -1) {
        const insertAt = headerIdx + tableHeader.length;
        const updated = existingBlock.slice(0, insertAt) + newRows + '\n' + existingBlock.slice(insertAt);
        sections.set(title, updated);
      } else {
        // Malformed existing block (shouldn't happen) — rebuild cleanly.
        sections.set(title, `## ${title}\n\n${tableHeader}${newRows}\n`);
      }
    } else {
      sections.set(title, `## ${title}\n\n${tableHeader}${newRows}\n`);
      order.push(title);
    }
  }

  const rendered = order.map((title) => sections.get(title)).join('\n');
  const finalText = `${header}\n${rendered.trimEnd()}\n`;

  await writeFile(CANDIDATES_PATH, finalText, 'utf8');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exitCode = 1;
});
