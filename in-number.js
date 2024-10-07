export {NumberInput};
import {VALUE, BaseElement, getTemplate} from "./base-element.js";
const
MAX   = "max",                  // DOM attributes
MIN   = "min",
STEP  = "step",
UNITS      = "data-units",      // custom attributes:
DIGITS     = "data-digits",     // Number.prototype.toFixed(digits)
LOCALE     = "data-locale",     // locale string
NOTATION   = "data-notation",   // Intl.NumberFormat() options notation property
CURRENCY   = "data-currency",   // Intl.NumberFormat() options currency property
ACCOUNTING = "data-accounting", // boolean: {currencySign:"accounting"}
DELAY      = "data-delay",      // millisecond delay between mousedown and spin
INTERVAL   = "data-interval",   // millisecond interval for spin
AUTO_SIZE  = "data-auto-size",  // boolean: auto-size the width of the element
NO_SPIN    = "data-no-spin",    // boolean: hide buttons, no keyboard spinning
NO_CONFIRM = "data-no-confirm", // boolean: hide confirm/cancel buttons
minimums   = {
    [DIGITS]:   0,
    [DELAY]:    1,
    [INTERVAL]: 1
},
mouse = {
    enter:"mouseenter",
    leave:"mouseleave",
    down: "mousedown",
    up:   "mouseup",
    click:"click"
},
template = await getTemplate("number");
// =============================================================================
class NumberInput extends BaseElement {
    static observedAttributes = [VALUE, DIGITS, MAX, MIN, STEP, DELAY, INTERVAL,
                                 AUTO_SIZE, NOTATION, CURRENCY, ACCOUNTING,
                                 ...BaseElement.observedAttributes];
    static defaults = {
        [VALUE]:  0,       // attribute values as numbers, not strings
        [DIGITS]: 0,       // defaults to integer formatting
        [MAX]:  Infinity,
        [MIN]: -Infinity,
        [STEP]:     1,
        [DELAY]:  500,
        [INTERVAL]:33      // ~2 frames at 60fps
    };
    #attrs; #blurry; #bound; #btns; #controls; #focused; #hovering; #input;
    #isBlurring; #isLoading; #isMousing; #spinId; #svg;
    #isBlurry;             // a kludge for this._dom.activeElement === null
    #locale = {currencyDisplay:"narrowSymbol"};
// =============================================================================
    constructor() {
        super(template);
        this.#attrs  = Object.assign({}, NumberInput.defaults);

        this.#addEvent("keydown",   this.#keyDown);
        this.#addEvent("keyup",     this.#keyUp);
        this.#addEvent(mouse.enter, this.#enter);
        this.#addEvent(mouse.leave, this.#leave);

        this.#controls = this._dom.getElementById("controls");
        this.#input    = this._dom.getElementById("input");
        this.#addEvent("focus", this.#focus, this.#input);
        this.#addEvent("blur",  this.#blur , this.#input);

        this._use  = this.#controls.getElementsByTagName("use")[0];
        this.#svg  = this.#input.nextElementSibling;
        this.#btns = Array.from(this.#svg.getElementsByClassName("events"));
        for (const elm of this.#btns) {
            this.#addEvent(mouse.enter, this.#mouseEnter, elm);
            this.#addEvent(mouse.leave, this.#mouseLeave, elm);
        }
        this.#bound  = {        // for removeEventListener()
            [mouse.down]: this.#mouseDown.bind(this),
            [mouse.up]:   this.#mouseUp  .bind(this),
            [mouse.click]:this.#click    .bind(this)
        };
        this.#swapEvents(true); // must follow this.#bound initialization
        this.#spinId    = null;
        this.#isLoading = true; // prevents double-setting of values during load
    }
