export {NumberInput};
import {VALUE, BaseElement, getTemplate} from "./base-element.js";
const
MAX   = "max",                  // DOM attributes
MIN   = "min",
STEP  = "step",
                                // custom attributes:
DELAY      = "data-delay",      // millisecond delay between mousedown and spin
INTERVAL   = "data-interval",   // millisecond interval for spin
DIGITS     = "data-digits",     // Number.prototype.toFixed(digits)
UNITS      = "data-units",      // units string suffix
LOCALE     = "data-locale",     // locale string: "aa-AA", "" = user locale
NOTATION   = "data-notation",   // Intl.NumberFormat() options notation property
CURRENCY   = "data-currency",   // ditto: currency property
                                // booleans:
ACCOUNTING = "data-accounting", // {currencySign:"accounting"}
NO_SPIN    = "data-no-spin",    // hide buttons, no keyboard spinning
NO_CONFIRM = "data-no-confirm", // hide confirm/cancel buttons
NO_SCALE   = "data-no-scale",   // don't scale the buttons to match font size
NO_WIDTH   = "data-no-width",   // don't auto-size width
NO_ALIGN   = "data-no-align",   // don't auto-align or auto-pad

minimums = {
    [DIGITS]:   0,
    [DELAY]:    1,
    [INTERVAL]: 1
},
event = {
    enter:"mouseenter",
    leave:"mouseleave",
    down: "mousedown",
    up:   "mouseup",
    click:"click",
    blur: "blur",
    focus:"focus"
},
resizeEvents = [event.blur, event.focus, event.enter],

template = await getTemplate("number");
// =============================================================================
class NumberInput extends BaseElement {
    static observedAttributes = [VALUE, MAX, MIN, STEP, DELAY, INTERVAL, DIGITS,
                                 UNITS, LOCALE, CURRENCY, ACCOUNTING, NOTATION,
                                 NO_SPIN, NO_CONFIRM, NO_WIDTH, NO_ALIGN,
                                 NO_SCALE, ...BaseElement.observedAttributes];
    static defaults = {
        [VALUE]:  0,       // attribute values as numbers, not strings
        [DIGITS]: 0,       // defaults to integer formatting
        [MAX]:  Infinity,
        [MIN]: -Infinity,
        [STEP]:     1,
        [DELAY]:  500,
        [INTERVAL]:33      // ~2 frames at 60fps
    };
    #attrs; #bound; #btns; #controls; #input; #isBlurring; #isLoading;
    #isMousing; #padRight; #spinId; #states; #svg; #texts;

    #isBlurry;             // a kludge for this._dom.activeElement === null
    #locale = {currencyDisplay:"narrowSymbol"};
// =============================================================================
    constructor() {
        super(template);
        this.#attrs = Object.assign({}, NumberInput.defaults);

        this.#addEvent("keydown",   this.#keyDown);
        this.#addEvent("keyup",     this.#keyUp);
        this.#addEvent(event.enter, this.#enter);
        this.#addEvent(event.leave, this.#leave);

        this.#input = this._dom.getElementById("input");
        this.#addEvent(event.focus, this.#focus, this.#input);
        this.#addEvent(event.blur,  this.#blur , this.#input);

        this.#svg      = this.#input.nextElementSibling;
        this.#controls = this.#svg.getElementById("controls");
        this._use      = this.#controls.getElementsByTagName("use")[0];
        this.#texts = Array.from(this.#svg.getElementsByTagName("text"));
        this.#btns  = Array.from(this.#svg.getElementsByClassName("events"));
        for (const elm of this.#btns) {
            this.#addEvent(event.enter, this.#mouseEnter, elm);
            this.#addEvent(event.leave, this.#mouseLeave, elm);
        }
        this.#bound = {         // for removeEventListener()
            [event.down]: this.#mouseDown.bind(this),
            [event.up]:   this.#mouseUp  .bind(this),
            [event.click]:this.#click    .bind(this)
        };
        this.#swapEvents(true); // must follow this.#bound initialization

