export {NumberInput};
import {BaseElement, getTemplate} from "./base-element.js";
const
VALUE = "value",                // DOM attributes
MAX   = "max",
MIN   = "min",
STEP  = "step",
UNITS     = "data-units",       // custom attributes
DIGITS    = "data-digits",
DELAY     = "data-delay",       // delay between mousedown and spin
INTERVAL  = "data-interval",    // millisecond interval for spin
AUTO_SIZE = "data-auto-size",
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
    #blurry; #bound; #btns; #controls; #focused; #hovering; #input; #isBlurring;
    #spinId; #svg; #units; #unitsWidth; #isBlurry;
    #attrs = {
        [VALUE]:  0,       // attribute values as numbers, not strings
        [DIGITS]: 0,       // defaults to integer formatting
        [MAX]:  Infinity,
        [MIN]: -Infinity,
        [STEP]:     1,
        [DELAY]:  500,
        [INTERVAL]:33.333  // ~2 frames at 60fps
    }
    static observedAttributes = [VALUE, DIGITS, MAX, MIN, STEP, DELAY, INTERVAL,
                                 UNITS, ...BaseElement.observedAttributes];
    constructor() {
        super(template);
        this.#addEvent("keydown",   this.#keyDown);
        this.#addEvent("keyup",     this.#keyUp);
        this.#addEvent(mouse.enter, this.#enter);
        this.#addEvent(mouse.leave, this.#leave);

        this.#controls = this._dom.getElementById("controls");
        this.#units    = this._dom.getElementById("units");
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
        this.#spinId = null;
    }

    connectedCallback() {
        // the next line is a repeat of setting the VALUE attribute, but it
        // allows declaring DIGITS after VALUE, no fixed attribute order.
        this.#input.value = this.#getText(false, true);

        if (this.autoSize) {
            if (this.max == Infinity || this.min == -Infinity) {
                console.info("auto-size only available for non-infinite min and max values.");
                this._setBool(AUTO_SIZE, false);
                return;
            } //----------------------------------------------------------------
            // this is a repeat of setting the UNITS attribute, but I can't find
            // any guarantees that external style sheets will be available then.
            this.#units.style.fontFamily = getComputedStyle(this.#input).fontFamily;
            this.#unitsWidth = this.#units.getBoundingClientRect().width;

            const
            chars = Math.max(this.max.toFixed(this.digits).length,
                             this.min.toFixed(this.digits).length) + "ch",
            svg   = parseFloat(getComputedStyle(this.#svg).width),
            extra = Math.max(svg, this.#unitsWidth),
            diff  = Math.max(0, svg - this.#unitsWidth),
            right = parseFloat(getComputedStyle(this.#input).paddingLeft);  //!!mirrored, can't set it externally!!Chrome bug??

            this.#blurry = {
                width: `calc(${chars} + ${extra - diff}px)`,
                paddingRight: diff  + right + "px",
                textAlign:"right"
            }
            this.#hovering = {
                width: chars,
                paddingRight: extra + right + "px",
                textAlign:"right"
            }
            this.#focused = {
                width: `calc(${chars} + ${extra}px)`,
                paddingRight: right + "px",
                textAlign:"left"
            }
            Object.assign(this.#input.style, this.#blurry);
        }
    }

    attributeChangedCallback(name, _, val) {
        if (name in this.#attrs) {
            const n = this.#toNumber(val);
            if (Number.isNaN(n)) {
                this.#revert(name, val);
                return;
            } //-----------
            switch (name) {
            case DIGITS:
                this.#input.inputMode = n ? "decimal" : "numeric";
                if (n < 0)
                    this.#revert(name, val);
                return;
            case DELAY: case INTERVAL:
                if (n < 1)
                    this.#revert(name, val);
                return;
            default:
                if (n > this.max && name != MAX)                // clamp
                    this.setAttribute(name, this.getAttribute(MAX));
                else if (n < this.min && name != MIN)           // clamp
                    this.setAttribute(name, this.getAttribute(MIN));
                else {
                    this.#attrs[name] = n;                      // accept
                    if (name == VALUE && !this.#isBlurring)     // display
                        this.#input.value = this.#getText(this.#hasFocus);
                    else if ((name == MAX && n < this.value)
                          || (name == MIN && n > this.value))
                        this.setAttribute(VALUE, n);            // clamp VALUE

                }
            }
        }
        else if (name == UNITS) {
            this.#units.innerHTML = val ?? "";
            this.#unitsWidth = this.#units.getBoundingClientRect().width;
        }
        else
            super.attributeChangedCallback(name, _, val);
    }
    #revert(name, val) {
        this.setAttribute(name, this.#attrs[name]);
        console.info(`${val} is not a valid value for the ${name} attribute.`);
    }
//==============================================================================
//  Getters/setters reflect the HTML attributes, see attributeChangedCallback()
    get autoSize() { return this.hasAttribute(AUTO_SIZE); } // bool: read-only

    get units() { return this.getAttribute(UNITS) ?? ""; }  // strings:
    get text()  { return this.#input.value; }               // read-only

    get value()    { return this.#attrs[VALUE];    }        // numbers:
    get digits()   { return this.#attrs[DIGITS];   }        // cached for
    get max()      { return this.#attrs[MAX];      }        // revert on NaN.
    get min()      { return this.#attrs[MIN];      }
    get step()     { return this.#attrs[STEP];     }
    get delay()    { return this.#attrs[DELAY];    }
    get interval() { return this.#attrs[INTERVAL]; }

    set units   (val) { this.setAttribute(UNITS,    val); }
    set value   (val) { this.setAttribute(VALUE,    val); }
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
        this.#showCtrls(true);
    }
    #leave() {
        Object.assign(this.#input.style, this.#blurry);
        this.#input.value = this.#getText(false, true);
        this.#showCtrls(false);
    }
//  target is #input:
    #blur() {
        if (this.#isBlurry) return; // see #blurMe()
        //---------------------------------------------
        Object.assign(this.#input.style, this.#blurry);
        this.#showCtrls (false);
        this.#swapEvents(true);
        this.#input.value = this.#getText(false, true);
        this.classList.remove("NaN");
    }
    #focus() {
        if (this.#isBlurry) return;
        //----------------------------------------------
        Object.assign(this.#input.style, this.#focused);
        this.#showCtrls (false);
        this.#swapEvents(false);
        this.#input.value = this.#attrs[VALUE];
    }
//  #swapEvents() is better than converting mousedown/mouseup into click,
//                and it end up helping #enter() and #leave() too.
    #swapEvents(b) {
        for (const elm of this.#btns) {
            this.#toggleEvent(mouse.down,   b, elm);
            this.#toggleEvent(mouse.up,     b, elm);
            this.#toggleEvent(mouse.click, !b, elm);
        }
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
    #showCtrls(b) {                 // generally helpful
        this.#controls.style.visibility = b ? "visible" : "hidden";
    }
//  target is up or down <rect>:
    #mouseEnter(evt) {
        let name;
        const id = evt.target.id;
        if (this.#hasFocus) {
            name = this.#input.classList.contains("NaN")
                 ? "cancel"
                 : "confirm";
            this.#showCtrls(true);
        }
        else {
            name = "spinner";
            this.#input.value = this.#getText(this.#hasFocus);
            if (this.#spinId !== null && this.#btns.includes(evt.relatedTarget)) {
                this.#spin();                   // cancel current spin
                this.#spin(false, id == "up");  // spin without delay
            }
        }
        this._setHref(`#${name}-hover-${id}`);
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
    #mouseDown(evt) {
        this.#spin(true, evt.target.id == "up");
    }
    #mouseUp() {
        this.#spin();
    }
    #click(evt) {
        if (evt.target.id == "up") {
            if (this.#input.classList.contains("NaN"))
                return; // force user to cancel
            else
                this.#apply();
        }
        this.#blurMe();
    }
//  target is this for keyboard because the svg buttons don't receive focus:
    #keyDown(evt) {
        const code = evt.code;  // document .activeElement === this
        if (this.#hasFocus)     // this._dom.activeElement === this.#input
            switch (code) {
            case "Enter":       // apply user input (or not)
                if (Number.isNaN(this.#toNumber(this.text))) {
                    this.classList.add("err");
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
                this.#blurMe();          return;
            case "ArrowUp":
                this.#spin(null, true);  return;
            case "ArrowDown":
                this.#spin(null, false);
            default:            // keyboard repeat rate is an OS setting
            }
    }
    #keyUp(evt) {
        if (evt.code == "Enter")
            this.classList.remove("err");
        if (!this.#hasFocus && (evt.code == "ArrowUp" || evt.code == "ArrowDown"))
            this.#spin();
        else                            // alert user to NaN
            this.classList.toggle("NaN", Number.isNaN(this.#toNumber(this.text)));
    }
    #apply() {
        this.#isBlurring = true;
        this.setAttribute(VALUE, this.text);
        this.#isBlurring = false;
    }
    #spin(state, isUp) {
        if (state === undefined) {
            if (this.#spinId !== null) {
                clearInterval(this.#spinId); // interchangeable w/clearTimeout()
                this.#spinId = null;
            }
        }
        else {
            this.#attrs[VALUE] += this.#attrs[STEP] * (isUp ? 1 : -1);
            this.#input.value   = this.#getText(false); // for now: #input w/focus doesn't spin
            if (state)                                  // initial call starts the spin
                this.#spinId = setTimeout(this.#spin.bind(this), this.delay, false, isUp);
            else if (state === false)
                this.#spinId = setInterval(this.#spin.bind(this), this.interval, null, isUp);
        }   // else state === null
    }
//==============================================================================
// Miscellaneous
// this.#hasFocus returns true if #input has the focus
    get #hasFocus() { return this.#input === this._dom.activeElement; }
//  could be written: return Boolean(this._dom.activeElement);

//  #getText() gets the appropriate text for the #input
    #getText(hasFocus, appendUnits) {
        const val = this.#attrs[VALUE];
        let   txt = hasFocus ? val : val.toFixed(this.#attrs[DIGITS]);
        if (appendUnits)
            txt += this.units;
        return txt;
    }
//  #toNumber() converts string to number
    #toNumber(str) {                    // Number() converts "" to 0
        return str ? Number(str) : NaN; // parseFloat() is too lenient
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
    #blurMe() {
        this.#isBlurry = true;
        this.#input.focus();
        this.#input.blur();
        this.#isBlurry = false;
    }
}
customElements.define("in-number", NumberInput);