//  connectedCallback()
    connectedCallback() {
        if (this.getAttribute(VALUE) === null) {  // no initial value set
            const val = this.#attrs[VALUE];       // try to leave it at zero
            if (val > this.max || val < this.min) // else split the difference
                this.value = this.min + ((this.max - this.min) / 2);
        }
        // wait until all attributes set and styles loaded for these two:
        this.#input.value = this.#getText(false, true);
        if (this.autoSize)
            this.#autoSize();

        this.#isLoading = false;
    }
//  attributeChangedCallback() runs after the attribute has been set. There is
//  no preventing it. #revert() restores the previous, valid value.
    attributeChangedCallback(name, _, val) {
        if (name in this.#attrs) {
            const n = this.#toNumber(val);
            if (Number.isNaN(n)) {         // null and "" are not valid values
                this.#revert(name, val);   // you can't remove these attributes
                return;
            } //-----------
            switch (name) {
            case STEP:      // can't be zero
                n ? this.#accept(name, n)
                  : this.#revert(name, val);
                return;
            case DIGITS:    // runs twice if #revert(), but simpler
                this.#input.inputMode = n ? "decimal" : "numeric";
                this.#locale.maximumFractionDigits = n;
                this.#locale.minimumFractionDigits = n;
            case DELAY: case INTERVAL:
                n >= minimums[name]
                ? this.#accept(name, n)
                : this.#revert(name, val);
                return;
            default:        // clamp it
                if (n > this.max && name != MAX)
                    this.setAttribute(name, this.getAttribute(MAX));
                else if (n < this.min && name != MIN)
                    this.setAttribute(name, this.getAttribute(MIN));
                else {      // accept it
                    this.#accept(name, n);
                    if (name == VALUE && !this.#isBlurring && !this.#isLoading)
                        this.#input.value = this.#getText(this.#hasFocus);
                    else if ((name == MAX && n < this.value)
                          || (name == MIN && n > this.value))
                        this.setAttribute(VALUE, n); // clamp VALUE
                }
            }
        }
        else {
            switch(name) {
            case AUTO_SIZE:
                if (!this.#isLoading)
                    this.#autoSize();
                return;
            case NOTATION:
                this.#locale.notation = val ?? undefined;
                return;
            case CURRENCY:
                this.#locale.currency = val ?? undefined;
                this.#locale.style    = val ? "currency" : undefined;
                return;
            case ACCOUNTING:
                this.#locale.currencySign = (val !== null)
                                          ? "accounting" : undefined;
                return;
            default:
                super.attributeChangedCallback(name, _, val);
            }
        }
    }
    // attributeChangedCallback() helpers:
    #accept(name, n) {
        this.#attrs[name] = n;
    }
    #revert(name, val) {
        this.setAttribute(name, this.#attrs[name]);
        console.info(`${val} is not a valid value for the ${name} attribute.`);
    }
// =============================================================================
//  #autoSize() calculates the correct width and applies it to this.#input
    #autoSize() {
        if (this.max == Infinity || this.min == -Infinity) {
            console.info("auto-size is only available for non-infinite min and max values.");
            this._setBool(AUTO_SIZE, false);
            return;
        } //-------------------------------------------
        let elm, id, svg;
        const
        px    = "px",
        width = {},
        font  = getComputedStyle(this.#input).fontFamily;
                            // setup elements and calculate widths
        for (id of [UNITS, MAX, MIN]) {
            elm = this._dom.getElementById(id);
            elm.style.fontFamily = font;
            elm.innerHTML = this.#formatNumber(this[id]) ?? this.units;
            width[id]     = elm.getBoundingClientRect().width;
        }
        if (this.spins || this.confirms)
            svg = this.#svg.getBoundingClientRect().width;
        else {
            svg = 0;        // no spinning, no confirming = no buttons
            this.#svg.style.display = "none";
        }
        const               // the rest of the sub-values
        chars = Math.max(width[MAX], width[MIN]), // text width w/o units
        extra = Math.max(svg, width[UNITS]),      // the rest of the width
        diff  = Math.max(0, svg - width[UNITS]),  // only if svg > width[UNITS]
        right = parseFloat(getComputedStyle(this.#input).paddingLeft); //!!mirrored, can't set it externally!!Chrome bug??

        this.#blurry = {    // properties assigned to #input for each state
            width:        (chars + extra - diff) + px,
            paddingRight: (diff  + right) + px,
            textAlign:    "right"
        }
        this.#hovering = {
            width:         chars + px,
            paddingRight: (extra + right) + px,
            textAlign:    "right"
        }
        this.#focused = {
            width:        (chars + extra) + px,
            paddingRight:  right + px,
            textAlign:    "left"
        }                   // initial state = blurry
        Object.assign(this.#input.style, this.#blurry);
    }
//==============================================================================
//  Getters/setters reflect the HTML attributes, see attributeChangedCallback()
    get autoSize()   { return  this.hasAttribute(AUTO_SIZE);  } // booleans:
    get spins()      { return !this.hasAttribute(NO_SPIN);    }
    get confirms()   { return !this.hasAttribute(NO_CONFIRM); }
    get accounting() { return  this.hasAttribute(ACCOUNTING); }
    get useLocale()  { return  this.hasAttribute(LOCALE);     } // read-only

    get units()    { return this.getAttribute(UNITS)  ?? ""; }  // strings:
    get locale()   { return this.getAttribute(LOCALE) || undefined; }
    get currency() { return this.getAttribute(CURRENCY); }
    get text()     { return this.#input.value; }                // read-only

    get value()    { return this.#attrs[VALUE];    }            // numbers:
    get digits()   { return this.#attrs[DIGITS];   }            // cached for
    get max()      { return this.#attrs[MAX];      }            // revert on NaN
    get min()      { return this.#attrs[MIN];      }
    get step()     { return this.#attrs[STEP];     }
    get delay()    { return this.#attrs[DELAY];    }
    get interval() { return this.#attrs[INTERVAL]; }

    set autoSize  (val) { this._setBool(AUTO_SIZE,   val); }    // booleans:
    set spins     (val) { this._setBool(NO_SPIN,    !val); }
    set confirms  (val) { this._setBool(NO_CONFIRM, !val); }
    set accounting(val) { this._setBool(ACCOUNTING,  val); }

    set units   (val) { this.setAttribute(UNITS,    val); }     // strings:
    set locale  (val) { this.setAttribute(LOCALE,   val); }
    set currency(val) { this.setAttribute(CURRENCY, val); }
    set value   (val) { this.setAttribute(VALUE,    val); }     // numbers:
    set digits  (val) { this.setAttribute(DIGITS,   val); }
    set max     (val) { this.setAttribute(MAX,      val); }
    set min     (val) { this.setAttribute(MIN,      val); }
    set step    (val) { this.setAttribute(STEP,     val); }
    set delay   (val) { this.setAttribute(DELAY,    val); }
    set interval(val) { this.setAttribute(INTERVAL, val); }
//==============================================================================
//  Event handlers
//  target is this:
    #enter() {
        Object.assign(this.#input.style, this.#hovering);
        this.#input.value = this.#getText(false);
        if (this.spins)
            this.#showCtrls(true);
    }
    #leave() {
        Object.assign(this.#input.style, this.#blurry);
        this.#input.value = this.#getText(false, true);
        this.#showCtrls(false);
    }
//  target is #input:
    #blur(evt) {
        if (this.#isBlurry || evt.relatedTarget === this)
            return;
        //---------------------------------------------
        Object.assign(this.#input.style, this.#blurry);
        this.#showCtrls (false);
        this.#swapEvents(true);
        this.#input.value = this.#getText(false, true);
        this.#isMousing   = false;
        this._setHref("#spinner-idle");
        this.classList.remove("NaN");
    }
    #focus() {
        if (this.#isBlurry || this.#isMousing) return;
        //----------------------------------------------
        Object.assign(this.#input.style, this.#focused);
        this.#showCtrls (false);
        this.#swapEvents(false);
        this.#input.value = this.#attrs[VALUE].toFixed(this.digits);
    }
//  #swapEvents() is better than converting mousedown/mouseup into click,
//                and it avoids if statements in several event handlers.
    #swapEvents(b) {
        let elm;
        for (elm of this.#btns) {
            this.#toggleEvent(mouse.down,   b, elm);
            this.#toggleEvent(mouse.up,     b, elm);
            this.#toggleEvent(mouse.click, !b, elm);
        }
        elm = this.#input;
        this.#toggleEvent(mouse.down, b, elm);
        this.#toggleEvent(mouse.up,   b, elm);

        this.#toggleEvent(mouse.enter, b, this.#enter);
        this.#toggleEvent(mouse.leave, b, this.#leave);
    }
    #toggleEvent(type, b, elmer) {  // helps #swapEvents only
        const func = b ? "addEventListener"
                       : "removeEventListener";
        if (elmer.tagName)          // elmer is an element or an event handler
            elmer[func](type, this.#bound[type]);
        else
            this[func](type, elmer);
    }
//==============================================================================
//  target is #input or up or down <rect>:
    #mouseDown(evt) {
        if (evt.target === this.#input)
            this.#isMousing = true;
        else
            this.#spin(true, evt.target.id == "up");
    }
    #mouseUp(evt) {
        if (evt.target === this.#input && this.#isMousing) {
            const
            range = [],
            input = this.#input,
            dir   = input.selectionDirection,
            start = input.selectionStart,
            dist  = input.selectionEnd - start,
            val   = input.value,
            orig  = [{num:start, str:val.slice(0, start)},
                     {num:dist,  str:val.slice(start, dist)}];

            let match, obj;
            for (obj of orig) {
                match = obj.str.match(/[^\d-.eE]/g);
                range.push(obj.num - (match ? match.length : 0))
            }
            this.#isMousing = false;  // let this.#focus() do it's thing
            this.#focus();            // it already has the focus
            if (this.accounting && val[0] == "(")
                ++range[0];
            input.setSelectionRange(range[0], range[0] + range[1], dir);
        }
        else
            this.#spin();
    }
//  target is up or down <rect>:
    #mouseEnter(evt) {
        let name;
        const id = evt.target.id;
        if (this.#hasFocus) {
            if (this.confirms) {
                name = this.#input.classList.contains("NaN")
                     ? "cancel"
                     : "confirm";
                this.#showCtrls(true);
            }
        }
        else if (this.spins) {
            name = "spinner";
            this.#input.value = this.#getText(this.#hasFocus);
            if (this.#isSpinning && this.#btns.includes(evt.relatedTarget)) {
                this.#spin();                   // cancel current spin
                this.#spin(false, id == "up");  // spin without delay
            }
        }
        this._setHref(`#${name}-hover-${id}`);  // might not be visible
    }
    #mouseLeave(evt) {
        if (this.#hasFocus)
            this.#showCtrls(false);
        else if (!this.#btns.includes(evt.relatedTarget)) {
            this.#spin();                        // cancel spin
            if (evt.relatedTarget?.id == "input")
                this._setHref("#spinner-idle");
        }
    }
    #click(evt) {
        if (evt.target.id == "up") {
            if (this.#input.classList.contains("NaN"))
                return; // force user to cancel
            else
                this.#apply();
        }
        this.#blurMe(false);
    }
//==============================================================================
//  target is this for keyboard because the svg buttons don't receive focus:
    #keyDown(evt) {
        const code = evt.code;  // document .activeElement === this
        if (this.#hasFocus)     // this._dom.activeElement === this.#input
            switch (code) {
            case "Enter":       // apply user input (or not)
                if (Number.isNaN(this.#toNumber(this.text))) {
                    this.classList.add("beep");
                    return;
                } //----------
                this.#apply();
            case "Escape":      // exit user input mode
                this.#input.blur();
            default:
            }
        else
            switch (code) {     // this._dom.activeElement === null
            case "Enter": case "Escape":
                this.#blurMe();
                return;
            case "ArrowUp":
                if (this.spin)
                    this.#spin(null, true);
                return;
            case "ArrowDown":
                if (this.spin)
                    this.#spin(null, false);
            default:            // keyboard repeat rate is an OS setting
            }
    }
    #keyUp(evt) {
        if (evt.code == "Enter")
            this.classList.remove("beep");
        if (!this.#hasFocus && (evt.code == "ArrowUp" || evt.code == "ArrowDown"))
            this.#spin();
        else                            // alert user to NaN
            this.classList.toggle("NaN", Number.isNaN(this.#toNumber(this.text)));
    }
//==============================================================================
//  #apply() consolidates some funk around setting the VALUE attribute
    #apply() {
        this.#isBlurring = true;
        this.setAttribute(VALUE, this.text);
        this.#isBlurring = false;
        this.dispatchEvent(new Event("change"));
    }
//  #spin() controls the spinning process
    #spin(state, isUp) {
        if (state === undefined) {           // cancel:
            if (this.#isSpinning) {
                clearInterval(this.#spinId); // interchangeable w/clearTimeout()
                this.#spinId = null;
            }
        }
        else {                               // spin:
            const val = this.#attrs[VALUE];  // if already clamped, skip it
            if ((isUp && val != this.max) || (!isUp && val != this.min)) {
                const n = val + (this.#attrs[STEP] * (isUp ? 1 : -1));
                this.#attrs[VALUE] = Math.max(this.min, Math.min(this.max, n));
                this.#input.value  = this.#getText(false);  // #input w/focus doesn't spin
                this.dispatchEvent(new Event("change"));
                if (state)
                    this.#spinId = setTimeout (this.#spin.bind(this), this.delay,   false, isUp);
                else if (state === false)
                    this.#spinId = setInterval(this.#spin.bind(this), this.interval, null, isUp);
                // else  state === null
            }   // let #spinId persist past expiration, see #mouseEnter()
            if (!this.#isSpinning)  // in case user spins already clamped
                this.#spinId = -1;  // value, then toggles up|down.
        }
    }
// this.#isSpinning gives it a name.
    get #isSpinning() { return this.#spinId !== null; }
//==============================================================================
// Miscellaneous
// this.#hasFocus returns true if #input has the focus
    get #hasFocus() { return this.#input === this._dom.activeElement; }
//  could be written: return Boolean(this._dom.activeElement);

//  #showCtrls() shows or hides the spin or confirm buttons
    #showCtrls(b) {
        this.#controls.style.visibility = b ? "visible" : "hidden";
    }
//  #getText() gets the appropriate text for the #input
    #getText(hasFocus, appendUnits) {
        const n = this.#attrs[VALUE];
        let txt = hasFocus ? n : this.#formatNumber(n);
        if (appendUnits)
            txt += this.units;
        return txt;
    }
//  #formatNumber() formats a number for display as text
    #formatNumber(n) {
        if (n === undefined) return;  // helps #autoSize()
        //-----------------------------------------------------
        return this.useLocale
             ? new Intl.NumberFormat(this.locale, this.#locale)
                       .format(n)
             : n.toFixed(this.#attrs[DIGITS]);
    }
//  #toNumber() converts string to number, str never equals 0
    #toNumber(str) {                    // parseFloat() is too lenient
        return str ? Number(str) : NaN; // Number() converts "" and null to 0
    }
//  #addEvent() is a convenience
    #addEvent(type, func, elm) {
        if (elm)
            func = func.bind(this);
        else
            elm = this;
        elm.addEventListener(type, func);
    }
//!!this.blur() doesn't work in Chrome (elsewhere?) when _dom.activeElement === null
    #blurMe(b = true) {
        this.#isBlurry = b;
        this.#input.focus();
        this.#input.blur();
        this.#isBlurry = false;
    }
}
customElements.define("in-number", NumberInput);