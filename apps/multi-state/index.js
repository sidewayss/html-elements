import {writeText, toHTML, fromHTML} from "../common.js";
import {BaseElement} from "/html-elements/base-element.js"
const
BOX = "box",
TRI = "tri",
SIX = "six",

elms = {},
keyCodes = new Set(["ArrowUp","ArrowDown"]);
//==============================================================================
document.addEventListener("DOMContentLoaded", load);
function load() {
  let elm;
  const
  body  = document.body,
  tags  = ["check-box","check-tri","state-btn","input","select"],
  byTag = tags.map(tag => [...body.getElementsByTagName(tag)]),
  all   = [...byTag.slice(0, 3).map(arr => arr.map(v => BaseElement.promises.get(v))).flat(),
           ...tags .slice(0, 3).map(v => customElements.whenDefined(v))];

//~for (elm of byTag.flat()) {
  for (elm of [].concat(...byTag)) {
    elm.addEventListener("change", change);
    elms[elm.id] = elm;
  }
  for (elm of body.getElementsByTagName("span"))
    if (elm.id)               // some <span>s have no id
      elms[elm.id] = elm;     // none of them listen for events

  elms.keyCodes = {};         // 3 x <select>:
  for (elm of byTag[byTag.length - 1]) //@ https://github.com/sidewayss/html-elements/issues/10
    elms.keyCodes[splitDash(elm.id)[0]] = elm;

  elms.html = {};             // 3 x <div>:
  for (elm of body.getElementsByClassName("html"))
    elms.html[splitDash(elm.id)[0]] = elm;
                              // 3 x <button>:
  for (elm of body.getElementsByTagName("button"))
    elm.addEventListener("click", copyToClipboard);

  elms[SIX].addEventListener("keyup",   arrowUpDown);
  window.addEventListener("keydown", keyDown);

  Promise.all(all)
    .then(() => {             // 3 x custom element definitions
      for (const id of [BOX, TRI]) {
        elm = elms[id];
        change({target:elm});
        elms[`${id}-label`].value = elm.label; // test it the other way around
      }
      change({target:elms[SIX]});
    });
}
// Attached to elms[SIX] only
function arrowUpDown(evt) {
  if (evt.code == "ArrowUp")
    evt.target.increment();
  else if (evt.code == "ArrowDown")
    evt.target.decrement();
  else
    return;
  //----------
  change(evt);
}
// window.onkeydown()
function keyDown(evt) {
  if (document.activeElement === elms[SIX] && keyCodes.has(evt.code))
    evt.preventDefault();
}
//==============================================================================
// Event handler (there's only one) and helpers:
function change(evt) {
  const tar = evt.target;
  if (tar.id == "on-off" || tar.id == "btn" || tar.id.startsWith("toggle") || tar.id.startsWith("stainless"))
    return;
  //----------------------------------
  let valText;
  const
  [tag, prop] = splitDash(tar.id),
  isSix = (tag == SIX),
  val   = isSix ? tar.index : tar.value,
  elm   = elms[tag];

  if (!prop) {  // tar === elm aka #box, #tri, or #btn
    if (isSix) {
      if (!elm.autoIncrement && evt.type) { // not called by Promise.all() above
        let i;
        do {
          i = Math.floor(Math.random() * elms[SIX].states.length);
        } while (i == val);
        elm.index = i;
      }
      valText = elm.value.toString().padStart(3);
      elms[`${tag}-index`].textContent = elm.index.toString().padStart(3);
    }
    else {
      valText = elm.value ?? "null";
      elms[`${tag}-checked`].textContent = elm.checked;
    }

    elms[`${tag}-value`].textContent = valText;
  }
  else if (prop == "keyCodes") {
    let arr;
    switch (tag) {
      case BOX: arr = [val];          break;
      case TRI: arr = [val, "Space"]; break;
    }
    elm[prop] = arr;
  }
  else {
    elm[prop] = val;
    if (prop == "default" && elm.value === null)
      elms[`${tag}-checked`].textContent = tar.checked;
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
    txt = textLabel(elm) + " ";
    if (elm.default)
      txt += " default";
    if (elm.showDefault)
      txt += " show-default";
    if (keys.value)
      txt += textKeyCodes(elm);
    if (elm.value !== null)
      txt += ` value="${elm.value ? "1" : ""}"`;
    break;
  case SIX:
    return;
//!!    tag = "state-btn";
//!!    txt = ` states='${JSON.stringify(elm.states)}'`;
//!!    if (elm.autoIncrement)
//!!      txt += " auto-increment";
//!!
//!!    const sel = keys.selectedOptions;
//!!    if (sel.length != 1 || sel[0].value != "Enter")
//!!      txt += sel.length ? textKeyCodes(elm) : ' key-codes=""';
  }
  elms.html[id].innerHTML = toHTML(`&lt;${tag}${txt}&gt;&lt;/${tag}&gt;`);
}
function textKeyCodes(elm) {
  return ` key-codes=${JSON.stringify(elm.keyCodes)}`;
}
function textLabel(elm) {
  return ` label="${elm.label}"`;
}
//==============================================================================
function copyToClipboard(evt) {
  const tar = evt.target;
  writeText(tar, fromHTML(elms.html[splitDash(tar.id)[0]]));
}
// splitDash() is a convenience that splits hyphenated attribute names or ids
function splitDash(name) { return name.split("-"); }