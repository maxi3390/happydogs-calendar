# MODIFIED: Backend / Pets

## ADDED Requirements

### Requirement: Pet incompatibility rules SHALL be persisted as a backend model

The system SHALL provide a `PetIncompatibility` model storing per-pet-pair incompatibility rules, exposed via a REST API under `/api/pet-incompatibilities/`. Each rule SHALL reference two distinct pets and carry a free-text `reason`.

The pair SHALL be order-independent: a rule between Luna and Milo and a rule between Milo and Luna SHALL be the **same row**. Implementation SHALL store the lower pet id as `pet1` and the higher as `pet2` and enforce `unique_together = ('pet1', 'pet2')`.

The serializer SHALL reject self-pairs (`pet1 == pet2`) at validation time.

Both `pet1` and `pet2` SHALL cascade-delete with their owning `Pet` row.

#### Scenario: Create, list, retrieve, update, delete

- GIVEN an authenticated user
- WHEN they POST a new rule between two pets
- THEN the rule SHALL be stored with `pet1_id < pet2_id` regardless of POST order
- AND subsequent `GET /api/pet-incompatibilities/` SHALL include the rule
- AND `GET /api/pet-incompatibilities/{id}/` SHALL return it
- AND `PATCH` SHALL update the `reason`
- AND `DELETE` SHALL remove it

#### Scenario: Order-independent uniqueness

- GIVEN a rule already exists between pets A and B
- WHEN a client POSTs a second rule between B and A (or A and B again)
- THEN the request SHALL fail with HTTP 400 (unique constraint violation, surfaced as a serializer error)

#### Scenario: Self-pair rejected

- GIVEN an authenticated user
- WHEN they POST a rule with `pet1 == pet2`
- THEN the request SHALL fail with HTTP 400
- AND the response SHALL surface a serializer-level error explaining a pet cannot be incompatible with itself

#### Scenario: Cascade on pet delete

- GIVEN an existing rule between pets A and B
- WHEN pet A is deleted
- THEN the rule SHALL be deleted automatically
- AND the rule SHALL NOT appear in any subsequent list call

### Requirement: `Pet.is_compatible_with(other)` SHALL consult persisted custom rules

`Pet.is_compatible_with(other) → (bool, list[str])` SHALL evaluate every applicable hardcoded rule AND query `PetIncompatibility` for any persisted rule between the two pets. Each triggered hardcoded rule's reason and any persisted rule's `reason` SHALL be appended to the returned list. The pet pair SHALL be considered incompatible (returned `bool` is `False`) if at least one rule (hardcoded or persisted) fires.

#### Scenario: Custom rule fires alongside hardcoded rules

- GIVEN two pets where rule 1 (aggressive) already fires
- AND a persisted custom rule exists between them with `reason = "Vet advised separation"`
- WHEN `pet.is_compatible_with(other)` is called
- THEN the returned `reasons` list SHALL contain BOTH the rule-1 reason AND `"Vet advised separation"`
- AND the returned bool SHALL be `False`

#### Scenario: Custom rule alone makes the pair incompatible

- GIVEN two pets that pass every hardcoded rule (would be reported compatible)
- AND a persisted custom rule exists between them
- WHEN `pet.is_compatible_with(other)` is called
- THEN the returned bool SHALL be `False`
- AND the returned `reasons` SHALL contain only the custom rule's reason

### Requirement: Same-species same-sex highly-dominant pets rule (rule 6)

`Pet.is_compatible_with(other)` SHALL emit a new "Two same-species same-sex highly-dominant pets" warning when ALL of the following are true:

- `self.species == other.species`
- `self.sex == other.sex`
- `self.dominance_level >= 7 AND other.dominance_level >= 7`

This rule SHALL be evaluated independently of rule 2 ("two highly dominant pets, both `> 7`"). Both reasons MAY appear in the result list when both conditions are met.

#### Scenario: Rule 6 fires at the boundary

- GIVEN two dogs of the same sex, both with `dominance_level = 7`
- WHEN `pet.is_compatible_with(other)` is called
- THEN rule 6 SHALL fire (both dominance levels are `>= 7`, same species, same sex)
- AND rule 2 SHALL NOT fire (rule 2 requires both `> 7`)
- AND the returned `reasons` SHALL contain exactly one entry — rule 6's text

#### Scenario: Rule 6 and rule 2 fire together

- GIVEN two dogs of the same sex, both with `dominance_level = 9`
- WHEN `pet.is_compatible_with(other)` is called
- THEN rule 2 SHALL fire (both `> 7`)
- AND rule 6 SHALL fire (same species + same sex + both `>= 7`)
- AND the returned `reasons` SHALL contain BOTH entries

#### Scenario: Rule 6 does not fire across species

- GIVEN a dog and a cat, both with `dominance_level = 9` and same sex
- WHEN `pet.is_compatible_with(other)` is called
- THEN rule 6 SHALL NOT fire (different species)
- AND rule 2 MAY still fire if it would on its own merits
