import { assertNoSymlinks, readTextIfExistsSync } from "@buildsip/file-utils";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NAMES } from "./names";

/** Prepares a replacement or append before prompting, preserving everything outside our markers. */
export async function prepareInstructions({ root, cliRoot }: { root: string; cliRoot: string }) {
  const path = join(root, NAMES.AGENTS_MD);
  await assertNoSymlinks({ path, base: root });
  const previous = readTextIfExistsSync(path);
  const marker = "<!-- tiramisu -->";
  const endMarker = "<!-- /tiramisu -->";
  // The optional slash distinguishes the closing marker from the opening marker.
  const markers = [...(previous ?? "").matchAll(/<!-- (\/?)tiramisu -->/g)];
  const [start, end] = markers;
  // Ambiguous markers cannot safely identify which user text may be replaced.
  if (markers.length > 0 && (markers.length !== 2 || start?.[1] !== "" || end?.[1] !== "/")) {
    throw new Error(
      `Cannot update ${path}: keep exactly one matching pair of ${marker} and ${endMarker} around the Tiramisu instructions, then run init again.`,
    );
  }

  // The template ships with the CLI package, including published installs.
  const template = readFileSync(join(cliRoot, NAMES.TEMPLATES, NAMES.AGENTS_MD), "utf8");
  // Match the existing file’s line endings when appending the complete template.
  const newline = previous?.includes("\r\n") ? "\r\n" : "\n";
  const starter = template.trimEnd().replace(/\r?\n/g, newline);
  const section = `${marker}${newline}${starter}${newline}${endMarker}`;
  if (previous !== undefined && start && end) {
    return {
      path,
      previous,
      exists: true,
      text: `${previous.slice(0, start.index)}${section}${previous.slice(end.index + end[0].length)}`,
    };
  }
  const gap =
    !previous || previous.endsWith(`${newline}${newline}`)
      ? ""
      : previous.endsWith(newline)
        ? newline
        : `${newline}${newline}`;
  return {
    path,
    previous,
    exists: false,
    text: `${previous ?? ""}${gap}${section}${newline}`,
  };
}
