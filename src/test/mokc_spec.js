"use strict";

import assert from "./assert";

import {
    Handler,
    makeMock,
    Target,
    Return,
    Iterator,
    Generator,
    AccessPath,
    has,
    getMockCounter,
} from "../mokc";

describe('CreateMock', function() {
    describe('#makeMock()', function() {
        it("creates a mock", function() {
            const mock = makeMock();
            assert.isDefined(mock);
        });
    });

    describe('new-able', function() {
        const Mock = makeMock();

        assert.isDefined(Mock);

        const mock = new Mock();
        assert.isDefined(mock);
        assert.isDefined(mock[Target]); // Is it a mokc object
    });

    describe("sub-mock", function() {
        it("auto stubs sub-mock", function() {
            const mock = makeMock();
            assert.isDefined(mock.sub);
        });

        it("remembers sub-mock", function() {
            const mock = makeMock();
            const sub1 = mock.sub;
            const sub2 = mock.sub;

            assert.strictEqual(sub1, sub2);
        });

        it("two ways of accessing sub-mock", function() {
            const mock = makeMock();

            assert.strictEqual(mock["sub"], mock.sub);
        });

        it("sub-mock can be set", function() {
            const mock = makeMock();
            mock.value = "42!";

            assert.strictEqual(mock.value, "42!");
        });

        it("stubs are not static", function() {
            const mock1 = makeMock();
            mock1.value = "First";

            const mock2 = makeMock();
            assert.notStrictEqual(mock2.value, "First");
        });

        it("supports circular references", function() {
            const mock = makeMock();
            mock.sub.mock = mock;

            assert.strictEqual(mock, mock.sub.mock);
        });

        // delete
        it("can delete as expected", function() {
            const mock = makeMock();
            mock.set.val = 3;
            assert.notStrictEqual(Object.getOwnPropertyNames(mock.set).indexOf("val"), -1);

            delete mock.set.val;
            assert.strictEqual(Object.getOwnPropertyNames(mock.set).indexOf("val"), -1);
        });
    });
});

describe("Respect prototype", function() {
    it("allows target to be passed in, unharmed", function() {
        const target = {
            key: "value",
        };
        const mock = makeMock({ target });

        assert.strictEqual(mock.key, "value");
    });

    it("respects target's class inheritance", function() {
        class Animal {
            constructor() {
                this.life = 1;
            }
            die() {
                this.life--;
                if (this.life === 0) {
                    throw new Error("Died");
                }
            }
        }

        const animal = new Animal();
        assert.throws(() => {
            animal.die();
        }, Error);

        class Cat extends Animal {
            constructor() {
                super();
                this.life = 9;
            }
        }

        const cat = new Cat();
        for (let i = 0; i < 8; i++) {
            cat.die();
        }
        assert.throws(() => {
            cat.die();
        }, Error);
    });
});

describe("Symbol as key on mock", function() {
    it("can set Symbol key on mock", function() {
        const s1 = Symbol("s1");
        const s2 = Symbol("s2");
        const m = makeMock();
        m[s1] = "Test";

        assert.ownProperty(m, s1);
        assert.property(m, s1);

        assert.notOwnProperty(m, s2);
        assert.notProperty(m, s2);
    });
});

describe("Has", function() {
    it("does not 'has' anything by default", function() {
        const mock = makeMock();
        mock.push(1);

        assert.notOwnProperty(mock, "1");
        assert.notOwnProperty(mock, "value");
    });

    context("Target being function", function() {
        it("has arguments, but no name, length", function() {
            const mock = makeMock();

            // arguments is non-configurable
            assert.ownProperty(mock, "arguments");

            // name, length are configurable
            assert.notOwnProperty(mock, "name");
            assert.notOwnProperty(mock, "length");
        });
    });

    it("should behave as normal objects if the target was provided", function() {
        const mock = makeMock({
            target: Object.create(null),
        });
        mock.foo = "foo";

        assert.ownProperty(mock, "foo");
        assert.notOwnProperty(mock, "bar");
    });

    it("can be configured", function() {
        const mock = makeMock();
        mock[Handler].has = (_, prop) => prop === "bingo";

        assert.property(mock, "bingo");
        assert.notProperty(mock, "FalseProperty");
    });
});

