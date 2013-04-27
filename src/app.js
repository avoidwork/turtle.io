(function ($) {
	$.on("ready", function () {
		// Setting footer copyright
		$("#year").html(new Date().getFullYear());

		// Setting version of Server
		"/".headers(function (args) {
			$("#version").html(/turtle.io\/([\d|\.|a|b]+)/.exec(args.Server)[1]);
		});
	});
})(abaaso);