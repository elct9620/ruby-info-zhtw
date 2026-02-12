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
├── durable/                    # Composition Root (Cloudflare Durable Objects)
│   └── IssueDebounceObject.ts  # Debounce emails + wire dependencies
│
├── entity/                     # Domain models
│   ├── Issue.ts                # Issue entity
│   └── Journal.ts              # Journal entity
│
├── repository/                 # Data access layer
│   ├── RestIssueRepository.ts  # Ruby Bug Tracker API client
│   └── SpanTrackedIssueRepository.ts  # Decorator: adds Langfuse span tracing
│
├── service/                    # Business services
│   ├── AiSummarizeService.ts   # AI summary generation
│   ├── DiscordRoleAccessService.ts  # Discord role verification
│   ├── EmailDispatcher.ts      # Email routing logic
│   ├── LangfuseService.ts      # Langfuse tracing (Trace, Span, Generation)
│   └── SessionCipher.ts        # Session encryption
│
├── usecase/                    # Business logic
│   ├── interface.ts            # Dependency injection interfaces
│   └── SummarizeUsecase.ts     # Issue summarization orchestration
│
├── presenter/                  # Output formatting
│   ├── DiscordSummarizePresenter.ts   # Discord Embed formatting + delivery
│   └── SpanTrackedSummarizePresenter.ts  # Decorator: adds Langfuse span tracing
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
    │        └─→ IssueDebounceObject (Composition Root)
    │             ├─→ Debounce rapid emails via Durable Object alarm
    │             ├─→ LangfuseService.createTrace (email-summarize)
    │             ├─→ Wire decorators (SpanTracked*) when Langfuse enabled
    │             │
    │             └─→ SummarizeUsecase
    │                  ├─→ SpanTrackedIssueRepository (fetch-issue span)
    │                  │   └─→ RestIssueRepository → bugs.ruby-lang.org API
    │                  │       └─→ Issue (domain model)
    │                  │
    │                  ├─→ AiSummarizeService (llm-call generation)
    │                  │   ├─→ OpenAI API (GPT-5-mini)
    │                  │   └─→ Mustache template
    │                  │
    │                  ├─→ SpanTrackedSummarizePresenter (discord-webhook span)
    │                  │   └─→ DiscordSummarizePresenter → Discord Webhook API
    │                  │
    │                  └─→ LangfuseService.finalizeTrace

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
| Decorator | Cross-cutting concerns | `SpanTrackedIssueRepository` and `SpanTrackedSummarizePresenter` wrap ports with Langfuse span tracing |
| Composition Root | Dependency wiring | `IssueDebounceObject.summarize()` assembles all dependencies and decorators |
| Debounce | Email coalescing | `IssueDebounceObject` merges rapid emails via Durable Object alarm |

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
  render(): Promise<void>;
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
├── durable/                    # Composition Root tests (Durable Object)
├── entity/                     # Domain model tests
├── repository/                 # API client tests (mocked fetch)
├── service/                    # Service tests
├── presenter/                  # Presenter tests (including decorators)
├── usecase/                    # Integration tests
└── config.spec.ts              # Configuration tests
```

**Coverage target**: 90%+