describe("Callable", function() {
    it("itself is callable", function() {
        const mock = makeMock();
        mock();
    });

    it("submock is callable", function() {
        const mock = makeMock();
        mock.sub.stub.is.callable();
    });

    it("callable returns mokc that is callable", function() {
        const mock = makeMock();
        mock.getValue1().getValue2().getValue3();
    });

    it("can take arguments", function() {
        const mock = makeMock();
        mock.getUserName({
            id: 12345,
        });

        mock.add(8, 8, 8, 8, 8);
    });

    it("returns a same mock for a specific method", function() {
        const mock = makeMock();
        const ret1 = mock.func();
        const ret2 = mock.func();

        assert.strictEqual(ret1, ret2);
    });

    it("returns different mocks by calling with different arguments", function() {
        const mock = makeMock();
        const ret1 = mock.func(1);
        const ret2 = mock.func("Hello, world!");

        assert.notStrictEqual(ret1, ret2);
    });

    it("returns different mocks for different methods", function() {
        const mock = makeMock();
        const ret1 = mock.func1();
        const ret2 = mock.func2();

        assert.notStrictEqual(ret1, ret2);
    });

    it("can set value to arguments", function() {
        const mock = makeMock();
        mock.add(8, 8)[Return] = 16;

        const result = mock.add(8, 8);
        assert.isNumber(result);
        assert.strictEqual(result, 16);
    });

    it("setting values does not change same method calls' return values to other arguments", function() {
        const mock = makeMock();
        mock.add(8, 8)[Return] = 16;
        const result1 = mock.add(8, 8);
        const result2 = mock.add(4, 4);

        assert.isNumber(result1);
        assert.strictEqual(result1, 16);

        assert.isFunction(result2);
        assert.notStrictEqual(result2, 16);
    });

    it("setting values does not change other existing method calls' return values", function() {
        const mock1 = makeMock();
        const mock2 = makeMock();
        mock1.add(8, 8)[Return] = 16;
        const result1 = mock1.add(8, 8);
        const result2 = mock2.add(8, 8);

        assert.isNumber(result1);
        assert.strictEqual(result1, 16);

        assert.isFunction(result2);
        assert.notStrictEqual(result2, 16);
    });

    it("setting values does not change new method calls' return values", function() {
        const mock1 = makeMock();
        mock1.add(8, 8)[Return] = 16;
        const result1 = mock1.add(8, 8);
        assert.isNumber(result1);
        assert.strictEqual(result1, 16);

        const mock2 = makeMock();
        const result2 = mock2.add(8, 8);
        assert.isFunction(result2);
        assert.notStrictEqual(result2, 16);
    });

    it("set Return late", function() {
        const mock = makeMock();
        const ret = mock.add(1, 1);
        ret[Return] = 2;

        assert.notStrictEqual(ret, 2);
        const ret2 = mock.add(1, 1);

        assert.strictEqual(ret2, 2);
    });
});

