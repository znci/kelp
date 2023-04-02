const { jank } = require("./jank");

jank.settings({
	PORT: 3193,
	OPTIONS: [
		"body-parser",
		"ejs",
		"public",
		"cors",
		"routes",
	],
});

jank.listen();