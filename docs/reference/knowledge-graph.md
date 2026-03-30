# Knowledge Graph

The knowledge graph subsystem answers a product question:

> Where does a piece of content sit in the broader information network?

## Main backend surface

Relevant files:

- `apps/api/src/modules/knowledge-graph/knowledge-graph.controller.ts`
- `apps/api/src/modules/knowledge-graph/knowledge-graph.service.ts`
- `apps/api/src/modules/knowledge-graph/dto.ts`

## Core concepts

### ContentInsight

Per-content analytical state such as:

- topic clusters
- key entities
- sentiment
- stance
- claims
- information position
- quality and credibility scores

### ContentRelation

Pairwise links between content items with:

- relation type
- strength
- explanation
- optional directional semantics

### Position analysis

The system derives a `position` view that describes:

- domain
- depth level
- audience
- information density

### Network role

The graph also exposes a derived role for content, such as whether it behaves more like a source, synthesis, commentary, or a breaking update.

## Frontend graph surface

Main UI files:

- `apps/web/app/knowledge-graph/page.tsx`
- `apps/web/app/knowledge-graph/explore/page.tsx`
- `apps/web/components/knowledge-graph/**`

## Change guidance

When modifying graph behavior:

1. keep API and frontend assumptions aligned
2. update DTOs and types together
3. keep terminology stable across docs and UI
4. document any new relation types or position dimensions here

