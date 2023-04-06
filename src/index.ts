/*
	Kelp
	Highly customizable, fast, and easy to use web framework for Node.js
*/
import chalk from "chalk";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import fs from "fs";

// Types, Errors, Interfaces
import { InvalidPortError, InvalidRouteError } from "./lib/errors";
import { KelpOptions } from "./types/MainTypes";


// Global Constants
let app = express();
let PORT;
let uptime = 0;
let startup = Date.now();


class Kelp extends Object {

		/*
		PROPERTIES
		*/

	  app: Express.Application;
	  options: KelpOptions;
	  routes: never[];
	  colorPrim: (m: string) => string;
	  colorSec: (m: string) => string;
	  spaces: (s: string) => string;
	  validatePort: (port: string) => boolean;
	  log: (m: string) => void;

		/*
		CONSTRUCTOR
		*/

	  constructor(set: KelpOptions) {
		super();	
		/* Properties */
		this.app = app;
		this.options = set;
		this.colorPrim = chalk.hex("#99ffd8").bold;
		this.colorSec = chalk.hex("#3dffb5");
		this.spaces = (s) => {
			return ` `.repeat(parseInt(s));
		};
		/* Utils */
		this.validatePort = (port) => {
			const PORT = parseInt(port);
			if (PORT >= 0 && PORT <= 65535 && PORT) {
				return true;
			}
			return false;
		};
		this.log = (m) => {
			console.log(`${this.colorPrim("KELP")} ${m}`);
		};
		this.routes = [];

		/* User Options */
		if (set.PORT) {
				if (!this.validatePort(String(set.PORT))) throw new InvalidPortError(`${set.PORT} is not a valid port.`);
				PORT = set.PORT;
			}
			if (set.OPTIONS) {
				let useroptions : string[] = [];
				set.OPTIONS.forEach((v) => {
					switch (v) {
						case "body-parser":
						useroptions.push("body-parser");
						app.use(bodyParser.urlencoded({ extended: true }));
						app.use(bodyParser.json());
						break;
						case "cors":
						useroptions.push("cors");
						app.use(cors());
						break;
						case "ejs":
						useroptions.push("ejs");
						app.set("view engine", "ejs");
						break;
						case "pug":
						useroptions.push("pug");
						app.set("view engine", "pug");
						break;
						case "public":
						useroptions.push("public");
						app.use(express.static(path.join(__dirname, "public")));
						break;
						case "routes":
						useroptions.push("routes");

						default:
						break;
					}
					set.OPTIONS = useroptions;
				});

			}

	  }

		/*
		METHODS
		*/
	  isValidRoute(route: string) {
		fs.readFile(
			path.join(__dirname, "routes", `${route}.js`),
			"utf-8",
			(err, data) => {
				if (err) return false;
				return true;
			}
		);
		}  
		isValidMethod(method: string) {
			const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

			if (methods.includes(method)) return true;
			return false;
		};
		readRoutes(subdir: string) {
			let files = fs.readdirSync(path.join(__dirname, "routes", subdir));
			files.forEach((file) => {
				let stat = fs.lstatSync(path.join(__dirname, "routes", subdir, file));
				if (stat.isDirectory()) {
				this.readRoutes(path.join(file));
				} else {
				let route = file.split(".")[0];
				let routePath = path.join(__dirname, "routes", subdir, route);

				let routeData = require(routePath);

				if (!routeData.method) throw new InvalidRouteError(`Route ${routePath} does not have a method.`);
				if (!this.isValidMethod(routeData.method))
					throw new InvalidRouteError(`Route ${routePath} has an invalid method.`);

				if (this.options && routeData.flags.devRoute) return;
				if (routeData.flags.disabled) return;

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
				this.log(`${this.colorSec("Using method")} ${this.colorPrim(routeData.method)} ${this.colorSec("route")} ${this.colorPrim(routeData.path)} in ${this.colorPrim(routePath.replace(__dirname, ""))}}`)
				}
			});
		};
		listen() {
			app.listen(PORT, async () => {
				setInterval(() => {
				uptime++;
				}, 1000);
				this.log(`${this.colorSec("Listening on PORT")} ${this.colorPrim(PORT)}`)

				this.options.OPTIONS?.forEach((v) => {
				this.log(`${this.colorSec("Using")} ${this.colorPrim(v)}`)
				});

				if (this.options.OPTIONS?.includes("routes")) {
				this.readRoutes("");
				}

				
				// Register heartbeat

				const heartbeat = this.options.HEARTBEAT && this.options.HEARTBEAT.ROUTE;
				if(heartbeat) {
				if(this.options.HEARTBEAT?.FLAGS && this.options.HEARTBEAT.FLAGS.disabled) return;

				this.log(`${this.colorSec("Heartbeat route")} ${this.colorPrim("enabled")} ${this.colorSec("and")} ${this.colorPrim("activated")} ${this.colorSec("on route")} ${this.colorPrim(this.options.HEARTBEAT!.ROUTE)}`);
				app.all(this.options.HEARTBEAT!.ROUTE, (req, res) => {
					if (req.method === "GET") {
					res.status(200).json({
						uptime: uptime,
						startup: startup,
						status: "OK"
					});
					} else {
					res
						.status(405)
						.send("The method <b>GET</b> is not allowed for this route.");
					}
				});
				}
			});
		};
		
}




		
export default Kelp;