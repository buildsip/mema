import { z } from "zod";
import { deleteMemories as deleteMemoryDirs } from "../commands/delete-memories";
import { inputError, memoryPath } from "./shared-input";
import { tool } from "./tool";

/** Deletes the selected memory directories. */
export const deleteMemories = tool({
  name: "delete-memories",
  description:
    "Delete selected memories and their attachments. Deleting a folder also removes its attachments. Nested memories must be explicitly selected. A memory with `doNotDelete: true` blocks the entire batch, so ask the user to delete such memories.",
  schema: z.strictObject(
    {
      paths: z
        .array(memoryPath, {
          error: "Provide paths as an array of memory directory paths.",
        })
        .min(1, "Provide at least one memory directory path to delete.")
        .describe(
          "Absolute paths to memory directories to delete, including any nested memories. Paths may belong to different repositories.",
        ),
    },
    { error: inputError },
  ),
  run: deleteMemoryDirs,
  destructive: true,
});
