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
  fw.each(pkgs, resolvePackage(lookups, opts), function (err, pkgs) {
    if (err) return cb(err)
    resolveDependencies(pkgs, opts, lookups, resolve)
  })

  function resolve (err, pkgs) {
    if (err || !pkgs) return cb(err, [])
    cb(null, pkgs.filter(exists))
  }
}

function getCircular (lookups, pkg, opts) {
  return lookups.reduce(function (match, lookup) {
    if (match) return match
    if (pkg.repeated && path.dirname(path.dirname(pkg.root)) === opts.root) {
      return lookup
    }
  }, null)
}

function resolvePackage (lookups, opts) {
  return function (pkg, next) {
    resolve(pkg.name, { basedir: pkg.basedir }, function (err, main) {
      if (err) return next(err)

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

        const circular = getCircular(lookups, pkg, opts)
        if (circular) pkg.circular = true

        next(null, pkg)
      })
    })
  }
}

function resolveDependencies (pkgs, opts, lookups, cb) {
  fw.each(pkgs, function (pkg, next) {
    const deps = readDependencies(pkg.meta, opts)
    if (!deps.length) return next(null, pkg)

    // Overwrite options for the next lookup
    const options = assign({}, opts)
    options.basedir = path.dirname(pkg.manifest)

    // If circular, just continue
    if (pkg.circular) return next(null, pkg)

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

function isRepeated (lookups, name) {
  return lookups.reduce(function (match, pkg) {
    if (match) return match
    if (pkg.name === name) return pkg
  }, null) !== null
}

function mapPackages (pkgs, opts, lookups) {
  return pkgs.map(function (name) {
    const basedir = opts.basedir
    const pkgPath = path.join(basedir, 'node_modules', name, 'package.json')

    const pkg = {
      name: name,
      manifest: pkgPath,
      basedir: basedir,
      repeated: isRepeated(lookups, name)
    }

    // Register package
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
  return assign(defaults, params || {})
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
