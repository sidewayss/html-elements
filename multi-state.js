export {MultiState};
import {BaseElement} from "./base-element.js";

const KEY_CODES = "data-key-codes";
// =============================================================================
// The multi-state base class, emulates change (not input) event, this.change
// declared in sub-classes, all of them dispatch a change event to the client.
class MultiState extends BaseElement {
    static observedAttributes = [KEY_CODES, ...BaseElement.observedAttributes];
    constructor(template) {
        super(template);
        this._keyCodes = new Set;
        this.addEventListener("keyup", this.change, false);
        this.addEventListener("click", this.change, false);
    }
//  attributeChangedCallback() handles changes to the observed attributes
    attributeChangedCallback(name, _, val) {
        if (name == KEY_CODES) {
            if (val === null)
                this._keyCodes.clear();
            else
                this._keyCodes = new Set(JSON.parse(val)) //??validation??
        }
        else
            super.attributeChangedCallback(name, _, val);
    }
// this.keyCodes is the Set of keycodes that act like mouseclick
    get keyCodes()    { return Array.from(this._keyCodes); }
    set keyCodes(val) {
        this.setAttribute(KEY_CODES, JSON.stringify(Array.from(val)));  //??validation??
    }
//  _handleEvent() determines whether or not to handle an event
    _handleEvent(evt) {
        return evt.type == "click" || this._keyCodes.has(evt.code);
    }
}