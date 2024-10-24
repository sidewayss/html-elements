const
BOX = "box",
TRI = "tri",
BTN = "btn",
elms = {};
//==============================================================================
document.addEventListener("DOMContentLoaded", load);
function load() {
  let elm;
  const
  body  = document.body,
  tags  = ["check-box","check-tri","state-btn","input","select","span"],
  byTag = tags.map(tag => [...body.getElementsByTagName(tag)]);

  for (elm of byTag.flat())
    if (elm.id)               // some <span>s have no id
      elms[elm.id] = elm;

  byTag.splice(-1, 1);        // remove <span>s
  for (elm of byTag.flat())
    elm.addEventListener("change", change);

  elms.keyCodes = {};
  for (elm of byTag.at(-1))   // 3 x <select>
    elms.keyCodes[elm.id.split("-")[0]] = elm;

  elms.html = {};
  for (elm of body.getElementsByClassName("html"))
    elms.html[elm.id.split("-")[0]] = elm;

  for (elm of body.getElementsByTagName("button")) // 3 x <button>
    elm.addEventListener("click", copyToClipboard);

  Promise.all(tags.slice(0, 3).map(v => customElements.whenDefined(v)))
  .then(() => {
    for (const id of [BOX, TRI, BTN]) {
      elm = elms[id];
      change({target:elm});
      if (id != BTN)
        elms[`${id}-label`].value = elm.label;  // test it the other way around
    }
  });
}
//==============================================================================
// Event handler (there's only one) and helpers:
function change(evt) {
  const
  tar = evt.target,
  val = tar.value,
  [tag, prop] = tar.id.split("-"),
  elm = elms[tag];

  if (!prop) {  // tar === elm aka #box, #tri, or #btn
    if (tag == BTN) {
      if (!elm.autoIncrement && evt.type) { // not called by Promise.all() above
        let i;
        do {
          i = Math.floor(Math.random() * elms[BTN].states.length);
        } while (i == val);
        elm.value = i;
      } // must follow setting of elm.value:
      elms.href.textContent = elm.states[elm.index][1];
    }
    else
      elms[`${tag}-checked`].textContent = elm.checked;

    // must follow setting of elm.value:
    elms[`${tag}-value`].textContent = elm.value ?? "null";
  }
  else if (prop == "keyCodes") {
    let arr;
    switch (tag) {
      case BOX: arr = [val];          break;
      case TRI: arr = ["Space", val]; break;
      case BTN: arr = Array.from(tar.selectedOptions).map(v => v.value);
    }
    elm[prop] = JSON.stringify(arr);
  }
  else {
    elm[prop] = val;
    if (prop == "default" && elm.value === null)
      elms[`${tag}-value`].textContent = tar.checked;
  }
  updateText(elm, tag);
}
//==============================================================================
// updateText() is generally helpful
function updateText(elm, id) {
  let tag, txt;
  const keys = elms.keyCodes[id];
  switch (id) {
  case BOX:
    tag = "check-box";
    txt = textLabel(elm);
    if (keys.value != "Space")
      txt += textKeyCodes(elm);
    if (elm.checked)
      txt += " checked";
    break;
  case TRI:
    tag = "check-tri";
    txt = textLabel(elm);
    if (elm.default)
      txt += " default";
    if (elm.showDefault)
      txt += " data-show-default";
    if (keys.value)
      txt += textKeyCodes(elm);
    if (elm.value !== null)
      txt += ` value="${elm.value ? "1" : ""}"`;
    break;
  case BTN:
    tag = "state-btn";
    txt = ` data-states='${JSON.stringify(elm.states)}'`;
    if (elm.autoIncrement)
      txt += " data-auto-increment";

    const sel = keys.selectedOptions;
    if (sel.length != 1 || sel[0].value != "Enter")
      txt += sel.length ? textKeyCodes(elm) : ' data-key-codes=""';
  }
  elms.html[id].innerHTML = `&lt;${tag}${txt}&gt;&lt;/${tag}&gt;`
                            .replaceAll("-", "&#x2011;");
}
function textKeyCodes(elm) {
  return ` data-key-codes=${JSON.stringify(elm.keyCodes)}`;
}
function textLabel(elm) {
  return ` data-label="${elm.label}"`;
}
//==============================================================================
// HTML displays using non-breaking hyphen U+2011, which is not a valid HTML
// character, so it must be replaced with a regular hyphen.
function copyToClipboard(evt) {
  const tar = evt.target;
  navigator.clipboard.writeText(elms.html[tar.id.split("-")[0]].textContent
                                                 .replaceAll("‑", "-"))
  .then (() => {
    const sib = tar.previousElementSibling;
    setTimeout(() => sib.style.opacity = 1,  100);
    setTimeout(() => sib.style.opacity = 0, 1100);
  })
  .catch(alert);
}