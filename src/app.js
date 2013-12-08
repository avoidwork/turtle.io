(function ($) {
	$.on("ready", function () {
		// Setting footer copyright
		$("#year").html(new Date().getFullYear());

		"/".headers(function (arg) {
			$("#version").html(arg.Server.split(" ")[0].replace(/.*\//, ""));
		});
	});
})(abaaso);
