export {InputNum};

import {VALUE, BaseElement} from "./base-element.js";
const
MAX   = "max",                // DOM attributes:
MIN   = "min",
STEP  = "step",
                              // custom attributes: numbers and strings
DELAY       = "delay",        // millisecond delay between mousedown & spin
INTERVAL    = "interval",     // millisecond interval for spin
DIGITS      = "digits",       // Number.prototype.toFixed(digits)
UNITS       = "units",        // units string suffix
LOCALE      = "locale",       // locale string: "aa-AA", "" = user locale
NOTATION    = "notation",     // Intl.NumberFormat() options notation prop
CURRENCY    = "currency",     // ditto: currency property
                                   // booleans:
ACCOUNTING  = "accounting",   // {currencySign:"accounting"}
BLUR_CANCEL = "blur-cancel",  // Blur = <Esc> key, else Blur = <Enter> key
NO_KEYS     = "no-keys",      // no keyboard/pad input, only spinning
NO_SPIN     = "no-spin",      // hide spinner, no keyboard spinning
NO_CONFIRM  = "no-confirm",   // hide confirm/cancel buttons
NO_SCALE    = "no-scale",     // don't scale the buttons to match font size
NO_WIDTH    = "no-width",     // don't auto-size width
NO_ALIGN    = "no-align",     // don't auto-align or auto-pad
NO_RESIZE   = "no-resize",    // don't run resize(), used during page load

NAN   = "NaN",          // class names:
OOB   = "OoB",          // Out of Bounds
BEEP  = "beep",
INPUT = "input",        // <input> element id, and coincidentally its tagName

SPINNER = "#spinner-",  // Each def id has two or three segments:
CONFIRM = "#confirm-",
HOVER   = "hover-",     // second segments:
ACTIVE  = "active-",
SPIN    = "spin-",      // for full-speed spinning
IDLE    = "idle",       // no third segment for idle
TOP     = "top",        // third segments:
BOT     = "bot",

minimums = {            // some attributes have hard minimum values
    [DIGITS]:   0,
    [DELAY]:    1,
    [INTERVAL]: 1
},
code = {                // KeyboardEvent.prototype.code values
    enter: "Enter",
    escape:"Escape",
    up:    "ArrowUp",
    down:  "ArrowDown"
},
key = {                 // Event types:
    down: "keydown",
    up:   "keyup",
    [code.up]:   TOP,   // ArrowUp   = TOP button
    [code.down]: BOT    // ArrowDown = BOT button
},
mouse = {
    over: "mouseover",
    out:  "mouseout",
    down: "mousedown",
    up:   "mouseup",
    click:"click",
},
event = {
    blur: "blur",
    focus:"focus"
},
resizeEvents = [event.blur, event.focus, mouse.over],

textAlign = ["text-align","right","important"],
noAwait   = true; // see https://github.com/sidewayss/html-elements/issues/8
// =============================================================================
class InputNum extends BaseElement {
    #attrs; #bound; #btns; #confirmIt; #ctrls; #erId; #hoverIn; #hoverOut;
    #input; #isBlurring; #isLoading; #isMousing; #locale; #outFocus; #padRight;
    #spinId; #states; #svg; #texts; #validate;
    #isBlurry;         // kludge for this._dom.activeElement === null

static defaults = {
    [VALUE]:  0,       // attribute values as numbers, not strings
    [DIGITS]: 0,       // defaults to integer formatting
    [MAX]:  Infinity,
    [MIN]: -Infinity,
    [STEP]:     1,
    [DELAY]:  500,
    [INTERVAL]:33      // ~2 frames at 60fps
};
static observedAttributes = [
    VALUE, MAX, MIN, STEP, DELAY, INTERVAL, DIGITS, UNITS, LOCALE, CURRENCY,
    ACCOUNTING, NOTATION, NO_KEYS, NO_SPIN, NO_CONFIRM, NO_WIDTH, NO_ALIGN,
    NO_SCALE, ...BaseElement.observedAttributes
];
// =============================================================================
    constructor() {
        super(import.meta, InputNum, noAwait);
        //   #attrs caches numbers for revert on NaN
        this.#attrs  = Object.assign({}, InputNum.defaults);
        this.#locale = {currencyDisplay:"narrowSymbol"};
        this.#spinId = null;
        this.#bound  = {        // #swapEvents adds/removes #bound events
            [mouse.down]: this.#mouseDown.bind(this),
            [mouse.up]:   this.#mouseUp  .bind(this),
            [mouse.click]:this.#click    .bind(this)
        };
        this.#addEvent(key.down,    this.#keyDown);
        this.#addEvent(key.up,      this.#keyUp);
        this.#addEvent(mouse.over,  this.#hover);
        this.#addEvent(mouse.out,   this.#hover);
        this.#addEvent(event.focus, this.#active);
        this.#addEvent(event.blur,  this.#active);

