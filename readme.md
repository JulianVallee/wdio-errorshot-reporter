WDIO Errorshot Reporter
==================

> A [WebdriverIO](http://webdriver.io/) plugin to take control over the name of error screenshots.


## Installation

Add the reporter to your dev dependencies:

```bash
npm install wdio-errorshot-reporter --save-dev
```

## Configuration

### Including the reporter

Require and add the reporter to your wdio.conf.js:

```js
// We need to require the reporter until I have managed to get it included in WDIO
const errorshot = require('wdio-errorshot-reporter');

// wdio.conf.js
module.exports = {
  // ...
  reporters: ['dot', errorshot],
  // ...
};
```
### Changing the screenshot name

To change the name of your screenshots you can use static text and placeholders: 

```js
// wdio.conf.js
module.exports = {
  // ...
  reporterOptions: {
      errorshotReporter: {
          template: 'foobar-%capId%_%timestamp%_%parent%-%title%'
      }
  },
  // ...
};
```

The following placeholders can be used:

`'capId'` or `'browser'` or `'browserName'`: Browser capability name, e.g. chrome, firefox

`'timestamp'`: Timestamp of the screenshot

`'parent'`: Parent name of the test, e.g. Mocha: describe()

`'title'`: Title of the individual test, e.g. Mocha: it()

## Executing Tests

To run the unit tests and verify everything works as expected you can run:

```
npm run test
```

## Contributing

If you find any issues while using the package feel free to open an issue or contribute 
to existing issues.
