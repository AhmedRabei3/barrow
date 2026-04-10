import { spawn } from "node:child_process";

const quoteArg = (value) => {
  if (/^[a-z0-9_./:-]+$/i.test(value)) {
    return value;
  }
  return `"${String(value).replace(/"/g, '\\"')}"`;
};

const shouldEnable = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const processDefinitions = [
  {
    name: "web",
    args: ["run", "start:ws"],
    enabled: true,
  },
  {
    name: "rental-reminders",
    args: ["run", "worker:rental:reminders"],
    enabled: shouldEnable(process.env.ENABLE_RENTAL_REMINDER_WORKER),
  },
  {
    name: "shamcash-incoming",
    args: ["run", "worker:shamcash:incoming"],
    enabled: shouldEnable(process.env.ENABLE_SHAMCASH_INCOMING_WORKER),
  },
  {
    name: "shamcash-payout",
    args: ["run", "worker:shamcash:payout"],
    enabled: shouldEnable(process.env.ENABLE_SHAMCASH_PAYOUT_WORKER),
  },
];

const activeDefinitions = processDefinitions.filter(
  (definition) => definition.enabled,
);

if (activeDefinitions.length === 0) {
  console.error("No runtime processes were enabled.");
  process.exit(1);
}

const children = new Map();
let shuttingDown = false;
let exitCode = 0;

const stopAll = (signal = "SIGTERM") => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children.values()) {
    if (!child.killed) {
      try {
        child.kill(signal);
      } catch {
        // ignore shutdown race
      }
    }
  }
};

const handleChildExit = (name, code, signal) => {
  const normalizedCode = typeof code === "number" ? code : 0;
  if (normalizedCode !== 0) {
    exitCode = normalizedCode;
    console.error(
      `[runtime] ${name} exited with code ${normalizedCode}${signal ? ` (${signal})` : ""}`,
    );
  } else {
    console.log(
      `[runtime] ${name} exited cleanly${signal ? ` (${signal})` : ""}`,
    );
  }

  children.delete(name);

  if (name === "web" || normalizedCode !== 0) {
    stopAll();
  }

  if (children.size === 0) {
    process.exit(exitCode);
  }
};

for (const definition of activeDefinitions) {
  const command = `npm ${definition.args.map(quoteArg).join(" ")}`;
  console.log(`[runtime] starting ${definition.name}: ${command}`);

  const child = spawn(command, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: true,
  });

  children.set(definition.name, child);

  child.on("exit", (code, signal) => {
    handleChildExit(definition.name, code, signal);
  });

  child.on("error", (error) => {
    console.error(`[runtime] failed to start ${definition.name}:`, error);
    exitCode = 1;
    stopAll();
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log(`[runtime] received ${signal}, shutting down`);
    stopAll(signal);
  });
}
