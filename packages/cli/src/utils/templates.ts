// packages/cli/src/utils/templates.ts
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getTemplate(name: string) {
  // Path to your local component registry
  const componentPath = path.resolve(
    __dirname,
    "../../../components/ui",
    `${name}.tsx`
  );

  if (!fs.existsSync(componentPath)) {
    return null;
  }

  // Read the component file content
  return fs.readFileSync(componentPath, "utf-8");
}
