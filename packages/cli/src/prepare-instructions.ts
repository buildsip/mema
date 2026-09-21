import { assertNoSymlinks, readTextIfExistsSync } from "@buildsip/file-utils";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NAMES } from "./names";

/** Prepares an append without changing existing instructions or repeating a customized section. */
export async function prepareInstructions({ root, cliRoot }: { root: string; cliRoot: string }) {
  const path = join(root, NAMES.AGENTS_MD);
  await assertNoSymlinks({ path, base: root });
  const previous = readTextIfExistsSync(path);
  const marker = "<!-- mema:instructions -->";
  // Keep the marker when editing the starter rules so future init runs leave them alone.
  if (previous?.includes(marker)) return undefined;

  const template = readFileSync(join(cliRoot, NAMES.TEMPLATES, NAMES.AGENTS_MD), "utf8");
  // Match the existing file’s line endings when appending the complete template.
  const newline = previous?.includes("\r\n") ? "\r\n" : "\n";
  const starter = template.trimEnd().replace(/\r?\n/g, newline);
  const gap =
    !previous || previous.endsWith(`${newline}${newline}`)
      ? ""
      : previous.endsWith(newline)
        ? newline
        : `${newline}${newline}`;
  return {
    path,
    previous,
    text: `${previous ?? ""}${gap}${marker}${newline}${starter}${newline}<!-- /mema:instructions -->${newline}`,
  };
}
