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

## Success Criteria

- Emails from authorized sources containing Ruby Bug Tracker links successfully generate Chinese summaries
- Summary content correctly presents the Issue's core focus, latest discussions, technical details, and current status
- Discord Embed messages include correct colors, emojis, and links

## Non-goals

- Processing emails not from Ruby Core mailing list
- Providing real-time chat or interactive features
- Storing historical summary data
- `/simulate` route is currently a feature placeholder, full simulation functionality not yet implemented

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
| Forward unprocessable emails to admin | |

### Interaction

| Input Assumptions | Output Guarantees |
|-------------------|-------------------|
| Email arrives via Cloudflare Email Routing | Discord Embed formatted summary message |
| Bug Tracker API is available and returns JSON | Error conditions logged to console |
| OpenAI API is available | Email is summarized, forwarded, or rejected |

### Control

| System Controls | System Depends On |
|-----------------|-------------------|
| Email routing decision logic | Cloudflare Workers runtime |
| Summary generation prompt | Discord Webhook API |
| Discord Embed format and colors | Ruby Bug Tracker REST API |
| Session encryption mechanism | OpenAI API |
| | Langfuse (optional, for observability) |

---

## Behaviors

### Email Processing

Routing decisions after email reception:

| Sender Domain | Email Content | Result |
|---------------|---------------|--------|
| In allowed list | Contains Bug Tracker link | `Summarize`: Generate summary |
| In allowed list | No Bug Tracker link | `ForwardAdmin`: Forward to administrator |
| Not in allowed list | Any | `ForwardAdmin`: Forward to administrator |

**Allowed sender domains:**
- `frost.tw`
- `aotoki.me`
- `nue.mailmanlists.eu`
- `ml.ruby-lang.org`

### Summarization

#### Observability

The entire email summarization flow is traced via Langfuse for end-to-end observability:

```
email-summarize (Trace)
├── fetch-issue (Span) — Bug Tracker API call
├── llm-call (Generation) — AI summary generation
└── discord-webhook (Span) — Discord Webhook delivery
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

Traces are exported to Langfuse for monitoring request flow, AI model usage, latency, and costs. When Langfuse credentials are not configured, tracing is silently skipped.

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
- Discord Embed description: max 3000 characters (truncated with notice if exceeded)
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

## Error Scenarios

### Email Processing Errors

| Error Condition | Handling |
|-----------------|----------|
| Email parsing failed | Log error, email not processed |
| Bug Tracker API cannot fetch Issue | Log error, no Discord message sent |
| OpenAI API call failed | Log error, no Discord message sent |
| Discord Webhook send failed | Log HTTP status code and response content |

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
| `/auth/discord` | GET | OAuth | Discord OAuth authentication flow |
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

---

## Terminology

| Term | Definition |
|------|------------|
| Issue | A topic on Ruby Bug Tracker (Feature/Bug/Misc) |
| Journal | A comment or discussion record under an Issue |
| Summarize | The action of converting Issue content to Chinese summary |
| ForwardAdmin | Routing decision to forward email to administrator |
| Presenter | Component responsible for formatting output and sending to external services |

---

## Implementation Standards

See [docs/architecture.md](docs/architecture.md) for Clean Architecture implementation details.
