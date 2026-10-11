import { useEffect, useState } from 'react';
import { ScrollText, Search, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { auditService } from '@/services/api';
import { PageHeader, Card, LoadingState, EmptyState, StatusBadge } from '@/components/ui';
import type { AuditEvent } from '@/types';

const actionLabels: Record<string, string> = {
  PIN_REDEMPTION: 'PIN Redemption',
  PIN_ATTEMPT: 'PIN Attempt',
  RECORD_VIEW: 'Record View',
  REVIEW_ACTION: 'Review Action',
  CLINICAL_NOTE_CREATE: 'Note Created',
  CLINICAL_NOTE_AMEND: 'Note Amended',
  FOLLOWUP_CREATE: 'Follow-up Created',
  FOLLOWUP_COMPLETE: 'Follow-up Completed',
  GRANT_REVOKE: 'Grant Revoked',
  SESSION_END: 'Session Ended',
};

export function AuditHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const limit = 25;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { events: evts, total: t } = await auditService.getAuditEvents(page, limit);
      setEvents(evts);
      setTotal(t);
      setLoading(false);
    })();
  }, [page]);

  const filtered = query
    ? events.filter(
        (e) =>
          e.actorName.toLowerCase().includes(query.toLowerCase()) ||
          (e.patientName?.toLowerCase().includes(query.toLowerCase()) ?? false) ||
          e.action.toLowerCase().includes(query.toLowerCase()) ||
          e.detail.toLowerCase().includes(query.toLowerCase()),
      )
    : events;

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Audit History"
        subtitle="Immutable log of all access, review, and consent actions. Audit logs cannot be edited or deleted."
      />

      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search audit events..."
            className="input-field pl-10"
            aria-label="Search audit events"
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 py-2 text-xs text-navy-500">
          <Lock className="h-3.5 w-3.5" />
          Read-only
        </div>
      </div>

      <Card>
        {loading ? (
          <LoadingState message="Loading audit events..." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<ScrollText className="h-8 w-8" />} title="No audit events" message="No events match your search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-left text-2xs font-semibold uppercase tracking-wide text-navy-500">
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="hidden px-5 py-3 md:table-cell">Patient</th>
                  <th className="hidden px-5 py-3 lg:table-cell">Detail</th>
                  <th className="px-5 py-3">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {filtered.map((event) => (
                  <tr key={event.id} className="hover:bg-navy-50/50">
                    <td className="px-5 py-3 text-xs text-navy-500 whitespace-nowrap">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-navy-900">{event.actorName}</p>
                      <p className="text-2xs text-navy-400">{event.actorRole}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-navy-700">{actionLabels[event.action] || event.action.replace(/_/g, ' ')}</p>
                      {event.purpose && <p className="text-2xs text-navy-400">{event.purpose}</p>}
                    </td>
                    <td className="hidden px-5 py-3 md:table-cell">
                      <p className="text-sm text-navy-600">{event.patientName || '—'}</p>
                    </td>
                    <td className="hidden px-5 py-3 lg:table-cell max-w-xs">
                      <p className="text-xs text-navy-500 truncate">{event.detail}</p>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge variant={event.outcome === 'success' ? 'success' : event.outcome === 'denied' ? 'error' : 'warning'}>
                        {event.outcome}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-navy-100 px-5 py-3">
            <p className="text-xs text-navy-400">
              Page {page} of {totalPages} · {total} total events
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost px-2 py-1.5 disabled:opacity-30" aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost px-2 py-1.5 disabled:opacity-30" aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      <p className="text-xs text-navy-400">
        Audit logs record who accessed which patient records, the action taken, timestamp, purpose, and authorization reference. Access attempts and denied attempts are logged without recording PINs or sensitive document contents. Audit integrity is enforced — doctors cannot edit or delete audit entries.
      </p>
    </div>
  );
}
