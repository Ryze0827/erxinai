# Agent Knowledge Wiki Index

This directory is the lightweight navigation layer for `repo-memory`.
The source of truth lives in sibling files under `docs/agent-knowledge/`.

## Ingest Query Lint

- Ingest: update source layers and raw evidence first; the wiki stays intentionally thin.
- Query: read this index first, jump to the most relevant source layer or evidence index, and only then expand outward when the answer still needs more evidence.
- Lint: verify that linked source layers and generated graph artifacts still match the current structure.

## Source Layers

- [Raw Evidence Index](../raws/index.md) - Low-processed evidence such as logs, command output, snippets, and review excerpts.
- [Project Profile](../project-profile.md) - Repository shape, stack, boundaries, and primary maintenance surfaces.
- [Engineering Constraints](../engineering-constraints.md) - Hard constraints, red lines, exceptions, and verification requirements.
- [Learning Journal](../learning-journal.md) - Distilled observations that have not yet been promoted into long-term rules.
- [Error Patterns](../error-patterns.md) - Repeated mistakes, wrong assumptions, and prevention notes.
- [Public Recall Candidates](../public-recall-candidates.md) - Cross-project candidates staged before shared recall promotion.

## Shared Recall

- Use the skill's `references/shared-recall/index.md` when you need curated cross-repository recall. It is maintained with the skill, not copied into each target repository.

## Views

- [Knowledge Graph](./knowledge-graph.md) - Mermaid view of source layers and recall connections for fast visual inspection.

## Query Heuristics

- Start with the source layer that matches the question shape instead of scanning every file.
- Prefer source layers for proof, raw evidence for traceability, and shared recall for cross-repository hints.
- The wiki is a navigation surface, not a second source-of-truth corpus.
