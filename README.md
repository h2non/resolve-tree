# resolve-tree [![Build Status](https://api.travis-ci.org/h2non/resolve-tree.svg?branch=master&style=flat)](https://travis-ci.org/h2non/resolve-tree) [![Code Climate](https://codeclimate.com/github/h2non/resolve-tree/badges/gpa.svg)](https://codeclimate.com/github/h2non/resolve-tree) [![NPM](https://img.shields.io/npm/v/resolve-tree.svg)](https://www.npmjs.org/package/resolve-tree) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com)

Recursively resolve node.js modules and its dependencies looking in `node_modules` trees.

The module resolution algorithm behavies like [`require.resolve`](https://nodejs.org/docs/v0.4.8/api/all.html#all_Together...) in node.js.
It also mimics the recursive module resolution behavior used by `npm`.

## Features

- Recursively resolves a node_modules dependency tree
- Proper error reporting if some package cannot be resolved or is missing
- Module lookup algorithm behavies like [`require.resolve`](https://nodejs.org/docs/v0.4.8/api/all.html#all_Together...)
- Produces a detailed abstract dependency tree representation
- Provides convenient helpers that you will love
- Almost dependency free (only uses some stable tiny modules)
- Fast: all the I/O operations are executed asynchronously in parallel

## Installation

```bash
npm install resolve-tree
```

## Usage

```js
const resolve = require('resolve-tree')
const pkgs = ['foo', 'bar']

const opts = {
  basedir: process.cwd(),
  lookups: ['dependencies', 'devDependencies']
}

resolve.find(pkgs, opts, function (err, tree) {
  if (err) return console.error(err)

  const json = JSON.stringify(tree, null, 2)
  console.log(json)
})
```

The resolved dependency tree serialized to JSON looks like this:
```json
[{
  "name": "foo",
  "manifest": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/foo/package.json",
  "basedir": "/Users/h2non/Projects/resolve-tree/fixtures/simple",
  "main": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/foo/index.js",
  "root": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/foo",
  "meta": {
    "name": "foo",
    "dependencies": {
      "baz": "~0.1.0",
      "bar": "~0.1.0",
      "quz": "~0.1.0"
    }
  },
  "dependencies": [{
    "name": "baz",
    "manifest": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/baz/package.json",
    "basedir": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/foo",
    "main": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/baz/index.js",
    "root": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/baz",
    "meta": {
      "name": "baz"
    }
  }, {
    "name": "bar",
    "manifest": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/bar/package.json",
    "basedir": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/foo",
    "main": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/bar/index.js",
    "root": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/bar",
    "meta": {
      "name": "bar",
      "dependencies": {
        "baz": "~0.1.0"
      }
    },
    "dependencies": [{
      "name": "baz",
      "manifest": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/baz/package.json",
      "basedir": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/bar",
      "main": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/baz/index.js",
      "root": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/baz",
      "meta": {
        "name": "baz"
      }
    }]
  }, {
    "name": "quz",
    "manifest": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/foo/node_modules/quz/package.json",
    "basedir": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/foo",
    "main": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/foo/node_modules/quz/index.js",
    "root": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/foo/node_modules/quz",
    "meta": {
      "name": "quz",
      "dependencies": {
        "baz": "~0.0.1"
      }
    },
    "dependencies": [{
      "name": "baz",
      "manifest": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/foo/node_modules/quz/node_modules/baz/package.json",
      "basedir": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/foo/node_modules/quz",
      "main": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/foo/node_modules/quz/node_modules/baz/index.js",
      "root": "/Users/h2non/Projects/resolve-tree/fixtures/simple/node_modules/foo/node_modules/quz/node_modules/baz",
      "meta": {
        "name": "baz",
        "version": "0.0.1"
      }
    }]
  }]
}]
```

## API

### Supported options

- **basedir** `string` - Base directory path to start lookups. Default to `process.cwd()`.
- **lookups** `array<string>` - Dependency types to lookup. Allowed values are: `dependencies`, `devDependencies`, `peerDependencies`. Defaults to: `dependencies`

### resolve.packages(names, [ opts, ] cb)
Alias: `byName()`

Find and resolve modules and its dependencies recursively looking by package name.

### resolve.manifest(pkgManifest, [ opts, ] cb)

Resolve dependencies recursively reading the `package.json` metadata.

### resolve.flatten(tree) => `array<pkg>`

Flatten dependency tree to one level structure tree.

### resolve.flattenMap(tree, [ field ]) => `array<mixed>`

Flatten the given dependency tree mapping by dependency value field or custom mapper function.

## License

MIT - Tomas Aparicio