        const obj = {};         // #states are #input styles for each state
        for (const evt of resizeEvents)
            obj[evt] = {};
        obj[mouse.out] = obj[event.blur];
        this.#states   = obj;

        this.#isLoading = true; // prevents double-setting of values during load
        if (!noAwait)
            this._init();
    }
//==============================================================================
//  _init() exists for noAwait, part of it belongs in a connectedCallback()
    _init() {
        this.#input = this._dom.getElementById(INPUT);
        this.#input.style.setProperty(...textAlign);   // default is right-align
        this.#addEvent(event.focus, this.#focus, this.#input);
        this.#addEvent(event.blur,  this.#blur , this.#input);

        let elm = this.#input.nextElementSibling;
        this.#svg   = elm;
        this.#btns  = elm.getElementsByClassName("events");
        this.#texts = elm.nextElementSibling.children;
        this.#ctrls = elm.getElementById("controls");
        this._use   = this.#ctrls.getElementsByTagName("use")[0];

        for (elm of this.#btns) {
            this.#addEvent(mouse.over, this.#mouseOver, elm);
            this.#addEvent(mouse.out,  this.#mouseOut,  elm);
        }
        this.#swapEvents(true);

        if (noAwait) {              // skipped when noAwait:
            this.#input.inputMode = this.digits ? "decimal" : "numeric";
            this.#input.disabled = !this.keyboards;
            if (!this.autoAlign)    // default set above
                this.#input.style.setProperty(textAlign[0], null);
            this._connected();
        }
    }
