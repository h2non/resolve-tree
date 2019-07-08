const test = require('tape')
const resolve = require('./')

function resolveSimple (assert) {
  const pkgs = ['foo']
  const opts = { basedir: __dirname + '/fixtures/simple' }
  try {
    assert(null, resolve.packagesSync(pkgs, opts))
  } catch (err) {
    assert(err)
  }
}

test('find sync', function (t) {
  t.plan(10)

  resolveSimple(function assert (err, deps) {
    t.equal(err, null)
    t.equal(deps.length, 1)

    const foo = deps.shift()
    t.equal(foo.name, 'foo')
    t.equal(typeof foo.manifest, 'string')
    t.equal(typeof foo.basedir, 'string')
    t.equal(typeof foo.main, 'string')
    t.equal(typeof foo.root, 'string')

    t.equal(foo.meta.name, 'foo')
    t.equal(typeof foo.meta.dependencies, 'object')
    t.equal(foo.dependencies.length, 3)
  })
})

test('manifest sync', function (t) {
  t.plan(9)

  const manifest = require(__dirname + '/fixtures/simple/package.json')
  const opts = { basedir: __dirname + '/fixtures/simple' }

  const deps = resolve.manifestSync(manifest, opts)
  t.equal(deps.length, 1)

  const foo = deps.shift()
  t.equal(foo.name, 'foo')
  t.equal(typeof foo.manifest, 'string')
  t.equal(typeof foo.basedir, 'string')
  t.equal(typeof foo.main, 'string')
  t.equal(typeof foo.root, 'string')

  t.equal(foo.meta.name, 'foo')
  t.equal(typeof foo.meta.dependencies, 'object')
  t.equal(foo.dependencies.length, 3)
})

test('optional dependencies sync', function (t) {
  t.plan(13)

  const manifest = require(__dirname + '/fixtures/optional/package.json')
  const opts = {
    lookups: ['dependencies', 'optionalDependencies'],
    basedir: __dirname + '/fixtures/optional'
  }

  const deps = resolve.manifestSync(manifest, opts)
  t.equal(deps.length, 3)

  const foo = deps.shift()
  t.equal(foo.name, 'foo')
  t.equal(typeof foo.manifest, 'string')
  t.equal(typeof foo.basedir, 'string')
  t.equal(typeof foo.main, 'string')
  t.equal(typeof foo.root, 'string')
  t.equal(foo.meta.name, 'foo')

  const optional = deps.shift()
  t.equal(optional.name, 'optional')
  t.equal(typeof optional.manifest, 'string')
  t.equal(typeof optional.basedir, 'string')
  t.equal(typeof optional.main, 'string')
  t.equal(typeof optional.root, 'string')
  t.equal(optional.meta.name, 'optional')
})
