```markdown
# witness-agents Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development conventions and workflows used in the `witness-agents` TypeScript repository. You'll learn how to structure files, write imports/exports, follow commit message guidelines, and write tests in alignment with the repository's established patterns.

## Coding Conventions

### File Naming
- Use **kebab-case** for all file names.

  **Example:**
  ```
  agent-manager.ts
  event-logger.test.ts
  ```

### Import Style
- Use **relative imports** for referencing other modules.

  **Example:**
  ```typescript
  import { AgentManager } from './agent-manager';
  ```

### Export Style
- Use **named exports** rather than default exports.

  **Example:**
  ```typescript
  // agent-manager.ts
  export function AgentManager() { ... }
  ```

### Commit Messages
- Follow **conventional commit** style.
- Use prefixes like `fix` or `chore`.
- Keep commit messages concise (average ~60 characters).

  **Examples:**
  ```
  fix: resolve agent initialization bug
  chore: update dependencies
  ```

## Workflows

### Commit Workflow
**Trigger:** When making any code change that needs to be committed.
**Command:** `/commit`

1. Stage your changes: `git add .`
2. Write a commit message following the conventional commit format:
    - Use a prefix (`fix`, `chore`, etc.)
    - Keep it concise (about 60 characters)
3. Commit your changes:  
   ```
   git commit -m "fix: correct agent status handling"
   ```

### Testing Workflow
**Trigger:** When adding new features or fixing bugs.
**Command:** `/test`

1. Write or update test files using the `*.test.*` naming convention.
2. Run the test suite (testing framework is unknown; try common commands):
    ```
    npm test
    ```
    or
    ```
    yarn test
    ```
3. Ensure all tests pass before committing.

### File Creation Workflow
**Trigger:** When creating new modules or components.
**Command:** `/create-file`

1. Name the new file using kebab-case (e.g., `new-feature.ts`).
2. Use relative imports for dependencies.
3. Use named exports for all exported members.

## Testing Patterns

- Test files use the `*.test.*` naming convention (e.g., `agent-manager.test.ts`).
- The specific testing framework is not detected; check for existing test scripts in `package.json`.
- Place tests alongside or near the code they test.

  **Example:**
  ```
  agent-manager.ts
  agent-manager.test.ts
  ```

## Commands
| Command      | Purpose                                             |
|--------------|-----------------------------------------------------|
| /commit      | Standardize commit messages using conventional style|
| /test        | Run the test suite                                  |
| /create-file | Create a new module following file naming conventions|
```
