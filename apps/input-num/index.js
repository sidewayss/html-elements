import {BaseElement} from "../../base-element.js";

import {writeText, toHTML, fromHTML} from "../common.js";

let defaults, inNum;
const
base = 10,
expo = 6,
high = Math.pow(base, expo),
low  = Math.pow(base,-expo),
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

  const                               // <select> decimals are by user locale
  locale   = navigator.language,
  options  = {},
  decimals = [];                      // range 0.1 to low, descending
  for (n = .1, i = 1; n >= low; n /= base, i++) {
    options.maximumFractionDigits = i;
    options.minimumFractionDigits = i;
    decimals.push(new Option(n.toLocaleString(locale, options), n));
    }

  [                                   // init the remaining elements by id
    "autoResize","autoScale","autoAlign","width","max","min","digits",
    "accounting","spins","confirms","keyboards","step","delay","interval",
    "showButtons","anyDecimal","trimRight","blurCancel","fontSize","fontWeight",
    "fontStyle"
  ].forEach(id => initElm(id, decimals));

  const fonts = ["monospace","sans-serif","serif",
                 getComputedStyle(inNum).fontFamily
                                        .split(",")[0]
                                        .replace(/["']/g, "")]; //& replaceAll()
  for (f of fonts)
    elms.fontFamily.add(new Option(f));
  elms.fontFamily.selectedIndex = 3;  // the current font, hosted by me

  inNum.style.fontSize = elms.fontSize.value;

  const clone = elms.max.cloneNode(true);
  clone.id = "min";                   // #min is a modified clone of #max
  clone.remove(0);                    // swap Infinity for -Infinity
  clone.add(new Option(-Infinity));
  elms.min.replaceWith(clone);
  addChangeEvent(clone);
  elms.min = clone;

  for (btn of document.getElementsByTagName("button"))
    btn.addEventListener("click", copyToClipboard);

  elms.html   = document.getElementById("html");
  elms.script = document.getElementById("script");
  elms.attrs  = Array.from(document.getElementsByClassName("attr"));
}
//==============================================================================
// load() helpers:
function addChangeEvent(elm) {
  elm.addEventListener("change", change);
}
//======================
function allResolved() {
  let elm, key;
  const
  px = "px",
  w  = getComputedStyle(elms.step).width;
  //for (elm of [elms.delay, elms.interval])
  //  elm.style.width = w;  // these three look better all the same size

  // Freeze #controls.width so it's centered in the window while class="info"
  // overflows to the right. If there's a CSS solution, please let me know...
  elm = document.getElementById("controls");
  elm.style.width = elm.clientWidth
                  - getNumber(elm, "paddingLeft")
                  - getNumber(elm, "paddingRight") + px;

  defaults = Object.assign({}, inNum.constructor.defaults);
  elms.step.nextElementSibling.textContent = `= ${defaults.step}`;
  delete defaults.step    // undefined = auto-step precludes this
  delete defaults.value   // there is no elms.value
  for (key in defaults)
    elms[key].value = defaults[key];

  updateText();           // must be last
}
function getNumber(elm, prop) {
  return parseFloat(getComputedStyle(elm)[prop]);
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
  const src = (navigator.userAgentData?.platform ?? navigator.userAgent);

  for (const key of ["Android","Apple","Linux","Windows"])
    if (src.includes(key))  // Linux must follow Android because they overlap
      return key;           // in userAgent, Apple only has userAgent.
}
//==============================
function initElm(id, decimals) {
  let i, n, opt;
  const elm  = document.getElementById(id);

  elms[id] = elm;
  addChangeEvent(elm);                // throwaway for elms.min...
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
        elm.add(new Option(i + "ms", i));
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
                    : val;      // the <select>
    inNum.resize();             // font styles are not attributes, no auto-resize
  }
  else {
    inNum[id] = val || null;
    updateText();               // display the updated HTML/JS
    switch (tar) {
      case elms.min:
        minDigits();
      case elms.max:            // inNum clamps overlapping values
        if (Number(elms.max.value) < Number(elms.min.value))
            tar.value = inNum[id];
        break;
      //---------------
      case elms.locale:
        disableLabel(elms.currency, !val);
        if (isUser())
          inNum[id] = "";
      case elms.currency:
        elms.accounting.disabled = !val || !inNum.currency
                                        || !inNum.useLocale;
      case elms.units:          // display info
        setInfo(tar, val, g[id][val]);
        break;
      //--------------
      case elms.spins:          // disable step, delay, interval
        spinner.forEach(elm => disableLabel(elm, !val));
      case elms.confirms:
        elms.showButtons.disabled = !elms.spins.checked && !elms.confirms.checked;
      case elms.keyboards:
        setInfo(elms.accounting,
                !elms.spins.checked && !elms.keyboards.checked,
                "!spins & !keys = disabled");
        break;
      //---------------
      case elms.digits:
        minDigits();
        tar = elms.step;        // fall-through spoofing
        val = tar.value;
      case elms.step:
        setInfo(tar, !val, `= ${inNum.step}`);
        break;
      default:
    }
  }
}
function setInfo(elm, b, text) { // sets info/warning text to the right of elm
  elm.nextElementSibling.innerHTML = b ? text : "";
}
function minDigits() {           // one alert set in two places
  setInfo(elms.min,
          inNum.min && Math.abs(inNum.min) < 1 / Math.pow(base, inNum.digits),
          "Min < Digits!");
}
function disableLabel(elm, b) {
  elm.disabled = b;
  elm.labels[0]?.classList.toggle("disabled", b);
}
function isNoWidth() {
  return inNum.max == Infinity || inNum.min == -Infinity;
}
//==============================================================================
// updateText() is generally helpful, along with its helper getText():
function updateText() {
  let attr, elm, prop,
  pre = "&lt;input-num",
  suf = "&gt;&lt;/input-num&gt;",
  js  = "numby = doc.getElementById(id);<br>";

  const
  ctrls = new Set(elms.attrs), // max, min, digits units
  opposites = [
    ["no-keys",   "keyboards"],
    ["no-spin",   "spins"],
    ["no-confirm","confirms"],
    ["no-scale",  "autoScale"],
    ["no-align",  "autoAlign"],
    ["no-resize", "autoResize"]
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

  for (elm of [elms.showButtons, elms.anyDecimal, elms.trimRight, elms.blurCancel])
    if (elm.checked && !elm.disabled)   // showButtons can be disabled
      ctrls.add(elm);

  for (elm of ctrls) {
    prop = elm.id;
    if (elm.value && elm.value != defaults[prop]) {
      pre += " ";
      switch (elm) {
        case elms.digits: case elms.units: case elms.currency:
        case elms.step:   case elms.delay: case elms.interval:
        case elms.max:    case elms.min:
          pre += getText(elm, prop);
          js  += getText(elm, prop, true);
          break;
        case elms.locale:
          if (isUser()) {
            pre += prop;
            js  += getText(null, prop, true,  '""');
          }
          else {
            pre += getText(elm, prop);
            js  += getText(elm, prop, true);
          }
          break;
        case elms.showButtons: case elms.anyDecimal: case elms.accounting:
        case elms.trimRight:   case elms.blurCancel:
          pre += prop.replace(/[A-Z]/g, ch => "-" + ch.toLowerCase());
          js  += getText(null, prop, true, true);
          break;
      }
    }
  }
  elms.html  .innerHTML = toHTML(`${pre}${suf}`);
  elms.script.innerHTML = js;
}
//======================================
function getText(elm, prop, isJS, val) {
  let equals, prefix, suffix;
  const value = (val !== undefined)
              ? val
              : isJS && !Number.isNaN(parseFloat(elm.value))
                ? elm.value
                : `"${elm.value}"`;
  if (isJS) {
    prop   = kebabToCamel(prop);
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
  return elms.locale.selectedOptions[0].text == "user";
}
// kebabToCamel() converts a kebab-case string to camelCase
function kebabToCamel(str) {
  return str.replace(/-(.)/g, chars => chars[1].toUpperCase());
}
//==============================================================================
// HTML displays using non-breaking hyphen U+2011, which is not a valid HTML
// character, so it must be replaced with a regular hyphen.
// script.textContent doesn't preserve the newlines, so those must be replaced.
function copyToClipboard(evt) {
  const
  tar = evt.target,
  txt = tar.id.endsWith("HTML")
      ? fromHTML(elms.html)
      : elms.script.textContent.replace(/;/g, ";\n");

  writeText(tar, txt);
}