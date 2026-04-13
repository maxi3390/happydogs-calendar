# Settings Specification

## Purpose

Provide an administrative settings page where authenticated users can configure daily booking limits, define pet incompatibility rules stored locally in the browser, and manage vaccination types. Each configuration section SHALL include contextual help information explaining its purpose.

## Requirements

### Requirement: Authentication Guard

The settings page MUST be accessible only to authenticated users. Unauthenticated visitors SHALL be prevented from viewing or modifying any settings.

#### Scenario: Authenticated user accesses settings

- Given the user is authenticated
- When the user navigates to the settings page
- Then the settings page SHALL be displayed with all configuration sections visible

#### Scenario: Unauthenticated user accesses settings

- Given the user is not authenticated
- When the user attempts to navigate to the settings page
- Then the user SHALL be redirected to the login page
- And the settings page content SHALL NOT be rendered

### Requirement: Daily Booking Limit Management

The settings page SHALL provide controls for viewing and updating the maximum number of bookings allowed per day. The current limit SHALL be displayed in an input field, and a save action SHALL persist the new value with success feedback.

#### Scenario: Display current booking limit

- Given the user is on the settings page
- When the page loads
- Then an input field SHALL display the current daily booking limit value retrieved from the server

#### Scenario: Save a new booking limit

- Given the user is on the settings page
- And the input field contains a new booking limit value
- When the user activates the save action
- Then the new value SHALL be sent to the server for persistence
- And a success message SHALL be displayed confirming the update

#### Scenario: Booking limit persists across page loads

- Given the user has previously saved a booking limit value
- When the user navigates away from and back to the settings page
- Then the input field SHALL display the most recently saved booking limit value

#### Scenario: Info box for booking limit section

- Given the user is on the settings page
- When the booking limit section is visible
- Then an informational help box SHALL be displayed explaining the purpose and effect of the daily booking limit

### Requirement: Pet Incompatibility Rule Creation

The settings page SHALL allow users to define incompatibility rules between two pets. Each rule specifies two pets that cannot be booked together along with a reason. Rules SHALL be stored in browser local storage, not on the server.

#### Scenario: Add a new incompatibility rule

- Given the user is on the settings page
- And the user has selected two different pets from the available pet selectors
- And the user has entered a reason for the incompatibility
- When the user confirms the addition of the rule
- Then a new incompatibility rule SHALL be created with the selected pets and reason
- And the rule SHALL be persisted in browser local storage
- And the rule SHALL appear in the list of active incompatibility rules

#### Scenario: Prevent duplicate incompatibility rules

- Given an incompatibility rule already exists between Pet A and Pet B
- When the user attempts to add another rule between Pet A and Pet B
- Then the system SHALL prevent the duplicate rule from being created
- And the user SHALL be informed that a rule already exists for that pair

#### Scenario: Prevent same-pet incompatibility rules

- Given the user is on the settings page
- When the user selects the same pet in both pet selectors
- Then the system SHALL prevent the rule from being created
- And the user SHALL be informed that a pet cannot be incompatible with itself

#### Scenario: Filter pet selectors to dogs only

- Given the user is on the settings page
- When the pet selectors for incompatibility rules are displayed
- Then only pets classified as dogs SHALL be available for selection

#### Scenario: Info box for incompatibility rules section

- Given the user is on the settings page
- When the incompatibility rules section is visible
- Then an informational help box SHALL be displayed explaining the purpose and behavior of pet incompatibility rules
- And the help box SHOULD clarify that rules are stored locally in the browser

### Requirement: Pet Incompatibility Rule Display

Active incompatibility rules SHALL be displayed in a visual list so the user can review all currently defined rules.

#### Scenario: Display active incompatibility rules

- Given one or more incompatibility rules have been defined
- When the user views the incompatibility rules section
- Then each rule SHALL be displayed showing both pet names and the reason for incompatibility

#### Scenario: No incompatibility rules defined

- Given no incompatibility rules have been defined
- When the user views the incompatibility rules section
- Then the list SHALL be empty or display an appropriate message indicating no rules exist

### Requirement: Pet Incompatibility Rule Deletion

The user SHALL be able to remove existing incompatibility rules. Deleted rules SHALL be removed from browser local storage.

#### Scenario: Delete an existing incompatibility rule

- Given one or more incompatibility rules are displayed
- When the user activates the delete action on a specific rule
- Then the rule SHALL be removed from the active rules list
- And the rule SHALL be removed from browser local storage

#### Scenario: Delete the last remaining rule

- Given exactly one incompatibility rule exists
- When the user deletes that rule
- Then the rules list SHALL become empty
- And browser local storage SHALL no longer contain any incompatibility rules

### Requirement: Incompatibility Rules Local Persistence

All incompatibility rules SHALL be stored exclusively in browser local storage. Rules MUST survive page reloads but are not shared across devices or browsers.

#### Scenario: Rules persist after page reload

- Given the user has created one or more incompatibility rules
- When the user reloads the settings page
- Then all previously created rules SHALL be restored from local storage and displayed

#### Scenario: Rules are isolated to the browser

- Given the user has created incompatibility rules in one browser
- When the user opens the settings page in a different browser or device
- Then the incompatibility rules from the original browser SHALL NOT be present

### Requirement: Vaccination Type Creation

The settings page SHALL allow users to create new vaccination types by providing a name and a label for each type.

#### Scenario: Create a new vaccination type

- Given the user is on the settings page
- And the user has entered a name and label for a new vaccination type
- When the user confirms the creation
- Then a new vaccination type SHALL be created with the provided name and label
- And the new type SHALL appear in the list of vaccination types

#### Scenario: Info box for vaccination types section

- Given the user is on the settings page
- When the vaccination types section is visible
- Then an informational help box SHALL be displayed explaining the purpose and usage of vaccination types

### Requirement: Vaccination Type Toggle

Each vaccination type SHALL have an enabled or disabled state that the user can toggle. Disabled types SHOULD still be visible but clearly distinguished from enabled types.

#### Scenario: Enable a disabled vaccination type

- Given a vaccination type is currently disabled
- When the user toggles the type to enabled
- Then the vaccination type SHALL be marked as enabled
- And the visual state SHALL update to reflect the enabled status

#### Scenario: Disable an enabled vaccination type

- Given a vaccination type is currently enabled
- When the user toggles the type to disabled
- Then the vaccination type SHALL be marked as disabled
- And the visual state SHALL update to reflect the disabled status

### Requirement: Vaccination Type Deletion

The user SHALL be able to delete vaccination types that are no longer needed.

#### Scenario: Delete a vaccination type

- Given one or more vaccination types exist
- When the user activates the delete action on a specific vaccination type
- Then the vaccination type SHALL be removed from the list

#### Scenario: Delete the last remaining vaccination type

- Given exactly one vaccination type exists
- When the user deletes that type
- Then the vaccination types list SHALL become empty
