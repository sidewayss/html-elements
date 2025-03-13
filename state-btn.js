export {AUTO, STATES, StateBtn};

import {VALUE, BaseElement, preventSelection} from "./base-element.js";
const
INDEX  = "index",               // attribute required for CSS styling
STATES = "states",
KEYS   = "key-codes",
AUTO   = "auto-increment",
ACTIVE = "active",              // for CSS selector e.g. state-btn[active] {}
ACTIVE_ID = "active-id",        // state-independent active <def> id, href = #id
MOUSE_ID  = "mouse-events-id",  // only read on initial element load!!
NO_ESCAPE = "no-escape";        // don't use Esc key to blur element
// =============================================================================
class StateBtn extends BaseElement {
    #enter; #iLast; #index; #leave; #map; #mouseElm; #noop; #states; #value;
    #windowDown; #windowUp;
    static observedAttributes = [VALUE, INDEX, STATES, KEYS,
                                 ...BaseElement.observedAttributes];

    constructor(meta = import.meta, subclass = StateBtn,
                keys = ["Enter"],   states = [])
    {
        super(meta, subclass);
        this.#index = 0;
        this.#map   = new Map;
        this.#setStates(states);
        this._keyCodes = new Set(keys); // default = enter key is same as click
        this.is();
    }
//  _init() is called by BaseElement:connectedCallback()
    _init() {
        const mouseId  = this.getAttribute(MOUSE_ID);
        this.#mouseElm = mouseId ? this.shadowRoot.getElementById(mouseId)
                                 : this;
        if (!this.#mouseElm)
            throw new Error(`Invalid ${MOUSE_ID} value: ${mouseId}`);
        //--------------
        this.#update(0);
        this.addEventListener("keyup",   this._change);
        this.addEventListener("keydown", this.#activate);
        window.addEventListener("keydown", this.#keyDown.bind(this));
        this.#mouseElm.addEventListener("click",     this._change.bind(this));
        this.#mouseElm.addEventListener("mousedown", this.#activate.bind(this));
        this.#windowUp = this.#mouseUp.bind(this);  // unique instance required
        this.#enter = this.#mouseEnter.bind(this);  // ditto for #mouseElm
        this.#leave = this.#mouseLeave.bind(this);
    }
//  attributeChangedCallback() handles changes to the observed attributes
    attributeChangedCallback(name, _, val) {
        if (this.#noop) return; // see #update(): index sets value sets index
        //-------------
        switch (name) {
        case VALUE:
            try   { val = JSON.parse(val); } // (re)convert
            catch { ; }                      // it's a string, no change
            if (this.#map.has(val))
                this.#update(null, this.#map.get(val), name);
            else {
                const msg = this.#map.size()
                          ? `Bad value: ${val}. Must be be one of these: ${[...this.#map.keys].join(", ")}`
                          : `You can't set value because none of your states has a value property.`;
                throw new Error(msg);
            }
            break;
        case INDEX:
            const n = Number(val);
            if (Number.isNaN(n))
                throw new Error(`Bad index: ${val} is not a valid number.`);
            else if (n < 0 || n > this.#iLast)
                throw new Error(`index out of range: ${n}; should be between 0 and ${this.#iLast}.`);
            else if (n % 1)
                throw new Error(`Bad index: ${n}; must be a whole number, aka integer.`);
            else
                this.#update(n, undefined, name);
            break;
        case STATES:   // these attributes update properties, but not vice-versa
        case KEYS:     // key-codes must be converted to keyCodes
            const prop = name.replace(/-(.)/g, chars => chars[1].toUpperCase());
            try { this[prop] = JSON.parse(val); }
            catch (err) {
                throw new Error(`Bad ${name} value: ${val}\n${err.message}`);
            }
            break;
        default:
            super.attributeChangedCallback(name, _, val);
        }
    }
//  increment() and decrement() are in lieu of overloading ++ and --
    increment() {
        if (this.#index < this.#iLast)
            this.index++;
        else
            this.index = 0;
    }
    decrement() {
        if (this.#index > 0)
            this.index--;
        else
            this.index = this.#iLast;
    }

// this.autoIncrement auto-increments index in the change event
// this.noEscape turns off Esc key as a way to blur the element
    get autoIncrement() { return this.hasAttribute(AUTO);      }
    get noEscape()      { return this.hasAttribute(NO_ESCAPE); }

    set autoIncrement(val) { this.toggleAttribute(AUTO,      Boolean(val)); }
    set noEscape(val)      { this.toggleAttribute(NO_ESCAPE, Boolean(val)); }

// this.index is an alternate way to set the value, or a value of its own
    get index()    { return this.#index; }
    set index(val) { this.setAttribute(INDEX, val.toString()); }

// this.value setter must set VALUE attribute for CSS styling
    get value()    { return this.#value; }
    set value(val) { this.setAttribute(VALUE, JSON.stringify(val)); }

//  #update() updates everything relating to a changing index or value
//            either index or obj must be non-nullish, or #index = -1
    #update(index, obj = this.#states[index], attr) {
        this.#index = index ?? this.#states.indexOf(obj);
        this.#value = obj.value;
        this.#noop  = true;
        if (!attr || attr != VALUE)
            this.setAttribute(VALUE, obj.value);
        if (!attr || attr != INDEX)
            this.setAttribute(VALUE, this.#index.toString());
        this.#noop = false;

        this.title  = obj.title ?? "";
        this._setHref(obj.id    ?? "");
        if (obj.label && this.labelElement)
            this.label = obj.label;
    }
// this.state is read-only, returns the Object
    get state() {
        return this.autoIncrement ? this.#states[this.#index]
                                  : this.#map.get(this.#value);
    }
// this.map is read-only, returns a shallow copy of this.#map
    get map() { return new Map(this.#map); }

// this.states
    get states()   { return this.#states.slice(); }
    set states(val) {
        this.#setStates(val);
        if (this.autoIncrement)
            this.index = Math.min(this.#index, this.#iLast);
        else
            this.#update(0);
    }
//  #setStates() helps set states() and constructor()
    #setStates(val) {
        if (!Array.isArray(val))
            throw new Error("states must be an Array.");
        //-----------------------------
        this.#states = Array.from(val); // leniency
        this.#iLast  = this.#states.length - 1;
        this.#map.clear();
        for (const obj of val)          //!!further validation??
            if (obj.value !== undefined)
                this.#map.set(obj.value, obj);
    }
// this.activeId reflects the ACTIVE_ID attribute
    get activeId()    { return this.getAttribute(ACTIVE_ID); }
    set activeId(val) { this.setAttribute(ACTIVE_ID, val);   }

// this.#activeId gets the currently active id, could use a different name...
    get #activeId() { return this.state.active ?? this.activeId;}

// this.#active toggles the ACTIVE attribute for CSS styling
    get #active()    { return this.hasAttribute(ACTIVE); }
    set #active(val) { this.toggleAttribute(ACTIVE, Boolean(val)); }

// this.keyCodes returns _keyCodes as an Array
    get keyCodes() { return [...this._keyCodes];  }
    set keyCodes(val) {
        if (val)                    //!!validation?? string becomes array becomes the set, for example
            this._keyCodes = new Set(val);
        else
            this._keyCodes.clear();
    }

//  _handleEvent() determines whether or not to handle an event
    _handleEvent(evt) {
        return evt.type == "click" || this._keyCodes.has(evt.code);
    }
//  _change() converts click and key-up to self-inflicted change event
    _change(evt) {
        if (!this._handleEvent(evt))
            return;
        //---------------------
        if (this.autoIncrement)
            this.increment();

        if (evt.type != "keyup")
            preventSelection(evt);  // https://issues.chromium.org/issues/388066440

        this.#active = false;       // might already be set to false
        if (this.#activeId)
            this.#leaveEnter();

        const event = new Event("change");
        event.event = evt;                  // only way for client to get
        this.dispatchEvent(event);          // evt as "change" event
    }
//  #keyDown is attached to window, it assumes control of the key codes in
//           _keyCodes, preventing browser or page actions such as scrolling.
    #keyDown(evt) {
        if (this._keyCodes.has(evt.code))
            evt.preventDefault();
    }
//  #activate() and the rest of these methods are for a pseudo-:active behavior
    #activate(evt) {
        if (evt.type == "keydown" && !this._keyCodes.has(evt.code)) {
            if (evt.code == "Escape" && !this.noEscape)
                this.blur();
            return;
        }
        //=================
        if (this.#activeId)
            this._setHref(this.#activeId);
        if (evt.type != "mousedown")
            this.#active = true;
        else {
            window.addEventListener("mouseup",  this.#windowUp);
            this.#leaveEnter(true); // sets #active = true
        }
    }
    #mouseUp() {
        window.removeEventListener("mouseup",  this.#windowUp);
        this.#leaveEnter();
    }
    #mouseLeave() {
        if (this.#activeId)
            this._setHref(this.state.id ?? "");
        this.#leaveEnter(false, true);
    }
    #mouseEnter() {
        if (this.#activeId)
            this._setHref(this.#activeId);
        this.#leaveEnter(true);
    }
    #leaveEnter(leave, enter) {
        this.#active = leave;
        this.#mouseElm[eventFunc(leave)]("mouseleave", this.#leave);
        this.#mouseElm[eventFunc(enter)]("mouseenter", this.#enter);
    }
}
BaseElement.define(StateBtn);

function eventFunc(isAdd) {
    return (isAdd ? "add" : "remove") + "EventListener";
}