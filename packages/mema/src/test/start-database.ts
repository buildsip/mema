import { createServer } from "node:net";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import { Client } from "pg";

/** Starts an isolated local PostgreSQL server for integration tests. */
export async function startDatabase(directory: string) {
  // Let the OS choose a local port so this suite can run alongside other PostgreSQL instances.
  const listener = createServer();
  await new Promise<void>((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const address = listener.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP test port.");
  const port = address.port;
  await new Promise<void>((resolve, reject) =>
    listener.close((error) => (error ? reject(error) : resolve())),
  );
  const server = new EmbeddedPostgres({
    databaseDir: join(directory, "data"),
    user: "postgres",
    password: "test-only",
    port,
    persistent: false,
    postgresFlags: [
      "-c",
      "listen_addresses=127.0.0.1",
      "-c",
      `unix_socket_directories=${directory}`,
    ],
    onLog: () => {},
    onError: () => {},
  });
  await server.initialise();
  await server.start();
  const url = `postgresql://postgres:test-only@127.0.0.1:${port}/postgres`;
  const client = new Client({ connectionString: url });
  await client.connect();
  return {
    client,
    url,
    close: async () => {
      await client.end();
      await server.stop();
    },
  };
}
