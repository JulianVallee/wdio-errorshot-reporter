/* eslint-disable no-console */

/**
 * Internal logging helper
 *
 * TODO: Implement logging verbosity, other fancy things
 */
function log() {
	console.log(...arguments);
}

exports = module.exports = log;