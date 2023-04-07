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
import { UserOptions } from "./types/OptionsTypes";


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
	  routes: any[];
	  colorPrim: (m: string) => string;
	  colorSec: (m: string) => string;
	  spaces: (s: string) => string;
	  validatePort: (port: string) => boolean;
	  log: (m: string) => void;
	  dirname__: string;
	  useroptions: UserOptions;
	  readRoutes: (subdir: string) => void;
	  isValidMethod: (method: any) => boolean;

		/*
		CONSTRUCTOR
		*/

	  constructor(set: KelpOptions) {
		super();	
		/* Properties */
		this.app = app;
		this.options = set;
		this.useroptions = set.OPTIONS!;
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
		this.dirname__ = __dirname.replace("node_modules/@znci/kelp/out", "");
		this.isValidMethod = (method) => {
			const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

			if (methods.includes(method)) return true;
			return false;
		};
		this.readRoutes = (subdir) => {
			let dirname__ = __dirname.replace("node_modules/@znci/kelp/out", "");
			let files = fs.readdirSync(path.join(dirname__, "routes", subdir));
			files.forEach((file) => {
				let stat = fs.lstatSync(path.join(dirname__, "routes", subdir, file));
				if (stat.isDirectory()) {
				this.readRoutes(path.join(file));
				} else {
				let route = file.split(".")[0];
				// create the path but remove the node_modules/@znci/kelp/out part
				let routePath = path.join(dirname__, "routes", subdir, route);
				

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
				this.log(`${this.colorSec("Using method")} ${this.colorPrim(routeData.method)} ${this.colorSec("route")} ${this.colorPrim(routeData.path)} in ${this.colorPrim(routePath.replace(dirname__, ""))}}`)
				}
			});
		};
		/* User Options */
		let dirname__ = __dirname.replace("node_modules/@znci/kelp/out", "");
		if (set.PORT) {
			if (!this.validatePort(String(set.PORT))) throw new InvalidPortError(`${set.PORT} is not a valid port.`);
			PORT = set.PORT;
		}
		if (set.OPTIONS) {
			if (set.OPTIONS.cors) {
				app.use(cors());
			}
			if (set.OPTIONS.bodyParser) {
				app.use(bodyParser.json());
				app.use(bodyParser.urlencoded({ extended: true }));
			}
			if (set.HEARTBEAT) {
				app.all(set.HEARTBEAT.ROUTE, (req, res) => {
					res.send("OK");
				});
			}
			if (set.OPTIONS.public) {
				app.use(express.static(path.join(dirname__, set.OPTIONS.publicOptions!.path!)));
			}
			if (set.OPTIONS.routes) {
				this.readRoutes(path.join(dirname__, set.OPTIONS.routeOptions!.path!));
			}
			if (set.OPTIONS.custom) {
				app.use(set.OPTIONS.customMiddleware!.middleware!);
			}
			if (set.OPTIONS.welcome) {
				app.all("/", (req, res) => {
					res.send(`
					<!DOCTYPE html>
						<html>

						<head>
							<title>Welcome to kelp!</title>
							<style>
								@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
								html {
									color-scheme: light dark;
								}

								body {
									width: 35em;
									margin: 0 auto;
									font-family: 'Inter', 'Comic Sans MS', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif';
								}
								/* weight 900 h1 */
								h1 {
									font-weight: 700;
									font-size: 2.5em;
									margin: 0.67em 0;
								}
								
							</style>
						</head>

						<body>
							<h1>Welcome to kelp!</h1>
							<p>If you see this page, kelp is properly configured and is working as it should.</p>

							<p>For online documentation and support please refer to
								<a href="http://docs.znci.dev/kelp">docs.znci.dev</a>.<br />
							</p>

							<p><em>Thank you for using kelp!</em></p>
						</body>

						</html>
					`)
				})
			}
			if (set.OPTIONS.ejs) {
				app.set("view engine", "ejs");
				app.set("views", path.join(dirname__, set.OPTIONS.ejsOptions!.path!));
			}
			if (set.OPTIONS.pug) {
				app.set("view engine", "pug");
				app.set("views", path.join(dirname__, set.OPTIONS.pugOptions!.path!));
			}
		}
	}

		/**
		 * Listen for oncoming requests.
		 * Doesn't require any parameters.
		 */
		listen() {
			app.listen(PORT, async () => {
				setInterval(() => {
				uptime++;
				}, 1000);
				this.log(`${this.colorSec("Listening on PORT")} ${this.colorPrim(PORT)}`)
			});
		}
	}



		
export default Kelp;