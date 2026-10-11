import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, ShieldCheck, AlertCircle, UserCheck, Clock, Lock, FileText, X, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { pinService, grantService } from '@/services/api';
import { PageHeader, Card, CardHeader, LoadingState, StatusBadge, EmptyState, ErrorState } from '@/components/ui';
import { PinInput } from '@/components/ui/PinInput';
import type { PinRedemptionResult, SharedAccessGrant, RecordCategory } from '@/types';

const categoryLabels: Record<RecordCategory, string> = {
  laboratory_reports: 'Laboratory Reports',
  prescriptions: 'Prescriptions',
  discharge_summaries: 'Discharge Summaries',
  visit_history: 'Visit History',
  documents: 'Documents',
};

const purposeLabels: Record<string, string> = {
  consultation: 'Consultation',
  follow_up: 'Follow-up',
  second_opinion: 'Second Opinion',
  emergency_review: 'Emergency Review',
};

export function SharedRecordsPage() {
  const { doctor } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [result, setResult] = useState<PinRedemptionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grants, setGrants] = useState<SharedAccessGrant[]>([]);

  useEffect(() => {
    if (doctor) {
      grantService.getGrants('active').then(setGrants);
    }
  }, [doctor]);

  const handlePinComplete = async (completedPin: string) => {
    if (!doctor) return;
    setPin(completedPin);
    setLoading(true);
    setError(null);
    const res = await pinService.redeemPin(completedPin, doctor);
    setResult(res);
    setLoading(false);
    if (!res.success) {
      const errorMessages: Record<string, string> = {
        invalid_pin: 'The PIN you entered is invalid. Please verify the six-digit code with the patient.',
        expired_pin: 'This access PIN has expired. Please ask the patient to generate a new one.',
        revoked_pin: 'This access has been revoked by the patient. No further access is possible.',
        locked_out: 'This PIN has reached its maximum attempts. Please request a new PIN from the patient.',
        scope_mismatch: 'The records in this grant do not match the requested scope.',
        patient_not_found: 'Unable to verify access. Please try again.',
        doctor_not_authorized: 'You are not authorized to use this access PIN.',
      };
      setError(errorMessages[res.error || 'invalid_pin'] || 'Access could not be verified.');
    }
  };

  const handleReset = () => {
    setPin('');
    setResult(null);
    setError(null);
  };

  const handleEndSession = async () => {
    if (result?.grant && doctor) {
      await pinService.endSession(result.grant.id, doctor);
    }
    handleReset();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Shared Records"
        subtitle="Enter a six-digit access PIN to open a patient's authorized records."
        action={
          <Link to="/doctor/access-consent" className="btn-secondary text-sm">
            <ShieldCheck className="h-4 w-4" />
            Manage grants
          </Link>
        }
      />

      {/* PIN Entry */}
      {!result?.success && (
        <Card className="p-6 sm:p-8">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50">
              <KeyRound className="h-7 w-7 text-teal-600" />
            </div>
            <h2 className="text-lg font-bold text-navy-900">Enter Access PIN</h2>
            <p className="mt-2 text-sm text-navy-500">
              Enter the six-digit PIN shared by the patient. Access is granted only for the records and duration the patient authorized.
            </p>

            <div className="mt-6">
              {loading ? (
                <LoadingState message="Verifying PIN..." />
              ) : (
                <>
                  <PinInput onComplete={handlePinComplete} error={!!error} />
                  {error && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-left">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-error-500" />
                      <p className="text-xs text-error-700">{error}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-6 rounded-lg bg-navy-50 p-3 text-left">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-navy-400" />
                <div className="text-xs text-navy-500">
                  <p className="font-medium text-navy-600">Demo PINs for testing:</p>
                  <ul className="mt-1 space-y-0.5 font-mono text-navy-500">
                    <li>483921 — Rajesh Kumar</li>
                    <li>207156 — Lakshmi Iyer</li>
                    <li>619834 — Suresh Reddy</li>
                    <li>552301 — Arjun Pillai (full scope)</li>
                    <li>314785 — Mohammed Asif</li>
                    <li>892046 — Priya Nair</li>
                    <li>176320 — Deepa Menon</li>
                    <li>538914 — Fatima Begum (full scope)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Success — patient identity confirmation */}
      {result?.success && result.grant && result.patient && (
        <div className="space-y-4 animate-slide-up">
          <Card className="border-teal-200 bg-teal-50/30 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100">
                  <UserCheck className="h-6 w-6 text-teal-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">Access Verified</p>
                  <p className="text-lg font-bold text-navy-900">{result.patient.fullName}</p>
                  <p className="text-xs text-navy-500">{result.patient.appPatientId}</p>
                </div>
              </div>
              <button onClick={handleEndSession} className="btn-danger text-sm">
                <Lock className="h-4 w-4" />
                End access session
              </button>
            </div>
          </Card>

          {/* Grant details */}
          <Card>
            <CardHeader title="Access Grant Details" subtitle="What you are authorized to review" />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <DetailItem icon={<FileText className="h-4 w-4" />} label="Purpose" value={purposeLabels[result.grant.purpose] || result.grant.purpose} />
              <DetailItem icon={<Clock className="h-4 w-4" />} label="Granted" value={new Date(result.grant.grantedAt).toLocaleString()} />
              <DetailItem icon={<Clock className="h-4 w-4" />} label="Expires" value={new Date(result.grant.expiresAt).toLocaleString()} />
              <DetailItem icon={<ShieldCheck className="h-4 w-4" />} label="Uses remaining" value={`${result.grant.usesRemaining} of ${result.grant.maxUses}`} />
            </div>
            <div className="border-t border-navy-100 px-5 py-4">
              <p className="text-2xs font-semibold uppercase tracking-wide text-navy-500 mb-2">Authorized record scope</p>
              <div className="flex flex-wrap gap-2">
                {result.grant.scope.map((scope) => (
                  <StatusBadge key={scope} variant="teal">{categoryLabels[scope]}</StatusBadge>
                ))}
              </div>
            </div>
          </Card>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <Link to={`/doctor/patients/${result.patient.id}`} className="btn-primary">
              <FileText className="h-4 w-4" />
              Open patient records
            </Link>
            <Link to={`/doctor/continuity-review`} className="btn-secondary">
              Review continuity
            </Link>
          </div>
        </div>
      )}

      {/* Active grants */}
      <Card>
        <CardHeader title="Active Access Grants" subtitle="Patient grants currently available to you" />
        {grants.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title="No active grants" message="No patients have active access grants with you." />
        ) : (
          <div className="divide-y divide-navy-100">
            {grants.map((grant) => (
              <div key={grant.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-navy-900">{grant.patientName}</p>
                  <p className="text-xs text-navy-400">
                    {grant.scope.length} categories · {purposeLabels[grant.purpose]} · Expires {new Date(grant.expiresAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge variant={grant.usesRemaining > 0 ? 'success' : 'neutral'}>
                    {grant.usesRemaining > 0 ? `${grant.usesRemaining} uses left` : 'used up'}
                  </StatusBadge>
                  <Link to={`/doctor/patients/${grant.patientId}`} className="btn-ghost text-xs">
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="text-xs text-navy-400">
        The PIN is a temporary access mechanism, not a substitute for authentication. It is bound to a specific patient, doctor, record scope, and expiry. All access attempts are logged in the audit trail. Never share PINs via unsecured channels.
      </p>
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-50 text-navy-500">
        {icon}
      </div>
      <div>
        <p className="text-2xs font-semibold uppercase tracking-wide text-navy-500">{label}</p>
        <p className="text-sm font-medium text-navy-900">{value}</p>
      </div>
    </div>
  );
}
