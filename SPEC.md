# Ruby Information Bot Specification

## Purpose

Automatically process Ruby Core mailing list emails for the Taiwan Ruby community, generating Traditional Chinese summaries and publishing them to Discord to help community members quickly grasp the latest Ruby developments.

## Users

- **Ruby Taiwan community members**: Receive Traditional Chinese summaries of Ruby mailing list discussions via Discord channel
- **System administrators**: Handle emails that cannot be automatically classified, manage system configuration

## Impacts

- Community members can understand Ruby's latest developments without reading English mailing lists
- Important Ruby Issue discussions are presented in real-time on Discord channels
- Unauthorized emails are automatically forwarded to administrators for handling
- Rapid-fire discussions on the same Issue are consolidated into a single summary, reducing notification noise and improving summary quality
- Issue events can be forwarded to external systems via configured webhooks

## Success Criteria

- Emails from authorized sources containing Ruby Bug Tracker links successfully generate Chinese summaries
- Summary content follows the fixed four-section structure: 📌 Core Focus, 💬 Latest Discussion, 🔍 Technical Details (optional), 📊 Current Status
- Discord Embed messages include correct colors, emojis, and links
- Multiple emails for the same Issue within the debounce window produce only one Discord notification
- Issue events are forwarded to all configured webhook URLs when present

## Non-goals

- Processing emails not from Ruby Core mailing list
- Providing real-time chat or interactive features
- Storing historical summary data
- Full simulation functionality (the `/simulate` route is a placeholder)

---

## System Boundary

### Responsibility

| System Does | System Does Not |
|-------------|-----------------|
| Receive and parse emails | Manage Discord server settings |
| Validate email source legitimacy | Maintain Ruby Bug Tracker data |
| Fetch Issue information from Bug Tracker | Manage OpenAI API quota |
| Generate Traditional Chinese summaries | Handle Discord message interactions |
| Send summaries to Discord Webhook | Store or search historical data |
| Forward unprocessable emails to admin | Persist debounce state beyond processing |
| Debounce rapid emails for the same Issue | |
| Forward issue events to configured webhooks | |

### Interaction

| Input Assumptions | Output Guarantees |
|-------------------|-------------------|
| Email arrives via Cloudflare Email Routing | Discord Embed formatted summary message |
| Bug Tracker API is available and returns JSON | Error conditions logged as structured JSON |
| OpenAI API is available | Email is summarized, forwarded, or rejected |
| | Webhook forwarding attempted for all configured URLs (FailSafe per URL) |

### Control

| System Controls | System Depends On |
|-----------------|-------------------|
| Email routing decision logic | Cloudflare Workers runtime |
| Summary generation prompt | Discord Webhook API |
| Discord Embed format and colors | Ruby Bug Tracker REST API |
| Session encryption mechanism | OpenAI API |
| Debounce delay duration | Cloudflare Durable Objects |
| Webhook forwarding URL list | Langfuse (optional, for observability) |

---

## Behaviors

### Email Processing

Routing decisions after email reception:

| Sender Domain | Email Content | Result |
|---------------|---------------|--------|
| In allowed list | Contains Bug Tracker link | `Summarize`: Generate summary |
| In allowed list | No Bug Tracker link | `ForwardAdmin`: Forward to administrator |
| Not in allowed list | Any | `ForwardAdmin`: Forward to administrator |

**Bug Tracker link extraction:**
- URL pattern: `https://bugs.ruby-lang.org/issues/{id}` (id is numeric)
- Search scope: plain text body of the email
- Multiple links: only the first match is processed
- No plain text body: treated as no Bug Tracker link (routes to ForwardAdmin)

**Email forwarding:**
- Uses Cloudflare Email Routing native forwarding
- Original email is preserved (sender, subject, body, attachments)

**Allowed sender domains:**
- `frost.tw`
- `aotoki.me`
- `nue.mailmanlists.eu`
- `ml.ruby-lang.org`
- Domain matching uses suffix comparison (endsWith), subdomains are accepted

### Debounce

When EmailDispatcher routes an email as `Summarize`, the system defers processing through a Durable Object identified by `issue-{id}` (where `{id}` is the extracted Bug Tracker Issue ID).

