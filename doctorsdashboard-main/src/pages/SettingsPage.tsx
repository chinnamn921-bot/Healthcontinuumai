import { useAuth } from '@/context/AuthContext';
import { getServiceAdaptersInfo, SERVICE_MODE } from '@/services/api';
import { PageHeader, Card, CardHeader, StatusBadge } from '@/components/ui';
import { User, Building2, BadgeCheck, Database, Server, ShieldCheck, Info, Activity } from 'lucide-react';
import type { ServiceStatus } from '@/types';

const statusVariants: Record<ServiceStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  connected: 'success',
  demo: 'warning',
  not_connected: 'neutral',
  error: 'error',
};

export function SettingsPage() {
  const { doctor, isDemoMode } = useAuth();
  const adapters = getServiceAdaptersInfo();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Settings" subtitle="Doctor profile, facility configuration, and service integration status." />

      {/* Profile */}
      <Card>
        <CardHeader title="Doctor Profile" subtitle="Your verified professional identity" />
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-700 text-lg font-bold text-white">
              {doctor?.avatarInitials}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-navy-900">{doctor?.fullName}</h3>
                {doctor?.verified && (
                  <span className="flex items-center gap-1 text-xs font-medium text-teal-600">
                    <BadgeCheck className="h-4 w-4" />
                    Verified
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-navy-500">{doctor?.credentials}</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoRow icon={<User className="h-4 w-4" />} label="Specialty" value={doctor?.specialty || '—'} />
                <InfoRow icon={<BadgeCheck className="h-4 w-4" />} label="Registration No." value={doctor?.registrationNumber || '—'} />
                <InfoRow icon={<Building2 className="h-4 w-4" />} label="Facility" value={doctor?.facilityName || 'Not configured'} />
                <InfoRow icon={<User className="h-4 w-4" />} label="Email" value={doctor?.email || '—'} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Mode indicator */}
      <Card className={isDemoMode ? 'border-warning-200' : ''}>
        <div className="flex items-center gap-3 p-5">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isDemoMode ? 'bg-warning-50' : 'bg-success-50'}`}>
            <Activity className={`h-5 w-5 ${isDemoMode ? 'text-warning-600' : 'text-success-600'}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-navy-900">
              {SERVICE_MODE === 'demo' ? 'Demo Mode' : 'Live Mode'}
            </p>
            <p className="text-xs text-navy-500">
              {isDemoMode
                ? 'Using synthetic patient data. No real patient information is stored or transmitted. All service adapters return demo data.'
                : 'Connected to live backend services.'}
            </p>
          </div>
          <StatusBadge variant={isDemoMode ? 'warning' : 'success'}>
            {SERVICE_MODE}
          </StatusBadge>
        </div>
      </Card>

      {/* Service adapters */}
      <Card>
        <CardHeader title="Service Adapters" subtitle="Status of each backend integration point" />
        <div className="divide-y divide-navy-100">
          {adapters.map((adapter) => (
            <div key={adapter.name} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-50">
                  <Database className="h-4 w-4 text-navy-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-navy-900">{adapter.name}</p>
                  <p className="text-xs text-navy-400">{adapter.detail}</p>
                </div>
              </div>
              <StatusBadge variant={statusVariants[adapter.status]}>
                {adapter.status.replace(/_/g, ' ')}
              </StatusBadge>
            </div>
          ))}
        </div>
      </Card>

      {/* ABDM placeholder */}
      <Card>
        <CardHeader title="ABDM Integration" subtitle="Future integration interface for official ABDM workflows" />
        <div className="p-5">
          <div className="flex items-start gap-3 rounded-lg border border-navy-200 bg-navy-50 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-navy-400" />
            <div className="text-xs text-navy-500">
              <p className="font-medium text-navy-700">Not yet configured</p>
              <p className="mt-1">
                This portal includes an integration-ready adapter placeholder for future approved ABDM sandbox/API work.
                When configured, it will support official consent requests, status callbacks, and data retrieval through
                applicable ABDM workflows.
              </p>
              <p className="mt-2">
                The six-digit PIN in this application is an application-specific patient-sharing mechanism, not an official
                ABHA credential, not a replacement for ABHA QR/Scan &amp; Share, and not proof of identity or consent by itself.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Deployment info */}
      <Card>
        <CardHeader title="Deployment Configuration" subtitle="One-domain deployment under existing app" />
        <div className="p-5 space-y-3">
          <div className="rounded-lg border border-navy-200 bg-navy-50 p-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-navy-500">Route Structure</p>
            <div className="mt-2 space-y-1 text-xs text-navy-600">
              <p><span className="font-mono text-teal-600">/</span> — Patient application (existing)</p>
              <p><span className="font-mono text-teal-600">/doctor/*</span> — Doctor Portal (this module)</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg border border-info-200 bg-sky-50 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-500" />
            <p className="text-xs text-sky-700">
              If the deployment host requires route rewrites for client-side navigation, configure a catch-all rewrite
              that forwards all <span className="font-mono">/doctor/*</span> requests to <span className="font-mono">index.html</span>.
              API keys and secrets must remain server-side and should never be embedded in frontend code.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-50 text-navy-400">
        {icon}
      </div>
      <div>
        <p className="text-2xs font-semibold uppercase tracking-wide text-navy-500">{label}</p>
        <p className="text-sm text-navy-900">{value}</p>
      </div>
    </div>
  );
}
