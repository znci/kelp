const fetch = require("node-fetch");
const fs = require("fs");

function prep(filePath, callback) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf-8", (err, data) => {
      if (err) {
        console.error(err);
        reject();
      }
      const modifiedData = data.replace(/console\.log\(.*\);?\n?/g, "");
      fs.writeFile("temp.test.js", modifiedData, (err) => {
        if (err) {
          console.error(err);
          reject();
        }
      });
    });

    callback();
    resolve();
  });
}

describe("test kelp", function () {
  before(function (done) {
    prep("./index.js", done).then(() => {});
  });
  after(function (done) {
    fs.rmSync("kelp.test.js");
    done();
    process.exit();
  });
  it("prep wait", function (done) {
    setTimeout(done, 1900);
  });
  it("test kelp.test_settings", function (done) {
    const { kelp } = require("./kelp.test.js");
    kelp.settings({
      PORT: 3193,
      OPTIONS: ["body-parser", "ejs", "public", "cors", "routes"],
      IS_DEV_MODE: true
    });
    done();
  });

  it("test kelp.test_kelp_serve", function (done) {
    const { kelp } = require("./kelp.test.js");
    kelp.listen();
    done();
  });

  it("test kelp.test_get_testpage", function (done) {
    const starttime = new Date().getTime();
    fetch("http://localhost:3193/")
      .then((res) => res.text())
      .then((body) => {
        const endTime = new Date().getTime();
        done();
      });
  });
});
