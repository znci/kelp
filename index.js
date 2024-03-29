import { consola } from "consola";
import cookieParser from "cookie-parser";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import bodyParser from "body-parser";

// view engines
import nunjucks from "nunjucks";
import { engine } from "express-handlebars";

/**
 * @constant __dirname
 * @description The current working directory (according to `process.cwd()`)
 */
export const __dirname = process.cwd();

/**
 * @class KelpException
 * @extends Error
 * @description An exception thrown by Kelp.
 * @param {string} message The error message.
 * @returns {KelpException} The KelpException object.
 */
class KelpException extends Error {
  constructor(message) {
    super(message);
    this.name = "KelpException";
  }
}

/**
 * @function kelpify
 * @description A function that adds on the Kelp framework to an Express app.
 * @param {express.Application} app The Express app.
 * @param {object} [options] The options for Kelp.
 *
 * @param {string} [options.routesDirectory=__dirname + "/routes"] The directory to load routes from.
 * @param {string} [options.publicDirectory=__dirname + "/public"] The directory to serve static files from.
 * @param {string} [options.viewsDirectory=__dirname + "/views"] The directory to load views from.
 * @param {string} [options.viewEngine="none"] The view engine to use. If set to "none", no view engine will be used.
 * @param {function} [options.notFoundHandler] The handler for 404 errors.
 * @param {function} [options.errorHandler] The handler for 500 errors.
 * @param {function} [options.methodNotAllowedHandler] The handler for 405 errors.
 * @param {object} [options.middlewareCheckpoints] The checkpoints to register middleware at.
 * @param {object} [options.alwaysAddedHeaders] The headers to add to every response.
 * @param {number} [options.port=3000] The port to run the server on.
 * @param {string} [options.environment="development"] The environment to run the server in.
 * @param {boolean} [options.autostart=true] Whether to automatically start the server.
 *
 * @param {function} [options.middlewareCheckpoints.beforeRouteLoad] The checkpoint to register middleware before routes are loaded.
 * @param {function} [options.middlewareCheckpoints.afterRouteLoad] The checkpoint to register middleware after routes are loaded.
 * @param {function} [options.middlewareCheckpoints.beforeBuiltinMiddlewareRegister] The checkpoint to register middleware before built-in middleware is registered.
 * @param {function} [options.middlewareCheckpoints.afterBuiltinMiddlewareRegister] The checkpoint to register middleware after built-in middleware is registered.
 * @param {function} [options.middlewareCheckpoints.before404Register] The checkpoint to register middleware before the 404 handler is registered.
 * @param {function} [options.middlewareCheckpoints.after404Register] The checkpoint to register middleware after the 404 handler is registered.
 * @param {function} [options.middlewareCheckpoints.beforeErrorRegister] The checkpoint to register middleware before the error handler is registered.
 * @param {function} [options.middlewareCheckpoints.afterErrorRegister] The checkpoint to register middleware after the error handler is registered.
 * @param {function} [options.middlewareCheckpoints.beforeServe] The checkpoint to register middleware before the server is started.
 *
 * @returns {Promise<void>} A promise that resolves when the server is started.
 */
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
            `
          );

          this.options.environment === "development"
            ? this.warn(`404: ${req.method} ${req.path}`)
            : null;
        },
        errorHandler: (err, req, res, next) => {
          if (res.headersSent) {
            return next(err)
          }
          res.status(500).send(
            `
              <h1>500 - Internal Server Error</h1>
              <p>An internal server error occured. Please try again later.</p>
            `
          );
          this.error(err);
        },
        methodNotAllowedHandler: (req, res) => {
          res.status(405).send(
            `
              <h1>405 - Method not Allowed</h1>
              <p>This route is not configured to receive requests with the method of your request.</p>
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
        },
        alwaysAddedHeaders: {},
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
        alwaysAddedHeaders: "object",
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

    /**
     * Recursively searches a directory for files and returns an array of file paths.
     * @param directory The directory to search.
     * @param arrayOfFiles An optional array of file paths to append to.
     * @returns An array of file paths.
     */

    async snakeDirectory(directory, arrayOfFiles) {
      const files = fs.readdirSync(directory);

      arrayOfFiles = arrayOfFiles || [];

      files.forEach(function (file) {
        if (fs.statSync(directory + "/" + file).isDirectory()) {
          arrayOfFiles = this.snakeDirectory(
            directory + "/" + file,
            arrayOfFiles
          );
        } else {
          arrayOfFiles.push(path.join(__dirname, directory, "/", file));
        }
      });

      return arrayOfFiles;
    },

    async loadRoutes() {
      const routes = [];

      const files = await this.snakeDirectory(this.options.routesDirectory);

      for (const file of files) {
        const loadedFile = await import(file);
        routes.push(loadedFile.default);
      }

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
    `Loading znci/kelp with environment ${kelp.options.environment.toUpperCase()} (dev enabled: ${kelp.options.environment === "development"
    }).`
  );

  kelp.registerMiddlewareAtCheckpoint("beforeRouteLoad");

  await kelp.loadRoutes();

  kelp.registerMiddlewareAtCheckpoint("afterRouteLoad");
  kelp.registerMiddlewareAtCheckpoint("beforeBuiltinMiddlewareRegister");

  kelp.info("Loaded routes. Starting server...");

  kelp.app.use(bodyParser.json());
  kelp.app.use(bodyParser.urlencoded({ extended: true }));
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
