export {CheckBox};

import {BaseElement} from "./base-element.js";
import {CheckBase}            from "./check-base.js";

const CHECKED = "checked";
// =============================================================================
// Traditional (bi-state) checkbox
class CheckBox extends CheckBase {
    static observedAttributes = [CHECKED, ...CheckBase.observedAttributes];
    constructor() {
        const states  = [
            {value:false, id:"false"},
            {value:true,  id:"true" }
        ];
        super(import.meta, CheckBox, states);
        this.is();
    }
//  _init()
    _init() {
        super._init();
        if (this.checked)
            this.value = true;
    }
//  attributeChangedCallback() handles changes to the observed attributes
    attributeChangedCallback(name, _, val) {
        switch (name) {
        case CHECKED:
            this.value = (val !== null);
        default:
            super.attributeChangedCallback(name, _, val);
        }
    }
// this.checked emulates the standard checked attribute
    get checked() { return this.hasAttribute(CHECKED); }
    set checked(val) {
        this.toggleAttribute(CHECKED, Boolean(val));
    }

//  _change() converts click and spacebar-up to a self-inflicted change event
    _change(evt) {
        if (this._handleEvent(evt)) {
            this.toggleAttribute(CHECKED);
            this.dispatchEvent(new Event("change")); // emulate HTML checkbox
        }
    }
}
BaseElement.define(CheckBox);