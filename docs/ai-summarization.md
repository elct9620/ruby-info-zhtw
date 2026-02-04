# AI Summarization

Documentation for the AI-powered summary generation system.

## Overview

The system uses OpenAI's GPT-5-mini model via the Vercel AI SDK to generate Traditional Chinese summaries of Ruby Issue discussions.

## Components

### AiSummarizeService

Location: `src/service/AiSummarizeService.ts`

```typescript
export class AiSummarizeService implements SummarizeService {
  constructor(private readonly llmModel: LanguageModel) {}
  async execute(issue: Issue): Promise<string>
}
```

### Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| Model | `gpt-5-mini` | OpenAI lightweight model |
| Temperature | `1` | Balanced creativity |
| Framework | Vercel AI SDK | Unified AI calling interface |
| Gateway | Optional | Cloudflare AI Gateway proxy |

## Prompt Template

Location: `src/prompts/summarize.md`

Uses Mustache template engine for dynamic data injection.

### Template Variables

```typescript
{
  subject: string,          // Issue title
  type: string,             // Feature/Bug/Misc
  description: string,      // Issue description
  authorName: string,       // Issue author
  assigneeName: string | null,  // Assignee (optional)
  latestJournal: {          // Most recent comment
    userName: string,
    notes: string,
  } | null,
  journals: Array<{         // All comments
    userName: string,
    notes: string,
  }>,
}
```

### Prompt Structure

1. **Role Definition**: Ruby community technical information specialist
2. **Summary Principles**:
   - Language: Traditional Chinese (Taiwan terminology)
   - Length: 500-800 characters
   - Accuracy: Only summarize, never add information
   - Technical handling: Preserve English terms, explain complex concepts
   - Format: Discord Embed compatible

3. **Output Structure**:
   - 📌 Core Focus
   - 💬 Latest Discussion
   - 🔍 Technical Details (optional)
   - 📊 Current Status

4. **Type-Specific Guidelines**:
   - Feature: Focus on proposal value, community feedback, examples
   - Bug: Problem description, reproduction steps, impact, solutions
   - Misc: Agenda items, decisions, action items

## Issue Data Source

### RestIssueRepository

Location: `src/repository/RestIssueRepository.ts`

**API Endpoint**: `https://bugs.ruby-lang.org/issues/{id}.json?include=journals`

### Issue Entity

Location: `src/entity/Issue.ts`

```typescript
export enum IssueType {
  Feature = 'Feature',
  Bug = 'Bug',
  Misc = 'Misc',
  Unknown = 'Unknown',
}

export class Issue {
  id: number
  subject: string
  type: IssueType
  description: string
  authorName: string
  assigneeName: string | null
  link: string
  journals: Journal[]
}
```

### Tracker to Type Mapping

| Tracker Name | IssueType |
|--------------|-----------|
| `feature` | Feature |
| `bug` | Bug |
| `misc` | Misc |
| Other | Unknown |

## Output Formatting

### DiscordSummarizePresenter

Location: `src/presenter/DiscordSummarizePresenter.ts`

Implements builder pattern for constructing Discord Embed messages.

### Discord Embed Structure

```json
{
  "embeds": [{
    "title": "{emoji} {subject}",
    "description": "{ai_summary}",
    "color": 0x2ecc71,
    "url": "https://bugs.ruby-lang.org/issues/{id}",
    "footer": {
      "text": "由 AI 自動歸納，僅供參考 | 類型: {type}"
    },
    "timestamp": "2025-02-04T..."
  }]
}
```

### Content Truncation

If the AI-generated summary exceeds 3000 characters:

```typescript
description: this.description.length > 3000
  ? this.description.substring(0, 3000) + '...(內容過長，已截斷)'
  : this.description
```

## Error Handling

| Error | Handling |
|-------|----------|
| Issue not found | `SummarizeUsecase` throws error |
| AI generation failed | Exception propagated to caller |
| Invalid issue data | `Issue.isValid()` returns false |
| Journal validation | Invalid journals are skipped |