//  _connected() is the pseudo-connectedCallback(), see BaseElement.
    _connected() {
        const val = this.#attrs[VALUE];
        if (val > this.max || val < this.min)   // clamp value, even the default
            this.value = Math.max(this.min, Math.min(this.max, val));

        this.#input.value = this.#getText(false, true);
        this.#padRight = parseFloat(getComputedStyle(this.#input).paddingRight);
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
                this.#revert(name); // null and "" are not valid values
                return;             // you can't remove these attributes
            } //-----------
            switch (name) {
            case STEP:
                if (val === null)
                    this.#attrs[STEP] = this.#autoStep(this.#attrs[DIGITS]);
                else if (n)
                    this.#accept(name, n);
                else                // can't be zero
                    this.#revert(name);
                return;
            //----------
            case DIGITS:            // runs twice if #revert(), but simpler
                isResize = true;
                isUpdate = true;
                if (this.#input)    // for noAwait
                    this.#input.inputMode = n ? "decimal" : "numeric";
                this.#locale.maximumFractionDigits = n;
                this.#locale.minimumFractionDigits = n;
                if (!this.hasAttribute(STEP)) // auto-step default:
                    this.#attrs[STEP] = this.#autoStep(n);
            case DELAY:
            case INTERVAL:
                n >= minimums[name]
                ? this.#accept(name, n)
                : this.#revert(name);
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
        else {                      // boolean and string attributes:
            isResize = true;
            switch(name) {          // booleans:
            case NO_KEYS:
                isResize = false;
                if (this.#input)    // for noAwait
                    this.#input.disabled = (val !== null);
                break;
            case NO_CONFIRM:
            case NO_SPIN:           // assume element does not have focus
                this.#swapEvents(true);
                break;
            case NO_ALIGN:
                if (this.#input) {  // for noAwait
                    const args = (val === null) ? textAlign : [textAlign[0], null];
                    this.#input.style.setProperty(...args);
                }
            case NO_WIDTH:
            case NO_SCALE:
                break;
            default:
                isUpdate = true;
                switch(name) {
                case ACCOUNTING:
                    this.#locale.currencySign = (val !== null)
                                              ? "accounting" : undefined;
                case LOCALE:
                case UNITS:         // strings:
                    break;
                case CURRENCY:
                    this.#locale.style = val ? "currency" : undefined;
                case NOTATION:      // convert null to undefined
                    this.#locale[name.split("-")[1]] = val ?? undefined;
                    break;
                default:            // handled by BaseElement
                    super.attributeChangedCallback(name, _, val);
                    return;
                } //-------
            }
        }
        if (!this.#isLoading) {
            if (isResize)
                this.resize();
            if (isUpdate) {
                if (this.#input) {  // for noAwait
                    const b = this.#inFocus;
                    this.#input.value = this.#getText(b, !b && this.units);
                }
            }
        }
    }
    // attributeChangedCallback() helpers:
    #accept(name, n) {
        this.#attrs[name] = n;
    }
    #revert(name) {
        this.setAttribute(name, this.#attrs[name]);
    }
    #autoStep(digits) { // using min/max to auto-step integers would be cool if
        return 1 / Math.pow(10, digits);  // you could ever make sense of it...
    }
