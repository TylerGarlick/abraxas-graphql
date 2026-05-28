# Agents Guide: abraxas-graphql

## Toolchain
- **Runtime:** Bun (Default over Node.js)
- **Language:** TypeScript
- **GraphQL Framework:** GraphQL Yoga
- **Database:** ArangoDB (via `arangojs`)
- **Validation:** `superstruct`

## Commands
- **Execution:** `bun run index.ts` or `bun --hot ./index.ts`
- **Testing:** `bun test`
- **Installation:** `bun install`
- **Build:** `bun build <file>`
- **CLI:** `bunx <package> <command>`

## Key Conventions
- **Entrypoint:** `index.ts`
- **Environment:** Bun automatically loads `.env`; do not use `dotenv`.
- **API Preferences:**
  - Use `Bun.serve()` instead of `express`.
  - Use `Bun.file` instead of `node:fs`.
  - Use `Bun.$` instead of `execa`.
  - Use `bun:sqlite` (SQLite), `Bun.redis` (Redis), and `Bun.sql` (Postgres) instead of external libraries.
  - Use built-in `WebSocket` instead of `ws`.
- **Frontend:** Use HTML imports with `Bun.serve()` instead of `vite`. HTML files can import `.tsx`, `.jsx`, or `.js` directly.
- **Testing:** Use `import { test, expect } from "bun:test";`.
