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
│   └── SpanTrackedIssueRepository.ts  # Decorator: adds a tracing span
│
├── service/                    # Business services
│   ├── AiSummarizeService.ts   # AI summary generation
│   ├── DiscordRoleAccessService.ts  # Discord role verification
│   ├── EmailDispatcher.ts      # Email routing logic
│   ├── SessionCipher.ts        # Session encryption
│   └── WebhookForwardService.ts # Webhook forwarding (FailSafe via Promise.allSettled)
│
├── telemetry/                  # Tracing infrastructure
│   ├── Telemetry.ts            # OTel provider, root span, Langfuse export
│   ├── WorkerContextManager.ts # OTel active context over AsyncLocalStorage
│   └── withSpan.ts             # Span lifecycle: attributes, error status, end
│
├── usecase/                    # Business logic
│   ├── interface.ts            # Dependency injection interfaces
│   └── SummarizeUsecase.ts     # Issue summarization orchestration
│
├── presenter/                  # Output formatting
│   ├── DiscordSummarizePresenter.ts   # Discord Embed formatting + delivery
│   └── SpanTrackedSummarizePresenter.ts  # Decorator: adds a tracing span
│
└── prompts/                    # AI prompt templates
    └── summarize.md            # Mustache template for summaries
```

`telemetry/` sits beside the business layers rather than inside `service/`: it carries no domain behaviour, and every layer from the Composition Root down to the repository reaches for it.

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
    │             ├─→ Telemetry.trace (email-summarize root span, flushed on exit)
    │             │
    │             ├─→ Promise.allSettled (parallel execution)
    │             │   ├─→ WebhookForwardService → POST {issue_id} to configured URLs
    │             │   │   └─→ webhook-forward span (host and status; URL is a credential)
    │             │   │
    │             │   └─→ SummarizeUsecase
    │                  ├─→ SpanTrackedIssueRepository (fetch-issue span)
    │                  │   └─→ RestIssueRepository → bugs.ruby-lang.org API
    │                  │       └─→ Issue (domain model)
    │                  │
    │                  ├─→ AiSummarizeService
    │                  │   ├─→ OpenAI API (generation span emitted by the AI SDK)
    │                  │   └─→ Mustache template
    │                  │
    │                  └─→ SpanTrackedSummarizePresenter (discord-webhook span)
    │                      └─→ DiscordSummarizePresenter → Discord Webhook API

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

| Pattern              | Usage                        | Implementation                                                                                       |
| -------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| Dependency Injection | UseCase coordination         | Constructor injection of Repository/Service/Presenter                                                |
| Strategy             | Email routing decisions      | `EmailRoute` union type + switch dispatch                                                            |
| Builder              | Discord message construction | `DiscordSummarizePresenter` assembles the Embed from a `SummarizeResult`                             |
| Factory              | Type conversion              | `RestIssueRepository.mapTrackerToIssueType`                                                          |
| Adapter              | Data mapping                 | `RestIssueRepository.mapIssueResponse`                                                               |
| Decorator            | Cross-cutting concerns       | `SpanTrackedIssueRepository` and `SpanTrackedSummarizePresenter` wrap ports with a tracing span      |
| Null Object          | Optional tracing             | `Telemetry` without credentials samples nothing, so no caller branches on whether tracing is enabled |
| Composition Root     | Dependency wiring            | `IssueDebounceObject.summarize()` assembles all dependencies and decorators                          |
| Debounce             | Email coalescing             | `IssueDebounceObject` merges rapid emails via Durable Object alarm                                   |
| FailSafe             | Webhook forwarding           | `WebhookForwardService` uses `Promise.allSettled` so one failure doesn't affect others               |

## Interface Definitions

All concrete implementations depend on abstractions defined in `usecase/interface.ts`:

```typescript
interface IssueRepository {
	findById(id: number): Promise<Issue | null>;
}

interface SummarizeService {
	execute(issue: Issue): Promise<string>;
}

interface SummarizeResult {
	title: string;
	type: IssueType;
	link: string;
	description: string;
}

interface SummarizePresenter {
	render(result: SummarizeResult): Promise<void>;
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
├── telemetry/                  # Tracing infrastructure tests
├── usecase/                    # Integration tests
├── support/                    # Test helpers (not collected as tests)
├── config.spec.ts              # Configuration tests
└── environment.spec.ts         # Test environment isolation
```

**Coverage target**: 90%+

### Test Environment

Every binding a test sees comes from `vitest.config.mts`. Tests never read `.dev.vars`, so a run behaves identically on a developer machine and in CI, and no production credential is reachable from a test. `environment.spec.ts` holds that promise to its word rather than leaving it to convention.

Langfuse credentials are bound empty, so the suite records no spans and reaches no exporter.

### Substitution Boundaries

`IssueDebounceObject` is the Composition Root and assembles its own dependencies, so its tests substitute at external boundaries rather than injecting:

| Boundary       | Substitute                | Covers                                           |
| -------------- | ------------------------- | ------------------------------------------------ |
| Language model | Mock model from `ai/test` | Summarization                                    |
| HTTP           | `global.fetch`            | Bug Tracker, Discord webhook, forwarded webhooks |

The language model is substituted at the AI SDK's model interface, never at HTTP. Tests hold no knowledge of the provider's endpoints or payload shapes.

### Tracing Assertions

Components that emit spans take a `Tracer`, so a test hands them one backed by an in-memory exporter (`test/support/recordingTracer.ts`) and asserts the spans that resulted. Nothing asserts the OTLP payload or that it reached Langfuse — that is the exporter's contract, not this project's. What the project owns and therefore tests: which spans exist, what they carry, whether a failure is marked, and whether they share one trace.

### Journey Assertions

Composition Root tests assert what the community receives — the Discord embed and its contents — rather than intermediate steps such as the Bug Tracker request.
