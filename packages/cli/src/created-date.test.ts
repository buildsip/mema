import { expect, it } from "vitest";
import { coerceCreated, createdMillis, formatCreated, isCreatedDate } from "./created-date";

it("writes the UTC calendar date, not the local day", () => {
  expect(formatCreated(Date.parse("2026-09-21T23:30:00Z"))).toBe("2026-09-21");
  expect(formatCreated(Date.parse("2026-09-21T00:30:00+03:00"))).toBe("2026-09-20");
});

it("rejects impossible calendar dates", () => {
  expect(isCreatedDate("2026-09-19")).toBe(true);
  expect(isCreatedDate("2026-02-31")).toBe(false);
  expect(isCreatedDate("2026-13-01")).toBe(false);
  expect(isCreatedDate("2026-9-19")).toBe(false);
});

it("keeps a YAML Date on the UTC day it represents", () => {
  expect(coerceCreated(new Date(Date.UTC(2025, 3, 1)))).toBe("2025-04-01");
  expect(coerceCreated("2025-04-01")).toBe("2025-04-01");
  expect(coerceCreated(undefined)).toBeUndefined();
});

it("starts unvoted TTL at midnight UTC", () => {
  expect(createdMillis("2025-04-01")).toBe(Date.parse("2025-04-01T00:00:00Z"));
});
