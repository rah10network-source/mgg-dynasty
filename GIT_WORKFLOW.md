# MGG Dynasty — Git Workflow Reference

## Repository Structure

```
mgg-dynasty/
├── index.html       Main app (always the current version)
├── README.md        Project overview and setup guide
├── CHANGELOG.md     Version history (Keep a Changelog format)
├── .gitignore       Excludes .DS_Store, *.xlsx, *.docx, node_modules
└── GIT_WORKFLOW.md  This file
```

---

## How Versioning Works

Git versions are **tagged commits**, not separate files.  
`index.html` is always the latest — older versions live in Git history.

To see any past version:
```bash
git show v0.7.0:index.html          # view file at that tag
git checkout v0.7.0 -- index.html   # restore that version locally
git checkout main -- index.html     # return to latest
```

---

## Releasing a New Version

After a Claude session where new features were built:

### 1. Update CHANGELOG.md
Move items from `[Unreleased]` into a new dated version block:
```markdown
## [0.8.0] — 2026-MM-DD

### Added
- Sell-High / Buy-Low alert system
...
```

### 2. Commit the updated files
```bash
git add index.html CHANGELOG.md
git commit -m "v0.8.0 — Sell-High/Buy-Low alerts

Brief description of what changed and why."
```

### 3. Tag the release
```bash
git tag -a v0.8.0 -m "v0.8.0 — Sell-High/Buy-Low alerts"
```

### 4. Push with tags
```bash
git push origin main --tags
```

GitHub Pages auto-deploys within ~60 seconds. No further action needed.

---

## Commit Message Convention

```
v0.8.0 — Short title (one line, under 72 chars)

- What was added/changed/fixed (bullet points)
- Reference data sources or APIs if new ones added
- Note any breaking changes or localStorage clears needed
```

---

## Version Number Guide

| Bump | When | Example |
|---|---|---|
| `PATCH` x.x.**1** | Bug fix, contrast update, non-breaking change | v0.7.0 → v0.7.1 |
| `MINOR` x.**8**.0 | New tab, new feature, new data source | v0.7.1 → v0.8.0 |
| `MAJOR` **1**.0.0 | Breaking change — localStorage clear or data migration required | v0.9.x → v1.0.0 |

---

## Useful Commands

```bash
# See all tagged versions
git tag -l

# See what changed between two versions
git diff v0.7.0 v0.7.1 -- index.html

# See commit history
git log --oneline

# Check what's staged / unstaged
git status

# Undo local changes to index.html (before committing)
git checkout -- index.html
```

---

## CHANGELOG.md Comparison Links

At the bottom of `CHANGELOG.md`, update the links after each release:

```markdown
[Unreleased]: https://github.com/rah10network-source/mgg-dynasty/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/rah10network-source/mgg-dynasty/compare/v0.7.1...v0.8.0
[0.7.1]: https://github.com/rah10network-source/mgg-dynasty/compare/v0.7.0...v0.7.1
```

These become clickable diffs on GitHub showing exactly what changed in each release.
