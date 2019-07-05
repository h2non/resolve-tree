const fs = require('fs')
const fw = require('fw')
const path = require('path')
const resolve = require('resolve')
const assign = require('object-assign')

// List of packages that doesn't have a main module.
// You can extend the map via mutation, or send a PR to add custom packages.
const resolutions = {
  'babel-runtime': 'babel-runtime/core-js',
  'mz': 'mz/fs',
  'spdx-exceptions': 'spdx-exceptions/index.json',
  'semantic-ui': 'sematic-ui/package.json',
  'timers-ext': 'timers-ext/package.json',
  'unicode': 'unicode/package.json'
}

// Export API
exports.resolutions = resolutions
exports.byName = resolveByName
exports.packages = resolveByName
exports.manifest = manifest
exports.flatten = flatten
exports.flattenMap = flattenMap

function manifest (meta, params, cb) {
  if (typeof params === 'function') { cb = params; params = {} }

  const opts = setOptions(params)
  const deps = readDependencies(meta, opts)

  resolveByName(deps, opts, cb)
}

function resolveByName (names, params, cb, lookups) {
  lookups = lookups || []

  if (typeof params === 'function') { cb = params; params = {} }
  if (typeof names === 'string') names = [ names ]

  const opts = setOptions(params)
  const pkgs = mapPackages(names, opts, lookups)

  lookupPackages(pkgs, opts, lookups, cb)
}

function flatten (tree, buf) {
  return tree
  .filter(exists)
  .reduce(function (buf, pkg) {
    buf.push(pkg)
    if (Array.isArray(pkg.dependencies)) {
      flatten(pkg.dependencies, buf)
    }
    return buf
  }, buf || [])
}

function flattenMap (tree, field) {
  const mapper = typeof field === 'function' ? field : function (pkg) {
    return pkg[field || 'manifest']
  }
  return flatten(tree).filter(notEmpty).map(mapper)
}

function lookupPackages (pkgs, opts, lookups, cb) {
  fw.each(pkgs, resolvePackage(lookups), function (err, pkgs) {
    if (err) return cb(err)
    resolveDependencies(filter(pkgs), opts, lookups, resolve)
  })

  function resolve (err, pkgs) {
    if (err || !pkgs) return cb(err, [])
    cb(null, filter(pkgs))
  }

  function filter (pkgs) {
    return pkgs.filter(exists)
  }
}

function findPredecessor (lookups, pkg) {
  const predecessor = lookups.reduce(function (match, lookup) {
    if (match) return match
    if (lookup === pkg) return null
    if (lookup.root === pkg.root) return lookup
  }, null)

  if (predecessor) {
    return assign({ repeated: true }, predecessor)
  }

  return null
}

function resolvePackage (lookups) {
  return function (pkg, next) {
    const name = resolutions.hasOwnProperty(pkg.name)
      ? resolutions[pkg.name]
      : path.join(pkg.name, 'package.json')

    // Resolve package via require.resolve() algorithm
    resolve(name, { basedir: pkg.basedir }, function (err, main) {
      if (err && pkg.optional) {
        return next()
      }
      if (err) {
        return next(err)
      }
      resolveManifest(main, pkg, lookups, next)
    })
  }
}

function resolveManifest (main, pkg, lookups, next) {
  const base = path.dirname(main)
  findMainfest(base, function (err, manifestPath) {
    if (err) return next(new Error('Cannot find package.json for package: ' + pkg.name))

    const manifest = readJSON(manifestPath)
    if (!manifest) return next(new Error('Bad formed JSON: ' + manifestPath))

    // Attach package required fields
    pkg.main = main
    pkg.manifest = manifestPath
    pkg.root = path.dirname(manifestPath)
    pkg.meta = manifest
    pkg.version = manifest.version

    // Detect if it is a redundant dependency
    const predecessor = findPredecessor(lookups, pkg)
    if (predecessor) return next(null, predecessor)

    next(null, pkg)
  })
}

function resolveDependencies (pkgs, opts, lookups, cb) {
  fw.each(pkgs, function (pkg, next) {
    const deps = readDependencies(pkg.meta, opts)
    if (!deps.length) return next(null, pkg)

    // Overwrite options for the next lookup
    const options = assign({}, opts)
    options.basedir = path.dirname(pkg.manifest)

    // If circular, just continue with it
    if (pkg.repeated) return next(null, pkg)

    // Resolve package child dependencies
    resolveByName(deps, options, childDependencies(pkg, next), lookups)
  }, cb)
}

function childDependencies (pkg, next) {
  return function (err, deps) {
    if (err) return next(err)
    next(err, attachDependencies(pkg, deps))
  }
}

function attachDependencies (pkg, deps) {
  pkg.dependencies = deps.filter(function (pkg) {
    return pkg && typeof pkg === 'object'
  })
  return pkg
}

function findMainfest (base, cb) {
  const file = path.join(base, 'package.json')

  fs.exists(file, function (exists) {
    if (exists) return cb(null, file)

    const parent = path.join(base, '..')
    if (isRoot(parent)) return cb(new Error('Cannot find package.json'))

    // Find package in parent directory
    findMainfest(parent, cb)
  })
}

