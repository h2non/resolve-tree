const test = require('tape')
const resolve = require('./')

function resolveSimple (assert) {
  const pkgs = ['foo']
  const opts = { basedir: __dirname + '/fixtures/simple' }
  resolve.packages(pkgs, opts, assert)
}

test('find', function (t) {
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

test('manifest', function (t) {
  t.plan(10)

  const manifest = require(__dirname + '/fixtures/simple/package.json')
  const opts = { basedir: __dirname + '/fixtures/simple' }

  resolve.manifest(manifest, opts, function assert (err, deps) {
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

test('flatten', function (t) {
  t.plan(2)

  resolveSimple(function assert (err, deps) {
    t.equal(err, null)
    const list = resolve.flatten(deps)
    t.equal(list.length, 6)
  })
})

test('flattenMap', function (t) {
  t.plan(3)

  resolveSimple(function assert (err, deps) {
    t.equal(err, null)

    const list = resolve.flattenMap(deps)
    t.equal(list.length, 6)
    t.equal(typeof list.shift(), 'string')
  })
})
