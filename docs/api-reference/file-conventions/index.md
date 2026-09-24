---
title: "File-system conventions"
---

Special files and directories tiramisu looks for on disk.

Stores are allowed at the Git root and at directories that contain `package.json`. `node_modules` and `.git` are never treated as package stores.

```txt
repo/
├── tiramisu.json
├── .memories/
│   └── staging-db-weekly-reset/
│       └── memory.md
└── apps/
    └── web/
        ├── package.json
        └── .memories/
            └── errors/
                └── axios-reconnect-retry/
                    ├── memory.md
                    └── evidence.json
```

- [`.memories`](./memories.md)
- [`tiramisu.json`](./tiramisu-json.md)
- [`memory.md`](./memory-md.md)
