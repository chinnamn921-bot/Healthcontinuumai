import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Clock, CheckCircle2, AlertCircle, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { followUpService, patientService } from '@/services/api';
import { PageHeader, Card, CardHeader, LoadingState, EmptyState, StatusBadge } from '@/components/ui';
import type { FollowUp, PatientSummary } from '@/types';

export function FollowUpsPage() {
  const { doctor } = useAuth();
  const [loading, setLoading] = useState(true);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('all');
  const [patients, setPatients] = useState<Record<string, PatientSummary>>({});

  useEffect(() => {
    if (!doctor) return;
    (async () => {
      setLoading(true);
      const [fus, allPatients] = await Promise.all([
        followUpService.getFollowUps(),
        patientService.searchPatients('', 1, 100),
      ]);
      setFollowups(fus);
      const pMap: Record<string, PatientSummary> = {};
      allPatients.patients.forEach((p) => { pMap[p.id] = p; });
      setPatients(pMap);
      setLoading(false);
    })();
  }, [doctor]);

  const handleComplete = async (id: string) => {
    if (!doctor) return;
    await followUpService.completeFollowUp(id, doctor);
    const updated = await followUpService.getFollowUps();
    setFollowups(updated);
  };

  const filtered = filter === 'all' ? followups : followups.filter((f) => f.status === filter);

  if (loading) return <LoadingState message="Loading follow-ups..." />;

  const counts = {
    pending: followups.filter((f) => f.status === 'pending').length,
    overdue: followups.filter((f) => f.status === 'overdue').length,
    completed: followups.filter((f) => f.status === 'completed').length,
  };

  const filterTabs: { key: typeof filter; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: followups.length },
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'overdue', label: 'Overdue', count: counts.overdue },
    { key: 'completed', label: 'Completed', count: counts.completed },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Follow-ups" subtitle="Track and manage follow-up plans across all patients." />

      <div className="flex gap-1 border-b border-navy-200">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-all ${
              filter === tab.key ? 'tab-active' : 'tab-inactive'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-2xs font-semibold ${filter === tab.key ? 'bg-teal-100 text-teal-700' : 'bg-navy-100 text-navy-500'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={<CalendarCheck className="h-8 w-8" />} title="No follow-ups" message="No follow-up plans match this filter." />
        ) : (
          <div className="divide-y divide-navy-100">
            {filtered.map((fu) => (
              <div key={fu.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
                    fu.status === 'overdue' ? 'bg-error-50' : fu.status === 'completed' ? 'bg-success-50' : 'bg-warning-50'
                  }`}>
                    {fu.status === 'overdue' ? <AlertCircle className="h-4 w-4 text-error-500" /> :
                     fu.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-success-600" /> :
                     <Clock className="h-4 w-4 text-warning-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy-900">{fu.plan}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-navy-400">
                      <Link to={`/doctor/patients/${fu.patientId}`} className="flex items-center gap-1 text-teal-600 hover:underline">
                        <User className="h-3 w-3" />
                        {patients[fu.patientId]?.fullName || 'Patient'}
                      </Link>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Due: {fu.dueDate}</span>
                      <span>By {fu.authorName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge variant={fu.status === 'completed' ? 'success' : fu.status === 'overdue' ? 'error' : 'warning'}>
                    {fu.status}
                  </StatusBadge>
                  {fu.status !== 'completed' && (
                    <button onClick={() => handleComplete(fu.id)} className="btn-ghost text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark done
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
