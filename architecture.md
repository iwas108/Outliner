# Outliner App - System Architecture Blueprint

This document acts as the core technical blueprint for the Outliner application. It is updated dynamically at the end of each epoch to record the implemented design, schemas, and components.

---

## 1. Core Architecture Design

The app follows **Clean Code Architecture** principles separated into layers:
- **Presentation Layer (React Components)**: UI views and tabs (Dashboard, IDE Editor, Export, Review).
- **Domain/Logic Layer**: State machines, syntax validators, 5W1H checkers, keyword trackers, and export formatters.
- **Data Access Layer (IndexedDB Engine)**: Local persistent storage interfaces.

### FAIR Principles Alignment
- **Findable**: Local database models use globally unique, descriptive IDs for all items (projects, revisions, comments).
- **Accessible**: Works offline completely using IndexedDB; served staticly on GitHub pages via standard, responsive web technologies.
- **Interoperable**: The export files use clear JSON formats (`.json` for outlines and `.otln-project` for entire backups).
- **Reusable**: Outlines and review schemas can be imported/exported repeatedly without platform lock-in.

---

## 2. Technical Stack
- **Bundler/Runtime**: Vite + React + TypeScript
- **Styling**: Tailwind CSS v4 (compiled via @tailwindcss/postcss and autoprefixer)
- **Database**: IndexedDB (custom Promise-based async wrapper in `src/db/indexedDB.ts`)
- **Icons**: `lucide-react`
- **Deployment**: Marketing landing page hosted at the project root `iwas108.github.io/Outliner/`, and the compiled interactive React application bundle is served from `iwas108.github.io/Outliner/dist/` (configured with `base: '/Outliner/dist/'` in Vite).

---

## 3. Database Schema

### `outliner_db` Configuration (IndexedDB)

#### Store: `config`
Stores user-level configurations (e.g. system configurations and display settings).
```json
{
  "keyPath": "key",
  "data": {
    "key": "theme",
    "value": "system" // "light" | "dark" | "system"
  }
}
```

#### Store: `projects`
Stores all projects containing metadata, content, reviews, and version history.
```typescript
interface Project {
  id: string;                    // Unique UUID
  title: string;                 // Project title
  createdAt: string;             // ISO Timestamp
  updatedAt: string;             // ISO Timestamp
  
  // Metadata Configuration
  metadata: {
    writingGoal: string;
    targetAudience: string;
    researchObjective: string;
    researchQuestion: string;
    subResearchQuestions: string[];
    pageSize: string;            // "A4" | "Letter" | etc.
    orientation: 'portrait' | 'landscape';
    margins: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    maxLevel?: number;            // Indentation levels limit (default 12)
    includeHighlighting?: boolean; // Toggle highlighting globally
    lineSpacing?: number;         // Global line spacing (PDF)
    lineHeight?: number;          // Global line height (PDF)
    indentSpacing?: number;       // Global indentation width in mm (PDF)
    levelHighlighting?: { [level: number]: boolean }; // Per-level highlights (PDF)
    levelLineSpacing?: { [level: number]: number };   // Per-level line spacing (PDF)
    levelLineHeight?: { [level: number]: number };    // Per-level line height (PDF)
    levelIndentSpacing?: { [level: number]: number }; // Per-level indent in mm (PDF)
    editorLineSpacing?: number;   // Global editor line spacing (display)
    editorLineHeight?: number;    // Global editor line height (display)
    editorIndentSpacing?: number; // Global editor indent width in px (display)
    editorLevelLineSpacing?: { [level: number]: number };  // Per-level editor line spacing
    editorLevelLineHeight?: { [level: number]: number };   // Per-level editor line height
    editorLevelIndentSpacing?: { [level: number]: number }; // Per-level editor indent px
  };

  // Current Working Nodes
  nodes: OutlineNode[];

  // Git-like revision history snapshots
  commits: ProjectCommit[];

  // Review comments pasted back from LLM
  reviews: ReviewComment[];
}

interface OutlineNode {
  id: string;                    // Unique UUID (hidden)
  type: 'section' | 'topic' | 'question' | 'answer';
  text: string;                  // Editable string contents
  depth: number;                 // Indent depth (0 to 5)
}

interface ProjectCommit {
  id: string;                    // Commit UUID
  timestamp: string;             // ISO Timestamp
  comment: string;               // Commit message
  nodesSnapshot: OutlineNode[];  // Deep copy of nodes
  metadataSnapshot: any;         // Snapshot of metadata
}

interface ReviewComment {
  id: string;                    // Comment UUID
  lineId: string;                // Mapped OutlineNode.id
  commentText: string;           // Feedback text from LLM
  solved: boolean;               // True if marked solved
}
```

