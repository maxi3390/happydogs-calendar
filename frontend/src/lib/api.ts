export type { Owner, OwnerWithPets, OwnerFormData, OwnerListItem } from '@/domain/owners/types';
export type { Pet, PetListItem, PetFormData, PetCompatibilityResult } from '@/domain/pets/types';
export type { Vaccination, VaccinationType } from '@/domain/vaccinations/types';
export type { MedicalNote, MedicalNoteFormData } from '@/domain/medical-notes/types';
export type {
  Schedule,
  ScheduleFormData,
  Conflict,
  ConflictCheckResult,
  BatchScheduleFormData,
  BatchScheduleResult,
  DailyCountResult,
} from '@/domain/schedules/types';
export type { DocumentItem } from '@/domain/documents/types';
export type { NurserySetting } from '@/domain/settings/types';
export type { Vet, VetFormData, VetListItem } from '@/domain/vets/types';
export type { ImportSummary, ImportFormat } from '@/domain/data-portability/types';
export type { FeatureFlag, FeatureFlagsMap } from '@/domain/feature-flags/types';

import { ownersApi } from '@/domain/owners/api';
import { petsApi } from '@/domain/pets/api';
import { vaccinationTypesApi } from '@/domain/vaccinations/api';
import { medicalNotesApi } from '@/domain/medical-notes/api';
import { schedulesApi } from '@/domain/schedules/api';
import { documentsApi } from '@/domain/documents/api';
import { nurserySettingsApi } from '@/domain/settings/api';
import { usersApi } from '@/domain/users/api';
import { vetsApi } from '@/domain/vets/api';
import { dataPortabilityApi } from '@/domain/data-portability/api';
import { featureFlagsApi } from '@/domain/feature-flags/api';

export const api = {
  owners: ownersApi,
  pets: petsApi,
  vaccinationTypes: vaccinationTypesApi,
  medicalNotes: medicalNotesApi,
  schedules: schedulesApi,
  nurserySettings: nurserySettingsApi,
  documents: documentsApi,
  users: usersApi,
  vets: vetsApi,
  dataPortability: dataPortabilityApi,
  featureFlags: featureFlagsApi,
};
