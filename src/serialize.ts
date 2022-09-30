import type {
  ExpressionToken,
  HydratedAst,
} from './types';

const quote = (value: string, quotes: 'double' | 'single') => {
  if (quotes === 'double') {
    return `"${value}"`;
  }

  if (quotes === 'single') {
    return `'${value}'`;
  }

  return value;
};

const serializeExpression = (expression: ExpressionToken) => {
  if (expression.type === 'LiteralExpression') {
    if (expression.quoted && typeof expression.value === 'string') {
      return quote(expression.value, expression.quotes);
    }

    return String(expression.value);
  }

  if (expression.type === 'RegexExpression') {
    return String(expression.value);
  }

  if (expression.type === 'RangeExpression') {
    const {
      min,
      max,
      minInclusive,
      maxInclusive,
    } = expression.range;

    return `${minInclusive ? '[' : '{'}${min} TO ${max}${maxInclusive ? ']' : '}'}`;
  }

  throw new Error('Unexpected AST type.');
};

const serializeTagExpression = (ast: HydratedAst) => {
  if (ast.type !== 'TagExpression') {
    throw new Error('Expected a tag expression.');
  }

  const {
    field,
    expression,
    operator,
  } = ast;

  if (field.type === 'ImplicitField') {
    return serializeExpression(expression);
  }

  const left = field.quoted ? quote(field.name, field.quotes) : field.name;

  const patEnd = ' '.repeat(expression.location.start - operator.location.end);

  return left + operator.operator + patEnd + serializeExpression(expression);
};

export const serialize = (ast: HydratedAst): string => {
  if (ast.type === 'ParenthesizedExpression') {
    if (!('location' in ast.expression)) {
      throw new Error('Expected location in expression.');
    }

    if (!ast.location.end) {
      throw new Error('Expected location end.');
    }

    const patStart = ' '.repeat(ast.expression.location.start - (ast.location.start + 1));
    const patEnd = ' '.repeat(ast.location.end - ast.expression.location.end - 1);

    return `(${patStart}${serialize(ast.expression)}${patEnd})`;
  }

  if (ast.type === 'TagExpression') {
    return serializeTagExpression(ast);
  }

  if (ast.type === 'LogicalExpression') {
    const left = serialize(ast.left);
    const operator = ast.operator.type === 'BooleanOperator' ? ` ${ast.operator.operator} ` : ' ';
    const right = serialize(ast.right);

    return `${left}${operator}${right}`;
  }

  if (ast.type === 'UnaryOperator') {
    return (ast.operator === 'NOT' ? 'NOT ' : ast.operator) + serialize(ast.operand);
  }

  throw new Error('Unexpected AST type.');
};
