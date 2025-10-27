// packages/cli/src/utils/templates.ts
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getTemplate(name: string) {
  const componentPath = path.resolve(__dirname, `../templates/${name}.tsx`);

  if (!fs.existsSync(componentPath)) {
    return null;
  }

  return fs.readFileSync(componentPath, "utf-8");
}
