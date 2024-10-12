# `html-elements` contains four custom HTML elements
- `<check-box>` emulates `<input type="checkbox">` plus additional features
- `<check-tri>` is a three-state checkbox, integrating [`indeterminate`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/indeterminate) as a third state
- `<state-button>` is a multi-state button with user-defined states and toggle order
- `<in-number>` is a numeric input that emulates a spreadsheet

## `<check-box>`

## `<check-tri>`

## `<state-button>`

## `<in-number>`
`<input type="number">` emulation:
- The `max` and `min` attributes prevent input outside their range.
- Spinner buttons appear on hover (but not while inputting via keyboard).
- The `step` attribute controls the amount of each single click on a spinner.
- Validation of contents. Unlike Chrome, it doesn't prevent the entry of any characters. It's more like Firefox/Safari. It allows you to enter anything, but you can apply an "invalid" style if the contents are not a number.

Spreadsheet emulation:
- Storing an underlying Number separate from the formatted display, which is a String that includes non-numeric characters. Inputting via keyboard/pad reveals the underlying, unformatted value.
- Keyboard input requires user confirmation via the `Enter` key or an `OK` button. The user can cancel the input via the `Esc` key, a `Cancel` button, or by setting the focus elsewhere. Cancelling reverts to the previous value.
- Spreadsheets have their own number formatting lingo. JavaScript provides [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat), which is wrapped up [locales](https://en.wikipedia.org/wiki/Locale_(computer_software)).<br>`<in-number>` has `data-digits`, `data-locale`, `data-currency`,`data-accounting`, and `data-units` attributes for formatting.

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