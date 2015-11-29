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

function resolveByName (names, params, cb) {
  if (typeof params === 'function') { cb = params; params = {} }
  if (typeof names === 'string') names = [ names ]

  const opts = setOptions(params)
  const pkgs = mapPackages(names, opts)

  lookupPackages(pkgs, opts, cb)
}

function flatten (tree, buf) {
  return tree.reduce(function (buf, pkg) {
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
  return flatten(tree).map(mapper)
}

function lookupPackages (pkgs, opts, cb) {
  fw.eachSeries(pkgs, resolvePackage, function (err, pkgs) {
    if (err) return cb(err)
    resolveDependencies(pkgs, opts, cb)
  })
}

function resolvePackage (pkg, cb) {
  resolve(pkg.name, { basedir: pkg.basedir }, function (err, main) {
    if (err) return cb(err)

    const base = path.dirname(main)
    findMainfest(base, function (err, manifestPath) {
      if (err) return cb(new Error('Cannot find package.json for package: ' + pkg.name))

      const manifest = readJSON(manifestPath)
      if (!manifest) return cb(new Error('Bad formed JSON: ' + manifestPath))

      // Attach package required fields
      pkg.main = main
      pkg.manifest = manifestPath
      pkg.root = path.dirname(manifestPath)
      pkg.meta = manifest

      cb(null, pkg)
    })
  })
}

function resolveDependencies (pkgs, opts, cb) {
  fw.eachSeries(pkgs, function (pkg, next) {
    const deps = readDependencies(pkg.meta, opts)
    if (!deps.length) return next(null, pkg)

    // Overwrite options for the next lookup
    const options = assign({}, opts)
    options.basedir = path.dirname(pkg.manifest)

    // Resolve package child dependencies
    resolveByName(deps, options, childDependencies(pkg, next))
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

function mapPackages (pkgs, opts) {
  return pkgs.map(function (name) {
    const basedir = opts.basedir
    const pkgPath = path.join(basedir, 'node_modules', name, 'package.json')

    return {
      name: name,
      manifest: pkgPath,
      basedir: basedir
    }
  })
}

function setOptions (params) {
  const defaults = {
    lookups: ['dependencies'],
    basedir: process.cwd()
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
