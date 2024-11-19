export {CheckBox, CheckTri};

import {VALUE, BaseElement} from "./base-element.js";
import {MultiState}         from "./multi-state.js";
const
TRUE  = "1",
FALSE = "",

CHECKED   = "checked",      // built-in attribute
DEFAULT   = "default",      // custom attributes
SHOW_DEF  = "show-default",
LABEL     = "label",

noAwait = true; // see https://github.com/sidewayss/html-elements/issues/8
// =============================================================================
// The checkbox base class
class MultiCheck extends MultiState {
    #label;
    static observedAttributes = [LABEL, ...MultiState.observedAttributes];
    constructor() {     // this is not available yet, but MultiCheck is
        super(import.meta, MultiCheck, noAwait);
        this._keyCodes.add("Space");                   // spacebar = click
    }
//  _init() exists for old browsers w/o await at module top level
    _initSuper() {
        this._use   = this._dom.getElementById("mark");
        this.#label = this._dom.getElementById(LABEL); // optional <pre>
        if (noAwait)
            this.label = this.label; // attributeChangedCallback did nothing
    }
//  attributeChangedCallback() handles changes to the observed attributes
    attributeChangedCallback(name, _, val) {
        if (name == LABEL) {
            if (this.#label)
                this.#label.innerHTML = (val === null) ? "" : val;
        }
        else
            super.attributeChangedCallback(name, _, val);
    }
    get labelElement() {return this.#label; }

    get label()    { return this.getAttribute(LABEL); }
    set label(val) {
        if (!val)       // consolidate empty label values to null
            this.removeAttribute(LABEL);
        else
            this.setAttribute(LABEL, val);
    }
}
// =============================================================================
// Two-state checkbox
class CheckBox extends MultiCheck {
    static hrefs = ["#false","#true"];
    static observedAttributes = [CHECKED, ...MultiCheck.observedAttributes];
    constructor() {
        super();
        Object.defineProperty(this, "isCheckBox", {value:true});
        if (!noAwait)
            this._init();
    }
//  _init() exists for noAwait
    _init() {
        this._initSuper();
        if (noAwait && this.checked)
            this._setHref(CheckBox.hrefs[1]);
    }
//  attributeChangedCallback() handles changes to the observed attributes
    attributeChangedCallback(name, _, val) {
        if (name == CHECKED) {
            if (this._use)
                this._setHref(CheckBox.hrefs[Number(val !== null)]);
        }
        else
            super.attributeChangedCallback(name, _, val);
    }
// this.checked emulates the standard checked attribute
    get checked()    { return this.hasAttribute(CHECKED); }
    set checked(val) { this._setBool(CHECKED, val);  }

// this.value is a convenient alias
    get value()    { return this.checked; }
    set value(val) { this.checked = val;  }

//  _change() converts click and spacebar-up to a self-inflicted change event
    _change(evt) {
        if (this._handleEvent(evt)) {
            this.checked = !this.checked;
            this.dispatchEvent(new Event("change")); // emulate HTML checkbox
        }
    }
}
// =============================================================================
// Three-state checkbox: true, false, indeterminate (null)
class CheckTri extends MultiCheck {
    #def; #svg; #viewBox;
    static #vbW  = 2;  // viewBox array index for width
    static hrefs = new Map([[null,  "#null"],
                            [FALSE, CheckBox.hrefs[0]],
                            [TRUE,  CheckBox.hrefs[1]]]);

    static observedAttributes = [VALUE, DEFAULT, SHOW_DEF,
                                 ...MultiCheck.observedAttributes];
    constructor() {
        super();
        Object.defineProperty(this, "isCheckTri", {value:true});
        if (!noAwait)
            this._init();
    }
//  _init() exists for noAwait
    _init() {
        this._initSuper();
        this.#svg     = this._dom.getElementById("shapes");
        this.#def     = this.#svg.getElementById("default-mark");
        this.#viewBox = this.#svg.getAttribute("viewBox")
                                 .split(" ")
                                 .map(v => Number(v));
        if (!CheckTri._w)
            CheckTri._w = this.#viewBox[CheckTri.#vbW]; // baseline width //$ used to be private...

        this._setHref(CheckTri.hrefs.get(this.value));
        if (noAwait) {
            this.default = this.default; // attributeChangedCallback did nothing
            this.showDefault = this.showDefault;
        }
    }
//  attributeChangedCallback() handles changes to the observed attributes
    attributeChangedCallback(name, _, val) {
        const b = (val !== null);
        switch (name) {
        case VALUE:
            if (this._dom)
                this._setHref(CheckTri.hrefs.get(val));
            break;
        case DEFAULT:
            if (this._dom)
                this._setHref(CheckBox.hrefs[Number(b)], this.#def);
            break;
        case SHOW_DEF:
            if (!this._dom) return;
            //--------------
            let v,
            w = CheckTri._w;
            if (b)
                w *= 2;
            this.#viewBox[CheckTri.#vbW] = w;
            this.#svg.setAttribute("width", w);
            this.#svg.setAttribute("viewBox", this.#viewBox.join(" "));

            v = b ? "visible" : "hidden";
            this.#def.parentNode.setAttribute("visibility", v);

            v = b ? `translate(${CheckTri._w})` : "";
            this._use.parentNode.setAttribute("transform", v);
            break;
        default:
            super.attributeChangedCallback(name, _, val);
        }
    }
// this.default is the default value for when value == null (indeterminate)
// this.showDefault determines whether to show the default value as a 2nd box
    get default()     { return this.hasAttribute(DEFAULT);  }
    get showDefault() { return this.hasAttribute(SHOW_DEF); }
    set default(val)     { this._setBool(DEFAULT,  val); }
    set showDefault(val) { this._setBool(SHOW_DEF, val); }

// this.value can be indeterminate (null), FALSE (""), or TRUE ("1")
    get value()     {
        const val = this.getAttribute(VALUE);
        return val === null ? val : Boolean(val);
    }
    set value(val)  {
        if (val !== null)
            this.setAttribute(VALUE, val ? TRUE : FALSE);
        else {
            this.removeAttribute(VALUE);
            val = this.default;          // indeterminate = inherit default
        }
        this._setBool(CHECKED, val);     // apply it as checked attribute
    }
// this.checked is read-only
    get checked() {
        return this.value === null ? this.default : Boolean(this.value);
    }

//  _change() converts click and spacebar-up to a self-inflicted change event
    _change(evt) {
        // The 3 states are TRUE = "1", FALSE = "", and null.
        // The 3-way rotation order depends on boolean default attribute.
        // Start null, then rotate to the opposite of default:
        //    null -> !b -> b -> null -> ...
        if (this._handleEvent(evt)) {
            const def = this.default;
            switch (this.value) {
            case null:
                this.value = def ? FALSE : TRUE;  break;
            case false:
                this.value = def ? TRUE  : null;  break;
            case true:
                this.value = def ? null : FALSE;
            }
            this.dispatchEvent(new Event("change"));
        }
    }
}
BaseElement.define(CheckBox);
BaseElement.define(CheckTri);