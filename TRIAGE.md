# Triage criteria

Rules an automated or human triager must follow when processing
`candidates.md` entries into `README.md`.

## Promote a candidate only if all of these hold

- **Clear OSI-approved license** is recorded (or, for non-software meta-lists,
  the license GitHub reports is recorded as-is, flagged for verification).
- **Active**: pushed within roughly the last 6 months.
- **Fits an existing category** in `README.md`, or clearly justifies a new
  one (don't invent a category for a single marginal entry).
- **Adds something existing entries don't already cover** — a new stack, a
  new architectural model, or a repo that is clearly better than what's
  already ranked in that category. Redundant entries (same niche, weaker
  option) are rejected even if individually reasonable.
- The assessment **note states what it adds** and, if the license is
  AGPL/GPL (or another strong copyleft), says so explicitly and marks it
  **patterns-only** per the README's License policy section — never treat
  copyleft code as vendorable.

## Category size cap

- Cap each category at roughly **5-6 entries**. If a promotion would exceed
  the cap, either:
  - demote/remove the weakest existing entry the new one clearly supersedes
    and note that in `triage-log.md`, or
  - skip the promotion and record why in `triage-log.md`.

## Reject everything else

- Any candidate that doesn't meet every promotion condition above is
  rejected.
- Append one row to `triage-log.md` for every rejected repo: `Repo | Date |
  Verdict | Reason`. Keep the reason terse and neutral (what it is / why it
  doesn't fit) — no adoption or ownership language.
- Promoted repos are **not** logged in `triage-log.md` — their `README.md`
  entry is the record.

## Hard constraints

- **Never remove entries from `data/seen.json`.** It's the dedup ledger for
  the crawler; entries already surfaced must never be re-surfaced.
- **Never re-surface a rejected repo.** If it reappears in a future crawl
  run, check `triage-log.md` first and skip it silently (or re-log it only
  if new information — e.g., a license change — genuinely changes the
  verdict).
- **Keep `README.md` neutral.** No adoption claims, no "we use this," no
  ownership language — describe what a repo is and why it might matter,
  nothing about how any particular project actually uses it.
- **No secrets in outputs.** Never write tokens, credentials, API keys, or
  any private/internal information into `README.md`, `candidates.md`, or
  `triage-log.md`. This is a public repo.
- After editing, `candidates.md` should have its processed entries removed
  (promoted or rejected) — it always reflects only what's still pending
  triage.
