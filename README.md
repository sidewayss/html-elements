# `html-elements` contains four custom HTML elements
- `<check-box>` emulates `<input type="checkbox">` plus additional features
- `<check-tri>` is a three-state checkbox, integrating [`indeterminate`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/indeterminate) as a third state
- `<state-btn>` is a multi-state button with user-defined states and toggle order
- `<input-num>` is a numeric input that emulates a spreadsheet

## `<check-box>`

## `<check-tri>`

## `<state-btn>`

## `<input-num>`
If you want to jump right in, the test/demo app is [here](https://sidewayss.github.io/html-elements/apps/input-num).

Based on an informal survey and my own repeated frustrations, it became clear to me that not only is `<input type="number"/>` ["the worst" HTML input](https://www.google.com/search?q=the+worst+html+input), but that I could not continue to use it. I spent a lot of time programming for accountants and financial analysts, so I spent a lot of time in Excel. Regardless of the brand, spreadsheets have a model for inputting numbers that is tried and true. So I decided to create a custom element that imitated the spreadsheet model as appropriate, while maintaining consistency with the default `<input type="number"/>` as implemented by the browsers.

Of course I ended up implementing every plausible feature I could discover. In the end it makes styling and formatting more extensive, yet simpler than "the worst". It looks and acts the same across browsers. I am more familiar with SVG than other image formats, so the spin and confirm buttons in the built-in template are in SVG. You can create your own template file that uses JPEG or whatever image format you prefer.

## Features
`<input type="number">` emulation:
- The `max` and `min` attributes prevent input outside their range.
- Spinner buttons appear on hover (but not while inputting via keyboard).
- The `step` attribute controls the amount of each single click on a spinner.
- Validation of contents. Unlike Chrome, it doesn't prevent the entry of any characters. It's more like Firefox/Safari. It allows you to enter anything, but you can apply an "invalid" style if the contents are not a number.

Spreadsheet emulation:
- It stores an underlying Number separate from the formatted display, which is a String that includes non-numeric characters. Inputting via keyboard/pad reveals the underlying, unformatted value.
- Keyboard input requires user confirmation via the `Enter` key or an `OK` button. The user can cancel the input via the `Esc` key, a `Cancel` button, or by setting the focus elsewhere. Cancelling reverts to the previous value.
- Spreadsheets have their own number formatting lingo. JavaScript provides [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat), which is wrapped up in [locales](https://en.wikipedia.org/wiki/Locale_(computer_software)).<br>`<input-num>` has `data-digits`, `data-locale`, `data-currency`,`data-accounting`, and `data-units` attributes for formatting. I have not implemented any rounding options (yet).

Additional features:
- Optional (default is on) auto-width based on max, min, digits, units, locale, currency, accounting, and font settings.
- Optional (default is on) auto-scaling of the spinner and confirm buttons.
- Optional (default is on) right-alignment of formatted numbers. If you want to view a group of numbers in a vertical list, right-alignment is essential. Financials require it. Keyboard input is always left-aligned, like a spreadsheet.
- Units suffixes, but WYSIWYG. I do not use `Intl.NumberFormat` units because I don't see a way to use exponents. If someone can explain that to me and convince me that they need it, I'll add it.
- `data-delay` and `data-interval` properties to control the timing of spinning.

## Attributes & Properties
HTML Attributes / JavaScript Properties, property names excludes the "data-" prefix:
- `max` is the enforced maximum value, defaults to `Infinity`.
- `min` is the enforced minimum value, defaults to `-Infinity`.
- `step` is the the amount to increment or decrement when spinning, defaults to the smallest number defined by the `data-digits` attribute, e.g. when `digits` is 3, `step` defaults to 0.001.
- `value` is the value as a Number.
- `data-digits` is the number of decimal places to display, as in `number.toFixed(digits)`.
- `data-units` are the string units to append to the formatted text.
- `data-locale` is the locale string to use for formatting. If set to "" it uses the users locale: [`navigator.language`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/language). If set to null (removed), formatting is not based on locale. It uses the []`locales`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#locales) option, but only sets one locale.
- `data-currency` is only relevant when `data-locale` is set. When set, it results in [`style`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#style) = "currency" and [currency](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#currency_2) = the attribute value. NOTE: [`currencyDisplay`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#currencydisplay) is always set to "narrowSymbol".
- `data-accounting` is a boolean that toggles [`currencySign`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#currencysign) = "accounting", which encloses negative numbers in parentheses. Only relevent when `data-currency` and `data-locale` are set.
- `data-notation` sets [`notation`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#notation) to the attribute value. Defaults to "standard". *Untested*.
- `data-delay` is the number of milliseconds between `mousedown` and the start of spinning.
- `data-interval` is the number of milliseconds between steps when spinning.

These boolean attributes/properties are inverted, the default = attribute not set (null), property = true:
- `data-no-spin` / `spins` controls the diplay of the spinner on hover (when not inputting via keyboard).
- `data-no-confirm` / `confirms` controls the diplay of the confirm/cancel buttons on hover while inputting via keyboard.
- `data-no-scale` / `autoScale` scales (or not) the buttons to match font size.
- `data-no-width` / `autoWidth` auto-determines the width (or not).
- `data-no-align` / `autoAlign` auto-aligns left/right and auto-adjusts `padding-right` for right-alignment.

JavaScript only:
- `text` (read-only) is the formatted text value, including currency, units, etc.
- `useLocale` (read-only) returns `true` if `data-locale` is set.
- `resize()` forces the element to resize. Call it after you change font properties, for example.

##The Template
There are two pairs of buttons:
the up/down spinners
the ok/cancel confirmers

The template-number.html file contains 17 SVG definitions for the buttons:
spinner:
spinner-idle
spinner-hover-up
spinner-hover-down
confirm-hover-up
confirm-hover-down
cancel-hover-up
cancel-hover-down
spinner-active-up
spinner-active-down
confirm-active-up
confirm-active-down
cancel-active-up
cancel-active-down
spinner-active-upper
spinner-active-downer
confirm-idle
cancel-idle