export {VALUE, getTemplate, MultiState};
const VALUE     = "value";    // built-in attributes
const DISABLED  = "disabled";
const TAB_INDEX = "tab-index";
const KEY_CODES = "data-key-codes";
// =============================================================================
async function getTemplate(name) {
    const id  = `template-${name}`;
    const url = `${id}.html`;       // local template file
                                    // where did suppress-errors come from??
    const response = await fetch(url, {headers:{"suppress-errors":""}})
     .then(rsp => rsp.ok && rsp.status != 202
                ? rsp
                : fallBack(url))    // fall back to the default template file,
     .catch(() => fallBack(url));   // regardless of the reason for failure.

    return await response.text()
     .then(txt => new DOMParser().parseFromString(txt, "text/html")
                                 .getElementById(id).content)
     .catch(err => catchError(err));
}
function fallBack(url) {
    url = `/html-elements/${url}`;  // default template file
    return fetch(url)
     .then (rsp => rsp.ok ? rsp : fetchError(url, rsp))
     .catch(err => catchError(err));
}
function catchError(err) {
    console.error(err.stack ?? err);
}
function fetchError(url, rsp) {
    console.error(`HTTP error fetching ${url}: ${rsp.status} ${rsp.statusText}`);
}
// =============================================================================
// The multi-state base class, direct sub-class of HTMLElement
class MultiState extends HTMLElement {
    #tabIndex;
    static observedAttributes = [DISABLED, TAB_INDEX, KEY_CODES];
    constructor(template) { // <template> as DocumentFragment
        super();            // emulates change (not input) event
        this._fragment = template.cloneNode(true);
        this._keyCodes = new Set;

        this._dom = this.attachShadow({mode:"open"});
        this._dom.appendChild(this._fragment);

        this.addEventListener("keyup", this.change, false);
        this.addEventListener("click", this.change, false);
        if (this.tabIndex < 0)
            this.tabIndex = 0;
        this.#tabIndex = this.tabIndex;
    }
//  attributeChangedCallback() handles changes to the observed attributes
    attributeChangedCallback(name, _, val) {
        const b = (val !== null); // null == removeAttribute()
        switch (name) {
        case DISABLED:
            if (b) {
                this.tabIndex = -1;
                this.style.pointerEvents = "none";
            }
            else {
                this.tabIndex = this.#tabIndex;
                this.style.pointerEvents = "";
            }
            break;
        case TAB_INDEX:
            this.#tabIndex = val; // to restore post-disable
            break;
        case KEY_CODES:
            if (b)
                this._keyCodes = new Set(JSON.parse(val)) //??validation??
            else
                this._keyCodes.clear();
        default:
        }
    }
// getters/setters reflect the HTML attributes, see attributeChangedCallback()
    get disabled()    { return this.hasAttribute(DISABLED); }
    set disabled(val) { this._setBool(DISABLED, val); }

    get keyCodes()    { return Array.from(this._keyCodes); }
    set keyCodes(val) {
        this.setAttribute(KEY_CODES, JSON.stringify(Array.from(val)));  //??validation??
    }

//  _setHref() changes the image for this._use or another element
    _setHref(href, elm = this._use) {
        elm.setAttribute("href", href);
    }
//  _setBool() helps disabled, checked, and other boolean attributes
    _setBool(attr, b) {
        b ? this.setAttribute(attr, "")
          : this.removeAttribute(attr);
    }
//  _handleEvent() determines whether or not to handle an event
    _handleEvent(evt) {
        return evt.type == "click" || this._keyCodes.has(evt.code);
    }
}