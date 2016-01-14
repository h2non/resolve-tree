const fs = require('fs')
const fw = require('fw')
const path = require('path')
const resolve = require('resolve')
const assign = require('object-assign')

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
    resolveDependencies(pkgs, opts, lookups, resolve)
  })

  function resolve (err, pkgs) {
    if (err || !pkgs) return cb(err, [])
    cb(null, pkgs.filter(exists))
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
    resolve(pkg.name, { basedir: pkg.basedir }, function (err, main) {
      if (err) return next(err)
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
    return buf.concat(deps)
  }, [])
}

function mapPackages (pkgs, opts, lookups) {
  return pkgs.map(function (name) {
    const basedir = opts.basedir
    const pkgPath = path.join(basedir, 'node_modules', name, 'package.json')

    const pkg = {
      name: name,
      manifest: pkgPath,
      basedir: basedir
    }

    lookups.push(pkg)
    return pkg
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
