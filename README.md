# Outliner

> **A Privacy-First, Offline-Ready Academic Writing IDE Aligned with FAIR Data Standards**

Outliner is a professional, high-performance web-based editor designed for researchers, academics, and writers. It enforces logical flow, checks question-answer pairings, tokenizes and highlights recurring keywords in real-time, and generates custom formatted vector PDF exports. 

By operating entirely in the browser using client-side IndexedDB, Outliner guarantees complete data privacy and native offline operation without server dependencies or cloud tracking.

---

## 🌟 Key Features

### 1. Structured Outline IDE Canvas
*   **Semantic Indentation Engine**: Standardizes hierarchical node types (`Section` ➔ `Topic` ➔ `Question` ➔ `Answer`) mapped to concrete indentation depths (up to 12 levels).
*   **Intelligent Keyboard Navigation**:
    *   `Tab` / `Shift + Tab`: Indents or outdents nodes (updates semantic type automatically).
    *   `Enter`: Appends new sibling nodes.
    *   `Alt + ↑` / `Alt + ↓`: Swaps/moves rows up or down while preserving their outline level.
    *   `ArrowUp` / `ArrowDown`: Moves carets cleanly between adjacent line items.
*   **Visual Guide Lines**: Code-editor-style vertical guidelines that map nested paths. Can be toggled on/off in real-time.
*   **Collapsible Elements**: Chevron buttons on Section and Topic headers collapse or expand nested descendant trees.
*   **Full-Width Active Editor**: Unfocused items display wrapped text, while clicking a row activates an auto-resizing, full-width `<textarea>` with a floating context toolbar.

### 2. Real-Time Logic & Syntax Analyzer
*   **5W1H Validation**: Enforces query structure rules for Questions (must contain a query term like *Who, What, Where, When, Why, How, Which* and end with a `?`) and Answers (must not contain question marks).
*   **Keyword Chaining (Semantic Cohesion)**: Ensures consecutive nodes share at least one keyword (excluding common stop words) to maintain thematic flow. *Section and Topic nodes are excluded from chaining warnings.*
*   **HSL Hashed Highlight Overlays**: Assigns unique, stable HSL background colors to matching keywords. This displays repeated themes at a glance. *Keyword overlays are restricted to Question/Answer rows (depth ≥ 2).*
*   **Collapsible Warnings Board**: Lists structural, grammatical, and flow warnings in a sticky sidebar. Clicking a warning expands parent nodes, scrolls, and centers the target editor input.

### 3. Version History Checkpoints (Git-like Commits)
*   **Commits Timeline**: Capture manual snapshots of the outline tree and project metadata with descriptive commit messages.
*   **Rollback & Restores**: Revert the active editor state to any historical checkpoint instantly.
*   **Workspace Forking**: Clone any version checkpoint into a brand-new project workspace within IndexedDB.

### 4. Interactive Peer Review Board (AI & Human)
*   **LLM Prompt Generator**: Generates custom markdown prompts containing research objectives and outline nodes. Formatted specifically for SLR Magic structured reviews.
*   **Critique Paste Validator**: Validates pasted LLM feedback JSON arrays. Ensures critiques map strictly to active node UUIDs in the database and filters out orphaned comments.
*   **Side-by-Side Review Gutter**: Browse active critiques in a sidebar linked to outline elements. Highlighted nodes indicate comments; clicking a card centers the node, and clicking "Solve" archives the critique card.

### 5. Vector PDF Export & Custom Layouts
*   **Symmetric Page Margins**: Customize print margins (0–50mm) and select sizes (A4, Letter, A5, Legal) with orientation switches.
*   **Row Spacing & Line Height Overrides**: Separates row margins (spacing between items) and line heights (spacing within items), configurable globally or overridden on a per-level basis.
*   **Clean Print View**: Automatically excludes Level 0/1 highlights. Displays metadata items in indigo-accented left-border cards.
*   **Native @page Page Footers**: Renders branding footer notes, revision markers, and page counters (`Page X / Y`) using native CSS margin boxes. This eliminates overlapping page-break bugs.

---

## 🔒 Privacy & FAIR Alignment

