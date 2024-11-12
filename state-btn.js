export {StateBtn};

import {VALUE, BaseElement} from "./base-element.js";
import {MultiState}         from "./multi-state.js";
const
STATES = "data-states",
AUTO   = "data-auto-increment",
BTN    = "btn",

noAwait = true; // see https://github.com/sidewayss/html-elements/issues/8
// =============================================================================
class StateBtn extends MultiState {
    #index; #lookup; #states; #value; #values;
    static observedAttributes = [VALUE, STATES, ...MultiState.observedAttributes];
    constructor() {
        super(import.meta, StateBtn, noAwait);
        this.#lookup = {};
        this._keyCodes.add("Enter"); // enter key same as click
        Object.defineProperty(this, "isStateButton", {value:true});
        if (!noAwait)
            this._init();
    }
//  _init() exists for noAwait
    _init() {
        this._use = this._dom.getElementById(BTN);
        if (noAwait)
            this._setHref(this.#lookup[this.value].href);
    }
//  attributeChangedCallback() handles changes to the observed attributes
    attributeChangedCallback(name, _, val) {
        switch (name) {
        case VALUE:
            const i = this.#values.indexOf(val);
            if (i >= 0) {
                this.#index = i;
                this.#value = val;                          // reverts on error
                this.title  = this.#lookup[val].title;
                if (this._use)
                    this._setHref(this.#lookup[val].href);
            }
            else {
                if (this.#values.indexOf(this.#value))      // just in case...
                    this.setAttribute(VALUE, this.#value);  // revert
                throw new Error(`Invalid value: ${val}. Must be one of: ${this.#values.join(", ")}`);
            }
            break;
        case STATES:
            const lookup = {};
            this.#states = JSON.parse(val);   //!!validation??
            for (var arr of this.#states)
                lookup[arr[0]] = {
                    href : `#${BTN}-${arr[1]}`,
                    title: arr[2] ?? (arr[1][0].toUpperCase() + arr[1].slice(1))
                };
            this.#lookup = lookup;
            this.#values = Object.keys(lookup);
            this.value   = this.#values.includes(this.value)
                         ? this.value         // same value exists in new states
                         : (this.#values[this.#index] ?? this.#values[0]);
            break;
        default:
            super.attributeChangedCallback(name, _, val);
        }
    }
// this.autoIncrement auto-increments state in the change event
// this.value  is the current value = this.#values[this.#index]
// this.states is the states object, which maps string values to href and title
    get autoIncrement() { return this.hasAttribute(AUTO); }
    get value()         { return this.getAttribute(VALUE); }
    get states()        { return this.#states.slice(); }

    set autoIncrement(val) { this._setBool(AUTO,   val); }
    set value(val)     { this.setAttribute(VALUE,  val); }
    set states(val)    { this.setAttribute(STATES, val); }

// this.index is public in case the client prefers using it instead of value
    get index()  { return this.#index; }
    set index(i) {
        const max = this.#values.length - 1;
        if (i >= 0 && i <= max)
            this.value = this.#values[i];
        else {
            this.value = Math.max(0, Math.min(i, max));     // clamp it
            console.info(`Index out of range: ${i}. `       // info, not throw
                       + `Should be between 0 and ${max}. `
                       + `Clamped to: ${this.value}.`);
        }
    }
//  reset() is a small convenience
    reset() { this.index = 0; }

//  _change() converts click and enter-up to self-inflicted change event
    _change(evt) {
        if (this._handleEvent(evt)) {
            if (this.autoIncrement) {
                if (this.#index < this.#values.length - 1)
                    this.index++;
                else
                    this.reset();
            }
            this.dispatchEvent(new Event("change"));
        }
    }
}
BaseElement.define(StateBtn);