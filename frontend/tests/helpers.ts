import { Page } from '@playwright/test';

const EN_TRANSLATIONS = {
  app: { name: 'Happy Pet Nursery', tagline: 'Schedule Management System' },
  nav: {
    owners: 'Owners',
    pets: 'Pets',
    settings: 'Settings',
    calendar: 'Calendar',
    newSchedule: 'New Schedule',
  },
  calendar: { month: 'Month', week: 'Week', today: 'Today', thisWeek: 'This Week', weekOf: 'Week of', more: '+{count} more', showLess: 'Show less' },
  schedule: {
    title: 'Schedule',
    newSchedule: 'New Schedule',
    editSchedule: 'Edit Schedule',
    updateSchedule: 'Update Schedule',
    selectPet: 'Select Pet',
    startDate: 'Start Date',
    endDate: 'End Date',
    startTime: 'Start Time',
    endTime: 'End Time',
    dailyStartTime: 'Daily Start Time',
    dailyEndTime: 'Daily End Time',
    createSchedule: 'Create Schedule',
    samePetOverlap: {
      title: 'This pet is already scheduled',
      description: '{name} already has a schedule for {start} → {end}.',
      editLink: 'Edit existing schedule',
    },
  },
  pet: {
    title: 'Pets',
    description: 'Manage all registered pets in the nursery.',
    addPet: 'Add Pet',
    name: 'Name',
    species: 'Species',
    temperament: 'Temperament',
    sex: 'Sex',
    dominance: 'Dominance Level',
    vaccinations: 'Vaccinations',
    addVaccination: 'Add Vaccination',
    speciesOptions: { dog: 'Dog', cat: 'Cat' },
    temperamentOptions: { calm: 'Calm', playful: 'Playful', aggressive: 'Aggressive' },
    sexOptions: { male: 'Male', female: 'Female' },
  },
  owner: { title: 'Owners', addOwner: 'Add Owner', addPet: 'Add Pet' },
  admin: {
    title: 'User Management',
    description: 'Manage users, roles, and access control',
    addUser: 'Add User',
    searchPlaceholder: 'Search users...',
    stats: { total: 'Total Users', admins: 'Admins', active: 'Active' },
    table: { user: 'User', role: 'Role', status: 'Status', created: 'Created', actions: 'Actions' },
    roleOptions: { user: 'User', admin: 'Admin' },
    statusOptions: { active: 'Active', inactive: 'Inactive' },
    editUser: 'Edit user',
    deleteUser: 'Delete user',
    resetPassword: 'Reset password',
    resetPasswordTitle: 'Reset password for {name}',
    resetPasswordSuccess: 'Password reset.',
  },
  settings: {
    title: 'Settings',
    incompatibilities: 'Pet Incompatibilities',
    incompatibilityInfo: 'Define custom incompatibility rules between specific pets.',
    addRule: 'Add Rule',
    pet1: 'First Pet',
    pet2: 'Second Pet',
    reason: 'Reason',
    vaccinationTypes: 'Vaccination Types',
    addVaccinationType: 'Add Type',
    vaxName: 'Internal Name',
    vaxLabel: 'Display Label',
    systemRules: 'System Conflict Detection Rules',
  },
  public: { welcome: 'Welcome to Happy Pet Nursery', availabilityCalendar: 'Availability Calendar' },
  auth: {
    signIn: 'Sign In',
    signUp: 'Sign Up',
    signOut: 'Sign Out',
    signInTitle: 'Sign in to your account',
    signUpTitle: 'Create your account',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    backToHome: 'Back to home',
    changePassword: 'Change password',
    email: 'Email',
  },
  profile: {
    title: 'Profile',
    subtitle: 'Manage your account.',
    account: 'Account',
    changePassword: 'Change password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmNewPassword: 'Confirm new password',
    savePassword: 'Save new password',
    saving: 'Saving…',
    success: 'Password changed successfully.',
    errors: {
      currentRequired: 'Current password is required.',
      newRequired: 'New password is required.',
      minLength: 'Password must be at least 8 characters.',
      mismatch: 'Passwords do not match.',
    },
  },
  common: { cancel: 'Cancel' },
};

