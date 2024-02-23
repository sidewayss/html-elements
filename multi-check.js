export {CheckBox, CheckTri};
import {VALUE, getTemplate, MultiState} from "./multi-state.js";

const TRUE  = "1";
const FALSE = "";

const DEF_BOX   = "default-box";    // element  ids
const CHECK_BOX = "check-box";
const CHECKED   = "checked";        // built-in attribute
const DEFAULT   = "data-default";   // custom attributes
const SHOW_DEF  = "data-show-default";
const LABEL     = "data-label";

const CHECK    = "check";
const template = await getTemplate(CHECK);
// =============================================================================
// The checkbox base class
class MultiCheck extends MultiState {
    #label;
    static observedAttributes = [LABEL, ...MultiState.observedAttributes];
    constructor() {
        super(template);
        this._use   = this._dom.getElementById(CHECK_BOX);
        this.#label = this._dom.getElementById(LABEL); // optional <pre>
        this._keyCodes.add("Space");                   // spacebar = click
    }
//  attributeChangedCallback() handles changes to the observed attributes
    attributeChangedCallback(name, _, val) {
        if (name == LABEL)
            this.#label.innerHTML = (val === null) ? "" : val;
        else
            super.attributeChangedCallback(name, _, val);
    }
    get label()    { return this.getAttribute(LABEL); }
    set label(val) { this.setAttribute(LABEL, val);   }
}
// =============================================================================
// Two-state checkbox
class CheckBox extends MultiCheck {
    static hrefs = ["#box","#chk"];
    static observedAttributes = [CHECKED, ...MultiCheck.observedAttributes];
    constructor() {
        super();
        const def = this._dom.getElementById(DEF_BOX);
        def.parentNode.removeChild(def);    // used exclusively by CheckTri
        Object.defineProperty(this, "isCheckBox", {value:true});
        Object.seal(this);
    }
//  attributeChangedCallback() handles changes to the observed attributes
    attributeChangedCallback(name, _, val) {
        if (name == CHECKED)
            this._setHref(CheckBox.hrefs[Number(val !== null)]);
        else
            super.attributeChangedCallback(name, _, val);
    }
// this.checked emulates the standard checked attribute
    get checked()    { return this.hasAttribute(CHECKED); }
    set checked(val) { this._setBool(CHECKED, val);  }

//  change() converts click and spacebar-up to a self-inflicted change event
    change(evt) {
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
    static #w;
    static #vbW  = 2;  // viewBox array index for width
    static hrefs = new Map([[null,"#ind"],[FALSE,"#box"],[TRUE,"#chk"]]);
    static observedAttributes = [VALUE, DEFAULT, SHOW_DEF,
                                 ...MultiCheck.observedAttributes];
    constructor() {
        super();
        this.#svg     = this._dom.getElementById(CHECK);
        this.#def     = this.#svg.getElementById(DEF_BOX);
        this.#viewBox = this.#svg.getAttribute("viewBox")
                                 .split(" ")
                                 .map(v => Number(v));
        if (!CheckTri.#w)
            CheckTri.#w = this.#viewBox[CheckTri.#vbW]; // baseline width

        Object.defineProperty(this, "isCheckTri", {value:true});
        Object.seal(this);
    }
//  attributeChangedCallback() handles changes to the observed attributes
    attributeChangedCallback(name, _, val) {
        const b = (val !== null);   // two out of three ain't bad
        switch (name) {
        case VALUE:
            this._setHref(CheckTri.hrefs.get(val));
            break;
        case DEFAULT:
            this._setHref(CheckBox.hrefs[Number(b)], this.#def);
            break;
        case SHOW_DEF:
            const w = b ? CheckTri.#w : CheckTri.#w * 2;
            this.#viewBox[CheckTri.#vbW] = w;
            this.#svg.setAttribute("viewBox", this.#viewBox.join(" "));
            this.#svg.setAttribute("width", w);
            this._use.setAttribute("x",     w - CheckTri.#w);
            this.#def.setAttribute("visibility", b ? "" : "hidden");
        default:
            super.attributeChangedCallback(name, _, val);
        }
    }
// this.default is the default value for when value == null (indeterminate)
// this.showDefault determines whether to show the default value as a 2nd box
    get default()        { return this.hasAttribute(DEFAULT); }
    get showDefault()    { return this.hasAttribute(SHOW_DEF); }
    set default(val)     { this._setBool(DEFAULT,  val); }
    set showDefault(val) { this._setBool(SHOW_DEF, val); }

// this.value can be null, FALSE (""), or TRUE ("1")
    get value()     {
        const val = this.getAttribute(VALUE);
        return val === null ? val : Boolean(val);
    }
    set value(val)  {
        if (val === null)
            this.removeAttribute(VALUE);
        else
            this.setAttribute(VALUE, val ? TRUE : FALSE);
    }
//  change() converts click and spacebar-up to a self-inflicted change event
    change(evt) {
        // The 3 states are TRUE = "1", FALSE = "", and null.
        // The 3-way rotation order depends on boolean data-default attribute.
        // Start null, then rotate to the opposite of data-default:
        //    null -> !b -> b -> null -> ...
        if (this._handleEvent(evt)) {
            const def = this.default;
            switch (this.value) {
            case null:
                this.value = def ? FALSE : TRUE;  break;
            case FALSE:
                this.value = def ? TRUE  : null;  break;
            case TRUE:
                this.value = def ? null : FALSE;
            }
            this.dispatchEvent(new Event("change"));
        }
    }
}
customElements.define(CHECK_BOX,   CheckBox);
customElements.define("check-tri", CheckTri);