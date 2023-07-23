# Kelp

[![CodeFactor](https://www.codefactor.io/repository/github/znci/kelp/badge/main)](https://www.codefactor.io/repository/github/znci/kelp/overview/main)
[![npm version](https://badge.fury.io/js/@znci%2Fkelp.svg)](https://badge.fury.io/js/@znci%2Fkelp)

An easy to use, customizable ExpressJS web server.

## Features

- File-based routing
- Built-in view engines
- Disabled routes
- Development only routes
- Static file serving
- Automatic `express.json` and `express.urlencoded` middleware
- Automatic cookie parser middleware
- Logging
- Customizable 404 handler
- Customizable error handler

## Basic Usage

Install the package: `npm i @znci/kelp`

```js
import express from "express";
import kelpify from "@znci/kelp";

const app = express();
kelpify(app, {
  // options go here
});
```

Place your route files in the configured routes directory (`routes`) by default and follow the format under the *Routes* section.

Kelp will automagically setup and serve your application on port 3000 by default (can be turned off).

## Options

| Option            | Description                                      | Default                 | Extra                                                     | Type              |
|-------------------|--------------------------------------------------|-------------------------|-----------------------------------------------------------|-------------------|
| `routesDirectory` | The directory to look for routes in              | `__dirname + "/routes"` |                                                           | String            |
| `publicDirectory` | The directory to serve static files from         | `__dirname + "/public"` |                                                           | String            |
| `viewsDirectory`  | The directory to look for views in               | `__dirname + "/views"`  |                                                           | String            |
| `viewEngine`      | The view engine to use                           | `"none"`                | valid:   `"none", "ejs", "pug", "nunjucks", "handlebars"` | String            |
| `notFoundHandler` | The middleware function to use for 404 errors    |                         | Not set by default.                                       | Callback Function |
| `errorHandler`    | The middleware function to use for errors        |                         | Not set by default.                                       | Callback Function |
| `port`            | The port to serve your application on            | `3000`                  |                                                           | Int               |
| `environment`     | The environment to run your application in       | `"development"`         | valid:   `"development", "production"`                    | String            |
| `autostart`       | Whether or not to automatically start the server | `false`                 |                                                           | Boolean           |

All options have default values, so none of them strictly need to be configured.

### What is the environment for?

The environment option is used to determine whether or not to use development only routes and more verbose logging. If the environment is set to `"production"`, then development only routes will not be used and logging will be less verbose. If the environment is set to `"development"`, then development only routes will be used and logging will be more verbose.

### Autostart Disabled

`kelpify` is an async function. If you have autostart disabled, you will have to write your own async [IIFE](https://developer.mozilla.org/en-US/docs/Glossary/IIFE) or `.then()` chain to start the server.

```js
import express from "express";
import kelpify from "@znci/kelp";

const app = express();
kelpify(app, {
  autostart: false,
}).then(() => {
  app.listen(3000);
});
```

**OR**

```js
import express from "express";
import kelpify from "@znci/kelp";

const app = express();

(async () => {
  await kelpify(app, {
    autostart: false,
  });

  app.listen(3000);
})();
```

## Routes

Routes in kelp are very simple and follow a straightforward format.

```js
export default {
  path: "/",
  method: "GET",
  disabled: false,
  developmentRoute: false,

  handler: (req, res) => {
    // your handler code here
  },
};
```

There must be only be 1 route per file. Route paths do not strictly have to match the file name/path but it is reccomended for maintainability.

## Notes

- Kelp v3 is still in early development. Please report any bugs you find.
- Kelp uses the [`express-handlebars`](https://www.npmjs.com/package/express-handlebars) package by default for Handlebars support. Do note that this package requires you to use the `.handlebars` extension. The package also requires `(views directory)/layouts/main.handlebars` to exist and contain `{{{body}}}` somewhere.
- The `nunjucks` library requires that calls to `res.render()` include the file extension of the template you are trying to render.

## Documentation

Full documentation for Kelp will be coming soon. (@zNotChill is responsible)