        const obj = {};         // #states are #input styles for each state
        for (const key of resizeEvents)
            obj[key] = {};
        obj[event.leave] = obj[event.blur];
        this.#states = obj;
        this.#spinId = null;
        this.#isLoading = true; // prevents double-setting of values during load
    }
//  connectedCallback()
    connectedCallback() {
        if (this.getAttribute(VALUE) === null) {  // no initial value set
            const val = this.#attrs[VALUE];       // try to leave it at zero
            if (val > this.max || val < this.min) // else split the difference
                this.value = this.min + ((this.max - this.min) / 2);
        }
        // wait until all attributes set and styles loaded for these three:
        this.#padRight = parseFloat(getComputedStyle(this.#input).paddingRight);
        this.#input.value = this.#getText(false, true);
        this.resize();

        this.#isLoading = false;
    }
//  attributeChangedCallback() runs after the attribute has been set. There is
//  no preventing it. For numeric attributes, #revert() restores the previous,
//  valid value. Validation of string values is left to the DOM.
    attributeChangedCallback(name, _, val) {
        let isResize, isUpdate;
        if (name in this.#attrs) {  // numeric attributes
            const n = this.#toNumber(val);
            if (Number.isNaN(n) && name != STEP) {
                this.#revert(name, val);    // null and "" are not valid values
                return;                     // you can't remove these attributes
            } //-----------
            switch (name) {
            case STEP:
                if (val === null)
                    this.#attrs[STEP] = this.#autoStep(this.#attrs[DIGITS]);
                else if (n)
                    this.#accept(name, n);
                else                        // can't be zero
                    this.#revert(name, val);
                return;
            //----------
            case DIGITS:            // runs twice if #revert(), but simpler
                isResize = true;
                isUpdate = true;
                this.#input.inputMode = n ? "decimal" : "numeric";
                this.#locale.maximumFractionDigits = n;
                this.#locale.minimumFractionDigits = n;
                if (this.getAttribute(STEP) === null)   // auto-step default
                    this.#attrs[STEP] = this.#autoStep(n);
            case DELAY: case INTERVAL:
                n >= minimums[name]
                ? this.#accept(name, n)
                : this.#revert(name, val);
                break;
            default:                // VALUE, MAX, MIN
                const
                isMax = (name == MAX),
                isMin = (name == MIN);
                isResize = isMax || isMin;
                isUpdate = !isResize && !this.#isBlurring;

                if      (!isMax && n > this.max)        // clamp it
                    this.setAttribute(name, this.getAttribute(MAX));
                else if (!isMin && n < this.min)
                    this.setAttribute(name, this.getAttribute(MIN));
                else {
                    this.#accept(name, n);              // accept it
                    if (!this.#isLoading && (isMax && n < this.value
                                          || isMin && n > this.value))
                        this.setAttribute(VALUE, n);    // clamp VALUE
                }
            }
        }
        else {                      // string and boolean attributes:
            isResize = true;
            isUpdate = true;
            switch(name) {
            case NOTATION:                  // string
                this.#locale.notation = val ?? undefined;
                break;
            case CURRENCY:                  // string
                this.#locale.currency = val ?? undefined;
                this.#locale.style    = val ? "currency" : undefined;
                break;
            case ACCOUNTING:                // bool
                this.#locale.currencySign = (val !== null)
                                          ? "accounting" : undefined;
            case LOCALE: case UNITS:        // strings
                break;
            case NO_CONFIRM: case NO_SPIN:  // bools
            case NO_WIDTH:   case NO_ALIGN: case NO_SCALE:
                isUpdate = false;
                break;
            default:                // handled by BaseElement
                super.attributeChangedCallback(name, _, val);
                return;
            } //-------
        }
        if (!this.#isLoading) {
            if (isResize)
                this.resize();
            if (isUpdate) {
                const b = this.#hasFocus;
                this.#input.value = this.#getText(b, !b);
            }
        }
    }
    // attributeChangedCallback() helpers:
    #accept(name, n) {
        this.#attrs[name] = n;
    }
    #revert(name, val) {
        this.setAttribute(name, this.#attrs[name]);
        console.info(val === null ? val : `"${val}"`,
                     `is not a valid value for the ${name} attribute.`);
    }
    #autoStep(digits) { // using min/max to auto-step integers would be cool if
        return 1 / Math.pow(10, digits);  // you could ever make sense of it...
    }
