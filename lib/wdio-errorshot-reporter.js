const events = require('events');
const fs = require('fs');
const path = require('path');
const slugify = require('./helpers/slugify.js');
const log = require('./helpers/log.js');


/**
 * Reporter main method, listens to the runner:screenshot event in order
 * to rename error screenshot names dynamically
 *
 * @param {baseReporter} baseReporter
 * @param {object} config
 * @param {object} options
 *
 * @constructor
 */
class ErrorshotReporter extends events.EventEmitter {

	constructor(baseReporter, config, options = {}) {
		super();

		// Set some internal properties
		this.baseReporter = baseReporter;
		this.config = config;
		this.options = options;

		// Internal logging method
		this.log = log;

		// Get the filename with placeholders from wdio.conf.js
		this.filenameTemplate = this.getOptionFilenameTemplate();

		// Listen on the 'runner:screenshot* event, our job begins here
		this.on('runner:screenshot', this.handleEventRunnerScreenshot);
	}

	/**
	 * EventHandler method that renames a file on each 'runner:screenshot* event
	 *
	 * @param {object} screenshot
	 * @returns {boolean}
	 */
	handleEventRunnerScreenshot(screenshot) {
		// Make sure screenshot has the required properties, otherwise skip the reporter
		if (!this.screenshotHasRequiredProperties(screenshot)) {
			return false;
		}

		// Build the paths and insert the replacements
		const filepathOld = this.getScreenshotFilepath(screenshot.filename);
		const filepathNew = this.getScreenshotFilepath(this.getScreenshotName(screenshot));

		// Finally rename the screenshot asynchronously, logging and failing gracefully on failure
		this.renameScreenshot(filepathOld, filepathNew);
	}

	/**
	 * Get the path to the errorshot folder appended by screenshot filename
	 *
	 * @param {string} filename
	 * @returns {string}
	 */
	getScreenshotFilepath(filename) {
		return path.join(this.config.screenshotPath, filename);
	}

	/**
	 * Get the filename from a wdio screenshot object
	 *
	 * @param {object} screenshot
	 * @returns {string}
	 */
	getScreenshotName(screenshot) {
		return this.replacefilenameTemplatePlaceholders(screenshot) + '.png';
	}

	/**
	 * Rename a screenshot by passing the old and new path including the files name.
	 *
	 * @param {string} filepathOld
	 * @param {string} filepathNew
	 */
	renameScreenshot(filepathOld, filepathNew) {
		fs.rename(filepathOld, filepathNew, (err) => {
			if (err) {
				this.log(`Failed to rename screenshot: ${err}`);
			}
		});
	}

	/**
	 * Check if the 'screenshot' object does contain required certain properties.
	 * If it returns false we skip file renaming for the current screenshot.
	 *
	 * @param {object} screenshot
	 * @returns {boolean}
	 */
	screenshotHasRequiredProperties(screenshot) {
		const hasRequiredProperties = screenshot.hasOwnProperty('filename')
			&& screenshot.hasOwnProperty('time')
			&& screenshot.hasOwnProperty('parent')
			&& screenshot.hasOwnProperty('title');

		if (!hasRequiredProperties) {
			this.log('Failed to rename screenshot, falling back to default behaviour!');
		}

		return hasRequiredProperties;
	}

	/**
	 * Returns the string that is the initial filename with all placeholders intact.
	 * Using fallback if the option is not defined in wdio.conf.js
	 *
	 * @example reporterOptions: { errorshotReporter: { format: '%capId%_%parent%-%title%_%timestamp%' } }
	 * @returns {string}
	 */
	getOptionFilenameTemplate() {
		const defaultFormat = '%capId%_%parent%-%title%_%timestamp%';

		if (!this.config.reporterOptions || !this.config.reporterOptions.errorshotReporter || !this.config.reporterOptions.errorshotReporter.template) {
			this.log('No template name defined in the configs.');
		}

		// Make sure format has been set in the config, otherwise fallback to default
		return !this.config.reporterOptions.errorshotReporter.template
			? defaultFormat
			: this.config.reporterOptions.errorshotReporter.template;
	}

	/**
	 * Parse information that can be used via placeholders
	 *
	 * @param {object} screenshot
	 * @returns {{capId: string, browser: string, timestamp: string, parent: string, title: string}}
	 */
	getPlaceholderLookup(screenshot) {
		const browserName = this.getCapabilitiesFromScreenshotName(screenshot.filename);

		return {
			capId: browserName,
			browser: browserName,
			browserName: browserName,
			timestamp: screenshot.time.toJSON().replace(/:/g, '-'),
			parent: slugify(screenshot.parent),
			title: slugify(screenshot.title)
		};
	}

	/**
	 * Parse capabilities from the know screenshot name schema
	 *
	 * @param {string} filename
	 * @returns {string}
	 */
	getCapabilitiesFromScreenshotName(filename) {
		// Due to wdio putting the browser as the second part in a screenshots name we can
		// parse it easily as we have no access to capabilities in the screenshot event
		const parsedBrowserName = filename.match(/_(.*?)_/);

		// Make sure we have found a match, you never know
		return parsedBrowserName && parsedBrowserName.length ? parsedBrowserName[1] : '';
	}

	/**
	 * Inserts content for our placeholders, placeholder character pattern is a unique word wrapped by two single '%'
	 *
	 * @param {object} replacementLookup
	 * @returns {string}
	 */
	replacefilenameTemplatePlaceholders(screenshot) {
		const placeholders = this.getPlaceholderLookup(screenshot);

		// Find all instances of our placeholder pattern and replace them
		return this.filenameTemplate.replace(/%\w+%/g, match => {
			// Remove placeholder chars to access the placeholder lookup
			const matchNoDelimiter = match.replace(/%/g, '');

			// Don't replace if we don't have the placeholder (wrong user input)
			return placeholders.hasOwnProperty(matchNoDelimiter)
				? placeholders[matchNoDelimiter]
				: match;

		});
	}

}

/**
 * Required name by WebdriverIO
 */
ErrorshotReporter.reporterName = 'errorshotReporter';

/**
 * Expose Custom Reporter
 */
exports = module.exports = ErrorshotReporter;