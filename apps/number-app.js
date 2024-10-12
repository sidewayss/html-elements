let attrs, defaults, html, inNum, inStyle, script, spinners, userLocale;
const
g       = {},
elms    = {},
spinner = [];
//==============================================================================
document.addEventListener("DOMContentLoaded", load);
function load() {
  let btn, f, i, n;
  const promises = [];
  inNum      = document.getElementById("number"); // the <in-number>
  inStyle    = inNum.style;     // in-number::part(input)
  userLocale = navigator.language;

  // Async processes // forEach maintains the value of key in fetch.then():
  ["units","locale","currency","fontFamily"].forEach(key => {
    elms[key] = document.getElementById(key);
    addChangeEvent(elms[key]);
    promises.push(fetch(key + ".json").then (rsp => loadJSON(rsp, key))
                                      .catch(alert));
  });
  ["in-number","check-box"].forEach(  // custom element tags
    key => promises.push(customElements.whenDefined(key))
  );
  Promise.all(promises).then(allResolved);

  // Initialize elements and related variables
  const fonts = ["monospace","sans-serif","serif",
                 inStyle.fontFamily.replaceAll(/["']/g, "")];
  for (f of fonts)
    elms.fontFamily.add(new Option(f));

  elms.fontFamily.selectedIndex = 3;  // the current font, hosted by me

  const decimals = [];
  for (n = .1, i = 1; n >= 0.000001; n /= 10, i++)
    decimals.push(newOption(n, i));

  ["autoWidth","autoAlign","autoScale","max","digits","spins","confirms",
   "accounting","step","delay","interval","fontSize","fontWeight","fontStyle"
  ].forEach(id => initElm(id, decimals));

  const         // #min is a modified clone of #max
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
  text = n.toLocaleString(userLocale, localeOptions);
  return new Option(text + units, value);
}
//======================
function allResolved() {
  const px = "px";
  let key,
  elm = inNum.nextElementSibling, // the containing <div>
  w   = Math.ceil(elm.getBoundingClientRect().width) + 1 + px;

  // Freezes the <div> width so that text overflows to the right while the <div>
  // stays centered on the page. If there's a CSS solution, please let me know...
  elm.style.width = w;

  // These three look better all the same size
  w = Math.max(parseFloat(getComputedStyle(elms.step) .width),
               parseFloat(getComputedStyle(elms.delay).width)) + px;
  for (elm of [elms.step, elms.delay, elms.interval])
    elm.style.width = w;

  defaults = Object.assign({}, inNum.constructor.defaults);
  elms.step.nextElementSibling.textContent = `= ${defaults.step}`;
  delete defaults.step            // default auto-step precludes this
  delete defaults.value           // value is not an option
  for (key in defaults)           // some keys have "data-" prefix
    elms[key.split("-").at(-1)].value = defaults[key];

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
          elm.add(new Option("user", userLocale));
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
      elm.add(new Option(Infinity));
      for (n = 1000000; n >= 1; n /= 10)
        elm.add(new Option(n));
      for (opt of decimals)
        elm.add(opt.cloneNode(true)); // gotta clone after first use
      elm.add(new Option(0));
      for (n = -0.000001, i = 6; n >= -0.1; n *= 10, i--)
        elm.add(new Option(n.toFixed(i)));
      for (n = -1; n >= -1000000; n *= 10)
        elm.add(new Option(n));
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
    inStyle[id] = val === false ? "normal"
                : val === true  ? (tar === elms.fontWeight ? "bold" : "italic")
                                : val;
    inNum.resize();             // font styles are not attributes, no auto-resize
  }
  else {
    inNum[id] = isUser(tar) ? "" : val || null;
    updateText();               // display the updated HTML/JS
    switch (tar) {
      case elms.max:            // validate
      case elms.min:
        disable(elms.autoWidth, inNum.max == Infinity
                            || inNum.min == -Infinity);
        elms.max.nextElementSibling.innerHTML =
          inNum.max <= inNum.min ? "Max/Min overlap!" : "";
        break;
      case elms.locale:
        disable(elms.currency,   !val);
      case elms.currency:
        disable(elms.accounting, !val || !inNum.currency
                                      || !inNum.useLocale);
      case elms.units:          // display info
        tar.nextElementSibling.innerHTML = val ? g[id][val] : "";
        elms.digits.nextElementSibling.innerHTML =
          inNum.units && inNum.currency && !inNum.useLocale
            ? "Units & Currency don't mix"
            : "";
        break;
      case elms.spins:          // disable step, delay, interval
        spinner.forEach(elm => disable(elm, !val));
        break;
      case elms.digits:
        tar = elms.step;
        val = tar.value;
      case elms.step:
        tar.nextElementSibling.textContent = val ? "" : `= ${inNum.step}`;
        break;
      default:
    }
  }
}
//========================
function disable(elm, b) {
  elm.disabled = b;
  for (const lbl of [elm.previousElementSibling, elm.nextElementSibling])
    lbl?.classList.toggle("disabled", b);
}
//==============================================================================
// updateText() is generally helpful, along with its helper getText():
function updateText() {
  const ctrls = new Set(attrs);
  let attr, data, elm, prop,
  pre = "&lt;in-number",
  suf = "&gt;&lt;/in-number&gt",
  js  = "numby = doc.getElementById(id);<br>";

  if (!inNum.confirms) {
    suf = " data-no-confirm" + suf;
    js += getText(null, "confirms", true, false);
  }
  if (!inNum.spins) {
    suf = " data-no-spin" + suf;
    js += getText(null, "spins", true, false);
    for (elm of [elms.step, elms.delay, elms.interval])
      ctrls.delete(elm);
  }
  if (inNum.useLocale) {
    ctrls.add(elms.locale);
    if (inNum.currency) {
      ctrls.add(elms.currency);
      if (inNum.accounting)
        ctrls.add(elms.accounting);
    }
  }
  for (elm of ctrls) {
    prop = elm.id;
    attr = prop;
    data = "data-" + attr;
    if (elm.value && elm.value != (defaults[prop] ?? defaults[data])) {
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
  html  .innerHTML = `${pre}${suf}`.replaceAll("-", "&#x2011;");
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
  return elm.selectedOptions?.[0].text == "user";
}
//==============================================================================
// HTML displays using non-breaking hyphen U+2011, which is not a valid HTML
// character, so it must be replaced with a regular hyphen.
// script.textContent doesn't preserve the newlines, so those must be replaced.
function copyToClipboard(evt) {
  const
  tar = evt.target,
  txt = tar.id.endsWith("HTML")
      ? html  .textContent.replaceAll("‑", "-")
      : script.textContent.replaceAll(";", ";\n");

  navigator.clipboard.writeText(txt)
  .then (() => {
    const sib = tar.previousElementSibling;
    setTimeout(() => sib.style.opacity = 1,  100);
    setTimeout(() => sib.style.opacity = 0, 1100);
  })
  .catch(alert);
}