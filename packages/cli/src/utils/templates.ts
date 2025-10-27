import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch"; // Make sure you have this in your deps

const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// URL of your public GitHub repo that stores component templates
const REMOTE_BASE_URL =
  "https://raw.githubusercontent.com/rohanchaudhary/component-library-setup/main/packages/cli/src/templates";

export async function getTemplate(name: string) {
  try {
    // 1️⃣ Try fetching from remote GitHub repo
    const remoteUrl = `${REMOTE_BASE_URL}/${name}.tsx`;
    const response = await fetch(remoteUrl);

    if (response.ok) {
      const content = await response.text();
      return content;
    }

    console.warn(`⚠️ Remote template not found for: ${name}, trying local fallback...`);
  } catch (err) {
    console.warn(`⚠️ Failed to fetch remote template: ${(err as Error).message}`);
  }

  // 2️⃣ Fallback: try loading from local templates folder
  // const componentPath = path.resolve(__dirname, `../templates/${name}.tsx`);

  // if (fs.existsSync(componentPath)) {
  //   return fs.readFileSync(componentPath, "utf-8");
  // }

  console.error(`❌ Template not found for component: ${name}`);
  return null;
}
