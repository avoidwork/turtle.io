/**
 * turtle.io
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright 2014 Jason Mulligan
 * @license BSD3 <http://opensource.org/licenses/BSD-3-Clause>
 * @link https://github.com/avoidwork/turtle.io
 * @module turtle.io
 * @version 0.1.4
 */
(function (util) {
	var $       = util.$,
	    element = util.element,
	    request = util.request;

element.html($("#year")[0], new Date().getFullYear());

request("/", "head").then(function (headers) {
	element.html($("#version")[0], headers.server.split(" ")[0].replace(/.*\//, ""));
});

})(keigai.util);
