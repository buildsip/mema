import { z } from "zod";
import { upvote } from "../commands/upvote";
import { inputError, memoryPath } from "./shared-input";
import { tool } from "./tool";

/** Records upvotes for the selected memory directories. */
export const upvoteMemories = tool({
  name: "upvote-memories",
  description:
    "Upvote memories that are useful in producing a reply. Don't upvote a memory just because you read it. Calling `update-memory` already records an upvote with actor `agent`, so you don't need to call `upvote-memories` separately just for that update.",
  schema: z.strictObject(
    {
      paths: z
        .array(memoryPath, { error: "Provide paths as an array of memory directory paths." })
        .min(1, "Provide at least one memory directory path to upvote.")
        .describe(
          "Absolute paths to memory directories. Paths may belong to different repositories.",
        ),
      actor: z
        .enum(["human", "agent"], {
          error:
            "Use actor `human` only when the user asks for an upvote; use `agent` when a memory helped produce a reply.",
        })
        .describe(
          "Use `human` when the user asked to upvote and `agent` when you, the agent, call this tool without the user requesting it.",
        ),
    },
    { error: inputError },
  ),
  run: upvote,
});
