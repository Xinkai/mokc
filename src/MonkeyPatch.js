"use strict";

import { Target } from "./mokc";

export function monkeyPatch() {
    if (Array.from) {
        const oldArrayFrom = Array.from;
        Array.from = (thing) => {
            if (thing[Target]) {
                throw new TypeError(`Disable Array.from`);
            }
            return oldArrayFrom(thing);
        };
    }

    // For Edge 13
    if (!Array.prototype.includes) {
        Array.prototype.includes = function(searchElement /*, fromIndex*/ ) {
            const O = Object(this);
            const len = parseInt(O.length) || 0;
            if (len === 0) {
                return false;
            }
            const n = parseInt(arguments[1]) || 0;
            let k;
            if (n >= 0) {
                k = n;
            } else {
                k = len + n;
                if (k < 0) {k = 0;}
            }
            let currentElement;
            while (k < len) {
                currentElement = O[k];
                if (searchElement === currentElement ||
                    (searchElement !== searchElement && currentElement !== currentElement)) { // NaN !== NaN
                    return true;
                }
                k++;
            }
            return false;
        };
    }
}
