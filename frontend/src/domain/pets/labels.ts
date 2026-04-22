/**
 * Translation helpers for pet enum values.
 *
 * `species` may be a custom, user-typed value when the `custom_pet_species`
 * feature flag is on, so we only translate known canonical keys and fall
 * back to the raw value otherwise. Other enums (temperament, size, sex) are
 * closed sets and can always be translated.
 */

type TFn = (key: string, params?: Record<string, string | number>) => string;

const CANONICAL_SPECIES = new Set(['dog', 'cat', 'bird', 'rabbit', 'other']);

export function translateSpecies(t: TFn, species: string): string {
  if (!species) return '';
  return CANONICAL_SPECIES.has(species) ? t(`pet.speciesOptions.${species}`) : species;
}

export function translateTemperament(t: TFn, temperament: string): string {
  if (!temperament) return '';
  return t(`pet.temperamentOptions.${temperament}`);
}

export function translateSize(t: TFn, size: string): string {
  if (!size) return '';
  return t(`pet.sizeOptions.${size}`);
}

export function translateSex(t: TFn, sex: string): string {
  if (!sex) return '';
  return t(`pet.sexOptions.${sex}`);
}
