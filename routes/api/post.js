module.exports = {
	method: "POST",
	path: "/api/post",
	flags: {
		disabled: true,
		devRoute: true
	},
	handler: (req, res) => {
		res.json(
			{ time: Date.now() }
		);
	}
}