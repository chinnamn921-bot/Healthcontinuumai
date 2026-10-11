import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitCompareArrows, Check, HelpCircle, XCircle, PenLine, AlertTriangle, Pill, FlaskConical, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { reviewService, patientService } from '@/services/api';
import { PageHeader, Card, CardHeader, LoadingState, EmptyState, StatusBadge } from '@/components/ui';
import type { ReviewComparisonItem, PrescriptionDiffItem, ReviewAction, PatientSummary } from '@/types';

const actionConfig: Record<ReviewAction, { label: string; icon: typeof Check; variant: 'success' | 'warning' | 'neutral' }> = {
  confirmed: { label: 'Confirmed', icon: Check, variant: 'success' },
  needs_clarification: { label: 'Needs clarification', icon: HelpCircle, variant: 'warning' },
  not_applicable: { label: 'Not applicable', icon: XCircle, variant: 'neutral' },
};

export function ContinuityReviewPage() {
  const { doctor } = useAuth();
  const [loading, setLoading] = useState(true);
  const [labItems, setLabItems] = useState<ReviewComparisonItem[]>([]);
  const [rxItems, setRxItems] = useState<PrescriptionDiffItem[]>([]);
  const [activeTab, setActiveTab] = useState<'labs' | 'prescriptions'>('labs');
  const [patients, setPatients] = useState<Record<string, PatientSummary>>({});
  const [actionModal, setActionModal] = useState<{ itemId: string; type: 'lab' | 'rx' } | null>(null);
  const [note, setNote] = useState('');
  const [selectedAction, setSelectedAction] = useState<ReviewAction | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!doctor) return;
    (async () => {
      setLoading(true);
      const [labs, rxs, allPatients] = await Promise.all([
        reviewService.getReviewItems(),
        reviewService.getPrescriptionDiffs(),
        patientService.searchPatients('', 1, 100),
      ]);
      setLabItems(labs);
      setRxItems(rxs);
      const pMap: Record<string, PatientSummary> = {};
      allPatients.patients.forEach((p) => { pMap[p.id] = p; });
      setPatients(pMap);
      setLoading(false);
    })();
  }, [doctor]);

  const openActionModal = (itemId: string, type: 'lab' | 'rx') => {
    setActionModal({ itemId, type });
    setNote('');
    setSelectedAction(null);
  };

  const handleSubmitAction = async () => {
    if (!doctor || !actionModal || !selectedAction) return;
    setSaving(true);
    await reviewService.submitReviewAction(actionModal.itemId, selectedAction, note, doctor);
    // Refresh data
    const [labs, rxs] = await Promise.all([
      reviewService.getReviewItems(),
      reviewService.getPrescriptionDiffs(),
    ]);
    setLabItems(labs);
    setRxItems(rxs);
    setSaving(false);
    setActionModal(null);
  };

  if (loading) return <LoadingState message="Loading continuity review..." />;

  const pendingLabs = labItems.filter((r) => r.reviewAction === null);
  const reviewedLabs = labItems.filter((r) => r.reviewAction !== null);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Continuity Review"
        subtitle="Compare previous and current results. Differences are shown neutrally — clinical interpretation is yours."
      />

      {/* Tabs */}
      <div className="border-b border-navy-200">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('labs')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-all ${activeTab === 'labs' ? 'tab-active' : 'tab-inactive'}`}
          >
            <FlaskConical className="h-4 w-4" />
            Lab Comparisons
            {pendingLabs.length > 0 && <span className="ml-1 rounded-full bg-warning-100 px-1.5 py-0.5 text-2xs font-semibold text-warning-700">{pendingLabs.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-all ${activeTab === 'prescriptions' ? 'tab-active' : 'tab-inactive'}`}
          >
            <Pill className="h-4 w-4" />
            Prescription Changes
          </button>
        </div>
      </div>

      {activeTab === 'labs' && (
        <div className="space-y-4">
          {pendingLabs.length > 0 && (
            <div className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-2.5">
              <p className="text-xs text-warning-700">
                <span className="font-semibold">{pendingLabs.length}</span> lab comparison{pendingLabs.length !== 1 ? 's' : ''} awaiting review. Numeric differences are shown for reference only and are not clinical interpretations.
              </p>
            </div>
          )}

          {labItems.length === 0 ? (
            <Card><EmptyState icon={<GitCompareArrows className="h-8 w-8" />} title="No comparisons available" message="No lab results with previous values to compare." /></Card>
          ) : (
            labItems.map((item) => (
              <Card key={item.id} className={item.reviewAction ? 'opacity-75' : ''}>
                <div className="flex items-center justify-between border-b border-navy-100 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50">
                      <FlaskConical className="h-4 w-4 text-navy-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy-900">{item.testName}</p>
                      <Link to={`/doctor/patients/${item.patientId}`} className="text-xs text-teal-600 hover:underline">
                        {patients[item.patientId]?.fullName || 'Patient'}
                      </Link>
                    </div>
                  </div>
                  {item.reviewAction ? (
                    <StatusBadge variant={actionConfig[item.reviewAction].variant}>
                      {actionConfig[item.reviewAction].label}
                    </StatusBadge>
                  ) : (
                    <button onClick={() => openActionModal(item.id, 'lab')} className="btn-secondary text-xs">
                      <PenLine className="h-3.5 w-3.5" />
                      Review
                    </button>
                  )}
                </div>

                {/* Comparison grid */}
                <div className="grid grid-cols-1 gap-px bg-navy-100 sm:grid-cols-2">
                  <div className="bg-white p-4">
                    <p className="text-2xs font-semibold uppercase tracking-wide text-navy-500">Previous</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-navy-900">{item.previousValue || '—'}</span>
                      <span className="text-sm text-navy-500">{item.previousUnit}</span>
                    </div>
                    <p className="mt-1 text-xs text-navy-400">
                      {item.previousDate || 'Date not available'} · {item.previousSource || 'Source not documented'}
                    </p>
                  </div>
                  <div className="bg-white p-4">
                    <p className="text-2xs font-semibold uppercase tracking-wide text-teal-600">Current</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-navy-900">{item.currentValue}</span>
                      <span className="text-sm text-navy-500">{item.currentUnit}</span>
                    </div>
                    <p className="mt-1 text-xs text-navy-400">
                      {item.currentDate} · {item.currentSource}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex flex-wrap items-center gap-4 border-t border-navy-100 px-5 py-3">
                  {item.numericDifference !== null && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-navy-500">Difference:</span>
                      <span className={`text-sm font-semibold ${item.numericDifference < 0 ? 'text-success-600' : 'text-error-600'}`}>
                        {item.numericDifference > 0 ? '+' : ''}{item.numericDifference} {item.currentUnit}
                      </span>
                    </div>
                  )}
                  {item.referenceRange && (
                    <div className="text-xs text-navy-500">
                      Reference: <span className="font-medium text-navy-700">{item.referenceRange}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xs text-navy-400">Extraction confidence:</span>
                    <StatusBadge variant={item.extractionConfidence === 'high' ? 'success' : item.extractionConfidence === 'medium' ? 'warning' : 'error'}>
                      {item.extractionConfidence}
                    </StatusBadge>
                  </div>
                  {item.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.flags.map((flag, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-2xs text-warning-700">
                          <AlertTriangle className="h-3 w-3" /> {flag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {item.reviewAction && item.reviewNote && (
                  <div className="border-t border-navy-100 bg-navy-50/50 px-5 py-3">
                    <p className="text-xs text-navy-600">
                      <span className="font-semibold">{item.reviewedBy}</span> · {item.reviewNote}
                    </p>
                    <p className="mt-0.5 text-2xs text-navy-400">{item.reviewedAt && new Date(item.reviewedAt).toLocaleString()}</p>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          {rxItems.length === 0 ? (
            <Card><EmptyState icon={<Pill className="h-8 w-8" />} title="No prescription changes" message="No prescriptions with changes to compare." /></Card>
          ) : (
            rxItems.map((diff) => (
              <Card key={diff.id} className={diff.reviewAction ? 'opacity-75' : ''}>
                <div className="flex items-center justify-between border-b border-navy-100 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50">
                      <Pill className="h-4 w-4 text-navy-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy-900">{diff.medicationName}</p>
                      <Link to={`/doctor/patients/${diff.patientId}`} className="text-xs text-teal-600 hover:underline">
                        {patients[diff.patientId]?.fullName || 'Patient'}
                      </Link>
                    </div>
                  </div>
                  {diff.reviewAction ? (
                    <StatusBadge variant={actionConfig[diff.reviewAction].variant}>
                      {actionConfig[diff.reviewAction].label}
                    </StatusBadge>
                  ) : (
                    <button onClick={() => openActionModal(diff.id, 'rx')} className="btn-secondary text-xs">
                      <PenLine className="h-3.5 w-3.5" />
                      Review
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-px bg-navy-100 sm:grid-cols-2">
                  <div className="bg-white p-4">
                    <p className="text-2xs font-semibold uppercase tracking-wide text-navy-500">Previous</p>
                    <dl className="mt-2 space-y-1.5">
                      <DiffRow label="Strength" value={diff.previousStrength} />
                      <DiffRow label="Dosage" value={diff.previousDosage} />
                      <DiffRow label="Route" value={diff.previousRoute} />
                      <DiffRow label="Frequency" value={diff.previousFrequency} />
                      <DiffRow label="Duration" value={diff.previousDuration} />
                    </dl>
                    <p className="mt-2 text-xs text-navy-400">{diff.previousDate || '—'} · {diff.previousSource || '—'}</p>
                  </div>
                  <div className="bg-white p-4">
                    <p className="text-2xs font-semibold uppercase tracking-wide text-teal-600">Current</p>
                    <dl className="mt-2 space-y-1.5">
                      <DiffRow label="Strength" value={diff.currentStrength} highlight={diff.previousStrength !== diff.currentStrength} />
                      <DiffRow label="Dosage" value={diff.currentDosage} highlight={diff.previousDosage !== diff.currentDosage} />
                      <DiffRow label="Route" value={diff.currentRoute} highlight={diff.previousRoute !== diff.currentRoute} />
                      <DiffRow label="Frequency" value={diff.currentFrequency} highlight={diff.previousFrequency !== diff.currentFrequency} />
                      <DiffRow label="Duration" value={diff.currentDuration} highlight={diff.previousDuration !== diff.currentDuration} />
                    </dl>
                    <p className="mt-2 text-xs text-navy-400">{diff.currentDate} · {diff.currentSource}</p>
                  </div>
                </div>

                {diff.reviewAction && diff.reviewNote && (
                  <div className="border-t border-navy-100 bg-navy-50/50 px-5 py-3">
                    <p className="text-xs text-navy-600"><span className="font-semibold">Note:</span> {diff.reviewNote}</p>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      <p className="text-xs text-navy-400">
        Differences are highlighted neutrally. Changes in values or prescriptions do not automatically indicate improvement or deterioration. Clinical interpretation is the reviewing clinician's responsibility.
      </p>

      {/* Action modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4" onClick={() => setActionModal(null)}>
          <Card className="w-full max-w-md p-5" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-navy-900">Record Review Action</h3>
              <p className="mt-0.5 text-xs text-navy-500">This action will be logged with your identity, timestamp, and the record ID.</p>
            </div>

            <div className="mb-4 space-y-2">
              {(Object.keys(actionConfig) as ReviewAction[]).map((action) => {
                const cfg = actionConfig[action];
                return (
                  <button
                    key={action}
                    onClick={() => setSelectedAction(action)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                      selectedAction === action ? 'border-teal-500 bg-teal-50' : 'border-navy-200 hover:bg-navy-50'
                    }`}
                  >
                    <cfg.icon className={`h-4 w-4 ${selectedAction === action ? 'text-teal-600' : 'text-navy-400'}`} />
                    <span className="text-sm font-medium text-navy-900">{cfg.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-navy-700">Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add a clinical note about this review action..."
                className="input-field resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setActionModal(null)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleSubmitAction} disabled={!selectedAction || saving} className="btn-primary text-sm">
                {saving ? 'Saving...' : 'Submit action'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function DiffRow({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <dt className="text-xs text-navy-400">{label}</dt>
      <dd className={`font-medium ${highlight ? 'text-teal-700' : 'text-navy-700'}`}>{value || '—'}</dd>
    </div>
  );
}


