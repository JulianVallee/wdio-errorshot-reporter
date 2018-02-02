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

	/**
	 * @returns {boolean}
	 */
	get isInitialized() {
		return this._isInitialized;
	}

	/**
	 * @param {boolean} val
	 */
	set isInitialized(val) {
		this._isInitialized = val;
	}

	get defaultFilenameTemplate() {
		return '%timestamp%_%capId%_%parent%-%title%';
	}

	/**
	 * @param {object} baseReporter Required when used as a reporter, can be empty when being tested
	 * @param {object} config Coming from wdio.conf.js
	 * @param {object} options Can be empty
	 */
	constructor(baseReporter, config, options = {}) {
		super();

		// Set some internal properties
		this.baseReporter = baseReporter;
		this.config = config;
		this.options = options;

		// Internal logging method
		//this.log = log;
		this.log = () => {};

		// Get the filename with placeholders from wdio.conf.js
		this.filenameTemplate = this.getOptionFilenameTemplate();

		// Listen on the 'runner:screenshot* event, our job begins here
		this.on('runner:screenshot', this.handleEventRunnerScreenshot);

		this.isInitialized = true;
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
		const filepathOld = this.buildScreenshotFilepath(screenshot.filename);
		const filepathNew = this.buildScreenshotFilepath(this.getScreenshotName(screenshot));

		// Finally rename the screenshot asynchronously, logging and failing gracefully on failure
		this.renameScreenshot(filepathOld, filepathNew);

		return true;
	}

	/**
	 * Get the path to the errorshot folder appended by screenshot filename
	 *
	 * @param {string} filename
	 * @returns {string}
	 */
	buildScreenshotFilepath(filename) {
		return path.join(this.config.screenshotPath, filename);
	}

	/**
	 * Get the filename from a wdio screenshot object
	 *
	 * @param {object} screenshot
	 * @returns {string}
	 */
	getScreenshotName(screenshot) {
		return this.replaceFilenameTemplatePlaceholders(screenshot) + '.png';
	}

	/**
	 * Rename a screenshot by passing the old and new path including the files name.
	 *
	 * @param {string} filepathOld
	 * @param {string} filepathNew
	 */
	renameScreenshot(filepathOld, filepathNew, cb) {
		fs.rename(filepathOld, filepathNew, (err) => {
			if (err) {
				this.log(`Failed to rename screenshot from '${filepathOld}' to '${filepathNew}':`);
				this.log(err);
			}

			if(typeof cb === 'function') {
				cb(err);
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
			this.log('Screenshot properties do not match.');
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
		if (!this.config.reporterOptions || !this.config.reporterOptions.errorshotReporter || !this.config.reporterOptions.errorshotReporter.template) {
			return this.defaultFilenameTemplate;
		}

		// Make sure format has been set in the config, otherwise fallback to default
		return this.config.reporterOptions.errorshotReporter.template;
	}

	/**
	 * Parse information that can be used via placeholders
	 *
	 * @param {object} screenshot
	 * @returns {{capId: string, browser: string, timestamp: string, parent: string, title: string}}
	 */
	getPlaceholderLookup(screenshot) {
		const browserName = this.getBrowserFromScreenshotName(screenshot.filename);

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
	 * Parse the browser name from the filename since we have no access to capabilities in the screenshot event
	 *
	 * @param {string} filename
	 * @returns {string}
	 */
	getBrowserFromScreenshotName(filename) {
		const browsers = [
			'chrome',
			'firefox',
			'ie',
			'edge',
			'opera'
		];

		let browserName = null;

		// Due to wdio putting the browser string as the second part in a screenshots name we can
		// parse it easily in most cases
		const parsedFilenameParts = filename.match(/_(.*?)_/);

		// Check if we have found enough parts
		browserName = parsedFilenameParts && parsedFilenameParts.length ? parsedFilenameParts[1] : false;

		// Last resort if we're unable to find a browser via regex is to manually check the filename against an array of
		// browsers we have defined above, return if any has been found
		if(!browserName || !filename.startsWith('ERROR')) {
			browserName = null;

			browsers.forEach(browser => {
				if(filename.includes(browser)) {
					browserName = browser;
				}
			});
		}

		// If no browser could be parsed from the filename we return 'unknown_browser' for our placeholders
		return browserName ? browserName : 'unknown_browser';
	}

	/**
	 * Inserts content for our placeholders, placeholder character pattern is a unique word wrapped by two single '%'
	 *
	 * @param {object} replacementLookup
	 * @returns {string}
	 */
	replaceFilenameTemplatePlaceholders(screenshot) {
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