describe("Callable Generator", function() {
    it("by default, @@iterator is undefined", function() {
        const mock = makeMock();

        assert.isUndefined(mock[Symbol.iterator]);
    });

    it("by default, [Iterator] is undefined", function() {
        const mock = makeMock();

        assert.isUndefined(mock[Iterator]);
    });

    it("by default, is undefined, should pass isGenerator if available", function() {
        if (Function.isGenerator) {
            const mock = makeMock();

            assert(!Function.isGenerator(mock), `isGenerator() test failed`);
        } else {
            this.skip();
        }
    });

    it("a mock generator should have [Iterator]", function() {
        const mock = makeMock();
        mock.gen[Iterator] = [1, 2, 3, 4];

        assert.deepEqual(mock.gen[Iterator], [1, 2, 3, 4]);
    });

    it("a mock generator should have @@iterator", function() {
        const mock = makeMock();
        mock.gen[Iterator] = [1, 2, 3, 4];

        assert.isDefined(mock.gen[Symbol.iterator]);
    });

    it("should pass isGenerator if available", function() {
        if (Function.isGenerator) {
            const mock = makeMock();
            mock[Iterator] = [1, 2, 3, 4];

            assert(Function.isGenerator(mock), `isGenerator() test failed`);
        } else {
            this.skip();
        }
    });

    it("supports for...of...", function() {
        const mock = makeMock();
        mock.gen[Iterator] = [1, 2, 3, 4];

        const results = [];
        for (const one of mock.gen) {
            results.push(one);
        }

        assert.deepEqual(results, [1, 2, 3, 4]);
    });

    it("supports next().value next().done", function() {
        const mock = makeMock();
        mock.genFactory[Iterator] = [1, 2, 3, 4];
        const gen = mock.genFactory();

        const results = [];
        while(true) {
            const step = gen.next();
            if (step.done) {
                break;
            }
            results.push(step.value);
        }

        assert.deepEqual(results, [1, 2, 3, 4]);
    });

    it("mock generator should not be constructable", function() {
        const mock = makeMock();
        mock[Iterator] = [1, 2, 3, 4];
        const gen = mock();

        assert.throws(() => {
            new gen();
        }, TypeError, 'gen is not a constructor');
    });

    it("mock generator should not be constructable, even if the target was a function", function() {
        const mock = makeMock();
        mock[Iterator] = [1, 2, 3, 4];
        const gen = mock();

        assert.throws(() => {
            new gen();
        }, TypeError, 'gen is not a constructor');
    });

    it("mock generator should not be constructable, even if the target was a function*", function() {
        const mock = makeMock({
            target: function*() {},
        });
        mock[Iterator] = [1, 2, 3, 4];
        const gen = mock();

        assert.throws(() => {
            new gen();
        }, TypeError, 'gen is not a constructor');
    });
    
    it("generator function should not be a mock", function() {
        const mock = makeMock();
        mock[Iterator] = [1, 2, 3, 4];
        const gen = mock();

        assert.isUndefined(gen[Target]);
    });
});

describe("Callable Conflict", function() {
    it("trying to set [Return] after [Iterator]", function() {
        const mock = makeMock();
        mock(3)[Iterator] = [100, 200];

        assert.throws(() => {
            mock(3)[Return] = 5;
        }, TypeError);
    });

    it("trying to set [Iterator] after [Return]", function() {
        const mock = makeMock();
        mock(3)[Return] = 5;

        assert.throws(() => {
            mock(3)[Iterator] = [100, 200];
        }, TypeError);
    });
});

describe("As a key", function() {
    it("can be used as a key", function() {
        const mock = makeMock();
        const parent = {
            [mock]: "ok",
        };

        assert.isOk(mock in parent);
        assert.strictEqual(parent[mock], "ok");
        assert.isOk(parent.hasOwnProperty(mock));
    });

    it("the string form is the key", function() {
        const mock = makeMock();
        const parent = {
            [mock]: "ok",
        };

        const jsonStr = JSON.stringify(parent);
        assert.isOk(jsonStr.includes("[mokc id="),
                    `JSON string is: ${jsonStr}`);
    });
});


describe("Handler", function() {
    describe("general", function() {
        it("can access handlers", function() {
            const mock = makeMock();

            assert.isDefined(mock[Handler]);
        });

        it("handler is per mock", function() {
            const mock1 = makeMock();
            const mock2 = makeMock();

            assert.notStrictEqual(mock1[Handler], mock2[Handler]);
        });

        it("handlers' modification is local", function() {
            const mock1 = makeMock();
            const mock2 = makeMock();

            mock1[Handler].foo = "foo";
            assert.isUndefined(mock2[Handler].foo);
        });
    });
});

