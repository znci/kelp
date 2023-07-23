# Kelp

[![CodeFactor](https://www.codefactor.io/repository/github/znci/kelp/badge/main)](https://www.codefactor.io/repository/github/znci/kelp/overview/main)

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

```js
import express from "express";
import Kelp from "@znci/kelp";

const app = express();
const kelp = new Kelp(app, {
  // options go here
});
```

Kelp will automagically setup and serve your application on port 3000 by default.

## Options

- routesDirectory - the directory to look for routes in (default: `__dirname + "/routes"`)
- publicDirectory - the directory to serve static files from (default: `__dirname + "/public"`)
- viewsDirectory - the directory to look for views in (default: `__dirname + "/views"`)
- viewEngine - the view engine to use (default: `"none"`, valid: `"none", "ejs", "pug", "nunjucks", "handlebars"`)
- notFoundHandler - the middleware function to use for 404 errors
- errorHandler - the middleware function to use for errors
- port - the port to serve your application on (default: `3000`)
- environment - the environment to run your application in (default: `"development"`, valid: `"development", "production"`)

### What is the environment for?

The environment option is used to determine whether or not to use development only routes and more verbose logging. If the environment is set to `"production"`, then development only routes will not be used and logging will be less verbose. If the environment is set to `"development"`, then development only routes will be used and logging will be more verbose.

## Documentation

Full documentation for Kelp will be coming soon. (@zNotChill is responsible)
