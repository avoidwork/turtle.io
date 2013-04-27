/**
 * turtle.io
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright Jason Mulligan 2013
 * @license BSD3 <http://opensource.org/licenses/BSD-3-Clause>
 * @link https://github.com/avoidwork/turtle.io.website
 * @module turtle.io
 * @version 0.1.1
 */

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