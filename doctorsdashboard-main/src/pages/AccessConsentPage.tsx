import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, Clock, Ban, Info, Link2, Link2Off } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { grantService, abdmService } from '@/services/api';
import { PageHeader, Card, CardHeader, LoadingState, EmptyState, StatusBadge } from '@/components/ui';
import type { SharedAccessGrant, RecordCategory, AbdmIntegrationStatus, AbdmConsentRecord, GrantStatus } from '@/types';

const categoryLabels: Record<RecordCategory, string> = {
  laboratory_reports: 'Lab Reports',
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

const statusConfig: Record<GrantStatus, { variant: 'success' | 'neutral' | 'error'; icon: typeof ShieldCheck }> = {
  active: { variant: 'success', icon: ShieldCheck },
  expired: { variant: 'neutral', icon: Clock },
  revoked: { variant: 'error', icon: ShieldX },
};

export function AccessConsentPage() {
  const { doctor } = useAuth();
  const [loading, setLoading] = useState(true);
  const [grants, setGrants] = useState<SharedAccessGrant[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'revoked'>('all');
  const [abdmStatus, setAbdmStatus] = useState<AbdmIntegrationStatus | null>(null);
  const [abdmConsents, setAbdmConsents] = useState<AbdmConsentRecord[]>([]);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (!doctor) return;
    (async () => {
      setLoading(true);
      const [g, abdm, consents] = await Promise.all([
        grantService.getGrants(),
        Promise.resolve(abdmService.getIntegrationStatus()),
        abdmService.getConsentRecords(),
      ]);
      setGrants(g);
      setAbdmStatus(abdm);
      setAbdmConsents(consents);
      setLoading(false);
    })();
  }, [doctor]);

  const handleRevoke = async (grantId: string) => {
    if (!doctor) return;
    setRevoking(grantId);
    await grantService.revokeGrant(grantId, doctor);
    const updated = await grantService.getGrants();
    setGrants(updated);
    setRevoking(null);
  };

  if (loading) return <LoadingState message="Loading access and consent..." />;

  const filtered = filter === 'all' ? grants : grants.filter((g) => g.status === filter);
  const counts = {
    active: grants.filter((g) => g.status === 'active').length,
    expired: grants.filter((g) => g.status === 'expired').length,
    revoked: grants.filter((g) => g.status === 'revoked').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Access & Consent" subtitle="Manage PIN-based access grants. ABDM consent integration is shown separately." />

      {/* PIN-based grants */}
      <Card>
        <CardHeader
          title="PIN-Based Access Grants"
          subtitle="Application-specific sharing grants created via six-digit PIN"
          action={
            <div className="flex gap-1">
              {(['all', 'active', 'expired', 'revoked'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    filter === f ? 'bg-teal-50 text-teal-700' : 'text-navy-500 hover:bg-navy-50'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f !== 'all' && counts[f] > 0 && ` (${counts[f]})`}
                </button>
              ))}
            </div>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title="No grants" message="No access grants match this filter." />
        ) : (
          <div className="divide-y divide-navy-100">
            {filtered.map((grant) => {
              const cfg = statusConfig[grant.status];
              return (
                <div key={grant.id} className="px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
                        grant.status === 'active' ? 'bg-success-50' : grant.status === 'revoked' ? 'bg-error-50' : 'bg-navy-100'
                      }`}>
                        <cfg.icon className={`h-4 w-4 ${
                          grant.status === 'active' ? 'text-success-600' : grant.status === 'revoked' ? 'text-error-500' : 'text-navy-500'
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-navy-900">{grant.patientName}</p>
                        <p className="text-xs text-navy-400">
                          {purposeLabels[grant.purpose]} · Granted {new Date(grant.grantedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge variant={cfg.variant}>{grant.status}</StatusBadge>
                      {grant.status === 'active' && (
                        <button
                          onClick={() => handleRevoke(grant.id)}
                          disabled={revoking === grant.id}
                          className="btn-danger text-xs"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          {revoking === grant.id ? 'Revoking...' : 'Revoke'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg bg-navy-50 px-3 py-2">
                      <p className="text-2xs font-semibold uppercase text-navy-500">Scope</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {grant.scope.map((s) => (
                          <span key={s} className="text-2xs text-navy-600">{categoryLabels[s]}</span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg bg-navy-50 px-3 py-2">
                      <p className="text-2xs font-semibold uppercase text-navy-500">Expires</p>
                      <p className="mt-0.5 text-xs text-navy-700">{new Date(grant.expiresAt).toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-navy-50 px-3 py-2">
                      <p className="text-2xs font-semibold uppercase text-navy-500">Uses</p>
                      <p className="mt-0.5 text-xs text-navy-700">{grant.usesRemaining} / {grant.maxUses} remaining</p>
                    </div>
                    <div className="rounded-lg bg-navy-50 px-3 py-2">
                      <p className="text-2xs font-semibold uppercase text-navy-500">Attempts</p>
                      <p className="mt-0.5 text-xs text-navy-700">{grant.attemptsUsed} / {grant.maxAttempts}</p>
                    </div>
                  </div>

                  {grant.revokedBy && (
                    <p className="mt-2 text-2xs text-navy-400">Revoked by {grant.revokedBy} on {grant.revokedAt && new Date(grant.revokedAt).toLocaleString()}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ABDM Consent — separate section */}
      <Card className="border-navy-200">
        <CardHeader
          title="ABDM Consent Records"
          subtitle="Official ABDM consent artefacts (separate from PIN-based grants)"
          action={
            abdmStatus?.configured ? (
              <StatusBadge variant="success">Configured</StatusBadge>
            ) : (
              <StatusBadge variant="neutral">Not configured</StatusBadge>
            )
          }
        />
        <div className="p-5">
          <div className="flex items-start gap-3 rounded-lg border border-navy-200 bg-navy-50 p-4">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-navy-400" />
            <div>
              <p className="text-sm font-medium text-navy-700">ABDM integration not yet configured</p>
              <p className="mt-1 text-xs text-navy-500">{abdmStatus?.detail}</p>
              <p className="mt-2 text-xs text-navy-400">
                The six-digit PIN in this application is an application-specific sharing mechanism. It is not an official ABHA credential, not a replacement for ABHA QR/Scan &amp; Share, and not proof of identity or consent by itself.
              </p>
            </div>
          </div>

          {abdmConsents.length > 0 ? (
            <div className="mt-4 divide-y divide-navy-100">
              {abdmConsents.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-navy-900">{c.patientName}</p>
                    <p className="text-xs text-navy-400">{c.purpose} · {c.requestedAt}</p>
                  </div>
                  <StatusBadge variant={c.status === 'granted' ? 'success' : c.status === 'denied' || c.status === 'revoked' ? 'error' : 'neutral'}>
                    {c.status}
                  </StatusBadge>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 text-xs text-navy-400">
              <Link2Off className="h-4 w-4" />
              No official ABDM consent records. Integration will appear here once sandbox access is validated.
            </div>
          )}
        </div>
      </Card>

      <p className="text-xs text-navy-400">
        PIN-based grants are separate from official ABDM consent records. Revoking a grant immediately prevents further record retrieval. Every revocation is logged in the audit trail.
      </p>
    </div>
  );
}
