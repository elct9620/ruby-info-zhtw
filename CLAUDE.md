# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Ruby Information Bot that processes Ruby mailing list emails and summarizes them in Traditional Chinese for the Ruby Taiwan community. It runs on Cloudflare Workers and integrates with Discord.

## Common Development Commands

**Development:**
```bash
npm run dev      # Start development server with Wrangler
npm start        # Alias for npm run dev
```

**Testing:**
```bash
npm test         # Run tests with Vitest
```

**Deployment:**
```bash
npm run deploy   # Deploy to Cloudflare Workers
```

**Type Generation:**
```bash
npm run cf-typegen  # Generate Cloudflare types
```

## Architecture Overview

This project follows Clean Architecture principles with clear separation of concerns:

- **`/src/controller/`** - HTTP route handlers (auth, simulate, email processing)
- **`/src/entity/`** - Domain entities (Issue, Journal)
- **`/src/repository/`** - Data access layer for journals and issues
- **`/src/service/`** - Business services (Discord, OpenAI, simulation)
- **`/src/usecase/`** - Use cases implementing business logic
- **`/src/presenter/`** - Presentation layer for Discord integration
- **`/src/config/`** - Configuration management (Cloudflare bindings)

**Key architectural patterns:**
- Repository pattern for data access
- Use case pattern for business logic
- Service layer for external integrations
- Presenter pattern for Discord message formatting

## Technology Stack

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript (ES2021 target, strict mode)
- **Web Framework**: Hono
- **Test Framework**: Vitest with Cloudflare Workers pool
- **AI Integration**: AI SDK with OpenAI
- **Email Processing**: Postal MIME
- **Template Engine**: Mustache
- **Code Formatting**: Prettier (140 char width, single quotes, tabs)

## Important Configuration

- **TypeScript**: Path alias `@/*` maps to `src/*`
- **Cloudflare**: Configuration in `wrangler.jsonc`
- **Environment**: Cloudflare bindings accessed via `config.get()`

## Coding Conventions

From CONVENTIONS.md:
- Never write comments unless exporting a method or class
- Use JSDoc style comments for exported methods and classes

## Git Conventions

- Use conventional commits format in English
- Follow Clean Architecture and Domain-Driven Design principles