---

## 4. Component Structure

```
src/
├── components/
│   ├── Common/
│   │   └── ConfirmModal.tsx
│   ├── Dashboard/
│   │   ├── Dashboard.tsx
│   │   ├── ProjectTable.tsx
│   │   ├── NewProjectModal.tsx
│   │   └── ImportModal.tsx
│   └── IDE/
│       ├── OutlineIDE.tsx
│       ├── MetadataEditor.tsx
│       ├── OutlineEditor.tsx
│       ├── OutlineLineItem.tsx
│       ├── AnalysisSidebar.tsx
│       ├── ExportView.tsx
│       ├── ReviewView.tsx
│       ├── PasteReviewModal.tsx
│       └── CommitModal.tsx
├── context/
│   └── ThemeContext.tsx
├── db/
│   └── indexedDB.ts
├── utils/
│   ├── outlineRules.ts        // tree structural constraints
│   ├── analyzer.ts            // 5W1H and keyword analysis engine
│   └── pdfPrinter.ts          // Print-to-PDF iframe engine
├── App.tsx
├── main.tsx
└── index.css
```

---

## 5. IDE Outlining & Analysis Rules (Engine Implementation)

### Structural Hierarchy Constraints
1. **Section & Topic Rules**: A node of type `section` or `topic` must exist at the root levels before question-answers are initialized.
2. **Q&A Pairing Rules**:
   - The first sub-child of a topic must be a `question`.
   - The first sub-child of a `question` (indent + 1) must be an `answer`.
   - On the same level as an `answer`, the next line can be another `question` or `answer`.
   - If a line is marked as a `question`, the next indent level must have at least one child marked as an `answer`.
3. **Indentation limits**: Depths are restricted to values between `0` and `5` (inclusive), representing 6 hierarchy layers.

### Real-Time Validation & Keyword Chaining Rules
1. **5W1H Constraints**: Questions must contain a 5W1H query word (Who, What, Where, When, Why, How, Which, Whom) and end with a question mark (`?`). Answers must not contain a question mark (`?`).
2. **Keyword Chaining Constraints**: Consecutive Q&A pairs/hierarchy elements must share at least one content keyword (excluding standard English stop words) to maintain semantic context. **Section (depth 0) and Topic (depth 1) nodes are excluded** from chaining validation, and any node whose parent is a Section or Topic node is also excluded from being checked against its parent.
3. **Auto Keyword Highlighting**: Assigns consistent HSL colors to repeated keywords, highlighting them when nodes are unfocused. **Only nodes at depth ≥ 2 (Question/Answer levels) participate** in keyword frequency counting and highlight rendering.
4. **Click-to-Deselect**: Clicking anywhere outside a line item deselects the active line and hides the floating toolbar. Pressing `Escape` also deselects.
5. **Full Text Visibility**: Active lines use an auto-resizing `<textarea>` to wrap and display all text without clipping. Unfocused lines render as block `<div>` elements with `whitespace-pre-wrap break-words`.
6. **Nesting Structure Guide Lines**: Draws thin, theme-sensitive vertical borders (`border-l border-slate-200/60 dark:border-slate-800/50`) absolutely positioned at the midpoint of each indentation level gap (`12 + i * spacing + spacing / 2`). This visually maps nested tree paths. Toggled via the "Show Structure Line" option in the right-side Editor Options panel and the structure line toggle button inside the fullscreen view's floating controls dock.
7. **Collapsible Section and Topic Levels**: Render Chevron toggles next to Section and Topic node headers. Tapping these collapses or expands all nested descendant elements, facilitating clean outline viewing.
8. **Collapsed Warnings by Default**: The fullscreen diagnostics warnings panel starts collapsed by default, requiring a manual click to view to prevent distracting layout shifts.




