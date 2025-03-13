export {InputNum};

import {DISABLED, VALUE, BaseElement, preventSelection}
        from "./base-element.js";
const
MAX   = "max",          // DOM attributes:
MIN   = "min",
STEP  = "step",
                        // custom attributes: numbers and strings first
WIDTH       = "width",        // "auto", "none", <length>, not % or calc()
DELAY       = "delay",        // millisecond delay between mousedown & spin
INTERVAL    = "interval",     // millisecond interval for spin
DIGITS      = "digits",       // Number.prototype.toFixed(digits)
UNITS       = "units",        // units string suffix
LOCALE      = "locale",       // locale string: "aa-AA", "" = user locale
NOTATION    = "notation",     // Intl.NumberFormat() options notation prop
CURRENCY    = "currency",     // ditto: currency property
                        // booleans:
ACCOUNTING  = "accounting",   // {currencySign:"accounting"}
ANY_DECIMAL = "any-decimal",  // lets users input either comma or period
BLUR_CANCEL = "blur-cancel",  // Blur = <Esc> key, else Blur = <Enter> key
SHOW_BTNS   = "show-buttons", // always display buttons
TRIM_RIGHT  = "trim-right",   // if units.width < buttons.width, trim width
                        // inverted booleans:
NO_KEYS     = "no-keys",      // no keyboard/pad input, only spinning
NO_SPIN     = "no-spin",      // hide spinner, no keyboard spinning
NO_CONFIRM  = "no-confirm",   // hide confirm/cancel buttons
NO_SCALE    = "no-scale",     // don't scale the buttons to match font size
NO_ALIGN    = "no-align",     // don't auto-align or auto-pad
NO_RESIZE   = "no-resize",    // don't run resize(), used during page load

AUTO = "auto",          // attribute values:
NONE = "none",

NAN   = "NaN",          // class names:
OOB   = "OoB",          // Out of Bounds
BEEP  = "beep",
INPUT = "input",        // <input> element id, and coincidentally its tagName

SPINNER = "spinner-",   // Each def id has two or three segments:
CONFIRM = "confirm-",
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
IMPORTANT = "important",
textAlign = ["text-align","right", IMPORTANT];
// =============================================================================
class InputNum extends BaseElement {
    #attrs; #bound; #btns; #confirmIt; #ctrls; #decimal; #erId; #hoverBtn;
    #hoverOut; #input; #isBlurring; #isLoading; #isMousing; #kbSpin; #locale;
    #mNm; #outFocus; #padRight; #spinId; #states; #svg; #units; #validate;
    #width;

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
    VALUE, MAX, MIN, STEP, WIDTH, DELAY, INTERVAL, DIGITS, UNITS, LOCALE,
    CURRENCY, ACCOUNTING, NOTATION, SHOW_BTNS, NO_KEYS, NO_SPIN, NO_CONFIRM,
    NO_ALIGN, NO_SCALE, ...BaseElement.observedAttributes
];
// =============================================================================
    constructor() {
        super(import.meta, InputNum);
        //   #attrs caches numbers for revert on NaN
        this.#attrs   = Object.assign({}, InputNum.defaults);
        this.#decimal = ".";    // that's the universal default
        this.#spinId  = null;
        this.#bound   = {       // #swapEvents adds/removes #bound events
            [mouse.down]: this.#mouseDown.bind(this),
            [mouse.up]:   this.#mouseUp  .bind(this),
            [mouse.click]:this.#click    .bind(this)
        };
        this.#locale = {currencyDisplay:"narrowSymbol"}; // constant
        this.#getDigits(this.#locale);
        this.#addEvent(key.down,    this.#keyDown);
        this.#addEvent(key.up,      this.#keyUp);
        this.#addEvent(mouse.over,  this.#hover);
        this.#addEvent(mouse.out,   this.#hover);
        this.#addEvent(event.focus, this.#active);
        this.#addEvent(event.blur,  this.#active);

        const obj = {};         // #states are #input styles for each state
        for (const evt of [event.blur, event.focus, mouse.over])
            obj[evt] = {};
        obj[mouse.out] = obj[event.blur];
        this.#states   = obj;

        this.#isLoading = true; // prevents double-setting of values during load
        this.is();
    }
