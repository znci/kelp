let chalk = require("chalk");
let express = require("express");
let app = express();
let bodyParser = require("body-parser");
let cors = require("cors");
let path = require("path");
let fs = require("fs");

let options,
  routes = [];
let PORT;
let kelp = {};

/*
	UTILS
*/

kelp.throwErr = (e) => {
  const errors = [
    {
      err: "INVALID_PORT",
      msg: "The port you specified is invalid. Please specify a valid port as an integer.",
    },
    {
      err: "INVALID_SETTINGS",
      msg: "The settings you specified are invalid. Please specify valid settings as an object.",
    },
    {
      err: "INVALID_ROUTE",
      msg: "The route you specified is invalid. Please specify a valid route as a string path.",
    },
  ];

  let err = errors.find((v) => v.err == e);
  return console.error(
    `${chalk.hex("#99ffd8").bold(err.err)} ${chalk.hex("3DFFB5")(err.msg)}`
  );
};

kelp.colorPrim = (m) => {
  return `${chalk.hex("#99ffd8").bold(m)}`;
};
kelp.colorSec = (m) => {
  return `${chalk.hex("#3dffb5")(m)}`;
};
kelp.spaces = (s) => {
  return ` `.repeat(parseInt(s));
};

kelp.validatePort = (port) => {
  const PORT = parseInt(port);

  if (PORT >= 0 && PORT <= 65535 && PORT) {
    return true;
  }

  return false;
};

/*
	SETTINGS / OPTIONS
*/

kelp.settings = (settings) => {
  if (typeof settings !== "object") return kelp.throwErr("INVALID_SETTINGS");

  if (settings.PORT) {
    if (!kelp.validatePort(settings.PORT)) return kelp.throwErr("INVALID_PORT");
    PORT = settings.PORT;
  }
  if (settings.OPTIONS) {
    let options = [];
    settings.OPTIONS.forEach((v) => {
      switch (v) {
        case "body-parser":
          options.push("body-parser");
          app.use(bodyParser.urlencoded({ extended: true }));
          app.use(bodyParser.json());
          break;
        case "cors":
          options.push("cors");
          app.use(cors());
          break;
        case "ejs":
          options.push("ejs");
          app.set("view engine", "ejs");
          break;
        case "public":
          options.push("public");
          app.use(express.static(path.join(__dirname, "public")));
          break;
        case "routes":
          options.push("routes");

        default:
          break;
      }
    });
  }

  options = settings;
};

kelp.options = () => {
  return options;
};

/*
	ROUTES
*/

kelp.isValidRoute = (route) => {
  fs.readFile(
    path.join(__dirname, "routes", `${route}.js`),
    "utf-8",
    (err, data) => {
      if (err) return false;
      return true;
    }
  );
};
kelp.isValidMethod = (method) => {
  const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

  if (methods.includes(method)) return true;
  return false;
};

kelp.readRoutes = (subdir) => {
  const { colorPrim, colorSec, spaces } = kelp;
  let files = fs.readdirSync(path.join(__dirname, "routes", subdir));
  files.forEach((file) => {
    let stat = fs.lstatSync(path.join(__dirname, "routes", subdir, file));
    if (stat.isDirectory()) {
      kelp.readRoutes(path.join(file));
    } else {
      let route = file.split(".")[0];
      let routePath = path.join(__dirname, "routes", subdir, route);

      let routeData = require(routePath);

      if (!routeData.method) return kelp.throwErr("INVALID_ROUTE");
      if (!kelp.isValidMethod(routeData.method))
        return kelp.throwErr("INVALID_ROUTE");

      app.all(routeData.path, (req, res) => {
        if (req.method === routeData.method) {
          routeData.handler(req, res);
        } else {
          res
            .status(405)
            .send(
              `The method <b>${req.method}</b> is not allowed for this route.`
            );
        }
      });
      console.log(
        `${colorPrim(spaces(4))} ${colorSec("Using method")} ${colorPrim(
          routeData.method
        )} ${colorSec("route")} ${colorPrim(routeData.path)} in ${colorPrim(
          routePath.replace(__dirname, "")
        )}`
      );
    }
  });
};

kelp.listen = () => {
  const { colorPrim, colorSec, spaces } = kelp;

  app.listen(PORT, async () => {
    console.log(
      `${colorPrim("KELP")} ${colorSec("Listening on PORT")} ${colorPrim(PORT)}`
    );

    options.OPTIONS.forEach((v) => {
      console.log(
        `${colorPrim(spaces(4))} ${colorSec("Using")} ${colorPrim(v)}`
      );
    });

    if (options.OPTIONS.includes("routes")) {
      kelp.readRoutes("");
    }
  });
};

exports.kelp = kelp;