**Timer behavior:**

| Event | Action |
|-------|--------|
| First email for an Issue arrives | Create Durable Object, store Issue context, set alarm for debounce delay |
| Subsequent email for same Issue arrives within delay | Reset alarm to full debounce delay from current time |
| Alarm fires (no new email within delay) | Execute Summarize flow, then clear all stored state |
| New email arrives while Summarize flow is in progress | Start a new debounce cycle (set alarm for full delay) |

**Scope:**
- Only `Summarize` route is debounced; `ForwardAdmin` remains immediate
- Default debounce delay: 5 minutes, configurable via `DEBOUNCE_DELAY` environment variable
- After successful summarization, the Durable Object clears its storage (no state persists beyond processing)

**Observability:**

Debounce events are logged as structured JSON for diagnostics (not traced in Langfuse, as debounce occurs before the Summarize flow). All log entries follow the Structured Logging standard defined in the Observability section.

| Event | Level | Required Fields |
|-------|-------|-----------------|
| Email received, entering debounce | info | `issueId`, `durableObjectId` |
| Timer reset by subsequent email | info | `issueId`, `previousRemainingDelay` |
| Alarm fires, starting Summarize flow | info | `issueId`, `emailCount` |
| Webhook forwarding started | info | `issueId`, `urlCount` |
| Webhook forwarding succeeded for URL | info | `issueId`, `url`, `statusCode` |
| Webhook forwarding failed for URL | error | `issueId`, `url`, `error`, `statusCode` |

### Webhook Forwarding

When the debounce alarm fires, the system forwards the issue event to all configured webhook URLs in parallel with — but independent from — the Summarize flow.

| Property | Value |
|----------|-------|
| Trigger | Debounce alarm fires (same timing as Summarize) |
| Relationship to Summarize | Independent; neither blocks nor is blocked by the other |
| Payload | `{"issue_id": <number>}` |
| HTTP Method | POST |
| Content-Type | `application/json` |
| Target | All URLs in `WEBHOOK_FORWARD_URLS` environment variable |
| Multi-URL format | Comma-separated; each URL is trimmed of leading/trailing whitespace; literal commas within a URL must be percent-encoded as `%2C` |
| When not configured | Silently skipped (GracefulDegradation) |
| Error handling | FailSafe — each URL is processed independently; a failure for one URL does not affect others |

### Summarization

#### Issue Type Presentation

Issue type to visual presentation mapping:

| Issue Type | Color | Emoji | Purpose |
|-----------|-------|-------|---------|
| Feature | `#2ecc71` (green) | ✨ | New feature proposals |
| Bug | `#e74c3c` (red) | 🐛 | Bug reports |
| Misc | `#3498db` (blue) | 🔧 | Miscellaneous topics |
| Unknown | `#cc342d` (Ruby red) | 💎 | Uncategorized |

**Summary fixed structure:**
1. 📌 Core Focus (1-2 sentences)
2. 💬 Latest Discussion (2-3 important replies)
3. 🔍 Technical Details (optional, when code is present)
4. 📊 Current Status (progress description)

**Content limits:**
- Summary length: 500-800 characters
- Discord Embed description: max 3000 characters (truncated with `...(內容過長，已截斷)` if exceeded)
- Footer: `由 AI 自動歸納，僅供參考 | 類型: {type}`

### Authentication

Discord OAuth authentication flow:

| Step | Action |
|------|--------|
| 1 | User visits `/auth/discord` |
| 2 | Redirect to Discord authorization page |
| 3 | User authorizes `identify` and `guilds.members.read` permissions |
| 4 | System verifies user has specified role in specified server |
| 5 | Create encrypted Session (AES-CBC) and set HttpOnly Cookie |
| 6 | Redirect to `/simulate` |

**Session specification:**
- Validity: 24 hours
- Encryption: AES-CBC + Base64 encoding
- Cookie attributes: `httpOnly: true`, `secure: true`, `sameSite: Lax`

---

## Observability

### Structured Logging

All log output uses JSON objects passed through `console.log` / `console.error` (natively supported by Cloudflare Workers Logs), enabling automatic field indexing and efficient querying.

