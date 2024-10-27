import {BaseElement, nullish} from "../../base-element.js";

import {writeText, toHTML, fromHTML} from "../common.js";

let attrs, defaults, html, inNum, script;
const
base = 10,
expo = 6,
high = Math.pow(base, expo),
low  = Math.pow(base, -(expo + 1)),
g       = {},
elms    = {},
spinner = [];
//==============================================================================
document.addEventListener("DOMContentLoaded", load);
function load() {
  let btn, f, i, n;
  const
  json   = [],
  custom = [];
  inNum  = document.getElementById("number"); // the <input-num>

  // Async processes // forEach maintains the value of key in fetch.then():
  ["units","locale","currency","fontFamily"].forEach(key => {
    elms[key] = document.getElementById(key);
    addChangeEvent(elms[key]);
    f = `${key}.json`;
    json.push(fetch(f).then (rsp => loadJSON(rsp, key))
                      .catch(err => console.error(`${err.msg}: ${f}`)));
  });
  ["input-num","check-box"].forEach(  // custom element tags
    key => custom.push(customElements.whenDefined(key))
  );
  Promise.all(custom).then(() =>      // necessary to support noAwait because of
    Promise.all([...json, ...BaseElement.promises.values()])
           .then(allResolved)         // allResolved()=>getBoundingClientRect().
  );

  // Initialize elements and related variables
  const fonts = ["monospace","sans-serif","serif",
                 getComputedStyle(inNum).fontFamily
                                        .split(",")[0]
                                        .replace(/["']/g, "")]; //& replaceAll()
  for (f of fonts)
    elms.fontFamily.add(new Option(f));

  elms.fontFamily.selectedIndex = 3;  // the current font, hosted by me

  const decimals = [];                // range 0.1 to low, descending
  for (n = .1, i = 1; n >= low; n /= base, i++)
    decimals.push(newOption(n, i));
                                      // init these remaining elements by id:
  ["autoWidth","autoAlign","autoScale","max","digits","accounting",
   "spins","confirms","keyboards","step","delay","interval",
   "fontSize","fontWeight","fontStyle"].forEach(id => initElm(id, decimals));

  const                               // #min is a modified clone of #max
  min = "min",
  par = elms.max.parentNode,
  div = par.cloneNode(true),
  lbl = div.firstElementChild,
  sel = lbl.nextElementSibling;

  sel.id = min;
  sel.remove(0);
  sel.add(new Option(-Infinity));
  lbl.htmlFor   = min;
  lbl.innerHTML = min[0].toUpperCase() + min.slice(1)
                + lbl.innerHTML.slice(min.length);

  par.parentNode.insertBefore(div, par.nextElementSibling);
  addChangeEvent(sel);
  elms.min = sel;

  for (btn of document.getElementsByTagName("button"))
    btn.addEventListener("click", copyToClipboard);

  html   = document.getElementById("html");
  script = document.getElementById("script");
  attrs  = Array.from(document.getElementsByClassName("attr"));
}
//==============================================================================
// load() helpers:
function addChangeEvent(elm) {
  elm.addEventListener("change", change);
}
//====================================================
function newOption(n, digits = 0, value, units = "") {
  const
  localeOptions = { maximumFractionDigits:digits,
                    minimumFractionDigits:digits },
  text = n.toLocaleString(navigator.language, localeOptions);
  return new Option(text + units, value);
}
//======================
function allResolved() {
  const px = "px";
  let arr, key,
  elm = inNum.nextElementSibling, // the containing <div>
  w   = Math.ceil(elm.getBoundingClientRect().width) + 1 + px;

  // Freezes the <div> width so that text overflows to the right while the <div>
  // stays centered on the page. If there's a CSS solution, please let me know...
  elm.style.width = w;

  // These three look better json the same size
  w = Math.max(parseFloat(getComputedStyle(elms.step) .width),
               parseFloat(getComputedStyle(elms.delay).width)) + px;
  for (elm of [elms.step, elms.delay, elms.interval])
    elm.style.width = w;

  defaults = Object.assign({}, inNum.constructor.defaults);
  elms.step.nextElementSibling.textContent = `= ${defaults.step}`;
  delete defaults.step            // default auto-step precludes this
  delete defaults.value           // value is not an option
  for (key in defaults) {         // some keys have "data-" prefix
//@ elms[key.split("-").at(-1)].value =  defaults[key];
    arr = key.split("-");         //@ https://github.com/sidewayss/html-elements/issues/10
    elms[nullish(arr[1], arr[0])].value = defaults[key]; //?? https://github.com/sidewayss/html-elements/issues/10
  }
  updateText();                   // must be last
}
//===========================
function loadJSON(rsp, key) {
  if (rsp.ok) {
    rsp.json().then(json => {
      let val;
      const elm = elms[key];
      if (key == "fontFamily")
        for (val of json[getFontKey()])
          elm.add(new Option(val));
      else {
        elm.add(new Option("none", ""));
        if (key == "locale")
          elm.add(new Option("user", navigator.language));
        for (val in json)
          elm.add(new Option(val));
        g[key] = json;
      }
    });
  }
}
//=====================
function getFontKey() {     // fonts are by pseudo-platform
//?.const src = (navigator.userAgentData?.platform ?? navigator.userAgent);
  const src = navigator.userAgentData ? navigator.userAgentData.platform : navigator.userAgent; //?. https://github.com/sidewayss/html-elements/issues/10

  for (const key of ["Android","Apple","Linux","Windows"])
    if (src.includes(key))  // Linux must follow Android because they overlap
      return key;           // in userAgent, Apple only has userAgent.
}
//==============================
function initElm(id, decimals) {
  let i, n, opt;
  const elm = document.getElementById(id);

  elms[id]  = elm;
  addChangeEvent(elm);
  switch (id) {
    case "digits":
      for (i = 0; i < 7; i++)
        elm.add(new Option(i));
      break;
    case "step":
      for (opt of decimals)           // first use of decimals, loop order is
        elm.add(opt);                 // significant or you must clone here too.
    case "interval": case "autoScale":
      spinner.push(elm);
      break;
    case "delay":
      for (i = 0; i <= 1500; i += 100)
        elm.add(newOption(i, 0, i, "ms"));
      spinner.push(elm);
      break;
    case "max":
      elm.add(new Option(Infinity));  // positive integers high to 1
      for (n = high; n >= 1; n /= base)
        elm.add(new Option(n));
      for (opt of decimals)           // positive decimals: 1 < n > 0
        elm.add(opt.cloneNode(true)); // gotta clone after first use

      elm.add(new Option(0));         // zero, then negative decimals
      for (n = -low, i = expo; n >= -0.1; n *= base, i--)
        elm.add(new Option(n.toFixed(i)));
      for (n = -1; n >= -high; n *= base)
        elm.add(new Option(n));       // then negative integers
    default:
  }
  return elm;
}
//==============================================================================
// Event handler (there's only one) and helpers:
function change(evt) {
  let
  tar = evt.target,
  id  = tar.id,
  val = tar.value;

  if (id.startsWith("font")) {  // 2 selects and 2 check-boxes
    inNum.style[id] =
      val === false ? "normal"
    : val === true  ? (tar === elms.fontWeight ? "bold" : "italic")
                    : val;
    inNum.resize();             // font styles are not attributes, no auto-resize
  }
  else {
    inNum[id] = isUser(tar) ? "" : val || null;
    updateText();               // display the updated HTML/JS
    switch (tar) {
      case elms.min:
        minDigits();
      case elms.max:            // validate
      setInfo(elms.max, inNum.max <= inNum.min, "Max/Min overlap!");
      disable(elms.autoWidth, inNum.max ==  Infinity
                           || inNum.min == -Infinity);
        break;
      case elms.locale:
        disable(elms.currency,   !val);
      case elms.currency:
        disable(elms.accounting, !val || !inNum.currency
                                      || !inNum.useLocale);
      case elms.units:          // display info
        setInfo(tar, val, g[id][val]);
        setInfo(elms.digits,
                inNum.units && inNum.currency && !inNum.useLocale,
                "Units & Currency don't mix");
        break;
      case elms.spins:          // disable step, delay, interval
        spinner.forEach(elm => disable(elm, !val));
      case elms.keyboards:
        setInfo(elms.accounting,
                !elms.spins.checked && !elms.keyboards.checked,
                "!spins & !keys = disabled");
        break;
      case elms.digits:
        minDigits();
        tar = elms.step;        // fall-through fakery
        val = tar.value;
      case elms.step:
        setInfo(tar, !val, `= ${inNum.step}`);
      default:
    }
  }
}
function setInfo(elm, b, text) { // sets info/warning text to the right of elm
  elm.nextElementSibling.innerHTML = b ? text : "";
}
function disable(elm, b) {       // disables an element and its label
  elm.disabled = b;
  for (const lbl of [elm.previousElementSibling, elm.nextElementSibling]) {
    if (lbl)
      lbl.classList.toggle("disabled", b); //?. https://github.com/sidewayss/html-elements/issues/10
  }
}
function minDigits() {           // one alert set in two places
  setInfo(elms.min,
          inNum.min && Math.abs(inNum.min) < 1 / Math.pow(base, inNum.digits),
          "Min < Digits!");
}
//==============================================================================
// updateText() is generally helpful, along with its helper getText():
function updateText() {
  let attr, data, elm, prop,
  pre = "&lt;input-num",
  suf = "&gt;&lt;/input-num&gt;",
  js  = "numby = doc.getElementById(id);<br>";

  const
  ctrls = new Set(attrs), // max, min, units
  opposites = [
    ["data-no-keys",   "keyboards"],
    ["data-no-spin",   "spins"],
    ["data-no-confirm","confirms"],
    ["data-no-scale",  "autoScale"],
    ["data-no-width",  "autoWidth"],
    ["data-no-align",  "autoAlign"],
  ];
  for ([attr, prop] of opposites) {
    if (!inNum[prop]) {
      suf = ` ${attr}` + suf;
      js += getText(null, prop, true, false);
    }
  }
  if (inNum.useLocale) {
    ctrls.add(elms.locale);
    if (inNum.currency) {
      ctrls.add(elms.currency);
      if (inNum.accounting)
        ctrls.add(elms.accounting);
    }
  }
  if (inNum.spins)
    for (elm of [elms.step, elms.delay, elms.interval])
      ctrls.add(elm);

  for (elm of ctrls) {
    prop = elm.id;
    attr = prop;
    data = "data-" + attr;
    if (elm.value && elm.value != nullish(defaults[prop], defaults[data])) { //?? https://github.com/sidewayss/html-elements/issues/10
      pre += " ";
      switch (elm) {
        case elms.digits: case elms.units: case elms.currency:
        case elms.delay:  case elms.interval:
          attr = data;
        case elms.max:  case elms.min:
        case elms.step:
          pre += getText(elm, attr);
          js  += getText(elm, prop, true);
          break;
        case elms.locale:
          if (isUser(elm)) {
            pre += data;
            js  += getText(null, prop, true,  '""');
          }
          else {
            pre += getText(elm, data);
            js  += getText(elm, prop, true);
          }
          break;
        case elms.accounting:
          pre += data;
          js  += getText(null, prop, true, true);
          break;
      }
    }
  }
  html  .innerHTML = toHTML(`${pre}${suf}`);
  script.innerHTML = js;
}
//======================================
function getText(elm, prop, isJS, val) {
  let equals, prefix, suffix;
  const value = (val != undefined)
              ? val
              : isJS && !Number.isNaN(parseFloat(elm.value))
                ? elm.value
                : `"${elm.value}"`;
  if (isJS) {
    prefix = "numby.";
    equals = " = ";
    suffix = ";<br>";
  }
  else {
    prefix = "";
    equals = "=";
    suffix = "";
  }
  return prefix + prop + equals + value + suffix;
}
//====================
function isUser(elm) { // for <select id="locale">
  return elm.selectedOptions ? elm.selectedOptions[0].text == "user" : undefined;//?. https://github.com/sidewayss/html-elements/issues/10
}
//==============================================================================
// HTML displays using non-breaking hyphen U+2011, which is not a valid HTML
// character, so it must be replaced with a regular hyphen.
// script.textContent doesn't preserve the newlines, so those must be replaced.
function copyToClipboard(evt) {
  const
  tar = evt.target,
  txt = tar.id.endsWith("HTML")
      ? fromHTML(html.textContent)
      : script.textContent.replace(/;/g, ";\n");

  writeText(tar, txt);
}