describe("Reflect", function() {
    describe("access path", function() {
        it("has starting access path 'mock' when created", function() {
            const mock = makeMock();
            assert.deepEqual(mock[AccessPath],
                             ["mock"]);
        });

        it("does not change access path when using a different circular reference", function() {
            const mock = makeMock().access.path;
            mock.circular.reference = mock;

            assert.deepEqual(mock.circular.reference[AccessPath],
                             ["mock", "access", "path"]);
        });

        it("does not change access path when used with an alias", function() {
            const mock = makeMock().foo;
            const foo = mock;

            assert.deepEqual(foo[AccessPath],
                             ["mock", "foo"]);
        });

        it("gives correct access paths when using different mocks in an alternating order", function() {
            const mock = makeMock();
            const abc = mock.a.b.c;
            const def = mock.d.e.f;  // try to confuse mokc

            assert.deepEqual(abc[AccessPath],
                             ["mock", "a", "b", "c"]);
        });

        it("annotates '()' when being a function call", function() {
            const mock = makeMock();

            const called = mock();
            assert.deepEqual(called[AccessPath],
                             ["mock()"]);
        });

        it("annotates '()' when being a function call in the middle of access path", function() {
            const mock = makeMock();

            const called = mock.a.b().c;
            assert.deepEqual(called[AccessPath],
                             ["mock", "a", "b()", "c"]);
        });
    });

    describe("access underlying target", function() {
        it("has [Target]", function() {
            const mock = makeMock();

            assert.isDefined(mock[Target]);
        });

        it("can access underlying target fully", function() {
            const mock = makeMock();
            const target = mock[Target];
            target.realValue = 3;

            assert.isNumber(mock.realValue);
            assert.strictEqual(mock.realValue, 3);
        });
    });
    
    describe("internal mock counter", function() {
        it("can read mock counter", function() {
            const counter1 = getMockCounter();
            makeMock();
            const counter2 = getMockCounter();

            assert.strictEqual(counter1 + 1, counter2);
        });
    });

    describe("under special symbols", function() {
        it("does not create mock under [Target]", function() {
            const mock = makeMock();

            assert.isUndefined(mock[Target][Target]);
        });

        it("does not create mock under [AccessPath]", function() {
            const mock = makeMock();

            assert.isUndefined(mock[AccessPath][Target]);
        });

        it("does not create mock under [Handler]", function() {
            const mock = makeMock();

            assert.isUndefined(mock[Handler][Target]);
        });

        it("does not create mock under @@toPrimitive", function() {
            const mock = makeMock();

            assert.isUndefined(mock[Symbol.toPrimitive][Target]);
        });

        it("does not create mock under [Iterator]", function() {
            const mock = makeMock();
            mock[Iterator] = [1, 2, 3, 4];

            assert.isUndefined(mock[Iterator][Target]);
            assert.isUndefined(mock[Symbol.iterator][Target]);
        });

        it("does not create mock under [Return]", function() {
            const mock = makeMock();

            assert.isUndefined(mock[Return]);
        });

        it("does not create mock under [Return], after called", function() {
            const mock = makeMock();
            const called = mock.method();

            assert.isDefined(called[Target]);
            assert.isUndefined(called[Return]);
        });
    });

    describe("Minimum impact", function() {
        it("not expose [AccessPath] via getOwnPropertySymbols", function() {
            const mock = makeMock();
            const symbols = Object.getOwnPropertySymbols(mock);

            assert.isFalse(symbols.includes(AccessPath));
        });

        it("not expose [Target] via getOwnPropertySymbols", function() {
            const mock = makeMock();
            const symbols = Object.getOwnPropertySymbols(mock);

            assert.isFalse(symbols.includes(Target));
        });

        it("not expose [Handler] via getOwnPropertySymbols", function() {
            const mock = makeMock();
            const symbols = Object.getOwnPropertySymbols(mock);

            assert.isFalse(symbols.includes(Handler));
        });

        it("not expose [Iterator] via getOwnPropertySymbols", function() {
            const mock = makeMock();
            const symbols = Object.getOwnPropertySymbols(mock);

            assert.isFalse(symbols.includes(Iterator));
        });

        it("not expose [Generator] via getOwnPropertySymbols", function() {
            const mock = makeMock();
            const symbols = Object.getOwnPropertySymbols(mock);

            assert.isFalse(symbols.includes(Generator));
        });

        it("not expose [Return] via getOwnPropertySymbols", function() {
            const mock = makeMock();
            const symbols = Object.getOwnPropertySymbols(mock);

            assert.isFalse(symbols.includes(Return));
        });

        it("not expose [has] via getOwnPropertySymbols", function() {
            const mock = makeMock();
            const symbols = Object.getOwnPropertySymbols(mock);

            assert.isFalse(symbols.includes(has));
        });

        it("not expose @@iterator via getOwnPropertySymbols", function() {
            const mock = makeMock();
            const symbols = Object.getOwnPropertySymbols(mock);

            assert.isFalse(symbols.includes(Symbol.iterator));
        });
    });

    describe("toString()", function() {
        it("toStringTag should work", function() {
            if (Symbol.toStringTag) {
                const mock = makeMock();

                const re = /^\[object mokc id=\d+ name='mock'\]$/;
                const stringTag = Object.prototype.toString.call(mock);
                assert.isTrue(re.test(stringTag), stringTag);
            } else {
                this.skip();
            }
        });

        it("toString() on the mock should be a mock", function() {
            const mock = makeMock();

            assert.isFunction(mock.toString());
        });
    });
});

