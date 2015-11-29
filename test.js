const test = require('tape')
const resolve = require('.')

test('find', { timeout: 2000 }, function (t) {
  t.plan(2)

  const pkgs = ['foo']
  const opts = { basedir: __dirname + '/fixtures/simple' }

  resolve.find(pkgs, opts, assert)

  function assert (err, paths) {
    t.equal(err, null)
    console.log("Resolutions:", JSON.stringify(paths, null, 2))
    console.log("Flatten:", resolve.flatten(paths))
    console.log("Flatten manifest:", resolve.flattenByField(paths))
    t.equal(typeof Date.now, 'function')
  }
})