//==============================================================================
//  Getters/setters reflect the HTML attributes, see attributeChangedCallback()
    get spins()      { return !this.hasAttribute(NO_SPIN);    } // booleans:
    get confirms()   { return !this.hasAttribute(NO_CONFIRM); }
    get autoWidth()  { return !this.hasAttribute(NO_WIDTH);   }
    get autoAlign()  { return !this.hasAttribute(NO_ALIGN);   }
    get autoScale()  { return !this.hasAttribute(NO_SCALE);   }
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

    set spins     (val) { this._setBool(NO_SPIN,    !val); }    // booleans:
    set confirms  (val) { this._setBool(NO_CONFIRM, !val); }
    set autoWidth (val) { this._setBool(NO_WIDTH,   !val); }
    set autoAlign (val) { this._setBool(NO_ALIGN,   !val); }
    set autoScale (val) { this._setBool(NO_SCALE,   !val); }
    set accounting(val) { this._setBool(ACCOUNTING,  val); }

    set units   (val) { this.#setRemove(UNITS,    val); }       // strings:
    set locale  (val) { this.#setRemove(LOCALE,   val); }
    set currency(val) { this.#setRemove(CURRENCY, val); }

    set value   (val) { this.setAttribute(VALUE,    val); }     // numbers:
    set digits  (val) { this.setAttribute(DIGITS,   val); }
    set max     (val) { this.setAttribute(MAX,      val); }
    set min     (val) { this.setAttribute(MIN,      val); }
    set step    (val) { this.#setRemove  (STEP,     val); }
    set delay   (val) { this.setAttribute(DELAY,    val); }
    set interval(val) { this.setAttribute(INTERVAL, val); }

//  #setRemove() is for non-boolean attributes that can be removed
    #setRemove(attr, val) {
        val === null || val === undefined
        ? this.removeAttribute(attr)
        : this.setAttribute(attr, val);
    }
//==============================================================================
//  Event handlers
//  target is this:
    #enter(evt) {
        this.#assignCSS(evt.type);
        this.#input.value = this.#getText(false);
        if (this.spins)
            this.#showCtrls(true);
    }
    #leave(evt) {
        this.#assignCSS(evt.type);
        this.#input.value = this.#getText(false, true);
        this.#showCtrls(false);
    }
//  target is #input:
    #blur(evt) {
        if (this.#isBlurry || evt.relatedTarget === this)
            return;
        //---------------------------------------------
        this.#assignCSS(evt.type);
        this.#showCtrls (false);
        this.#swapEvents(true);
        this.#input.value = this.#getText(false, true);
        this.#isMousing   = false;
        this._setHref("#spinner-idle");
        this.classList.remove("NaN");
    }
    #focus(evt) {
        if (this.#isBlurry || this.#isMousing) return;
        //----------------------------------------------
        this.#assignCSS(evt.type);
        this.#showCtrls (false);
        this.#swapEvents(false);
        this.#input.value = this.#attrs[VALUE].toFixed(this.digits);
    }
//  #swapEvents() is better than converting mousedown/mouseup into click,
//                and it avoids if statements in several event handlers.
    #swapEvents(b) {
        let elm;
        for (elm of this.#btns) {
            this.#toggleEvent(event.down,   b, elm);
            this.#toggleEvent(event.up,     b, elm);
            this.#toggleEvent(event.click, !b, elm);
        }
        elm = this.#input;
        this.#toggleEvent(event.down, b, elm);
        this.#toggleEvent(event.up,   b, elm);

        this.#toggleEvent(event.enter, b, this.#enter);
        this.#toggleEvent(event.leave, b, this.#leave);
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
            this.#isMousing = false;         // let this.#focus() do it's thing,
            this.#focus({type:event.focus}); // it already has the focus
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
// =============================================================================
//  resize() calculates the correct width and applies it to this.#input
    resize() {
        let chars, diff, extra, id, isItalic, svg;
        const
        px = "px",
        W  = "width",
        PR = "padding-right",
        TA = "text-align",
        states  = this.#states,
        isAlign = this.autoAlign,
        isWidth = this.max < Infinity && this.min > -Infinity
                ? this.autoWidth
                : false;    // can't auto-size infinite min or max value

        if (this.spins || this.confirms) {
            if (this.autoScale) {      // auto lets this.clientHeight adjust
                this.#svg.style.height = "auto";
                this.#svg.style.height = this.clientHeight + px;
            }
            else
                this.#svg.style.height = "";

            svg = this.#svg.getBoundingClientRect().width;
        }
        else {
            svg = 0;        // no spinning, no confirming = no buttons
            this.#svg.style.display = "none";
        }
        if (isWidth || isAlign) {
            let id, prop, txt, type;
            const
            style = getComputedStyle(this.#input),
            width = {};
            for (txt of this.#texts) {
                id = txt.id;
                txt.innerHTML = this.#formatNumber(this[id]) ?? this.units;
                for (type of ["family","size","weight","style","stretch",
                              "font-size-adjust","font-kerning"]) {
                    prop = "font-" + type;
                    txt.style[prop] = style[prop];
                }
                width[id] = txt.getBBox().width;
            }
            chars = Math.max(width[MAX], width[MIN]); // text width w/o units
            extra = Math.max(svg, width[UNITS]);      // the rest of the width
            diff  = Math.max(0, svg - width[UNITS]);  // only if svg > width[UNITS]
            isItalic = style.fontStyle == "italic";
        }

        if (isWidth) {
            const obj = {
                [event.blur] : chars + extra - diff,
                [event.focus]: chars + extra,
                [event.enter]: chars
            }
            if (isItalic)            // ...does anyone use italics for input??
                for (id in obj)
                    obj[id] = this.#roundEven(obj[id]);

            for (id in obj)
                states[id][W] = obj[id] + px;
        }
        else
            for (id of resizeEvents)
                states[id][W] = "";

        if (isAlign) {
            states[event.blur] [PR] = this.#padRight + diff  + px;
            states[event.focus][PR] = this.#padRight + px;
            states[event.enter][PR] = this.#padRight + extra + px;
            states[event.blur] [TA] = "right";
            states[event.focus][TA] = "left";
            states[event.enter][TA] = "right";
        }
        else {
            for (id of resizeEvents) {
                states[id][PR] = "";
                states[id][TA] = "";
            }
        }
        this.#assignCSS(event.blur); // assumes #input not focused or hovering!!
    }
//  #roundEven() is because italics can truncate slightly when right-aligned,
//               and rounding the width to the nearest even number reduces it.
    #roundEven(n) {
        const
        floor = Math.floor(n),
        ceil  = Math.ceil(n);
        return (floor % 2 ? ceil : floor);
    }
//  #assignCSS() is necessary because overriding ::part requires "important"
    #assignCSS(type) {
        const style = this.#input.style;
        for (const [prop, val] of Object.entries(this.#states[type]))
            style.setProperty(prop, val, "important");
    }
//==============================================================================
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
        if (n === undefined) return;  // helps resize()
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
//==============================================================================
//  #showCtrls() shows or hides the spin or confirm buttons
    #showCtrls(b) {
        this.#controls.style.visibility = b ? "visible" : "hidden";
    }
//  #addEvent() is a convenience
    #addEvent(type, func, elm) {
        if (elm)
            func = func.bind(this);
        else
            elm = this;
        elm.addEventListener(type, func);
    }
//==============================================================================
// this.#hasFocus returns true if #input has the focus
    get #hasFocus() { return this.#input === this._dom.activeElement; }
//  could be written: return Boolean(this._dom.activeElement);

//!! this.blur() doesn't work in Chrome (elsewhere?) when _dom.activeElement === null
    #blurMe(b = true) {
        this.#isBlurry = b;
        this.#input.focus();
        this.#input.blur();
        this.#isBlurry = false;
    }
}
customElements.define("in-number", NumberInput);