describe("Interoperability", function() {
    describe("JSON.stringify", function() {
        it("throws when tried to JSON.stringify", function() {
            const mock = makeMock();
            
            assert.throws(() => JSON.stringify(mock),
                          Error);
        });

        it("returns custom made toJSON value if existed", function() {
            const mock = makeMock();
            mock.a.toJSON = 1;

            assert.strictEqual(mock.a.toJSON, 1);
        });

        it("supports real JSON.stringify if the mock is replaced with real values", function() {
            const mock = makeMock();
            mock.sub.object = {};

            mock.sub.object.test = "Hello";

            assert.strictEqual(JSON.stringify(mock.sub.object), '{"test":"Hello"}',
                               JSON.stringify(mock.sub.object));
        });
    });

    describe("ES6 Map", function() {
        it("can be used as a Map key", function() {
            const mock = makeMock();
            const map = new Map();
            map.set(mock, "ok");

            assert.strictEqual(map.get(mock), "ok");
        });

        it("can be used as a Map value", function() {
            const mock = makeMock();
            const map = new Map();
            const key = "ok";
            map.set(key, mock);

            assert.strictEqual(map.get(key), mock);
        });

        it("itself and its [Target] are considered two different values", function() {
            const mock = makeMock();
            const map = new Map();
            map.set(mock, "mock");
            map.set(mock[Target], "target");

            assert.strictEqual(map.get(mock), "mock");
            assert.strictEqual(map.get(mock[Target]), "target");
        });
    });

    describe("ES6 WeakMap", function() {
        it("can be used as a WeakMap key", function() {
            const mock = makeMock();
            const map = new WeakMap();
            map.set(mock, "ok");

            assert.strictEqual(map.get(mock), "ok");
        });

        it("can be used as a WeakMap value", function() {
            const mock = makeMock();
            const map = new WeakMap();
            const key = {};
            map.set(key, mock);

            assert.strictEqual(map.get(key), mock);
        });

        it("itself and its [Target] are considered two different values", function() {
            const mock = makeMock();
            const map = new WeakMap();
            map.set(mock, "mock");
            map.set(mock[Target], "target");

            assert.strictEqual(map.get(mock), "mock");
            assert.strictEqual(map.get(mock[Target]), "target");
        });
    });

    describe("spread operator", function() {
        const mock = makeMock();

        assert.throws(() => {
            [...mock];
        }, TypeError);
    });

    describe("Array.from", function() {
        it("Empty array", function() {
            const mock = makeMock();

            // Array.from -> .length -> toPrimitive(number) -> throw
            assert.throws(() => Array.from(mock), TypeError);
        });
    });

    describe("Array.concat", function() {
        it("is a TypeError when attempts to call with Array.concat", function() {
            const array = [];
            const mock = makeMock();

            assert.throws(() => {
                return array.concat(mock);
            }, TypeError);
        });
    });

    describe("Array.isArray", function() {
        it("is not an array", function() {
            const mock = makeMock();

            assert.isFalse(Array.isArray(mock));
        });
    });

    describe("Number.isInteger", function() {
        it("is not an integer", function() {
            const mock = makeMock();

            assert.isFalse(Number.isInteger(mock));
        });
    });

    describe("RegExp", function() {
        it("is a TypeError when attempts to call with RegExp", function() {
            this.skip();
            // how to test this?
        });
    });

    describe("Object.is", function() {
        it("mock and its [Target] are considered two objects by Object.is", function() {
            const mock = makeMock();

            assert.isFalse(Object.is(mock, mock[Target]));
        });
    });

    describe("instanceof", function() {
        context("By default, it is nothing", function() {
            it("being not Proxy", function() {
                const mock = makeMock();

                assert.isFalse(mock instanceof Proxy);
            });

            it("being not Function", function() {
                const mock = makeMock();

                assert.isFalse(mock instanceof Function);
            });

            it("being not String", function() {
                const mock = makeMock();

                assert.isFalse(mock instanceof String);
            });

            it("being not Number", function() {
                const mock = makeMock();

                assert.isFalse(mock instanceof Number);
            });

            it("being not Object", function() {
                const mock = makeMock();

                assert.isFalse(mock instanceof Object);
            });

            it("being not Date", function() {
                const mock = makeMock();

                assert.isFalse(mock instanceof Date);
            });

            it("being not Array", function() {
                const mock = makeMock();

                assert.isFalse(mock instanceof Array);
            });

            it("being not Boolean", function() {
                const mock = makeMock();

                assert.isFalse(mock instanceof Boolean);
            });
        });
    });

    describe("typeof", function() {
        it("being function", function() {
            const mock = makeMock();

            assert.isFunction(mock);
        });

        it("being object", function() {
            const mock = makeMock({
                target: {},
            });

            assert.isObject(mock);
        });
    });
});

