// packages/cli/src/utils/get-config.ts
import fs from "fs-extra";
import path from "path";

export async function getConfig() {
  const configPath = path.resolve(process.cwd(), "myui.config.json");
  if (!fs.existsSync(configPath)) return null;
  return fs.readJSON(configPath);
}
