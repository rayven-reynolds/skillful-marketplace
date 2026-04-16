# Code Review Task

Perform comprehensive code review. Be thorough but concise.

## Pre-requisite

If the user gives you a URL to a PR on github:
- ensure you have ethter the github cli or github MCP available, prefer the cli.
- if you do not, **DO NOT CONTINUE** and give instructions to the user on how to setup github cli.

If you are reviewing local code only, you DO NOT need the github CLI or github MCP.

## Check For:

**Logging** - No fmt.Print statements, uses proper logger with context
**Error Handling** - Always check and handle errors explicitly
**Logging** - Only log errors in the top-level API handler or worker
**Production Readiness** - No debug statements, no TODOs except /docs/todos, no hardcoded secrets
**React/Hooks** - Effects have cleanup, dependencies complete, no infinite loops
**Performance** - Uses goroutines appropriately
**Security** - Auth checked, inputs validated
**Architecture** - Follows existing patterns, code in correct directory
**Testing** - All changes should have unit tests with good coverage (>80%)

## Output Format

### ✅ Looks Good
- [Item 1]
- [Item 2]

### ⚠️ Issues Found
- **[Severity]** [File:line] - [Issue description]
  - Fix: [Suggested fix]

### 📊 Summary
- Files reviewed: X
- Critical issues: X
- Warnings: X

## Severity Levels
- **CRITICAL** - Security, data loss, crashes
- **HIGH** - Bugs, performance issues, bad UX
- **MEDIUM** - Code quality, maintainability
- **LOW** - Style, minor improvements