//==============================================================================
//  _init()
    _init() {
        this.#input = this.shadowRoot.getElementById(INPUT);
        this.#input.style.setProperty(...textAlign);   // default is right-align
        this.#addEvent(event.focus, this.#focus, this.#input);
        this.#addEvent(event.blur,  this.#blur , this.#input);

        let elm = this.#input.nextElementSibling;
        this.#svg   = elm;
        this.#btns  = elm.getElementsByClassName("events");
        this.#mNm   = [...elm.nextElementSibling.children]; // #max 'n' #min
        this.#width = this.#mNm.splice(0, 1)[0];
        this.#units = this.#mNm.splice(0, 1)[0];
        this.#ctrls = elm.getElementById("controls");

        for (elm of this.#btns) {
            this.#addEvent(mouse.over, this.#mouseOver, elm);
            this.#addEvent(mouse.out,  this.#mouseOut,  elm);
        }
        this.#swapEvents(true);

        this.#input.inputMode = this.digits ? "decimal" : "numeric";
        this.#input.disabled = !this.keyboards;
        if (this.showButtons)
            this.#showCtrls(true, true);
        if (!this.autoAlign)    // default set above
            this.#input.style.setProperty(textAlign[0], null);

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
        const isNull = (val === null);

        if (name in this.#attrs) {  // numeric attributes
            const n = this.#toNumber(val);
            if (Number.isNaN(n) && name != STEP) {
                this.#revert(name); // null and "" are not valid values
                return;             // you can't remove these attributes
            } //-----------
            switch (name) {
            case STEP:
                if (isNull)
                    this.#attrs[STEP] = autoStep(this.#attrs[DIGITS]);
                else if (n)
                    this.#accept(name, n);
                else                // can't be zero
                    this.#revert(name);
                return;
            //----------
            case DIGITS:            // runs twice if #revert(), but simpler
                isResize = true;
                isUpdate = true;
                this.#getDigits(this.#locale, n);
                if (this.#input)
                    this.#input.inputMode = n ? "decimal" : "numeric";
                if (!this.hasAttribute(STEP)) // auto-step default:
                    this.#attrs[STEP] = autoStep(n);
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
            case SHOW_BTNS:
                this.#showCtrls(!isNull, true);
                break;
            case TRIM_RIGHT:
                ;
                break;
            case NO_KEYS:
                isResize = false;
                if (this.#input)
                    this.#input.disabled = !isNull;
                break;
            case NO_CONFIRM:
            case NO_SPIN:           // assume element does not have focus
                this.#swapEvents(true);
                break;
            case NO_ALIGN:
                if (this.#input) {
                    const args = isNull ? textAlign : [textAlign[0], null];
                    this.#input.style.setProperty(...args);
                }
            case NO_SCALE:
                break;
            default:
                isUpdate = true;
                switch(name) {
                case LOCALE:        // the decimal marker:
                    this.#decimal = isNull
                                  ? "."     // convert "" to undefined
                                  : Intl.NumberFormat(val || undefined)
                                        .formatToParts(.1)
                                        .find(p => p.type == "decimal")
                                        .value;
                    break;
                case ACCOUNTING:
                    this.#locale.currencySign = !isNull
                                              ? "accounting" : undefined;
                case UNITS:         // strings:
                    break;
                case CURRENCY:
                    this.#locale.style = val ? "currency" : undefined;
                case NOTATION:      // convert null to undefined
                    this.#locale[name] = val ?? undefined;
                    break;
                case DISABLED:      // falls through
                    this.#input.tabIndex = isNull ? 0 : -1;
                    for (const elm of this.#btns)
                        elm.style.pointerEvents = isNull ? "" : NONE;
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
                if (this.#input) {
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
//==============================================================================
//  Getters/setters reflect the HTML attributes, see attributeChangedCallback()
    get keyboards()  { return !this.hasAttribute(NO_KEYS);     } // booleans:
    get spins()      { return !this.hasAttribute(NO_SPIN);     }
    get confirms()   { return !this.hasAttribute(NO_CONFIRM);  }
    get autoAlign()  { return !this.hasAttribute(NO_ALIGN);    }
    get autoScale()  { return !this.hasAttribute(NO_SCALE);    }
    get autoResize() { return !this.hasAttribute(NO_RESIZE);   }
    get showButtons(){ return  this.hasAttribute(SHOW_BTNS);   }
    get trimRight()  { return  this.hasAttribute(TRIM_RIGHT);  }
    get blurCancel() { return  this.hasAttribute(BLUR_CANCEL); }
    get anyDecimal() { return  this.hasAttribute(ANY_DECIMAL); }
    get accounting() { return  this.hasAttribute(ACCOUNTING);  }
    get useLocale()  { return  this.hasAttribute(LOCALE);      } // read-only

    set keyboards  (val) { this.toggleAttribute(NO_KEYS,    !val); }
    set spins      (val) { this.toggleAttribute(NO_SPIN,    !val); }
    set confirms   (val) { this.toggleAttribute(NO_CONFIRM, !val); }
    set autoAlign  (val) { this.toggleAttribute(NO_ALIGN,   !val); }
    set autoScale  (val) { this.toggleAttribute(NO_SCALE,   !val); }
    set autoResize (val) { this.toggleAttribute(NO_RESIZE,  !val); }
    set showButtons(val) { this.toggleAttribute(SHOW_BTNS,   Boolean(val)); }
    set trimRight  (val) { this.toggleAttribute(TRIM_RIGHT,  Boolean(val)); }
    set blurCancel (val) { this.toggleAttribute(BLUR_CANCEL, Boolean(val)); }
    set anyDecimal (val) { this.toggleAttribute(ANY_DECIMAL, Boolean(val)); }
    set accounting (val) { this.toggleAttribute(ACCOUNTING,  Boolean(val)); }
                                                                 // strings:
    get width()    { return this.getAttribute(WIDTH)  ?? AUTO; }
    get units()    { return this.getAttribute(UNITS)  ?? ""; }
    get locale()   { return this.getAttribute(LOCALE) || undefined; }
    get currency() { return this.getAttribute(CURRENCY); }
    get notation() { return this.getAttribute(NOTATION); }
    get text()     { return this.#input.value; }                 // read-only

    set width   (val) { this.#setRemove(WIDTH,    val); }
    set units   (val) { this.#setRemove(UNITS,    val); }
    set locale  (val) { this.#setRemove(LOCALE,   val); }
    set currency(val) { this.#setRemove(CURRENCY, val); }
    set notation(val) { this.#setRemove(NOTATION, val); }

    get value()    { return this.#attrs[VALUE];    }             // numbers:
    get digits()   { return this.#attrs[DIGITS];   }
    get max()      { return this.#attrs[MAX];      }
    get min()      { return this.#attrs[MIN];      }
    get step()     { return this.#attrs[STEP];     }
    get delay()    { return this.#attrs[DELAY];    }
    get interval() { return this.#attrs[INTERVAL]; }

    set value   (val) { this.setAttribute(VALUE,    val); }
    set digits  (val) { this.setAttribute(DIGITS,   val); }
    set max     (val) { this.setAttribute(MAX,      val); }
    set min     (val) { this.setAttribute(MIN,      val); }
    set step    (val) { this.#setRemove  (STEP,     val); }
    set delay   (val) { this.setAttribute(DELAY,    val); }
    set interval(val) { this.setAttribute(INTERVAL, val); }

    get validate()    { return this.#validate; }                 // function:
    set validate(val) {
        if (val === undefined || (val instanceof Function))
            this.#validate = val;
        else
            throw new Error("validate must be an instance of Function or undefined.");
    }
//  #setRemove() is for non-boolean attributes that can be removed
    #setRemove(attr, val) {
        val === null || val === undefined //!!what about "" and NaN??
        ? this.removeAttribute(attr)
        : this.setAttribute(attr, val);
    }
//==============================================================================
//  Event Handlers
//  Both this and #up, #down listen for mouseover, mouseout, focus and blur.
//  this handles both mouse events with #hover, and focus/blur with #active().
//  #up, #down handle each event separately, handler is named after the event.
//
//  mouseover and mouseout ==================================
//  target is up or down <rect>: starts/stops spin, sets href
    #mouseOver(evt) {
        let args;
        const id = evt.target.id;
        if (this.#isSpinning) {         // if spinning, spin the other way
            if (this.#spinId >= 0)
                this.#clearSpin();      // clearInterval()
            args = [false, id == TOP];  // restart at full speed
        }
        this.#overOut(id, `${this.#getState(id)}`, args);
    }
    #mouseOut(evt) {
        const
        id   = evt.relatedTarget?.id,
        args = !this.#isSpinning || id == TOP || id == BOT
             ? undefined                // don't call #spin()
             : [];                      // cancel spinning
        this.#overOut("", IDLE, args);
    }
    #overOut(hoverBtn, state, args) {
        this.#hoverBtn = hoverBtn;
        this._setHref(`${getButton(this.#inFocus)}${state}`);
        if (args !== undefined)
            this.#spin(...args);
    }
//  target is this: shows/hides controls and formats #input for spinner
    #hover(evt) {
        const
        isOver  = (evt.type == mouse.over),
        inFocus = this.#inFocus;
        this.#hoverOut = isOver;
        if (!this.#hoverBtn)
            this._setHref(`${getButton(inFocus)}${IDLE}`);

        if (inFocus) {
            if (this.confirms)
                this.#showCtrls(isOver);
        }
        else if (this.spins) {
            const
            isActive = (this === document.activeElement),
            either   = isOver || isActive;

            this.#input.value = this.#getText(false, !either);
            this.#showCtrls(either);
            if (!isActive)
                this.#assignCSS(evt.type);
        }
    }
//  focus and blur ============================================================
//  target is this:
//  #active() only runs when focusing/blurring the element and relatedTarget is
//            not #input. #isMousing exits early when clicking on #input.
    #active(evt) {
        if (this.#isMousing || this.#hoverOut) return;
        //-------------------------------------------------------------------
        // If we get this far then #inFocus is false and #fur() does not run.
        // #hoverOut is excluded because hovering already sets these.
        const outFocus = (evt.type == event.focus);
        this.#outFocus = outFocus; //% this === dom.activeElement (or not)

        this.#input.value = this.#getText(false, !outFocus);
        this.#assignCSS(outFocus ? mouse.over : event.blur);
        this.#showCtrls(outFocus);
        if (outFocus)               // always idle buttons:
            this._setHref(getButton(false) + this.#getState());
    }
//  target is #input:
    #focus(evt) {
        // stopPropagation() here doesn't prevent #active()
        if (this.#isMousing) return;
        //-------------------------------------------------------------------
        this.#fur(evt, false, CONFIRM, !this.#hoverBtn, this.#getText(true));
    }
    #blur(evt) {
        if (this.#isMousing) return;
        //----------------------------------------------------------------------
        // The default behavior is to confirm the value onblur() when the user
        // presses the Tab key or clicks elsewhere on the page. To cancel input
        // onblur(), set the blur-cancel attribute. Either way, the blur event
        // handler is where we "confirm it" i.e. set the value attribute.
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
        showIt = (evt.relatedTarget === this) || this.#hoverOut,
        value  = this.#getText(false, !showIt),
        type   = showIt ? mouse.out : evt.type;
        if (this.#fur(evt, true, SPINNER, showIt, value, type)) {
            this.classList.remove(NAN);
            this.classList.remove(OOB);
        }
    }
    #fur(evt, isBlur, name, showIt, value, type = evt.type) {
        this.#input.value = value;
        this.#assignCSS(type);
        this.#showCtrls(showIt);
        this._setHref  (name + this.#getState());
        this.#swapEvents(isBlur);       // both are focusing or blurring:
        if (isBlur ? document.activeElement !== this : !this.#outFocus) {
            if (evt.target)             // else called by #mouseUp()
                evt.stopPropagation();  // don't run #active()
            this.#outFocus = !isBlur;   //% but gotta set this
        }
        return true;
    }
//  mousedown, mouseup, and click ===========================================
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
            this._setHref(getButton(this.#inFocus) + ACTIVE + id);
            if (id == TOP && this.classList.contains(NAN))
                this.classList.add(BEEP);
        }
        else {
            this.#spin(true);                 // start spinning
            preventSelection(evt, this.#outFocus);
        }                                     // but allow focus to happen first
    }
    #mouseUp(evt) {
        if (evt.currentTarget !== window) {
            this.#spin();                 // not worth checking if (#isSpinning)
            this.classList.remove(BEEP);  // ditto if (BEEP)
        }
        else {
            const                         // end a text selection drag
            range = [],
            rxp   = new RegExp(`[^\\d\-eE${this.#decimal}]`, "g"),
            input = this.#input,
            dir   = input.selectionDirection,
            start = input.selectionStart,
            end   = input.selectionEnd,
            val   = input.value,
            orig  = [{num:start,       str:val.slice(0, start)},
                     {num:end - start, str:val.slice(start, end)}];

            for (const obj of orig)
                range.push(obj.num - (obj.str.match(rxp)?.length ?? 0));

            if (this.accounting && val[0] == "(")
                ++range[0];

            this.#isMousing = false;             // let #focus() do it's thing
            this.#focus(new Event(event.focus)); // #input may already have focus

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
        else {
            this.#isMousing = false;              // must precede this.#blur()
            this.#blur(new Event(event.blur));
            this.blur();
        }
    }
//  keydown and keyup ========================================================
//  keyboard target is this, because the svg buttons don't receive focus.
    #keyDown(evt) {                 // document .activeElement === this
        if (this.#inFocus)          // this.shadowRoot.activeElement === this.#input
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
            switch (evt.code) {     // this.shadowRoot.activeElement === null
            case code.enter: case code.escape:
                this.#confirmIt = false;          // value already confirmed
                this.blur();
                return;
            case code.down:
            case code.up:
            // Keyboard repeat rate is an OS setting that has its own delay then
            // interval. Thus #spin(null), which doesn't set href or #spinId.
            // Separate href for delayed image because fast keydown/up sequences
            // flicker, and a delay can look just as flickery, depending on the
            // timing. It looks better if the initial, pre-delay image is only
            // slightly different from #spinner-idle.
                const
                topBot   = key[evt.code],
                isSpin   = this.#isSpinning,   // #spin() can change #isSpinning
                inBounds = this.#spin(null, topBot == TOP);
                if (!isSpin) {
                    this._setHref(`${SPINNER}key-${topBot}`);
                    this.#spinId = -1;         // not null so #isSpinning = true
                    this.#kbSpin = inBounds;   // kb for keyboard
                }
                else if (this.#kbSpin !== undefined) {
                    if (this.#kbSpin)          // set full-speed spin image once
                        this._setHref(`${SPINNER}${SPIN}${topBot}`);
                    this.#kbSpin = undefined;
                }
            default:
            }
    }
    //--------------------------------------------------------------------------
    #keyUp(evt) {                            // Esc key never makes it this far
        if (this.#inFocus) {
            if (evt.code == code.enter)      // any character accepted...
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
    get #inFocus() { return this.#input === this.shadowRoot.activeElement; }
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
    #spin(state, isUp = (this.#hoverBtn == TOP)) {
        if (state === undefined) {          // cancel:
            if (this.#isSpinning) {
                this.#clearSpin();
                if (isUp !== null) {        // for mouseover while spinning
                    const state = this.#hoverBtn ? `${HOVER}${this.#hoverBtn}`
                                                 : IDLE;
                    this._setHref(`${SPINNER}${state}`);
                    this.#spinId = null;
                }
            }
        }
        else {                              // spin:
            let
            val = this.#attrs[VALUE],
            oob = this.#isOoB(val, isUp);
            if (!oob) {
                val += this.#attrs[STEP] * (isUp ? 1 : -1);
                val  = this.#validate?.(val, true) ?? val; // true for isSpinning
                if (val !== false) {
                    oob = this.#isOoB(val, isUp);
                    if (oob) {
                        this.#clearSpin();  // stop spinning and clamp the value
                        val = Math.max(this.min, Math.min(this.max, val));
                    }
                    this.setAttribute(VALUE, val); // false: #input w/focus doesn't spin
                    this.#input.value = this.#getText(false);
                    const evt = new Event("change");
                    evt.isUp  = isUp;
                    evt.isSpinning = true;
                    this.dispatchEvent(evt);
                }
            }
            if (oob)
                this.#spinId = -1;          // not null, same as keyboard spin

            if (state) {                    // start spin with initial step
                const
                topBot = isUp ? TOP : BOT,
                now    = `${SPINNER}${ACTIVE}${topBot}`,
                later  = `${SPINNER}${SPIN}${topBot}`;

                this._setHref(now);
                if (!oob) {
                    this.#erId   = setTimeout(this._setHref.bind(this), this.delay, later);
                    this.#spinId = setTimeout(this.#spin.bind(this), this.delay, false, isUp);
                }
            }
            else if (state === false)       // start spinning full speed
                this.#spinId = setInterval(this.#spin.bind(this), this.interval, null, isUp);
            // else  state === null >>>> continue spinning full speed
            return !oob;
        }
    }
    #clearSpin() {
        clearInterval(this.#spinId); // interchangeable w/clearTimeout()
        clearTimeout (this.#erId);
        this.#erId = null;
    }
    #isOoB(val, isUp) { // really out of and including bounds...
        return isUp ? val >= this.max : val <= this.min;
    }
// =============================================================================
//  resize() calculates the correct width and applies it to this.#input
    resize(forceIt) {
        if (!this.autoResize && !forceIt) return;
        //--------------------------------------
        let btns, diff, extra, isAuto, o, style;
        const
        px = "px",
        PR = "padding-right",
        width   = {},
        w       = this.width,
        states  = this.#states,
        defs    = InputNum.defaults,
        isWidth = this.max < defs.max && this.min > defs.min
                ? w != NONE
                : false,            // can't auto-size infinite min or max value
        isAlign = this.autoAlign;

        style = this.#svg.style;
        if (this.spins || this.confirms) {
            if (this.autoScale) {   // auto lets this.clientHeight adjust
                style.height = AUTO;
                style.height = this.#input.clientHeight + px;
            }
            else
                for (const prop of ["height", "margin-left"])
                    style.removeProperty(prop);

            btns = this.#svg.getBoundingClientRect().width;
            if (this.autoScale)     // I don't trust marginLeft in -em units
                style.marginLeft = -btns + px;
        }
        else
            btns = 0;               // no spinning, no confirming = no buttons

        if (isWidth || isAlign) {   // get widths for #units #max #min #width
            isAuto = (w == AUTO);
            style  = getComputedStyle(this.#input);
            sizeOne(width, style, this.#units, this.units ? this.#getUnits() : "");
            if (isAuto)
                for (const elm of this.#mNm)
                    sizeOne(width, style, elm, this.#formatNumber(this[elm.id]));
            else {
                this.#width.style.width = w;
                sizeOne(width, style, this.#width);
            }
            extra = Math.max(btns,  width[UNITS]);    // the rest of the width
            diff  = Math.max(btns - width[UNITS], 0); // 0 < width[UNITS] < svg
        }

        if (isWidth) {
            let id, obj, n, sign;
            if (isAuto) {           // auto-width
                n = Math.max(width[MAX], width[MIN]);
                sign = 1;
            }
            else {                  // fixed width
                n = width.width;
                sign = -1;
            }
            obj = { [event.blur ]: n + ((extra - diff) * sign),
                    [event.focus]: n + ((extra - btns) * sign),
                    [mouse.over ]: n };
            // right-align italics can truncate, roundEven() mitigates it by 1px
            const isItalic = isAuto && style.fontStyle == "italic";
            for ([id, o] of Object.entries(obj))
                states[id].width = (isItalic ? roundEven(o) : o) + px;
        }
        else                        // no width
            for (o of Object.values(states))
                o.width = "";

        if (isAlign) {              // right-aligned
            states[event.blur] [PR] = this.#padRight + diff  + px;
            states[event.focus][PR] = this.#padRight + btns  + px;
            states[mouse.over] [PR] = this.#padRight + extra + px;
        }
        else                        // unaligned
            for (o of Object.values(states))
                o[PR] = "";

        this.#assignCSS(event.blur); // assumes #input not focused or hovering!!
    }
//==============================================================================
//  #showCtrls() shows or hides the spin or confirm buttons
    #showCtrls(b, forceIt) {
        if (!this.showButtons || forceIt)
            this.#ctrls.style.visibility = b ? "visible" : "hidden";
    }
//  #assignCSS() is necessary because overriding ::part requires !important
    #assignCSS(type) {                  // only for width and padding-right
        const style = this.#input.style;
        for (const [prop, val] of Object.entries(this.#states[type]))
            style.setProperty(prop, val, IMPORTANT);
    }
//  #getText() gets the appropriate text for the #input
    #getText(inFocus, appendUnits) {
        const n = this.#attrs[VALUE];
        return inFocus
             ? this.#formatNumber(n, this.#getDigits({useGrouping:false}))
             : this.#formatNumber(n)
             + (appendUnits && this.units ? this.#getUnits() : "");
    }
    #getDigits(obj, i = this.#attrs[DIGITS]) {
        obj.maximumFractionDigits = i;
        obj.minimumFractionDigits = i;
        return obj;
    }
//  #getUnits() gets the units text: currency && units displays currency per unit
    #getUnits() {
        return `${this.useLocale && this.#locale.currency ? "/" : ""}${this.units}`;
    }
//  #formatNumber() formats a number for display as text
    #formatNumber(n, options = this.#locale) {
        if (n !== undefined)        //!!might not be necessary anymore...
            return this.useLocale
                 ? new Intl.NumberFormat(this.locale, options).format(n)
                 : n.toFixed(this.#attrs[DIGITS]);
    }
//  #toNumber() converts String to Number
    #toNumber(str) {
        if (!str)                  // str might equal "0", but never 0
            return NaN;            // Number() converts "" and null to 0
        else if (this.anyDecimal)  // part of the locale-friendly approach
            str = str.replace(",", ".");
        else if (this.#decimal == ",") {
            if (str.includes("."))
                return NaN;
            str = str.replace(",", ".");
        }
        return Number(str);        // parseFloat() is too lenient
    }
//  #getState() gets the second-third segments of the href id
    #getState(id = this.#hoverBtn) {
        return this.#isSpinning ? `${ACTIVE}${id}`
                           : id ? `${HOVER}${id}`
                                : IDLE; // idle only has two segments
    }
}
BaseElement.define(InputNum);
//=============================================================================
// Private helpers
// autoStep() returns a step value based on digits. Using min/max to auto-step
function autoStep(digits) {
    return 1 / Math.pow(10, digits);
}
// getButton() gets the first segment of the href id
function getButton(inFocus) {
    return !inFocus ? SPINNER : CONFIRM;
}
// roundEven() is because italics can truncate slightly when right-aligned,
//             depending on the font-family and font-size. Rounding the width
//             to the nearest even number of px reduces the truncation. Why???
function roundEven(n) {
    const
    floor = Math.floor(n),
    ceil  = Math.ceil(n);
    return floor % 2 ? ceil : floor;
}
function sizeOne(width, style, elm, innerHTML) {
    if (innerHTML !== undefined) {
        let prop, type;
        elm.innerHTML = innerHTML;
        for (type of ["","-kerning","-size-adjust","-synthesis",
                            "-optical-sizing","-palette"]) {
            prop = "font" + type;
            elm.style[prop] = style[prop];
        }
    }
    width[elm.id] = elm.getBBox().width;
}