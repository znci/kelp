import { consola } from "consola";
import cookieParser from "cookie-parser";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import bodyParser from "body-parser";

// view engines
import nunjucks from "nunjucks";
import { engine } from "express-handlebars";

// __dirname recreation
const __dirname = process.cwd();

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
 * @param {object} options The options for Kelp.
 *
 * @param {string} options.routesDirectory The directory where the routes are stored.
 * @param {string} options.publicDirectory The directory where the static files are stored.
 * @param {string} options.viewsDirectory The directory where the views are stored.
 * @param {string} options.viewEngine The view engine to use. If you do not want to use a view engine, set this to "none".
 * @param {function} options.notFoundHandler The middleware to register when a route is not found.
 * @param {function} options.errorHandler The middleware to register when an error occurs.
 * @param {function} options.methodNotAllowedHandler The middleware to register when a method is not allowed.
 * @param {object} options.middlewareCheckpoints The checkpoints where middleware should be registered.
 * @param {object} options.alwaysAddedHeaders The headers to add to every response.
 * @param {number} options.port The port to run the server on.
 * @param {string} options.environment The environment to run the server in.
 * @param {boolean} options.autostart Whether or not to automatically start the server.
 *
 * @param {function} options.middlewareCheckpoints.beforeRouteLoad The middleware to register before routes are loaded.
 * @param {function} options.middlewareCheckpoints.afterRouteLoad The middleware to register after routes are loaded.
 * @param {function} options.middlewareCheckpoints.beforeBuiltinMiddlewareRegister The middleware to register before built-in middleware is registered.
 * @param {function} options.middlewareCheckpoints.afterBuiltinMiddlewareRegister The middleware to register after built-in middleware is registered.
 * @param {function} options.middlewareCheckpoints.before404Register The middleware to register before the 404 handler is registered.
 * @param {function} options.middlewareCheckpoints.after404Register The middleware to register after the 404 handler is registered.
 * @param {function} options.middlewareCheckpoints.beforeErrorRegister The middleware to register before the error handler is registered.
 * @param {function} options.middlewareCheckpoints.afterErrorRegister The middleware to register after the error handler is registered.
 * @param {function} options.middlewareCheckpoints.beforeServe The middleware to register before the server is started.
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
            return next(err);
          }

          res.status(500).send(
            `
              <h1>500 - Internal Server Error</h1>
              <p>While processing your request, the server encountered an error. This is likely an issue with the application. Please see your server console for more information.</p>
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
    `Loading znci/kelp with environment ${kelp.options.environment.toUpperCase()} (dev enabled: ${
      kelp.options.environment === "development"
    }).`
  );

  kelp.app.use((req, res, next) => {
    res.setHeader("X-Powered-By", "@znci/kelp");

    for (const header in kelp.options.alwaysAddedHeaders) {
      header.toLowerCase() !== "X-Powered-By".toLowerCase()
        ? res.setHeader(header, kelp.options.alwaysAddedHeaders[header])
        : kelp.warn("The X-Powered-By header cannot be overriden.");
    }

    next();
  });

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
