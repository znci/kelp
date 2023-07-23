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

export default async function kelpify(app, options = {}) {
  const kelp = {
    app: app,
    options: options,

    info(message) {
      ((this || {}).options || { environment: "development" }).environment ===
      "development"
        ? consola.info(`KELP: ${message}`)
        : null;
    },

    warn(message) {
      consola.warn(`KELP: ${message}`);
    },

    error(error) {
      consola.error(error);
    },

    registerMiddlewareAtCheckpoint(checkpoint) {
      this.options.middlewareCheckpoints[checkpoint]
        ? this.app.use(this.options.middlewareCheckpoints[checkpoint])
        : null;
    },

    loadOptions() {
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
        methodNotAllowedHandler: (req, res) => {
          res.status(405).send("Method not allowed");
        },
        middlewareCheckpoints: {
          beforeRouteLoad: null,
          afterRouteLoad: null,
          beforeBuiltinMiddlewareRegister: null,
          afterBuiltinMiddlewareRegister: null,
          before404Register: null,
          after404Register: null,
          beforeErrorRegister: null,
          afterErrorRegister: null,
          beforeServe: null,
          afterServe: null,
        },
        port: 3000,
        environment: "development",
        autostart: true,
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
        methodNotAllowedHandler: "function",
        middlewareCheckpoints: "object",
        port: "number",
        environment: "string",
        autostart: "boolean",
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
              new KelpException(
                `Invalid view engine: ${this.options.viewEngine}`
              )
            );
            process.exit(1);
        }
        for (const checkpoint in this.options.middlewareCheckpoints) {
          if (
            this.options.middlewareCheckpoints[checkpoint] !== null &&
            typeof this.options.middlewareCheckpoints[checkpoint] !== "function"
          ) {
            this.error(
              new KelpException(
                `Invalid middleware checkpoint: ${checkpoint}. ${checkpoint} must be a function.`
              )
            );
            process.exit(1);
          }
        }
      }
    },

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
        const {
          method,
          path,
          disabled,
          developmentRoute,
          routeMiddleware,
          handler,
        } = routes[route];

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

        if (
          ![
            "GET",
            "HEAD",
            "POST",
            "PUT",
            "DELETE",
            "CONNECT",
            "OPTIONS",
            "TRACE",
            "PATCH",
          ].includes(method)
        ) {
          this.error(
            new KelpException(
              `Invalid route: ${route}. Method must be one of the following: GET, HEAD, POST, PUT, DELETE, CONNECT, OPTIONS, TRACE, PATCH.`
            )
          );
          process.exit(1);
        }

        const requiredTypes = {
          method: "string",
          path: "string",
          disabled: "boolean",
          developmentRoute: "boolean",
          // routeMiddleware: "function",         this is omitted from the check because it is optional. a check for this will come in a later release
          handler: "function",
        };

        for (const key in requiredTypes) {
          if (
            typeof routes[route][key] !== requiredTypes[key] &&
            key !== "routeMiddleware"
          ) {
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
          const routeHandler = (req, res) => {
            if (req.method === method) {
              handler(req, res);
            } else {
              this.options.methodNotAllowedHandler(req, res);

              this.options.environment === "development"
                ? this.warn(
                    `405: ${req.method} ${req.path} (expected ${method})`
                  )
                : null;
            }
          };

          routeMiddleware
            ? this.app.all(path, routeMiddleware, (req, res) =>
                routeHandler(req, res)
              )
            : this.app.all(path, (req, res) => routeHandler(req, res));

          this.info(`Loaded route: ${method} ${path}`);
        } else {
          this.info(`Skipped route: ${method} ${path}`);
        }
      }
    },

    start() {
      this.app.listen(this.options.port, () => {
        this.info(`Server started on port ${this.options.port}`);
      });
    },
  };

  kelp.info("Starting kelp...");

  kelp.loadOptions();

  kelp.info("Initalized options. Loading routes...");

  kelp.info(
    `Loading znci/kelp with environment ${kelp.options.environment.toUpperCase()} (dev enabled: ${
      kelp.options.environment === "development"
    }).`
  );

  kelp.registerMiddlewareAtCheckpoint("beforeRouteLoad");

  await kelp.loadRoutes();

  kelp.registerMiddlewareAtCheckpoint("afterRouteLoad");
  kelp.registerMiddlewareAtCheckpoint("beforeBuiltinMiddlewareRegister");

  kelp.info("Loaded routes. Starting server...");

  kelp.app.use(express.json());
  kelp.app.use(express.urlencoded({ extended: true }));
  kelp.app.use(cookieParser());

  kelp.registerMiddlewareAtCheckpoint("afterBuiltinMiddlewareRegister");
  kelp.registerMiddlewareAtCheckpoint("before404Register");

  kelp.app.use(kelp.options.notFoundHandler);

  kelp.registerMiddlewareAtCheckpoint("after404Register");
  kelp.registerMiddlewareAtCheckpoint("beforeErrorRegister");

  kelp.app.use(kelp.options.errorHandler);

  kelp.registerMiddlewareAtCheckpoint("afterErrorRegister");
  kelp.registerMiddlewareAtCheckpoint("beforeServe");

  kelp.options.autostart
    ? kelp.start()
    : kelp.info("Kelp has finished initializing. Autostart is disabled.");
}
