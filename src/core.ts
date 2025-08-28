/**
 * Map of special characters to their escaped regex equivalents.
 */
const ESCAPE_CHAR_MAP: Record<string, string> = {
  '.': '\\.', '*': '\\*', '+': '\\+', '?': '\\?', '^': '\\^', '$': '\\$', 
  '{': '\\{', '}': '\\}', '(': '\\(', ')': '\\)', '|': '\\|', '[': '\\[', 
  ']': '\\]', '\\': '\\\\'
};

/** Cache for escaped strings to optimize repeated calls */
const ESCAPE_CACHE = new Map<string, string>();

/** Registry to store named patterns for reuse */
const VARIABLE_REGISTRY = new Map<string, string>();

/**
 * Base class for Regulas patterns.
 * Handles pattern string, quantifiers, named groups, OR segments, and variables.
 *
 * @example
 * const pattern = new RegulasBase("abc").oneOrMore.optional.save("myPattern");
 * console.log(pattern.toString()); // (?:abc+?) 
 */
class RegulasBase {
  protected pattern: string | (() => string);
  protected groupName: string;
  protected quantifier: string;
  protected orSegment: string;
  protected negate: boolean;
  public variableName: string;

  constructor(pattern: string | (() => string)) {
    this.pattern = pattern;
    this.groupName = '?:';
    this.quantifier = '';
    this.orSegment = '';
    this.negate = false;
    this.variableName = '';
  }

  /** Adds an OR segment `|` to the pattern */
  get or() {
    this.orSegment = '|';
    return this;
  }

  /** Matches one or more of the pattern */
  get oneOrMore() {
    this.quantifier = '+';
    return this;
  }

  /** Matches zero or more of the pattern */
  get zeroOrMore() {
    this.quantifier = '*';
    return this;
  }

  /** Makes previous quantifier lazy (non-greedy) */
  get lazy() {
    this.quantifier += '?';
    return this;
  }

  /** Makes the pattern optional (`?`) */
  get optional() {
    this.quantifier = '?';
    return this;
  }

  /** Wraps the pattern in a named capturing group */
  group(name: string) {
    this.groupName = `?<${name}>`;
    return this;
  }

  /** Saves the pattern to VARIABLE_REGISTRY for reuse */
  save(name: string) {
    this.variableName = name;
    return this;
  }

  /** Repeats the pattern a specific number of times */
  repeat(...times: number[]) {
    if (times.length !== 0) {
      this.quantifier = `{${times.join(',')}}`;
    } else {
      this.quantifier = '+';
    }
    return this;
  }

  /** Converts the pattern to a regex string */
  toString() {
    if (typeof this.pattern === 'function') {
      this.pattern = this.pattern();
    }

    let compiledPattern = `(?:${this.pattern})${this.quantifier}${this.orSegment}`;
    if (this.groupName !== '?:') {
      compiledPattern = `(${this.groupName}${compiledPattern})`;
    }
    return compiledPattern;
  }
}

/**
 * Group wrapper for patterns, inherits RegulasBase.
 * Example: `or("foo", "bar")`
 */
class RegulasGroup extends RegulasBase {
  constructor(pattern: string | (() => string)) {
    super(pattern);
  }
}

/**
 * Handles lookahead and lookbehind assertions.
 *
 * Example:
 * ```ts
 * const r = next("foo"); // positive lookahead (?=foo)
 * const r2 = prev("bar").not; // negative lookbehind (?<!bar)
 * ```
 */
class RegulasLookAround {
  protected pattern: string | ((negate: boolean) => string);
  protected groupName: string = '';
  protected negate: boolean = false;
  public variableName: string;

  constructor(pattern: string | ((negate: boolean) => string)) {
    this.pattern = pattern;
    this.negate = false;
    this.variableName = '';
  }

  /** Wraps lookaround in a named capturing group */
  group(name: string) {
    this.groupName = `?<${name}>`;
    return this;
  }

  /** Negates the lookaround */
  get not() {
    this.negate = true;
    return this;
  }

  /** Converts lookaround to regex string */
  toString() {
    if (typeof this.pattern === 'function') {
      this.pattern = this.pattern(this.negate);
    }

    if (this.groupName) {
      return `(${this.groupName}${this.pattern})`;
    }
    return this.pattern;
  }
}

/**
 * Converts patterns (string, RegulasBase, RegulasGroup, RegulasLookAround) to regex string
 */
function patternsToString(patterns: (string | RegulasBase | RegulasGroup | RegulasLookAround)[], join: string = '') {
  return patterns.map(item => {
    if (typeof item === 'string') {
      if (item.startsWith('<') && item.endsWith('>')) {
        return VARIABLE_REGISTRY.get(item.slice(1, -1));
      }
      return escape(item);
    } else if (item instanceof RegulasBase || item instanceof RegulasGroup || item instanceof RegulasLookAround) {
      const str = item.toString();
      if (item.variableName) {
        VARIABLE_REGISTRY.set(item.variableName, str);
      }
      return str;
    }
    return '';
  }).join(join);
}

