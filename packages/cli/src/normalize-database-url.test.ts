import { Client } from "pg";
import { afterEach, expect, it, jest, spyOn } from "bun:test";
import { normalizeDatabaseUrl } from "./normalize-database-url";

const url = "postgresql://user:p%40ss%2Bword@localhost:5432/memories";

afterEach(() => jest.restoreAllMocks());

it.each(["prefer", "require", "verify-ca"])(
  "keeps certificate verification without a driver warning for sslmode=%s",
  (mode) => {
    const warn = spyOn(process, "emitWarning");
    const value = normalizeDatabaseUrl(`${url}?sslmode=${mode}&application_name=tiramisu%20test`);
    expect(new URL(value).searchParams.get("sslmode")).toBe("verify-full");
    // Construct the real driver without connecting, so this checks its TLS parsing too.
    const client = new Client({ connectionString: value });
    // pg exposes an options object here despite declaring this property as boolean.
    expect(client.ssl as unknown).toEqual({});
    expect(client.user).toBe("user");
    expect(client.password).toBe("p@ss+word");
    expect(client.database).toBe("memories");
    expect(new URL(value).searchParams.get("application_name")).toBe("tiramisu test");
    expect(warn).not.toHaveBeenCalled();
  },
);

it.each([
  "",
  "?sslmode=verify-full",
  "?sslmode=disable",
  "?sslmode=no-verify",
  "?sslmode=require&uselibpqcompat=true",
  "?sslmode=verify-ca&uselibpqcompat=true",
])("preserves explicit settings and URLs without legacy SSL modes (%s)", (query) => {
  expect(normalizeDatabaseUrl(url + query)).toBe(url + query);
});

it("matches the driver's last-value behavior for repeated URL options", () => {
  const value = normalizeDatabaseUrl(
    `${url}?sslmode=disable&sslmode=require&uselibpqcompat=true&uselibpqcompat=false`,
  );
  expect(new URL(value).searchParams.getAll("sslmode")).toEqual(["verify-full"]);
  const disabled = `${url}?sslmode=require&sslmode=disable`;
  expect(normalizeDatabaseUrl(disabled)).toBe(disabled);
});
