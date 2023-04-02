const { kelp } = require("./kelp");

kelp.settings({
  PORT: 3193,
  OPTIONS: ["body-parser", "ejs", "public", "cors", "routes"],
});

kelp.listen();
