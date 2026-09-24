import * as agents from "add-mcp";
import { detectGlobalAgents, upsertServer } from "add-mcp";
import { beforeEach, describe, expect, it, jest, spyOn } from "bun:test";
import { installMcp } from "./install-mcp";

const detect = spyOn(agents, "detectGlobalAgents");
const upsert = spyOn(agents, "upsertServer");
const ctx = { log: { warn: jest.fn() } };

beforeEach(() => {
  jest.resetAllMocks();
  detect.mockResolvedValue(["cursor", "claude-code"]);
  upsert.mockReturnValue({ success: true, path: "/config" });
});

describe("installMcp", () => {
  it("refreshes every detected agent on every call with named approvals and global scope", async () => {
    expect(await installMcp(ctx)).toEqual(["Cursor", "Claude Code"]);
    expect(await installMcp(ctx)).toEqual(["Cursor", "Claude Code"]);
    expect(detectGlobalAgents).toHaveBeenCalledTimes(2);
    expect(upsertServer).toHaveBeenCalledTimes(4);
    for (const agent of ["cursor", "claude-code"]) {
      expect(upsertServer).toHaveBeenCalledWith(
        agent,
        "tiramisu",
        {
          command: "tiramisu",
          args: ["mcp"],
          autoApproveTools: [
            "insert-memory",
            "update-memory",
            "search-memories",
            "delete-memories",
            "upvote-memories",
            "prune-memories",
          ],
        },
        { local: false },
      );
    }
    expect(ctx.log.warn).not.toHaveBeenCalled();
  });

  it("warns with manual setup instructions when no agents are detected", async () => {
    detect.mockResolvedValue([]);
    expect(await installMcp(ctx)).toEqual([]);
    expect(upsertServer).not.toHaveBeenCalled();
    expect(ctx.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("api-reference/mcp/installation.md"),
    );
    expect(ctx.log.warn).toHaveBeenCalledWith(expect.stringContaining('arguments ["mcp"]'));
  });

  it("continues after a failed agent config", async () => {
    upsert.mockReturnValueOnce({
      success: false,
      path: "/cursor/mcp.json",
      error: "Permission denied",
    });
    expect(await installMcp(ctx)).toEqual(["Claude Code"]);
    expect(upsertServer).toHaveBeenCalledTimes(2);
    expect(ctx.log.warn).toHaveBeenCalledWith(expect.stringContaining("Permission denied"));
    expect(ctx.log.warn).toHaveBeenCalledWith(expect.stringContaining("Fix this agent's config"));
  });

  it("continues if an adapter throws and tolerates detection failure", async () => {
    upsert.mockImplementationOnce(() => {
      throw new Error("adapter failed");
    });
    expect(await installMcp(ctx)).toEqual(["Claude Code"]);
    expect(upsertServer).toHaveBeenCalledTimes(2);
    detect.mockRejectedValueOnce(new Error("detection failed"));
    await expect(installMcp(ctx)).resolves.toEqual([]);
    expect(ctx.log.warn).toHaveBeenCalledWith(expect.stringContaining("detection failed"));
  });
});
