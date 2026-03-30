# Domain Model

The Prisma schema lives in `apps/api/prisma/schema.prisma`.

## Core entities

### User

Tracks account identity, role, subscription tier, and optional API token.

Important relationships:

- owns `Content`
- owns `Highlight`
- owns `Tag`
- owns `Review`
- owns graph data such as `ContentInsight` and `ContentRelation`

### Content

The central record in the system.

Important fields:

- `url`
- `title`
- `contentText`
- `rawHtml`
- `summary`
- `status`
- `sourceType`
- `metadata`
- reading progress fields

Important enums:

- `ContentStatus`: `UNREAD`, `READING`, `READ`, `ARCHIVED`
- `SourceType`: `WEB`, `RSS`, `NEWSLETTER`, `MANUAL`

### Summary

Stores generated summaries per content item.

Important enum:

- `SummaryType`: `QUICK`, `DETAILED`, `BULLET`, `QA`

### Highlight

Stores highlighted text plus note, color, and serialized position data.

### Tag and ContentTag

User-owned tags with a join table for content association.

### Review

Supports spaced repetition with:

- `reviewDate`
- `rating`
- `interval`
- `easeFactor`
- `repetitions`

### ContentInsight

Stores knowledge-graph style analysis for a content item.

Notable fields:

- `topics`
- `keyEntities`
- `sentiments`
- `stance`
- `keyClaims`
- `infoPosition`
- `temporalContext`
- `qualityScore`
- `credibilityScore`
- `embedding`

### ContentRelation

Represents a relation between two content items, including type, strength, and optional directionality.

## Contribution note

If you add or rename enums or Prisma models:

1. update the schema
2. generate the Prisma client
3. verify API type-check
4. update this page if the change affects the public project model