**Required fields** (every log entry must include):

| Field | Type | Description |
|-------|------|-------------|
| `level` | string | Log level (`debug`, `info`, `warn`, `error`) |
| `message` | string | Human-readable description of the event |
| `component` | string | Source module name (e.g., `EmailDispatcher`, `SummarizeUsecase`, `IssueDebounceObject`) |

**Optional fields** (include when relevant to the event):

| Field | Type | Description |
|-------|------|-------------|
| `issueId` | number | Ruby Bug Tracker Issue ID |
| `durableObjectId` | string | Durable Object identifier |
| `error` | string | Error message or stack trace |
| `url` | string | Related URL (API endpoint, webhook) |
| `statusCode` | number | HTTP response status code |

**Log level mapping:**

| Level | Usage | console method |
|-------|-------|----------------|
| debug | Development diagnostic information | `console.log` |
| info | Normal business events | `console.log` |
| warn | Expected anomalies | `console.warn` |
| error | Unexpected errors | `console.error` |

**Example:**

```json
{
  "level": "info",
  "message": "Debounce alarm fired, starting summarize flow",
  "component": "IssueDebounceObject",
  "issueId": 12345,
  "emailCount": 3
}
```

### Langfuse Tracing

The entire email summarization flow is traced via Langfuse for end-to-end observability. The trace begins when the Durable Object alarm fires (i.e., after the debounce delay expires), not when the email first arrives:

```
email-summarize (Trace)
├── fetch-issue (Span) — Bug Tracker API call
├── llm-call (Generation) — AI summary generation
├── discord-webhook (Span) — Discord Webhook delivery
└── webhook-forward (Span) — Webhook forwarding to configured URLs
```

| Trace Property | Value |
|----------------|-------|
| Trace name | `email-summarize` |
| Trace tags | `['summarize']` |
| Trace input | `{ issueId }` |
| Trace output | `{ success: true }` or `{ success: false, error }` |

| Child Event | Type | Description |
|-------------|------|-------------|
| `fetch-issue` | Span | Tracks Bug Tracker API latency; records `issueId` as input and whether the issue was found |
| `llm-call` | Generation | Tracks AI model call with prompt, response, token usage, and model ID |
| `discord-webhook` | Span | Tracks Discord Webhook delivery; records success status |
| `webhook-forward` | Span | Tracks webhook forwarding; records per-URL success/failure |

Traces are exported to Langfuse for monitoring request flow, AI model usage, latency, and costs. When Langfuse credentials are not configured, tracing is silently skipped.

### Observability Layering

| Layer | Tool | Responsibility |
|-------|------|----------------|
| Structured Logging | Workers Logs (console) | Global diagnostics, error tracking, debounce events |
| Distributed Tracing | Langfuse | End-to-end summarization flow performance, AI model usage and cost |

---

## Error Scenarios

### Email Processing Errors

| Error Condition | Handling |
|-----------------|----------|
| Email parsing failed | Log structured error, email not processed |
| Bug Tracker API cannot fetch Issue | Log structured error, no Discord message sent (FailSafe) |
| OpenAI API call failed | Log structured error, no Discord message sent (FailSafe) |
| Discord Webhook send failed | Log structured error with HTTP status code and response content |
| Discord Webhook rate limited (429) | Log structured error, no retry |
| Langfuse API call failed | Log structured error, main flow continues uninterrupted (GracefulDegradation) |

### Debounce Errors

| Error Condition | Handling |
|-----------------|----------|
| Durable Object alarm failed to fire | Stored state remains; next email for same Issue retriggers alarm |
| Durable Object storage read/write failed | Log structured error, email not processed (FailSafe) |
| Summarize flow fails after alarm fires | Log structured error, clear stored state to avoid infinite retry |

### Webhook Forwarding Errors

| Error Condition | Handling |
|-----------------|----------|
| `WEBHOOK_FORWARD_URLS` not configured | Silently skipped (GracefulDegradation) |
| Webhook URL unreachable or returns non-2xx | Log structured error with URL and status code, continue with remaining URLs (FailSafe) |
| Webhook request times out | Log structured error, continue with remaining URLs (FailSafe) |

