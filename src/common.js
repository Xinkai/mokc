"use strict";

export function propStringForm(prop) {
    /* istanbul ignore else */
    if (typeof prop === "string") {
        return `"${prop}"`;
    } else if (typeof prop === "symbol") {
        return prop.toString();
    } else {
        throw new TypeError(`${typeof prop} is not a valid key type`);
    }
}

export function targetStringForm(target) {
    // Edge 13.10586 does not have it natively
    if (target[Symbol.toPrimitive]) {
        return `${target[Symbol.toPrimitive]("string")}`;
    } else {
        return `${target}`;
    }
}

export function objectEquals(x, y) {
    if (x === null || x === undefined || y === null || y === undefined) { return x === y; }
    // after this just checking type of one would be enough
    if (x.constructor !== y.constructor) { return false; }
    // if they are functions, they should exactly refer to same one (because of closures)
    if (x instanceof Function) { return x === y; }
    // if they are regexps, they should exactly refer to same one (it is hard to better equality check on current ES)
    if (x instanceof RegExp) { return x === y; }
    if (x === y || x.valueOf() === y.valueOf()) { return true; }
    if (Array.isArray(x) && x.length !== y.length) { return false; }

    // if they are dates, they must had equal valueOf
    if (x instanceof Date) { return false; }

    // if they are strictly equal, they both need to be object at least
    if (!(x instanceof Object)) { return false; }
    if (!(y instanceof Object)) { return false; }

    // recursive object equality check
    const p = Object.keys(x);
    return Object.keys(y).every(function (i) { return p.indexOf(i) !== -1; }) &&
        p.every(function (i) { return objectEquals(x[i], y[i]); });
}