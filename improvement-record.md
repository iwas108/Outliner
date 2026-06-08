# Outliner Application Improvement Record

This log records features, fixes, and architectural adjustments completed on the Outliner application.

---

## Completed Improvements

### 1. Epoch 1: Scaffolding, Theme Configuration & Local Database Wrapper
- **Scaffolding**: Created Vite + React + TypeScript + Tailwind CSS template configured to deploy static builds at `/Outliner/` base paths for GitHub Pages.
- **Database Engine ([indexedDB.ts](file:///home/madman/github/Outliner/src/db/indexedDB.ts))**: Built clean Promise-based async IndexedDB wrappers handling database setup, config storage (`config` store), and project document records (`projects` store).
- **Theme Provider ([ThemeContext.tsx](file:///home/madman/github/Outliner/src/context/ThemeContext.tsx))**: Created React context manager persisting system, light, and dark theme choices inside IndexedDB config.

### 2. Epoch 2: Project Dashboard & Backups Management
- **Dashboard Hub ([Dashboard.tsx](file:///home/madman/github/Outliner/src/components/Dashboard/Dashboard.tsx))**: Designed a dashboard listing projects, metadata (creation/modification dates), and project details in a premium tabular view.
- **Backups & Imports**: Implemented `.otln-project` JSON backup files to import and export entire project workspaces, and `.json` schema formats to load outline structures.

### 3. Epoch 3: Outline IDE Core & Indent Constraint Engine
- **Line Editor Widget ([OutlineLineItem.tsx](file:///home/madman/github/Outliner/src/components/IDE/OutlineLineItem.tsx))**: Created floating action buttons for lines to trigger indents, deletions, and structural conversions.
- **Constraint Engine ([outlineRules.ts](file:///home/madman/github/Outliner/src/utils/outlineRules.ts))**: Enforces hierarchical rules: Section -> Topic -> Question -> Answer. Prevents invalid indent/outdent states.
- **Editor Canvas ([OutlineEditor.tsx](file:///home/madman/github/Outliner/src/components/IDE/OutlineEditor.tsx))**: Intercepts keyboard events (`Tab` / `Shift+Tab` for indentation shifts, `ArrowUp` / `ArrowDown` for caret focus navigating, `Enter` for splitting new nodes) with debounced autosaving to IndexedDB.

### 4. Epoch 4: Analysis Sidebar & Keyword Highlights Overlay
- **Validator Engine ([analyzer.ts](file:///home/madman/github/Outliner/src/utils/analyzer.ts))**: Tokenizes outline texts, parses 5W1H query syntax, checks keyword continuity chaining across related elements, and hashes consistent keyword HSL colors.
- **Warning Panel ([AnalysisSidebar.tsx](file:///home/madman/github/Outliner/src/components/IDE/AnalysisSidebar.tsx))**: Renders a warning cards list. Clicking warnings scrolls and focuses the corresponding line inside the editor canvas.
- **Keyword Highlighter Overlay**: Splits unfocused outline nodes using regex content tokens, wrapping repeats in matching HSL colored highlight badges on the page sheet.

### 5. Epoch 5: Workflow Tabs & PDF Layout Print Engine
- **Workflow Navigation**: Refactored the coordinator to support tab transitions (`Metadata` | `Editing` | `Export` | `Review`).
- **Visual Mockups Panel ([ExportView.tsx](file:///home/madman/github/Outliner/src/components/IDE/ExportView.tsx))**: Renders a paper sheet layout showing changes to margins (0-50mm), orientations, and sizes (A4, Letter, A5, Legal) in real-time.
- **Native Print Engine ([pdfPrinter.ts](file:///home/madman/github/Outliner/src/utils/pdfPrinter.ts))**: Spawns a hidden DOM iframe, injects a print-specific `@page` rule mapping layout metrics, and triggers `window.print()` to output clean vector PDFs.
- **LLM Review Prompter**: Generates custom prompts containing research questions and structured outline nodes alongside TS response formats.

### 6. Epoch 6: Critique Paste Overlays & Git-like Snapshots Timeline
- **Feedback Comments Gutter ([ReviewView.tsx](file:///home/madman/github/Outliner/src/components/IDE/ReviewView.tsx))**: Reviews are rendered on a split canvas. The left side highlights nodes having critiques, enabling inline double-click editing. The right gutter sidebar feeds active comment cards with mark-solved actions.
- **Paste Schema Validator ([PasteReviewModal.tsx](file:///home/madman/github/Outliner/src/components/IDE/PasteReviewModal.tsx))**: Validates inputted LLM critique JSON arrays against node UUID keys, discarding orphan data.
- **Snapshot Timeline ([CommitTimeline.tsx](file:///home/madman/github/Outliner/src/components/IDE/ReviewView.tsx))**: Saves snapshots of nodes and metadata with comments. Allows rolling back outlines to checkpoints, or cloning/forking snapshots into new duplicate outline projects.

### 7. Custom Enhancements & Bug Fixes (June 3, 2026)
- **Whitespace Spacing Fix**: Resolved an issue where words in unfocused outline line items collapsed and displayed without spacing by changing the parent container from a flex-wrap layout to standard `whitespace-pre-wrap` block spacing.
- **Color Tagging Styles**: Transformed repeated keyword highlight badges from fill backgrounds to elegant outline borders utilizing active HSL values.
- **Add Section at Bottom**: Added a dashed `+ Add Section at Bottom` trigger button to the end of the Document Outline Sheet list to quickly append section headers.
- **Line Movement Operations**: Added `ArrowUp` (Move Up) and `ArrowDown` (Move Down) buttons to outline line item floating toolbars, enabling immediate line swapping while preserving indentation.
- **Dynamic Indentation Levels**: Scaled standard levels to a default limit of 12 (depths 0-11) with case-alternating rules and added a customization selector in the project metadata form to alter levels up to 20.
- **Header Commit State Display**: Swapped project writing goal headers with a live display of the latest commit checkpoint description and date.

### 8. Collapsible Warnings, Fullscreen & Advanced Spacings (June 3, 2026)
- **Highlighter Style Keywords**: Refactored keyword overlay displays from border outline spans to filled HSL highlights using background colors (`style={{ backgroundColor: bg, color: fg }}`) to increase legibility and save outline contrast space.
- **Keyboard Sorting Shortcuts**: Enabled `Alt + ArrowUp` and `Alt + ArrowDown` key listeners inside the outline editor to trigger moving line items up and down. Updated the editor bar instructions accordingly.
- **Fullscreen Mode Backdrop**: Designed a header toggle button to scale the Document Outline Sheet to a roomy `max-w-5xl` fixed overlay view.
- **Floating Controls & Diagnostics**: In fullscreen mode, rendered a bottom-right dock allowing color highlight toggling, exiting fullscreen, and viewing active issues in a collapsible diagnostics panel that opens uncollapsed on unresolved errors and is manually collapsible.
- **Per-Level Spacing & Highlights Overrides**: Expanded the project metadata schema to store level-specific highlights toggle, line spacing heights, and absolute indentation margins in mm. Built a sidebar collapsible settings list in the Export page and wired overrides to mockup previews and iframe PDF rendering templates.

### 9. Layout Adjustments & Sticky Modules (June 3, 2026)
- **Overlap Prevention**: Added a right padding constraint (`paddingRight: '240px'`) on outline line items to reserve space for absolute-positioned floating editing toolbars, preventing text coverage.
- **Natural Card Expansion**: Replaced viewport constraint `min-h-full` with dynamic `min-h-[85vh] h-fit mb-8` in fullscreen card wrappers to enable the editor canvas to expand scrollable depth following long outlines. Resolved a browser flexbox height calculation bug by removing flex column classes from the outer scrolling wrapper and using standard block `mx-auto` alignment on the sheet card itself to guarantee correct expansion.
- **Sticky Editor Footer**: Formulated the sheet details and shortcut instructions bar as a sticky panel anchored flush at the bottom boundary of the card (`sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10`). Utilized negative margin alignments (`-mx-8 sm:-mx-12 -mb-8 sm:-mb-12`) and padding restoration to cover bottom padding gaps, preventing scrolled lines from showing underneath/below it, and matching bottom rounded corners (`rounded-b-2xl`).
- **Sticky Analysis Sidebar**: Converted the desktop layout's right-side warning board into a floating column (`sticky top-8 h-fit`) that slides in sync alongside the scrollable editor sheet.


### 10. Toolbar Floating Overlay, Fullscreen Header Stats & Softer Dark Borders (June 3, 2026)
- **Active-Only Floating Toolbar**: Updated the line item editing toolbar to render *only* when the line has focus/is active (`isActive` is true), removing the hover trigger. Positioned the toolbar to float completely above the row text (`absolute bottom-full right-6 mb-1 z-20`) so it never obscures the outline text input. Removed the right-padding constraint from line item text containers to allow full-width line-editing.
- **Fullscreen Header Dashboard**: Relocated "Total Outline Elements" statistics and keyboard shortcuts from the bottom footer to the top title block in fullscreen mode.
- **Sticky Footer Fullscreen Cleanup**: Configured the sticky details bar footer to hide completely in fullscreen mode, eliminating bottom-screen clutter.
- **Premium Softer Page Borders**: Softened the card sheets and popup outlines in dark mode using translucent border colors (`border-slate-200/80 dark:border-slate-800/60`), enhancing dark theme visual balance without conflicting with light theme aesthetics.

### 11. Editor Display Spacing, Highlight Exclusions, Click-to-Deselect & Full Text Visibility (June 3, 2026)
- **Editor Display Spacing Settings**: Added a new "Editor Display Spacing" configuration card in the Metadata page with global line height (1.0x–3.0x) and indent width (8–64px) sliders, plus collapsible per-level overrides. Values are persisted in `ProjectMetadata` (`editorLineSpacing`, `editorIndentSpacing`, `editorLevelLineSpacing`, `editorLevelIndentSpacing`) and propagated through `OutlineEditor` to each `OutlineLineItem` as dynamic `lineHeight` and `paddingLeft` styles.
- **Level 0/1 Highlight Exclusion**: Modified `getKeywordColors()` to skip Section (depth 0) and Topic (depth 1) nodes from keyword frequency counting, and `checkKeywordChaining()` to skip chaining validation for nodes at depth ≤ 1. Updated `OutlineLineItem` to only render color-tagged highlight overlays for depth ≥ 2 nodes, keeping structural headers visually clean.
- **Click-to-Deselect Active Line**: Added `onMouseDown` deselect handlers on the editor container (both normal and fullscreen modes) that call `setFocusedIndex(null)`, with `e.stopPropagation()` on line items to prevent deselection when clicking on a line. Also added `Escape` key support to deselect and blur the active textarea.
- **Full Active Line Text Visibility**: Replaced the single-line `<input type="text">` with an auto-resizing `<textarea>` for the active line, and used a wrapping `<div>` for unfocused non-highlighted lines. The textarea auto-grows via `onInput` height adjustment, ensuring all text is visible without horizontal scrolling. Unfocused lines also use `whitespace-pre-wrap break-words` to wrap long text naturally.
 
- **Editor & Export Spacing and Line Height Controls**: Separated line-spacing (space/gap between outline rows) and line-height (text line height within rows) across the editor and export. Added `editorLineHeight`, `editorLevelLineHeight`, `lineHeight`, and `levelLineHeight` properties to `ProjectMetadata` schema. Labeled them clearly in the UI, adjusted dynamic padding styling in the editor, and mapped spacing to `margin-bottom` in the export PDF print and mockup stylesheets.
- **Export Highlighting Exclusions**: Enforced exclusion of Level 0 (Section) and Level 1 (Topic) nodes from keyword color highlighting in both `ExportView` mockup previews and `pdfPrinter` printed PDF outputs. Removed highlight configuration toggles for Level 0/1 from the per-level settings in ExportView to keep controls clean.

### 12. Subtree-End Insertion & Chaining Adjustments (June 4, 2026)
- **Subtree End Insertion**: Refactored `handleAddSiblingNode` in `OutlineEditor.tsx` to search forward and insert new child or sibling nodes at the end of the active node's entire subtree (past all descendants with `depth > activeNode.depth`). This guarantees that clicking "Append Question" on a Level 1 (Topic) inserts the new question at the end of the topic's children list instead of pushing it immediately below the topic line itself, maintaining outline structure.
- **Topic Parent Chaining Exclusion**: Updated `checkKeywordChaining` in `analyzer.ts` to skip keyword chaining checks if the node's parent is a Section (depth 0) or Topic (depth 1) node. This ensures Question nodes (depth 2) are not flagged for keyword chaining violations with their parent Topic.

### 13. Nesting Structure Lines, Tag Prefix Restoration & Sidebar Toggle Option (June 4, 2026)
- **Standard Tag Prefix Restoration**: Reverted the multi-level heading numbering features and fully restored the default semantic prefixes (`§` for Section, `Topic:` for Topic, `Q:` for Question, and `A:` for Answer) inside the outline line elements.
- **Collapsible Section & Topic Nodes**: Enabled collapsible toggles (Chevron icons) on Section (Level 0) and Topic (Level 1) items. Collapsing a node hides all subsequent descendant children in the outline view while keeping focus and key caret movements operational for non-collapsed siblings.
- **Nesting Structure Guide Lines**: Implemented code-editor-style vertical structure guide lines rendered absolutely at each indentation level gap midpoint (`12 + i * spacing + spacing / 2`). This visually clarifies parent-child tree linkages across outline rows.
- **Sidebar Options Toggle**: Added a persistent "Show Structure Line" toggle inside the right-hand "Editor Options" settings panel in the Analysis sidebar (saving/loading using key `showStructureLine` in IndexedDB), enabling the user to show or hide the vertical structure lines dynamically.
- **Fullscreen Warnings Collapsed by Default**: Set the fullscreen diagnostics warnings board to be collapsed by default (initializing state to `true`) and removed automatic uncollapsing, allowing the user to manually expand it.
- **Fullscreen Floating Dock Guidelines Toggle**: Appended a code-editor structure line toggle button (with a `ListTree` icon) inside the fullscreen view's floating controls dock.

### 14. Export Page & Printed PDF Layout Enhancements (June 4, 2026)
- **Shortened Safe Filenames**: Added `getSafeExportFilename` to generate safe and shortened filenames (lowercase alphanumeric, replacing spaces with underscores, max 30 characters length, followed by `_rev-X` or `_original`). Applied this dynamically to `.json`, `.otln-project`, and printed PDF documents by temporarily injecting the host and iframe document titles before print and restoring them after.
- **Compact Highlight Overlays**: Decreased the padding of keyword highlights inside the editor line item (`px-0.5 py-0`), export mockup (`px-[2px] py-0`), and PDF print stylesheet (`padding: 0px 2px; border-radius: 1.5px`) to tightly hug content tokens.
- **Formatted PDF Metadata**: Restructured the project metadata display block at the top of the printed PDF document into a beautiful, styled card grid with left vertical accent borders (`border-left: 3px solid #6366f1`), light slate background cards (`#f8fafc`), and premium indigo labels.
- **Dynamic PDF Page Footers**: Styled a native page footer in printed PDFs combining a fixed HTML bar for the left side ("Made with Outliner" linking to `https://iwas108.github.io/Outliner/dist`) and center side (revision/commit number or `"original"`), and using CSS `@page @bottom-right` margin box styling to natively output current/total page numbers (`Page X / Y`).

### 15. Native Print Footers & Tight Highlights Layout Fix (June 4, 2026)
- **Native Page Margin Footers**: Replaced the custom fixed-position HTML print footer (and dropped interactive links to resolve modern browser page-break layout compatibility bugs) with native CSS `@page` margin boxes (`@bottom-left`, `@bottom-center`, `@bottom-right`) in `pdfPrinter.ts`. This natively renders branding text, revision details, and page counters (`Page X / Y`) within the bottom margins, completely eliminating overlapping bugs. Added `border-top: 1px solid #e2e8f0;` and `padding-top: 6px;` to all three boxes to draw a continuous horizontal rule.
- **Tightened Highlight Padding & Inline Flow**: Changed keyword color highlights in printed PDFs from `display: inline-block;` to `display: inline;`, ensuring highlights flow naturally with wrapping text without inflating line heights. Reduced padding to `0.5px 2px` and border-radius to `1px` to tightly wrap tokens. Added `-webkit-print-color-adjust: exact; print-color-adjust: exact;` styling directly to the spans and the `@media print` query block to secure print color consistency.
- **Cleaned Up Viewports**: Reverted the print iframe's on-screen layout viewport settings to a clean `0` width and `0` height, as fixed-position viewport hacks are no longer necessary with native `@page` margin box compositing.

### 16. Rename Outline Extension to .json & Revised LLM Review Prompt (June 4, 2026)
- **File Extension Renamed**: Renamed the lightweight outline schema export format from `.otln` to standard `.json` across all configurations, tooltips, dialogs, drop targets, and download actions.
- **Revised LLM Review Prompt**: Updated the copiable LLM prompter in `ExportView.tsx` with a revised static prompt specifying that outline data is attached as a `.json` file, and instructing the LLM to focus on overarching logical continuity, macro/micro coherence, idea progression, and preventing circular or disjointed transitions.

### 17. Diagnostics Warnings Focus and Scrolling Bug Fix (June 4, 2026)
- **Automatic Parent Node Expansion**: Programmed the focus utility `useEffect` in `OutlineEditor.tsx` to automatically identify the parent Section and/or Topic of the focused line item. If any parent node is collapsed (its ID is in `collapsedNodeIds`), the engine removes it to expand it, allowing the target node to render.
- **Smooth Center Scroll & Focus**: Implemented a 50ms timeout to ensure the target textarea is fully mounted and interactive, then focuses the element and scrolls it smoothly to the center of the viewport via `.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
- **Propagation Controls inside Fullscreen Warning Dock**: Added `onMouseDown={(e) => e.stopPropagation()}` to the floating warnings dock in `OutlineEditor.tsx`, preventing clicks on warning cards from bubbling up to the fullscreen viewport's click-outside container (which resets the focused index). Simplified warning card buttons to set only the focused index.

### 18. GitHub Pages Prep & Marketing Landing Page (June 4, 2026)
- **Relocated Application Shell**: Moved the React application shell `index.html` to `app/index.html` and adjusted its script source pointing to the entrypoint to `../src/main.tsx`. Added standard SEO and Open Graph metatags with the Open Graph preview image set to the absolute URL pointing to `Outliner_editing_page.jpg` on GitHub Pages.
- **Vite Configuration Path Remappings**: Adjusted `vite.config.ts` to set `root: 'app'`, `base: './'` (relative paths), `publicDir: '../public'`, and `build.outDir: '../dist'` to compile the application bundle and assets into `dist/` relative to the project root directory.
- **Root Marketing Landing Page**: Created a beautiful landing page at the project root `index.html` using Tailwind CSS via CDN. Styled it with Outfit Google Fonts, radial gradients, glassmorphism dividers, and a responsive grid displaying the six documentation screenshots from `docs/images/` with premium captions. The copy leverages project markdown files to promote privacy-first offline operation (saving strictly to browser IndexedDB), FAIR data standards alignment, open-source codebase links, AI critiques, and custom PDF templates.

### 19. Theme Contrast Corrections (June 4, 2026)
- **Resolved Close Button Disappearance**: Swapped the non-standard `slate-850`, `rose-350`, and `purple-650` classes in `ImportModal.tsx` for standard Tailwind values (`slate-800`, `rose-300`, `purple-600`), resolving the visual bug where the Close button background was rendered as white with white text under dark theme.
- **Header Commit Text Contrast**: Corrected the commit subtitle text color inside `OutlineIDE.tsx` from `dark:text-slate-500` to standard `dark:text-slate-400` to make it stand out.
- **Critique Board Colors**: Bound standard `dark:text-slate-*` color properties to Section, Topic, Question, and Answer nodes in `ReviewView.tsx`, resolving the visual bug where outline lines were unreadable in dark mode. Cleared all remaining invalid `border-slate-850` instances.

### 20. Expandable Textarea Editor in Review Mode (June 4, 2026)
- **Single-Click Editing Trigger**: Configured the critique canvas lines inside `ReviewView.tsx` to automatically enter editing mode on a single click, providing a unified editing experience.
- **Auto-Growing Textareas**: Swapped the single-line text `<input>` with an auto-resizing `<textarea>` that matches the parent node height, preventing text clipping and allowing the user to read entire paragraphs while typing.
- **Propagation Controls**: Stopped click bubbling inside active textareas to avoid caret positioning resets.

### 21. Vite Dev Server Resolution & GitHub Pages Build Flow (June 4, 2026)
- **Vite Root Resolution**: Restored the project root as the default root for the Vite development server, removing `root: 'app'` to prevent path loading issues during local runs.
- **Dedicated Application Entrypoint**: Created a dedicated `app.html` entry point at the project root which links directly to absolute `/src/main.tsx` React assets.
- **Post-Build Relative Bundle Support**: Configured base path to `./` and rollup settings inside `vite.config.ts`. Updated the `build` script in `package.json` to compile the app and rename the output from `dist/app.html` to `dist/index.html`. This keeps assets relative and compatible with subfolder deployments on GitHub Pages.

### 22. Comprehensive README Documentation (June 4, 2026)
- **Professional Overview**: Replaced the brief `README.md` file with a comprehensive document describing project goals, logical rules, structural analyzers, checkpoint timeline versions, and exports layout formats.
- **Offline Guidelines**: Integrated detailed steps to guide users on running the application standalone on their laptops, explaining how the client-side IndexedDB is isolated and details on running a local Vite server.

### 23. Merge Review Tab into Editing — Unified Workspace (June 8, 2026)
- **Review Tab Eliminated**: Removed the separate `Review` tab from the IDE navigation. The tab bar now shows only `Metadata | Editing | Export`. All review/critique and version control functionality is integrated directly into the Editing workspace.
- **ReviewView.tsx Deleted**: The standalone `ReviewView.tsx` component has been removed. Its handler logic (critique import, comment solving, commit creation, revert, fork) was lifted into `OutlineIDE.tsx` and distributed to child components via props.
- **Critique Feed Sidebar Card**: Added a new collapsible "Critique Feed" card to `AnalysisSidebar.tsx`, positioned between Editor Options and Diagnostics. It shows unresolved review comments with context text, an "Import" button (opens `PasteReviewModal`), and per-comment "Mark Solved" buttons. Clicking a comment card scrolls to and focuses the corresponding editor line.
- **Version Timeline Sidebar Card**: Added a new collapsible "Version Timeline" card to `AnalysisSidebar.tsx` below Diagnostics. It renders the chronological commit feed with Revert and Fork Project actions, plus a "Commit" button (opens `CommitModal`).
- **Inline Comment Popovers**: Modified `OutlineLineItem.tsx` to accept per-line `ReviewComment[]` data. Lines with unresolved comments display a purple badge icon on the right side. Clicking the badge opens a popover positioned to the right showing each comment with a "Solve" button. Clicking outside or pressing Escape closes the popover. Lines with comments also receive a subtle purple background tint.
- **Fullscreen Floating Dock Integration**: Added two new buttons to the fullscreen floating dock in `OutlineEditor.tsx`: a Critique Feed button (with unresolved-count badge) and a Version Timeline button. Each toggles a popover panel above the dock with full Import/Solve/Commit/Revert/Fork functionality. All dock panels (diagnostics, critique, timeline) are mutually exclusive — opening one closes the others.
- **Architecture Updated**: Updated `architecture.md` to reflect the removed ReviewView, the merged component responsibilities, and the new inline comment popover behavior.
