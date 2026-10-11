import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, CalendarCheck, GitCompareArrows, ArrowRight, Clock, Activity, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { overviewService } from '@/services/api';
import { PageHeader, Card, CardHeader, LoadingState, StatusBadge, EmptyState } from '@/components/ui';
import type { SharedAccessGrant, ReviewComparisonItem, AuditEvent, FollowUp } from '@/types';

export function OverviewPage() {
  const { doctor } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ authorizedPatients: number; recordsAwaitingReview: number; followUpsDue: number; reviewsCompleted: number } | null>(null);
  const [recentShares, setRecentShares] = useState<SharedAccessGrant[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewComparisonItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<AuditEvent[]>([]);
  const [followUpReminders, setFollowUpReminders] = useState<FollowUp[]>([]);

  useEffect(() => {
    if (!doctor) return;
    (async () => {
      const [s, shares, queue, activity, reminders] = await Promise.all([
        overviewService.getOverviewStats(doctor),
        overviewService.getRecentShares(),
        overviewService.getReviewQueue(),
        overviewService.getRecentActivity(),
        overviewService.getFollowUpReminders(),
      ]);
      setStats(s);
      setRecentShares(shares);
      setReviewQueue(queue);
      setRecentActivity(activity);
      setFollowUpReminders(reminders);
      setLoading(false);
    })();
  }, [doctor]);

  if (loading) return <LoadingState message="Loading your overview..." />;
  if (!stats) return <LoadingState />;

  const summaryCards = [
    { label: 'Authorized Patients', value: stats.authorizedPatients, icon: Users, to: '/doctor/patients', variant: 'teal' as const, desc: 'With active access grants' },
    { label: 'Records Awaiting Review', value: stats.recordsAwaitingReview, icon: FileText, to: '/doctor/continuity-review', variant: 'warning' as const, desc: 'Continuity review pending' },
    { label: 'Follow-ups Due', value: stats.followUpsDue, icon: CalendarCheck, to: '/doctor/follow-ups', variant: 'info' as const, desc: 'Pending or overdue' },
    { label: 'Reviews Completed', value: stats.reviewsCompleted, icon: GitCompareArrows, to: '/doctor/continuity-review', variant: 'success' as const, desc: 'Total confirmed actions' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Welcome, ${doctor?.fullName}`}
        subtitle="Your doctor overview with today's priorities and recent activity."
        action={
          <Link to="/doctor/shared-records" className="btn-primary">
            <UserPlus className="h-4 w-4" />
            Access Patient Records
          </Link>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Link key={card.label} to={card.to}>
            <Card hover className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50">
                  <card.icon className="h-5 w-5 text-navy-600" />
                </div>
                <StatusBadge variant={card.variant}>
                  <span className="text-base font-bold">{card.value}</span>
                </StatusBadge>
              </div>
              <p className="mt-3 text-sm font-semibold text-navy-900">{card.label}</p>
              <p className="mt-0.5 text-xs text-navy-400">{card.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Continuity review queue */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Continuity Review Queue"
            subtitle="Lab results awaiting your review, sorted by workflow priority"
            action={<Link to="/doctor/continuity-review" className="btn-ghost text-xs">View all <ArrowRight className="h-3.5 w-3.5" /></Link>}
          />
          <div className="divide-y divide-navy-100">
            {reviewQueue.length === 0 ? (
              <EmptyState icon={<GitCompareArrows className="h-8 w-8" />} title="No pending reviews" message="All available comparisons have been reviewed." />
            ) : (
              reviewQueue.map((item) => (
                <Link key={item.id} to={`/doctor/continuity-review`} className="flex items-center justify-between px-5 py-3 hover:bg-navy-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-50">
                      <FileText className="h-4 w-4 text-warning-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-navy-900">{item.testName}</p>
                      <p className="text-xs text-navy-400">
                        {item.currentValue} {item.currentUnit} · {item.currentDate}
                        {item.numericDifference !== null && (
                          <span className={`ml-2 ${item.numericDifference < 0 ? 'text-success-600' : 'text-error-600'}`}>
                            {item.numericDifference > 0 ? '+' : ''}{item.numericDifference} {item.currentUnit}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-navy-300" />
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Follow-up reminders */}
        <Card>
          <CardHeader
            title="Follow-up Reminders"
            action={<Link to="/doctor/follow-ups" className="btn-ghost text-xs">View all <ArrowRight className="h-3.5 w-3.5" /></Link>}
          />
          <div className="divide-y divide-navy-100">
            {followUpReminders.length === 0 ? (
              <EmptyState icon={<CalendarCheck className="h-8 w-8" />} title="No reminders" message="You're all caught up on follow-ups." />
            ) : (
              followUpReminders.map((fu) => (
                <Link key={fu.id} to={`/doctor/patients/${fu.patientId}`} className="block px-5 py-3 hover:bg-navy-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-navy-900">{fu.plan.slice(0, 60)}{fu.plan.length > 60 ? '...' : ''}</p>
                    <StatusBadge variant={fu.status === 'overdue' ? 'error' : 'warning'}>
                      {fu.status}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-navy-400">
                    <Clock className="h-3 w-3" />
                    Due: {fu.dueDate}
                  </p>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent shares */}
        <Card>
          <CardHeader
            title="Recent Authorized Shares"
            subtitle="Patients who recently granted you access"
            action={<Link to="/doctor/access-consent" className="btn-ghost text-xs">View all <ArrowRight className="h-3.5 w-3.5" /></Link>}
          />
          <div className="divide-y divide-navy-100">
            {recentShares.length === 0 ? (
              <EmptyState icon={<Users className="h-8 w-8" />} title="No active shares" message="No patients have shared records with you recently." />
            ) : (
              recentShares.map((grant) => (
                <Link key={grant.id} to={`/doctor/patients/${grant.patientId}`} className="flex items-center justify-between px-5 py-3 hover:bg-navy-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-navy-900">{grant.patientName}</p>
                    <p className="text-xs text-navy-400">{grant.scope.length} categories · {grant.purpose.replace('_', ' ')}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge variant="success">active</StatusBadge>
                    <p className="mt-1 text-2xs text-navy-400">Expires {new Date(grant.expiresAt).toLocaleDateString()}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader
            title="Recent Activity"
            subtitle="Latest audit events from your sessions"
            action={<Link to="/doctor/audit-history" className="btn-ghost text-xs">View all <ArrowRight className="h-3.5 w-3.5" /></Link>}
          />
          <div className="divide-y divide-navy-100">
            {recentActivity.length === 0 ? (
              <EmptyState icon={<Activity className="h-8 w-8" />} title="No activity" message="No recent actions recorded." />
            ) : (
              recentActivity.slice(0, 6).map((event) => (
                <div key={event.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-navy-900">{event.action.replace(/_/g, ' ')}</p>
                    <StatusBadge variant={event.outcome === 'success' ? 'success' : event.outcome === 'denied' ? 'error' : 'warning'}>
                      {event.outcome}
                    </StatusBadge>
                  </div>
                  <p className="mt-0.5 text-xs text-navy-400">
                    {event.patientName ? `${event.patientName} · ` : ''}
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
