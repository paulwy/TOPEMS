import { watch } from "fs";
import { exec } from "child_process";
import { resolve } from "path";

const srcDir = resolve("./src");
let isBuilding = false;
let pendingBuild = false;

function runBuild() {
  if (isBuilding) {
    pendingBuild = true;
    return;
  }
  isBuilding = true;
  pendingBuild = false;
  console.log("[watch] Starting build...");
  const buildProcess = exec("pnpm build", { cwd: resolve("./") });
  buildProcess.stdout?.on("data", (data) => console.log(data.toString().trim()));
  buildProcess.stderr?.on("data", (data) => console.error(data.toString().trim()));
  buildProcess.on("close", (code) => {
    isBuilding = false;
    if (code === 0) console.log("[watch] Build completed");
    else console.log("[watch] Build failed with code", code);
    if (pendingBuild) setTimeout(runBuild, 500);
  });
}

console.log("[watch] Watching for changes in", srcDir);
const watcher = watch(srcDir, { recursive: true }, (eventType, filename) => {
  if (!filename) return;
  const ext = filename.split(".").pop();
  if (["ts", "tsx", "js", "jsx", "css", "json"].includes(ext)) {
    console.log("[watch] Changed:", filename);
    setTimeout(() => { if (!isBuilding && !pendingBuild) runBuild(); }, 500);
  }
});

process.on("SIGINT", () => {
  watcher.close();
  process.exit(0);
});

runBuild();
