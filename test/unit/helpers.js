/* eslint-disable no-console */

// Require modules
const assert = require('chai').assert;
const log = require('../../lib/helpers/log.js');

describe('helpers ::', function () {
	describe('log()', function() {

		let hasCalledLog = false;

		const consoleLogOriginal = console.log;
		const consoleLogMock = () => { hasCalledLog = true; };

		it(`Should call the internal log helper`, function() {
			// Mock console.log()
			console.log = consoleLogMock;

			// Actually call our logger
			log('foo bar');

			// Reset console.log()
			console.log = consoleLogOriginal;

			// Mock should have detected call
			assert.isTrue(hasCalledLog, `Mock for console.log() did not register a call.`);
		});
	});

	describe('slugify()', function() {
		const slugify = require('../../lib/helpers/slugify.js');

		const tests = [
			{ given: 'lorem ipsum', expected: 'lorem-ipsum', description: 'Should add dashes between spaced words' },
			{ given: 'lorem   ipsum', expected: 'lorem-ipsum', description: 'Should add dashed for multiple spaces' },
			{ given: 'lOrEm IpSuM', expected: 'lorem-ipsum', description: 'Should lowercase everything' },
		];

		tests.forEach(function(test) {
			it(test.description, function() {
				assert.equal(slugify(test.given), test.expected);
			});
		});
	});
});
