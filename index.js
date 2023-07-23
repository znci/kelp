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
          res.status(404).send(
            `
              <h1>404 - Not Found</h1>
              <p>This route could not be found on the server. Please double-check your URL and path route option (if you are a webmaster).</p>
              <hr />
              <p>Powered by <a href="https://github.com/znci/kelp">znci/kelp</a></p>
            `
          );

          this.options.environment === "development"
            ? this.warn(`404: ${req.method} ${req.path}`)
            : null;
        },
        errorHandler: (error, req, res, next) => {
          res.status(500).send(
            `
              <h1>500 - Internal Server Error</h1>
              <p>While processing your request, the server encountered an error. This is likely an issue with the application. Please see your server console for more information.</p>
              <hr />
              <p>Powered by <a href="https://github.com/znci/kelp">znci/kelp</a></p>
            `
          );
          this.error(error);
        },
        methodNotAllowedHandler: (req, res) => {
          res.status(405).send(
            `
              <h1>405 - Method not Allowed</h1>
              <p>This route is not configured to receive requests with the method of your request.</p>
              <hr />
              <p>Powered by <a href="https://github.com/znci/kelp">znci/kelp</a></p>
            `
          );
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

      const defaultOptions = {
        method: "GET",
        path: "/",
        disabled: false,
        developmentRoute: false,
        routeMiddleware: (req, res, next) => next(),
        handler: (req, res) => {
          res.send(
            `
              <h1>Route not Configured</h1>
              <p>This route hasn't been configured yet! Make sure the route file has a handler set. If you do not administrate this website, please contact the owner.</p>
              <hr />
              <p>Powered by <a href="https://github.com/znci/kelp">znci/kelp</a></p>
            `
          );
        },
      };

      const requiredTypes = {
        method: "string",
        path: "string",
        disabled: "boolean",
        developmentRoute: "boolean",
        routeMiddleware: "function",
        handler: "function",
      };

      for (const route in routes) {
        const routeObject = routes[route];

        for (const key in defaultOptions) {
          if (routeObject[key] === undefined) {
            routeObject[key] = defaultOptions[key];
          }
        }

        for (const key in requiredTypes) {
          if (typeof routeObject[key] !== requiredTypes[key]) {
            this.error(
              new KelpException(
                `Invalid route: ${route}. ${key} must be of type ${requiredTypes[key]}.`
              )
            );
            process.exit(1);
          }
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
          ].includes(routeObject.method.toUpperCase())
        ) {
          this.error(
            new KelpException(
              `Invalid route: ${route}. Method must be one of the following: GET, HEAD, POST, PUT, DELETE, CONNECT, OPTIONS, TRACE, PATCH.`
            )
          );
          process.exit(1);
        }

        if (
          ((this.options.environment === "development" &&
            routeObject.developmentRoute) ||
            !routeObject.developmentRoute) &&
          !routeObject.disabled
        ) {
          const routeHandler = (req, res) => {
            if (req.method === routeObject.method.toUpperCase()) {
              routeObject.handler(req, res);
            } else {
              this.options.methodNotAllowedHandler(req, res);

              this.options.environment === "development"
                ? this.warn(
                    `405: ${req.method} ${req.path} (expected ${routeObject.method})`
                  )
                : null;
            }
          };

          routeObject.routeMiddleware
            ? this.app.all(
                routeObject.path,
                routeObject.routeMiddleware,
                (req, res) => routeHandler(req, res)
              )
            : this.app.all(routeObject.path, (req, res) =>
                routeHandler(req, res)
              );

          this.info(`Loaded route: ${routeObject.method} ${routeObject.path}`);
        } else {
          this.info(`Skipped route: ${routeObject.method} ${routeObject.path}`);
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

  kelp.app.use((req, res, next) => {
    res.setHeader("X-Powered-By", "@znci/kelp");
    next();
  });

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
