# resolve-tree

Recursively resolve node.js modules looking in `node_modules` trees.

## Features

- Recursively resolves a node_modules dependency tree
- Proper error reporting if some package cannot be resolved or is missing
- Module lookup algorithm behavies like [`require.resolve`](https://nodejs.org/docs/v0.4.8/api/all.html#all_Together...)
- Produces a detailed abstract dependency tree representation
- Provides convenient helpers that you will love
- Almost dependency free (only uses some stable tiny modules)
- Fast: all the i/o operations are executed asynchronously in parallel

## Installation

```bash
npm install resolve-tree
```

## Usage

```js
const resolve = require('resolve-tree')
const pkg = require('./package.json')

resolve.pkg(pkg, cb)
```

## API

### Supported options

- **basedir** `string` - Base directory path to start lookups. Default to `process.cwd()`.
- **fields** `array<string>` - Dependencies to lookup. Allowed values are: `dependencies`, `devDependencies`, `peerDependencies`.

### resolve.find(pkgs, [ opts, ] cb)

### resolve.flatten(pkgs) => `array<pkg>`

### resolve.flattenByField(pkgs, [ field ]) => `array<string>`

## License

MIT - Tomas Aparicio
