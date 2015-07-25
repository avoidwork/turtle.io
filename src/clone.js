/**
 * Fast shallow clone
 *
 * @method clone
 * @param  {Mixed} arg Argument to clone
 * @return {Mixed}     Clone of `arg`
 */
function clone (arg) {
	return JSON.parse(JSON.stringify(arg));
}
