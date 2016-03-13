"use strict";
"use strong";

import assert from "./assert";

describe("Platform", function() {
    describe("Well known symbols", function() {
        it("has @@hasInstance", function() {
            assert.isDefined(Symbol.hasInstance);
        });

        it("has @@isConcatSpreadable", function() {
            assert.isDefined(Symbol.isConcatSpreadable);
        });

        it("has @@iterator", function() {
            assert.isDefined(Symbol.iterator);
        });

        it("has @@match", function() {
            assert.isDefined(Symbol.match);
        });

        it("has @@replace", function() {
            assert.isDefined(Symbol.replace);
        });

        it("has @@search", function() {
            assert.isDefined(Symbol.search);
        });

        it("has @@species", function() {
            assert.isDefined(Symbol.species);
        });

        it("has @@split", function() {
            assert.isDefined(Symbol.split);
        });

        it("has @@toPrimitive", function() {
            assert.isDefined(Symbol.toPrimitive);
        });

        it("has @@toStringTag", function() {
            assert.isDefined(Symbol.toStringTag);
        });

        it("has @@unscopables", function() {
            assert.isDefined(Symbol.unscopables);
        });
    });
});
