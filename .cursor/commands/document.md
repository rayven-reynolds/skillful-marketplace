You are updating documentation after code changes.

## 1. Identify Changes
- Check git diff vs the `main` branch, for recent commits and modified files
- Identify which features/modules were changed
- Note any new files, deleted files, changed files, or renamed files

## 2. Verify Current Implementation
**CRITICAL**: DO NOT trust existing documentation. Read the actual code.

For each changed file:
- Read the current implementation
- Understand actual behavior (not documented behavior)
- Note any discrepancies with existing docs

## 3. Update Relevant Documentation

Update **README.md**
- Keep to the existing format
- Correct inaccurate information in the file
- Can add instructions for new functionality if required (will normally not be required)

Update **docs/**

- Read each file in the /docs folder. For each file:
  - Compare to actual behavior (not documented behavior).
  - Fix any discrepancies in the file.

Regenerate **Swagger Docs**
  - Run `swag init ...` and `swag fmt -d .` everytime, DO NOT EDIT MANUALLY
  - Flag to the user if swagger is not installed, and prompt them to consider adding it to the API, and how they can do that

Update **postman collection**
  - Add new endpoints and param changes to `<project-name>.postman_collection.json`
  - Create a postman collection if it doesn't already exist
  - If this is a mono-repo, add the postman collection to the API folder(s), not the project root

## 4. Documentation Style Rules

✅ **Concise** - Sacrifice grammar for brevity
✅ **Practical** - Examples over theory
✅ **Accurate** - Code verified, not assumed
✅ **Current** - Matches actual implementation

❌ No enterprise fluff
❌ No outdated information
❌ No assumptions without verification
❌ No em-dashes

## 5. Ask if Uncertain

If you're unsure about intent behind a change or user-facing impact, **ask the user** - don't guess.
