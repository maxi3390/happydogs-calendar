# Delta for UI Components

## ADDED Requirements

### Requirement: Toast Component

The system SHALL provide a toast notification component to deliver transient, non-blocking feedback to users. Toasts SHALL be themeable, accessible, and available globally through a React context provider.

#### Scenario: Triggering a success toast

- Given a component consumes the `useToast` hook
- When the component calls `toast(message, { variant: 'success' })`
- Then the system SHALL render a success-variant toast in the top-right corner of the viewport
- And the toast SHALL display the provided message

#### Scenario: Triggering an error toast

- Given a component consumes the `useToast` hook
- When the component calls `toast(message, { variant: 'error' })`
- Then the system SHALL render an error-variant toast with a distinct destructive color
- And the toast SHALL display the provided message

#### Scenario: Auto-dismissal

- Given a toast has been rendered
- When no user action is taken
- Then the toast SHALL auto-dismiss after approximately 4 seconds

#### Scenario: Manual close

- Given a toast is visible
- When the user activates the toast's close control
- Then the toast SHALL be dismissed immediately

#### Scenario: Stacking multiple toasts

- Given one toast is already visible
- When another `toast(...)` call is made before the first dismisses
- Then both toasts SHALL be visible stacked vertically
- And each SHALL dismiss independently based on its own timer or manual close

#### Scenario: Layering above modals

- Given a modal dialog is open with a backdrop at the app's modal z-index
- When a toast is rendered
- Then the toast SHALL appear above the modal and its backdrop so it remains visible

#### Scenario: Provider wraps the app

- Given the application root layout
- When the layout renders
- Then the `ToastProvider` SHALL wrap the application tree so that any descendant component can call `useToast`
- And the provider SHALL be placed inside the translation provider so toasts can use localized strings

#### Scenario: Accessibility

- Given a toast is rendered
- When assistive technologies inspect the page
- Then the toast container SHALL have a live region role (`status` or `alert`) so screen readers announce new toasts
- And the close control SHALL be a focusable button with an accessible label
