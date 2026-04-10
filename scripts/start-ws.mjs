import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

if (!existsSync("dist/server.js")) {
  console.error(
    "Missing dist/server.js. Run `npm run build:ws` before `npm run start:ws` or `npm run start:runtime`.",
  );
  process.exit(1);
}

const child = spawn(process.execPath, ["dist/server.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: "production",
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(typeof code === "number" ? code : 0);
});

child.on("error", (error) => {
  console.error("Failed to start production websocket server:", error);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!child.killed) {
      try {
        child.kill(signal);
      } catch {
        process.exit(1);
      }
    }
  });
}
