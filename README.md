# Regulas

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT) [![npm version](https://img.shields.io/npm/v/regulas.svg)](https://www.npmjs.com/package/regulas) [![Zero Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)](https://www.npmjs.com/package/regulas) [![Bundle Size](https://img.shields.io/bundlephobia/minzip/regulas)](https://bundlephobia.com/package/regulas)

---

**Regulas** is a **lightweight, zero-dependency regex builder for JavaScript/TypeScript**.

✅ **Readable & Composable Syntax**
✅ **Zero Dependencies** – works out of the box
✅ **Powerful Features** – named groups, lookarounds, ranges, reusable patterns

Instead of writing complex regex strings manually, you **compose patterns using simple, readable functions**. This makes your regex:

* **Clear** – easy to read
* **Safe** – fewer mistakes
* **Maintainable** – simple to update and reuse

---

## 📦 Installation

```bash
npm install regulas
```

or

```bash
yarn add regulas
```

---

## 📝 Usage

```ts
// ESM
import { Regulas, range, oneOf, allOf, next, prev } from "regulas";

// CJS
const { Regulas, range, oneOf, allOf, next, prev } = require("regulas");
```

---

## 🧠 Mental Model

Think of **Regulas** like **LEGO blocks for regex**:

* **Pieces** – building blocks like `range`, `allOf`, `oneOf`, `next`, `prev`
* **Quantifiers** – `.oneOrMore`, `.zeroOrMore`, `.optional`, `.repeat(n,m)`, `.lazy`
* **Combinators** – `allOf` (sequence), `oneOf` (alternatives)
* **Final step** – call `.toRegex()` to get a real JavaScript RegExp

> Note: `next` and `prev` are **lookarounds** and **cannot have quantifiers**

---

## 🚀 Quick Start

```ts
import { Regulas, range } from "regulas";

// Match an IPv4 address
const re = Regulas(
  range("0-255").group("first"),
  ".",
  range("0-255").group("second"),
  ".",
  range("0-255").group("third"),
  ".",
  range("0-255").group("fourth")
).toRegex();

console.log(re.test("157.237.84.2")); // true
console.log(re.exec("157.237.84.2").groups);
// { first: "157", second: "237", third: "84", fourth: "2" }
```

---

## ⚡ Core Features

### 1. Building Blocks

#### `Regulas(...)`

Main entry point. Wraps everything into a regex builder. Call `.toRegex()` directly.

```ts
const re = Regulas(
  oneOf("cat")
).toRegex();
console.log(re.test("cat")); // true
```

#### `range(...pattern)`

Create numeric or character ranges.

```ts
const re = Regulas(
  range("a-c", "x-z")
).toRegex();
console.log(re.test("b")); // true
console.log(re.test("g")); // false
```

#### `allOf(...pattern)` & `oneOf(...pattern)`

Combine multiple pieces sequentially (`allOf`) or as alternatives (`oneOf`).

```ts
// oneOf
const re = Regulas(
  oneOf("cat", "dog")
).toRegex();
console.log(re.test("dog")); // true

// allOf
const re2 = Regulas(
  allOf("cat", "dog")
).toRegex();
console.log(re2.test("catdog")); // true
console.log(re2.test("dogcat")); // false
```

### 2. Quantifiers

Attach to any piece (except `next` and `prev`):

* `.oneOrMore` → 1+ matches
* `.optional` → 0 or 1 match
* `.zeroOrMore` → 0+ matches
* `.repeat(n, m)` → between n and m matches
* `.lazy` → makes quantifier non-greedy

```ts
// oneOrMore
const re = Regulas(
  range("a-z").oneOrMore
).toRegex();
console.log(re.test("aaaa")); // true

// optional
const re2 = Regulas(
  range("b").optional
).toRegex();
console.log(re2.test("")); // true

// repeat
const re3 = Regulas(
  range("a-z").repeat(3,5)
).toRegex();
console.log(re3.test("aaa")); // true

// lazy
const re4 = Regulas(
  range("a-z").oneOrMore.lazy
).toRegex();
console.log(re4.test("aaa")); // false
```

### 3. Lookarounds

#### `next(...pattern)`

Positive or negative lookahead.

```ts
// positive
const re = Regulas(
  next(
    allOf("foo")
  )
).toRegex();
console.log(re.test("foobar")); // true

// negative
const re2 = Regulas(
  next(
    allOf("foo")
  ).not
).toRegex();
console.log(re2.test("bar")); // true
```

#### `prev(...pattern)`

Positive or negative lookbehind.

```ts
// positive
const re = Regulas(
  prev(
    allOf("bar")
  )
).toRegex();
console.log(re.test("foobar")); // true

// negative
const re2 = Regulas(
  prev(
    allOf("bar")
  ).not
).toRegex();
console.log(re2.test("foo")); // true
```

### 4. Named Groups

```ts
const re = Regulas(
  allOf("abc").group("myGroup")
).toRegex();
console.log(re.test("abc")); // true
console.log(re.exec("abc").groups); // { myGroup: "abc" }
```

### 5. Saving & Reusing Patterns

```ts
const username = range("a-zA-Z0-9_+").oneOrMore;
const re = Regulas(username).toRegex();
console.log(re.test("user_123")); // true

// Using saved variable
const re2 = Regulas(
  range("a-zA-Z0-9_+").oneOrMore.save("username"),
  "<username>",
  "<username>"
).toRegex();
```

### 6. Start/End Anchors

```ts
const re = Regulas(
  allOf("abc")
).fullMatch.toRegex();
console.log(re.test("abc")); // true
```

---

## 📖 Why Use Regulas?

* **Readable** – self-explanatory regex
* **Composable** – build complex patterns from reusable pieces
* **Powerful** – supports lookarounds, named groups, numeric & character ranges

---

## 💡 Tips for Beginners

1. Start with `range` and `allOf`/`oneOf`
2. Attach quantifiers to pieces, not raw strings
3. Use `next()` & `prev()` for lookarounds/lookbehinds
4. Save reusable patterns with `.save('name')` and use `<name>`

---

## ⚖ License

MIT License © 2025 [SamYeem](https://github.com/samyeem)
