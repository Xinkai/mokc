
This tutorial is not complete. See the test code for more usage.

1. Preparation

  1. Turn on strict mode

     Prepend `"use strict";` to be the first line of every one of your JS files.

  2. Get an ES2015 module loader/bundler

     mokc.js is written in ES2015


2. Making mocks

  ```
  import { makeMock } from "mokc";

  const mock = makeMock();

  // typeof mock === "function"

  const mock2 = makeMock({ target: Object.create(null) });

  // typeof mock === "object"
  ```

  The `makeMock(options)` function accepts a `target` parameter which will be the target behind the mock.

  Accessing properties on the mock
  ```
  const mock = makeMock();

  mock.foo; // evaluates to a new mock, not `undefined`
  mock[3]; // evaluates to a new mock, not throwing RangeError, nor `undefined`

  const a = mock.call.me.maybe(5006041); // evaluates to a new mock, not `TypeError: not a function.`

  const b = mock.call.me.maybe(5006041);

  // a === b, because they are the same function with the same arguments

  const c = mock.call.me.maybe(1406005);

  // a === b !== c, because the argument is different
  ```

  You can set return values
  ```
  import { makeMock, Return } from "mokc";
  // we need `Return` from mokc, it is an ES6 symbol.

  const adder = makeMock();
  adder(1, 2)[Return] = 3;
  const a = adder(1, 2);
  // a === 3, because we have told the mock it should return 3 when evaluates

  const b = adder(1, 1);
  // b is a mock, because nobody has implement this logic yet
  b[Return] = 2;

  // b is still a mock, not 2. I am not sure why though: browser bug? supposed to be?
  const b2 = adder(1, 1);
  // b2 is 2

  ```

  You can also actually implement this function
  ```
  const mock = makeMock();

  mock.adder = (x, y) => x + y;

  // mock.adder(1, 2) === 3
  // mock.adder(100, 200) === 300
  ```

  In fact, you can set anything on your mock
  ```
  const mock = makeMock();
  mock.value = 42; // mock.value is 42 now
  ```

3. Making assertions

  You can ask the mock object whether it has been called, and it will returns a boolean
  ```
  import { has, makeMock } from "mokc";
  // we need `has`, which is an ES6 symbol.

  const mock = makeMock();

  mock.method(1, 2, 3);
  mock.method[has].called(); // evaluates to true
  mock.method[has].called.with("a", "b")(); // evaluates to false
  ```

  `.with()` is a filter. There are more filters, like `.returns()`

  ```
  mock.method(1, 2, 3);
  mock.method[has].called.with(1, 2, 3)(); // evaluates to true
  mock.method[has].called.with(1, 2, 3).returns(1)(); // evaluates to false, because mock.method(1, 2, 3) returns a mock, not 1
  ```

4. Making queries
  ```
  import { has, makeMock } from "mokc";
  import { What, Whats } from "HasCalledCompiler";
  // What, Whats are also symbols

  const mock = makeMock();
  mock.method("Hello");

  mock.method[has].called.with(What)(); // evaluates to be "Hello"
  mock.method[has].called.with(Whats)(); // evaluates to be [ "Hello" ]

  mock.method("Goodbye");
  mock.method[has].called.with(What)(); // RangeError: there are two arguments that were passed in
  mock.method[has].called.with(Whats)(); // evaluates to be [ "Hello", "Goodbye" ]

  mock.method("Hello");
  mock.method[has].called.with(Whats)(); // evaluates to be [ "Hello", "Goodbye" ], because only two unique calls were made
  ```