### Authentication Errors

| Error Condition | HTTP Status | Response |
|-----------------|-------------|----------|
| User lacks specified role | 403 | `"You do not have permission to access this resource."` |
| Missing Session Cookie | 401 | `"Unauthorized"` |
| Session decryption failed | 401 | `"Unauthorized"` |
| Session expired | 401 | `"Unauthorized"` |

---

## Interfaces

### REST Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | No | Health check, returns `"Ruby Information Bot"` |
| `/auth/discord` | GET | OAuth | Discord OAuth flow (handles both initiation and callback via Hono discord-auth middleware) |
| `/simulate` | GET | Session | Protected route (feature not implemented) |

### Email Handler

Cloudflare Workers email handler receives emails at `core@ruby.aotoki.cloud`.

### External APIs

| Service | Endpoint | Purpose |
|---------|----------|---------|
| Ruby Bug Tracker | `https://bugs.ruby-lang.org/issues/{id}.json?include=journals` | Fetch Issue details |
| Discord API | `https://discord.com/api/v10/users/@me/guilds/{guildId}/member` | Verify user roles |
| Discord Webhook | Configured Webhook URL | Send summary messages |
| OpenAI API | Via AI SDK | Generate Chinese summaries |
| Langfuse | Via Batch Ingestion API | Trace email processing flow for observability |
| Configured Webhooks | URLs from `WEBHOOK_FORWARD_URLS` | Forward issue event payload on debounce alarm |

---

## Configuration

### Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `ADMIN_EMAIL` | Administrator email for forwarded emails |
| `DISCORD_WEBHOOK` | Discord Webhook URL |
| `DISCORD_CLIENT_ID` | Discord OAuth application ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth application secret |
| `DISCORD_ALLOW_GUILD_ID` | Allowed Discord server ID |
| `DISCORD_ALLOW_ROLE_ID` | Allowed Discord role ID |
| `OPENAI_API_KEY` | OpenAI API key |
| `SECRET_KEY_BASE` | Session encryption key (256-bit recommended) |

### Optional Environment Variables

| Variable | Purpose |
|----------|---------|
| `CF_AI_GATEWAY` | Cloudflare AI Gateway URL (for proxying OpenAI requests) |
| `LANGFUSE_SECRET_KEY` | Langfuse secret key for trace export |
| `LANGFUSE_PUBLIC_KEY` | Langfuse public key for trace export |
| `LANGFUSE_BASE_URL` | Langfuse API endpoint (default: `https://cloud.langfuse.com`) |
| `DEBOUNCE_DELAY` | Debounce delay in seconds for same-Issue emails (default: `300`) |
| `WEBHOOK_FORWARD_URLS` | Comma-separated list of webhook URLs for issue event forwarding |

---

## Terminology

| Term | Definition |
|------|------------|
| Issue | A topic on Ruby Bug Tracker (Feature/Bug/Misc) |
| Journal | A comment or discussion record under an Issue |
| Summarize | The action of converting Issue content to Chinese summary |
| ForwardAdmin | Routing decision to forward email to administrator |
| Presenter | Component responsible for formatting output and sending to external services |
| FailSafe | Service call failure is caught, error is logged, and a safe default (null/false) is returned instead of propagating the exception |
| GracefulDegradation | Optional dependencies (Langfuse, CF AI Gateway) are silently skipped when unavailable, core flow continues unaffected |
| Debounce | Delaying action until a quiet period has passed; resets on each new trigger within the window |
| Durable Object | Cloudflare Workers stateful singleton used to manage per-Issue debounce timer and context |
| Structured Log | A JSON-formatted log entry with standardized fields (`level`, `message`, `component`) output via `console` methods for Cloudflare Workers Logs |
| Webhook Forwarding | Sending a minimal issue event payload (`{"issue_id": <number>}`) to externally configured webhook URLs when a debounce alarm fires |

---

## Implementation Standards

See [docs/architecture.md](docs/architecture.md) for Clean Architecture implementation details.

All logging must follow the Structured Logging standard defined in the Observability section.
