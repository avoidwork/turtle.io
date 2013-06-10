/**
 * turtle.io
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright 2013 Jason Mulligan
 * @license BSD3 <http://opensource.org/licenses/BSD-3-Clause>
 * @link https://github.com/avoidwork/turtle.io
 * @module turtle.io
 * @version 0.1.3
 */
(function ($) {
	$.on("ready", function () {
		// Setting footer copyright
		$("#year").html(new Date().getFullYear());

		"/".headers(function (arg) {
			$("#version").html(arg.Server.replace(/turtle.io\/(\d\.\d\.\d).*/, "$1"));
		});
	});
})(abaaso);