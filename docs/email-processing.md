# Email Processing

Detailed documentation for the email handling flow.

## Email Reception

Emails are received at `core@ruby.aotoki.cloud` via Cloudflare Email Routing, configured in `wrangler.jsonc`.

## EmailDispatcher

Location: `src/service/EmailDispatcher.ts`

### Dispatch Types

```typescript
enum EmailDispatchType {
  Summarize = 'summarize',
  ForwardAdmin = 'forward_admin',
  Reject = 'reject',
}
```

### Routing Flow

```
Email Received
    │
    ▼
Parse with Postal MIME
    │
    ▼
Validate Sender Domain
    │
    ├─ Not in allowed list → ForwardAdmin
    │
    ▼
Extract Issue ID from Body
    │
    ├─ No Issue link found → ForwardAdmin
    │
    ▼
Summarize Route
    └─ params: { issueId: number }
```

### Allowed Sender Domains

```typescript
private readonly ALLOWED_ORIGINS = [
  'frost.tw',
  'aotoki.me',
  'nue.mailmanlists.eu',
  'ml.ruby-lang.org',
];
```

Domain validation uses `endsWith()`, so subdomains are also accepted (e.g., `sub.frost.tw`).

### Issue Link Extraction

Uses regex pattern to find Ruby Bug Tracker links:

```typescript
const ISSUE_LINK_PATTERN = /https:\/\/bugs\.ruby-lang\.org\/issues\/(\d+)/;
```

If multiple links exist, the first match is used.

## Post-Routing Handlers

### Summarize Handler

1. Create `RestIssueRepository` to fetch Issue data
2. Create `AiSummarizeService` with GPT-5-mini model
3. Create `DiscordSummarizePresenter` for formatting
4. Execute `SummarizeUsecase`
5. Call `presenter.render(discordWebhook)`

### ForwardAdmin Handler

```typescript
await message.forward(route.params.adminEmail);
```

Forwards the original email to the configured `ADMIN_EMAIL`.

### Reject Handler

```typescript
message.setReject(route.text);
```

Rejects the email with a message. Currently not used in the routing logic.

## Error Handling

| Stage | Error | Handling |
|-------|-------|----------|
| Postal MIME parsing | Exception | Email not processed |
| Sender validation | Unauthorized domain | ForwardAdmin |
| Issue link extraction | No link found | ForwardAdmin |
| Issue fetch | API error or 404 | Log error, return null |
| AI summarization | OpenAI API error | Exception caught, logged |
| Discord send | Webhook error | Log status and response |

Errors during summarization do not cause the email to be forwarded or rejected - they are simply logged.