//==============================================================================
//  Getters/setters reflect the HTML attributes, see attributeChangedCallback()
    get keyboards()  { return !this.hasAttribute(NO_KEYS);     } // booleans:
    get spins()      { return !this.hasAttribute(NO_SPIN);     }
    get confirms()   { return !this.hasAttribute(NO_CONFIRM);  }
    get autoWidth()  { return !this.hasAttribute(NO_WIDTH);    }
    get autoAlign()  { return !this.hasAttribute(NO_ALIGN);    }
    get autoResize() { return !this.hasAttribute(NO_RESIZE);   }
    get autoScale()  { return !this.hasAttribute(NO_SCALE);    }
    get blurEsc()    { return  this.hasAttribute(BLUR_CANCEL); }
    get accounting() { return  this.hasAttribute(ACCOUNTING);  }
    get useLocale()  { return  this.hasAttribute(LOCALE);      } // read-only

    get units()    { return this.getAttribute(UNITS)  ?? ""; }   // strings:
    get locale()   { return this.getAttribute(LOCALE) || undefined; }
    get currency() { return this.getAttribute(CURRENCY); }
    get notation() { return this.getAttribute(NOTATION); }
    get text()     { return this.#input.value; }                 // read-only

    get value()    { return this.#attrs[VALUE];    }             // numbers:
    get digits()   { return this.#attrs[DIGITS];   }
    get max()      { return this.#attrs[MAX];      }
    get min()      { return this.#attrs[MIN];      }
    get step()     { return this.#attrs[STEP];     }
    get delay()    { return this.#attrs[DELAY];    }
    get interval() { return this.#attrs[INTERVAL]; }

    get validate()    { return this.#validate; }                 // function:
    set validate(val) {
        if (val === undefined || (val instanceof Function))
            this.#validate = val;
        else
            throw new Error("validate must be an instance of Function or undefined.");
    }
    set keyboards (val) { this._setBool(NO_KEYS,    !val); }     // booleans:
    set spins     (val) { this._setBool(NO_SPIN,    !val); }
    set confirms  (val) { this._setBool(NO_CONFIRM, !val); }
    set autoWidth (val) { this._setBool(NO_WIDTH,   !val); }
    set autoAlign (val) { this._setBool(NO_ALIGN,   !val); }
    set autoResize(val) { this._setBool(NO_RESIZE,  !val); }
    set autoScale (val) { this._setBool(NO_SCALE,   !val); }
    set blurEsc   (val) { this._setBool(BLUR_CANCEL, val); }
    set accounting(val) { this._setBool(ACCOUNTING,  val); }

    set units   (val) { this.#setRemove(UNITS,    val); }        // strings:
    set locale  (val) { this.#setRemove(LOCALE,   val); }
    set currency(val) { this.#setRemove(CURRENCY, val); }
    set notation(val) { this.#setRemove(NOTATION, val); }

    set value   (val) { this.setAttribute(VALUE,    val); }      // numbers:
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
//  Event Handlers
//  Both this and #up, #down listen for mouseover, mouseout, focus and blur.
//  this handles both mouse events with #hover, and focus/blur with #active().
//  #up, #down handle each event separately, handler is named after the event.
//  mouseover and mouseout ---------------------------------------------------
//  target is this: shows/hides controls and formats #input for spinner
    #hover(evt) {
        const
        isOver = (evt.type == mouse.over),
        inFocus = this.#inFocus;
        this.#hoverOut = isOver;
        if (!this.#hoverIn)
            this._setHref(`${this.#getButton(inFocus)}${IDLE}`);

        if (inFocus) {
            if (this.confirms)
                this.#showCtrls(isOver);
        }
        else if (this.spins) {
            this.#assignCSS(evt.type);
            this.#input.value = this.#getText(false, !isOver);
            this.#showCtrls(isOver || this.#outFocus);
        }
    }
//  target is up or down <rect>: starts/stops spin, sets href
    #mouseOver(evt) {
        let args;
        const id = evt.target.id;
        if (this.#isSpinning) {          // if spinning, spin the other way
            this.#spin(undefined, null); // cancel w/o href or #spinId = null
            args = [false, id == TOP];   // restart at full speed
        }
        this.#overOut(id, `${this.#getState(id)}`, args);
    }
    #mouseOut(evt) {
        const
        id   = evt.relatedTarget?.id,
        args = !this.#isSpinning || id == TOP || id == BOT
             ? undefined  // don't call #spin()
             : [];        // cancel spinning
        this.#overOut("", IDLE, args);
    }
    #overOut(hoverIn, state, args) {
        this.#hoverIn = hoverIn;
        this._setHref(`${this.#getButton(this.#inFocus)}${state}`);
        if (args !== undefined)
            this.#spin(...args);
    }
//  focus and blur -----------------------------------------------------------
//  target is this:
    #active(evt) {
        if (this.#isMousing) return;
        //-----------------------------------------
        this.#outFocus = (evt.type == event.focus);
        const
        inFocus = this.#inFocus,
        showIt  = (inFocus || !this.#outFocus)
                ? this.#hoverOut // #input is focused or this is blurring
                : true;          // this is focused, not #input
        this.#showCtrls(showIt);
        this._setHref(this.#getButton(inFocus) + this.#getState());
    }
//  target is #input:
    #focus(evt) {
        // stopPropagation() here doesn't prevent #active()
        if (this.#isBlurry || this.#isMousing) return;
        //---------------------------------------------------
        this.#fur(evt, false, CONFIRM, false,
                  this.#attrs[VALUE].toFixed(this.digits));
    }
    #blur(evt) {
        if (this.#isBlurry || this.#isMousing) return;
        //---------------------------------------------------------------------
        // The default behavior is to confirm the value onblur() when the user
        // presses the Tab key or clicks elsewhere on the page. To cancel input
        // onblur(), set the blur-cancel attribute. Either way, the blur
        // event handler is where we "confirm it" i.e. set the value attribute.
        // #confirmIt: true = Enter/OK, false = Esc/Cancel, undefined = Tab/etc.
        if (this.#confirmIt ?? !this.blurCancel) {
            const val = this.#validate?.(this.text) ?? this.text;
            if (val !== false) {     // set VALUE from keyboard input is funky
                this.#isBlurring = true;
                this.setAttribute(VALUE, val);
                this.#isBlurring = false;
                this.dispatchEvent(new Event("change"));
            }
        }
        this.#confirmIt = undefined; // undefined falls back to !blurCancel

        // When #input has the focus and the user presses Shift+Tab:
        //   evt.relatedTarget === this and #active does not run
        //   because this === document.activeElement before and after
        const
        showIt = (evt.relatedTarget === this),
        value  = this.#getText(false, true);
        if (this.#fur(evt, true, SPINNER, showIt, value)) {
            this.classList.remove(NAN);
            this.classList.remove(OOB);
        }
    }
    #fur(evt, isBlur, name, showIt, value) {
        this.#input.value = value;
        this._setHref   (name + this.#getState());
        this.#assignCSS (evt.type);
        this.#showCtrls (showIt || this.#hoverOut);
        this.#swapEvents(isBlur);       // both are focusing or blurring:
        if (isBlur ? document.activeElement !== this : !this.#outFocus) {
            if (evt.target)             // else called by #mouseUp()
                evt.stopPropagation();  // don't run #active()
            this.#outFocus = !isBlur;   // but gotta set this
        }
        return true;
    }
//  mousedown, mouseup, and click --------------------------------------------
//  target is #input or up or down <rect>:
//  #isMousing is because in #input the user can mousedown & drag to select,
//  even trigger mouseout, and because preventDefault() doesn't prevent blur.
    #mouseDown(evt) {
        if (evt.target === this.#input) {
            if (!this.#inFocus) {             // about to get focus, not yet
                this.#isMousing = true;
                this.#dragEvents(true);
            }
        }
        else if (this.#inFocus) {             // clicking ok/cancel blurs #input
            const id = evt.target.id;
            this.#isMousing = true;           // #blur() = noop
            this._setHref(this.#getButton(this.#inFocus) + ACTIVE + id);
            if (id == TOP && this.classList.contains(NAN))
                this.classList.add(BEEP);
        }
        else {
            this.#spin(true);
            if (this.#outFocus)               // Chrome: prevent next element's
                evt.preventDefault();         // text selection on double-click,
        }                                     // but allow focus to happen first
    }
    #mouseUp(evt) {
        if (evt.currentTarget !== window) {
            this.#spin();                 // not worth checking if (#isSpinning)
            this.classList.remove(BEEP);  // ditto if (BEEP)
        }
        else {
            let match, obj;               // end a text selection drag
            const
            range = [],
            input = this.#input,
            dir   = input.selectionDirection,
            start = input.selectionStart,
            end   = input.selectionEnd,
            dist  = end - start,
            val   = input.value,
            orig  = [{num:start, str:val.slice(0, start)},
                     {num:dist,  str:val.slice(start, end)}];
            for (obj of orig) {
                match = obj.str.match(/[^\d-.eE]/g);
                range.push(obj.num - (match ? match.length : 0))
            }
            this.#isMousing = false;      // let #focus() do it's thing, #input
            this.#focus(new Event(event.focus));    // might already have focus.
            if (this.accounting && val[0] == "(")
                ++range[0];
            input.setSelectionRange(range[0], range[0] + range[1], dir);
            this.#dragEvents(false);
        }
    }
//  target is up or down <rect>: confirm only, not spinner. It must check
//  classList.contains(NAN) because setting #up's pointer-events to "none"
//  displays text I-beam cursor.
    #click(evt) {
        this.#confirmIt = (evt.target.id == TOP); // TOP == OK, else Cancel
        if (this.#confirmIt && this.classList.contains(NAN)) {
            this.#input.focus();                  // mousedown/up handles BEEP
            this.#isMousing = false;              // must follow #input.focus()
        }
        else
            this.#blurMe(false);
    }
//  keydown and keyup --------------------------------------------------------
//  keyboard target is this, because the svg buttons don't receive focus.
    #keyDown(evt) {                 // document .activeElement === this
        if (this.#inFocus)          // this._dom.activeElement === this.#input
            switch (evt.code) {
            case code.enter:
                if (this.classList.contains(NAN)) // force the user to input
                    this.classList.add(BEEP);     // a valid number or cancel.
                else {
                    this.#confirmIt = true;       // apply the user input
                    this.#input.blur();
                }
                break;
            case code.escape:
                this.#confirmIt = false;          // user is cancelling
                this.#input.blur();
            default:
            }
        else
            switch (evt.code) {     // this._dom.activeElement === null
            case code.enter: case code.escape:
                this.#confirmIt = false;          // value already confirmed
                this.#blurMe(true);
                return;
            case code.down:
            case code.up:
            // Keyboard repeat rate is an OS setting that has it's own delay
            // then interval, thus #spin(null). Separate href for delayed image
            // because quick keydown/up sequences flicker, and a delay can look
            // just as flickery, depending on the timing. If it's only a slight
            // difference from #spinner-idle, it looks good.
                const topBot = key[evt.code];
                if (this.#isSpinning)
                    this._setHref(`${SPINNER}${SPIN}${topBot}`);
                else {
                    this._setHref(`${SPINNER}key-${topBot}`);
                    this.#spinId = -1;
                } // #spin(null) doesn't set href or #spinId
                this.#spin(null, topBot == TOP);
            default:
            }
    }
    #keyUp(evt) {                            // Esc key never makes it this far
        if (this.#inFocus) {                 // any character accepted...
            if (evt.code == code.enter)
                this.classList.remove(BEEP);
            else {                           // ...but style erroneous values:
                const n = this.#toNumber(this.text);
                this.classList.toggle(NAN, Number.isNaN(n));
                this.classList.toggle(OOB, n > this.max || n < this.min);
            }
        }                                    // else spin it:
        else if (evt.code == code.up || evt.code == code.down)
            this.#spin(undefined, evt.code == code.up);
    }
//==============================================================================
// this.#inFocus returns true if #input has the focus
    get #inFocus() { return this.#input === this._dom.activeElement; }

//  #blurMe() is because this.blur() noops in Chrome when:
//            document.activeElement === this && _dom.activeElement === null
    #blurMe(isKey) {
        if (navigator.userAgentData) { // only Chrome-based browsers support it
            this.#isBlurry  = isKey;   // isKey == #keyDown(), else #click()
            this.#input.focus();
            this.#isMousing = false;   // must follow focus(), precede blur()...
            this.#input.blur();
            this.#isBlurry  = false;
        }
        else {
            this.#isMousing = false;   // ...and only matters for #click()
            this.#blur(new Event(event.blur));
            this.blur();
        }
    }
//==============================================================================
//  #swapEvents() is better than converting mousedown/mouseup into click,
//                and it simplifies focus and blur handlers. But mousedown for
//                #btns must persist when !isBlur so as to exit #focus/blur()
//                by setting #isMousing = true.
    #swapEvents(isBlur) { // isBlur == !this.#inFocus
        let elm;
        const
        downs = this.spins || this.confirms,
        spins =  isBlur && this.spins,
        firms = !isBlur && this.confirms,
        keys  = !isBlur || spins;
        for (elm of this.#btns) {                       // <rect>: #up and #down
            this.#toggleEvent(mouse.down,  downs, elm);
            this.#toggleEvent(mouse.up,    spins, elm);
            this.#toggleEvent(mouse.click, firms, elm);
        }
        elm = this.#input;
        this.#toggleEvent(mouse.down, spins, elm);
        this.#toggleEvent(mouse.up,   spins, elm);
                                                        // elm = this
        this.#toggleEvent(key.down, keys, this.#keyDown);
        this.#toggleEvent(key.up,   keys, this.#keyUp);

        // Push #svg back (or front) so #input gets the mouse events (or not)
        this.#svg.style.zIndex = (isBlur ? this.spins: this.confirms) ? 1 : -1;
    }
    #dragEvents(isDrag) {
        this.#toggleEvent(mouse.up, isDrag, window);
        this.#toggleEvent(mouse.up, isDrag, window);
        for (const elm of [this.#input, ...this.#btns])
            this.#toggleEvent(mouse.up, !isDrag, elm);
    }
    #toggleEvent(type, b, elmer) {  // elmer is an element or an event handler
        const func = b ? "addEventListener"
                       : "removeEventListener";
        if (elmer.tagName || elmer === window)
            elmer[func](type, this.#bound[type]);
        else                        // #bound is for mousedown/up and click
            this[func](type, elmer);
    }
    #addEvent(type, func, elm) {    // helps constructor only
        if (elm)                    // not used for mousedown/up or click
            func = func.bind(this);
        else
            elm = this;
        elm.addEventListener(type, func);
    }
//==============================================================================
// this.#isSpinning gives it a name
    get #isSpinning() { return this.#spinId !== null; }

//  #spin() controls the spinning process
    #spin(state, isUp = (this.#hoverIn == TOP)) {
        if (state === undefined) {           // cancel:
            if (this.#isSpinning) {
                clearInterval(this.#spinId); // interchangeable w/clearTimeout()
                clearTimeout (this.#erId);
                if (isUp !== null) {         // for mouseover while spinning
                    const state = this.#hoverIn ? `${HOVER}${this.#hoverIn}`
                                                : IDLE;
                    this._setHref(`${SPINNER}${state}`);
                    this.#spinId = null;
                }
                this.#erId = null;
            }
        }
        else {                               // spin:
            let val = this.#attrs[VALUE];    // if already clamped, skip it
            if ((isUp && val != this.max) || (!isUp && val != this.min)) {
                const n = val + (this.#attrs[STEP] * (isUp ? 1 : -1));
                val = this.#validate?.(n, true) ?? n; // true for isSpinning
                if (val !== false) {         // clamp it between min and max:
                    this.setAttribute(VALUE, Math.max(this.min, Math.min(this.max, val)));
                    this.#input.value = this.#getText(false); // false because #input w/focus does not spin
                    const evt = new Event("change");
                    evt.isUp  = isUp;
                    evt.isSpinning = true;
                    this.dispatchEvent(evt);
                }
                if (state) {                 // start spin with initial step
                    const
                    topBot = isUp ? TOP : BOT,
                    now    = `${SPINNER}${ACTIVE}${topBot}`,
                    later  = `${SPINNER}${SPIN}${topBot}`;

                    this._setHref(now);
                    this.#erId = setTimeout(this._setHref.bind(this), this.delay, later);

                    this.#spinId = setTimeout (this.#spin.bind(this), this.delay, false, isUp);
                }
                else if (state === false)    // start spinning full speed
                    this.#spinId = setInterval(this.#spin.bind(this), this.interval, null, isUp);
                // else  state === null >>>> continue spinning full speed
            }
            else // I prefer this to an expired id for a non-null value
                this.#spinId = -1; // for keyboard spin, clamped values
        }
    }
// =============================================================================
//  resize() calculates the correct width and applies it to this.#input
    resize(forceIt) {
        if (!this.autoResize && !forceIt) return;
        //-----------------------------------------------
        let btns, diff, extra, id, isItalic, prop, style;
        const
        px = "px",
        W  = "width",
        PR = "padding-right",
        width   = {},
        states  = this.#states,
        isAlign = this.autoAlign,
        isWidth = this.max < Infinity && this.min > -Infinity
                ? this.autoWidth
                : false;            // can't auto-size infinite min or max value

        style = this.#svg.style;
        if (this.spins || this.confirms) {
            if (this.autoScale) {   // auto lets this.clientHeight adjust
                style.height = "auto";
                style.height = this.clientHeight + px;
            }
            else
                for (prop of ["height", "margin-left"])
                    style.removeProperty(prop);

            btns = this.#svg.getBoundingClientRect().width;
            if (this.autoScale)     // I don't trust marginLeft in -em units
                style.marginLeft = -btns + px;
        }
        else
            btns = 0;               // no spinning, no confirming = no buttons

        if (isWidth || isAlign) {   // get widths for max, min, units
            let txt, type;
            style    = getComputedStyle(this.#input);
            isItalic = (style.fontStyle == "italic");
            for (txt of this.#texts) {
                id = txt.id;
                txt.innerHTML = (id == UNITS)
                              ? this.units
                              : this.#formatNumber(this[id]);

                for (type of ["","-kerning","-size-adjust","-synthesis",
                              "-optical-sizing",-"palette"]) {
                    prop = "font" + type;
                    txt.style[prop] = style[prop];
                }
                width[id] = txt.getBBox().width;
            }
            extra = Math.max(btns,  width[UNITS]);    // the rest of the width
            diff  = Math.max(btns - width[UNITS], 0); // 0 < width[UNITS] < svg
        }
        if (isWidth) {
            const
            chars = Math.max(width[MAX], width[MIN]), // text width w/o units
            obj   = {
                [event.blur] : chars + extra - diff,
                [event.focus]: chars + extra - btns,
                [mouse.over] : chars
            }
            if (isItalic)           // right-aligned italics often truncate
                for (id in obj)     // #roundEven() mitigates it by 1px
                    obj[id] = this.#roundEven(obj[id]);

            for (id in obj)
                states[id][W] = obj[id] + px;
        }
        else {
            for (id in states)
                states[id][W] = "";
        }
        if (isAlign) {
            states[event.blur] [PR] = this.#padRight + diff  + px;
            states[event.focus][PR] = this.#padRight + btns  + px;
            states[mouse.over] [PR] = this.#padRight + extra + px;
        }
        else {
            for (id in states)
                states[id][PR] = "";
        }
        this.#assignCSS(event.blur); // assumes #input not focused or hovering!!
    }
//  #roundEven() is because italics can truncate slightly when right-aligned,
//               depending on the font-family and font-size. Rounding the width
//               to the nearest even number of px reduces the truncation. Why???
    #roundEven(n) {
        const
        floor = Math.floor(n),
        ceil  = Math.ceil(n);
        return floor % 2 ? ceil : floor;
    }
//==============================================================================
//  #showCtrls() shows or hides the spin or confirm buttons
    #showCtrls(b) {
        this.#ctrls.style.visibility = b ? "visible" : "hidden";
    }
//  #assignCSS() is necessary because overriding ::part requires "important"
    #assignCSS(type) { // only used for width, padding-right, and text-align
        const style = this.#input.style;
        for (const [prop, val] of Object.entries(this.#states[type]))
            style.setProperty(prop, val, "important");
    }
//  #getText() gets the appropriate text for the #input
    #getText(inFocus, appendUnits) {
        const n = this.#attrs[VALUE];
        let txt = inFocus ? n : this.#formatNumber(n);
        if (appendUnits) {
            if (this.#locale.currency)
                txt += "/";     // currency && units displays currency per unit
            txt += this.units;
        }
        return txt;
    }
//  #formatNumber() formats a number for display as text
    #formatNumber(n) {
        if (n !== undefined)        //!!might not be necessary anymore...
            return this.useLocale
                 ? new Intl.NumberFormat(this.locale, this.#locale).format(n)
                 : n.toFixed(this.#attrs[DIGITS]);
    }
//  #toNumber() converts string to number, str never equals 0
    #toNumber(str) {                    // parseFloat() is too lenient
        return str ? Number(str) : NaN; // Number() converts "" and null to 0
    }
//  #getButton() gets the first segment of the href id
    #getButton(inFocus) {
        return !inFocus ? SPINNER : CONFIRM;
    }
//  #getState() gets the second-third segments of the href id
    #getState(id = this.#hoverIn) {
        return this.#isSpinning ? `${ACTIVE}${id}`
                           : id ? `${HOVER}${id}`
                                : IDLE; // idle only has two segments
    }
}
BaseElement.define(InputNum);