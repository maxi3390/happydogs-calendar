# Delta for Frontend Pets

## MODIFIED Requirements

### Requirement: PetForm Renders Without Errors

The PetForm component SHALL render and function without JavaScript runtime errors in both create and edit modes.

#### Scenario: PetForm opens in create mode

- GIVEN the user clicks "Add pet"
- WHEN the pet form modal opens
- THEN the form SHALL render successfully including the profile picture upload section
- AND no undefined-state errors SHALL occur

#### Scenario: User selects a profile picture during creation

- GIVEN the PetForm is open in create mode
- WHEN the user selects an image file for the profile picture
- THEN the image SHALL be stored in local state and previewed
- AND on form submission, the image SHALL be sent together with other pet data in a single multipart request
