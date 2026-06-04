import { spawn } from "node:child_process";

const FRONTEND_ROOT = new URL("../demo-master/", import.meta.url);
const BACKEND_ROOT = new URL("../demo-master/server/", import.meta.url);

const spawnService = (service) => {
  const child = spawn(service.command, service.args, {
    cwd: service.cwd,
    env: service.env,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${service.name}] ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${service.name}] ${chunk}`);
  });

  return child;
};

let shuttingDown = false;
const children = [];

const shutdown = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }

  process.exit(code);
};

const main = async () => {
  const backend = spawnService({
    name: "backend",
    cwd: BACKEND_ROOT,
    command: "npm",
    args: ["run", "dev"],
    env: {
      ...process.env,
      PORT: "0",
    },
  });

  children.push(backend);

  const backendPort = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timed out waiting for backend port"));
    }, 30000);

    const handleOutput = (chunk) => {
      const match = chunk
        .toString()
        .match(/Server running on http:\/\/localhost:(\d+)/);

      if (match) {
        clearTimeout(timer);
        backend.stdout.off("data", handleOutput);
        backend.stderr.off("data", handleOutput);
        resolve(Number(match[1]));
      }
    };

    backend.stdout.on("data", handleOutput);
    backend.stderr.on("data", handleOutput);

    backend.on("exit", (code, signal) => {
      clearTimeout(timer);
      reject(new Error(`Backend exited with ${signal ?? `code ${code ?? 1}`}`));
    });
  });

  console.log(
    `[launcher] backend API will use http://localhost:${backendPort}/api`,
  );

  const frontend = spawnService({
    name: "frontend",
    cwd: FRONTEND_ROOT,
    command: "npm",
    args: ["run", "dev"],
    env: {
      ...process.env,
      VITE_API_BASE_URL: `http://localhost:${backendPort}/api`,
    },
  });

  children.push(frontend);

  frontend.on("exit", (code, signal) => {
    if (shuttingDown) return;

    const exitCode = code ?? (signal ? 1 : 0);
    console.error(`[frontend] exited with ${signal ?? `code ${exitCode}`}`);
    shutdown(exitCode);
  });
};

main().catch((error) => {
  console.error("[launcher] failed to start services:", error);
  shutdown(1);
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
