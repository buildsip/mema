import { deleteMemories } from "./delete-memories";
import { insertMemory } from "./insert-memory";
import { pruneMemories } from "./prune-memories";
import { searchMemories } from "./search-memories";
import { updateMemory } from "./update-memory";
import { upvoteMemories } from "./upvote-memories";

/** One registry supplies the server's schemas and the installer's named auto-approval list. */
export const mcpTools = [
  insertMemory,
  updateMemory,
  searchMemories,
  deleteMemories,
  upvoteMemories,
  pruneMemories,
];