describe("Operators", function() {
    describe("Arithmetics", function() {
        it("mock + mock", function() {
            const mock = makeMock();

            // toPrimitive(default) -> throw
            assert.throws(() => {
                mock + mock;
            }, TypeError);
        });

        it("mock + 1", function() {
            const mock = makeMock();

            assert.throws(() => {
                mock + 1;
            }, TypeError);
        });

        it("1 + mock", function() {
            const mock = makeMock();

            assert.throws(() => {
                1+ mock;
            }, TypeError);
        });
    });
});

describe("HasCalled Compiler", function() {
    it("access HasCalled assertion util", function() {
        const mock = makeMock();
        const result = mock();

        assert.isDefined(result[has]);
    });

    describe("true/false question", function() {
        it("anwsers called", function() {
            const mock = makeMock();
            const result = mock();

            assert.isTrue(mock[has].called());
            assert.isFalse(result[has].called());
        });

        it("anwsers called with()", function() {
            const mock = makeMock();
            mock();

            assert.isTrue(mock[has].called.with()());
            assert.isFalse(mock[has].called.with(1)());
        });

        it("anwsers called count()", function() {
            const mock = makeMock();
            mock();

            assert.isTrue(mock[has].called.count(1)());

            for (const count of [-1, 5.5, true]) {
                assert.throws(() => {
                    mock[has].called.count(count)();
                }, TypeError);
            }
        });

        it("anwsers called on()", function() {
            const mock = makeMock();
            mock();

            assert.isTrue(mock[has].called.on(undefined)());
            assert.isFalse(mock[has].called.on({})());
        });

        it("anwsers called after()", function() {
            const mock = makeMock();
            const time1 = performance.now();
            mock();
            const time2 = performance.now();

            assert.isTrue(mock[has].called.after(time1)());
            assert.isFalse(mock[has].called.after(time2)());
        });
    });
});
