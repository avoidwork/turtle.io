/**
 * Returns the difference of now from `timer`
 *
 * @method diff
 * @private
 * @param  {Object} timer Date instance
 * @return {Number}       Milliseconds
 */
var diff = function (timer) {
	return new Date() - timer;
};
