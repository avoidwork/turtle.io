/**
 * Gets or sets a compressed file
 * 
 * @param  {String}   hash MD5 hash to identify temp file
 * @param  {String}   op   "get" or "set"
 * @param  {Function} fn   Callback function
 * @param  {Mixed}    body Buffer or UTF-8 String
 * @return {Undefined}     undefined
 */
var cache = function (hash, op, fn, body) {
	if (!/^(get|set)$/.test(op)) throw Error($.label.error.invalidArguments);

	switch (op) {
		case "get":
			break;
		case "set":
			break;
	}
};
