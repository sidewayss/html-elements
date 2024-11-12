# sideways-elements are:
- [`<check-box>`](#check-box) emulates `<input type="checkbox">`, plus additional features.
- [`<check-tri>`](#check-tri) is a tri-state checkbox, adding a form of [`indeterminate`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/indeterminate) as the third state.
- [`<state-btn>`](#state-btn) is a multi-state button with user-defined states, shapes, toggle order, and key codes.
- [`<input-num>`](#input-num) is a numeric input that emulates a spreadsheet and formats with [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat).

The first three share a [test/demo app](https://sidewayss.github.io/html-elements/apps/multi-state) and a [base class](#class-multistate).

`<input-num>` has its own [app page](https://sidewayss.github.io/html-elements/apps/input-num) because it has a lot more to test and demonstrate.

## Summary
It's a collection of [autonomous](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#types_of_custom_element) custom HTML elements that can be graphically customized at the site level and/or by page. It loads the template when the element loads, and [`import.meta`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta) allows you to specify the template file or directory as import options. It has no external dependencies.

The templates use SVG for the graphics. CSS styling features for custom elements, in particular [`::part`](https://caniuse.com/mdn-css_selectors_part), depend on the baseline browser version you intend to support.

It has a very limited selection of four elements. There is room to grow.

## Usage
[Release 1.0]() has both source modules and tranpiled, minified bundles. The file names are the same in both the **src** and **dist** directories:
- **multi-check.js** is `<check-box>` and `<check-tri>` bundled together. They share a single template file too.
- **state-btn.js** is `<state-btn>`.
- **input-num.js** is `<input-num>`.
- **elements.js** is all the elements exported from one file:
    - **dist/elements.js** is bundled, transpiled, and minified.
    - **src/elements.js** is a barrel module with no dependencies outside this repository. *Note that you cannot use import options with this module because the browsers' module-load order prevents it.*

For example, to import all the elements:
```html
<head>
    <script src="<your-path>/dist/elements.js" type="module"></script>
</head>
```

### Import options
- `template` specifies the full path to the template file. If you use this with elements.js, then you must bundle all of your templates into one file.
- `templateDir` specifies the directory containing the template files.

Either way, you must use these base file names or template ids:
- `multi-check`
- `state-btn`
- `input-num`

For example. to set the template directory to `/html-templates`:
```html
<head>
    <script type="module">
      import "<your-path>/input-num.js?templateDir=/html-templates/";
    </script>
</head>
```
This will fetch `/html-templates/input-num.html` as the template file.

If you bundle your templates into one file, then each `<template>` must have the correct `id`. For example:
```html
<template id="input-num">...</template>
```

### Managing Template Files
There are built-in template files in the **templates** directory:
- **multi-check.html** for `<check-box>` and `<check-tri>`
- **state-btn.html** for `<state-btn>`
- **input-num.html** for `<input-num>`

They serve two purposes:
- As examples and/or starting points for you to design a template
- As fallbacks when the page is loading. If the element fails to fetch your template, it falls back to the built-in template file.

These files are part of the repository, so you don't want to be editing them in-place unless you're planning to submit a pull request. Instead, you should create your own directory, wherever convenient, and store your template files there.  You might start by copying the built-in files there and working within their structures.

NOTE: The [`part`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/part) attribute and CSS [`::part`](https://developer.mozilla.org/en-US/docs/Web/CSS/::part) are new enough that it's worth reviewing the [current support grid]((https://caniuse.com/mdn-html_global_attributes_part)) (the two grids are identical). The built-in templates have fallback styles to support older browsers. Remember that `::part` overrides the element's style unless you specify `!important`.

Also note: As of the start of 2025, using the `part` attribute inside [`<defs>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/defs) is unreliable across browsers. Firefox doesn't recognize it. Chrome doesn't allow hyphenated part names. I haven't gotten past those two yet. The built-in template files avoid doing this, which limits their internal structure and complicates their external styling. *Of course removing the fallback styles from inside the template helps simplify external styling too, if you can afford to do that.*

NOTE: The CSS files in the `css` sub-directory are samples. They are not used directly by the elements, as the template files are.

### `DOMContentLoaded`
If you have code that runs during the page load process, there are two sets of promises that you might need to reference:
- [`customElements.whenDefined()`](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/whenDefined) applies to all custom HTML elements.
- `BaseElement.promises` is a 1:1 `Map` where every element maps to a `Promise` that resolves after the element's `connectedCallback()` is called, when the element's layout is available. Use it only if you need to access the layout of one of this library's elements during page load. You can see it in action [here](https://github.com/sidewayss/html-elements/blob/72d995173f320d91d5244835e8628df5531f1f4e/apps/input-num/index.js#L35), in the `<input-num>` app's `DOMContentLoaded` handler. That code waits for all the promises to resolve before getting the width of several elements in `allResolved()`. But you can wait for only the elements you need, if you want to be more precise. Simply get the element by id, or however, then `get()` its `Promise` from the `Map`:
    ```js
    BaseElement.promises.get(document.getElementById("my-check-tri")).then();
    ```
    This feature is the reason why `base-element.js` is in the `dist/` directory, and all the bundled files except `elements.js` exclude it. Otherwise when you import multiple elements separately, you could have more than one version of `BaseElement`. In that case you either have to know which one to import, or you have to import more than one of them, or you have to import each subclass and rely on inheritance of static properties, et cetera. This keeps it simple.

    This feature exists only to maintain backward compatibility with browser versions that don't support `await` [at module top level](https://caniuse.com/mdn-javascript_operators_await_top_level). In the process it coincidentally achieved full pre-[`await`](https://caniuse.com/mdn-javascript_operators_await) compatibility.

### Browser Compatibility
Compatibility across the browsers is good. The issues are with older versions of iOS/Safari. Currently, the **dist/** files support iOS 12.2 as the oldest version. [Support for iOS 12](https://apple.fandom.com/wiki/IOS_12#Supported_Devices) goes back to iPhone 5s, which is the first 64bit iPhone. See [here](https://github.com/sidewayss/html-elements/issues/10) and [here](https://github.com/sidewayss/html-elements/issues/8) for details of changes to the code for backwards compatibility. Support could go back as far as iOS 10.3, when support for custom HTML elements began, but the pre-12.2 issue requires changes to the template structure, which would create a backward compatibility issue within the project. Please submit a GitHub issue or pull request if you really need 10.3 support.

### Custom Elements Manifest
The root directory contains a `custom-elements.json` file for the full set of elements. It is auto-generated by [@custom-elements-manifest/analyzer](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/). I don't use IntelliSense or anything else that might read the manifest, so please let me know if it's not working.

## JavaScript Super Classes
These classes manage common attributes/properties and behaviors across elements.
### `class BaseElement extends HTMLElement`
`BaseElement` is the top level class. It is the superclass for `InputNum` and `MultiState`. It manages two global DOM attributes: `disabled` and `tabindex`. See `base-element.js`.

### `class MultiState`
`MultiState` is the superclass for `<state-btn>` and `MultiCheck`. It manages the `data-key-codes` attribute, which contains a JSON array of [keycodes](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values) that act like a mouse click.  It converts `click` and `keyup` to `change` for compatibility with `<input type="checkbox">`. See `multi-state.js`.

There is no `input` event, just `change`. For these types of `<input>` they're the same anyway. If you desire it for compatibility reasons, submit an issue or a pull request.

### `class MultiCheck`
`MultiCheck` is the superclass for `<check-box>` and `<check-tri>`. It manages the `data-label` attribute, which contains the `innerHTML` for the built-in label element. It has a read-only property `labelElement` to access that shadowDOM element (see [template-check.html](#template-check.html)). `data-key-codes` defaults to `["Space"]`. See `multi-check.js`.

# The Elements
One quick glossary entry: "boolean attribute" is an attribute whose boolean value is determined by `hasAttribute()` not `getAttribute`. The global `disabled` attribute is a boolean attribute.

## `<check-box>`
I created `<check-box>` because I needed `<check-tri>` and I wanted all my checkboxes to look and act alike. It's the same as `<input type="checkbox">` except:
- The label is built-in through the `data-label` attribute (see `class MultiCheck` directly above here).
- It has a JavaScript `value` property that is identical to `checked`, in order to normalize it with other types of `<input>` and elements like `<select>` when iterating over or switching through collections of elements.
- The checkbox graphics are in a separate template file, in SVG.

## `<check-tri>`
`<input type="checkbox">` has an `indeterminate` property (not an attribute) that is independent from the `checked` attribute/property. I don't have a use for that.  I needed a third, undefined/indeterminate value in addition to, and mutually exclusive from, `true` and `false`. I wanted that value to cause `checked` to fall back to a user-determined default boolean value.  So `checked` remains boolean, but `value` can be `true`, `false`, or `null`. It's `null`, not `undefined` because that's what `getAttribute()` returns when an attribute is unset.

To set `value` in HTML, I use `"1"` for `true` and you must use `""` for `false`.

### Additional Attributes / Properties
- `data-default` / `default` is a boolean that sets the default value. If you don't use the `checked` attribute/property, then you have no need for it.
- `data-show-default` / `showDefault` is a boolean that shows or hides the default value as a read-only box to the left.

### template-check.html
`<check-box>` and `<check-tri>` share a template file. The built-in template is highly reusable because the shapes are simple and they are 100% externally styleable with [`::part`](https://developer.mozilla.org/en-US/docs/Web/CSS/::part). This is the `<template>`:
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
It may be called a "checkbox", but `#box` is optional. Here it's a `<rect>`, but it can be any element or missing. In a tic-tac-toe design, where X is true and &cir; is false, there's no need for a box.

The other optional element with an `id` is `#false`. The built-in template doesn't use it because it's modeled on a standard checkbox, where false is an empty box. Technically, `#true` is not required either, but unless you're building a topsy-turvy app where "checked" is empty, you'll need to include it. For your result to make sense, you must define at least one of `#true|false` for `<check-box>`, and at least two of `#true|false|null` for `<check-tri>`.

`#null` and the entire `#default` group are only used by `<check-tri>`. If you only plan on using `<check-box>`, you can omit them.

`#true`, `#false`, and `#null` can be any SVG element type, and they must be inside a `<defs>`.

`#default` must be a `<g>`. `#default-mark` must be a `<use>` and a child of `#default`.

`#mark` is the "check mark". It must be a `<use>`. `#mark` and `#default-mark` must refer to `#false` in the template because both `checked` and `value` can be left unset in HTML and the JavaScript doesn't force a default reference.

`#data-label` can be any element type that displays text and is not focusable. This template uses `<pre>` along with a fixed-width font. `<label>` is not recommended because SVG elements are not [labelable](https://developer.mozilla.org/en-US/docs/Web/HTML/Content_categories#labelable).

The [`part`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/part) attributes are all optional.

NOTE: With this template, the element is a flex container, relying on the default `flex-direction:row`. I find that `align-items:center` works best for this combination of shapes, font, and font size because the box's bottom line aligns with the font baseline:
```css
check-box, check-tri {
  display: flex;
  align-items: center;
}
```
An alternative is to put a flex container inside the template, as the template for `<input-num>` does.

&ZeroWidthSpace;

## `<state-btn>`
`<state-btn>` is an open-ended toggle, allowing you to define:
- Any number of states/values
- A separate graphic for each state
- The click/Enter toggle order
- Any other keyboard keys you want to use

### Additional Attributes / Properties (and a method)
- `data-states` / `states` is a two-dimensional array. As an attribute the array is in JSON format. Each outer element is `[state, href, title]`:
    - `state` is the `value` attribute/property. It can be any string. Enumerated numbers are appropriate.
    - `href` is the root `id` attribute of the SVG image, without the `btn-` prefix.
    - `title` is the `title` attribute for this state. It defaults to `Href`.
- `data-auto-increment` / `auto` is a boolean that turns the auto-increment feature on/off. Auto-increment uses the declared order of `data-states` to cycle through all the states upon every `change` event.
- `data-key-codes` defaults to `["Enter"]`.
- The `index` property gets/sets the `value`attribute by states array index.
- The `reset()` method is equivalent to: `element.index = 0;`

NOTE: The default value on initial page load is the first state defined. I see no need to set the `value` attribute in HTML. The toggle order is completely user-controlled, so just make your default state the first one. If you *really need* to declare the value in HTML, you must do it after `data-states` or the value won't validate. I did not see the value in adding code to make it order-independent.

### template-button.html
The built-in template is a pair of playback buttons: play and stop. It's not as reusable as **template-check.html**, but this is a more raw, open-ended kind of element. It requires customization to match its flexibility.

There is one template for all your buttons. One 'use' element and as many definitions as you need.

The templates requires a `<defs>` that contains an element with a matching `btn-id` for every state id you define. Here is some sample HTML, where the second element of each array is the state id:
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

## `<input-num>`
Based on an informal survey and my own repeated frustrations, I came to the conclusion that `<input type="number"/>` isn't just [the worst HTML input](https://www.google.com/search?q=the+worst+html+input), it's a total waste of time. I needed an alternative. I spent over a decade programming for finance executives and financial analysts, so I spent a lot of time in Excel. Regardless of the brand, spreadsheets all use the same, well-established paradigm for inputting and displaying numbers. I decided to create a custom element that imitates a spreadsheet, while maintaining consistency with the default `<input type="number"/>` as implemented by the major browsers.

### Features
#### Spreadsheet Emulation
- It stores an underlying `Number` separate from the formatted display, which is a `String` that includes non-numeric characters. Inputting via keyboard reveals the underlying, unformatted value.
- By default, the user confirms keyboard input by blurring the element (pressing `Tab`, `Shift+Tab`, or clicking elsewhere on the page), or via the `Enter` key or `OK` button. They cancel input via the `Esc` key or `Cancel` button. Cancelling reverts to the previous value. Setting the `data-blur-cancel` attribute cancels instead of confirming when blurring the element via tabbing or clicking elsewhere.
- By default, numbers are right-aligned, for keyboard input and formatted display. If you want to view a group of numbers in a vertical list, right-alignment is essential. Financials require it. The `data-no-align` attributes turns off right-alignment.
- Spreadsheets have their own number formatting lingo. `<input-num>` uses [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat), which is wrapped up in [locales](https://en.wikipedia.org/wiki/Locale_(computer_software)). `data-digits`,  `data-units`, `data-locale`, `data-currency`, `data-accounting`, and `data-notation` are the formatting attributes. I have not implemented any of the `Intl.NumberFormat` rounding options [yet](https://github.com/sidewayss/html-elements/issues/6).

#### `<input type="number"/>` Emulation
- The `max` and `min` attributes clamp values outside their range when committing the value. When a user enters an out-of-bounds value via keyboard, the `keyup` event adds the `OoB` class to the element. The built-in style uses a yellow (warning) background, but you can style it as you please.
- Spinner buttons appear on hover (though not while inputting via keyboard).
- The `step` attribute defines the spin increment.
- Focus: you can activate the element via mouse, touch, or keyboard (`Tab` key). Clicking on the spinners activates the outer element and keeps the spinners visible until it loses focus. See "For keyboard users" below for some differences.
- Validation: Unlike Chrome, it doesn't prevent the entry of any characters. It's more like Firefox/Safari. It allows you to enter any character, but it won't let you commit a non-number. The `keyup` event adds the `"NaN"` class to the element. Then, when you keydown `Enter` or mousedown the OK button, it adds the "beep" class on top of that. Styling `.NaN` and `.beep` is up to you.<br>
A non-number is defined as:<br>
&emsp;`!Number.isNaN(val ? Number(val) : NaN)`<br>
Where `val` is the attribute value: a string or `null`. It allows any number, but it's strict about the conversion, excluding `""`, `null`, and numbers with text prefixes or suffixes that `parseFloat()` converts.<br>

#### Additional Features
- Optional (default is on) auto-width based on `max`, `min`, `digits`, `units`, `locale`, `currency`, `accounting`, and CSS font properties.
- Optional (default is on) auto-scaling of the spinner and confirm buttons for different font sizes.
- Units suffixes, but WYSIWYG. I don't use `Intl.NumberFormat` units because I don't see a way to do exponents. If someone can explain that to me and convince me that they need it, I'll add it.
- `data-delay` and `data-interval` properties to control the timing of spinning.
- Separate button images for idle, hover, active and full-speed spin.

#### Keyboard Navigation
- When you use the `Tab` key to activate the element, the outer element, not the `<input>`, gets the focus. In this state you can spin via the up and down arrow keys. Pressing `Tab` again sets focus to the `<input>`. The next `Tab` blurs the element entirely.
- When you use `Shift+Tab` to activate the element, the `<input>` gets the focus. The next `Shift+Tab` activates the outer element. The next one blurs the element.

### HTML Attributes / JavaScript Properties
There are several inverted boolean attributes / properties, where the attribute value is the opposite of the property value. The attribute names all start with `data-no-`. They are all for turning features off. The default is always attribute = unset / property = `true`. The negative makes sense for the attribute, but it's clumsy for the property name.

#### DOM Attributes
- `max` is the enforced maximum value, defaults to `Infinity`.
- `min` is the enforced minimum value, defaults to `-Infinity`.
- `step` is the the amount to increment or decrement when spinning, defaults to the smallest number defined by the `data-digits` attribute, e.g. when `digits` is 3, `step` defaults to 0.001.
- `value` is the value as a Number.

#### Behavior
- `data-blur-cancel` / `blurCancel` is a boolean that cancels keyboard input when the user blurs the element via `Tab`, `Shift+Tab`, or by clicking elsewhere on the page. The default behavior is to confirm the value. Does not affect the behavior of the <Enter> or <Esc> keys or the OK or Cancel buttons.
- `data-no-keys` / `keyboards` disables/enables keyboard input. Combining it with `data-no-spin` effectively disables the element.
- `data-no-resize` / `autoResize` used to disable the `resize()` function while loading the page or setting a batch of element properties.

#### Spinner
- `data-delay` is the number of milliseconds between `mousedown` and the start of spinning.
- `data-interval` is the number of milliseconds between steps when spinning.
- `data-no-spin` / `spins` controls the diplay of the spinner on hover

#### Element Formatting
- `data-no-confirm` / `confirms` controls the diplay of the confirm/cancel buttons on hover during keyboard input.
- `data-no-scale` / `autoScale` scales (or not) the buttons to match font size.
- `data-no-width` / `autoWidth` auto-determines the width (or not).
- `data-no-align` / `autoAlign` auto-aligns left/right and auto-adjusts `padding-right` for right-alignment.

#### Number Formatting
- `data-digits` is the number of decimal places to display, as in `number.toFixed(digits)`.
- `data-units` are the string units to append to the formatted text.
- `data-locale` is the locale string to use for formatting. If set to "" it uses the users locale: [`navigator.language`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/language). If set to null (removed), formatting is not based on locale. It uses the [`locales`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#locales) option, but only sets one locale.
- `data-currency`, when set, sets [`style`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#style) = `"currency"` and [currency](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#currency_2) = the attribute value. It is only relevant when `data-locale` is set. [`currencyDisplay`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#currencydisplay) is always set to `"narrowSymbol"`.
- `data-accounting` is a boolean that toggles [`currencySign`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#currencysign) = `"accounting"`, which encloses negative numbers in parentheses. Only relevent when `data-currency` and `data-locale` are set.
- `data-notation` sets [`notation`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#notation) to the attribute value. Defaults to `"standard"`. *Untested! I don't understand the implications of the various options.*

NOTE: When you combine a currency symbol with units, it displays as currency per unit. For example:
```js
inputNum.locale   = "es-MX";  // Español, Mexico
inputNum.currency = "MXN";    // Mexican Peso
inputNum.units    = "kg";     // kilogram
```
displays 100 as: **$100/kg**

#### JavaScript only:
- `text` (read-only) is the formatted text value, including currency, units, etc.
- `useLocale` (read-only) returns `true` if `data-locale` is set.
- `resize(forceIt)` resizes the element. When `autoResize` is `true`, it runs automatically after setting any attribute that affects the element's width or alignment. When `autoResize` is `false`, you must set `forceIt` to `true` or the function won't run.  Call it after you change CSS font properties, for example.

### Events
The only event that you can listen to is `change`. I don't see a need for any other events. If you need some, e.g. `input`, `keydown`, or `keyup` attached to the inner `<input type="text"/>`, then please submit an issue or a pull request.

The only event I've considered adding is an `endspin` event for when spinning cancels (`this.#spin(undefined)`). It would fire on every `mouseup` or `keyup` when spinning. It could be useful for throttling external changes based on the value.

The `change` event fires every time the value changes:
- When the user confirms keyboard input.
- When the spinner changes the value. Every step is auto-confirmed.

When the user inputs via the spinner, the event object has two additional properties:
- `isSpinning` is set to `true`.
- `isUp` is `true` when it's spinning up (incrementing) and `false` or `undefined` when spinning down (decrementing).

Before the value is committed and the `change` event is fired, you can insert your own validation function, to take full control of that process. Because it runs before committing the value, it happens before the internal `isNaN()` validation. Invalid value styling is up to you.

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

`<defs>` defines the shapes, and `<style>` formats them. There are two pairs of button shapes, each pair consisting of top/bottom:
- spinner: up/down
- confirm: ok/cancel

 The actual buttons, `<rect>` elements that handle events, have the ids "top"/"bot". The definitions are setup as a single block containing each pair. This allows you to create a single image that responds differently when interacting with the top or bottom button. That kind of design makes more sense for the spinner than the confirm buttons...

The def ids are built in two or three segments separated by hyphens (`idle` only has two segments).There are a total of 14 ids:
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

\* *ArrowUp or ArrowDown key, initial image is state:key, full-speed spin uses `spin-`*<br>
&#x2020; *`spin-top` and `spin-bot` are the full-speed spin images, used after `data-delay` expires*