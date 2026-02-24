'use strict';

// =============================================================================
// SOQL Recursive Descent Parser
// =============================================================================
// Self-contained module: no external dependencies.
// Exports: tokenizeSOQL, SOQLParser, evaluateWhereExpr, resolveDateLiteral
// =============================================================================

// ---------------------------------------------------------------------------
// Token Types
// ---------------------------------------------------------------------------
const TT = {
  KEYWORD: 'KW',
  IDENT:   'ID',
  STRING:  'STR',
  NUMBER:  'NUM',
  DATE_LIT:'DL',
  OP:      'OP',
  LPAREN:  '(',
  RPAREN:  ')',
  COMMA:   ',',
  DOT:     '.',
  FUNC:    'FN',
  BOOL:    'BOOL',
  NULL:    'NULL',
  EOF:     'EOF'
};

// ---------------------------------------------------------------------------
// Keyword & Date-literal tables
// ---------------------------------------------------------------------------
const KEYWORDS = new Set([
  'SELECT','FROM','WHERE','AND','OR','NOT','IN','LIKE',
  'ORDER','BY','GROUP','HAVING','LIMIT','OFFSET',
  'ASC','DESC','NULLS','FIRST','LAST',
  'INCLUDES','EXCLUDES'
]);

const AGGREGATE_FUNCS = new Set([
  'COUNT','SUM','AVG','MAX','MIN','COUNT_DISTINCT'
]);

// Date-literal base names (no parameter) and parameterised prefixes
const DATE_LITERAL_EXACT = new Set([
  'TODAY','YESTERDAY','TOMORROW',
  'THIS_MONTH','LAST_MONTH','NEXT_MONTH',
  'THIS_QUARTER','LAST_QUARTER','NEXT_QUARTER',
  'THIS_YEAR','LAST_YEAR','NEXT_YEAR'
]);

const DATE_LITERAL_PARAM_RE =
  /^(LAST_N_DAYS|NEXT_N_DAYS|LAST_N_MONTHS|NEXT_N_MONTHS|LAST_N_QUARTERS|NEXT_N_QUARTERS|LAST_N_YEARS|NEXT_N_YEARS):(\d+)$/;

