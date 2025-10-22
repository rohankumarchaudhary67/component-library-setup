// packages/cli/src/commands/add.ts

import path from 'path';
import fs from 'fs-extra';
import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';
import {
  getConfig,
  configExists,
  getUiDir,
  getPackageManager,
  getComponentExtension,
} from '../utils/get-config';
import { transformImports } from '../utils/templates';

interface ComponentRegistry {
  name: string;
  type: string;
  files: string[];
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  tailwind?: {
    config?: {
      plugins?: string[];
    };
  };
}

interface Registry {
  [key: string]: ComponentRegistry;
}

const REGISTRY_URL = 'https://ui.your-library.com'; // Your registry URL
const RAW_GITHUB_URL = 'https://raw.githubusercontent.com/your-org/your-repo/main'; // Your GitHub raw URL

export const add = new Command()
  .name('add')
  .description('Add a component to your project')
  .argument('[components...]', 'the components to add')
  .option('-y, --yes', 'skip confirmation prompt')
  .option('-o, --overwrite', 'overwrite existing files')
  .option('-c, --cwd <cwd>', 'the working directory', process.cwd())
  .option('-a, --all', 'add all available components')
  .option('-p, --path <path>', 'the path to add the component to')
  .action(async (components: string[], options) => {
    const cwd = path.resolve(options.cwd);

    // Check if initialized
    if (!(await configExists(cwd))) {
      console.log(chalk.red('\nProject not initialized.'));
      console.log(chalk.yellow('Run: ') + chalk.bold('npx my-ui init\n'));
      process.exit(1);
    }

    const config = await getConfig(cwd);
    if (!config) {
      console.log(chalk.red('\nFailed to load configuration.'));
      process.exit(1);
    }

    const spinner = ora();

    try {
      // Fetch registry
      spinner.start('Fetching component registry...');
      const registry = await fetchRegistry();
      spinner.succeed('Fetched component registry');

      // Get available components
      const availableComponents = Object.keys(registry).filter(
        (name) => registry[name].type === 'components:ui'
      );

      let selectedComponents: string[] = [];

      // Handle --all flag
      if (options.all) {
        selectedComponents = availableComponents;
      } else if (components.length === 0) {
        // Prompt for components
        const { components: selected } = await prompts({
          type: 'multiselect',
          name: 'components',
          message: 'Which components would you like to add?',
          choices: availableComponents.map((name) => ({
            title: name,
            value: name,
            description: registry[name].files.join(', '),
          })),
          hint: '- Space to select. Return to submit',
        });

        if (!selected || selected.length === 0) {
          console.log(chalk.yellow('\nNo components selected.'));
          process.exit(0);
        }

        selectedComponents = selected;
      } else {
        selectedComponents = components;
      }

      // Validate components exist
      const invalidComponents = selectedComponents.filter(
        (name) => !registry[name]
      );

      if (invalidComponents.length > 0) {
        console.log(chalk.red('\nInvalid components:'));
        invalidComponents.forEach((name) => {
          console.log(chalk.red(`  - ${name}`));
        });
        console.log(chalk.yellow('\nAvailable components:'));
        availableComponents.forEach((name) => {
          console.log(chalk.cyan(`  - ${name}`));
        });
        process.exit(1);
      }

      // Collect all dependencies
      const allDependencies = new Set<string>();
      const allDevDependencies = new Set<string>();
      const componentsToInstall = new Set<string>(selectedComponents);

      // Resolve registry dependencies (other components)
      for (const componentName of selectedComponents) {
        const component = registry[componentName];
        if (component.registryDependencies) {
          component.registryDependencies.forEach((dep) =>
            componentsToInstall.add(dep)
          );
        }
      }

      // Collect all dependencies
      for (const componentName of componentsToInstall) {
        const component = registry[componentName];
        component.dependencies?.forEach((dep) => allDependencies.add(dep));
        component.devDependencies?.forEach((dep) => allDevDependencies.add(dep));
      }

      // Confirm installation
      if (!options.yes) {
        console.log(chalk.bold('\nComponents to install:'));
        Array.from(componentsToInstall).forEach((name) => {
          console.log(chalk.cyan(`  - ${name}`));
        });

        if (allDependencies.size > 0) {
          console.log(chalk.bold('\nPackages to install:'));
          Array.from(allDependencies).forEach((dep) => {
            console.log(chalk.cyan(`  - ${dep}`));
          });
        }

        const { confirm } = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: 'Proceed with installation?',
          initial: true,
        });

        if (!confirm) {
          console.log(chalk.yellow('\nInstallation cancelled.'));
          process.exit(0);
        }
      }

      // Install dependencies
      if (allDependencies.size > 0) {
        spinner.start('Installing dependencies...');
        await installPackages(cwd, Array.from(allDependencies), false);
        spinner.succeed('Installed dependencies');
      }

      if (allDevDependencies.size > 0) {
        spinner.start('Installing dev dependencies...');
        await installPackages(cwd, Array.from(allDevDependencies), true);
        spinner.succeed('Installed dev dependencies');
      }

      // Install components
      const results: { name: string; success: boolean; error?: string }[] = [];

      for (const componentName of componentsToInstall) {
        spinner.start(`Installing ${componentName}...`);
        
        try {
          const component = registry[componentName];
          await installComponent(
            cwd,
            component,
            config,
            options.overwrite,
            options.path
          );
          
          results.push({ name: componentName, success: true });
          spinner.succeed(`Installed ${componentName}`);
        } catch (error) {
          results.push({
            name: componentName,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
          spinner.fail(`Failed to install ${componentName}`);
        }
      }

      // Summary
      console.log('');
      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      if (successful.length > 0) {
        console.log(chalk.green('✓ Successfully installed:'));
        successful.forEach((r) => {
          console.log(chalk.green(`  - ${r.name}`));
        });
      }

      if (failed.length > 0) {
        console.log(chalk.red('\n✗ Failed to install:'));
        failed.forEach((r) => {
          console.log(chalk.red(`  - ${r.name}: ${r.error}`));
        });
      }

      console.log(chalk.bold('\n✨ Done!\n'));
      
    } catch (error) {
      spinner.fail('Installation failed');
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

async function fetchRegistry(): Promise<Registry> {
  try {
    const response = await fetch(`${REGISTRY_URL}/registry.json`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch registry: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    // Fallback to GitHub raw if main URL fails
    try {
      const response = await fetch(`${RAW_GITHUB_URL}/registry/registry.json`);
      if (!response.ok) {
        throw error;
      }
      return await response.json();
    } catch {
      throw new Error('Failed to fetch component registry. Please check your internet connection.');
    }
  }
}

async function installComponent(
  cwd: string,
  component: ComponentRegistry,
  config: any,
  overwrite: boolean,
  customPath?: string
) {
  const targetDir = customPath
    ? path.resolve(cwd, customPath)
    : getUiDir(config);

  for (const file of component.files) {
    // Fetch component source
    const sourceCode = await fetchComponentSource(file);
    
    // Transform imports
    const transformedCode = transformImports(sourceCode, config);
    
    // Determine target path
    const fileName = path.basename(file);
    const targetPath = path.join(targetDir, fileName);

    // Check if file exists
    if (await fs.pathExists(targetPath) && !overwrite) {
      const { shouldOverwrite } = await prompts({
        type: 'confirm',
        name: 'shouldOverwrite',
        message: `${fileName} already exists. Overwrite?`,
        initial: false,
      });

      if (!shouldOverwrite) {
        console.log(chalk.yellow(`  Skipped ${fileName}`));
        continue;
      }
    }

    // Write file
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, transformedCode);
  }
}

async function fetchComponentSource(file: string): Promise<string> {
  try {
    // Try main URL first
    const response = await fetch(`${REGISTRY_URL}/components/${file}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${file}: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    // Fallback to GitHub raw
    try {
      const response = await fetch(`${RAW_GITHUB_URL}/packages/components/${file}`);
      if (!response.ok) {
        throw error;
      }
      return await response.text();
    } catch {
      throw new Error(`Failed to fetch component file: ${file}`);
    }
  }
}

async function installPackages(
  cwd: string,
  packages: string[],
  isDev: boolean = false
) {
  const packageManager = await getPackageManager(cwd);

  const commands: Record<string, string[]> = {
    npm: isDev 
      ? ['install', '--save-dev', ...packages]
      : ['install', ...packages],
    pnpm: isDev
      ? ['add', '-D', ...packages]
      : ['add', ...packages],
    yarn: isDev
      ? ['add', '--dev', ...packages]
      : ['add', ...packages],
    bun: isDev
      ? ['add', '-d', ...packages]
      : ['add', ...packages],
  };

  await execa(packageManager, commands[packageManager], {
    cwd,
  });
}