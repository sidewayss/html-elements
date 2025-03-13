export {DISABLED, VALUE, BaseElement, preventSelection};
const
DISABLED  = "disabled", // DOM attributes
TAB_INDEX = "tabindex",
VALUE     = "value",    // exported: defined here but not handled here
TEMPLATE  = "template",
LABEL     = "label",
SLASH     = "/",

bySubclass = new Map;

let
fallbackDir,
templateDir = document.head.dataset.templateDir;
if (templateDir) {
    if (!templateDir.endsWith(SLASH))
        templateDir += SLASH;
}
fallbackDir = new URL(import.meta.url).pathname;
fallbackDir = `${fallbackDir.slice(0, fallbackDir.lastIndexOf(SLASH))}/templates/`;
// =============================================================================
// The custom base class, direct sub-class of HTMLElement
class BaseElement extends HTMLElement {
    #connected; #disabled; #disabling; #label; #ptrEvents; #sub; #tabIndex;
    #internals; // as yet unused...

    static observedAttributes = [DISABLED, TAB_INDEX, LABEL];
    static formAssociated = true;
    static promises = new Map;

    constructor(meta, subclass) {
        let path;
        const url = new URL(meta.url);
        super();
        BaseElement.promises.set(this, promise());
        if (bySubclass.has(subclass))
            this.#sub = bySubclass.get(subclass);
        else {
            const obj = {},
            fallback  = classToTag(subclass) + ".html";
            if (url.search) {
                const sp = url.searchParams;
                path = sp.get("path");
                if (path)
                    obj.path = path;
                else {
                    path = sp.get("directory");
                    if (path) {
                        if (!path.endsWith(SLASH))
                            path += SLASH;
                        obj.path = path + fallback;
                    }
                    else if (templateDir)
                        obj.path = templateDir + (sp.get("file") ?? fallback);
                }
            }
            obj.fallback = fallbackDir + fallback;
            if (!obj.path)
                obj.path = obj.fallback;    // #fallBack() will fail to fetch same file twice!!

            bySubclass.set(subclass, obj);
            this.#sub = obj;                // #sub.path .fallback .templates
        }
        this.setAttribute(TAB_INDEX, "0");  // default value, emulates <input>
    }
    #attach(template) {
        this.attachShadow({mode:"open"});
        this.shadowRoot.appendChild(template);
        this.#internals = this.attachInternals();

        this._use = this.shadowRoot.getElementById("use");
        if (this._use)
            this._use.style.pointerEvents = "none";           // avoids problems

        this.#label = this.shadowRoot.getElementById(LABEL);  // optional <pre>
        this.label  = this.label;       // attributeChangedCallback did nothing
    }
//  connectedCallback() exists for DISABLED and TEMPLATE. It calls this._init(),
//  which resides in the bottom-level class. Classes with intermediate super-
//  classes might call super._init().
    connectedCallback() {
        this.#getTemplate().then(tmp => {
            this.#attach(tmp);
            this._init();
            BaseElement.promises.get(this).resolve();
        });
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
            if (val === null)           // enabled: null == removeAttribute()
                this.tabIndex = this.#tabIndex;
            else {
                this.tabIndex   = -1;   // disabled: indirectly recursive
                this.#ptrEvents = this.style.pointerEvents;
            }
            const pe = getPointerEvents(val, this.#ptrEvents);
            this.style.pointerEvents = pe;
            if (this.labels.length)
                for (const lbl of this.labels)
                    lbl.style.pointerEvents = pe;
            return;
        case TAB_INDEX:
            if (this.#disabling)        // easier done here, not case DISABLED
                this.#disabling = false;
            else                        // to restore post-disable
                this.#tabIndex  = val;
            return;
        case LABEL:
            if (this.#label)
                this.#label.innerHTML = (val === null) ? "" : val;
        default:
        }
    }
// getters/setters reflect the HTML attributes, see attributeChangedCallback()
    get disabled()    { return this.hasAttribute(DISABLED); }
    set disabled(val) { this.toggleAttribute(DISABLED, Boolean(val)); }

    get labels() { return [...document.querySelectorAll(`[for="${this.id}"]`)]; }

    get label()    { return this.getAttribute(LABEL); }
    set label(val) {
        if (!val)       // consolidate empty label values to null
            this.removeAttribute(LABEL);
        else
            this.setAttribute(LABEL, val);
    }
    get labelElement() {return this.#label; }

    get template() { return this.getAttribute(TEMPLATE) ?? ""; } // read-only

//  define() wraps customElements.define for consistency of class and tag names
    static define(cls, name = classToTag(cls)) {
        if (!customElements.get(name))      // modules get loaded multiple times
            customElements.define(name, cls);
    }
//  is() creates an isClassName property on the instance
    is() {
        Object.defineProperty(this, "is" + this.constructor.name, {value:true});
    }
//  _setHref() changes the image for this._use or another element
    _setHref(id, elm = this._use) {
        if (elm)    // better here than everywhere else
            elm.setAttribute("href", "#" + id);
    }
// getTemplate() gets the template as a new document fragment.
    #getTemplate() {
        if (this.#sub.templates)
            return this.#cloneTemplate(this.#sub.templates);
        else
            return this.#fetchIt(this.#sub.path, true);
    }
    #fallBack() {
        return this.#fetchIt(this.#sub.fallback, false);
    }
    #fetchIt(path, fallBack) {
        return fetch(path)
            .then (rsp => rsp.ok && rsp.status != 202
                        ? this.#parseIt(rsp)
                        : fallBack ? this.#fallBack()
                                   : httpError(rsp, path))
            .catch(err => fallBack ? this.fallBack()
                                   : catchError(err));
    }
    #parseIt(rsp) {
        return rsp.text()
            .then(txt => {
                const obj = {},
                templates = new DOMParser().parseFromString(txt, "text/html")
                                           .getElementsByTagName("template");
                for (const temp of templates)
                    obj[temp.id ?? ""] = temp.content;

                this.#sub.templates = obj;
                return this.#cloneTemplate(obj);
            })
            .catch(err => catchError(err));
    }
    #cloneTemplate(obj) {
        const template = obj[this.template];
        if (template)
            return new Promise(resolve => resolve(template.cloneNode(true)));
        else
            throw new Error(`Template id "${this.template}" does not exist.`);
    }
}
// =============================================================================
function catchError(err) {
    console.error(err.stack ?? err);
}
function httpError(rsp, path) {
    console.error(`HTTP error fetching ${path}: ${rsp.status} ${rsp.statusText}`);
}
//==============================================================================
function getPointerEvents(attrVal, val = "") {
    return (attrVal === null) ? val : "none";
}
// classToTag() converts a class to a tag name
function classToTag(cls) {
    const name = cls.name;
    return name[0].toLowerCase()
         + name.slice(1).replace(/[A-Z]/g, cap => "-" + cap.toLowerCase());
}
// promise() returns a new Promise, extended with resolve & reject
function promise() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject  = rej;
    });
    return Object.assign(promise, {resolve, reject});
}
//  preventSelection() prevents Chrome from selecting the text in the next element
//                     on mousedown when clicking repeatedly.
function preventSelection() { https://issues.chromium.org/issues/388066440
    document.getSelection().empty();
}