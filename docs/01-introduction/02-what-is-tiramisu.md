---
title: What is Tiramisu
description: Introducing Tiramisu, a git-native agent memory system.
icon: CircleQuestionMark
---

**Tiramisu is a git-native memory system for AI coding agents.**

Tiramisu provides a set of MCP tools that store **curated context** as **Markdown** files inside your repositories. Tiramisu keeps agent knowledge atomic, version-controlled, and reviewable in pull requests.

## Philosophy

### Knowledge about code must generally have the same lifecycle as the code it describes

Memories are committed directly to the same Git branch as the related code. They are committed alongside the code, reviewed in the same PR, and reverted if the code is reverted.

Decoupled memory storage (external databases or detached background PRs) breaks git atomicity. If a feature branch is abandoned or rolled back, its memory must not linger on `main` to poison future agent runs.

### Clean docs, no transcript hoarding

Store things that matter, like architectural decisions or library quirks.

**Why**: Before AI, engineers never recorded every Google search or 1-on-1 brainstorm meeting. Hoarding long chat transcripts is lazy architecture that leads to massive context pollution and hallucinations, and burns thousands of dollars on useless tokens.

### Allergy to context pollution

The best way to break an AI agent is to give it too much irrelevant context.

**Why**: LLMs suffer from attention dispersion. An agent editing `packages/billing` doesn't need context only relevant to `apps/mobile`.

### Write once, inherit everywhere

**Why**: A developer shouldn't copy-paste their team's guidelines in every single repo.
