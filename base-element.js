export {DISABLED, VALUE, BaseElement};
const
DISABLED  = "disabled", // DOM attributes
TAB_INDEX = "tabindex",
VALUE     = "value";    // exported: defined here but not handled here
// =============================================================================
// The custom base class, direct sub-class of HTMLElement
class BaseElement extends HTMLElement {
    #connected; #disabled; #disabling; #id; #internals; #meta; #ptrEvents; #tabIndex;
    static searchParams;    // set by html-elements.js, if it's used
    static observedAttributes = [DISABLED, TAB_INDEX];
    static formAssociated     = true;
    static promises = new Map; // for noAwait, see https://github.com/sidewayss/html-elements/issues/8
    constructor(meta, template, noAwait) {
        super();
        if (noAwait) {                      // passes subclass as template arg
            this.#meta = meta;
            this.#id   = classToTag(template);
            BaseElement.promises.set(this, promise());
        }
        else
            this.#attach(template);         // <template> as DocumentFragment

        this.setAttribute(TAB_INDEX, "0");  // default value, emulates <input>
        this.#internals = this.attachInternals(); // for accessibility, labels
    }
    #attach(template) {
        this._dom = this.attachShadow({mode:"open"});
        this._dom.appendChild(template.cloneNode(true));
    }
//  connectedCallback() exists for DISABLED and noAwait. It calls this._init(),
//  which resides in the bottom-level class. Classes with intermediate super-
//  classes might call this._initSuper(). If (!noAwait) it must call a pseudo-
//  connectedCallback() called _connected(), because a real one prevents this
//  one from running.
    connectedCallback() {
        if (this.#meta) {
            getTemplate(this.#meta, this.#id).then(tmp => {
                this.#attach(tmp);
                this._init();
                BaseElement.promises.get(this).resolve();
            });
        }
        else
            this._connected?.();

        // Creating the disabled attribute from scratch is complicated
        this.#disabled  = this.getAttribute(DISABLED);
        this.#connected = true;
    }
//  attributeChangedCallback() handles changes to the observed attributes
    attributeChangedCallback(name, _, val) {
        switch (name) {
        case DISABLED:
            if (this.#connected) {
                if (val === this.#disabled)
                    return;
                else //-------------------
                    this.#disabled  = val;
            }
            this.#disabling = true;
            if (val !== null) {         // null == removeAttribute()
                this.tabIndex   = -1;   // indirectly recursive
                this.#ptrEvents = this.style.pointerEvents;
                this.style.pointerEvents = "none";
            }
            else {
                this.tabIndex = this.#tabIndex;
                this.style.pointerEvents = this.#ptrEvents;
            }
            return;
        case TAB_INDEX:
            if (this.#disabling)        // easier done here, not case DISABLED
                this.#disabling = false;
            else                        // to restore post-disable
                this.#tabIndex  = val;
        default:
        }
    }
// getters/setters reflect the HTML attributes, see attributeChangedCallback()
    get disabled()    { return this.hasAttribute(DISABLED); }
    set disabled(val) { this.toggleAttribute(DISABLED, val); }

// define wraps customElements.define for consistency of class and tag names
    static define(cls) {
        customElements.define(classToTag(cls), cls);
    }
//  _setBool() helps disabled, checked, and other boolean attributes
    _setBool(attr, b) {
        b ? this.setAttribute(attr, "")
          : this.removeAttribute(attr);
    }
//  _setHref() changes the image for this._use or another element
    _setHref(href, elm = this._use) {
        elm.setAttribute("href", href);
    }
}
// =============================================================================
// getTemplate() gets the template as a new document fragment.
function getTemplate(meta, id) {
    let back, path, template;
    const
    SLASH = "/",
    EXT   = ".html",
    url   = new URL(meta.url),
    sp    = url.search ? url.searchParams : BaseElement.searchParams;
    path  = url.pathname;
    back  = `${path.slice(0, path.lastIndexOf(SLASH))}/templates/${id}${EXT}`;

    if (sp) {
        path = sp.get("template");
        if (path)                           // full path, overrides id
            template = path;
        else {
            path = sp.get("templateDir");
            if (path) {
                if (!path.endsWith(SLASH))  // leniency
                    path += SLASH;
                template = path + id + EXT;
            }
        }
    }
    return !template
         ? fallBack(back)
         : fetch(template)
           .then(rsp => rsp.ok && rsp.status != 202
                      ? parseIt(rsp, id)
                      : fallBack(back))  // fall back to the built-in template
           .catch(() => fallBack(back)); // regardless of the reason for failure
}
function fallBack(url) {
    return fetch(url)
      .then (rsp => rsp.ok ? parseIt(rsp) //!!should this check for status=202 too??
                           : console.error(`HTTP error fetching ${url}: ${
                                            rsp.status} ${rsp.statusText}`))
      .catch(err => catchError(err));
}
function parseIt(rsp, id) {
    return rsp.text().then(txt => {
        let content;
        const dom = new DOMParser().parseFromString(txt, "text/html");

        if (id) // called by getTemplate(), not fallBack()
            content = dom.getElementById(id)?.content;

        return content ?? dom.getElementsByTagName("template")[0].content;
    })
    .catch(err => catchError(err));
}
function catchError(err) {
    console.error(err.stack ?? err);
}
//==============================================================================
// classToTag() converts a class to a tag name
function classToTag(cls) {
    const name = cls.name;
    return name[0].toLowerCase()
         + name.slice(1).replace(/[A-Z]/g, cap => "-" + cap.toLowerCase());
}
// promise() returns a new Promise, extended with resolve & reject,
//           borrowed from raf/ez.js to support noAwait.
function promise() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject  = rej;
    });
    return Object.assign(promise, {resolve, reject});
}