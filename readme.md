WDIO Errorshot Reporter
==================

> A WebdriverIO plugin to take control over the name of error screenshots.

## Installation

Add the reporter to your dev dependencies:

```bash
npm install wdio-errorshot-reporter --save-dev
```

Instructions on how to install `WebdriverIO` can be found [here](http://webdriver.io/guide/getstarted/install.html).

## Configuration

Following code shows the default wdio test runner configuration. Just add `'errorshot'` as reporter
to the array.

```js
// wdio.conf.js
module.exports = {
  // ...
  reporters: ['dot', 'errorshot'],
  // ...
};
```

To change the name of the errorshots you can use the following placeholders with any text inbetween: 

`'capId'` or `'browser'` or `'browserName'`: Browser capability name, e.g. chrome, firefox

`'timestamp'`: Timestamp of the screenshot

`'parent'`: Parent of the test, e.g. Mocha: describe()

`'title'`: Title of the individual test, e.g. Mocha: it()


```js
// wdio.conf.js
module.exports = {
  // ...
  reporterOptions: {
      errorshotReporter: {
          template: '%capId%_%timestamp%_%parent%-%title%'
      }
  },
  // ...
};
```

For more information on WebdriverIO see the [homepage](http://webdriver.io).
