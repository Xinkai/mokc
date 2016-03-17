"use strict";

import { monkeyPatch } from "./MonkeyPatch";
monkeyPatch();

import { objectEquals, propStringForm } from "./common";
import { HasCalledCompiler } from "./HasCalledCompiler";

// support d8 shell
if (typeof console === "undefined") {
    if (typeof print !== "undefined") {
        this.console = {
            log: print,
            error: print,
        }
    }
}

// determine Proxy support status
switch (typeof Proxy) {
    case "undefined": {
        console.error(`Does not have Proxy support.`);
    }
    case "object": {
        // shim API
        const nativeProxy = global["Proxy"];
        class ProxyWrapper {
            constructor(target, handler) {
                return nativeProxy.create(target, handler);
            }
        }
        global["Proxy"] = ProxyWrapper;
    }
}

let mockCount = 0;



function formatAccessPath(accessPath, name) {
    if (name) {
        return [...accessPath, name];
    } else {
        return accessPath;
    }
}

export const AccessPath = Symbol("AccessPath");
export const MockId = Symbol("MockId");
export const Target = Symbol("Target");
export const Handler = Symbol("Handler");
export const Return = Symbol("Return");
export const Iterator = Symbol("Iterator");
export const Generator = Symbol("Generator");
export const has = Symbol("Assert");

const DefaultOptions = {
    [AccessPath]: ["mock"],
    debug: false,
    target: undefined,
};

function getHighResTime() {
    return performance ? performance.now() : null;
}

class MockDefaultTarget extends Function {

}

