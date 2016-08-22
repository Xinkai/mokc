"use strict";

import { propStringForm, targetStringForm } from "../common";
const assert = chai.assert;

// We are eventually going to fully replace assert provided by chai, because
//   1. chai.assert will mess up with the object, for instance trying to test the existence of keys;
//   2. chai.assert does not default to '===' operators, and I'd hate to strict everything;

assert.isObject = (object, msg = null) => {
    // chai.assert tries to do some Object.prototype.toString.call() thingy, causing problems here and we don't need it
    assert(typeof object === "object", msg ? msg : `${targetStringForm(object)} is not an object`);
};

assert.isFunction = (object, msg = null) => {
    assert(typeof object === "function", msg ? msg : `${targetStringForm(object)} is not a function`);
};

assert.property = (object, prop, msg = null) => {
    // chai.assert will unexpectedly create new sub-mock objects by accessing properties
    assert(prop in object, msg ? msg : `${targetStringForm(object)} does not have property ${propStringForm(prop)}`);
};

assert.notProperty = (object, prop, msg = null) => {
    assert(!(prop in object), msg ? msg : `${targetStringForm(object)} has property ${propStringForm(prop)}`);
};

assert.ownProperty = (object, prop, msg = null) => {
    /* istanbul ignore else */
    if (typeof prop === "string") {
        assert(Object.getOwnPropertyNames(object).includes(prop),
            msg ? msg : `${targetStringForm(object)} does not have own property ${propStringForm(prop)}`);
    } else if (typeof prop === "symbol") {
        assert(Object.getOwnPropertySymbols(object).indexOf(prop) !== -1,
            msg ? msg : `${targetStringForm(object)} does not have own property ${propStringForm(prop)}`);
    } else {
        throw new TypeError(`Property is of type ${typeof prop}`);
    }
};

assert.notOwnProperty = (object, prop, msg = null) => {
    /* istanbul ignore else */
    if (typeof prop === "string") {
        assert(!Object.getOwnPropertyNames(object).includes(prop),
            msg ? msg : `${targetStringForm(object)} does not have own property ${propStringForm(prop)}`);
    } else if (typeof prop === "symbol") {
        assert(Object.getOwnPropertySymbols(object).indexOf(prop) === -1,
            msg ? msg : `${targetStringForm(object)} does not have own property ${propStringForm(prop)}`);
    } else {
        throw new TypeError(`Property is of type ${typeof prop}`);
    }
};

export default assert;
