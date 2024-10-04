export {StateButton};
import {VALUE, getTemplate} from "./base-element.js";
import {MultiState}         from "./multi-state.js";

const STATES = "data-states";
const AUTO   = "data-auto-increment"
const BTN    = "btn";

const template = await getTemplate("button");
// =============================================================================
class StateButton extends MultiState {
    #index; #states; #value; #values;
    static observedAttributes = [VALUE, STATES, AUTO,
                                 ...MultiState.observedAttributes];
    constructor() {
        super(template);
        this.#index  = 0;
        this.#states = {};
        this._use    = this._dom.getElementById(BTN);
        Object.defineProperty(this, "isStateButton", {value:true});
        this._keyCodes.add("Enter"); // enter key same as click
        Object.seal(this);
    }
//  attributeChangedCallback() handles changes to the observed attributes
    attributeChangedCallback(name, _, val) {
        switch (name) {
        case VALUE:
            const i = this.#values.indexOf(val);
            if (i >= 0) {
                this.#index = i;
                this.#value = val;                      // reverts on error
                this.title  = this.#states[val].title;
                this._setHref(this.#states[val].href);
            }
            else {
                this.setAttribute(VALUE, this.#value);  // revert
                throw new Error(`Invalid value: ${val}. Must be one of: ${this.#values.join(", ")}`);
            }
            break;
        case STATES:
            const states = {};
            for (var arr of JSON.parse(val)) //??validation??
                states[arr[0]] = {
                    href : `#${BTN}-${arr[1]}`,
                    title: arr[2] ?? arr[1][0].toUpperCase() + arr[1].slice(1)
                };
            this.#states = states;
            this.#values = Object.keys(states);
            this.value = this.#values.includes(this.value)
                       ? this.value               // same value, different state
                       : this.#values[this.#index];
        case AUTO:  //!!this case is unnecessary, as is observing this attribute
            break;
        default:
            super.attributeChangedCallback(name, _, val);
        }
    }
// this.auto   indicates whether to change states automatically via change event
// this.value  is the current value = this.#values[this.#index]
// this.states is the states object, which maps string values to href and title
    get auto()      { return this.hasAttribute(AUTO); }
    get value()     { return this.getAttribute(VALUE); }
    get states()    { return this.#states; }

    set auto(val)   { this._setBool    (AUTO,   val); }
    set value(val)  { this.setAttribute(VALUE,  val); }
    set states(val) { this.setAttribute(STATES, val); }

// this.index is public in case the client prefers using it instead of value
    get index()  { return this.#index; }
    set index(i) {
        if (i >= 0 && i < this.#index.length)
            this.value = this.#values[i];
        else
            throw new Error(`index out of range: ${val}. `
                          + `Must be between 0 and ${this.#index.length - 1}`);
    }
//  reset() is a small convenience
    reset() { this.#index = 0; }

//  change() converts click and enter-up to self-inflicted change event
    change(evt) {
        if (this._handleEvent(evt)) {
            if (this.auto) {
                if (this.#index == this.#values.length)
                    this.reset();
                this.value = this.#values[this.#index++];
            }
            this.dispatchEvent(new Event("change"));
        }
    }
}
customElements.define("state-button", StateButton);