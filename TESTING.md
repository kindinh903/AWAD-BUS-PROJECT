# Running Unit Tests (frontend-auth)

This project uses Vitest + React Testing Library for unit tests.

## Prerequisites

- Node.js (16+ recommended)
- npm (or a compatible package manager)
- Run commands from the `frontend-auth` folder.

## Install dependencies

Open PowerShell and run:

```powershell
cd C:\Users\GIK2HC\Desktop\AWAD-BUS-PROJECT\frontend-auth
npm install
```

If you already ran `npm install` earlier, you can skip this step.

## Run the full test suite

- Run tests in watch mode (default behaviour):

```powershell
npm test
```

- Run tests once (non-watch):

```powershell
npm test -- --run
```

- Explicit watch-mode script (same as `npm test` by default):

```powershell
npm run test:watch
```

## Run a single test file or pattern

You can run a single test file directly with `npx vitest`:

```powershell
# Run a specific test file once
npx vitest run src/components/__tests__/ThemeToggle.test.tsx

# Or run a named test (by test name pattern)
npx vitest -t "ThemeToggle" --run
```

If you prefer using the npm script wrapper:

```powershell
# run vitest directly via npm script (pass extra args after --)
npm test -- -- -t "ThemeToggle"
```

Note: depending on shell quoting rules, you may need to adjust the quotes on Windows PowerShell.

## Test setup details

- `vitest.config.ts` is configured to use `jsdom` and loads `src/setupTests.ts`.
- `src/setupTests.ts` registers `@testing-library/jest-dom` and provides a `window.matchMedia` mock so tests that depend on `prefers-color-scheme` work in the test environment.
- Test files are located under `src/components/__tests__/` by convention in this repository.

## Troubleshooting

- If a module or type is missing, run `npm install` again.
- If tests report React `act(...)` warnings, ensure events that cause state updates are awaited or wrapped appropriately. The tests included with the project use `@testing-library/user-event` to simulate user interactions.
- If you want to run tests in CI, use `npx vitest run` (or `npm test -- --run`) to avoid the interactive watch mode.

## Files added for testing in this project

- `vitest.config.ts` - Vitest configuration
- `src/setupTests.ts` - test environment setup (jest-dom + matchMedia mock)
- `src/components/__tests__/ThemeToggle.test.tsx` - example tests for the ThemeToggle component

---

If you'd like, I can also add a small npm script to run a single test more conveniently (for example: `test:one "ThemeToggle"`) — tell me if you want that and I'll add it to `package.json`.