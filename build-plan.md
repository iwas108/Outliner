# Outliner App - Software Engineering Build Plan

This document contains a detailed, epoch-numbered plan to safely build the **Outliner** application from scratch. The plan is designed specifically for coding agents to prevent context collapse, state corruption, and code hallucinations.

---

## Epoch 1: Project Scaffolding, Database Layer & Theme Configuration

### Objective
Initialize the project structure using Vite, React, TypeScript, and Tailwind CSS. Build a robust IndexedDB storage wrapper and implement theme options (Light, Dark, System) stored in IndexedDB.

### Steps
1. **Initialize Project**: Run `npx -y create-vite@latest ./ --template react-ts` to scaffold the project in the workspace.
2. **Install Tailwind CSS**: Install Tailwind CSS, PostCSS, and Autoprefixer. Configure Tailwind to compile properly.
3. **Setup Git & Output Directory**:
   - Ensure the Vite build output directory is set to root `dist` or the repo root so it can be committed to Git and served from `iwas108.github.io/Outliner`.
   - Configure `vite.config.ts` base path to `/Outliner/` to ensure assets load correctly on GitHub Pages.
4. **Implement IndexedDB Wrapper (`src/db/indexedDB.ts`)**:
   - Build a clean database wrapper using raw IndexedDB or a micro-wrapper like `idb`.
   - Database name: `outliner_db`, Version: 1.
   - Object stores:
     - `projects`: Primary store for project documents (metadata, outline nodes, revision history, reviews).
     - `config`: Configuration store (active theme, system settings).
5. **Theme Manager (`src/context/ThemeContext.tsx`)**:
   - Implement a custom React provider that hooks into `config` store in IndexedDB.
   - Support `light`, `dark`, and `system` options.
   - Synchronize light/dark classes with the document's `<html>` element.

### Verification Plan
- Verify Vite runs successfully using `npm run dev`.
- Run production build: `npm run build` and verify output files are created in the correct folder with `/Outliner/` asset base paths.
- Test IndexedDB database instantiation and read/write capabilities via console.
- Verify theme switching between light, dark, and system, and check that configuration persists in IndexedDB across reloads.

---

## Epoch 2: Dashboard & Project Management

### Objective
Build the Dashboard interface. Implement project creation, deletion, list viewing, and raw project exports/imports.

### Steps
1. **Create Dashboard Components**:
   - `Dashboard.tsx`: Main dashboard container.
   - `ProjectTable.tsx`: A table showing list of current projects, metadata (creation date, modification date, title), and management buttons.
   - `NewProjectModal.tsx`: Prompt for creating a new project.
2. **Project Actions**:
   - **Edit**: Transitions the user to the Outline IDE for the selected project.
   - **Delete**: Prompts for confirmation and deletes the project from IndexedDB.
   - **Export (`.otln-project`)**: Exports the entire project object (metadata, outline data, commits, reviews, etc.) as a JSON file matching the `.otln-project` extension.
   - **Import (`.otln-project`)**: Allows file uploads of `.otln-project` files, validates the structure, and saves them to IndexedDB.
   - **Import Review (`.otln`)**: Simple dashboard hook to import external review schema directly.
3. **Layout & Clean UI**:
   - Modern dashboard design with glassmorphic cards, harmonized CSS transition states, and responsive styling.

### Verification Plan
- Verify project creation inserts a new project structure into IndexedDB.
- Verify projects list in the table, updating modification times.
- Test export of `.otln-project` file and inspect contents.
- Test importing a valid `.otln-project` file, verifying all database states are restored.
- Test deleting a project and ensuring it is removed from the table and IndexedDB.

---

## Epoch 3: Outline IDE Core & Constraint Engine

### Objective
Create the main Outline editor engine. Implement the word-processor editing surface, metadata setup step, line-by-line hierarchical model, and structure constraint enforcement.

### Steps
1. **Initial Project Setup / Metadata Input**:
   - When opening a new project, show a full-page metadata setup form if empty.
   - Fields: Project Title, Writing Goal, Target Audience, Main Research Objective, Main Research Question, Sub Research Questions, Paper Size (e.g. A4, Letter).
2. **Editing Surface Layout (`src/components/IDE/OutlineEditor.tsx`)**:
   - Word-processor white or dark page styling centered on the screen depending on theme.
   - Line-by-line editor where each line is represented as an interactive editable element.
   - Autosave: Automatically save changes to IndexedDB on keystroke/debounce, showing a "Saved" or "Syncing..." status indicator in the top header.
3. **Outline Node Model**:
   - Data structure: An array of node objects:
     ```typescript
     interface OutlineNode {
       id: string; // Unique UUID
       type: 'section' | 'topic' | 'question' | 'answer';
       text: string;
       depth: number; // 0 to 5 (six levels deep)
     }
     ```
4. **Hierarchical Constraint Rules**:
   - First add a **Section** and **Topic**. Section contains Topics. Q&A pairs reside inside a Topic.
   - The first line under a topic must be a **Question**.
   - The sub-level of a Question must contain at least one **Answer** (indent level + 1).
   - Below an Answer on the same level, user can add a sub-question or another answer.
   - Every question, regardless of its level, must have at least one answer in its sub-level.
   - Indent depth limit: 6 (0 to 5).
5. **Interactive Controls**:
   - Hovering or active focus on a line reveals a floating control menu:
     - `+ Section`, `+ Topic`, `+ Question`, `+ Answer`
     - Indent (Increase Indent), Outdent (Decrease Indent)
     - Delete Line
   - Control buttons must check and enforce the structural rules dynamically (e.g. disable indent if it would violate depth 6 or lack a parent Question/Answer structure).

