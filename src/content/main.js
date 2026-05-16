'use strict';

/**
 * Content script entry point.
 * This file is the esbuild entry point; it instantiates App and starts it.
 * src/content/index.js exports the App class for unit testing.
 */
const App = require('./index');
const app = new App();
app.init();