// ---------------------------------------------------------------------------
// tokenizeSOQL(query) → Token[]
// ---------------------------------------------------------------------------
function tokenizeSOQL(query) {
  const tokens = [];
  let i = 0;
  const len = query.length;

  function ch()  { return i < len ? query[i] : ''; }
  function peekCh(offset) { return (i + offset) < len ? query[i + offset] : ''; }

  while (i < len) {
    // ---- skip whitespace ----
    if (/\s/.test(ch())) { i++; continue; }

    const startPos = i;

    // ---- single-char tokens ----
    if (ch() === '(') { tokens.push({ type: TT.LPAREN, value: '(', pos: startPos }); i++; continue; }
    if (ch() === ')') { tokens.push({ type: TT.RPAREN, value: ')', pos: startPos }); i++; continue; }
    if (ch() === ',') { tokens.push({ type: TT.COMMA,  value: ',', pos: startPos }); i++; continue; }
    if (ch() === '.') { tokens.push({ type: TT.DOT,    value: '.', pos: startPos }); i++; continue; }
    if (ch() === '*') { tokens.push({ type: TT.IDENT,  value: '*', pos: startPos }); i++; continue; }

    // ---- operators (two-char first, then one-char) ----
    if (ch() === '!' && peekCh(1) === '=') { tokens.push({ type: TT.OP, value: '!=', pos: startPos }); i += 2; continue; }
    if (ch() === '<' && peekCh(1) === '=') { tokens.push({ type: TT.OP, value: '<=', pos: startPos }); i += 2; continue; }
    if (ch() === '>' && peekCh(1) === '=') { tokens.push({ type: TT.OP, value: '>=', pos: startPos }); i += 2; continue; }
    if (ch() === '<') { tokens.push({ type: TT.OP, value: '<', pos: startPos }); i++; continue; }
    if (ch() === '>') { tokens.push({ type: TT.OP, value: '>', pos: startPos }); i++; continue; }
    if (ch() === '=') { tokens.push({ type: TT.OP, value: '=', pos: startPos }); i++; continue; }

    // ---- string literal ----
    if (ch() === "'") {
      i++; // skip opening quote
      let str = '';
      while (i < len) {
        if (ch() === '\\' && peekCh(1) === "'") {
          str += "'";
          i += 2;
        } else if (ch() === "'") {
          break;
        } else {
          str += ch();
          i++;
        }
      }
      if (i >= len) {
        throw new Error(`Unterminated string literal starting at position ${startPos}`);
      }
      i++; // skip closing quote
      tokens.push({ type: TT.STRING, value: str, pos: startPos });
      continue;
    }

    // ---- numbers (including negative) ----
    if (/\d/.test(ch()) || (ch() === '-' && /\d/.test(peekCh(1)))) {
      // Negative sign: only treat as number if the previous meaningful token is an
      // operator, KEYWORD, comma, LPAREN, or there are no previous tokens (i.e.
      // this is at the very start or right after a structural token).
      let isNeg = false;
      if (ch() === '-') {
        const prev = tokens.length > 0 ? tokens[tokens.length - 1] : null;
        if (!prev || prev.type === TT.OP || prev.type === TT.KEYWORD ||
            prev.type === TT.COMMA || prev.type === TT.LPAREN) {
          isNeg = true;
        } else {
          // Not a negative number — skip and let caller handle error
          throw new Error(`Unexpected character '-' at position ${startPos}`);
        }
      }
      let numStr = '';
      if (isNeg) { numStr += '-'; i++; }
      while (i < len && /[\d.]/.test(ch())) { numStr += ch(); i++; }
      tokens.push({ type: TT.NUMBER, value: Number(numStr), pos: startPos });
      continue;
    }

    // ---- identifiers / keywords / date literals / booleans / null / functions ----
    if (/[a-zA-Z_]/.test(ch())) {
      let word = '';
      while (i < len && /[a-zA-Z0-9_]/.test(ch())) { word += ch(); i++; }

      const upper = word.toUpperCase();

      // Check for parameterised date literal: LAST_N_DAYS:7 etc.
      if (i < len && ch() === ':') {
        // Possibly a parameterised date literal
        const colonPos = i;
        let afterColon = '';
        let j = i + 1;
        while (j < len && /\d/.test(query[j])) { afterColon += query[j]; j++; }
        const candidate = upper + ':' + afterColon;
        if (afterColon.length > 0 && DATE_LITERAL_PARAM_RE.test(candidate)) {
          i = j;
          tokens.push({ type: TT.DATE_LIT, value: candidate, pos: startPos });
          continue;
        }
        // Not a date literal — fall through and treat as normal identifier/keyword
      }

      // Exact date literals
      if (DATE_LITERAL_EXACT.has(upper)) {
        tokens.push({ type: TT.DATE_LIT, value: upper, pos: startPos });
        continue;
      }

      // Booleans
      if (upper === 'TRUE' || upper === 'FALSE') {
        tokens.push({ type: TT.BOOL, value: upper === 'TRUE', pos: startPos });
        continue;
      }

      // null
      if (upper === 'NULL') {
        tokens.push({ type: TT.NULL, value: null, pos: startPos });
        continue;
      }

      // Aggregate functions: followed by '('
      if (AGGREGATE_FUNCS.has(upper)) {
        // Look ahead (skip whitespace) for '('
        let k = i;
        while (k < len && /\s/.test(query[k])) k++;
        if (k < len && query[k] === '(') {
          tokens.push({ type: TT.FUNC, value: upper, pos: startPos });
          continue;
        }
      }

      // Keywords
      if (KEYWORDS.has(upper)) {
        tokens.push({ type: TT.KEYWORD, value: upper, pos: startPos });
        continue;
      }

      // Plain identifier
      tokens.push({ type: TT.IDENT, value: word, pos: startPos });
      continue;
    }

    throw new Error(`Unexpected character '${ch()}' at position ${i}`);
  }

  tokens.push({ type: TT.EOF, value: null, pos: i });
  return tokens;
}

