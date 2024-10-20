# `html-elements` contains four custom HTML elements
- [`check-box`](#check-box) emulates `<input type="checkbox">` plus additional features.
- [`check-tri`](#check-tri) is a tri-state checkbox, adding a form of [`indeterminate`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/indeterminate) as the third state.
- [`state-btn`](#state-btn) is a multi-state button with user-defined states and shapes.
- [`input-num`](#input-num) is a numeric input that emulates a spreadsheet.

## Usage
There are three JavaScript files for the four elements. `check-box` and `check-tri` fit into one file. Here is some sample HTML that includes all four elements in a page:
```html
<head>
    <script src="/html-elements/multi-check.js"  type="module"></script>
    <script src="/html-elements/multi-button.js" type="module"></script>
    <script src="/html-elements/input-num.js"    type="module"></script>
</head>
```
NOTE: `html-elements` uses `await` at the top level of modules. The browser support grid is [here](https://caniuse.com/mdn-javascript_operators_await_top_level). The workaround is funky enough that I'm not inclined to make any changes. Current global support is 92.93%, and while support for `await` without this feature goes back another 4 or 5 years, it only increases the global support to 94.66%.

`html-elements` also uses [private properties](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties), which also have [~93% support](https://caniuse.com/?search=private%20class), but can be transpiled out without too much trouble.  If you want to use `html-elements` but require either of these workarounds, please submit an issue or a pull request.

### Managing Template Files
There are built-in template files in the root directory:
- **template-check.html** for `check-box` and `check-tri`
- **template-button.html** for `state-btn`
- **template-number.html** for `input-num`

Instead of modifying those, you should create an `/html-templates` directory as a sibling of your `/html-elements` directory. Store your template files there. That keeps the source and user files separate and preserves the source files as fallbacks.

When the page is loading, if the element doesn't find its template file in `/html-templates`, the DOM generates an unsupressable HTML 404 "file not found" error. Then it falls back to the built-in template file. I would suggest copying the built-in files to your templates directory as a starting point. Then edit them to create your own designs within the template structure.

NOTE: The CSS files in the `css` sub-directory are samples. They are not used directly by the elements, as the template files are.

## `check-box`

## `check-tri`

## `state-btn`

## `input-num`
If you want to jump right in, the test/demo app is [here](https://sidewayss.github.io/html-elements/apps/input-num).

Based on an informal survey and my own repeated frustrations, it became clear to me that `<input type="number"/>` isn't just ["the worst"](https://www.google.com/search?q=the+worst+html+input) HTML input, it's a complete waste of time. I needed an alternative. I spent over a decade programming for finance executives and financial analysts, so I spent a lot of time in Excel. Regardless of the brand, spreadsheets have a model for inputting numbers that is tried and true. I decided to create a custom element that imitates a spreadsheet, while maintaining consistency with the default `<input type="number"/>` as implemented by the major browsers.

### Features
`<input type="number"/>` emulation:
- The `max` and `min` attributes prevent input outside their range.
- Spinner buttons appear on hover (but not while inputting via keyboard).
- The `step` attribute defines the spin increment.
- Focus: you can activate the element via mouse, touch, or keyboard (`Tab` key). Clicking on the spinners activates the outer element and keeps the spinners visible until it loses focus. See "For keyboard users" below for some differences.
- Validation: Unlike Chrome, it doesn't prevent the entry of any characters. It's more like Firefox/Safari. It allows you to enter anything from a keyboard, but it won't let you commit a non-number. You must cancel or otherwise blur the element. The `keyup` event adds the `"NaN"` class if the contents are not a number. Styling `.NaN` is up to you.<br>
A non-number is defined as:<br>
&emsp;`!Number.isNaN(val ? Number(val) : NaN)`<br>
Where `val` is the attribute value: a string or `null`. It allows any number, but it's strict about the conversion, excluding `""`, `null`, and numbers with text prefixes or suffixes that `parseFloat()` converts.

Spreadsheet emulation:
- It stores an underlying `Number` separate from the formatted display, which is a `String` that includes non-numeric characters. Inputting via keyboard/pad reveals the underlying, unformatted value.
- Keyboard input requires user confirmation via the `Enter` key or an `OK` button. The user can cancel the input via the `Esc` key, a `Cancel` button, or by setting the focus elsewhere. Cancelling reverts to the previous value.
- Spreadsheets have their own number formatting lingo. JavaScript provides [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat), which is wrapped up in [locales](https://en.wikipedia.org/wiki/Locale_(computer_software)).<br>`<input-num>` has `data-digits`, `data-locale`, `data-currency`,`data-accounting`, and `data-units` attributes for formatting. I have not implemented any of the `Intl.NumberFormat` rounding options yet.
- Optional (default is on) right-alignment of numbers. If you want to view a group of numbers in a vertical list, right-alignment is essential. Financials require it. Spreadsheets display and input numbers right-aligned.

Additional features:
- Optional (default is on) auto-width based on `max`, `min`, `digits`, `units`, `locale`, `currency`, `accounting`, and CSS font properties.
- Optional (default is on) auto-scaling of the spinner and confirm buttons for different font sizes.
- Units suffixes, but WYSIWYG. I don't use `Intl.NumberFormat` units because I don't see a way to do exponents. If someone can explain that to me and convince me that they need it, I'll add it.
- `data-delay` and `data-interval` properties to control the timing of spinning.

For keyboard users:
- When you use the `Tab` key to activate the element, the outer element, not the `<input>` gets the focus. In this state you can spin via the up and down arrow keys. Pressing `Tab` again sets focus to the `<input>`. The next `Tab` blurs the element entirely.
- When you use `Shift+Tab` to activate the element, the `<input>` gets the focus. The next `Shift+Tab` activates the outer element. The next one blurs the element.

### Attributes & Properties
HTML Attributes / JavaScript Properties, property names excludes the "data-" prefix:
- `max` is the enforced maximum value, defaults to `Infinity`.
- `min` is the enforced minimum value, defaults to `-Infinity`.
- `step` is the the amount to increment or decrement when spinning, defaults to the smallest number defined by the `data-digits` attribute, e.g. when `digits` is 3, `step` defaults to 0.001.
- `value` is the value as a Number.
- `data-digits` is the number of decimal places to display, as in `number.toFixed(digits)`.
- `data-units` are the string units to append to the formatted text.
- `data-locale` is the locale string to use for formatting. If set to "" it uses the users locale: [`navigator.language`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/language). If set to null (removed), formatting is not based on locale. It uses the [`locales`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#locales) option, but only sets one locale.
- `data-currency`, when set, sets [`style`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#style) = `"currency"` and [currency](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#currency_2) = the attribute value. It is only relevant when `data-locale` is set. NOTE: [`currencyDisplay`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#currencydisplay) is always set to `"narrowSymbol"`.
- `data-accounting` is a boolean that toggles [`currencySign`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#currencysign) = `"accounting"`, which encloses negative numbers in parentheses. Only relevent when `data-currency` and `data-locale` are set.
- `data-notation` sets [`notation`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#notation) to the attribute value. Defaults to `"standard"`. *Untested! I don't understand the implications of the various options.*
- `data-delay` is the number of milliseconds between `mousedown` and the start of spinning.
- `data-interval` is the number of milliseconds between steps when spinning.

These boolean attributes/properties are inverted. The default is: attribute = unset / property = true:
- `data-no-keys` / `keyboards` disables/enables keyboard input. Combining it with `data-no-spin` effectively disables the element.
- `data-no-spin` / `spins` controls the diplay of the spinner on hover (when not inputting via keyboard).
- `data-no-confirm` / `confirms` controls the diplay of the confirm/cancel buttons on hover during keyboard input.
- `data-no-scale` / `autoScale` scales (or not) the buttons to match font size.
- `data-no-width` / `autoWidth` auto-determines the width (or not).
- `data-no-align` / `autoAlign` auto-aligns left/right and auto-adjusts `padding-right` for right-alignment.
- `data-no-resize` / `autoResize` used to disable the `resize()` function while loading the page or setting a batch of element properties.

JavaScript only:
- `text` (read-only) is the formatted text value, including currency, units, etc.
- `useLocale` (read-only) returns `true` if `data-locale` is set.
- `resize(forceIt)` forces the element to resize. When `autoResize` is `true`, it runs automatically after setting any attribute that affects the element's width or alignment. When `autoResize` is `false`, you must set `forceIt` to `true` or the function won't run.  Call it after you change CSS font properties, for example.

### Events
The only event that you can listen to is `change`. There is no need for an `input` event, as the element does not enforce any limitations on keyboard entry as it happens, it only formats via the `"NaN"` class.

The `change` event fires every time the value changes:
- When the user confirms keyboard input.
- When the spinner changes the value. Every step is considered confirmed.

When the user inputs via the spinner, the event object has two additional properties:
- `isSpinning` is set to `true`.
- `isUp` is `true` when it's spinning up (incrementing) and `false` or `undefined` when spinning down (decrementing).

Before the value is committed and the `change` event is fired, you can insert your own validation function, to take full control of that process. Because it runs before committing the value, it happens before the `isNaN()` validation done internally. Invalid value styling is up to you.

The property is named `validate`, and it must be an instance of `Function` or `undefined`. The function takes two arguments: `value` and `isSpinning`. `value` is a string from the keyboard or a number from spinning. The return value falls into three categories:
- `false` for invalid values
- `undefined` or `value` to accept the current value
- a different number: for when you want to round to the nearest prime number, or perform whatever transformation or restriction that can't be defined solely by `max` and `min`.

### Styling
You can obviously style the element itself, but you can also style some of its parts via the `::part` pseudo-element. Remember that `::part` overrides the shadow DOM elements' style. You must use `!important` if you want to override `::part`. See the `html-elements/css/input-num.css` file for example styling.

The available parts:
- `input` is the `<input type="text">`.
- `buttons` is the container for the spinner and confirm buttons.
- `border` is the vertical border between the input and the buttons.

My preference, as illustrated in the sample `css/input-num.css` file, is to *not* display the spinner or confirm buttons on devices that can't hover:
```css
@media (hover:none) {
  input-num::part(buttons) { display:none }
}
```
Those devices are all touchscreen, and focusing the element will focus the `<input>`, which will display the appropriate virtual keyboard. Touch and hold has system meanings on touch devices, which conflicts with spinning. At `font-size:1rem` the buttons are smaller than recommended for touch. So unless you create oversized buttons or use a much larger font size, it's best not to display them at all.

NOTE: Auto-sizing only works if the element is displayed. If the element or any of it's ancestors is set to `display:none`, the element and its shadow DOM have a width and height of zero. During page load, don't set `display:none` until after your elements have resized.

NOTE: If you load the font for your element in JavaScript using `document.fonts.add()`, it will probably not load before the element. So `resize()` won't be using the correct font, and you'll have to run it again after the fonts have loaded.  Something like this:
```js
document.addEventListener("DOMContentLoaded", load);
function load() {
    const whenDefined = customElements.whenDefined("in-number");
    Promise.all([whenDefined, document.fonts.ready]).then(() => {
        for (const elm of document.getElementsByTagName("input-num"))
            elm.resize();
    });
}
```
If you are doing this and want to be more efficient, set the `data-no-resize` attribute on the element:
```html
<input-num data-no-resize></input-num>
```
Then turn on the `autoResize` property prior to calling `resize()` :
```js
        for (const elm of document.getElementsByTagName("input-num")) {
            elm.autoResize = true;
            elm.resize();
        }
```

### The Template: `template-number.html`
I am more familiar with SVG than other image formats, so the spin and confirm buttons in the [built-in template](https://github.com/sidewayss/html-elements/blob/main/template-number.html) are in SVG. You can create your own template file that uses JPEG or whatever image format you prefer.

The core of the template is a flex `<div>`, with three children:
- `<input type="text" id="input" part="input"/>` - the text input
- `<svg part="buttons">` - the spinner and confirm buttons
- `<svg viewBox="0 0 0 0">` - three `<text>` elements used to calculate auto-width

Do not modify:
- `<input>`
- `<svg viewBox="0 0 0 0">`
- `<g id="controls">` and its child `<use>`
- The two `<rect class="events/>`

Everything else is user-configurable, though you'll probably want to keep the flex container:
- `<style>` (optional, but recommended)
- `<defs>`
- <polyline part="border"/> (optional)

`<defs>` defines the shapes, and `<style>` formats them. There are two pairs of buttons:
- spinner: up/down
- confirm: ok/cancel

The definitions are setup as a single block containing each pair. This allows you to create a single image that responds differently when interacting with the top or bottom button. That kind of design makes more sense for the spinner than the confirm buttons...

There is a definition for each cell in this matrix for a total of 19 ids. Confirm has an additional set of definitions for when the ok button is disabled due to user input == `NaN`. Those are labeled `cancel`. The `<rect>` elements that handle events have the ids "top" and "bot" (for "bottom"):
| Pair | State | #id/href |
| ---- | ----- | -------- |
| spinner | idle | `#spinner-idle` |
| spinner | keydown*| `#spinner-key-top`<br>`#spinner-key-bot` |
| spinner | hover | `#spinner-hover-top`<br>`#spinner-hover-bot` |
| spinner | active | `#spinner-active-top`<br>`#spinner-active-bot` |
| spinner | spin | `#spinner-spin-top`&#x2020;<br>`#spinner-spin-bot` |
| confirm | idle | `#confirm-idle` |
| confirm | hover  | `#confirm-hover-top`<br>`#confirm-hover-bot` |
| confirm | active | `#confirm-active-top`<br>`#confirm-active-bot` |
| cancel | idle | `#cancel-idle` |
| cancel | hover  | `#cancel-hover-top`<br>`#cancel-hover-bot` |
| cancel | active | `#cancel-active-top`<br>`#cancel-active-bot` |

\* *ArrowUp or ArrowDown key, initial image is state:key, full-speed spin uses `spin-`*<br>
&#x2020; *`spin-top` and `spin-bot` are the full-speed spin images, used after `data-delay` expires*