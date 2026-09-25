---
title: Anti-patterns
icon: XCircle
---

# Nesting a memory inside another memory

A nested memory is a `memory.md` sitting inside another memory's folder, like:

```bash
.memories/
└── webpack-error/
    ├── memory.md
    └── compile-error/
        └── memory.md   # ❌ nested memory
```

The outer folder name becomes a search tag on the inner memory. The outer memory cannot be edited until the inner one is moved out, because an edit renames the whole folder and would take the inner memory with it.

Deleting the outer memory is refused unless the inner memory is deleted in the same action.
