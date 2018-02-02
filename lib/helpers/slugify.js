/**
 * Slugify helper from https://gist.github.com/mathewbyrne/1280286
 *
 * @param {string} text
 * @param {string} delimiter
 * @returns {string}
 */
function slugify(text, delimiter = '-') {
	return text.toString().toLowerCase()
		.replace(/\s+/g, delimiter)	// Replace spaces with -
		.replace(/[^\w-]+/g, '')	// Remove all non-word chars
		.replace(/--+/g, delimiter)	// Replace multiple - with single -
		.replace(/^-+/, '')			// Trim - from start of text
		.replace(/-+$/, '');		// Trim - from end of text
}

exports = module.exports = slugify;