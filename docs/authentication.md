# Authentication

Documentation for the Discord OAuth and session management system.

## Overview

The system uses Discord OAuth 2.0 for authentication and AES-CBC encrypted cookies for session management.

## OAuth Flow

### AuthController

Location: `src/controller/AuthController.ts`

**Endpoint**: `GET /auth/discord`

### OAuth Configuration

```typescript
discordAuth({
  client_id: config.discordClientId,
  client_secret: config.discordClientSecret,
  scope: ['identify', 'guilds.members.read'],
})
```

### Scopes

| Scope | Purpose |
|-------|---------|
| `identify` | Read user basic info (ID, username, global_name) |
| `guilds.members.read` | Read user's guild membership info |

### Flow Steps

```
1. User visits /auth/discord
        │
        ▼
2. Redirect to Discord authorization page
        │
        ▼
3. User authorizes application
        │
        ▼
4. Discord redirects back with authorization code
        │
        ▼
5. Hono OAuth middleware exchanges code for token
        │
        ▼
6. Get user info from context
        │
        ├─→ c.get('user-discord')  // User info
        └─→ c.get('token')         // OAuth token
        │
        ▼
7. Verify user role via DiscordRoleAccessService
        │
        ├─→ No role → 403 Forbidden
        │
        ▼
8. Create encrypted session
        │
        ▼
9. Set HttpOnly cookie
        │
        ▼
10. Redirect to /simulate
```

## Role Verification

### DiscordRoleAccessService

Location: `src/service/DiscordRoleAccessService.ts`

```typescript
export class DiscordRoleAccessService {
  constructor(
    private readonly guildId: string,
    private readonly roleId: string,
  ) {}
  async isAllowed(token?: string, userId?: string): Promise<boolean>
}
```

### Discord API Call

**Endpoint**: `GET https://discord.com/api/v10/users/@me/guilds/{guildId}/member`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Response**:
```json
{
  "roles": ["role_id_1", "role_id_2", ...]
}
```

### Verification Logic

1. Validate token and userId are not empty
2. Call Discord API to get member info
3. Check if `roles` array includes the configured `roleId`
4. Return `true` if role found, `false` otherwise

### Error Cases

| Condition | Result |
|-----------|--------|
| Missing token | `false` |
| Missing userId | `false` |
| API returns 401 | `false` |
| API returns 403 | `false` |
| API returns 404 | `false` (user not in guild) |
| Network error | `false` |
| Role not in list | `false` |

## Session Management

### SessionCipher

Location: `src/service/SessionCipher.ts`

### Session Data Structure

```typescript
type Session = {
  displayName: string;  // User's Discord display name
  expiredAt: number;    // Expiration timestamp (milliseconds)
};
```

### Encryption

**Algorithm**: AES-CBC (256-bit key recommended)

**Process**:
```
Session object (JSON)
    │
    ▼
UTF-8 encode
    │
    ▼
Generate 16-byte random IV
    │
    ▼
AES-CBC encrypt
    │
    ▼
Concatenate IV + ciphertext
    │
    ▼
Base64 encode → Cookie value
```

### Decryption

```
Base64 decode
    │
    ▼
Extract IV (first 16 bytes)
    │
    ▼
AES-CBC decrypt
    │
    ▼
JSON parse
    │
    ▼
Session object (with validation)
```

### Cookie Configuration

```typescript
setCookie(c, SessionCookieName, session, {
  httpOnly: true,   // Prevent JavaScript access
  sameSite: 'Lax',  // CSRF protection
  secure: true,     // HTTPS only
});
```

### Session Constants

Location: `src/constant.ts`

```typescript
export const SessionCookieName = '_rib_session';
export const SessionDurationMs = 24 * 60 * 60 * 1000;  // 24 hours
```

## Protected Routes

### SimulateController

Location: `src/controller/SimulateController.ts`

### Auth Middleware

```typescript
const authMiddleware = createMiddleware(async (c, next) => {
  const sessionCookie = getCookie(c, SessionCookieName);
  if (!sessionCookie) {
    return c.text('Unauthorized', 401);
  }

  const cipher = new SessionCipher(config.secretKeyBase);
  const session = await cipher.decrypt(sessionCookie);
  if (!session) {
    return c.text('Unauthorized', 401);
  }

  c.set('session', session);
  await next();
});
```

### Access Flow

```
Request to /simulate
    │
    ▼
Check _rib_session cookie
    │
    ├─→ Missing → 401 Unauthorized
    │
    ▼
Decrypt with SessionCipher
    │
    ├─→ Failed → 401 Unauthorized
    │
    ▼
Set session in context
    │
    ▼
Execute route handler
```

## Security Considerations

| Aspect | Implementation |
|--------|----------------|
| XSS Prevention | HttpOnly cookie |
| CSRF Prevention | SameSite=Lax |
| Transport Security | Secure cookie flag |
| Session Data | AES-CBC encryption |
| Key Storage | Cloudflare Secrets |

### Potential Improvements

1. Add session expiration check in middleware
2. Consider AES-GCM for authenticated encryption
3. Implement key rotation mechanism
4. Add audit logging for authentication events
