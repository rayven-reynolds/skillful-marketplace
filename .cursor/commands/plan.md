**Skill gate for `tech-stack`:**
- Apply it **only** when the user is planning a **new full-stack application** (bootstrap/scaffold/one-shot app generation).
- For general feature planning, bug fixes, refactors, docs, reviews, or service-specific work, **do not** apply it.


Based on our full exchange, produce a markdown plan document.

Requirements for the plan:

- Include clear, minimal, concise steps.
- Track the status of each step using these emojis:
  - 🟩 Done
  - 🟨 In Progress
  - 🟥 To Do
- Include dynamic tracking of overall progress percentage (at top).
- Do NOT add extra scope or unnecessary complexity beyond explicitly clarified details.
- Steps should be modular, elegant, minimal, and integrate seamlessly within the existing codebase.

Markdown Template:

# Feature Implementation Plan

**Overall Progress:** `0%`

## TLDR
Short summary of what we're building and why.

## Critical Decisions
Key architectural/implementation choices made during exploration:
- Decision 1: [choice] - [brief rationale]
- Decision 2: [choice] - [brief rationale]

## Tasks:

- [ ] 🟥 **Step 1: [Name]**
  - [ ] 🟥 Subtask 1
  - [ ] 🟥 Subtask 2

- [ ] 🟥 **Step 2: [Name]**
  - [ ] 🟥 Subtask 1
  - [ ] 🟥 Subtask 2

...

Again, it's still not time to build yet. Just write the clear plan document. No extra complexity or extra scope beyond what we discussed.

Write the plan to `docs/<plan-description>.md` as well as to the chat window.