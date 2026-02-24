'use strict';

/**
 * Validation Rule Engine
 *
 * Salesforce互換のバリデーションルールを評価する。
 * 式言語のトークナイザ、再帰下降パーサー、評価器を含む。
 */

function tokenizeFormula(formula) {
  const tokens = []; let i = 0;
  while (i < formula.length) {
    if (/\s/.test(formula[i])) { i++; continue; }
    if (formula[i] === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
    if (formula[i] === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }
    if (formula[i] === ',') { tokens.push({ type: 'COMMA' }); i++; continue; }
    if (formula[i] === "'" || formula[i] === '"') {
      const q = formula[i]; let s = ''; i++;
      while (i < formula.length && formula[i] !== q) { if (formula[i] === '\\') { i++; s += formula[i] || ''; } else s += formula[i]; i++; }
      i++; tokens.push({ type: 'STRING', value: s }); continue;
    }
    if (/[0-9]/.test(formula[i]) || (formula[i] === '-' && i + 1 < formula.length && /[0-9]/.test(formula[i + 1]) && (tokens.length === 0 || ['LPAREN', 'COMMA', 'OP'].includes(tokens[tokens.length - 1].type)))) {
      let n = ''; if (formula[i] === '-') { n = '-'; i++; }
      while (i < formula.length && /[0-9.]/.test(formula[i])) { n += formula[i]; i++; }
      tokens.push({ type: 'NUMBER', value: parseFloat(n) }); continue;
    }
    if (/[a-zA-Z_]/.test(formula[i])) {
      let id = '';
      while (i < formula.length && /[a-zA-Z0-9_.]/.test(formula[i])) { id += formula[i]; i++; }
      const upper = id.toUpperCase();
      if (upper === 'TRUE') tokens.push({ type: 'BOOLEAN', value: true });
      else if (upper === 'FALSE') tokens.push({ type: 'BOOLEAN', value: false });
      else if (upper === 'NULL') tokens.push({ type: 'NULL', value: null });
      else tokens.push({ type: 'IDENTIFIER', value: id });
      continue;
    }
    const ops2 = ['!=', '<=', '>=', '==', '&&', '||'];
    if (i + 1 < formula.length && ops2.includes(formula[i] + formula[i + 1])) {
      tokens.push({ type: 'OP', value: formula[i] + formula[i + 1] }); i += 2; continue;
    }
    if ('=<>!+-*/&'.includes(formula[i])) { tokens.push({ type: 'OP', value: formula[i] }); i++; continue; }
    i++;
  }
  tokens.push({ type: 'EOF' });
  return tokens;
}

function parseValidationFormula(formula) {
  const tokens = tokenizeFormula(formula);
  let pos = 0;
  function peek() { return tokens[pos]; }
  function advance() { return tokens[pos++]; }
  function parseExpr() {
    let left = parsePrimary();
    while (peek().type === 'OP') {
      const op = advance().value;
      const right = parsePrimary();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }
  function parsePrimary() {
    const t = peek();
    if (t.type === 'NUMBER') { advance(); return { type: 'literal', value: t.value }; }
    if (t.type === 'STRING') { advance(); return { type: 'literal', value: t.value }; }
    if (t.type === 'BOOLEAN') { advance(); return { type: 'literal', value: t.value }; }
    if (t.type === 'NULL') { advance(); return { type: 'literal', value: null }; }
    if (t.type === 'LPAREN') { advance(); const e = parseExpr(); if (peek().type === 'RPAREN') advance(); return e; }
    if (t.type === 'IDENTIFIER') {
      const name = advance().value;
      if (peek().type === 'LPAREN') {
        advance(); // consume (
        const args = [];
        while (peek().type !== 'RPAREN' && peek().type !== 'EOF') {
          args.push(parseExpr());
          if (peek().type === 'COMMA') advance();
        }
        if (peek().type === 'RPAREN') advance();
        return { type: 'call', name: name.toUpperCase(), args };
      }
      return { type: 'field', name };
    }
    if (t.type === 'OP' && t.value === '-') { advance(); return { type: 'unary', op: '-', expr: parsePrimary() }; }
    advance();
    return { type: 'literal', value: null };
  }
  return parseExpr();
}

function evaluateFormula(ast, record) {
  if (!ast) return null;
  switch (ast.type) {
    case 'literal': return ast.value;
    case 'field': return record[ast.name];
    case 'unary': return ast.op === '-' ? -(evaluateFormula(ast.expr, record) || 0) : evaluateFormula(ast.expr, record);
    case 'binary': {
      const l = evaluateFormula(ast.left, record), r = evaluateFormula(ast.right, record);
      switch (ast.op) {
        case '+': return (l || 0) + (r || 0);
        case '-': return (l || 0) - (r || 0);
        case '*': return (l || 0) * (r || 0);
        case '/': return r ? (l || 0) / r : 0;
        case '&': return String(l || '') + String(r || '');
        case '==': case '=': return l == r;
        case '!=': return l != r;
        case '<': return l < r;
        case '>': return l > r;
        case '<=': return l <= r;
        case '>=': return l >= r;
        case '&&': return l && r;
        case '||': return l || r;
        default: return null;
      }
    }
    case 'call': {
      const fn = ast.name;
      const args = ast.args;
      switch (fn) {
        case 'ISBLANK': case 'ISNULL': { const v = evaluateFormula(args[0], record); return v === null || v === undefined || v === ''; }
        case 'ISPICKVAL': { const fv = evaluateFormula(args[0], record); const pv = evaluateFormula(args[1], record); return fv === pv; }
        case 'AND': return args.every(a => evaluateFormula(a, record));
        case 'OR': return args.some(a => evaluateFormula(a, record));
        case 'NOT': return !evaluateFormula(args[0], record);
        case 'IF': return evaluateFormula(args[0], record) ? evaluateFormula(args[1], record) : evaluateFormula(args[2], record);
        case 'TEXT': return String(evaluateFormula(args[0], record) || '');
        case 'LEN': return String(evaluateFormula(args[0], record) || '').length;
        case 'BEGINS': return String(evaluateFormula(args[0], record) || '').startsWith(String(evaluateFormula(args[1], record) || ''));
        case 'CONTAINS': return String(evaluateFormula(args[0], record) || '').includes(String(evaluateFormula(args[1], record) || ''));
        case 'LOWER': return String(evaluateFormula(args[0], record) || '').toLowerCase();
        case 'UPPER': return String(evaluateFormula(args[0], record) || '').toUpperCase();
        case 'TRIM': return String(evaluateFormula(args[0], record) || '').trim();
        case 'ABS': return Math.abs(evaluateFormula(args[0], record) || 0);
        case 'MAX': return Math.max(...args.map(a => evaluateFormula(a, record) || 0));
        case 'MIN': return Math.min(...args.map(a => evaluateFormula(a, record) || 0));
        case 'FLOOR': return Math.floor(evaluateFormula(args[0], record) || 0);
        case 'CEILING': return Math.ceil(evaluateFormula(args[0], record) || 0);
        case 'ROUND': return Math.round(evaluateFormula(args[0], record) || 0);
        case 'VALUE': return Number(evaluateFormula(args[0], record)) || 0;
        case 'TODAY': return new Date().toISOString().slice(0, 10);
        case 'NOW': return new Date().toISOString();
        default: return null;
      }
    }
    default: return null;
  }
}

function validateRecord(objectName, record, config) {
  const allObjects = [...(config.standardObjects || []), ...(config.objects || [])];
  const objDef = allObjects.find(o => o.apiName === objectName);
  if (!objDef || !objDef.validationRules) return [];
  const errors = [];
  for (const rule of objDef.validationRules) {
    if (rule.active === false) continue;
    try {
      const ast = parseValidationFormula(rule.errorConditionFormula);
      if (evaluateFormula(ast, record)) {
        errors.push(rule.errorMessage || 'Validation error');
      }
    } catch (e) { /* skip unparseable rules */ }
  }
  return errors;
}

module.exports = { tokenizeFormula, parseValidationFormula, evaluateFormula, validateRecord };