// ---------------------------------------------------------------------------
// SOQLParser
// ---------------------------------------------------------------------------
class SOQLParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  // ---- helpers ----

  peek() {
    return this.tokens[this.pos];
  }

  advance() {
    const tok = this.tokens[this.pos];
    this.pos++;
    return tok;
  }

  expect(type, value) {
    const tok = this.peek();
    if (tok.type !== type || (value !== undefined && tok.value !== value)) {
      const got = tok.value !== null ? `'${tok.value}'` : tok.type;
      const expected = value !== undefined ? `'${value}'` : type;
      throw new Error(`Expected ${expected} but got ${got} at position ${tok.pos}`);
    }
    return this.advance();
  }

  match(type, value) {
    const tok = this.peek();
    if (tok.type !== type) return false;
    if (value !== undefined && tok.value !== value) return false;
    return true;
  }

  matchAdvance(type, value) {
    if (this.match(type, value)) return this.advance();
    return null;
  }

  // ---- top-level parse ----

  parse() {
    this.expect(TT.KEYWORD, 'SELECT');

    const fields = this.parseSelectFields();

    this.expect(TT.KEYWORD, 'FROM');
    const from = this.parseFrom();

    const where    = this.parseWhere();
    const groupBy  = this.parseGroupBy();
    const having   = this.parseHaving();
    const orderBy  = this.parseOrderBy();
    const limit    = this.parseLimit();
    const offset   = this.parseOffset();

    // Determine flags
    const isCount = fields.length === 1 &&
      fields[0].type === 'aggregate' && fields[0].func === 'COUNT' && fields[0].field === null;

    const isAggregate = fields.some(f => f.type === 'aggregate');

    // Expect end
    if (!this.match(TT.EOF) && !this.match(TT.RPAREN)) {
      const tok = this.peek();
      throw new Error(`Unexpected token '${tok.value}' at position ${tok.pos}`);
    }

    return {
      type: 'select',
      fields,
      from,
      where,
      groupBy,
      having,
      orderBy,
      limit,
      offset,
      isCount,
      isAggregate
    };
  }

  // ---- SELECT field list ----

  parseSelectFields() {
    const fields = [];
    fields.push(this._parseOneField());
    while (this.matchAdvance(TT.COMMA)) {
      fields.push(this._parseOneField());
    }
    return fields;
  }

  _parseOneField() {
    // Subquery: ( SELECT ... FROM RelName )
    if (this.match(TT.LPAREN)) {
      // Peek inside: is the next token SELECT?
      const nextIdx = this.pos + 1;
      if (nextIdx < this.tokens.length && this.tokens[nextIdx].type === TT.KEYWORD && this.tokens[nextIdx].value === 'SELECT') {
        return this.parseSubquery();
      }
    }

    // Aggregate function: COUNT(), COUNT(Id), SUM(Amount), etc.
    if (this.match(TT.FUNC)) {
      return this._parseAggregateField();
    }

    // Star
    if (this.match(TT.IDENT) && this.peek().value === '*') {
      this.advance();
      return { type: 'star' };
    }

    // Simple field or relationship (dot notation) with optional alias
    return this._parseFieldOrRelationship();
  }

  _parseAggregateField() {
    const funcTok = this.advance(); // consume FUNC token
    const func = funcTok.value;

    this.expect(TT.LPAREN, '(');

    let field = null;
    // COUNT() has no argument
    if (!this.match(TT.RPAREN)) {
      // Could be a dotted path e.g. COUNT(Account.Id)
      field = this._readDottedName();
    }

    this.expect(TT.RPAREN, ')');

    // Optional alias: COUNT(Id) TotalCount  — identifier not a keyword
    let alias = null;
    if (this.match(TT.IDENT) && !this.match(TT.KEYWORD)) {
      // Make sure the next token is not FROM (which would mean no alias)
      const pk = this.peek();
      if (pk.type === TT.IDENT) {
        alias = this.advance().value;
      }
    }

    return { type: 'aggregate', func, field, alias };
  }

  _parseFieldOrRelationship() {
    const first = this.expect(TT.IDENT).value;
    const parts = [first];

    while (this.matchAdvance(TT.DOT)) {
      parts.push(this.expect(TT.IDENT).value);
    }

    if (parts.length === 1) {
      return { type: 'field', name: parts[0] };
    }
    return { type: 'relationship_field', path: parts };
  }

  _readDottedName() {
    const parts = [this.expect(TT.IDENT).value];
    while (this.matchAdvance(TT.DOT)) {
      parts.push(this.expect(TT.IDENT).value);
    }
    return parts.join('.');
  }

  // ---- Subquery ----

  parseSubquery() {
    this.expect(TT.LPAREN, '(');
    this.expect(TT.KEYWORD, 'SELECT');

    const fields = this.parseSelectFields();

    this.expect(TT.KEYWORD, 'FROM');
    const relationshipName = this.expect(TT.IDENT).value;

    const where   = this.parseWhere();
    const groupBy = this.parseGroupBy();
    const having  = this.parseHaving();
    const orderBy = this.parseOrderBy();
    const limit   = this.parseLimit();
    const offset  = this.parseOffset();

    this.expect(TT.RPAREN, ')');

    const isCount = fields.length === 1 &&
      fields[0].type === 'aggregate' && fields[0].func === 'COUNT' && fields[0].field === null;
    const isAggregate = fields.some(f => f.type === 'aggregate');

    const subStmt = {
      type: 'select',
      fields,
      from: relationshipName,
      where,
      groupBy,
      having,
      orderBy,
      limit,
      offset,
      isCount,
      isAggregate
    };

    return { type: 'subquery', relationshipName, query: subStmt };
  }

  // ---- FROM ----

  parseFrom() {
    return this.expect(TT.IDENT).value;
  }

  // ---- WHERE ----

  parseWhere() {
    if (!this.matchAdvance(TT.KEYWORD, 'WHERE')) return null;
    return this.parseOrExpr();
  }

  parseOrExpr() {
    let left = this.parseAndExpr();
    while (this.matchAdvance(TT.KEYWORD, 'OR')) {
      const right = this.parseAndExpr();
      left = { type: 'or', left, right };
    }
    return left;
  }

  parseAndExpr() {
    let left = this.parseNotExpr();
    while (this.matchAdvance(TT.KEYWORD, 'AND')) {
      const right = this.parseNotExpr();
      left = { type: 'and', left, right };
    }
    return left;
  }

  parseNotExpr() {
    if (this.matchAdvance(TT.KEYWORD, 'NOT')) {
      const expr = this.parsePrimaryCondition();
      return { type: 'not', expr };
    }
    return this.parsePrimaryCondition();
  }

  parsePrimaryCondition() {
    // Parenthesised group
    if (this.match(TT.LPAREN)) {
      // Check if it's (SELECT ...) — that shouldn't appear here at top-level,
      // but we handle the grouping parentheses:
      const nextIdx = this.pos + 1;
      if (nextIdx < this.tokens.length && this.tokens[nextIdx].type === TT.KEYWORD && this.tokens[nextIdx].value === 'SELECT') {
        // This shouldn't happen in WHERE at primary level, but just in case
        throw new Error(`Unexpected subquery in WHERE clause at position ${this.peek().pos}. Use field IN (SELECT ...) syntax.`);
      }
      this.advance(); // consume '('
      const expr = this.parseOrExpr();
      this.expect(TT.RPAREN, ')');
      return expr;
    }

    // field comparison
    // Read the field name (possibly dotted)
    const fieldParts = [this.expect(TT.IDENT).value];
    while (this.matchAdvance(TT.DOT)) {
      fieldParts.push(this.expect(TT.IDENT).value);
    }
    const field = fieldParts.join('.');

    // NOT IN
    if (this.match(TT.KEYWORD, 'NOT')) {
      const notTok = this.advance(); // consume NOT
      if (this.match(TT.KEYWORD, 'IN')) {
        this.advance(); // consume IN
        return this._parseInList(field, true);
      }
      // If NOT was not followed by IN, that's an error
      throw new Error(`Expected IN after NOT at position ${notTok.pos}`);
    }

    // IN
    if (this.matchAdvance(TT.KEYWORD, 'IN')) {
      return this._parseInList(field, false);
    }

    // LIKE
    if (this.matchAdvance(TT.KEYWORD, 'LIKE')) {
      const val = this.expect(TT.STRING).value;
      return { type: 'condition', field, operator: 'LIKE', value: val };
    }

    // INCLUDES / EXCLUDES (multi-picklist)
    if (this.match(TT.KEYWORD, 'INCLUDES') || this.match(TT.KEYWORD, 'EXCLUDES')) {
      const op = this.advance().value; // 'INCLUDES' or 'EXCLUDES'
      this.expect(TT.LPAREN, '(');
      const vals = this._parseValueList();
      this.expect(TT.RPAREN, ')');
      return { type: 'condition', field, operator: op, value: vals };
    }

    // Comparison operators: =, !=, <, >, <=, >=
    if (!this.match(TT.OP)) {
      const tok = this.peek();
      throw new Error(`Expected operator after field '${field}' but got '${tok.value}' at position ${tok.pos}`);
    }
    const op = this.advance().value;
    const value = this._parseValue();

    return { type: 'condition', field, operator: op, value };
  }

  _parseInList(field, negated) {
    this.expect(TT.LPAREN, '(');

    // Check for subquery: (SELECT ...)
    if (this.match(TT.KEYWORD, 'SELECT')) {
      this.expect(TT.KEYWORD, 'SELECT');

      const subFields = this.parseSelectFields();
      this.expect(TT.KEYWORD, 'FROM');
      const subFrom = this.expect(TT.IDENT).value;
      const subWhere   = this.parseWhere();
      const subGroupBy = this.parseGroupBy();
      const subHaving  = this.parseHaving();
      const subOrderBy = this.parseOrderBy();
      const subLimit   = this.parseLimit();
      const subOffset  = this.parseOffset();

      this.expect(TT.RPAREN, ')');

      const isCount = subFields.length === 1 &&
        subFields[0].type === 'aggregate' && subFields[0].func === 'COUNT' && subFields[0].field === null;
      const isAggregate = subFields.some(f => f.type === 'aggregate');

      const subquery = {
        type: 'select',
        fields: subFields,
        from: subFrom,
        where: subWhere,
        groupBy: subGroupBy,
        having: subHaving,
        orderBy: subOrderBy,
        limit: subLimit,
        offset: subOffset,
        isCount,
        isAggregate
      };

      return { type: 'in_subquery', field, subquery, negated };
    }

    // Plain value list
    const vals = this._parseValueList();
    this.expect(TT.RPAREN, ')');

    return { type: 'condition', field, operator: negated ? 'NOT IN' : 'IN', value: vals };
  }

  _parseValueList() {
    const vals = [];
    vals.push(this._parseValue());
    while (this.matchAdvance(TT.COMMA)) {
      vals.push(this._parseValue());
    }
    return vals;
  }

  _parseValue() {
    // String
    if (this.match(TT.STRING)) return this.advance().value;
    // Number
    if (this.match(TT.NUMBER)) return this.advance().value;
    // Boolean
    if (this.match(TT.BOOL))   return this.advance().value;
    // null
    if (this.match(TT.NULL))   { this.advance(); return null; }
    // Date literal
    if (this.match(TT.DATE_LIT)) {
      return { __dateLiteral: true, value: this.advance().value };
    }
    // Identifier treated as a raw value (edge case)
    if (this.match(TT.IDENT)) return this.advance().value;

    const tok = this.peek();
    throw new Error(`Expected a value but got '${tok.value}' (${tok.type}) at position ${tok.pos}`);
  }

  // ---- GROUP BY ----

  parseGroupBy() {
    if (!this.match(TT.KEYWORD, 'GROUP')) return null;
    this.advance(); // GROUP
    this.expect(TT.KEYWORD, 'BY');
    const fields = [];
    fields.push(this._readDottedName());
    while (this.matchAdvance(TT.COMMA)) {
      fields.push(this._readDottedName());
    }
    return fields;
  }

  // ---- HAVING ----

  parseHaving() {
    if (!this.matchAdvance(TT.KEYWORD, 'HAVING')) return null;
    return this.parseOrExpr();
  }

  // ---- ORDER BY ----

  parseOrderBy() {
    if (!this.match(TT.KEYWORD, 'ORDER')) return null;
    this.advance(); // ORDER
    this.expect(TT.KEYWORD, 'BY');

    const items = [];
    items.push(this._parseOneOrderBy());
    while (this.matchAdvance(TT.COMMA)) {
      items.push(this._parseOneOrderBy());
    }
    return items;
  }

  _parseOneOrderBy() {
    const field = this._readDottedName();
    let direction = 'ASC';
    let nulls = null;

    if (this.match(TT.KEYWORD, 'ASC') || this.match(TT.KEYWORD, 'DESC')) {
      direction = this.advance().value;
    }

    if (this.match(TT.KEYWORD, 'NULLS')) {
      this.advance(); // NULLS
      if (this.match(TT.KEYWORD, 'FIRST') || this.match(TT.KEYWORD, 'LAST')) {
        nulls = this.advance().value;
      } else {
        const tok = this.peek();
        throw new Error(`Expected FIRST or LAST after NULLS but got '${tok.value}' at position ${tok.pos}`);
      }
    }

    return { field, direction, nulls };
  }

  // ---- LIMIT / OFFSET ----

  parseLimit() {
    if (!this.matchAdvance(TT.KEYWORD, 'LIMIT')) return null;
    return this.expect(TT.NUMBER).value;
  }

  parseOffset() {
    if (!this.matchAdvance(TT.KEYWORD, 'OFFSET')) return null;
    return this.expect(TT.NUMBER).value;
  }
}

