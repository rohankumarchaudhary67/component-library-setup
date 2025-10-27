// packages/cli/src/commands/add.ts
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { Command } from "commander";
import { execa } from "execa";
import ora from "ora";
import { getTemplate } from "../utils/templates.js";

export const add = new Command()
  .name("add")
  .argument("<component>", "component name to add")
  .description("Add a UI component to your project")
  .action(async (componentName) => {
    const spinner = ora(`Adding ${componentName}...`).start();

    const template = getTemplate(componentName);
    if (!template) {
      spinner.fail(chalk.red(`No template found for component: ${componentName}`));
      process.exit(1);
    }

    // Write to the project's components/ui folder
    const outDir = path.resolve(process.cwd(), "components/ui");
    await fs.ensureDir(outDir);
    const outFile = path.join(outDir, `${componentName}.tsx`);
    await fs.writeFile(outFile, template);

    // Define dependencies for each component
    const deps: Record<string, string[]> = {
      button: [
        "@radix-ui/react-slot",
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
      ],
    };

    if (deps[componentName]) {
      spinner.text = "Installing dependencies...";
      await execa("npm", ["install", ...deps[componentName]]);
    }

    spinner.succeed(chalk.green(`✅ ${componentName} component added successfully!`));
  });
