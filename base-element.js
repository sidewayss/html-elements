export {VALUE, BaseElement, getTemplate, splitDash};
const
DISABLED  = "disabled", // DOM attributes
TAB_INDEX = "tabindex",
VALUE     = "value";    // const exported, but not handled here

// =============================================================================
// The custom base class, direct sub-class of HTMLElement
class BaseElement extends HTMLElement {
    #name; #tabIndex;
    static observedAttributes = [DISABLED, TAB_INDEX];
    static promises = new Map;      // for noAwait

    constructor(template, noAwait) {
        super();
        if (noAwait) {
            this.#name = template;  // the template name as String
            BaseElement.promises.set(this, promise());
        }
        else
            this.#attach(template); // the <template> as DocumentFragment

        if (this.tabIndex < 0)
            this.tabIndex = 0;
        this.#tabIndex = this.tabIndex;
    }
    #attach(template) {
        this._dom = this.attachShadow({mode:"open"});
        this._dom.appendChild(template.cloneNode(true));
    }
//  connectedCallback() exists for noAwait. It calls this._init(), which resides
//  in the bottom-level class. Classes with intermediate superclasses might call
//  this._initSuper(). If (!noAwait) it must call a pseudo-connectedCallback()
//  because a real one prevents this one from running.
    connectedCallback() {
        if (this.#name) {
            getTemplate(this.#name).then(tmp => {
                this.#attach(tmp);
                this._init();
                BaseElement.promises.get(this).resolve();
            });
        }
        else
            this._connected?.();
    }
//  attributeChangedCallback() handles changes to the observed attributes
    attributeChangedCallback(name, _, val) {
        switch (name) {
        case DISABLED:
            if (val !== null) {     // null == removeAttribute()
                this.tabIndex = -1;
                this.style.pointerEvents = "none";
            }
            else {
                this.tabIndex = this.#tabIndex;
                this.style.pointerEvents = "";
            }
            break;
        case TAB_INDEX:
            this.#tabIndex = val;   // to restore post-disable
        default:
        }
    }
// getters/setters reflect the HTML attributes, see attributeChangedCallback()
    get disabled()    { return this.hasAttribute(DISABLED); }
    set disabled(val) { this._setBool(DISABLED, val); }

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
// getTemplate() gets the template as a new document fragment. Users store their
//               templates in the /html-templates directory. If no template file
//               is found there, fall back to built-in file.
//               {headers:{"suppress-errors":""}} doesn't supress 404. To avoid
//               404 errors, put your templates in /html-templates. If you are
//               using the built-in templates, copy the files there.
async function getTemplate(name) {
    const
    id   = `template-${name}`,
    file = `${id}.html`,

    response = await fetch(`/html-templates/${file}`)
     .then(rsp => rsp.ok && rsp.status != 202
                ? rsp
                : fallBack(file))   // fall back to the built-in template
     .catch(() => fallBack(file));  // regardless of the reason for failure

    return await response.text()
     .then(txt => new DOMParser().parseFromString(txt, "text/html")
                                 .getElementById(id).content)
     .catch(err => catchError(err));
}
function fallBack(file) {
    const url = `/html-elements/${file}`; // built-in template file
    return fetch(url)
     .then (rsp => rsp.ok
                 ? rsp
                 : console.error(`HTTP error fetching ${url}: ${rsp.status} ${rsp.statusText}`))
     .catch(err => catchError(err));
}
function catchError(err) {
    console.error(err.stack ?? err);
}
//==============================================================================
// splitDash() is a convenience that splits hyphenated attribute names or ids
function splitDash(name) { return name.split("-"); }
//==============================================================================
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