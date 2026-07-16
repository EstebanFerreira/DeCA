// Valores permitidos para los campos "enum" del esquema (SQLite no soporta enums nativos).

export const ROLES = ['ADMIN', 'CARGADOR', 'TRANSPORTISTA'] as const;
export type Role = (typeof ROLES)[number];

export const ENTITY_TYPES = ['CARGADOR', 'TRANSPORTISTA'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const DECA_STATUS = ['ACTIVE', 'SUPERSEDED', 'DOWNLOAD_DISABLED'] as const;
export type DecaStatus = (typeof DECA_STATUS)[number];

export const SIGNATURE_TYPES = ['NONE', 'ADVANCED', 'QUALIFIED'] as const;
export type SignatureType = (typeof SIGNATURE_TYPES)[number];

export const MODIFICATION_TYPES = ['UPDATE_SAME', 'NEW_VERSION'] as const;
export type ModificationType = (typeof MODIFICATION_TYPES)[number];

// Nº de días naturales tras la finalización del servicio durante los que la URL
// debe permanecer operativa (Tercero de la resolución DeCA).
export const DAYS_URL_MUST_STAY_ACTIVE = 7;

// Días de conservación mínima del PDF y del QR (Segundo de la resolución DeCA).
export const RETENTION_DAYS = 365;

// Tamaño máximo permitido del PDF en bytes (Segundo de la resolución DeCA: máx. 5MB).
export const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024;

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  CARGADOR: 'Cargador contractual',
  TRANSPORTISTA: 'Transportista efectivo',
};

export const STATUS_LABELS: Record<DecaStatus, string> = {
  ACTIVE: 'Activo',
  SUPERSEDED: 'Sustituido por nueva versión',
  DOWNLOAD_DISABLED: 'Descarga desactivada',
};

export const SIGNATURE_LABELS: Record<SignatureType, string> = {
  NONE: 'Sin firma (uso administrativo)',
  ADVANCED: 'Firma electrónica avanzada (eIDAS)',
  QUALIFIED: 'Firma electrónica cualificada (con certificado)',
};