// ---------------------------------------------------------------------------
// resolveDateLiteral(literal) → Date | { start: Date, end: Date }
// ---------------------------------------------------------------------------
function resolveDateLiteral(literal) {
  if (literal && typeof literal === 'object' && literal.__dateLiteral) {
    literal = literal.value;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Helper: start of day
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function endOfDay(d)   { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999); }

  // Parameterised form: LAST_N_DAYS:7 etc.
  const paramMatch = literal.match(DATE_LITERAL_PARAM_RE);
  if (paramMatch) {
    const prefix = paramMatch[1];
    const n = parseInt(paramMatch[2], 10);

    switch (prefix) {
      case 'LAST_N_DAYS': {
        const start = new Date(today);
        start.setDate(start.getDate() - n);
        return { start: startOfDay(start), end: endOfDay(today) };
      }
      case 'NEXT_N_DAYS': {
        const end = new Date(today);
        end.setDate(end.getDate() + n);
        return { start: startOfDay(today), end: endOfDay(end) };
      }
      case 'LAST_N_MONTHS': {
        const start = new Date(today);
        start.setMonth(start.getMonth() - n);
        return { start: startOfDay(start), end: endOfDay(today) };
      }
      case 'NEXT_N_MONTHS': {
        const end = new Date(today);
        end.setMonth(end.getMonth() + n);
        return { start: startOfDay(today), end: endOfDay(end) };
      }
      case 'LAST_N_QUARTERS': {
        const curQ = Math.floor(today.getMonth() / 3);
        const startQ = new Date(today.getFullYear(), curQ * 3, 1);
        startQ.setMonth(startQ.getMonth() - n * 3);
        const endQ = new Date(today.getFullYear(), curQ * 3, 1);
        endQ.setDate(endQ.getDate() - 1);
        return { start: startOfDay(startQ), end: endOfDay(endQ) };
      }
      case 'NEXT_N_QUARTERS': {
        const curQ2 = Math.floor(today.getMonth() / 3);
        const startQ2 = new Date(today.getFullYear(), (curQ2 + 1) * 3, 1);
        const endQ2 = new Date(today.getFullYear(), (curQ2 + 1 + n) * 3, 1);
        endQ2.setDate(endQ2.getDate() - 1);
        return { start: startOfDay(startQ2), end: endOfDay(endQ2) };
      }
      case 'LAST_N_YEARS': {
        const startY = new Date(today.getFullYear() - n, 0, 1);
        const endY = new Date(today.getFullYear() - 1, 11, 31);
        return { start: startOfDay(startY), end: endOfDay(endY) };
      }
      case 'NEXT_N_YEARS': {
        const startY2 = new Date(today.getFullYear() + 1, 0, 1);
        const endY2 = new Date(today.getFullYear() + n, 11, 31);
        return { start: startOfDay(startY2), end: endOfDay(endY2) };
      }
      default:
        throw new Error(`Unsupported parameterised date literal: ${literal}`);
    }
  }

  // Exact date literals
  switch (literal) {
    case 'TODAY':
      return today;

    case 'YESTERDAY': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return y;
    }

    case 'TOMORROW': {
      const t = new Date(today);
      t.setDate(t.getDate() + 1);
      return t;
    }

    case 'THIS_MONTH': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0); // last day of month
      return { start: startOfDay(start), end: endOfDay(end) };
    }

    case 'LAST_MONTH': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: startOfDay(start), end: endOfDay(end) };
    }

    case 'NEXT_MONTH': {
      const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      return { start: startOfDay(start), end: endOfDay(end) };
    }

    case 'THIS_QUARTER': {
      const q = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), q * 3, 1);
      const end = new Date(today.getFullYear(), q * 3 + 3, 0);
      return { start: startOfDay(start), end: endOfDay(end) };
    }

    case 'LAST_QUARTER': {
      const q = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), (q - 1) * 3, 1);
      const end = new Date(today.getFullYear(), q * 3, 0);
      return { start: startOfDay(start), end: endOfDay(end) };
    }

    case 'NEXT_QUARTER': {
      const q = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), (q + 1) * 3, 1);
      const end = new Date(today.getFullYear(), (q + 2) * 3, 0);
      return { start: startOfDay(start), end: endOfDay(end) };
    }

    case 'THIS_YEAR': {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      return { start: startOfDay(start), end: endOfDay(end) };
    }

    case 'LAST_YEAR': {
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear() - 1, 11, 31);
      return { start: startOfDay(start), end: endOfDay(end) };
    }

    case 'NEXT_YEAR': {
      const start = new Date(today.getFullYear() + 1, 0, 1);
      const end = new Date(today.getFullYear() + 1, 11, 31);
      return { start: startOfDay(start), end: endOfDay(end) };
    }

    default:
      throw new Error(`Unknown date literal: ${literal}`);
  }
}

