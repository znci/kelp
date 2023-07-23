export default {
  method: "GET",
  path: "/",
  disabled: false,
  developmentRoute: false,

  handler: (req, res) => {
    res.send("Hello World!");
  },
};
