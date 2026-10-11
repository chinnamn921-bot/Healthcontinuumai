// Core domain types for the HealthContinuum AI Doctor Portal

export type UUID = string;

export type AuthorizationStatus = 'authorized' | 'pending' | 'expired' | 'revoked' | 'none';

export type GrantStatus = 'active' | 'expired' | 'revoked';

export type RecordCategory =
  | 'laboratory_reports'
  | 'prescriptions'
  | 'discharge_summaries'
  | 'visit_history'
  | 'documents';

export type AccessPurpose = 'consultation' | 'follow_up' | 'second_opinion' | 'emergency_review';

export type AccessDuration = '1h' | '4h' | '24h' | '72h' | '7d';

export type ReviewAction = 'confirmed' | 'needs_clarification' | 'not_applicable';

export type ExtractionConfidence = 'high' | 'medium' | 'low' | 'unknown';

export type NoteVersionStatus = 'current' | 'superseded';

// --- Doctor ---

export interface DoctorProfile {
  id: UUID;
  fullName: string;
  credentials: string;
  registrationNumber: string;
  specialty: string;
  facilityName: string;
  facilityId: string | null;
  avatarInitials: string;
  email: string;
  verified: boolean;
}

// --- Patient ---

export interface PatientSummary {
  id: UUID;
  appPatientId: string;
  fullName: string;
  age: number | null;
  sex: 'male' | 'female' | 'other' | 'unknown';
  lastVisitDate: string | null;
  authorizationStatus: AuthorizationStatus;
  abhaId: string | null;
  abhaLinked: boolean;
}

export interface PatientDetail extends PatientSummary {
  dateOfBirth: string | null;
  bloodGroup: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergencyContact: string | null;
}

// --- Medical Records ---

export interface Allergy {
  id: UUID;
  name: string;
  severity: 'mild' | 'moderate' | 'severe' | 'unknown';
  recordedDate: string;
  source: string;
}

export interface Medication {
  id: UUID;
  name: string;
  strength: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  prescribedDate: string;
  source: string;
}

export interface Condition {
  id: UUID;
  name: string;
  status: 'active' | 'resolved' | 'chronic' | 'unknown';
  diagnosedDate: string;
  source: string;
}

// --- Lab Results ---

export interface LabResult {
  id: UUID;
  testName: string;
  value: string;
  unit: string;
  collectionDate: string;
  referenceRange: string | null;
  sourceReport: string;
  extractionConfidence: ExtractionConfidence;
  flags: string | null;
}

export interface LabReport {
  id: UUID;
  reportName: string;
  reportDate: string;
  labName: string;
  status: 'available' | 'pending' | 'unknown';
  results: LabResult[];
}

// --- Prescriptions ---

export interface Prescription {
  id: UUID;
  prescribedDate: string;
  prescriber: string;
  medications: Medication[];
  source: string;
  notes: string | null;
}

// --- Documents ---

export interface MedicalDocument {
  id: UUID;
  title: string;
  type: 'discharge_summary' | 'imaging_report' | 'referral_letter' | 'insurance' | 'other';
  uploadedDate: string;
  source: string;
  fileSize: string;
  accessible: boolean;
}

// --- Visit History / Timeline ---

export interface TimelineEvent {
  id: UUID;
  date: string;
  type: 'visit' | 'lab' | 'prescription' | 'document' | 'note' | 'procedure';
  title: string;
  description: string;
  source: string;
}

// --- Shared Access Grant (PIN-based) ---

export interface SharedAccessGrant {
  id: UUID;
  pinId: UUID;
  patientId: UUID;
  patientName: string;
  doctorId: UUID | null;
  doctorName: string | null;
  facilityId: string | null;
  facilityName: string | null;
  scope: RecordCategory[];
  purpose: AccessPurpose;
  status: GrantStatus;
  grantedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokedBy: string | null;
  maxAttempts: number;
  attemptsUsed: number;
  maxUses: number;
  usesRemaining: number;
}

// --- Continuity Review ---

export interface ReviewComparisonItem {
  id: UUID;
  patientId: UUID;
  testName: string;
  previousValue: string | null;
  previousUnit: string;
  previousDate: string | null;
  currentValue: string;
  currentUnit: string;
  currentDate: string;
  referenceRange: string | null;
  previousSource: string | null;
  currentSource: string;
  extractionConfidence: ExtractionConfidence;
  numericDifference: number | null;
  flags: string[];
  reviewAction: ReviewAction | null;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface PrescriptionDiffItem {
  id: UUID;
  patientId: UUID;
  medicationName: string;
  previousStrength: string | null;
  currentStrength: string | null;
  previousDosage: string | null;
  currentDosage: string | null;
  previousRoute: string | null;
  currentRoute: string | null;
  previousFrequency: string | null;
  currentFrequency: string | null;
  previousDuration: string | null;
  currentDuration: string | null;
  previousDate: string | null;
  currentDate: string;
  previousSource: string | null;
  currentSource: string;
  reviewAction: ReviewAction | null;
  reviewNote: string | null;
}

// --- Clinical Notes & Follow-up ---

export interface ClinicalNote {
  id: UUID;
  patientId: UUID;
  authorId: UUID;
  authorName: string;
  authorCredentials: string;
  content: string;
  isAIGenerated: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  status: NoteVersionStatus;
  sourceReferences: string[];
}

export interface FollowUp {
  id: UUID;
  patientId: UUID;
  noteId: UUID | null;
  authorId: UUID;
  authorName: string;
  plan: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
  completedAt: string | null;
  createdAt: string;
}

// --- Audit Events ---

export interface AuditEvent {
  id: UUID;
  actorId: UUID;
  actorName: string;
  actorRole: 'doctor' | 'patient' | 'system';
  action: string;
  patientId: UUID | null;
  patientName: string | null;
  resourceType: string;
  resourceId: string | null;
  purpose: string | null;
  authorizationRef: string | null;
  timestamp: string;
  outcome: 'success' | 'denied' | 'error';
  detail: string;
}

// --- PIN Access ---

export interface PinRedemptionResult {
  success: boolean;
  error: PinRedemptionError | null;
  grant: SharedAccessGrant | null;
  patient: PatientSummary | null;
}

export type PinRedemptionError =
  | 'invalid_pin'
  | 'expired_pin'
  | 'revoked_pin'
  | 'locked_out'
  | 'scope_mismatch'
  | 'patient_not_found'
  | 'doctor_not_authorized';

// --- Notifications ---

export interface AppNotification {
  id: UUID;
  type: 'record_shared' | 'review_due' | 'follow_up_reminder' | 'grant_revoked' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link: string;
}

// --- Service Adapter Status ---

export type ServiceStatus = 'connected' | 'demo' | 'not_connected' | 'error';

export interface ServiceAdapterInfo {
  name: string;
  status: ServiceStatus;
  detail: string;
}

// --- ABDM Integration Placeholder ---

export interface AbdmConsentRecord {
  id: UUID;
  patientId: UUID;
  patientName: string;
  status: 'requested' | 'granted' | 'denied' | 'expired' | 'revoked';
  requestedAt: string;
  hipId: string | null;
  purpose: string;
  dataExpiry: string | null;
}

export interface AbdmIntegrationStatus {
  configured: boolean;
  environment: 'sandbox' | 'production' | 'none';
  hipId: string | null;
  detail: string;
}
