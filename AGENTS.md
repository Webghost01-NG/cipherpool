# Repository Guidelines

## Project Structure & Module Organization

Solidity contracts live in `contracts/`; Foundry tests are in `test/`, with deployment scripts in `script/`. The React/Vite application is under `frontend/src/`, organized into components, hooks, contract metadata, styles, and utilities. Shared TypeScript adapters live in `client/src/`. The Express indexer and Zama proof service are in `backend/src/`, with tests in `backend/test/`. Security analysis and protocol specifications belong in `docs/`.

## Build, Test, and Development Commands

- `npm ci` — install the exact dependency versions in `package-lock.json`.
- `npm test` — run Foundry, backend, client, and frontend test suites.
- `npm run build:backend` — typecheck and compile the backend to `dist/`.
- `npm run build:frontend` — produce the Vite bundle in `dist-frontend/`.
- `npm run test:backend`, `npm run test:client`, `npm run test:frontend` — run one focused suite.
- `forge test -vvv` — run contract tests with detailed traces.

Copy the relevant `.env.example` values into local, untracked environment files before starting services. Do not invent deployment addresses or RPC responses.

## Coding Style & Naming Conventions

Use two-space indentation in TypeScript, TSX, CSS, and JSON. Prefer `camelCase` for variables and functions, `PascalCase` for React components and classes, and kebab-case CSS classes. Solidity contracts use `PascalCase`; functions and state variables use `camelCase`. Keep transaction state explicit and surface provider, relayer, and contract failures to users. TypeScript is checked in strict mode.

## Testing Guidelines

Add Foundry tests as `*.t.sol` and Node tests as `*.test.ts`. Test success, authorization, replay, stale-request, malformed-input, and integration failure paths. Test doubles belong only in test directories; production code must use verified integrations. Run the full test and both build commands before requesting review.

## Commit & Pull Request Guidelines

Use focused, imperative Conventional Commit messages, for example `fix: bind withdrawal proof to requesting wallet`. PRs must explain intent, security impact, deployment/configuration changes, tests, and remaining risks. Include desktop and mobile screenshots for UI changes. Review `git diff` before committing; never include secrets, generated build output, or fabricated chain data.
