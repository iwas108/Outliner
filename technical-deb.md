# Technical Debt Ledger & Executable Epoch Tracker

This file tracks unresolved technical debt, architectural concerns, and points to the next executable epoch for coding agents.

---

## Current Status

**Next Executable Epoch**: `Completed all Epochs (1 to 6) successfully.`

---

## Architectural Watchpoints & Potential Technical Debt

### 0. Tailwind CSS v4 & PostCSS Integration
- **Issue**: Standard CSS lint checkers might flag Tailwind v4 directives like `@custom-variant` and `@apply` as unknown rules.
- **Remediation**: These are harmless and compiled correctly by `@tailwindcss/postcss`. They can be safely ignored in linter configs.

### 0.5 Browser Print Dialog Margin Overrides
- **Issue**: Although the custom printable iframe defines page configurations using CSS `@page` (size and margins), browser print dialogues (like Chrome/Firefox) might override layout dimensions if the user manual overrides margin options to "None", "Minimum", or "Custom".
- **Remediation**: Render brief instructional tips inside the Export options panel to suggest selecting "Default" margins in the print dialog box for maximum formatting accuracy.


As implementation proceeds, the following design trade-offs and technical issues must be managed actively:

### 1. IndexedDB Client-Side Database Management
- **Issue**: Standard IndexedDB interfaces are asynchronous, verbose, and error-prone when handles are not closed properly or transactions conflict.
- **Remediation**: Use a tiny wrapper library like `idb` or construct a highly robust wrapper in `src/db/indexedDB.ts` that safely manages database upgrade events, version tracking, and schema migrations.

### 2. Vite base path configurations
- **Issue**: Deploying to `iwas108.github.io/Outliner` means the base URL is not `/` but `/Outliner/`. Assets compiled with default config will fail to load.
- **Remediation**: In `vite.config.ts`, ensure `base: '/Outliner/'` is set, and test base path links in local builds.

### 3. State Sync / Autosave Debouncing
- **Issue**: Autosaving on every keypress causes excessive IndexedDB writes, which can clog the main thread and impact keyboard responsiveness in long outlines.
- **Remediation**: Implement a custom debounce utility that schedules saves 500ms–1000ms after typing pauses, and maintains a temporary memory state during typing.

### 4. Large Outline Arrays & Performance
- **Issue**: In a large outline project with hundreds of nodes, re-rendering the entire list on every character change will create input lag (LCP/INP violations).
- **Remediation**: Optimize React renders using memoization (`React.memo`), windowing if outlines grow extremely large, or scoping edits to the active node component instead of global re-renders.

### 5. Print Layout / PDF Limitations
- **Issue**: Generating multi-page PDFs using standard canvas tools can look blurry, while native CSS print formatting is subject to individual browser rendering engines.
- **Remediation**: Use CSS `@media print` directives to cleanly style pages and design the export preview pane to use identical layouts for accuracy.
