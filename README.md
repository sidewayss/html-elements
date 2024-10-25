# `html-elements` contains four custom HTML elements
- [`check-box`](#check-box) emulates `<input type="checkbox">` plus additional features.
- [`check-tri`](#check-tri) is a tri-state checkbox, adding a form of [`indeterminate`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/indeterminate) as the third state.
- [`state-btn`](#state-btn) is a multi-state button with user-defined states, shapes, toggle order, and key codes.
- [`input-num`](#input-num) is a numeric input that emulates a spreadsheet.

The first three share a single [test/demo app](https://sidewayss.github.io/html-elements/apps/multi-state).

`input-num` has [its own app page](https://sidewayss.github.io/html-elements/apps/input-num) because it has a lot more to test and demonstrate.

## Usage
There are three JavaScript files for the four elements. `check-box` and `check-tri` fit into one file. Here is sample HTML that includes all four elements in a page:
```html
<head>
    <script src="/html-elements/multi-check.js"  type="module"></script>
    <script src="/html-elements/multi-button.js" type="module"></script>
    <script src="/html-elements/input-num.js"    type="module"></script>
</head>
```
NOTE: `html-elements` uses [private properties](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties), which have [93% global support](https://caniuse.com/?search=private%20class).<br>*Minified files without private properties will be available in release 1.0.*

Of course `html-elements` uses the [`template`](https://caniuse.com/template) element. Beyond that, it uses dynamic [`import()`](https://caniuse.com/es6-module-dynamic-import) and [`fetch()`](https://caniuse.com/fetch). These three are not going to change, so you're stuck with 96% global support as of October, 2024. But it's only going up.

### Managing Template Files
There are built-in template files in the root directory:
- **template-check.html** for `check-box` and `check-tri`
- **template-button.html** for `state-btn`
- **template-number.html** for `input-num`

Instead of modifying those, you should create an **/html-templates** directory as a sibling of your **/html-elements** directory. Store your template files there. That keeps the source and user files separate and preserves the source files as fallbacks.

When the page is loading, if the element doesn't find its template file in **/html-templates**, the DOM generates an unsupressable HTML 404 "file not found" error. Then it falls back to the built-in template file. I would suggest copying the built-in files to your templates directory as a starting point. Then edit them to create your own designs within the template structure.

NOTE: Using the `part` attribute inside `defs` is unreliable across browsers. Firefox doesn't recognize it. Chrome doesn't allow hyphenated part names. I haven't gotten past those two yet. The built-in template files avoid doing this, which limits their internal structure and complicates their external styling.

NOTE: The CSS files in the `css` sub-directory are samples. They are not used directly by the elements, as the template files are.

## Base Classes
#### `class BaseElement`
`BaseElement` is the superclass for `<input-num>` and `MultiState`. It manages two DOM attributes: `disabled` and `tabindex`. See `base-element.js`.

#### `class MultiState`
`MultiState` is the superclass for `state-btn` and `MultiCheck`. It manages the `data-key-codes` attribute, which contains a JSON array of [keycodes](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values) that act like a mouse click.  It converts `click` and `keyup` to `change` for compatibility with `<input type="checkbox">`. See `multi-state.js`.

 There is no `input` event, just `change`. For these types of `input` they're the same anyway. If you desire it for compatibility reasons, submit an issue or a pull request.

#### `class MultiCheck`
`MultiCheck` is the superclass for `check-box` and `check-tri`. It manages the `data-label` attribute, which contains the `innerHTML` for the built-in label element. It has a read-only property `labelElement` to access that shadowDOM element (see [template-check.html](#template-check.html)). `data-key-codes` defaults to `["Space"]`. See `multi-check.js`.

&ZeroWidthSpace;

## `check-box`
I created `check-box` because I needed `check-tri` and I wanted all my checkboxes to look and act alike. It's the same as `<input type="checkbox">` except:
- The label is built-in through the `data-label` attribute.
- It has a JavaScript `value` property that is identical to `checked`, to normalize it with other types of `input` and elements like `select` when iterating over or switching through groups of elements.
- The checkbox graphics are in the template file, in SVG.

## `check-tri`
`<input type="checkbox">` has an `indeterminate` property (not an attribute) that is separate from the `checked` attribute/property. I don't have a use for that.  I needed a third, undefined/indeterminate value in addition to, and mutually exclusive from, `true` and `false`. I wanted that value to cause `checked` to fall back to a user-determined boolean default.  So `checked` remains boolean, but `value` can be `true`, `false`, or `null`.

To set `value` in HTML, I use `"1"` for `true` and you must use `""` for `false`. The default is unset, which is `null`;

### Additional Attributes / Properties
- `data-default` / `default` sets the boolean default value. As an attribute it does not take a value, similar to `checked`. If you don't use the `checked` attribute/property, then you have no need for `data-default`.
- `data-show-default` / `showDefault` shows or hides the default value as a read-only box to the left. The attribute does not take a value.

### template-check.html
`check-box` and `check-tri` share a template file. The built-in template is highly reusable because the shapes are simple and they are 100% externally styleable with [`::part`](https://developer.mozilla.org/en-US/docs/Web/CSS/::part). This is the `template`:
```html
<template id="template-check">
  <svg id="shapes" part="shapes" viewbox="0 0 18 15" width="18" height="15">
    <defs> <!-- this template doesn't define #false -->
      <rect id="box" x="0.5" y="1.5" width="13" height="13" rx="2" ry="2"/>
      <path id="true" d="M3.5,8.5 L6,11 10,4.5"/>
      <path id="null" d="M4,8 H10"/>
    </defs>
    <!-- #mark and #default-mark must be refer to #false -->
    <g id="default" part="default" pointer-events="none">
      <use href="#box" part="default-box"/>
      <use href="#false" id="default-mark" part="default-mark"/>
    </g>
    <g part="check">
      <use href="#box" part="box"/>
      <use href="#false" id="mark" part="mark"/>
    </g>
  </svg>
  <pre id="data-label" part="label"></pre>
</template>
```
Except for "box", all the elements with `id` are required by `MultiCheck`. It may be called a "checkbox", but the box is optional. Here it's a `use` referring to a `rect`, but it can be any element or missing. In a tic-tac-toe paradigm where X is true and &cir; is false, there's no need for a box.

The other optional element with an `id` is `#false`. The built-in template doesn't use it because its modeled on a standard checkbox where false is an empty box. Technically, `#true` is not required either, but unless you're building a topsy-turvy app where "checked" is empty, you'll need to include it. For your result to make sense, you must define at least one of `#true|false` for `check-box`, and at least two of `#true|false|null` for `check-tri`.

`#null` and the entire `#default` group are only used by `check-tri`. If you only plan on using `check-box`, you can omit them.

`#true`, `#false`, and `#null` can be any SVG element type, and they must be inside a `defs`.

`#default` must be a `g`. `#default-mark` must be a `use` and a child of `#default`.

`#mark` is the "check mark". It must be a `use`. `#mark` and `#default-mark` must refer to `#false` in the template because both `checked` and `value` can be left unset in HTML and the JavaScript doesn't force a default reference.

`#data-label` can be any element type that displays text and is not focusable. This template uses `pre` along with a fixed-width font. `label` is not recommended because SVG elements are not [labelable](https://developer.mozilla.org/en-US/docs/Web/HTML/Content_categories#labelable).

The [`part`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/part) attributes are all optional.

NOTE: With this template, I style the element as a flex container, relying on the default `flex-direction:row`. I find that `align-items:center` works best for this combination of shapes, font, and font size because the box's bottom line aligns with the font baseline:
```css
check-box, check-tri {
  display: flex;
  align-items: center;
}
```
An alternative is to put a flex container inside the template, as the template for `input-num` does.

&ZeroWidthSpace;

## `state-btn`
`state-btn` is an open ended toggle, allowing you to define:
- Any number of states/values
- A separate graphic for each state
- The click/Enter toggle order
- Any other keyboard keys you want to use

### Additional Attributes / Properties (and a method)
- `data-states` / `states` is a two-dimensional array, where each outer element is `[state, href, title]`.
    - `state` is the `value` attribute/property. It can be any string. I use enumerated numbers.
    - `href` is the `id` attribute of the SVG image, but without the `btn-` prefix.
    - `title` is the `title` attribute for this state. It defaults to `Href`.
- `data-auto-increment` / `auto` is a boolean (the attribute does not take a value) that turns the auto-increment feature on/off. Auto-increment uses the declared order of `data-states` to cycle through all the states upon every `change` event.
- `data-key-codes` defaults to `["Enter"]`.
- The `index` property gets/sets the index of the current state. Setting it changes `value` and thus the image and title too.
- The `reset()` method is equivalent to: `element.index = 0;`

NOTE: The default value on initial page load is the first state defined. I see no need to set the `value` attribute in HTML. The toggle order is completely user-controlled, so just make your default state the first one. If you *really need* to declare the value in HTML, you must do it after `data-states` or the value won't validate. I did not see the value in adding code to make it order-independent.

### template-button.html
The built-in template is a pair of playback buttons: play and stop. It's not as reusable as **template-check.html**, but this is a more raw, open-ended kind of element. It requires customization to match its flexibility.

There is one template for all your buttons, across all the pages on your site. One 'use' element and as many definitions as you need.

The templates requires a `defs` that contains an element with a matching `btn-id` for every state id you define. Here is some sample HTML, where the second element of each array is the state id:
```html
<state-btn id="play" class="row" data-states='[[0,"play"], [1,"pause"], [2,"resume"]]'></state-btn>
<state-btn id="stop" class="row" data-states='[[0,"stop"], [1,"reset"]]' disabled></state-btn>
```
To match this template:
```html
<template id="template-button">
  <style>
    :host { --square:calc(1rem + var(--9-16ths)) }
    svg   { width:var(--square); height:var(--square); }
  </style>
  <svg viewbox="0 0 25 25">
    <defs>
      <!-- 3 images for #play button -->
      <path id="btn-play"   d="M3,2 L22,12.5 3,23 Z"/>
      <g    id="btn-pause">
        <rect x= "3" y="3"  width="7" height="19" rx="1" ry="1"/>
        <rect x="15" y="3"  width="7" height="19" rx="1" ry="1"/>
      </g>
      <path id="btn-resume" d="M3,3 V22 M8,3 L22,12.5 8,22 Z"/>

      <!-- 2 images for #stop button -->
      <rect id="btn-stop"   x="3" y="3" width="19" height="19" rx="2" ry="2"/>
      <path id="btn-reset"  d="M3,3 V22 M22,3 L8,12.5 22,22 Z"/>
    </defs>
    <use id="btn" href="#"/>
  </svg>
</template>
```

&ZeroWidthSpace;

## `input-num`
Based on an informal survey and my own repeated frustrations, I came to the conculsion that `<input type="number"/>` isn't just ["the worst HTML input"](https://www.google.com/search?q=the+worst+html+input), it's a total waste of time. I needed an alternative. I spent over a decade programming for finance executives and financial analysts, so I spent a lot of time in Excel. Regardless of the brand, spreadsheets all use the same, well-established paradigm for inputting and displaying numbers. I decided to create a custom element that imitates a spreadsheet, while maintaining consistency with the default `<input type="number"/>` as implemented by the major browsers.

### Features
`<input type="number"/>` emulation:
- The `max` and `min` attributes prevent committing a value outside their range.
- Spinner buttons appear on hover (though not while inputting via keyboard).
- The `step` attribute defines the spin increment.
- Focus: you can activate the element via mouse, touch, or keyboard (`Tab` key). Clicking on the spinners activates the outer element and keeps the spinners visible until it loses focus. See "For keyboard users" below for some differences.
- Validation: Unlike Chrome, it doesn't prevent the entry of any characters. It's more like Firefox/Safari. It allows you to enter any character, but it won't let you commit a non-number. The OK button and Enter key are disabled. The `keyup` event adds the `"NaN"` class; when you press the Enter key it adds the "beep" class on top of that. Styling `.NaN` and `.beep` is up to you.<br>
A non-number is defined as:<br>
&emsp;`!Number.isNaN(val ? Number(val) : NaN)`<br>
Where `val` is the attribute value: a string or `null`. It allows any number, but it's strict about the conversion, excluding `""`, `null`, and numbers with text prefixes or suffixes that `parseFloat()` converts.<br>
Additionally there is an "OoB" (Out of Bounds) class that you can use to style the element when the user has keyed in an out-of-bounds value.

Spreadsheet emulation:
- It stores an underlying `Number` separate from the formatted display, which is a `String` that includes non-numeric characters. Inputting via keyboard reveals the underlying, unformatted value.
- Keyboard input requires user confirmation via the `Enter` key or `OK` button. The user can cancel the input via the `Esc` key, the `Cancel` button, or by setting the focus elsewhere. Cancelling reverts to the previous value.
- Spreadsheets have their own number formatting lingo. JavaScript provides [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat), which is wrapped up in [locales](https://en.wikipedia.org/wiki/Locale_(computer_software)).<br>`input-num` has `data-digits`, `data-locale`, `data-currency`,`data-accounting`, and `data-units` attributes for formatting. I have not implemented any of the `Intl.NumberFormat` rounding options yet.
- Optional (default is on) right-alignment of numbers. If you want to view a group of numbers in a vertical list, right-alignment is essential. Financials require it. Spreadsheets right-align the display and input of numbers.

Additional features:
- Optional (default is on) auto-width based on `max`, `min`, `digits`, `units`, `locale`, `currency`, `accounting`, and CSS font properties.
- Optional (default is on) auto-scaling of the spinner and confirm buttons for different font sizes.
- Units suffixes, but WYSIWYG. I don't use `Intl.NumberFormat` units because I don't see a way to do exponents. If someone can explain that to me and convince me that they need it, I'll add it.
- `data-delay` and `data-interval` properties to control the timing of spinning.
- Separate button images for idle, hover, active and full-speed spin.

For keyboard users:
- When you use the `Tab` key to activate the element, the outer element, not the `input` gets the focus. In this state you can spin via the up and down arrow keys. Pressing `Tab` again sets focus to the `input`. The next `Tab` blurs the element entirely.
- When you use `Shift+Tab` to activate the element, the `input` gets the focus. The next `Shift+Tab` activates the outer element. The next one blurs the element.

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
The only event that you can listen to is `change`. There is no need for an `input` event, as the element does not enforce any limitations on keyboard entry as it happens, it only formats via the `"NaN"` class. I don't see the need for any other events. If you need some, e.g. `input`, `keydown`, or `keyup` attached to the inner `<input type="text"/>`, submit an issue or a pull request.

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
You can obviously style the element itself, but you can also style some of its parts via the `::part` pseudo-element. Remember that `::part` overrides the shadow DOM elements' style. You must use `!important` if you want to override `::part`. See the **html-elements/css/input-num.css** file for example styling.

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
Those devices are all touchscreen, and focusing the element will focus the `input`, which will display the appropriate virtual keyboard. Touch and hold has system meanings on touch devices, which conflicts with spinning. At `font-size:1rem` the buttons are smaller than recommended for touch. So unless you create oversized buttons or use a much larger font size, it's best not to display them at all.

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

### template-number.html
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
- `<polyline part="border"/>` (optional)

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