const ES_TRANSLATIONS = {
  app: { name: 'Guardería Happy Dogs', tagline: 'Sistema de Gestión de Horarios' },
  nav: {
    owners: 'Dueños',
    pets: 'Mascotas',
    settings: 'Configuración',
    calendar: 'Calendario',
    admin: 'Administración',
    uiSystem: 'Sistema de UI',
    menu: 'Menú',
    newSchedule: 'Nuevo Horario',
  },
  calendar: { month: 'Mes', week: 'Semana', today: 'Hoy', thisWeek: 'Esta Semana', weekOf: 'Semana de', more: '+{count} más', showLess: 'Mostrar menos' },
  schedule: {
    title: 'Horario',
    newSchedule: 'Nuevo Horario',
    selectPet: 'Seleccionar Mascota',
    startDate: 'Fecha de Inicio',
    endDate: 'Fecha de Fin',
    startTime: 'Hora de Inicio',
    endTime: 'Hora de Fin',
    dailyStartTime: 'Hora de Inicio Diaria',
    dailyEndTime: 'Hora de Fin Diaria',
    createSchedule: 'Crear Horario',
  },
  pet: {
    title: 'Mascotas',
    description: 'Gestiona todas las mascotas registradas en la guardería.',
    addPet: 'Agregar Mascota',
    name: 'Nombre',
    species: 'Especie',
    temperament: 'Temperamento',
    sex: 'Sexo',
    dominance: 'Nivel de Dominancia',
    vaccinations: 'Vacunas',
    addVaccination: 'Agregar Vacuna',
    saveAndAddAnother: 'Guardar y Agregar Otra',
    addedSuccessfully: '{name} agregada con éxito',
    speciesOptions: { dog: 'Perro', cat: 'Gato' },
    temperamentOptions: { calm: 'Tranquilo', playful: 'Juguetón', aggressive: 'Agresivo' },
    sexOptions: { male: 'Macho', female: 'Hembra' },
  },
  owner: { title: 'Dueños', addOwner: 'Agregar Dueño', addPet: 'Agregar Mascota' },
  admin: {
    title: 'Gestión de Usuarios',
    description: 'Gestiona usuarios, roles y control de acceso',
    addUser: 'Agregar Usuario',
    searchPlaceholder: 'Buscar usuarios...',
    stats: { total: 'Total de Usuarios', admins: 'Administradores', active: 'Activos' },
    table: { user: 'Usuario', role: 'Rol', status: 'Estado', created: 'Creado', actions: 'Acciones' },
    roleOptions: { user: 'Usuario', admin: 'Administrador' },
    statusOptions: { active: 'Activo', inactive: 'Inactivo' },
  },
  settings: {
    title: 'Configuración',
    incompatibilities: 'Incompatibilidades de Mascotas',
    incompatibilityInfo: 'Define reglas de incompatibilidad personalizadas entre mascotas específicas.',
    addRule: 'Agregar Regla',
    pet1: 'Primera Mascota',
    pet2: 'Segunda Mascota',
    reason: 'Razón',
    vaccinationTypes: 'Tipos de Vacunas',
    addVaccinationType: 'Agregar Tipo',
    vaxName: 'Nombre Interno',
    vaxLabel: 'Etiqueta',
    systemRules: 'Reglas de Detección de Conflictos del Sistema',
  },
  public: { welcome: 'Bienvenido a Guardería Happy Dogs', availabilityCalendar: 'Calendario de Disponibilidad' },
  auth: {
    signIn: 'Iniciar Sesión',
    signUp: 'Registrarse',
    signOut: 'Cerrar Sesión',
    signInTitle: 'Inicia sesión en tu cuenta',
    signUpTitle: 'Crea tu cuenta',
    noAccount: '¿No tienes una cuenta?',
    hasAccount: '¿Ya tienes una cuenta?',
    backToHome: 'Volver al inicio',
    changePassword: 'Cambiar contraseña',
    email: 'Correo',
  },
  profile: {
    title: 'Perfil',
    subtitle: 'Administra tu cuenta.',
    account: 'Cuenta',
    changePassword: 'Cambiar contraseña',
    currentPassword: 'Contraseña actual',
    newPassword: 'Nueva contraseña',
    confirmNewPassword: 'Confirmar nueva contraseña',
    savePassword: 'Guardar contraseña',
    saving: 'Guardando…',
    success: 'Contraseña cambiada con éxito.',
    errors: {
      currentRequired: 'La contraseña actual es obligatoria.',
      newRequired: 'La nueva contraseña es obligatoria.',
      minLength: 'La contraseña debe tener al menos 8 caracteres.',
      mismatch: 'Las contraseñas no coinciden.',
    },
  },
  common: { cancel: 'Cancelar' },
};

