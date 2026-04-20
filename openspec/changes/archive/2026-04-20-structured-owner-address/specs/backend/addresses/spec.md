# Delta for Backend Addresses

## ADDED Requirements

### Requirement: Reusable Address Abstract Model

The system SHALL provide an abstract Django model `Address` in `backend/domain/addresses/models.py` that contributes five optional address fields to any concrete model that inherits from it.

The fields SHALL be: `street`, `city`, `state`, `province`, `country`. All fields SHALL be optional (`blank=True`) strings with reasonable maximum lengths. The abstract model SHALL declare `class Meta: abstract = True` so that Django does not create a database table for it directly.

#### Scenario: Mixin contributes fields to a concrete model

- GIVEN a concrete Django model `Foo` that inherits `Address`
- WHEN the model's table is created by a migration
- THEN the table SHALL include columns for `street`, `city`, `state`, `province`, and `country`
- AND no standalone `address` table SHALL exist in the database

#### Scenario: Fields are optional

- GIVEN a concrete model `Foo` that inherits `Address`
- WHEN a `Foo` instance is created and saved without providing any address field
- THEN the save SHALL succeed
- AND each address field SHALL default to an empty string