/**
 * Builder for combining multiple patterns and converting to RegExp.
 *
 * @example:
 * const r = Regulas("foo", next("bar")).toRegex(); // /foo(?=bar)/
 * 
 */
class RegulasBuilder {
  private compiledPattern: string = '';

  constructor(...patterns: (string | RegulasBase | RegulasGroup | RegulasLookAround)[]) {
    this.compiledPattern = patternsToString(patterns);
  }

  /** Returns the compiled pattern as a RegExp */
  toRegex(flags: string = '') {
    return new RegExp(this.compiledPattern, flags);
  }

  /** Wraps the compiled pattern for full string match */
  get fullMatch() {
    this.compiledPattern = `^${this.compiledPattern}$`;
    return this;
  }
}

/**
 * Escapes regex special characters in a string.
 * Example: `escape(".+*")` -> `\\.\\+\\*`
 */
export function escape(input: string) {
  if (ESCAPE_CACHE.has(input)) return ESCAPE_CACHE.get(input);
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    result += ESCAPE_CHAR_MAP[char] || char;
  }
  ESCAPE_CACHE.set(input, result);
  return result;
}

/**
 * Generates a Regulas pattern for numeric or character ranges.
 *
 * Example:
 * ```ts
 * const r = range("0-9", "a-z");
 * ```
 */
export function range(...values: string[]) {
  function build() {
    const numericRanges: string[] = [];
    const charRanges: string[] = [];

    values.forEach(val => {
      if (val.includes('-')) {
        const [start, end] = val.split('-');

        if (isNaN(Number(start)) && isNaN(Number(end))) charRanges.push(val);
        else numericRanges.push(generateRange(Number(start), Number(end)));
      } else if (!isNaN(Number(val))) {
        numericRanges.push(val);
      } else charRanges.push(val);
    });

    if (numericRanges.length === 0) return `[${charRanges.join('')}]`;
    if (charRanges.length === 0) return `(?<![\\d-])(?:${numericRanges.reverse().join('|')})(?!\\d)`;
    return `(?<!\\d)(?:${numericRanges.reverse().join('|')})(?!\\d)|[${charRanges.join('')}]`;
  }

  return new RegulasBase(build);
}

/**
 * Converts a numeric range into a regex string.
 * Example: `generateRange(0, 9)` -> `[0-9]`
 */
export function generateRange(start: number, end: number) {
  const ranges: string[] = [];
  if (start === 0 && end === 9) return '[0-9]';
  if (start === end) return `${start}`;
  if (start > end) [start, end] = [end, start];

  if (start === 0) {
    ranges.push('0');
    start++;
  }

  while (start <= end) {
    const len = start.toString().length;
    let boundary = Math.pow(10, len) - 1;

    if (boundary > end) boundary = (Math.floor(start / Math.pow(10, len - 1)) + 1) * Math.pow(10, len - 1) - 1;
    if (boundary > end) {
      let current = start;
      while (current < end) {
        const temp = current + (9 - current % 10);
        if (temp < end) boundary = temp;
        else break;
        current = temp + 1;
      }
    }

    if (boundary > end) boundary = end;
    ranges.push(mergeRanges(start.toString(), boundary.toString()));
    start = boundary + 1;
  }

  return ranges.reverse().join('|');
}

function mergeRanges(startStr: string, endStr: string) {
  const parts: string[] = [];
  let lastRange = '';
  let counter = 1;

  for (let i = 0; i < endStr.length; i++) {
    const startChar = startStr[i];
    const endChar = endStr[i];

    if (startChar === endChar) {
      parts.push(startChar);
    } else {
      const range = `[${startChar}-${endChar}]`;
      if (lastRange === range) counter++;
      else {
        parts.push(range);
        lastRange = range;
      }
    }
  }

  if (counter > 1) parts.push(`{${counter}}`);
  return parts.join('');
}


/** Main Regulas entry point */
export function Regulas(...patterns: (string | RegulasBase | RegulasGroup | RegulasLookAround)[]) {
  return new RegulasBuilder(...patterns);
}

/**  Matches one of the patterns */
export function oneOf(...patterns: (string | RegulasBase | RegulasGroup | RegulasLookAround)[]) {
  return new RegulasGroup(() => patternsToString(patterns, '|'));
}

/** Matches all of the patterns */
export function allOf(...patterns: (string | RegulasBase | RegulasGroup | RegulasLookAround)[]) {
  return new RegulasGroup(() => patternsToString(patterns));
}

/** Positive/Negative lookahead */
export function next(...patterns: (string | RegulasBase | RegulasGroup | RegulasLookAround)[]) {
  function generate(negate: boolean = false) {
    if (negate) return `(?!(?:${patternsToString(patterns)}))`;
    return `(?=(?:${patternsToString(patterns)}))`;
  }
  return new RegulasLookAround(generate);
}

/** Positive/Negative lookbehind */
export function prev(...patterns: (string | RegulasBase | RegulasGroup | RegulasLookAround)[]) {
  function generate(negate: boolean = false) {
    if (negate) return `(?<!(?:${patternsToString(patterns)}))`;
    return `(?<=(?:${patternsToString(patterns)}))`;
  }
  return new RegulasLookAround(generate);
}
