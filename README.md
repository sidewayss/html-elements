# sidewayss/html-elements == sideways-elements
- [`<input-num>`](#input-num) is a numeric input that emulates a spreadsheet and formats with [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat).
- [`<state-btn>`](#state-btn) is a multi-state button with user-defined states, shapes, toggle order, and key codes.
- [`<check-tri>`](#check-tri) is a tri-state checkbox, adding a form of [`indeterminate`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/indeterminate) as the third state.
- [`<check-box>`](#check-box) emulates `<input type="checkbox">`, plus additional features.

`<input-num>` has its own [app page](https://sidewayss.github.io/html-elements/apps/input-num) because it has a lot to test and demonstrate.

The other three share a [test/demo app](https://sidewayss.github.io/html-elements/apps/multi-state) and a [base class](#class-multistate).

## Summary
It's a collection of [autonomous](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#types_of_custom_element) custom HTML elements that can be graphically customized at the site level and/or by page. It fetches the template(s) during the page load process, and [`import.meta`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta) allows you to specify the template file or directory as [import options](#import-options).

The templates use SVG for the graphics. CSS styling features for custom elements, in particular [`::part`](https://caniuse.com/mdn-css_selectors_part), depend on the baseline browser version you intend to support.

It has a very limited selection of four elements and no external dependencies. There is room to grow.

## Usage
[Release 1.0]() has both source modules and tranpiled, minified bundles. The bundles are in the `dist/` directory. The source is in `src/` in the NPM package, and in the root directory in the repository (which makes it easier to create `dist/` versions of the test/demo apps for testing the `dist/` modules).

- link to current release dist or src
- NPM package
- you're on your own...

For example, to import `<input-num>`:
```html
<head>
    <script src="<your-path>/dist/input-num.js" type="module"></script>
</head>
```
### File Names
There are 4 elements, but only 3 root file names because `<check-box>` and `<check-tri>` share everything. The root names are:
- **input-num**
- **state-btn**
- **multi-check**

Those root names apply to `src/` and `dist/` module files, template files, the sample CSS files, as well as `<template id="root-name">` when your templates into a single file.

There is one more importable module, which bundles all the elements together: `elements.js`. The distributable is bundled, transpiled, and minified.  The source is a barrel module with no external dependencies.  *Note that you cannot use `import.meta` options with this source module because the browsers' module-load order prevents it.*

### Import Options
- `template` specifies the full path to the template file. If you use this with elements.js, then you must bundle all of your templates into one file.
- `templateDir` specifies the directory containing the template files.

For example. to set the template directory to `/html-templates` (the trailing slash is optional):
```html
<head>
    <script type="module">
      import "<your-path>/input-num.js?templateDir=/html-templates/";
    </script>
</head>
```
Which fetches `/html-templates/input-num.html` as the template file.

If you bundle your templates into one file, then each `<template>` must have the correct `id`. For example:
```html
<template id="input-num">...</template>
```

__NOTE:__ If you are using import options and getting an error about an element/tag already being registered, you might need to add the same import options to your JavaScript `import` statements, so that they match your HTML `<script>` imports.  This happens sometimes because the browser imports them as two separate files, for reasons unknown to me.

### Managing Template Files
There are built-in template files in the `templates/` directory. They serve two purposes:
- As examples and/or starting points for you to design your templates.
- As fallbacks when the page is loading. If your template cannot be fetched, it falls back to the built-in template file.

These files are part of the repository, so you don't want to be editing them in-place unless you're planning to submit a pull request. Instead, you should create your own directory, wherever convenient, and store your template files there.  You might start by copying the built-in files there and working within their structures.

__NOTE:__ The [`part`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/part) attribute and CSS [`::part`](https://developer.mozilla.org/en-US/docs/Web/CSS/::part) are new enough that it's worth reviewing the [current support grid]((https://caniuse.com/mdn-html_global_attributes_part)) (the two grids are identical). The built-in templates have fallback styles to support older browsers. Remember that `::part` overrides the element's style unless you specify `!important`.

*Also note:* As of the start of 2025, using the `part` attribute inside [`<defs>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/defs) is unreliable across browsers. Firefox doesn't recognize it. Chrome doesn't allow hyphenated part names. I haven't gotten past those two yet. The built-in template files avoid doing this, which limits their internal structure and complicates their external styling. *Of course removing the fallback styles from inside the template helps simplify external styling too, if you can afford to do that.*

__NOTE:__ The CSS files in the `css` sub-directory are samples, examples. They are used in the test/demo apps, but not by the elements themselves.

### `DOMContentLoaded`
If you have code that runs during the page load process, there are two sets of promises that you might need to reference:
- [`customElements.whenDefined()`](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/whenDefined) applies to all custom HTML elements.
- `BaseElement.promises` is a 1:1 `Map` where every element maps to a `Promise` that resolves after the element's `connectedCallback()` is called: when the element's layout is available. Use it only if you need to access the layout of one of this library's elements during page load.

    You can see it in action in the `<input-num>` app's [`DOMContentLoaded` handler](https://github.com/sidewayss/html-elements/blob/72d995173f320d91d5244835e8628df5531f1f4e/apps/input-num/index.js#L35). That code waits for all the promises to resolve before getting the width of several elements in `allResolved()`. But you can wait for only the elements you need, if you want to be more precise. Simply get the element by id, or however, then `get()` its `Promise` from the `Map`:
    ```js
    BaseElement.promises.get(document.getElementById("my-check-tri")).then();
    ```
    This feature is the only reason for you to import anything from `base-element.js`.
    It's the reason why there is a `base-element.js` in `dist/` and all the bundled files except `elements.js` exclude it. Otherwise when you import multiple elements separately, you could have more than one version of `BaseElement`. In that case you either have to know which one to import, or you have to import more than one of them, or you have to import each subclass and rely on inheritance of static properties, et cetera. This keeps it simple.

    This feature exists for backward compatibility with browser versions that don't support `await` [at module top level](https://caniuse.com/mdn-javascript_operators_await_top_level). In the process it coincidentally achieved full pre-[`await`](https://caniuse.com/mdn-javascript_operators_await) compatibility.

### Browser Compatibility
Compatibility across the browsers is good. The issues are with older versions of iOS/Safari. Currently, the **dist/** files support iOS 12.2 as the oldest version. [Support for iOS 12](https://apple.fandom.com/wiki/IOS_12#Supported_Devices) goes back to iPhone 5s, which is the first 64bit iPhone. See [here](https://github.com/sidewayss/html-elements/issues/10) and [here](https://github.com/sidewayss/html-elements/issues/8) for details of changes to the code for backwards compatibility. Support could go back as far as iOS 10.3, when support for custom HTML elements began, but the pre-12.2 issue requires changes to the template structure, which would create a backward compatibility issue within the project. Please submit a GitHub issue or pull request if you really need 10.3 support.

### Custom Elements Manifest
The root directory contains a `custom-elements.json` file for the full set of elements. It is auto-generated by [@custom-elements-manifest/analyzer](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/). The code does not use JSDoc, for now the docs are here. I don't use IntelliSense or anything else that might read the manifest, so please let me know if it's not working.

# The Elements
When there are corresponding/reflected DOM attributes and JavaScript properties, they will be written as:
- `attribute` / `property`
Property names are generally camelCase versions of the kebab-case attribute names. Most exceptions are clearly noted, others might be shorthand or shortened.

A quick glossary entry of note: A [boolean attribute](https://developer.mozilla.org/en-US/docs/Glossary/Boolean/HTML) is an attribute whose JavaScipt value is determined by `hasAttribute()` not `getAttribute()`.

## JavaScript Superclasses
These classes manage common attributes/properties and behaviors across elements. All the attributes/properties listed are inherited by the sub-classes.

### `class BaseElement extends HTMLElement`
`BaseElement` is the top level class. It is the parent class for `InputNum` and `MultiState`. See `base-element.js`.` It manages two global DOM attributes/properties:
- `disabled/disabled`
- `tabindex/tabIndes`

and one read-only property:
- `labels` is the same as [`HTMLInputElement.prototype.labels`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/labels) except that it returns an `Array` instead of a `NodeList`.

__NOTE:__ `HTMLElement` does not have a `disabled` attribute/property. It only has `tabindex`/`tabIndex`. `BaseElement` observes the `disabled` and `tabindex` attributes and exposes the properties. To do so requires the `disabled` attribute to manage `tabindex` too, because setting `disabled` *should* set `tabindex="-1"`. This is complicated when you set `tabindex` instead of relying on the default tab order. It's internally manageable except for this one case:
- If you are setting both `disabled` and `tabindex` in your HTML file, you *must* set `tabindex` before `disabled`.

This is because the DOM runs `attributeChangedCallback()` in a FIFO queue and when `disabled` sets the `tabindex` it goes to the end of the queue, after the `tabindex` setting in the HTML file.

*Also note:* Though it's allowed, setting `tabindex` to anything other than `0` or `-1` is sternly [recommended against by MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex) (*scroll down the page to the first Warning block*).

### `class MultiState`
`MultiState` (`multi-state.js`) is the parent class for `<state-btn>` and `MultiCheck`.
- `key-codes` / `keyCodes` - Internally it's a Set of [keycodes](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values) that act like a mouse click.  It converts `click` and `keyup` to `change` for compatibility with `<input type="checkbox">`. The attribute value is an array in JSON format. The property returns an array, and accepts anything array-like, including Set.

There is no `input` event, just `change`. For these types of `<input>` they're the same anyway. If you desire it for compatibility reasons, submit an issue or a pull request.

### `class MultiCheck`
`MultiCheck` (`multi-check.js`) is the parent class for `<check-box>` and `<check-tri>`.
- `label` / `label` contains the `innerHTML` for the built-in label element.
- `labelElement` (read-only property) returns the shadowDOM element with `id="label"`.
- `key-codes` defaults to `["Space"]`.

## `<check-box>`
I created `<check-box>` because I needed `<check-tri>` and I wanted all my checkboxes to look and act alike. It's the same as `<input type="checkbox">` except:
- The label is built-in through the `label` attribute (see `class MultiCheck` directly above here).
- It has a JavaScript `value` property that is identical to `checked`, in order to normalize it with other types of `<input>` and elements like `<select>` when iterating over or switching through elements.
- The checkbox graphics are in a separate template file, in SVG.

## `<check-tri>`
`<input type="checkbox">` has an `indeterminate` property (not an attribute) that is independent from `checked`. I don't have a use for that. I needed a third, "indeterminate" value in addition to, and mutually exclusive from, `true` and `false`. I wanted that value to cause `checked` to fall back to a user-determined default boolean value.  So `checked` remains boolean, but `value` can be `true`, `false`, or `null`. It's `null`, not `undefined`, because that's what `getAttribute()` returns when an attribute is unset.

To set `value` as an attribute, I use `"1"` for `true` and you must use `""` for `false`.

### Additional Attributes / Properties
- `default` / `default` is a boolean that sets the default value. If you don't use the `checked` property, then you have no need for it.
- `show-default` / `showDefault` is a boolean that shows or hides the default value as a read-only box to the left.

### multi-check.html
`<check-box>` and `<check-tri>` share a template file. The built-in template is  potentially reusable because the shapes are simple and they are 100% externally styleable with `::part`. This is the `<template>`:
```html
<template>
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
  <pre id="label" part="label"></pre>
</template>
```
It may be called a "checkbox", but `#box` is optional. Here it's a `<rect>`, but it can be any element or missing. In a tic-tac-toe design, where X is true and &cir; is false, there's no need for a box.

The other optional element with an `id` is `#false`. The built-in template doesn't use it because it's modeled on a standard checkbox, where false is an empty box. Technically, `#true` is not required either, but unless you're building a topsy-turvy app where "checked" is empty, you'll need to include it. For your result to make sense, you must define at least one of `#true|false` for `<check-box>`, and at least two of `#true|false|null` for `<check-tri>`.

`#null` and the entire `#default` group are only used by `<check-tri>`. If you only plan on using `<check-box>`, you can omit them.

`#true`, `#false`, and `#null` can be any SVG element type, and they must be inside a `<defs>`.

`#default` must be a `<g>`. `#default-mark` must be a `<use>` and a child of `#default`.

`#mark` is the "check mark". It must be a `<use>`. `#mark` and `#default-mark` must refer to `#false` in the template because both `checked` and `value` can be left unset in HTML and the JavaScript doesn't force a default reference.

`#label` can be any element type that displays text and is not focusable. This template uses `<pre>` along with a fixed-width font. `<label>` is not recommended because SVG elements are not [labelable](https://developer.mozilla.org/en-US/docs/Web/HTML/Content_categories#labelable).

The `part` attributes are all optional.

__NOTE:__ With this template, the element is a flex container, relying on the default `flex-direction:row`. I find that `align-items:center` works best for this combination of shapes, font, and font size because the box's bottom line aligns with the font baseline:
```css
check-box, check-tri {
  display: flex;
  align-items: center;
}
```
An alternative is to put a flex container inside the template, as the template for `<input-num>` does.

## `<state-btn>`
`<state-btn>` is an open-ended toggle, allowing you to define:
- Any number of states/values
- A separate graphic for each state
- The `click` / `Enter` toggle order
- Any other keyboard keys you want to use

### Additional Attributes / Properties (and a method)
- `states` / `states` is a two-dimensional array. As an attribute, the array is in JSON format. Array elements have this format:
    ```js
    [state, href, title]
    ```
    - `state` is the `value` attribute/property. It can be any string. Enumerated numbers are appropriate.
    - `href` is the root `id` attribute of the SVG image, without the `btn-` prefix.
    - `title` is the `title` attribute for this state. It defaults to the `href` value with the first letter capitalized.
- `auto-increment` / `auto` is a boolean that turns the auto-increment feature on/off. Auto-increment uses the declared order of `states` to cycle through the list of states, one `change` event at a time.
- `key-codes` defaults to `["Enter"]`.
- The `index` property sets the `value` attribute via an index into the states array, or gets the current value's array index.
- The `reset()` method is equivalent to: `element.index = 0;`

__NOTE:__ The default value on initial page load is the first state defined. I see no need to set the `value` attribute in HTML. The toggle order is completely user-controlled, so just make your default state the first one. If you *really need* to declare the value in HTML, you must do it after `states` or the value won't validate. I did not see the value in adding code to make it order-independent.

### state-btn.html
The built-in template is a pair of playback buttons: play and stop. It's not nearly as reusable as **multi-check.html**, but this is a more raw, open-ended kind of element. It requires customization to match its flexibility.

There is one template for all your buttons. One 'use' element and as many definitions as you need.

The templates requires a `<defs>` that contains an element with a matching `btn-id` for every state id you define. Here is some sample HTML, where the second element of each array is the state id:
```html
<state-btn id="play" class="row" states='[[0,"play"], [1,"pause"], [2,"resume"]]'></state-btn>
<state-btn id="stop" class="row" states='[[0,"stop"], [1,"reset"]]' disabled></state-btn>
```
To match this template:
```html
<template>
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

## `<input-num>`
Based on an informal survey and my own repeated frustrations, I came to the conclusion that `<input type="number"/>` isn't just [the worst HTML input](https://www.google.com/search?q=the+worst+html+input), it's a total waste of time. I needed an alternative. I spent over a decade programming for finance executives and financial analysts, so I got to know Microsoft Excel. Regardless of the brand, spreadsheets all use the same, well-established paradigm for inputting and displaying numbers. I decided to create a custom element that imitates a spreadsheet, while maintaining consistency with the default `<input type="number"/>` as implemented by the major browsers (which implement it somewhat inconsistently).

### Features
#### Spreadsheet Emulation
- It stores an underlying `Number` separate from the formatted display, which is a `String` that can contain non-numeric characters. Inputting via keyboard reveals the unformatted, underlying value.
- By default, the user confirms keyboard input by blurring the element (pressing `Tab`, `Shift+Tab`, or clicking elsewhere on the page), or via the `Enter` key or `OK` button. They cancel input via the `Esc` key or `Cancel` button. Cancelling reverts to the previous value. Setting the `blur-cancel` attribute cancels instead of confirming when blurring the element via tabbing or clicking elsewhere.
    __NOTE:__ The inner `<input>` is `type="text"`, which has built-in undo functionality in the browsers via `Ctrl+Z` or whatever the appropriate keystokes are in the native OS. So you can undo an unwanted commit within the same session, though your mileage may vary by browser/OS.
- By default, numbers are right-aligned, for keyboard input and formatted display. If you want to view a group of numbers in a vertical list, right-alignment is essential. Financials require it. The `no-align` attribute turns right-alignment off.
- Spreadsheets have their own number formatting lingo. `<input-num>` uses [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat), which is wrapped up in [locales](https://en.wikipedia.org/wiki/Locale_(computer_software)). `digits`,  `units`, `locale`, `currency`, `accounting`, and `notation` are the formatting attributes. I have not implemented any of the `Intl.NumberFormat` rounding options [yet](https://github.com/sidewayss/html-elements/issues/6).
- Keyboard input uses the locale's decimal marker, in order to be consistent with the formatted display.

#### `<input type="number"/>` Emulation and Variation
- The `max` and `min` attributes clamp values outside their range when committing a value. When a user enters an out-of-bounds value via keyboard, the `keyup` event adds the `"OoB"` class to the element. The sample CSS file sets `background-color` to yellow (warning) for `"OoB"` vs red (error) for `"NaN"`.
- Spinner buttons appear on hover (though not while inputting via keyboard).
- The `step` attribute defines the spin increment.
- Focus: you can activate the element via mouse, touch, or keyboard (`Tab` key). Clicking on the spinners activates the outer element and keeps the spinners visible until it loses focus. See **Keyboard Navigation** below for some differences.
- Validation: Unlike Chrome, it doesn't prevent the entry of any characters. In that respect it's more like Firefox/Safari. It allows you to enter any character, but it won't let you commit a non-number, which is defined as:
    ```js
    !Number.isNaN(val ? Number(val) : NaN)
    ```
    Where `val` is the attribute value: a string or `null`. It allows any number, but it's strict about the conversion, excluding `""`, `null`, and numbers with text prefixes or suffixes that `parseFloat()` converts.

    After you `keydown` a character that creates a non-number, the `keyup` event adds the `"NaN"` class to the element. Then if you try to confirm the erroneous value, it adds the `"beep"` class on top of that of that until `keyup` or `mouseup` removes it. Styling `.NaN` and `.beep` is up to you. The sample CSS uses red, the global default for errors.

#### Additional Features
- Optional (default is on) auto-width based on `max`, `min`, `digits`, `units`, `locale`, `currency`, `accounting`, and CSS font and padding properties.
- Optional (default is on) auto-scaling of the spinner and confirm buttons for different font sizes, which result in different element heights.
- Units suffixes, but WYSIWYG. I don't use `Intl.NumberFormat` units because I don't see a way to do exponents. If someone can explain that to me and convince me that they need it, I'll add it.
- `delay` and `interval` attributes/properties to control the timing of spinning.
- Separate button images for idle, hover, active, and full-speed spin.

#### Keyboard Navigation
- When you use the `Tab` key to activate the element, the outer element gets the focus, not the inner `<input>`. In this state you can spin via the up and down arrow keys. Pressing `Tab` again sets focus to the `<input>`. The next `Tab` blurs the element entirely.
- When you use `Shift+Tab` to activate the element, the `<input>` gets the focus. The next `Shift+Tab` activates the outer element. The next one blurs the element.

### HTML Attributes / JavaScript Properties
There are several inverted boolean attributes / properties, where the attribute value is the opposite of the property value. They are all for turning features off. The negative makes sense for the boolean attribute name, but it's clumsy for the property. The attribute names all start with `no-`. The default is always:
- attribute = unset (null)
- property = `true`

#### DOM Attributes
Property name same as attribute. String as attribute / Number as property.
- `max` is the enforced maximum value, defaults to `Infinity`.
- `min` is the enforced minimum value, defaults to `-Infinity`.
- `step` is the the amount to increment or decrement when spinning, defaults to the smallest number defined by the `digits` attribute, e.g. when `digits` is 3, `step` defaults to 0.001.
- `value` is the unformatted, underlying number.

#### Behavior
- `blur-cancel` / `blurCancel` is a boolean that cancels keyboard input when the user blurs the element via `Tab`, `Shift+Tab`, or by clicking elsewhere on the page. The default behavior is to confirm the value. Does not affect the behavior of the <Enter> or <Esc> keys or the OK or Cancel buttons.
- `no-keys` / `keyboards` disables/enables keyboard input. Combining it with `no-spin` effectively disables the element.
- `no-resize` / `autoResize` used to disable the `resize()` function while loading the page or setting a batch of element properties.

#### Spinner
- `delay` / `delay` is the number of milliseconds between `mousedown` and the start of spinning.
- `interval` / `interval` is the number of milliseconds between steps when spinning.
- `no-spin` / `spins` controls the diplay of the spinner on hover

#### Element Formatting
- `no-confirm` / `confirms` controls the diplay of the confirm/cancel buttons on hover during keyboard input.
- `no-scale` / `autoScale` scales (or not) the buttons to match font size.
- `no-width` / `autoWidth` auto-determines the width (or not).
- `no-align` / `autoAlign` auto-aligns left/right and auto-adjusts `padding-right` for right-alignment.

#### Number Formatting
- `digits` / `digits` is the number of decimal places to display, as in `number.toFixed(digits)`.
- `units` / `units` are the string units to append to the formatted text.
- `locale` / `locale` is the locale string to use for formatting. If set to "" it uses the users locale: [`navigator.language`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/language). If set to null (removed), formatting is not based on locale. It uses the [`locales`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#locales) option, but only sets one locale.
- `currency` / `currency` when set, sets [`style`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#style) = `"currency"` and [currency](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#currency_2) = the attribute value. It is only relevant when `locale` is set. [`currencyDisplay`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#currencydisplay) is always set to `"narrowSymbol"`.
- `accounting` / `accounting` is a boolean that toggles [`currencySign`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#currencysign) = `"accounting"`, which in many (but not all) locales encloses negative numbers in parentheses. Only relevent when `currency` and `locale` are set.
- `notation` / `notation` sets [`notation`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#notation) to the attribute value. Defaults to `"standard"`. *Untested! I don't understand the implications of the various options.*
- `any-decimal` / `anyDecimal` is a boolean. According to the [General Conference on Weights and Measures](https://www.bipm.org/en/committees/cg/cgpm/22-2003/resolution-10), across all locales the decimal marker is represented by one of only two characters: comma `,` and period `.`. Many countries officially use comma, but unofficially the de facto standard is the Anglo format of period for decimals and comma for thousands. It appears in advertisements, supermarket price tags, and everywhere else in daily life, even legal documents.
    - unset / `false` enforces the locale's decimal character (which defaults to `.` when `locale` is unset).
    - `""` / `true` allows either `,` or `.` regardless of locale.

__NOTE:__ When you combine a currency symbol with units, it displays as currency per unit. For example:
```js
inputNum.locale   = "es-MX";  // Español, Mexico
inputNum.currency = "MXN";    // Mexican Peso
inputNum.units    = "kg";     // kilogram
```
displays 100 as: **$100/kg**

#### Miscellaneous JavaScript Properties and Methods:
- `text` (read-only) is the formatted text value, including currency, units, etc.
- `useLocale` (read-only) returns `true` if `locale` is set.
- `validate` is a `Function` for custom validation and/or transformation.
- `resize(forceIt)` resizes the element. When `autoResize` is `true`, it runs automatically after setting any attribute that affects the element's width or alignment. When `autoResize` is `false`, you must set `forceIt` to `true` or the function won't run.  Call it after you change CSS font properties, for example.

### Events
The only event that you can listen to is `change`. I don't see a need for any other events. If you need some, e.g. `input`, `keydown`, or `keyup` attached to the inner `<input type="text"/>`, then please submit an issue or a pull request.

The only event I've considered adding is an `endspin` event for when spinning ends. It would fire on `mouseup` or `keyup` when spinning. It could be useful for throttling external changes based on the value.

The `change` event fires every time the value changes:
- When the user confirms keyboard input.
- When the spinner changes the value. Every step is auto-confirmed.

When the user inputs via the spinner, the event object has two additional properties:
- `isSpinning` is set to `true`.
- `isUp` is `true` when it's spinning up (incrementing) and `false` or `undefined` when spinning down (decrementing).

The `validate` property allows you to insert your own validation and/or transformation function before the value is committed and the `change` event is fired. Because it runs before committing the value, it runs before the internal `!isNaN()` validation. The function takes two arguments: `value` and `isSpinning`:
- `value` is a string (keyboard input) or a number (spinning)
- `isSpinning` is a boolean indicating whether the user is inputting via keyboard (`false`) or the spinner (`true`).

To indicate an invalid value, return `false`. Otherwise return the value itself, transformed or not. Transforms are for those rare occasions when you want to round to the nearest prime number, or whatever transformation or restriction that can't be defined solely by `max` and `min`.

### Styling
You can obviously style the element itself, but you can also style some of its parts via the `::part` pseudo-element. Remember that `::part` overrides the shadow DOM elements' style. You must use `!important` if you want to override `::part`.

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
Those devices are all touchscreen, and focusing the element will focus the `<input>`, which will display the appropriate virtual keyboard. Touch and hold has system meanings on touch devices, which conflicts with spinning. And at `font-size:1rem` the buttons are smaller than recommended for touch. So unless you create oversized buttons or use a much larger font size, it's best not to display them at all.

__NOTE:__ Auto-sizing only works if the element is displayed. If the element or any of it's ancestors is set to `display:none`, the element and its shadow DOM have a width and height of zero. During page load, don't set `display:none` until after your elements have resized.

__NOTE:__ If you load the font for your element in JavaScript using `document.fonts.add()`, it will probably not load before the element. So `resize()` won't be using the correct font, and you'll have to run it again after the fonts have loaded.  Something like this:
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
If you are doing this and want to be more efficient, set the `no-resize` attribute on the element:
```html
<input-num no-resize></input-num>
```
Then turn on the `autoResize` property prior to calling `resize()` :
```js
for (const elm of document.getElementsByTagName("input-num")) {
    elm.autoResize = true;
    elm.resize();
}
```

### input-num.html
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
&#x2020; *`spin-top` and `spin-bot` are the full-speed spin images, used after `delay` expires*