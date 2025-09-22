# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains the Nuxt client; subfolders include `components/` for reusable Vue SFCs, `pages/` for route views, `composables/` for chat helpers, `stores/` for Pinia modules, and `utils/` for request helpers.
- `server/api/` holds server-side handlers that back the chatbot endpoints; align new APIs with existing naming like `chat.post.ts`.
- `shared/utils/` collects code shared between client and server; prefer adding cross-environment utilities here rather than duplicating logic.
- Static assets live under `app/assets/` and `public/`; reserve `examples/` for demo workflows and `docs/` for longer-form guidance.

## Environment & Configuration
- Copy `.env.example` to `.env` before running the app; populate `NUXT_SILICON_FLOW_API_KEY`, `NUXT_DEEPSEEK_API_KEY`, and `NUXT_MCP_SERVER_DIRECTORY` with local credentials.
- Install Ollama locally when targeting `qwen2.5:7b` as described in `docs/ollama_config_for_windows.md`.
- `npx only-allow pnpm` guards the toolchain; always use the bundled PNPM version shown in `package.json`.

## Build, Test, and Development Commands
- `pnpm install` installs dependencies and triggers `nuxt prepare` to sync generated types.
- `pnpm dev -o` starts the Nuxt dev server and opens the UI; use it when iterating on chat flows.
- `pnpm build` compiles the production bundle, `pnpm generate` emits a static build, and `pnpm preview` serves the generated output for smoke checks.

## Coding Style & Naming Conventions
- Prettier enforces 2-space indentation, semicolons, and single quotes; run `pnpm exec prettier --write <files>` for manual formatting.
- ESLint integrates via `.nuxt/eslint.config.mjs`; the Husky pre-commit hook runs `lint-staged`, so keep staged files lint-clean.
- Name Vue components in PascalCase (`ChatPanel.vue`), pages in kebab-case (`chat/index.vue`), and Pinia stores with the `useXStore` pattern inside `app/stores/`.

## Testing Guidelines
- No automated suite exists yet; when adding tests, co-locate unit specs as `*.spec.ts` next to the source or create a `tests/` tree for integration cases.
- Validate new features manually through `pnpm dev -o`, using recorded chat scenarios from `examples/` to confirm regression-free behavior.
- Document smoke test steps in PRs until an automated harness is introduced.

## Commit & Pull Request Guidelines
- Recent history favors the `wip: 描述` style; keep the `wip:` prefix or adopt a clearer `type: summary` convention consistently across the team.
- Commits should remain focused on a single change set; include translated context when touching bilingual resources.
- Pull requests should describe the motivation, list key commands run (`pnpm build`, manual QA), link tracking issues, and add screenshots or logs for UI-facing changes.