// ---------------------------------------------------------------------------
// resolveFieldValue — handle dotted paths on a record
// ---------------------------------------------------------------------------
function resolveFieldValue(record, fieldName) {
  if (!fieldName) return undefined;
  if (!fieldName.includes('.')) {
    return record[fieldName];
  }
  const parts = fieldName.split('.');
  let current = record;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

// ---------------------------------------------------------------------------
// evaluateWhereExpr(record, expr, context) → boolean
// ---------------------------------------------------------------------------
function evaluateWhereExpr(record, expr, context) {
  if (!expr) return true;

  switch (expr.type) {
    case 'and':
      return evaluateWhereExpr(record, expr.left, context) &&
             evaluateWhereExpr(record, expr.right, context);

    case 'or':
      return evaluateWhereExpr(record, expr.left, context) ||
             evaluateWhereExpr(record, expr.right, context);

    case 'not':
      return !evaluateWhereExpr(record, expr.expr, context);

    case 'condition':
      return evaluateCondition(record, expr, context);

    case 'in_subquery':
      return evaluateInSubquery(record, expr, context);

    default:
      throw new Error(`Unknown WHERE expression type: ${expr.type}`);
  }
}

// ---------------------------------------------------------------------------
// evaluateCondition
// ---------------------------------------------------------------------------
function evaluateCondition(record, cond, context) {
  const fieldVal = resolveFieldValue(record, cond.field);
  const operator = cond.operator;
  let target = cond.value;

  // Date literal handling
  if (target && typeof target === 'object' && target.__dateLiteral) {
    const resolved = resolveDateLiteral(target.value);
    const fieldDate = fieldVal != null ? new Date(fieldVal) : null;

    if (fieldDate == null || isNaN(fieldDate.getTime())) {
      // Null/invalid date: only != null would match
      return operator === '!=' ? true : false;
    }

    // Range date literals (THIS_MONTH, LAST_N_DAYS:7, etc.)
    if (resolved && typeof resolved === 'object' && resolved.start && resolved.end) {
      switch (operator) {
        case '=':
          return fieldDate >= resolved.start && fieldDate <= resolved.end;
        case '!=':
          return fieldDate < resolved.start || fieldDate > resolved.end;
        case '>':
          return fieldDate > resolved.end;
        case '>=':
          return fieldDate >= resolved.start;
        case '<':
          return fieldDate < resolved.start;
        case '<=':
          return fieldDate <= resolved.end;
        default:
          return false;
      }
    }

    // Point date literals (TODAY, YESTERDAY, TOMORROW)
    const resolvedStart = new Date(resolved.getFullYear(), resolved.getMonth(), resolved.getDate());
    const resolvedEnd   = new Date(resolved.getFullYear(), resolved.getMonth(), resolved.getDate(), 23, 59, 59, 999);

    switch (operator) {
      case '=':
        return fieldDate >= resolvedStart && fieldDate <= resolvedEnd;
      case '!=':
        return fieldDate < resolvedStart || fieldDate > resolvedEnd;
      case '>':
        return fieldDate > resolvedEnd;
      case '>=':
        return fieldDate >= resolvedStart;
      case '<':
        return fieldDate < resolvedStart;
      case '<=':
        return fieldDate <= resolvedEnd;
      default:
        return false;
    }
  }

  // Standard operators
  switch (operator) {
    case '=':
      if (target === null) return fieldVal == null;
      // eslint-disable-next-line eqeqeq
      return fieldVal == target;

    case '!=':
      if (target === null) return fieldVal != null;
      // eslint-disable-next-line eqeqeq
      return fieldVal != target;

    case '>':
      if (fieldVal == null || target == null) return false;
      return fieldVal > target;

    case '<':
      if (fieldVal == null || target == null) return false;
      return fieldVal < target;

    case '>=':
      if (fieldVal == null || target == null) return false;
      return fieldVal >= target;

    case '<=':
      if (fieldVal == null || target == null) return false;
      return fieldVal <= target;

    case 'LIKE': {
      if (fieldVal == null) return false;
      // Convert SQL LIKE to regex: % → .*, _ → ., escape other regex chars
      const escaped = String(target).replace(/([.+?^${}()|[\]\\])/g, '\\$1');
      const pattern = escaped.replace(/%/g, '.*').replace(/_/g, '.');
      return new RegExp(`^${pattern}$`, 'i').test(String(fieldVal));
    }

    case 'IN': {
      if (!Array.isArray(target)) return false;
      if (fieldVal == null) return target.includes(null);
      return target.some(v => {
        // eslint-disable-next-line eqeqeq
        return v == fieldVal || String(v) === String(fieldVal);
      });
    }

    case 'NOT IN': {
      if (!Array.isArray(target)) return true;
      if (fieldVal == null) return !target.includes(null);
      return !target.some(v => {
        // eslint-disable-next-line eqeqeq
        return v == fieldVal || String(v) === String(fieldVal);
      });
    }

    case 'INCLUDES': {
      // Multi-picklist: field value is semicolon-separated
      if (fieldVal == null || !Array.isArray(target)) return false;
      const vals = String(fieldVal).split(';').map(s => s.trim());
      return target.some(t => vals.includes(t));
    }

    case 'EXCLUDES': {
      if (fieldVal == null || !Array.isArray(target)) return true;
      const vals = String(fieldVal).split(';').map(s => s.trim());
      return !target.some(t => vals.includes(t));
    }

    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

// ---------------------------------------------------------------------------
// evaluateInSubquery
// ---------------------------------------------------------------------------
function evaluateInSubquery(record, expr, context) {
  const fieldVal = resolveFieldValue(record, expr.field);

  // The context should have pre-computed subquery results
  if (context && context.subqueryResults) {
    // Build a key from the subquery to look up pre-computed results
    const key = subqueryKey(expr.subquery);
    const resultSet = context.subqueryResults.get(key);
    if (resultSet) {
      const found = resultSet.has(fieldVal) || resultSet.has(String(fieldVal));
      return expr.negated ? !found : found;
    }
  }

  // If no pre-computed results, return false (caller must pre-compute)
  return expr.negated ? true : false;
}

// Build a deterministic key for a subquery for lookup
function subqueryKey(sq) {
  // Use a simple serialisation — field + from + where
  const fieldStr = sq.fields.map(f => {
    if (f.type === 'field') return f.name;
    if (f.type === 'relationship_field') return f.path.join('.');
    return JSON.stringify(f);
  }).join(',');
  return `${fieldStr}|${sq.from}|${JSON.stringify(sq.where)}`;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  TT,
  tokenizeSOQL,
  SOQLParser,
  evaluateWhereExpr,
  resolveDateLiteral,
  resolveFieldValue,
  subqueryKey
};