*   **100% Privacy-First**: No remote database syncs, no tracking pixels, and no analytics. Your data never leaves your computer.
*   **IndexedDB Storage**: Projects and settings are stored locally in the browser's persistent database sandbox.
*   **FAIR Data Alignment**:
    *   **Findable**: Mapped with persistent UUIDs for projects, nodes, and comments.
    *   **Accessible**: Operates 100% offline. Served statically.
    *   **Interoperable**: Exports lightweight `.json` files for outline sharing and `.otln-project` files for database backups.
    *   **Reusable**: No proprietary formatting lock-in.

---

## 💻 Running Offline (On Your Laptop)

Outliner is completely serverless. You can run the entire IDE locally on your computer with or without internet access.

### Method 1: Double-Click Static Files (Easiest)
Because the app is compiled with relative path routing, it can be run directly from your local filesystem.
1.  **Download the Code**: Clone the repository or download it as a ZIP file.
2.  **Open the Standalone App**:
    *   Navigate into the `dist/` directory.
    *   Double-click [dist/index.html](file:///home/madman/github/Outliner/dist/index.html) to open the interactive Outliner IDE.
3.  **Open the Marketing/Docs Portal**:
    *   Double-click the root [index.html](file:///home/madman/github/Outliner/index.html) to open the offline documentation and features showcase.

*Note: Your browser's native IndexedDB is partitioned per-origin. Running the app directly via `file:///` URLs works perfectly, and your files will remain securely isolated on your local hard drive.*

### Method 2: Local Vite Development Server
If you want to run the project under a local server context or make modifications:
1.  Ensure you have **Node.js** (v18+) installed.
2.  Clone the repository:
    ```bash
    git clone https://github.com/iwas108/Outliner.git
    cd Outliner
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Launch the development server:
    ```bash
    npm run dev
    ```
5.  Access the applications in your browser:
    *   **Marketing Portal**: `http://localhost:5173/`
    *   **Interactive Outliner IDE**: `http://localhost:5173/app.html`

6.  Compile a production-ready standalone build:
    ```bash
    npm run build
    ```
    This compiles assets into `dist/` and automatically formats [dist/index.html](file:///home/madman/github/Outliner/dist/index.html) with portable, relative asset links.

---

## 📁 Technical Architecture & Codebase

```
Outliner/
├── dist/                   # Compiled, production-ready static assets
├── docs/                   # Visual screenshots and screenshots assets
├── public/                 # Static SVG icons and favicon resources
├── src/
│   ├── components/         # React Presentation Components
│   │   ├── Common/         # Confirm/Prompt Modals
│   │   ├── Dashboard/      # Project list, New Project, Import Modals
│   │   └── IDE/            # OutlineEditor, Sidebars, Exports, Revisions
│   ├── context/            # React Theme Context (Light/Dark/System)
│   ├── db/                 # Promise-based IndexedDB Wrapper
│   └── utils/
│       ├── outlineRules.ts # Indent constraint & hierarchy definitions
│       ├── analyzer.ts     # 5W1H syntax & keyword analysis engine
│       └── pdfPrinter.ts   # IFrame native printing & CSS styling compiler
├── app.html                # Vite React app development launcher
├── index.html              # Marketing Landing Page (Tailwind CDN)
├── package.json            # Scripts & project dependencies
├── tsconfig.json           # Type configurations
└── vite.config.ts          # Rollup bundles and base path configurations
```

---

## 🤝 Contribution Guidelines

This repository includes automated instructions for agentic pair-programmers in [agents.md](file:///home/madman/github/Outliner/agents.md).
*   **Branch A (Epoch-Based builds)**: Reference [build-plan.md](file:///home/madman/github/Outliner/build-plan.md) and [technical-deb.md](file:///home/madman/github/Outliner/technical-deb.md) to keep systems updated.
*   **Branch B (Continuous improvements)**: Log changes chronologically in [improvement-record.md](file:///home/madman/github/Outliner/improvement-record.md) and keep [architecture.md](file:///home/madman/github/Outliner/architecture.md) structure definitions in sync.

---

## 📄 License
This project is open-source and released under the [MIT License](file:///home/madman/github/Outliner/LICENSE).
