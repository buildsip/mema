---
title: "Writing memories"
---

1. **A memory should be short.** Stick to a few paragraphs and one idea per file. If you need additional notes, like screenshots or text, use a parent directory and put them next to `memory.md` as an attachment.
2. **Memories are context, not rules.** Some good examples:

- organization overview: product, business model, teams
- common errors
- glossary
- reasons for why a decision was made, including ADRs, e.g. "Kafka was attempted for notifications in 2025 and reverted because..."
- module → owner mappings
- blockers, e.g. "Enterprise customer launch moved to October because their security review is blocking SSO."
- facts, e.g. "our staging DB resets every Sunday"

Use `AGENTS.md` and skills for rules.

3. **Write the memory when you solve it.** Don't scrape old chats later to "distill" memories.
4. **Keep the narrowest accurate scope.** If a memory provides context only useful for `apps/web`, the agent will automatically create the memory in `apps/web/.memories`.
5. **Directory names act as search tags, so they matter when searching memories.** Use straightforward names, like `errors/`, `gotchas/`, `decisions/`, `architecture/`.
6. **Frontmatter fields act as search tags, so you may create your own custom tags,** e.g. `kind`, `anchors`, Linear URLs, etc.
7. **Prefer a custom `retireWhen` field** when you can name an objective test for making this memory obsolete:

```yaml title="memory.md"
retireWhen: Zero occurrences in Sentry for 60 days
sentry: https://sentry.io/organizations/acme/issues/12345/
```

Defining obsolescence up front turns pruning from a guess into a fast, deterministic check for both agents and humans. Add `retireWhen` to the [schema](../01-getting-started/config.md#custom) if you use it.
