---
name: tech-stack
description: Enforce technology choices for new applications; a TypeScript web app, Python FastAPI API, and PostgreSQL. Use when the user asks to bootstrap, scaffold, or one-shot generate a marketplace/full-stack app.
---

# Full Stack Application Tech Stack

## Non-Negotiable Constraints

You must enforce all of the following:

1. Web app uses Next.js with TypeScript only (`.ts`/`.tsx`; no `.js`/`.jsx` source files).
2. API is implemented in Python FastAPI.
3. Database is PostgreSQL running locally.
4. No Docker or container runtime for any service.

If the user asks for conflicting tech, pause and confirm before continuing.

## Expected Layout

Unless the user gives a compatible alternative, create:

- `web/` Next.js TypeScript frontend app
- `api/` Python FastAPI service
- `README.md` root-level setup and run guide

## Required Workflow

Apply this workflow for building new applications:

### 1) Preflight

- Verify the current directory is empty (except README.md, .git/ and .gitignore).
- If not empty, ask for explicit confirmation before writing.
- Verify Node tooling is available before web scaffolding:
  - check for `node` and `npm`
  - if missing, stop and instruct user to install Node.js with npm first
  - verify with `node -v`, `npm -v`, and `which npm`
- Verify Python tooling is available before FastAPI scaffolding:
  - check for `python3` and `pip`
  - if missing, stop and instruct user to install Python 3 first
  - verify with `python3 --version`, `pip --version`, and `which python3`
- Verify Python virtualenv workflow is used for API setup:
  - always create a local virtual environment before installing API dependencies
  - use `python -m venv .venv` (or equivalent command for the user's Python install)
  - activate `.venv` before dependency installation and API run commands
- Verify PostgreSQL tooling is available before API/database wiring:
  - check for `brew`
  - if missing, stop and instruct user to install Homebrew first
  - verify with `brew -v` and `which brew`

### 2) Create Web App (Next.js + TypeScript)

- Scaffold `web/` with Next.js App Router + TypeScript using npm.
- Ensure `tsconfig.json` exists.
- Ensure app source files are TypeScript (`.ts`, `.tsx`) with Next.js conventions.
- Use npm for dependency installation and scripts.
- Provide package scripts for development and build (and test/lint when available).
- Add standard next.js entries to .gitignore at the project root

### 3) Create API (Python FastAPI)

- Scaffold `api/` with FastAPI.
- Ensure Python dependency file is present (`requirements.txt`).
- Use a project-local virtual environment for all API commands:
  - create with `python -m venv .venv` (or equivalent)
  - activate `.venv` before installing dependencies
  - install dependencies only inside the active virtual environment
- Add a health endpoint.
- Add minimal marketplace resource skeletons (for example: listings, users, orders).
- Read DB config from environment variables.
- Use Python migration tooling for schema management (for example Alembic).
- Add standard FastAPI entries and .venv/ to .gitignore at the project root

### 4) Configure Local PostgreSQL (No Docker)

- Assume the user is on MacOS
- Use Homebrew PostgreSQL install and service management.
- Use `brew install postgresql@<major>` and `brew services start postgresql@<major>`.
- Configure:
  - `POSTGRES_DB`
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`
  - `DATABASE_URL` for the API
- Ensure API database wiring points to local PostgreSQL.

### 5) Add .cursor/skills for any new technologies introduced

- Keep skills really concise
- Capture best practises of the language
- One skill per technology or language

### 6) Wire Local Run

- Provide root-level commands to:
  - start local PostgreSQL service
  - run API
  - run web app
- Include a basic smoke-test path:
  - API health endpoint returns success
  - web app successfully calls an API endpoint

## Hard Prohibitions

- Do not use Docker, Docker Compose, podman, or containerized local databases.
- Do not generate frontend JavaScript source files.
- Do not generate a non-FastAPI backend.
- Do not wire a non-PostgreSQL database.
- Do not install python dependencies globally; use a virtualenv `.venv` always.
- Do not finish without runnable commands.

## Validation Checklist (Must Pass Before Completion)

- [ ] No Docker or compose files are created
- [ ] `brew` is installed and used for local PostgreSQL setup and service management
- [ ] `npm` is installed and used for web dependency management and scripts
- [ ] `python3` and `pip` are installed for API development
- [ ] `web/tsconfig.json` exists
- [ ] `web/` is a Next.js TypeScript app and contains no `.js`/`.jsx` source files
- [ ] `api/` has FastAPI app structure and Python dependencies configured
- [ ] `api/.venv` is created with `python -m venv .venv` (or equivalent) and used for API dependency installation/run
- [ ] API uses `DATABASE_URL` for PostgreSQL
- [ ] README includes macOS local Postgres setup, run, and smoke-test instructions

## Final Response Format

Return:

1. High-level directory tree created
2. Exact local startup commands (macOS, no Docker)
3. Assumptions made
4. Next optional improvements (auth, payments, CI/CD, deployment)
