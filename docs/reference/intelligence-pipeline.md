# Intelligence Pipeline

This project contains two related layers of “intelligence” code:

- analysis modules that classify and score content
- output modules that adapt and package information for consumption

## Analysis layer

Relevant files:

- `apps/api/src/modules/analysis/classifier.service.ts`
- `apps/api/src/modules/analysis/significance.scorer.ts`
- `apps/api/src/modules/ai/article-analysis.service.ts`

Responsibilities include:

- identifying content type
- estimating significance
- supporting downstream prioritization

## Output layer

Relevant files:

- `apps/api/src/modules/output/content-aggregator.service.ts`
- `apps/api/src/modules/output/difficulty-adaptor.service.ts`
- `apps/api/src/modules/output/smart-summary.service.ts`
- `apps/api/src/modules/output/knowledge-card.service.ts`
- `apps/api/src/modules/output/insight-report.service.ts`
- `apps/api/src/modules/output/user-profile.service.ts`

These services are intended to support richer delivery patterns such as:

- adaptive summaries
- difficulty-aware transformations
- aggregated multi-content views
- knowledge cards and reports

## Practical contribution guidance

Treat this area as evolving infrastructure rather than a fully stable public API.

When touching it:

- prefer small, well-scoped improvements
- document any new conceptual terminology
- avoid scattering duplicate prompt logic across services
- keep input and output types explicit

## What to document here

Update this page when you change:

- the classification taxonomy
- significance scoring inputs
- adaptive output concepts
- cross-service orchestration between `analysis`, `ai`, and `output`

