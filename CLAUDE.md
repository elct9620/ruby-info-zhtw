# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ruby Information Bot that processes Ruby Core mailing list emails and summarizes them in Traditional Chinese for the Ruby Taiwan community. Runs on Cloudflare Workers, integrates with Discord.

## Development Commands

```bash
npm run dev              # Start development server with Wrangler
npm test                 # Run all tests with Vitest
npm test -- path/to/file # Run single test file
npm run test:coverage    # Run tests with coverage report
npm run deploy           # Deploy to Cloudflare Workers
npm run cf-typegen       # Generate Cloudflare types from wrangler.jsonc
```

## Architecture

Clean Architecture with dependency injection. See [docs/architecture.md](docs/architecture.md) for details.

```
Controller → UseCase → Service/Repository → Entity
                ↓
            Presenter → External API (Discord)
```

**Layers:**
- `controller/` - HTTP routes and email handler adapter
- `usecase/` - Business logic orchestration, interfaces in `interface.ts`
- `service/` - AI summarization, email dispatch, session encryption, Langfuse tracing
- `repository/` - Ruby Bug Tracker API client
- `presenter/` - Discord Embed formatting
- `entity/` - Domain models (Issue, Journal)

**Email Flow:** Email → EmailDispatcher → SummarizeUsecase → RestIssueRepository + AiSummarizeService → DiscordSummarizePresenter → Discord Webhook

## Configuration

- **TypeScript**: Path alias `@/*` → `src/*`
- **Cloudflare**: `wrangler.jsonc`, email handler at `core@ruby.aotoki.cloud`
- **Environment Variables**: See SPEC.md for full list
  - Required: ADMIN_EMAIL, DISCORD_WEBHOOK, DISCORD_CLIENT_ID/SECRET, OPENAI_API_KEY, SECRET_KEY_BASE
  - Optional: CF_AI_GATEWAY, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_BASE_URL

## Testing

Vitest with Cloudflare Workers pool. Tests in `/test` with `.spec.ts` extension. Coverage target: 89%+.

## Coding Conventions

- Never write comments unless exporting a method or class (use JSDoc for exports)
- Conventional commits in English
- Clean Architecture and DDD principles