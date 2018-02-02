// Require modules
const chai = require('chai');
const fs = require('fs');
const mockfs = require('mock-fs');

chai.use(require('chai-string'));
const assert = chai.assert;

/**
 * Mocking and stubbing
 */
const config = {
	screenshotPath: 'errorShots',
	reporterOptions: {
		errorshotReporter: {
			template: '%capId%_%timestamp%_%parent%-%title%'
		}
	}
};

// Mock a date and its string version
const dateObject = new Date();
const dateString = dateObject.toJSON().replace(/:/g, '-');

/**
 * Module initialization
 */
// Require modules that we want to test
const ErrorshotReporter = require('../../lib/wdio-errorshot-reporter.js');
const baseReporter = {};

// Create a new instance of our reporter
const reporter = new ErrorshotReporter(baseReporter, config, {});
const reporterWithEmptyOptions = new ErrorshotReporter(baseReporter, {});
const reporterWithEmptyTemplate = new ErrorshotReporter(baseReporter, {
	screenshotPath: 'errorShots',
	reporterOptions: {errorshotReporter: {template: ''}}
});

/**
 * Core tests entry point
 */
describe('Core :: wdio-errorshot-reporter.js', function() {

	describe('constructor()', function() {
		it('Should initialize properly with real webdriverIO BaseReporter', function() {
			const reporter = new ErrorshotReporter(baseReporter, config, {});
			assert.isTrue(reporter.isInitialized, 'Constructor was not able to reach the last line.');
		});

		it('Should initialize properly with empty object as BaseReporter', function() {
			const reporter = new ErrorshotReporter({}, config, {});
			assert.isTrue(reporter.isInitialized, 'Constructor was not able to reach the last line.');
		});

		it('Should initialize properly without passing the options param and falling back to default', function() {
			const reporter = new ErrorshotReporter(baseReporter, config);
			assert.isTrue(reporter.isInitialized, 'Constructor was not able to reach the last line.');
		});
	});

	describe('getBrowserFromScreenshotName()', function() {
		const filenames = [
			{
				given: 'ERROR_chrome_12345_67890.png',
				expected: 'chrome',
				description: `in default filename format: 'chrome'`
			},
			{
				given: 'ERROR_firefox_12345_67890.png',
				expected: 'firefox',
				description: `in default filename format: 'firefox'`
			},
			{
				given: 'ERROR_custom-browser-name_12345_67890.png',
				expected: 'custom-browser-name',
				description: `in default filename format with custom browser name: 'custom-browser-name'`
			},
			{
				given: 'ERROR_chrome.png',
				expected: 'chrome',
				description: `in non-default filename format: 'chrome'`
			},
			{
				given: 'ERROR_firefox.png',
				expected: 'firefox',
				description: `in non-default filename format: 'firefox'`
			},
			{
				given: 'custom-browser-name_12345_67890.png',
				expected: 'unknown_browser',
				description: `in non-default filename format with custom browser name: 'unknown_browser'`
			},
			{
				given: 'ERROR_asdas.png',
				expected: 'unknown_browser',
				description: `in non-default filename without browser name: 'unknown_browser'`
			},
			{
				given: 'ERROR__12345_67890.png',
				expected: 'unknown_browser',
				description: `in non-default filename without browser name but wrapping underscores: 'unknown_browser'`
			}
		];

		filenames.forEach(function(filename) {
			it(`Should find ${filename.description}`, function() {
				assert.equal(reporter.getBrowserFromScreenshotName(filename.given), filename.expected);
			});
		});
	});

	describe('getOptionFilenameTemplate()', function() {
		it(`should return 'reporterOptions.errorshotReporter.template' from wdio.conf.js`, function() {
			assert.equal(reporter.getOptionFilenameTemplate(), config.reporterOptions.errorshotReporter.template);
		});

		it(`should fallback to default value when 'reporterOptions.errorshotReporter' is not set`, function() {
			assert.equal(reporterWithEmptyOptions.getOptionFilenameTemplate(), reporterWithEmptyOptions.defaultFilenameTemplate);
		});

		it(`should fallback to default value when 'reporterOptions.errorshotReporter.template' is an empty string`, function() {
			assert.equal(reporterWithEmptyTemplate.getOptionFilenameTemplate(), reporterWithEmptyTemplate.defaultFilenameTemplate);
		});
	});

	describe('getPlaceholderLookup()', function() {
		const screenshots = [
			{
				given: {
					filename: 'ERROR_chrome_12345_67890.png',
					time: dateObject,
					parent: 'parent',
					title: 'title'
				},
				expected: {
					capId: 'chrome',
					browser: 'chrome',
					browserName: 'chrome',
					timestamp: dateString,
					parent: 'parent',
					title: 'title'
				},
				description: 'Should be able to find a browser name from default filename format'
			},
			{
				given: {
					filename: 'chrome_12345_67890.png',
					time: dateObject,
					parent: 'parent',
					title: 'title'
				},
				expected: {
					capId: 'chrome',
					browser: 'chrome',
					browserName: 'chrome',
					timestamp: dateString,
					parent: 'parent',
					title: 'title'
				},
				description: 'Should be able to find a browser name from non-default filename format'
			},
			{
				given: {
					filename: 'custom-browser-name_12345_67890.png',
					time: dateObject,
					parent: 'parent',
					title: 'title'
				},
				expected: {
					capId: 'unknown_browser',
					browser: 'unknown_browser',
					browserName: 'unknown_browser',
					timestamp: dateString,
					parent: 'parent',
					title: 'title'
				},
				description: 'Should not be able to find a browser name'
			},
			{
				given: {
					filename: 'ERROR_chrome_12345_67890.png',
					time: dateObject,
					parent: 'parent text here',
					title: 'title text here'
				},
				expected: {
					capId: 'chrome',
					browser: 'chrome',
					browserName: 'chrome',
					timestamp: dateString,
					parent: 'parent-text-here',
					title: 'title-text-here'
				},
				description: 'Should slugify (lowercase and no spaces) parent and title'
			},
		];

		screenshots.forEach(function(test) {
			it(test.description, function() {
				assert.deepEqual(reporter.getPlaceholderLookup(test.given), test.expected);
			});
		});
	});

	describe('buildScreenshotFilepath()', function() {
		const screenshots = [
			{
				given: 'filename.png',
				expected: 'errorShots\\filename.png',
				description: 'Should build the correct path for an image on root level'
			},
			{
				given: 'path\\to\\filename.png',
				expected: 'errorShots\\path\\to\\filename.png',
				description: 'Should build the correct path for an image 2 levels deep'
			}
		];

		screenshots.forEach(function(test) {
			it(test.description, function() {
				assert.equal(reporter.buildScreenshotFilepath(test.given), test.expected);
			});
		});
	});

	describe('getScreenshotName()', function() {
		const screenshot = {
			filename: 'ERROR_chrome_12345_67890.png',
			time: dateObject,
			parent: 'parent',
			title: 'title'
		};

		it(`Should add the '.png' extension to the final string`, function() {
			assert.endsWith(reporter.getScreenshotName(screenshot), '.png');
		});
	});

	describe('handleEventRunnerScreenshot()', function() {
		const screenshots = [
			{
				given: {
					filename: 'ERROR_chrome_12345_1337.png',
					time: dateObject,
					parent: 'parent text here',
					title: 'title text here'
				},
				expected: true,
				description: 'Should not fail and return true'
			},
			{
				given: { filename: 'ERROR_corrupted_screenshot_data.png' },
				expected: false,
				description: 'Should not do anything and return false'
			}
		];

		screenshots.forEach(function(test) {
			it(test.description, function() {
				// Mock the fs for every screenshot as it could have a different name
				mockfs({
					'errorShots': {
						[test.given.filename]: new Buffer([8, 6, 7, 5, 3, 0, 9])
					}
				});

				// Execute the method we want to test
				const result = reporter.handleEventRunnerScreenshot(test.given);

				// Restore the filesystem for the rest of the suite
				mockfs.restore();

				// Finally we can make assertions
				assert.equal(result, test.expected);
			});
		});

	});

	describe('renameScreenshot()', function() {
		beforeEach(function() {
			mockfs({
				'path/old/old.png':  new Buffer([8, 6, 7, 5, 3, 0, 9]),
				'path/new': {}
			});
		});

		afterEach(function () {
			mockfs.restore();
		});

		it(`Should not throw an error`, function(done) {
			reporter.renameScreenshot('path/old/old.png', 'path/new/new.png', err => {
				assert.isNull(err);
				done();
			});
		});

		it(`Should rename a screenshot and check if it exists in the new path`, function(done) {
			reporter.renameScreenshot('path/old/old.png', 'path/new/new.png', err => {
				assert.isNull(err);

				fs.exists('path/new/new.png', exists => {
					assert.isTrue(exists);
					done();
				});
			});
		});
	});

	describe('replaceFilenameTemplatePlaceholders()', function() {
		const config = {
			screenshotPath: 'errorShots',
			reporterOptions: {
				errorshotReporter: {
					template: '%capId%_%notexisting%_%parent%-%title%'
				}
			}
		};
		const reporterWithNotExistingPlaceholder = new ErrorshotReporter(baseReporter, config, {});

		const screenshots = [
			{
				given: {
					filename: 'ERROR_chrome_12345_67890.png',
					time: dateObject,
					parent: 'parent text here',
					title: 'title text here'
				},
				expected: `chrome_${dateString}_parent-text-here-title-text-here`,
				reporter: reporter,
				description: 'Should slugify and replace all placeholders'
			},
			{
				given: {
					filename: 'ERROR_chrome_12345_67890.png',
					time: dateObject,
					parent: 'parent',
					title: 'title'
				},
				expected: `chrome_%notexisting%_parent-title`,
				reporter: reporterWithNotExistingPlaceholder,
				description: `Should not touch not existing placeholders`
			}
		];

		screenshots.forEach(function(test) {
			it(test.description, function() {
				assert.equal(test.reporter.replaceFilenameTemplatePlaceholders(test.given), test.expected);
			});
		});
	});

	describe('screenshotHasRequiredProperties()', function() {
		it(`Should pass the required properties check`, function() {
			assert.isTrue(reporter.screenshotHasRequiredProperties({
				filename: 'ERROR_chrome_12345_67890.png',
				time: dateObject,
				parent: 'parent text here',
				title: 'title text here'
			}));
		});

		it(`Should fail the required properties check`, function() {
			assert.isFalse(reporter.screenshotHasRequiredProperties({}));
		});
	});
});