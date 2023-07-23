#!/usr/bin/env node

import fs from "node:fs";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { consola } from "consola";

const argv = yargs(hideBin(process.argv)).argv;

const validCommands = ["generate"];

if (argv._.length === 0) {
  consola.info(
    `A command is required. Valid commands are: ${validCommands.join(", ")}`
  );
  process.exit(1);
}

const command = argv._[0];

if (!validCommands.includes(command)) {
  consola.info(
    `Invalid command. Valid commands are: ${validCommands.join(", ")}`
  );
  process.exit(1);
}

if (command === "generate") {
  const routesDirectory = argv["custom-routes-directory"] || "routes";

  const path = await consola.prompt(
    "What is the path of the route to generate? (preceding slash and routes directory will be added automatically)"
  );
  const method = await consola.prompt(
    "What is the method of the route to generate?"
  );

  const routeTemplate = `export default {
  method: "${method}",
  path: "${path}",

  handler: async (req, res) => {
    res.send("Hello World!");
  }
}`;

  const routePath = `${routesDirectory}/${path}`;

  const subdirectoriesInRoutePathArray = routePath
    .split("/")
    .slice(0, -1)
    .join("/");

  try {
    if (fs.existsSync(`${routePath}.js`)) {
      consola.error(`Route already exists at ${routePath}.js`);
      process.exit(1);
    }

    consola.info(`Generating route at ${routePath}.js`);

    fs.mkdirSync(subdirectoriesInRoutePathArray, { recursive: true });
    fs.writeFileSync(`${routePath}.js`, routeTemplate);

    consola.success(`Route generated at ${routePath}.js`);
  } catch (error) {
    consola.error(error);
  }
}