---

## 6. Export & Printing Engine

### PDF Layout & Vector Printing Configuration
- **Symmetric Margins**: Allows users to specify page margins in millimeters (0-100mm) saved directly to project metadata.
- **Line Spacing & Line Height Layouts**: Supports separate, per-level formatting controls for Line Spacing (controlling vertical space/margin *between* outline items) and Line Height (controlling CSS `line-height` *within* wrapped text lines).
- **IFrame Print Hijacking**: Spawns a temporary hidden `<iframe>` element, writes a standard page configuration using CSS `@page` parameters (setting size, margins, and orientation dynamically), and calls native `window.print()` inside it. This forces the browser to open a print dialog that compiles vector text PDFs, applying all margins, line spacings, and line heights. Sets the printable document title and temporarily overrides the host page title to enforce custom file names in the print-to-PDF save dialog.
- **Visual Page Mockups**: A CSS page simulator rendering layout sizes (A4, Letter, A5, Legal) with landscape/portrait orientation flips, displaying the margins in real-time as scaled padding, and formatting layout spacing proportionally via custom css styles.
- **Formatted Metadata & Custom Footers**: Styles metadata display items as cards with indigo left-accent borders (`border-left: 3px solid #6366f1`) and light backgrounds. Injects a custom footer at the bottom of printed pages utilizing native CSS `@page` margin boxes (`@bottom-left` for branding, `@bottom-center` for revision/commit information, and `@bottom-right` for native page counts `Page X / Y`) styled with divider borders.

### File Export Formats
- **`.json` (JSON Outline File)**: Standard lightweight exchange format containing ONLY outline metadata (goal, MRQ, SRQs) and nodes array (mapped by ID, type, text, depth). Exported with shortened safe titles followed by `_rev-X` or `_original`.
- **`.otln-project` (Full Project Backup)**: Serializes the entire IndexedDB database record (including revision commits and review comments) for full workspace restoration. Exported with safe, version-appended filenames.
- **LLM Review Prompt Generator**: Injects the active outline content and research parameters into an instruction prompt asking the LLM to return feedback in a strict JSON comment schema matching line UUIDs.

---

## 7. Collaboration & Version Control

### Review Comments & Schema Validator
- **Critique Paste Validator**: Validates that inputted text is syntactically sound JSON matching the schema `comments: { lineId: string; commentText: string }[]`. Ensures comments map to currently existing node UUIDs in the database, ignoring orphan keys.
- **Comment Overlay Gutters**: Renders unresolved critique cards in a scroll-highlighted sidebar, linking each card to its corresponding line element in the outline. Includes click-to-focus triggers.
- **State Progression**: Resolving a comment toggles `solved: true` in the database, hiding it from the screen, and double-clicking outline elements permits instant inline text editing.

### Version Checkpoints & Revision Snapshots
- **Git-like Commit Snapshots**: Deep copies current nodes arrays and metadata parameters, wrapping them in a commit model containing custom user messages and generation timestamps.
- **Timeline Timeline Rollbacks**: Renders commits chronologically in a timeline feed. Clicking a checkpoint restores the database configuration nodes and metadata directly.
- **Project Forking**: Instantiates a brand-new duplicate outline project starting from the select commit snapshot, registers it inside IndexedDB, and shifts active focus back to the dashboard.
