export function writeText(tar, txt) {
    navigator.clipboard.writeText(txt).then (() => {
      const sib = tar.previousElementSibling;
      setTimeout(() => sib.style.opacity = 1,  100);
      setTimeout(() => sib.style.opacity = 0, 1100);
    }).catch(alert);
}
export function toHTML(str) { // the price of non-breaking hyphens for display
    return str.replace(/-/g, "&#x2011;");
//& return str.replaceAll("-", "&#x2011;");
}
export function fromHTML(html) {
    return html.textContent.replace(/‑/g, "-");
//& return html.textContent.replaceAll("‑", "-");
}
