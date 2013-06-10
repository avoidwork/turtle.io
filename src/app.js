(function ($) {
	$.on("ready", function () {
		// Setting footer copyright
		$("#year").html(new Date().getFullYear());

		"/".headers(function (arg) {
			$("#version").html(arg.Server.replace(/turtle.io\/(\d\.\d\.\d).*/, "$1"));
		});
	});
})(abaaso);