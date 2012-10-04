/**
 * Determines which verbs are allowed against a URL
 * 
 * @param  {String} url URL to query
 * @return {String}     Allowed methods
 */
var allows = function (url) {
	var result = "",
	    verbs  = ["DELETE", "GET", "POST", "PUT"];

	verbs.each(function (i) {
		if (allowed(i, url)) result += (result.length > 0 ? ", " : "") + i;
	});

	return result.replace("GET", "GET, HEAD, OPTIONS");
};
