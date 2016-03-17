"use strict";

import assert from "./assert";

import { What, Whats, HasCalledCompiler } from "../HasCalledCompiler";

describe("HasCalledCompiler", function() {
    it("construct", function() {
        new HasCalledCompiler([]);
    });

    it("is a function", function() {
        const hc = new HasCalledCompiler([]);
        assert.isFunction(hc);
    });

    it("can set filters", function() {
        const hc = new HasCalledCompiler([]);

        const hc2 = hc.with(1, 2, 3);

        assert.notStrictEqual(hc, hc2);
    });

    describe("Called or not", function() {
        const fixture = [
            [ [1, 2, 3], console, "Return" , new Date(1234567890) ],
            [ ["arg0", "arg1"], null, "Return", new Date(9876543210) ],
        ];

        it("called", function() {
            const hc = new HasCalledCompiler(fixture);

            assert.isTrue(hc());
        });

        it("called with [1, 2, 3]", function() {
            const hc = new HasCalledCompiler(fixture);

            assert.isTrue(hc.with(1, 2, 3)());
        });

        it("not called with false", function() {
            const hc = new HasCalledCompiler(fixture);

            assert.isFalse(hc.with(false)());
        });

        it("called on console", function() {
            const hc = new HasCalledCompiler(fixture);

            assert.isTrue(hc.on(console)());
        });

        it("not called on console.log", function() {
            const hc = new HasCalledCompiler(fixture);

            assert.isFalse(hc.on(console.log)());
        });

        it("called 2 times", function() {
            const hc = new HasCalledCompiler(fixture);

            assert.isTrue(hc.count(2)());
        });

        it("not called 3 times", function() {
            const hc = new HasCalledCompiler(fixture);

            assert.isFalse(hc.count(3)());
        });

        it("called returns Return", function() {
            const hc = new HasCalledCompiler(fixture);

            assert.isTrue(hc.returns("Return")());
        });

        it("not called returns Haha", function() {
            const hc = new HasCalledCompiler(fixture);

            assert.isFalse(hc.returns("Haha")());
        });

        it("called after", function() {
            const hc = new HasCalledCompiler(fixture);

            assert.isTrue(hc.after(new Date(0)).count(2)());
        });

        it("not called: before", function() {
            const hc = new HasCalledCompiler(fixture);

            assert.isFalse(hc.before(new Date(0))());
        });

        it("can branch to two queries", function() {
            const hc = new HasCalledCompiler(fixture);

            const query1 = hc.returns("Return");
            const query2 = query1.count(10);

            assert.isTrue(query1());
            assert.isFalse(query2());
        });
    });

    describe("Query What[s]", function() {
        const fixture = [
            [ [1, 2, 3], console, "Return" , new Date(1234567890) ],
            [ ["arg0", "arg1"], null, "Return", new Date(9876543210) ],
            [ ["arg0", "arg1"], null, "Return", new Date(109876543210) ],
        ];

        it("filter bind, query what[s]", function() {
            const hc = new HasCalledCompiler(fixture);

            assert.deepEqual(hc.on(console).with(What)(), [1, 2, 3]);
            assert.deepEqual(hc.on(console).with(Whats)(), [[1, 2, 3]]);
        });

        it("query after", function() {
            const hc = new HasCalledCompiler(fixture);

            assert.throws(() => {
                hc.after(What)();
            }, TypeError);
        });

        it("expect duplicates removed", function() {
            const hc = new HasCalledCompiler(fixture);

            const answer = hc.on(null).returns(What)();
            const answers = hc.on(null).returns(Whats)();
            assert.strictEqual(answer, "Return");
            assert.deepEqual(answers, ["Return"]);
        });

        it("is a RangeError when query What but getting more than one answer", function() {
            const hc = new HasCalledCompiler(fixture);

            assert.throws(() => {
                hc.on(null).with(What)();
            }, RangeError);
        });

        it("query count", function() {
            const hc = new HasCalledCompiler(fixture);

            const answer = hc.count(What)();
            assert.strictEqual(answer, 3);

            assert.throws(() => {
                hc.count(Whats)();
            }, TypeError);
        });
    });
});
