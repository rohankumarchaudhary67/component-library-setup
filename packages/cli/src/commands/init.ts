// packages/cli/src/commands/init.ts
import path from 'path';
import fs from 'fs-extra';
import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';

export const init = new Command()
  .name('init')
  .description('Initialize your project for components')
  .action(async () => {
    console.log(chalk.bold('\nWelcome to my-ui setup!\n'));

    // 1. Prompt user for configuration
    const config = await prompts([
      {
        type: 'select',
        name: 'style',
        message: 'Which style would you like to use?',
        choices: [
          { title: 'Default', value: 'default' },
          { title: 'New York', value: 'new-york' },
        ],
      },
      {
        type: 'select',
        name: 'tailwindBaseColor',
        message: 'Which color would you like to use as base color?',
        choices: [
          { title: 'Slate', value: 'slate' },
          { title: 'Gray', value: 'gray' },
          { title: 'Zinc', value: 'zinc' },
          { title: 'Neutral', value: 'neutral' },
          { title: 'Stone', value: 'stone' },
        ],
      },
      {
        type: 'text',
        name: 'componentsPath',
        message: 'Where would you like to place your components?',
        initial: './src/components',
      },
      {
        type: 'confirm',
        name: 'useTypeScript',
        message: 'Would you like to use TypeScript?',
        initial: true,
      },
    ]);

    // 2. Create components.json config file
    const configFile = {
      $schema: 'https://ui.your-library.com/schema.json',
      style: config.style,
      tailwind: {
        config: 'tailwind.config.js',
        css: 'src/app/globals.css',
        baseColor: config.tailwindBaseColor,
        cssVariables: true,
      },
      aliases: {
        components: config.componentsPath,
        utils: path.join(config.componentsPath, 'lib/utils'),
        ui: path.join(config.componentsPath, 'ui'),
      },
      typescript: config.useTypeScript,
    };

    const configPath = path.resolve(process.cwd(), 'components.json');
    await fs.writeJSON(configPath, configFile, { spaces: 2 });

    console.log(chalk.green('\n✓ Configuration saved to components.json'));

    // 3. Create necessary directories
    const dirs = [
      config.componentsPath,
      path.join(config.componentsPath, 'ui'),
      path.join(config.componentsPath, 'lib'),
    ];

    for (const dir of dirs) {
      await fs.ensureDir(path.resolve(process.cwd(), dir));
    }

    // 4. Create utils file
    const utilsPath = path.resolve(
      process.cwd(),
      config.componentsPath,
      'lib/utils.ts'
    );

    const utilsContent = `import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}`;

    await fs.writeFile(utilsPath, utilsContent);

    // 5. Update tailwind.config
    await updateTailwindConfig(configFile);

    // 6. Install dependencies
    console.log(chalk.blue('\nInstalling dependencies...'));
    const { execa } = await import('execa');
    
    const deps = [
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'tailwindcss-animate',
    ];

    await execa('npm', ['install', ...deps]);

    console.log(chalk.green('\n✓ Setup complete!'));
    console.log(chalk.blue('\nNext steps:'));
    console.log('  1. Run: npx my-ui add button');
    console.log('  2. Start using components in your app\n');
  });

async function updateTailwindConfig(config: any) {
  const tailwindPath = path.resolve(process.cwd(), 'tailwind.config.js');
  
  if (!fs.existsSync(tailwindPath)) {
    console.log(chalk.yellow('⚠ tailwind.config.js not found, skipping...'));
    return;
  }

  // Add content paths and plugins
  const contentPath = `"${config.aliases.components}/**/*.{ts,tsx}"`;
  
  console.log(chalk.blue('\nPlease add the following to your tailwind.config.js:'));
  console.log(chalk.gray('\ncontent: ['));
  console.log(chalk.gray(`  ${contentPath},`));
  console.log(chalk.gray('  // ... your other paths'));
  console.log(chalk.gray('],'));
  console.log(chalk.gray('plugins: [require("tailwindcss-animate")],\n'));
}