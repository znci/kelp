
const fs = require("fs");
const express = require("express");
const time = require("fancy-time");
require("dotenv").config();
const PORT = process.env.PORT;
const bodyParser = require("body-parser");
const path = require("path");
const { dir } = require("../../server");

const app = express();

let web = {};

web.config = require("./config").config;

web.readDir = function() {
	let routes = [];
	fs.readdirSync(web.config.handler.routes).forEach((route) => { if(!route.endsWith(".js")) return; routes.push(route); });
	return routes;
}

web.addRoute = function(route) {

	const r = require(`../../routes/${route}`);

	switch(r.method) {
		case "GET":
			app.get(r.path, r.main)
			break
		case "POST":
			app.post(r.path, r.main)
			break
		case "PUT":
			app.put(r.path, r.main)
			break
		case "PATCH":
			app.patch(r.path, r.main)
			break
		case "HEAD":
			app.head(r.path, r.main)
			break
		case "OPTIONS":
			app.options(r.path, r.main)
			break
		case "PURGE":
			app.purge(r.path, r.main)
			break
		case "LOCK":
			app.lock(r.path, r.main)
			break
		case "UNLOCK":
			app.unlock(r.path, r.main)
			break
		case "PROPFIND":
			app.propfind(r.path, r.main)
			break
	}
	console.log(time.timeStr(`Adding ${r.method} for ${r.path}`));
}

web.settings = function() {
	app.use(bodyParser.json());
	app.set('view engine', 'ejs');
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(express.static(path.join(__dirname + "../../../public")));
}

web.renders = function() {
	app.get('/', function(req, res) {
		res.render('index')
	})
	app.get('/oauth', function(req, res) {
		res.render('oauth')
	})
	app.get('signup/', function(req, res) {
		res.render('signup')
	})
}

web.run = function() {
	const routes = web.readDir();

	routes.forEach((v) => {
		web.addRoute(v);
	})

	web.settings();

	web.renders();

	app.listen(PORT, () => {
		console.log(time.timeStr(`Opened server on PORT ${PORT}`));
	})
}

module.exports = {
	web
}