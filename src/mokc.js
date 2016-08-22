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
};

function getHighResTime() {
    return performance ? performance.now() : null;
}

class MockDefaultTarget extends Function {

}

export function makeMock(optionsIn = null, target = null) {
    const options = Object.assign(Object.create(null), DefaultOptions);

    if (optionsIn) {
        Object.assign(options, optionsIn);
    }

    let name;
    let iteratorSet = false;
    let returnSet = false;
    let assertionCompiler = false;
    const targetNotSpecified = target === null;
    if (targetNotSpecified) {
        target = new MockDefaultTarget();
    }
    const mockId = mockCount++;
    const accessPath = options[AccessPath].slice(0);
    const callHistory = [];

    target[Symbol.toPrimitive] = (hint) => {
        switch (hint) {
            case "string": {
                const parts = ["mokc"];
                parts.push(`id=${mockId}`);
                parts.push(`name='${formatAccessPath(accessPath, name).join(".")}'`);
                return `[${parts.join(" ")}]`;
            }
            case "default": {
                throw new TypeError("Cannot convert to primitive");
            }
            default: {
                throw new TypeError(`Unhandled hint ${hint}`);
            }
        }
    };

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
                    options.debug && console.debug(`[Handler::get] ${obj}->${prop} ${receiver}`);
                    switch (prop) {
                        case "__proto__": {
                            return obj.__proto__;
                        }
                        case "prototype": {
                            return obj.prototype;
                        }
                        case "toJSON": {
                            if (typeof obj[prop] === "undefined") {
                                return () => {
                                    throw new Error(`You must do more before stringify`); // TODO: make this more clear
                                };
                            }
                            break;
                        }
                        default: {}
                    }
                    if (Object.getOwnPropertyNames(obj).indexOf(prop) === -1) {
                        name = prop;
                        obj[prop] = makeMock({
                            [AccessPath]: formatAccessPath(accessPath, name),
                        });
                    }
                    break;
                }
                case "symbol": {
                    options.debug && console.debug(`[Handler::get] ${obj}->${prop.toString()}`);
                    switch (prop) {
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
                        case Symbol.iterator: {
                            if (iteratorSet) {
                                return function*() {
                                    yield* obj[Iterator];
                                };
                            }
                            break;
                        }
                        case has: {
                            if (!assertionCompiler) {
                                assertionCompiler = {
                                    called: new HasCalledCompiler(callHistory),
                                };
                            }
                            return assertionCompiler;
                        }
                        case MockId: {
                            return mockId;
                        }
                        case Symbol.toStringTag: {
                            // Object.prototype.toString.call(mock)
                            return `mokc id=${mockId} name='${formatAccessPath(accessPath, name).join(".")}'`;
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
                        // List of known symbols, do not info it
                        case Iterator:
                        case Symbol.toPrimitive: {
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
            options.debug && console.debug(`[Handler::apply] ${callTrace.join(".")} with [${args.join(", ")}]`);

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
                [AccessPath]: formatAccessPath(callTrace, name),
            });
            callHistory.push(
                [ args, that, result, getHighResTime() ]
            );
            return result;
        },
        construct(obj, args) {
            if (iteratorSet) {
                throw new TypeError(`${name} is not a constructor`);
            }
            return makeMock();
        },
        deleteProperty(obj, prop) {
            return Reflect.deleteProperty(obj, prop);
        },
        defineProperty(obj, prop, descriptor) {
            return Reflect.defineProperty(obj, prop, descriptor);
        },
        has(obj, prop) {
            options.debug && console.debug(`[Handler::has] ${obj} ${propStringForm(prop)}`);
            return Reflect.has(obj, prop);
        },
        setPrototypeOf(obj, proto) {
            return Reflect.setPrototypeOf(target, proto);
        },
        getPrototypeOf(obj) {
            return Reflect.getPrototypeOf(obj);
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
            return Reflect.ownKeys(obj);
        },
    };

    return new Proxy(target, handler);
}

export function getMockCounter() {
    return mockCount;
}
