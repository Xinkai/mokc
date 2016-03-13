"use strict";
"use strong";

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
}
