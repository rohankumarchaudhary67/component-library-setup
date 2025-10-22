// packages/cli/src/index.ts
import { Command } from "commander";
import { init } from "./commands/init.js";
import { add } from "./commands/add.js";

const program = new Command();

program
  .name("mycli")
  .description("A simple CLI to add UI components")
  .version("0.1.0");

program.addCommand(init);
program.addCommand(add);

program.parse();
