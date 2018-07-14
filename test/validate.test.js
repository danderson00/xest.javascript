const { parse } = require('../src/validate')

test("invalid javascript causes parse to return invalid result", () => {
  assert('not javascript', false)
})

test("only single expression arrow functions", () => {
  assert('function (x) { return x * 2 }', false)
  assert('x => { return x * 2 }', false)
})

test("only unary, binary or call expressions", () => {
  assert('x => !x', true)
  assert('x => x * 2', true)
  assert('x => Math.floor(x * 2)', true)
  assert('x => Math.floor(x * 2 + 1) + 1', true)
})

test("only predefined or specified call targets", () => {
  assert('x => Math.floor() + Math.ceil() + parseInt() + parseFloat()', true)
  assert('x => fetch()', false)
  assert('x => SomeTarget.parseInt()', false)
  assert('x => SomeTarget.parseInt()', true, { validCallTargets: ['SomeTarget'] })
  assert('x => SomeTarget.parseInt()', false, { validIdentifiers: ['SomeTarget'] })
})

test("only predefined / specified identifiers and expression parameters are allowed", () => {
  assert('x => Math.PI + x + y', false)
  assert('(x, y) => Math.PI + x + y', true)

  assert('(x, y) => x + y + z', false)
  assert('(x, y) => x + y + z', true, { validIdentifiers: ['z'] })

  assert('x => fetch', false)
  assert('x => x + y', false)
})

function assert(expression, result, options) {
  expect(parse(expression, options).result.valid).toBe(result)
}