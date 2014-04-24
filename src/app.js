(function (util) {
	var $       = util.$,
	    element = util.element,
	    request = util.request;

element.html($("#year")[0], new Date().getFullYear());

request("/", "head").then(function (headers) {
	element.html($("#version")[0], headers.server.split(" ")[0].replace(/.*\//, ""));
});

})(keigai.util);
