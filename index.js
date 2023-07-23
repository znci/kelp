import { consola } from "consola";
import cookieParser from "cookie-parser";
import express from "express";
import fs from "node:fs";

// view engines
import nunjucks from "nunjucks";
import { engine } from "express-handlebars";

// __dirname recreation
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

class KelpException extends Error {
  constructor(message) {
    super(message);
    this.name = "KelpException";
  }
}

class Kelp {
  constructor(app, options = {}) {
    this.info("Starting kelp...");

    this.app = app;
    this.options = options;

    this.loadConfig();
    this.info("Initalized config. Loading routes...");

    this.info(
      `Loading znci/kelp with environment ${this.options.environment.toUpperCase()} (dev enabled: ${
        this.options.environment === "development"
      }).`
    );

    this.loadRoutes().then(() => {
      this.info("Loaded routes. Starting server...");

      this.app.use(express.json());
      this.app.use(express.urlencoded({ extended: true }));
      this.app.use(cookieParser());

      this.app.use(this.options.notFoundHandler);
      this.app.use(this.options.errorHandler);

      this.app.listen(this.options.port, () => {
        this.info(`Server started on port ${this.options.port}`);
      });
    });
  }

  info(message) {
    ((this || {}).options || { environment: "development" }).environment ===
    "development"
      ? consola.info(`KELP: ${message}`)
      : null;
  }

  warn(message) {
    consola.warn(`KELP: ${message}`);
  }

  error(error) {
    consola.error(error);
  }

  loadConfig() {
    const defaultOptions = {
      routesDirectory: __dirname + "/routes",
      publicDirectory: __dirname + "/public",
      viewsDirectory: __dirname + "/views",
      viewEngine: "none",
      notFoundHandler: (req, res) => {
        res.status(404).send("Not found");
        this.options.environment === "development"
          ? this.warn(`404: ${req.method} ${req.path}`)
          : null;
      },
      errorHandler: (error, req, res, next) => {
        res.status(500).send("Internal server error");
        this.error(error);
      },
      port: 3000,
      environment: "development",
    };

    for (const key in defaultOptions) {
      if (this.options[key] === undefined) {
        this.options[key] = defaultOptions[key];
      }
    }

    const requiredTypes = {
      routesDirectory: "string",
      publicDirectory: "string",
      viewsDirectory: "string",
      viewEngine: "string",
      notFoundHandler: "function",
      errorHandler: "function",
      port: "number",
      environment: "string",
    };

    for (const key in requiredTypes) {
      if (typeof this.options[key] !== requiredTypes[key]) {
        this.error(
          new KelpException(
            `Invalid option: ${key}. ${key} must be of type ${requiredTypes[key]}.`
          )
        );
        process.exit(1);
      }
    }

    if (!fs.existsSync(this.options.routesDirectory)) {
      this.error(
        new KelpException(
          `Routes directory does not exist: ${this.options.routesDirectory}`
        )
      );
      process.exit(1);
    }

    if (fs.existsSync(this.options.publicDirectory)) {
      this.app.use(express.static(this.options.publicDirectory));
    } else {
      this.warn(
        "The public directory does not exist. Your static files will not be served. To configure a public directory, use the publicDirectory option."
      );
    }

    if (
      !fs.existsSync(this.options.viewsDirectory) &&
      this.options.viewEngine !== "none"
    ) {
      this.warn(
        "The views directory does not exist but you have a view engine configured. To configure a views directory, use the viewsDirectory option."
      );
    }

    if (
      fs.existsSync(this.options.viewsDirectory) &&
      this.options.viewEngine !== "none"
    ) {
      this.app.set("views", this.options.viewsDirectory);

      switch (this.options.viewEngine) {
        case "ejs":
          this.app.set("view engine", "ejs");
          this.app.set("view options", {
            root: this.options.viewsDirectory,
            views: [this.options.viewsDirectory],
          });
          break;
        case "pug":
          this.app.set("view engine", "pug");
          break;
        case "nunjucks":
          nunjucks.configure(this.options.viewsDirectory, {
            autoescape: true,
            express: this.app,
          });
          break;
        case "handlebars":
          this.app.engine("handlebars", engine());
          this.app.set("view engine", "handlebars");
          break;
        default:
          this.error(
            new KelpException(`Invalid view engine: ${this.options.viewEngine}`)
          );
          process.exit(1);
      }
    }
  }

  async loadRoutes() {
    let routes = [];

    async function snakeDirectory(directory) {
      const files = fs.readdirSync(directory);

      for (const file of files) {
        const path = directory + "/" + file;

        if (fs.statSync(path).isDirectory()) {
          await snakeDirectory(path);
        } else {
          routes.push((await import(path)).default);
        }
      }
    }

    await snakeDirectory(this.options.routesDirectory);

    for (const route in routes) {
      const { method, path, disabled, developmentRoute, handler } =
        routes[route];

      if (
        method === undefined ||
        path === undefined ||
        disabled === undefined ||
        developmentRoute === undefined ||
        handler === undefined
      ) {
        this.error(
          new KelpException(
            `Invalid route: ${route}. All routes must have a method, path, disabled, developmentRoute, and handler.`
          )
        );
        process.exit(1);
      }

      if (!method in ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]) {
        this.error(
          new KelpException(
            `Invalid route: ${route}. Method must be one of the following: GET, HEAD, POST, PUT, PATCH, DELETE.`
          )
        );
        process.exit(1);
      }

      const requiredTypes = {
        method: "string",
        path: "string",
        disabled: "boolean",
        developmentRoute: "boolean",
        handler: "function",
      };

      for (const key in requiredTypes) {
        if (typeof routes[route][key] !== requiredTypes[key]) {
          this.error(
            new KelpException(
              `Invalid route: ${route}. ${key} must be of type ${requiredTypes[key]}.`
            )
          );
          process.exit(1);
        }
      }

      if (
        ((this.options.environment === "development" && developmentRoute) ||
          !developmentRoute) &&
        !disabled
      ) {
        this.app.all(path, (req, res) => {
          if (req.method === method) {
            handler(req, res);
          } else {
            res.status(405).send("Method not allowed");
            this.options.environment === "development"
              ? this.warn(`405: ${req.method} ${req.path}`)
              : null;
          }
        });
        this.info(`Loaded route: ${method} ${path}`);
      } else {
        this.info(`Skipped route: ${method} ${path}`);
      }
    }
  }
}

export default Kelp;
