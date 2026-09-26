---
title: FAQ
icon: MessageCircleQuestionMark
---

# Why doesn't tiramisu use vector search or reranking?

tiramisu doesn't store every session. It stores short, curated memories that are meant to remain useful over time.

Search is also narrowed by `scope`, so an agent working in one package doesn't have to search memories from unrelated parts of the repo.

That keeps the search space small. BM25 is enough without adding embeddings, vector databases, or reranking.

More advanced search becomes useful when a system stores much larger amounts of noisy data, such as full conversation transcript history. Tiramisu avoids creating that problem in the first place.
