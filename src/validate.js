const { simple } = require('acorn/dist/walk')
const { parse } = require('acorn')

const defaultCallTargets = ['Math', 'parseInt', 'parseFloat']
const defaultIdentifiers = []

  // this is a bit simplistic - just tests the root target name, e.g. Math in the case of Math.floor(1.5) or parseInt in the case of parseInt(1.5)
  const validCallTargets = options => options.allCallTargets || [
  ...defaultCallTargets, 
  ...(options.validCallTargets || [])
]

// this is also much too simplistic - it just ensures that all identifiers are in the list, no contextual validation is done
// acorn/dist/walk.ancestor can be used to get context from ancestor nodes - https://github.com/acornjs/acorn#distwalkjs
const validIdentifiers = (options, ast) => options.allIdentifiers || [
  ...defaultIdentifiers, 
  ...parameterNames(ast), 
  ...validCallTargets(options), 
  ...(options.validIdentifiers || [])
  // ...Object.getOwnPropertyNames(Math) // it seems that the Identifier visitor in the walk function is only called for root identifiers... this probably shouldn't be relied on
]

const validate = module.exports = (ast, options = {}) => {
  return Object.keys(tests).reduce(
    (result, test) => result.valid
      ? tests[test](ast, options)
      : result,
    assert(true)
  )
}

module.exports.parse = (source, options = {}) => {
  try {
    const ast = parse(source)
    return {
      ast,
      result: validate(ast, options)
    }
  } catch(error) {
    return { result: assert(false, `Syntax error: ${error.message}`) }
  }
}

const tests = {
  isSingleStatement: ast => assert(
    ast.body.length === 1, 
    'Expressions can only contain a single statement'
  ),
  
  isExpressionStatement: ast => assert(
    ast.body[0].type === 'ExpressionStatement', 
    'Statements must be expressions'
  ),
  
  isArrowFunctionExpression: ast => assert(
    ast.body[0].expression.type === 'ArrowFunctionExpression', 
    'Expressions must be arrow functions'
  ),

  isValidExpression: ast => assert(
    ast.body[0].expression.body.type === 'UnaryExpression' ||
      ast.body[0].expression.body.type === 'BinaryExpression' ||
      ast.body[0].expression.body.type === 'CallExpression',
    'Expressions must be unary, binary or call expressions'
  ),

  containsValidCalls: (ast, options) => {
    const callTargets = validCallTargets(options)
    const invalidCallTargets = walkAst(
      ast, 
      'CallExpression', 
      (targets, node) => [
        ...targets, 
        rootObjectName(node.callee)
      ]
    ).filter(x => !callTargets.includes(x))

    return assert(invalidCallTargets.length === 0, `Invalid function call targets (${invalidCallTargets.join(', ')}). You can only target the following functions or objects: ${callTargets.join(', ')}`)
  },

  containsValidIdentifiers: (ast, options) => {
    const identifiers = validIdentifiers(options, ast)
    const invalidIdentifiers = walkAst(
      ast,
      'Identifier',
      (allIdentifiers, node) => [...allIdentifiers, node.name]
    ).filter(x => x && !identifiers.includes(x))

    return assert(invalidIdentifiers.length === 0, `Invalid identifiers (${invalidIdentifiers.join(', ')}). Valid identifiers include valid global objects and function parameters`)
  }
}

const walkAst = (ast, nodeType, accumulator, initialValue) => {
  let result = initialValue || []
  simple(ast, {
    [nodeType]: node => result = accumulator(result, node)
  })
  return result
}

const parameterNames = ast => ast.body[0].expression.params.map(x => x.name)
const rootObjectName = node => node.object ? rootObjectName(node.object) || node.name : node.name

const assert = (valid, message) => ({ 
  valid: !!valid, 
  message: valid ? undefined : message 
})
