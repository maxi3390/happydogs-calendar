# MODIFIED: Frontend / Pets

## ADDED Requirements

### Requirement: Pet Weight Input Uses Calculator-Style Entry

The Pet form SHALL render the `weight` field as a fixed-format `NN.NN` kilograms input whose digits build up from the right. Keystrokes shift existing digits left; `Backspace` and `Delete` shift them right. The displayed string grows past two integer digits only when the value itself grows past `99.99`.

The component SHALL clamp at the backend limit of `9999.99` kg (matching `DecimalField(max_digits=6, decimal_places=2)`). Digits that would push the internal value past `999999` cents SHALL be silently ignored.

#### Scenario: Typing digits from an empty state

- GIVEN the weight field is empty (`00.00`)
- WHEN the operator types `6` then `5` then `4` then `3` then `2`
- THEN the display SHALL progress as `00.06` → `00.65` → `06.54` → `65.43` → `654.32`

#### Scenario: Backspace shifts right

- GIVEN the weight field shows `654.32`
- WHEN the operator presses `Backspace`
- THEN the display SHALL become `65.43`

#### Scenario: Clamping at the backend limit

- GIVEN the weight field shows `9999.99`
- WHEN the operator types any digit
- THEN the display SHALL remain `9999.99` (the extra digit is discarded)

#### Scenario: Zero maps to null in form data

- GIVEN the operator clears the field back to `00.00` via repeated Backspace
- WHEN the form reads `formData.weight`
- THEN the value SHALL be `null` (preserving the "no weight set" state)

#### Scenario: Non-digit characters are ignored

- GIVEN the weight field has focus
- WHEN the operator presses a letter or symbol key
- THEN the display SHALL be unchanged and the browser SHALL NOT insert the character

#### Scenario: Paste extracts digits

- GIVEN the weight field has focus
- WHEN the operator pastes `"12.34 kg"`
- THEN the component SHALL treat the paste as typing `1`, `2`, `3`, `4` in sequence and the display SHALL reflect the resulting value (subject to the clamp)