async function mockI18nEndpoints(page: Page) {
  await page.route('**/translations/en/**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EN_TRANSLATIONS) });
  });

  await page.route('**/translations/es/**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ES_TRANSLATIONS) });
  });

  await page.route('**/languages/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'es', name: 'Spanish', nativeName: 'Español' },
      ]),
    });
  });
}

/**
 * Mock auth state in localStorage so the frontend renders the authenticated view.
 * Must be called BEFORE navigating to the page (use page.goto after this).
 */
export async function setupAuth(page: Page, opts?: { admin?: boolean }) {
  await mockI18nEndpoints(page);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  const password = 'TestPass123!';
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e_${uniqueSuffix}@example.com`;

  const registerResponse = await page.request.post(`${apiBase}/auth/register/`, {
    data: {
      email,
      password,
      password_confirm: password,
      first_name: 'Test',
      last_name: 'User',
    },
  });

  if (!registerResponse.ok()) {
    throw new Error(`Failed to register e2e user: ${registerResponse.status()}`);
  }

  const sessionData = await registerResponse.json();
  const user = {
    ...sessionData.user,
    role: opts?.admin ? 'admin' : sessionData.user.role,
  };

  // We need to visit a page first to set localStorage on the correct origin
  await page.goto('/', { waitUntil: 'commit' });
  await page.evaluate(
    ({ user, tokens }) => {
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('auth_tokens', JSON.stringify(tokens));
    },
    { user, tokens: sessionData.tokens },
  );
}

/**
 * Set the preferred language in localStorage.
 * Must be called after navigating to the origin (or after setupAuth which does that).
 *
 * Also patches the cached ``auth_user`` blob's ``language`` field so the
 * authenticated-user precedence in TranslationProvider matches the test's
 * intent. Without this, an authenticated test that wants to start in English
 * would see Spanish — the user's stored preference (``es`` by default)
 * outranks the device-wide localStorage value.
 */
export async function setLanguage(page: Page, lang: 'en' | 'es') {
  await page.evaluate((l) => {
    localStorage.setItem('preferred_language', l);
    const raw = localStorage.getItem('auth_user');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        u.language = l;
        localStorage.setItem('auth_user', JSON.stringify(u));
      } catch {
        // ignore — the test helper has best-effort semantics
      }
    }
  }, lang);
}

/**
 * Setup auth + language and reload to apply both.
 */
export async function setupAuthAndLanguage(
  page: Page,
  opts?: { admin?: boolean; lang?: 'en' | 'es' },
) {
  await setupAuth(page, { admin: opts?.admin });
  await setLanguage(page, opts?.lang || 'en');
  await page.reload({ waitUntil: 'networkidle' });
}

/**
 * Create an owner directly through the REST API using the currently authenticated
 * session. Returns the created owner so tests can assert on its id/name.
 */
export async function createOwnerViaApi(
  page: Page,
  overrides: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    id_number: string;
  }> = {},
) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  const tokensRaw = await page.evaluate(() => localStorage.getItem('auth_tokens'));
  if (!tokensRaw) {
    throw new Error('No auth tokens in localStorage; call setupAuthAndLanguage first');
  }
  const { access } = JSON.parse(tokensRaw);
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  // id_number column max is 20 chars
  const shortUnique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  const body = {
    first_name: overrides.first_name ?? 'OwnerFirst',
    last_name: overrides.last_name ?? `Owner_${unique}`,
    email: overrides.email ?? `owner_${unique}@example.com`,
    phone: overrides.phone ?? '+1-555-0100',
    id_number: overrides.id_number ?? shortUnique,
  };

  const res = await page.request.post(`${apiBase}/owners/`, {
    headers: { Authorization: `Bearer ${access}` },
    data: body,
  });
  if (!res.ok()) {
    throw new Error(`Failed to create owner: ${res.status()} ${await res.text()}`);
  }
  return res.json() as Promise<{ id: number; first_name: string; last_name: string }>;
}

/**
 * Navigate to /owners, expand the given owner's card, and open the "Add Pet"
 * pet form modal. Returns the page locator for the form.
 */
export async function openAddPetFormForOwner(page: Page, owner: { first_name: string; last_name: string }) {
  await page.goto('/owners', { waitUntil: 'networkidle' });
  const ownerCard = page
    .locator('div[class*="bg-card"]')
    .filter({ hasText: `${owner.first_name} ${owner.last_name}` })
    .first();
  await ownerCard.click();
  await page.getByRole('button', { name: /add pet|agregar mascota/i }).first().click();
  return page.locator('.fixed.inset-0 form').first();
}

async function authedRequest(page: Page) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  const tokensRaw = await page.evaluate(() => localStorage.getItem('auth_tokens'));
  if (!tokensRaw) throw new Error('No auth tokens; call setupAuthAndLanguage first');
  const { access } = JSON.parse(tokensRaw);
  return { apiBase, headers: { Authorization: `Bearer ${access}` } };
}

/** Create a pet via the REST API for tests that don't care about the form UX. */
export async function createPetViaApi(
  page: Page,
  ownerId: number,
  overrides: Partial<{
    name: string;
    species: string;
    breed: string;
    age: number;
    temperament: string;
    dominance_level: number;
    size: string;
    sex: string;
    neutered: boolean;
  }> = {},
) {
  const { apiBase, headers } = await authedRequest(page);
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const body = {
    name: overrides.name ?? `Pet_${unique}`,
    species: overrides.species ?? 'dog',
    breed: overrides.breed ?? 'Mixed',
    age: overrides.age ?? 3,
    temperament: overrides.temperament ?? 'friendly',
    dominance_level: overrides.dominance_level ?? 5,
    size: overrides.size ?? 'medium',
    sex: overrides.sex ?? 'male',
    neutered: overrides.neutered ?? true,
    owner: ownerId,
  };
  const res = await page.request.post(`${apiBase}/pets/`, { headers, data: body });
  if (!res.ok()) throw new Error(`Failed to create pet: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<{ id: number; name: string }>;
}

/** Create a schedule via the REST API. Defaults are 09:00–17:00 same-day. */
export async function createScheduleViaApi(
  page: Page,
  petId: number,
  overrides: Partial<{
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    status: string;
    notes: string;
  }> = {},
) {
  const { apiBase, headers } = await authedRequest(page);
  const today = new Date().toISOString().slice(0, 10);
  const body = {
    pet: petId,
    start_date: overrides.start_date ?? today,
    end_date: overrides.end_date ?? overrides.start_date ?? today,
    start_time: overrides.start_time ?? '09:00',
    end_time: overrides.end_time ?? '17:00',
    status: overrides.status ?? 'scheduled',
    notes: overrides.notes ?? '',
  };
  const res = await page.request.post(`${apiBase}/schedules/`, { headers, data: body });
  if (!res.ok()) throw new Error(`Failed to create schedule: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<{ id: number; start_date: string; end_date: string }>;
}

/** Add `delta` days to an ISO date (`yyyy-MM-dd`). UTC-anchored to avoid TZ drift. */
export function shiftIsoDate(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