function readDependencies (manifest, opts) {
  return opts.lookups.reduce(function (buf, type) {
    const deps = Object.keys(manifest[type] || {})
    .map(function (name) {
      return {
        name: name,
        optional: isOptional(manifest, type, name)
      }
    })
    return buf.concat(deps)
  }, [])
}

function isOptional (manifest, type, name) {
  return type === 'optionalDependencies' ||
    Object.prototype.hasOwnProperty.call(manifest.optionalDependencies || {}, name)
}

function mapPackages (pkgs, opts, lookups) {
  return pkgs
  .map(function (pkg) {
    if (typeof pkg === 'string') {
      return { name: pkg }
    }
    return pkg
  })
  .map(function (pkg) {
    const basedir = opts.basedir
    const pkgPath = path.join(basedir, 'node_modules', pkg.name, 'package.json')

    const meta = {
      name: pkg.name,
      manifest: pkgPath,
      basedir: basedir,
      optional: pkg.optional === true
    }

    lookups.push(meta)
    return meta
  })
}

function setOptions (params) {
  const cwd = process.cwd()
  const defaults = {
    lookups: ['dependencies'],
    basedir: cwd,
    root: cwd
  }
  return assign(defaults, params)
}

function readJSON (path) {
  try {
    return require(path)
  } catch (e) {
    return false
  }
}

function isRoot (dir) {
  return path.dirname(dir) === '/'
}

function notEmpty (x) {
  return x != null
}

function exists (pkg) {
  return pkg && pkg.root
}

// ---- Sync ----

// Export Sync API
exports.byNameSync = resolveByNameSync
exports.packagesSync = resolveByNameSync
exports.manifestSync = manifestSync

function manifestSync (meta, params) {
  if (typeof params === 'undefined') { params = {} }

  const opts = setOptions(params)
  const deps = readDependencies(meta, opts)

  return resolveByNameSync(deps, opts)
}

function resolveByNameSync (names, params, lookups) {
  lookups = lookups || []

  if (typeof params === 'undefined') { params = {} }
  if (typeof names === 'string') names = [ names ]

  const opts = setOptions(params)
  const pkgs = mapPackages(names, opts, lookups)

  return lookupPackagesSync(pkgs, opts, lookups)
}

function lookupPackagesSync (pkgs, opts, lookups, cb) {
  pkgs = pkgs.map(function (pkg) {
    return resolvePackageSync(lookups)(pkg)
  })
  const resolved = resolveDependenciesSync(filter(pkgs), opts, lookups)
  return filter(resolved)

  function filter (pkgs) {
    return pkgs.filter(exists)
  }
}

function resolvePackageSync (lookups) {
  return function (pkg) {
    const name = resolutions.hasOwnProperty(pkg.name)
      ? resolutions[pkg.name]
      : path.join(pkg.name, 'package.json')

    // Resolve package via require.resolve() algorithm
    try {
      const main = resolve.sync(name, { basedir: pkg.basedir })
      return resolveManifestSync(main, pkg, lookups)
    } catch (err) {
      if (err && pkg.optional) {
        return
      }
      throw err
    }
  }
}

function resolveManifestSync (main, pkg, lookups) {
  const base = path.dirname(main)
  var manifestPath
  try {
    manifestPath = findMainfestSync(base)
  } catch (err) {
    throw new Error('Cannot find package.json for package: ' + pkg.name)
  }

  const manifest = readJSON(manifestPath)
  if (!manifest) throw new Error('Bad formed JSON: ' + manifestPath)

  // Attach package required fields
  pkg.main = main
  pkg.manifest = manifestPath
  pkg.root = path.dirname(manifestPath)
  pkg.meta = manifest
  pkg.version = manifest.version

  // Detect if it is a redundant dependency
  const predecessor = findPredecessor(lookups, pkg)
  if (predecessor) return predecessor

  return pkg
}

function findMainfestSync (base) {
  const file = path.join(base, 'package.json')

  const exists = fs.existsSync(file)
  if (exists) return file

  const parent = path.join(base, '..')
  if (isRoot(parent)) throw new Error('Cannot find package.json')

  // Find package in parent directory
  return findMainfestSync(parent)
}

function resolveDependenciesSync (pkgs, opts, lookups) {
  return pkgs.map(function (pkg) {
    const deps = readDependencies(pkg.meta, opts)
    if (!deps.length) return pkg

    // Overwrite options for the next lookup
    const options = assign({}, opts)
    options.basedir = path.dirname(pkg.manifest)

    // If circular, just continue with it
    if (pkg.repeated) return pkg

    // Resolve package child dependencies
    const resolved = resolveByNameSync(deps, options, lookups)
    return childDependenciesSync(pkg)(resolved)
  })
}

function childDependenciesSync (pkg) {
  return function (deps) {
    return attachDependencies(pkg, deps)
  }
}
