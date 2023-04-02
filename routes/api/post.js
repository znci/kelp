module.exports = {
	method: "POST",
	path: "/api/post",
	handler: (req, res) => {
		res.json(
			{ time: Date.now() }
		);
	}
}