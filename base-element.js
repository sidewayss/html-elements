export {VALUE, BaseElement, getTemplate};
const
DISABLED  = "disabled", // DOM attributes
TAB_INDEX = "tab-index",
VALUE     = "value";    // const exported, but not handled here
// =============================================================================
// The custom base class, direct sub-class of HTMLElement
class BaseElement extends HTMLElement {
    #tabIndex;
    static observedAttributes = [DISABLED, TAB_INDEX];
    constructor(template) { // <template> as DocumentFragment
        super();            // emulates change (not input) event
        this._fragment = template.cloneNode(true);

        this._dom = this.attachShadow({mode:"open"});
        this._dom.appendChild(this._fragment);

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
async function getTemplate(name) {
    const
    id  = `template-${name}`,
    url = `${id}.html`;       // local template file

//!!I don't have custom templates and this generates an unsuppressable 404: !!\\
//!!                                // suppress-errors doesn't supress 404
//!!const response = await fetch(url, {headers:{"suppress-errors":""}})
//!! .then(rsp => rsp.ok && rsp.status != 202
//!!            ? rsp
//!!            : fallBack(url))    // fall back to the default template file,
//!! .catch(() => fallBack(url));   // regardless of the reason for failure.

    const response = await fallBack(url);
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