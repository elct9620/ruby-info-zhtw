# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Ruby Information Bot that processes Ruby mailing list emails and summarizes them in Traditional Chinese for the Ruby Taiwan community. It runs on Cloudflare Workers and integrates with Discord. The bot subscribes to Ruby Core mailing list and automatically processes incoming emails.

## Common Development Commands

```bash
npm run dev         # Start development server with Wrangler
npm start           # Alias for npm run dev
npm test            # Run tests with Vitest
npm run deploy      # Deploy to Cloudflare Workers
npm run cf-typegen  # Generate Cloudflare types from wrangler.jsonc
```

## Architecture Overview

This project follows Clean Architecture principles with clear separation of concerns:

- **`/src/controller/`** - HTTP route handlers (auth, simulate)
- **`/src/entity/`** - Domain entities (Issue, Journal)
- **`/src/repository/`** - Data access layer (RestIssueRepository)
- **`/src/service/`** - Business services (AiSummarizeService, DiscordRoleAccessService, EmailDispatcher, SessionCipher)
- **`/src/usecase/`** - Use cases implementing business logic (SummarizeUsecase)
- **`/src/presenter/`** - Presentation layer for Discord (DiscordSummarizePresenter)
- **`/src/config.ts`** - Configuration management using CloudflareConfig class

### Email Processing Flow

1. Emails sent to `core@ruby.aotoki.cloud` trigger the `email` export handler
2. EmailDispatcher routes emails based on rules (summarize, forward to admin, or reject)
3. For summarization: SummarizeUsecase fetches issue data, generates AI summary, and sends to Discord

### Key Dependencies

- **Hono**: Web framework for HTTP routes
- **AI SDK with OpenAI**: For generating summaries (uses GPT-5-mini)
- **Postal MIME**: Email parsing
- **Mustache**: Template rendering for summaries

## Configuration

- **TypeScript**: Path alias `@/*` maps to `src/*`, ES2021 target, strict mode
- **Cloudflare**: Configuration in `wrangler.jsonc`, email handler configured for core@ruby.aotoki.cloud
- **Environment Variables**: Accessed via CloudflareConfig class from Cloudflare bindings
  - ADMIN_EMAIL, DISCORD_WEBHOOK, DISCORD_CLIENT_ID/SECRET
  - OPENAI_API_KEY, CF_AI_GATEWAY (optional)
  - SECRET_KEY_BASE
- **Prettier**: 140 char width, single quotes, tabs, with import organization

## Testing

Tests use Vitest with Cloudflare Workers pool. Test files should be in `/test` directory with `.spec.ts` extension.

## Coding Conventions

From CONVENTIONS.md:
- Never write comments unless exporting a method or class
- Use JSDoc style comments for exported methods and classes

## Git Conventions

- Use conventional commits format in English
- Follow Clean Architecture and Domain-Driven Design principles