### Verification Plan
- Verify that editor inputs autofocus properly.
- Test creating Section -> Topic -> Question -> Answer flow. Verify that violations are prevented (e.g. cannot create Q/A pair without Topic, cannot indent answer beyond level 6).
- Verify autosave status indicator reflects actual database state.
- Test keyboard shortcuts (Tab for indent, Shift+Tab for outdent, Enter for new line).

---

## Epoch 4: Real-time Sidebar Analyzer & Color Tagging

### Objective
Build the right-side analysis sidebar. Perform real-time validation of structure, 5W1H checking, keyword-chaining, and automatic keyword color-tagging.

### Steps
1. **Sidebar Layout (`src/components/IDE/AnalysisSidebar.tsx`)**:
   - Toggleable panel on the right side of the IDE.
   - Displays real-time validation summary, syntax checks, and warning lists.
2. **Real-time Checks**:
   - **5W1H & Question Mark Check**: Checks that lines marked as `question` contain at least one 5W1H word (Who, What, Where, When, Why, How) AND a question mark (`?`). Ensures lines marked as `answer` do *not* contain these.
   - **Keyword-Chaining Check**: Scans consecutive Q&A lines to ensure they share at least one overlapping keyword (excluding common stop words like "the", "a", "is").
   - **Violation List**: Displays a clear, actionable notification with line references showing exactly where rules are broken. Clicking the notification focuses the corresponding line in the editor.
3. **Auto Keyword Color Tagging**:
   - A configuration switch in the sidebar to enable/disable auto color-tagging.
   - When enabled, parses the text of the outline, extracts repeated significant nouns/keywords, assigns them unique HSL colors, and highlights them with subtle colored badges/backgrounds inline in the editor.

### Verification Plan
- Test question line with and without `?` and 5W1H keywords; confirm warning displays immediately.
- Test keyword-chaining validation: verify it alerts when consecutive lines do not share any content words.
- Enable color-tagging and verify matching keywords across lines get highlighted in matching colors.
- Verify toggle settings are persisted in user config.

---

## Epoch 5: Workflow Tabs & PDF/JSON Export

### Objective
Build the top workflow navigation and implement the Metadata editing view and Export engine (customizable PDF preview and copiable `.otln` LLM review package).

### Steps
1. **Top Navigation Panel**:
   - Tabs: `Metadata` | `Editing` | `Export` | `Review`.
   - Control navigation state of the project view.
2. **Metadata View**:
   - Displays and permits modifications to project configuration (Goal, Target Audience, Research Questions, Paper Size, etc.).
3. **Export View Layout**:
   - Split-pane layout: Left is Preview pane, right is Config sidebar.
4. **PDF Export**:
   - PDF Preview showing live pagination layout based on selected config.
   - PDF configuration options (Right sidebar): Paper Size (A4, Letter, etc.), Orientation (Portrait, Landscape), and Margins.
   - Compile a printable print-stylesheet or use a library like `jspdf` / html-to-pdf to export clean vector PDF documents.
5. **`.otln` LLM Review Export**:
   - Right sidebar: Download button for `.otln` file (JSON containing metadata and nodes mapped by unique IDs).
   - Left preview pane: Displays a copyable prompt optimized to guide an LLM (Gemini, ChatGPT, Claude) to review the outline file and return feedback in a strict JSON format structure matching line IDs.

### Verification Plan
- Navigate between all four workflow tabs and verify components mount correctly.
- Modify metadata in the metadata tab and verify changes reflect in the editor and IndexedDB.
- Change PDF margins and paper sizes; verify preview panel adjusts layouts.
- Download the `.otln` file and check that its JSON formatting contains valid line IDs and metadata.
- Copy prompt, paste into clipboard, and verify prompt text correctly explains the required JSON review format.

---

## Epoch 6: Collaboration, Review Pasting & Version Commit History

### Objective
Implement the Review interface for analyzing LLM feedback, comment card positioning, and Git-like revision commit history.

### Steps
1. **Review Tab Layout**:
   - Right sidebar: "Paste Schema" button. Clicking this opens a modal.
   - Paste Modal: Textarea to paste the JSON output from the LLM. Runs a schema validator to verify format:
     ```json
     {
       "comments": [
         { "lineId": "uuid-here", "comment": "Feedback text..." }
       ]
     }
     ```
2. **Comment Card Overlay**:
   - Once verified, saves review comments into the active project database schema.
   - Displays the outline in a read-friendly layout similar to the IDE.
   - Displays beautiful comment cards in a right sidebar gutter aligned directly with the commented line.
   - Allows users to edit the line text directly from this view.
   - "Solve" button: Marks comment as solved (hides comment/resolves card, but retains record in project metadata).
3. **Commit / Revision System**:
   - In both "Editing" and "Review" screens, show a "Commit Version" button on the configuration sidebar.
   - Prompt user for a comment.
   - Creates a snapshot copy of the current metadata and outline nodes array.
   - Save this inside the project's `commits` array.
   - Sidebar displays commit history tree.
   - Allow user to:
     - Revert project to a previous commit.
     - Copy a previous commit as a brand-new project.

### Verification Plan
- Try pasting incorrect JSON format into the review validator; confirm it rejects and highlights error.
- Paste valid JSON feedback and verify comment cards appear next to their respective lines.
- Click "Solve" on a comment card and verify state changes, and that it is saved to IndexedDB.
- Make multiple revisions/commits with comments. Revert to an older commit and verify editor state updates.
- Create a new project copy from a historic commit, verify it appears in the Dashboard.
