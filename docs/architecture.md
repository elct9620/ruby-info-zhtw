# Architecture

This project follows Clean Architecture principles with clear separation of concerns.

## Layer Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     Controller Layer                         │
│  (HTTP routes, email handler - adapters to external world)   │
├─────────────────────────────────────────────────────────────┤
│                     Presenter Layer                          │
│  (Format output for external services - Discord Embed)       │
├─────────────────────────────────────────────────────────────┤
│                     UseCase Layer                            │
│  (Business logic orchestration, interface definitions)       │
├─────────────────────────────────────────────────────────────┤
│                     Service Layer                            │
│  (Business services - AI, encryption, email dispatch)        │
├─────────────────────────────────────────────────────────────┤
│                    Repository Layer                          │
│  (Data access - external API integration)                    │
├─────────────────────────────────────────────────────────────┤
│                      Entity Layer                            │
│  (Domain models - Issue, Journal)                            │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
/src/
├── index.ts                    # Main entry point
├── config.ts                   # Configuration management
├── constant.ts                 # Constants
├── types.d.ts                  # TypeScript declarations
│
├── controller/                 # HTTP route handlers
│   ├── AuthController.ts       # Discord OAuth flow
│   └── SimulateController.ts   # Protected simulation route
│
├── entity/                     # Domain models
│   ├── Issue.ts                # Issue entity
│   └── Journal.ts              # Journal entity
│
├── repository/                 # Data access layer
│   └── RestIssueRepository.ts  # Ruby Bug Tracker API client
│
├── service/                    # Business services
│   ├── AiSummarizeService.ts   # AI summary generation
│   ├── DiscordRoleAccessService.ts  # Discord role verification
│   ├── EmailDispatcher.ts      # Email routing logic
│   └── SessionCipher.ts        # Session encryption
│
├── usecase/                    # Business logic
│   ├── interface.ts            # Dependency injection interfaces
│   └── SummarizeUsecase.ts     # Issue summarization orchestration
│
├── presenter/                  # Output formatting
│   └── DiscordSummarizePresenter.ts  # Discord Embed formatting
│
└── prompts/                    # AI prompt templates
    └── summarize.md            # Mustache template for summaries
```

## Dependency Flow

```
Email Event
    │
    ├─→ EmailDispatcher
    │   ├─→ [ForwardAdmin] → Forward to admin email
    │   └─→ [Summarize]
    │        │
    │        └─→ SummarizeUsecase
    │             ├─→ RestIssueRepository → bugs.ruby-lang.org API
    │             │   └─→ Issue (domain model)
    │             │
    │             ├─→ AiSummarizeService
    │             │   ├─→ OpenAI API (GPT-5-mini)
    │             │   └─→ Mustache template
    │             │
    │             └─→ DiscordSummarizePresenter
    │                  └─→ Discord Webhook API

HTTP Request
    │
    ├─→ Hono App
    │   ├─→ AuthController
    │   │   ├─→ Discord OAuth
    │   │   ├─→ DiscordRoleAccessService
    │   │   └─→ SessionCipher
    │   │
    │   └─→ SimulateController
    │       └─→ SessionCipher (validation)

Configuration
    └─→ CloudflareConfig → Cloudflare Worker env bindings
```

## Key Design Patterns

| Pattern | Usage | Implementation |
|---------|-------|----------------|
| Dependency Injection | UseCase coordination | Constructor injection of Repository/Service/Presenter |
| Strategy | Email routing decisions | `EmailRoute` union type + switch dispatch |
| Builder | Discord message construction | DiscordSummarizePresenter setters |
| Factory | Type conversion | `RestIssueRepository.mapTrackerToIssueType` |
| Adapter | Data mapping | `RestIssueRepository.mapIssueResponse` |

## Interface Definitions

All concrete implementations depend on abstractions defined in `usecase/interface.ts`:

```typescript
interface IssueRepository {
  findById(id: number): Promise<Issue | null>;
}

interface SummarizeService {
  execute(issue: Issue): Promise<string>;
}

interface SummarizePresenter {
  setTitle(title: string): void;
  setDescription(description: string): void;
  setLink(link: string): void;
  setType(type: IssueType): void;
}
```

This enables:
- Unit testing with mock implementations
- Swappable implementations without changing business logic
- Clear contracts between layers

## Testing Strategy

Tests use Vitest with Cloudflare Workers pool.

```
/test/
├── entity/                     # Domain model tests
├── repository/                 # API client tests (mocked fetch)
├── service/                    # Service tests
├── presenter/                  # Presenter tests
├── usecase/                    # Integration tests
└── config.spec.ts              # Configuration tests
```

**Coverage target**: 89%+
