import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  User, FileText, FlaskConical, Pill, FileCheck2, Stethoscope, Calendar,
  AlertTriangle, HeartPulse, Activity, ArrowLeft, Clock, ShieldAlert, Lock,
  KeyRound, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { patientService, pinService } from '@/services/api';
import { PageHeader, Card, CardHeader, Breadcrumb, LoadingState, ErrorState, StatusBadge, EmptyState } from '@/components/ui';
import { PinInput } from '@/components/ui/PinInput';
import type { PatientDetail, Allergy, Medication, Condition, LabReport, Prescription, MedicalDocument, TimelineEvent, RecordCategory } from '@/types';

type Tab = 'summary' | 'timeline' | 'labs' | 'prescriptions' | 'documents' | 'notes';

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'summary', label: 'Summary', icon: User },
  { id: 'timeline', label: 'Health Timeline', icon: Activity },
  { id: 'labs', label: 'Laboratory Reports', icon: FlaskConical },
  { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'notes', label: 'Doctor Notes & Follow-up', icon: Stethoscope },
];

export function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const { doctor } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('summary');

  // Data states
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [pinVerifying, setPinVerifying] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [unlockedScope, setUnlockedScope] = useState<RecordCategory[] | null>(null);

  useEffect(() => {
    if (!patientId || !doctor) return;
    (async () => {
      setLoading(true);
      const { patient: pat, authorized: auth } = await patientService.getPatientDetail(patientId, doctor.id);
      setPatient(pat);
      setAuthorized(auth);
      if (pat && auth) {
        const scope = pinService.isPatientUnlocked(patientId) ? unlockedScope : undefined;
        const [alg, med, con, labs, rx, docs, tl] = await Promise.all([
          patientService.getAllergies(patientId),
          patientService.getMedications(patientId),
          patientService.getConditions(patientId),
          patientService.getLabReports(patientId, scope || undefined),
          patientService.getPrescriptions(patientId, scope || undefined),
          patientService.getDocuments(patientId, scope || undefined),
          patientService.getTimeline(patientId),
        ]);
        setAllergies(alg);
        setMedications(med);
        setConditions(con);
        setLabReports(labs);
        setPrescriptions(rx);
        setDocuments(docs);
        setTimeline(tl);
      }
      setLoading(false);
    })();
  }, [patientId, doctor]);

  if (loading) return <LoadingState message="Loading patient profile..." />;

  if (!patient) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: 'Patients', to: '/doctor/patients' }, { label: 'Not found' }]} />
        <ErrorState title="Patient not found" message="This patient does not exist in the directory." onRetry={() => navigate('/doctor/patients')} />
      </div>
    );
  }

  if (!authorized) {
    const handlePinUnlock = async (pin: string) => {
      if (!doctor) return;
      setPinVerifying(true);
      setPinError(null);
      const result = await pinService.redeemPin(pin, doctor);
      if (result.success && result.grant && result.patient && result.patient.id === patientId) {
        setUnlockedScope(result.grant.scope);
        setAuthorized(true);
        // Load data with the granted scope
        const [alg, med, con, labs, rx, docs, tl] = await Promise.all([
          patientService.getAllergies(patientId),
          patientService.getMedications(patientId),
          patientService.getConditions(patientId),
          patientService.getLabReports(patientId, result.grant.scope),
          patientService.getPrescriptions(patientId, result.grant.scope),
          patientService.getDocuments(patientId, result.grant.scope),
          patientService.getTimeline(patientId),
        ]);
        setAllergies(alg);
        setMedications(med);
        setConditions(con);
        setLabReports(labs);
        setPrescriptions(rx);
        setDocuments(docs);
        setTimeline(tl);
      } else {
        const errorMessages: Record<string, string> = {
          invalid_pin: 'The PIN you entered is invalid. Please verify the six-digit code with the patient.',
          expired_pin: 'This access PIN has expired. Please ask the patient to generate a new one.',
          revoked_pin: 'This access has been revoked by the patient.',
          locked_out: 'This PIN has reached its maximum attempts.',
          scope_mismatch: 'This PIN does not grant access to this patient.',
          patient_not_found: 'Unable to verify access.',
          doctor_not_authorized: 'You are not authorized to use this PIN.',
        };
        setPinError(errorMessages[result.error || 'invalid_pin'] || 'Access could not be verified.');
      }
      setPinVerifying(false);
    };

    return (
      <div className="space-y-6 animate-fade-in">
        <Breadcrumb items={[{ label: 'Patients', to: '/doctor/patients' }, { label: patient.fullName }]} />
        <Card className="p-6 sm:p-8">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-50">
              <Lock className="h-7 w-7 text-warning-600" />
            </div>
            <h2 className="text-lg font-bold text-navy-900">PIN Required</h2>
            <p className="mt-2 text-sm text-navy-500">
              Enter the six-digit access PIN shared by {patient.fullName} to view their medical records. Access is granted only for the records and duration the patient authorized.
            </p>

            {(() => {
              const demoPin = patientId ? pinService.getDemoPinForPatient(patientId) : null;
              if (!demoPin) return null;
              return (
                <div className="mt-4 rounded-lg border-2 border-dashed border-teal-300 bg-teal-50 px-4 py-3">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-teal-600">Demo PIN</p>
                  <p className="mt-1 text-2xl font-bold tracking-[0.3em] text-teal-700">{demoPin}</p>
                </div>
              );
            })()}

            <div className="mt-6">
              {pinVerifying ? (
                <LoadingState message="Verifying PIN..." />
              ) : (
                <>
                  <PinInput onComplete={handlePinUnlock} error={!!pinError} />
                  {pinError && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-left">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-error-500" />
                      <p className="text-xs text-error-700">{pinError}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <Link to="/doctor/patients" className="btn-secondary">
                <ArrowLeft className="h-4 w-4" />
                Back to directory
              </Link>
            </div>

            <div className="mt-6 rounded-lg bg-navy-50 p-3 text-left">
              <div className="flex items-start gap-2">
                <KeyRound className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-navy-400" />
                <p className="text-xs text-navy-500">
                  The PIN is a temporary access mechanism, not a substitute for authentication. All access attempts are logged in the audit trail.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb items={[{ label: 'Patients', to: '/doctor/patients' }, { label: patient.fullName }]} />

      <PageHeader
        title={patient.fullName}
        subtitle={`${patient.appPatientId} · ${patient.age !== null ? `${patient.age} years` : 'Age unknown'} · ${patient.sex}`}
        action={
          <Link to="/doctor/continuity-review" className="btn-secondary">
            <Activity className="h-4 w-4" />
            Continuity Review
          </Link>
        }
      />

      {/* Patient info bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoTile label="Blood Group" value={patient.bloodGroup || 'Unknown'} />
        <InfoTile label="Last Visit" value={patient.lastVisitDate || 'No visits'} />
        <InfoTile label="ABHA" value={patient.abhaLinked ? patient.abhaId || 'Linked' : 'Not linked'} />
        <InfoTile label="Access" value="Authorized" highlight />
      </div>

      {/* Tabs */}
      <div className="border-b border-navy-200">
        <div className="flex gap-1 overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id ? 'tab-active' : 'tab-inactive'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader title="Allergies" subtitle="Documented adverse reactions" />
            <div className="p-4">
              {allergies.length === 0 ? (
                <p className="text-sm text-navy-400">No documented allergies.</p>
              ) : (
                <div className="space-y-3">
                  {allergies.map((a) => (
                    <div key={a.id} className="flex items-start gap-3">
                      <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${a.severity === 'severe' ? 'text-error-500' : a.severity === 'moderate' ? 'text-warning-500' : 'text-navy-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-navy-900">{a.name}</p>
                        <p className="text-xs text-navy-400">{a.severity} · {a.recordedDate} · {a.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Active Conditions" subtitle="Diagnosed conditions" />
            <div className="p-4">
              {conditions.length === 0 ? (
                <p className="text-sm text-navy-400">No documented conditions.</p>
              ) : (
                <div className="space-y-3">
                  {conditions.map((c) => (
                    <div key={c.id} className="flex items-start gap-3">
                      <HeartPulse className="mt-0.5 h-4 w-4 flex-shrink-0 text-error-400" />
                      <div>
                        <p className="text-sm font-medium text-navy-900">{c.name}</p>
                        <p className="text-xs text-navy-400">{c.status} · {c.diagnosedDate} · {c.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Current Medications" subtitle="Active prescriptions" />
            <div className="p-4">
              {medications.length === 0 ? (
                <p className="text-sm text-navy-400">No active medications.</p>
              ) : (
                <div className="space-y-3">
                  {medications.map((m) => (
                    <div key={m.id} className="flex items-start gap-3">
                      <Pill className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-500" />
                      <div>
                        <p className="text-sm font-medium text-navy-900">{m.name} {m.strength}</p>
                        <p className="text-xs text-navy-400">{m.dosage} · {m.route} · {m.frequency}</p>
                        <p className="text-2xs text-navy-300">Prescribed {m.prescribedDate} · {m.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'timeline' && (
        <Card>
          <CardHeader title="Health Timeline" subtitle="Chronological events from authorized records" />
          {timeline.length === 0 ? (
            <EmptyState icon={<Calendar className="h-8 w-8" />} title="No timeline events" message="No documented events available in authorized records." />
          ) : (
            <div className="p-5">
              <div className="relative space-y-5 before:absolute before:left-[15px] before:top-2 before:h-full before:w-px before:bg-navy-200">
                {timeline.map((event) => (
                  <div key={event.id} className="relative flex gap-4">
                    <div className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-teal-50">
                      <TimelineIcon type={event.type} />
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-navy-900">{event.title}</p>
                        <span className="text-2xs text-navy-400">{event.date}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-navy-600">{event.description}</p>
                      <p className="mt-0.5 text-2xs text-navy-400">Source: {event.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'labs' && (
        <div className="space-y-4">
          {labReports.length === 0 ? (
            <Card><EmptyState icon={<FlaskConical className="h-8 w-8" />} title="No lab reports" message="No laboratory reports are available in the authorized scope." /></Card>
          ) : (
            labReports.map((report) => (
              <Card key={report.id}>
                <CardHeader
                  title={report.reportName}
                  subtitle={`${report.reportDate} · ${report.labName}`}
                  action={<StatusBadge variant="success">{report.status}</StatusBadge>}
                />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-navy-100 text-left text-2xs font-semibold uppercase tracking-wide text-navy-500">
                        <th className="px-5 py-2.5">Test</th>
                        <th className="px-5 py-2.5">Value</th>
                        <th className="px-5 py-2.5">Unit</th>
                        <th className="hidden px-5 py-2.5 sm:table-cell">Reference Range</th>
                        <th className="hidden px-5 py-2.5 md:table-cell">Flags</th>
                        <th className="hidden px-5 py-2.5 lg:table-cell">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-50">
                      {report.results.map((r) => (
                        <tr key={r.id} className="hover:bg-navy-50/50">
                          <td className="px-5 py-2.5 font-medium text-navy-900">{r.testName}</td>
                          <td className="px-5 py-2.5 text-navy-700">{r.value}</td>
                          <td className="px-5 py-2.5 text-navy-600">{r.unit}</td>
                          <td className="hidden px-5 py-2.5 text-navy-500 sm:table-cell">{r.referenceRange || '—'}</td>
                          <td className="hidden px-5 py-2.5 md:table-cell">
                            {r.flags ? <StatusBadge variant={r.flags.toLowerCase().includes('high') ? 'error' : 'warning'}>{r.flags}</StatusBadge> : <span className="text-navy-300">—</span>}
                          </td>
                          <td className="hidden px-5 py-2.5 lg:table-cell">
                            <ConfidenceBadge level={r.extractionConfidence} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          {prescriptions.length === 0 ? (
            <Card><EmptyState icon={<Pill className="h-8 w-8" />} title="No prescriptions" message="No prescriptions are available in the authorized scope." /></Card>
          ) : (
            prescriptions.map((rx) => (
              <Card key={rx.id}>
                <CardHeader
                  title={`Prescription — ${rx.prescribedDate}`}
                  subtitle={`Prescribed by ${rx.prescriber} · ${rx.source}`}
                />
                <div className="p-4">
                  <div className="space-y-3">
                    {rx.medications.map((m) => (
                      <div key={m.id} className="flex items-start gap-3 rounded-lg bg-navy-50 p-3">
                        <Pill className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-navy-900">{m.name} {m.strength}</p>
                          <p className="text-xs text-navy-500">{m.dosage} · {m.route} · {m.frequency} · {m.duration}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {rx.notes && (
                    <div className="mt-3 rounded-lg border border-navy-100 bg-navy-50/50 p-3">
                      <p className="text-xs text-navy-600">{rx.notes}</p>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <Card>
          <CardHeader title="Documents" subtitle="Discharge summaries, imaging reports, and other documents in the authorized scope" />
          {documents.length === 0 ? (
            <EmptyState icon={<FileText className="h-8 w-8" />} title="No documents" message="No documents are available in the authorized scope." />
          ) : (
            <div className="divide-y divide-navy-100">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50">
                      <FileCheck2 className="h-4 w-4 text-navy-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-navy-900">{doc.title}</p>
                      <p className="text-xs text-navy-400">{doc.type.replace(/_/g, ' ')} · {doc.uploadedDate} · {doc.source} · {doc.fileSize}</p>
                    </div>
                  </div>
                  {doc.accessible ? (
                    <button className="btn-ghost text-xs">View securely</button>
                  ) : (
                    <StatusBadge variant="neutral">Not in scope</StatusBadge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'notes' && (
        <DoctorNotesTab patientId={patient.id} patientName={patient.fullName} />
      )}
    </div>
  );
}

function InfoTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-teal-200 bg-teal-50' : 'border-navy-200 bg-white'}`}>
      <p className="text-2xs font-semibold uppercase tracking-wide text-navy-500">{label}</p>
      <p className={`mt-1 text-sm font-medium ${highlight ? 'text-teal-700' : 'text-navy-900'}`}>{value}</p>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: string }) {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    high: 'success',
    medium: 'warning',
    low: 'error',
    unknown: 'neutral',
  };
  return <StatusBadge variant={variants[level] || 'neutral'}>{level}</StatusBadge>;
}

function TimelineIcon({ type }: { type: string }) {
  const icons: Record<string, typeof User> = {
    visit: Stethoscope,
    lab: FlaskConical,
    prescription: Pill,
    document: FileText,
    note: FileCheck2,
    procedure: HeartPulse,
  };
  const Icon = icons[type] || Activity;
  return <Icon className="h-3.5 w-3.5 text-teal-600" />;
}

// Import the notes tab component
import { DoctorNotesTab } from '@/components/DoctorNotesTab';
