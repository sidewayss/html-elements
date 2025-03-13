export {CheckTri};

import {VALUE, BaseElement} from "./base-element.js";
import {CheckBase}                   from "./check-base.js";
const
VB_WIDTH = 2,
DEFAULT  = "default",      // custom attributes
SHOW_DEF = "show-default";
// =============================================================================
// Three-state checkbox: true, false, indeterminate (null)
class CheckTri extends CheckBase {
    #def; #svg; #vbWidth; #viewBox;

    static observedAttributes = [VALUE, DEFAULT, SHOW_DEF,
                                 ...CheckBase.observedAttributes];
    constructor() {
        const states = [
            {value:null,  id:"null" },
            {value:false, id:"false"},
            {value:true,  id:"true" }
        ];
        super(import.meta, CheckTri, states);
        this.is();
    }
//  _init()
    _init() {
        super._init();
        this.#svg     = this.shadowRoot.getElementById("shapes");
        this.#def     = this.#svg.getElementById("default-mark");
        this.#viewBox = this.#svg.getAttribute("viewBox")
                                 .split(" ")
                                 .map(v => Number(v));
        if (!this.#vbWidth)
            this.#vbWidth = this.#viewBox[VB_WIDTH]; // baseline width

        this.default     = this.default;     // attributeChangedCallback() did
        this.showDefault = this.showDefault; // nothing, gotta do it here.
    }
//  attributeChangedCallback() handles changes to the observed attributes
    attributeChangedCallback(name, _, val) {
        const b = (val !== null);
        switch (name) {
        case DEFAULT:
            this._setHref(this.map.get(b).id, this.#def);
            break;
        case SHOW_DEF:
            if (!this.#def) return;
            //------------------------------------
            const w = this.#vbWidth * (b ? 2 : 1);
            this.#viewBox[VB_WIDTH] = w;
            this.#svg.setAttribute("width", w);
            this.#svg.setAttribute("viewBox", this.#viewBox.join(" "));

            this.#def .parentNode.setAttribute("visibility", b ? "" : "hidden");
            this._use?.parentNode.setAttribute("transform",
                                               b ? `translate(${this.#vbWidth})`
                                                 : "");
            break;
        default:
            super.attributeChangedCallback(name, _, val);
        }
    }
// this.default is the default value for when value == null (indeterminate)
// this.showDefault determines whether to show the default value as a 2nd box
    get default()     { return this.hasAttribute(DEFAULT);  }
    get showDefault() { return this.hasAttribute(SHOW_DEF); }

    set default(val)     { this.toggleAttribute(DEFAULT,  Boolean(val)); }
    set showDefault(val) { this.toggleAttribute(SHOW_DEF, Boolean(val)); }

// this.checked is read-only, null = indeterminate = inherit default
    get checked() { return this.value ?? this.default; }

//  _change() converts click and spacebar-up to a self-inflicted change event
//            The 3-way rotation order depends on the boolean default attribute.
//            Starting from null, rotate to the opposite of default:
//               null -> !def -> def -> null -> ...
    _change(evt) {
        if (this._handleEvent(evt)) {
            const def  = this.default;
            this.value = (this.value === null) ? !def
                       : (this.value !== def)  ?  def
                                               : null;
            this.dispatchEvent(new Event("change"));
        }
    }
}
BaseElement.define(CheckTri);