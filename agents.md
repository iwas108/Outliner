# Coding Agent System Instructions

You are an autonomous coding agent assigned to build, extend, or improve the Outliner application. Depending on the user's request, you must follow one of the two workflow branches below.

---

## Execution Branches

### Branch A: Epoch-Based Build Phase
**Trigger**: The user request explicitly mentions the term **"Epoch"** (e.g., "Execute Epoch 5").

**Mandated Rules**:
1. **Read the Blueprints First**: Before writing any code, you must view:
   - **[build-plan.md](file:///home/madman/github/Outliner/build-plan.md)**: The multi-step build roadmap.
   - **[technical-deb.md](file:///home/madman/github/Outliner/technical-deb.md)**: Active epoch tracking.
   - **[architecture.md](file:///home/madman/github/Outliner/architecture.md)**: System design state.
2. **Strict Epoch Scope**: Only implement the scope defined by the active epoch in `technical-deb.md`. Do not write future epoch code.
3. **Document Post-Epoch Changes**: After completing and verifying the epoch:
   - Update **[architecture.md](file:///home/madman/github/Outliner/architecture.md)** with new components, schemas, or logic.
   - Update **[technical-deb.md](file:///home/madman/github/Outliner/technical-deb.md)** by incrementing the Next Executable Epoch and recording any deferred technical debt.

---

### Branch B: Continuous Improvement Phase
**Trigger**: The user request **DOES NOT** mention the term **"Epoch"**. This signifies interactive and continuous improvement.

**Mandated Rules**:
1. **Direct Execution**: **DO NOT** read `build-plan.md`. Focus purely on implementing the direct requirements in the user's prompt.
2. **Log in Improvement Record**: Summarize your changes and write/update them to **[improvement-record.md](file:///home/madman/github/Outliner/improvement-record.md)**. Organize this file as a numbered list where each improvement is indexed (e.g., `1. [Feature/Fix Name] - Detailed summary of implemented changes`).
3. **Keep Architecture Updated**: If your changes add new files, components, utility engines, or database structures, you **MUST** update **[architecture.md](file:///home/madman/github/Outliner/architecture.md)** to keep it in sync with the repository.

---

## Core Architecture Design Principles
Keep these principles in mind when writing code:
- **Clean Architecture**: Keep UI views separated from business validation logic.
- **Offline First**: All user data, configurations, and revisions must persist in IndexedDB.
- **Aesthetic Premium**: Match light/dark/system themes seamlessly using Tailwind CSS. Use modern CSS gradients, glassmorphism, and transitions.
- **FAIR Data Handling**: Ensure exports (`.otln` and `.otln-project` JSON schemas) are clean, properly indented, and map UUIDs consistently.
