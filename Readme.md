# mokc.js

mokc.js is a JavaScript mocking library for unit testing and others.

## Platforms

Currently tested on:

  * Chromium 51 - best
  * Firefox Nightly - okay-ish
  * Edge 13    - okay-ish
  * Chrome 49  - okay-ish
  * Firefox 45 - okay-ish
  * Node 5.7   - problematic

mokc.js depends heavily on the ES2015 features like Reflect, Symbol, and Proxy. You must use this library on the latest
JS implementation. Be aware, these features are impossible to be implemented in a transpiler like babel or TypeScript.

Note: You should `use strict` when you use this library to avoid problems.

## Goals

  * Find the limitation of ES2015 Proxies/Reflects
  * Create an easy-to-use, and flexible mocking experience
  * Keep up with the language
  * Minimum impact (Mock objects should have most Symbols invisible; modify as fewer global objects as possible)

## Documentations

  `docs/Tutorial.md`, and `src/test`.

## Todo's

  * CI
  * 100% coverage
  * Find out the minimum platform requirements
  * Publish to npm
  * Better docs
