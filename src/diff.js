/**
 * Returns the difference of now from `time` as nanoseconds
 *
 * @param  {Array} time process.hrtime() result
 * @return {Number}     Nanoseconds
 */
function diff ( time ) {
	var now = process.hrtime( time );

	return now[0] * 1e9 + now[1];
}
