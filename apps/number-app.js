let attrs, defaults, html, inNum, script, spinners, userLocale;
const
g    = {},
elms = {},
spinner = [];
document.addEventListener("DOMContentLoaded", load);
//===============
function load() {
  let elm, f, i, n;
  const promises = [];
  inNum      = document.getElementById("number");
  userLocale = navigator.language;

  // Deal with async processes
  i = 0;    // forEach maintains the value of key in fetch.then()
  ["locale","currency","font","units"].forEach(key => {
    elms[key] = document.getElementById(key);
    addChangeEvent(elms[key]);
    promises.push(fetch(key + ".json")
                  .then (rsp => loadJSON(rsp, key))
                  .catch(err => alert(err)));
  });
  ["in-number","check-box"].forEach(  // custom element tags
    key => promises.push(customElements.whenDefined(key))
  );
  Promise.all(promises).then(() => {
    const
    sty = getComputedStyle(html);
    elm = inNum.nextElementSibling;   // the containing <div>
    n   = Math.ceil(elm.getBoundingClientRect().width) + 1;
    i   = (parseFloat(sty.borderWidth) + parseFloat(sty.paddingLeft)) * 2;

    elm   .style.width = n + "px";
    script.style.width = n - i + "px";

    defaults = Object.assign({}, inNum.constructor.defaults);
    delete defaults.value             // value is not an option
    for (const key in defaults)       // some keys have "data-" prefix
      elms[key.split("-").at(-1)].value = defaults[key];
    updateText();                     // must be last
  });

  // Initialize elements and related variables
  for (f of ["monospace","sans-serif","serif"])
    elms.font.add(new Option(f));

  const decimals = [];
  for (n = .1, i = 1; n >= 0.000001; n /= 10, i++)
    decimals.push(newOption(n, i));

  ["digits","delay","interval","step","max","accounting","spins","confirms"]
  .forEach(id => initElm(id, decimals));

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

  html   = document.getElementById("html");
  script = document.getElementById("script");
  attrs  = Array.from(document.getElementsByClassName("attr"));
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
      spinner.push(elm);
      for (opt of decimals)
        elm.add(opt);
      break;
    case "delay":
      spinner.push(elm);
      for (i = 0; i <= 1500; i += 100)
        elm.add(newOption(i, 0, i, "ms"));
      break;
    case "interval":
      spinner.push(elm); // same width and right-aligned
      elm.style.width = getComputedStyle(elms.delay).width;
      break;
    case "max":
      elm.add(new Option(Infinity));
      for (n = 1000000; n >= 1; n /= 10)
        elm.add(new Option(n));
      for (opt of decimals)
        elm.add(opt);

      elm.add(new Option(0));
      for (n = -0.000001, i = 6; n >= -0.1; n *= 10, i--)
        elm.add(new Option(n.toFixed(i)));
      for (n = -1; n >= -1000000; n *= 10)
        elm.add(new Option(n));
    default:
  }
  return elm;
}
//============================
function addChangeEvent(elm) {
  elm.addEventListener("change", change);
}
//=================================
function newOption(n, digits = 0, value, units = "") {
  const
  localeOptions = { maximumFractionDigits:digits,
                    minimumFractionDigits:digits },
  text = n.toLocaleString(userLocale, localeOptions);
  return new Option(text + units, value);
}
//===========================
function loadJSON(rsp, key) {
  if (rsp.ok) {
    rsp.json().then(json => {
      let val;
      if (key == "font")
        for (val of json[getVendor()])
          elms.font.add(new Option(val));
      else {
        const elm = elms[key];
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
//====================
function getVendor() { // from https://dev.to/vaibhavkhulbe/get-os-details-from-the-webpage-in-javascript-b07
  const
  userAgent = window.navigator.userAgent,
  platform  = window.navigator.platform,
  winPlatforms = ["Win32",     "Win64",    "Windows", "WinCE"],
  macPlatforms = ["Macintosh", "MacIntel", "MacPPC",  "Mac68K"],
  iosPlatforms = ["iPhone",    "iPad",     "iPod"];

  if      (winPlatforms.includes(platform))
    return "Microsoft";
  else if ([...macPlatforms, ...iosPlatforms].includes(platform))
    return "Apple";
  else if (/Android/.test(userAgent))
    return "Google";
  else if (/Linux/.test(platform))
    return "Linux";
}
//====================
function change(evt) {
  const
  tar = evt.target,
  id  = tar.id,
  val = tar.value;
  if (tar === elms.font)
    inNum.style.fontFamily = val;
  else {
    inNum[id] = val;    // set the <in-number> property
    updateText();       // display the updated HTML
    switch (id) {
      case "spins":     // disable step, delay, interval
        spinner.forEach(elm => disable(elm, !val));
        break;
      case "max":       // validate
      case "min":
        tar.nextElementSibling.innerHTML =
          Number(elms.max.value) <= Number(elms.min.value)
          ? "Max and Min overlap!"
          : "";
        break;
      case "locale":    // disable
        disable(elms.currency, !val);
      case "currency":
        disable(elms.accounting, !val || !elms.currency.value
                                      ||  elms.currency.disabled);
      case "units":     // display info
        tar.nextElementSibling.innerHTML = val ? g[id][val] : "";
      default:
    }
  }
}
function updateText() {
  const options = new Set(attrs);
  let attr, data, elm, prop,
  pre = "&lt;in-number data-auto-size",
  suf = "&lt;/in-number&gt",
  js  = "num = /* &lt;in-number&gt; */;<br>";

  if (!elms.confirms.checked) {
    suf = " data-no-confirm" + suf;
    js += "num.confirms = false;<br>";
  }
  if (!elms.spins.checked) {
    suf = " data-no-spin" + suf;
    js += "num.spins = false;<br>";
    for (elm of [elms.step, elms.delay, elms.interval])
      options.delete(elm);
  }
  if (elms.locale.value) {
    options.add(elms.locale);
    if (elms.currency.value) {
      options.add(elms.currency);
      if (elms.accounting.checked)
        options.add(elms.accounting);
    }
  }
  for (elm of options) {
    prop = elm.id;
    attr = prop;
    data = "data-" + attr;
    if (elm.value && elm.value != (defaults[prop] ?? defaults[data])) {
      pre += " ";
      switch (prop) {
        case "digits": case "units": case "currency":
        case "delay":  case "interval":
          attr = data;
        case "max":  case "min":
        case "step":
          pre += `${attr}="${elm.value}"`;
          js  += `num.${prop} = "${elm.value}";<br>`;
          break;
        case "locale":
          pre += data;
          if (elm.selectedOptions[0].text != "user") {
            pre += `="${elm.value}"`;
            js  += `num.${prop} = "${elm.value}";<br>`
          }
          else
            js  += `num.${prop} = "";<br>`  // vs null
          break;
        case "accounting":
          pre += data;
          js  += `num.${prop} = true;<br>`
          break;
      }
    }
  }
  html  .innerHTML = `${pre}&gt;${suf}`.replaceAll("-", "&#x2011;");
  script.innerHTML = js;
}
function getText(elm, isAttr, val) {

}
function disable(elm, b) {
  elm.disabled = b;
  if (elm.labels?.[0])
    elm.labels[0].classList.toggle("disabled", b);
}