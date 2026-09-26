## When to create a memory using Tiramisu

Memory = useful context.

**What shouldn't be a memory**:

- Rules for agents - use skills or `AGENTS.md` instead.
- Context obvious from the code.

**Examples of memories**: explaining recurring errors, the reason behind non-obvious decisions, why alternatives to an approach were rejected, etc.

Before calling `insert-memory` and `update-memory` tools, use the `tiramisu-memory-writing` skill.