export function makeMock(optionsIn = null) {
    const options = Object.assign(Object.create(null), DefaultOptions);

    if (optionsIn) {
        Object.assign(options, optionsIn);
    }

    let iteratorSet = false;
    let returnSet = false;
    let assertionInterface = null;

    const targetNotSpecified = options.target === undefined;
    const target = targetNotSpecified ? new MockDefaultTarget() : options.target;
    const mockId = mockCount++;
    const accessPath = options[AccessPath].slice(0);
    const callHistory = [];

    if (!target[Symbol.toPrimitive]) { // This cannot be under handler's get()
        target[Symbol.toPrimitive] = (hint) => {
            switch (hint) {
                case "string": {
                    const parts = ["mokc"];
                    if (!targetNotSpecified) {
                        parts.push("targeted");
                    }
                    parts.push(`id=${mockId}`);
                    parts.push(`name='${accessPath.join(".")}'`);
                    return `[${parts.join(" ")}]`;
                }
                case "default": {
                    throw new TypeError("Cannot toPrimitive<default>");
                }
                default: {
                    throw new TypeError(`Unhandled hint ${hint}`);
                }
            }
        };
    }

    const handler = {
        set(obj, prop, value, receiver) {
            if (prop === Iterator) {
                if (returnSet) {
                    throw new TypeError(`@Return @Iterator conflict`);
                }
                iteratorSet = true;
            }
            if (prop === Return) {
                if (iteratorSet) {
                    throw new TypeError(`@Return @Iterator conflict`);
                }
                returnSet = true;
            }
            obj[prop] = value;
            return true;
        },
        get(obj, prop, receiver) {
            switch (typeof prop) {
                case "string": {
                    options.debug && console.log(`[Handler::get] ${obj}->${prop} ${receiver}`);
                    switch (prop) {
                        // special treatment for special keys
                        case "__proto__":
                        case "prototype": { // These two cannot be mocks, otherwise leads to infinite recursion problem
                            return obj[prop];
                        }
                        case "toJSON": {
                            if (Object.getOwnPropertyNames(obj).indexOf(prop) === -1) {
                                return () => {
                                    throw new Error(`You must do more before stringify`); // TODO: make this more clear
                                };
                            }
                            break;
                        }
                        default: {
                            if (Object.getOwnPropertyNames(obj).indexOf(prop) === -1) {
                                obj[prop] = makeMock({
                                    [AccessPath]: formatAccessPath(accessPath, prop),
                                });
                            }
                        }
                    }

                    break;
                }
                case "symbol": {
                    options.debug && console.log(`[Handler::get] ${obj}->${prop.toString()}`);
                    switch (prop) {
                        // mokc symbols
                        case Handler: {
                            return handler;
                        }
                        case AccessPath: {
                            return accessPath;
                        }
                        case Target: {
                            return obj;
                        }
                        case Return: {
                            if (returnSet) {
                                return obj[Return];
                            }
                            break;
                        }
                        case has: {
                            if (!assertionInterface) {
                                assertionInterface = {
                                    called: new HasCalledCompiler(callHistory),
                                };
                            }
                            return assertionInterface;
                        }
                        case MockId: {
                            return mockId;
                        }

                        // generic symbols
                        case Symbol.iterator: {
                            if (Object.getOwnPropertySymbols(obj).indexOf(prop) !== -1) {
                                break;
                            }
                            // TODO: implement: record iterator's consumer next() values for assertion
                            if (iteratorSet) {
                                return function*() {
                                    yield* obj[Iterator];
                                };
                            }
                            break;
                        }
                        case Symbol.toStringTag: {
                            // Object.prototype.toString.call(mock)
                            if (targetNotSpecified) {
                                return `mokc id=${mockId} name='${accessPath.join(".")}'`;
                            } else {
                                return `mokc targeted id=${mockId} name='${accessPath.join(".")}'`;
                            }

                        }
                        case Symbol.isConcatSpreadable: {
                            // [].concat(mock)
                            throw new TypeError("mokc does not implement Symbol.isConcatSpreadable");
                        }
                        case Symbol.isRegExp: {
                            throw new TypeError("mokc does not implement Symbol.isRegExp");
                        }
                        case Symbol.hasInstance: {
                            throw new TypeError("mokc does not implement Symbol.hasInstance");
                        }
                        case Symbol.toPrimitive: {
                            return (hint) => `Proxy(${obj[prop](hint)})`;
                        }
                        // List of known symbols, do not console.info it
                        case Iterator: {
                            break;
                        }
                        default: {
                            console.info(`Accessing ${prop.toString()}`);
                            break;
                        }
                    }
                    break;
                }
            }
            return obj[prop];
        },
        apply(obj, that, args) {
            const callTrace = accessPath.slice(0);
            callTrace[callTrace.length - 1] += "()";
            options.debug && console.log(`[Handler::apply] ${callTrace.join(".")} with [${args.join(", ")}]`);

            if (iteratorSet) {
                if (Object.getOwnPropertySymbols(obj).includes(Iterator)) {
                    return function*() {
                        yield* obj[Iterator];
                    }();
                }
            }

            for (const entry of callHistory) { // try to find the entry with the same `that`, `args`
                const [prevArgs, prevThat, prevReturn] = entry;
                if (objectEquals(prevArgs, args) &&
                    prevThat === that) {
                    if (Object.getOwnPropertySymbols(prevReturn).includes(Return)) {
                        callHistory.push(
                            [ args, that, prevReturn[Return], getHighResTime() ]
                        );
                        return prevReturn[Return];
                    }
                    callHistory.push(
                        [ args, that, prevReturn, getHighResTime() ]
                    );
                    return prevReturn;
                }
            }

            const result = makeMock({
                [AccessPath]: callTrace,
            });
            callHistory.push(
                [ args, that, result, getHighResTime() ]
            );
            return result;
        },
        construct(obj, args) {
            return makeMock({ args });
        },
        deleteProperty(obj, prop) {
            return Reflect.deleteProperty(obj, prop);
        },
        defineProperty(obj, prop, descriptor) {
            return Reflect.defineProperty(obj, prop, descriptor);
        },
        has(obj, prop) {
            options.debug && console.log(`[Handler::has] ${obj} ${propStringForm(prop)}`);
            return Reflect.has(obj, prop);
        },
        setPrototypeOf(obj, proto) {
            return Reflect.setPrototypeOf(target, proto);
        },
        getPrototypeOf(obj) {
            return null;
        },
        isExtensible(obj) {
            return Reflect.isExtensible(obj);
        },
        preventExtensions(obj) {
            return Reflect.preventExtensions(obj);
        },
        getOwnPropertyDescriptor(obj, prop) {
            return Reflect.getOwnPropertyDescriptor(obj, prop);
        },
        ownKeys(obj) {
            // TODO: do not blindly filter out name, and length
            return Reflect.ownKeys(obj).filter(one => one != "name" && one != "length");
        },
    };

    return new Proxy(target, handler);
}

export function getMockCounter() {
    return mockCount;
}
