"use strict";
"use strong";

import { objectEquals } from "./common";

/**
 * mokc[has].called()  => boolean -> called at all
 * mokc[has].called.with(1, 2, 3).on(that).count(5)() => boolean called on that and, arguments were (1, 2, 3)
 */

const [ pArguments, pBind, pReturn, pDate ] = [0, 1, 2, 3];
export const What = Symbol("What");
export const Whats = Symbol("Whats");
const NotSet = Symbol("NotSet");

export class HasCalledCompiler {
    constructor(data) {
        // Constructor overloading
        /* istanbul ignore else */
        if (data instanceof Array) {
            this.constructNew(data);
        } else if (data instanceof HasCalledCompiler) {
            this.constructCopy(data);
        } else {
            throw new Error(`Unknown signature passed to HasCalledCompiler`);
        }
        return this.interface;
    }

    constructNew(callHistory) {
        this.answer = NotSet;
        this.answerMultiple = false;
        this.callHistory = callHistory;
        this.filters = {
            arguments: NotSet,
            bind: NotSet,
            count: null,
            after: [],
            before: [],
            ret: NotSet,
        }
    }

    constructCopy(from) {
        this.answer = from.answer;
        this.answerMultiple = from.answerMultiple;
        this.callHistory = from.callHistory;
        this.filters = {
            arguments: from.filters.arguments,
            bind: from.filters.bind,
            count: from.filters.count,
            after: from.filters.after.slice(0),
            before: from.filters.before.slice(0),
            ret: from.filters.ret,
        }
    }

    get interface() {
        const result = this.evaluate.bind(this);
        Object.assign(result, {
            with: (...args) => {
                if (args.length === 1) {
                    if (args[0] === What) {
                        const clone = new HasCalledCompiler(this).instance();
                        clone.filters.arguments = NotSet;
                        clone.answer = "Arguments";
                        clone.answerMultiple = false;
                        return clone.interface;
                    }
                    if (args[0] === Whats) {
                        const clone = new HasCalledCompiler(this).instance();
                        clone.filters.arguments = NotSet;
                        clone.answer = "Arguments";
                        clone.answerMultiple = true;
                        return clone.interface;
                    }
                }
                return this.filter("Arguments", args)
            },
            on: (that) => {
                return this.filter("Bind", that);
            },
            count: (count) => {
                if (typeof count === "number") {
                    if (!Number.isInteger(count)) {
                        throw new TypeError(`Must be integer`);
                    }
                    if (count < 0) {
                        throw new TypeError(`Must be non-negative`);
                    }
                    return this.filter("Count", count);
                } else if (typeof count === "symbol") {
                    if (count === What) {
                        const clone = new HasCalledCompiler(this).instance();
                        clone.filters.count = NotSet;
                        clone.answer = "Count";
                        clone.answerMultiple = false;
                        return clone.interface;
                    }
                    throw new TypeError(`Unsupported ${count.toString()}`);
                } else {
                    throw new TypeError(`Must be Number`);
                }
            },
            after: (time) => {
                if (time === What || time === Whats) {
                    throw new TypeError(`filter after does not support query interface.`);
                }
                return this.filter("After", time);
            },
            before: (time) => {
                if (time === What || time === Whats) {
                    throw new TypeError(`filter before does not support query interface.`);
                }
                return this.filter("Before", time);
            },
            returns: (ret) => {
                if (ret === What) {
                    const clone = new HasCalledCompiler(this).instance();
                    clone.filters.ret = NotSet;
                    clone.answer = "Return";
                    clone.answerMultiple = false;
                    return clone.interface;
                }
                if (ret === Whats) {
                    const clone = new HasCalledCompiler(this).instance();
                    clone.filters.ret = NotSet;
                    clone.answer = "Return";
                    clone.answerMultiple = true;
                    return clone.interface;
                }
                return this.filter("Return", ret);
            },
            instance: () => this,
        });
        return result;
    }

    evaluate() {
        const copied = this.callHistory.slice(0);

        const result = copied.filter(one => {
            if (this.filters.arguments !== NotSet) {
                if (!objectEquals(one[pArguments], this.filters.arguments)) {
                    return false;
                }
            }
            if (this.filters.bind !== NotSet) {
                if (one[pBind] !== this.filters.bind) {
                    return false;
                }
            }
            if (this.filters.ret !== NotSet) {
                if (!objectEquals(one[pReturn], this.filters.ret)) {
                    return false;
                }
            }
            for (const against of this.filters.after) {
                if (against >= one[pDate]) {
                    return false;
                }
            }
            for (const against of this.filters.before) {
                if (against <= one[pDate]) {
                    return false;
                }
            }

            return true;
        });

        if (this.answer === NotSet) {
            if (typeof this.filters.count === "number") {
                if (this.filters.count !== result.length) {
                    return false;
                }
            }
            return !!result.length;
        } else {
            if (this.answer === "Count") {
                return result.length;
            } else {
                let answer;
                switch (this.answer) {
                    case "Arguments": {
                        answer = result.map(one => one[pArguments]);
                        break;
                    }
                    case "Return": {
                        answer = result.map(one => one[pReturn]);
                        break;
                    }
                }
                answer = answer.filter((elem, index, arr) => arr.indexOf(elem) === index);
                if (!this.answerMultiple) {
                    if (answer.length !== 1) {
                        throw new RangeError(`Got ${result.length} results, use Whats query.`);
                    } else {
                        return answer[0];
                    }
                }
                return answer;
            }
        }
    }

    filter(type, condition) {
        const clone = new HasCalledCompiler(this).instance();
        if (clone.answer === type) {
            clone.answer = NotSet;
        }
        switch(type) {
            case "Arguments": {
                clone.filters.arguments = condition;
                break;
            }
            case "Bind": {
                clone.filters.bind = condition;
                break;
            }
            case "Count": {
                clone.filters.count = condition;
                break;
            }
            case "After": {
                clone.filters.after.push(condition);
                break;
            }
            case "Before": {
                clone.filters.before.push(condition);
                break;
            }
            case "Return": {
                clone.filters.ret = condition;
                break;
            }
            default: {}
        }
        return clone.interface;
    }
}
