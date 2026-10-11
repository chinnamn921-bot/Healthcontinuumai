import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, ArrowRight, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { patientService } from '@/services/api';
import { PageHeader, Card, LoadingState, EmptyState } from '@/components/ui';
import type { PatientSummary } from '@/types';

export function PatientsPage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      patientService.searchPatients(query, page, limit).then((result) => {
        if (active) {
          setPatients(result.patients);
          setTotal(result.total);
          setLoading(false);
        }
      });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Patient Directory"
        subtitle="Search for patients by name or application patient ID. Access to records requires authorization."
      />

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Search by name, patient ID, or ABHA ID..."
          className="input-field pl-10"
          aria-label="Search patients"
        />
      </div>

      <Card>
        {loading ? (
          <LoadingState message="Searching patients..." />
        ) : patients.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="No patients found"
            message={query ? `No patients matching "${query}". Try a different search term.` : 'No patients in the directory.'}
          />
        ) : (
          <>
            {/* Table header — hidden on mobile */}
            <div className="hidden border-b border-navy-100 px-5 py-3 sm:grid sm:grid-cols-12 sm:gap-4">
              <div className="col-span-4 text-2xs font-semibold uppercase tracking-wide text-navy-500">Patient</div>
              <div className="col-span-2 text-2xs font-semibold uppercase tracking-wide text-navy-500">Patient ID</div>
              <div className="col-span-2 text-2xs font-semibold uppercase tracking-wide text-navy-500">Last Visit</div>
              <div className="col-span-2 text-2xs font-semibold uppercase tracking-wide text-navy-500">ABHA</div>
              <div className="col-span-2 text-2xs font-semibold uppercase tracking-wide text-navy-500">Access</div>
            </div>

            <div className="divide-y divide-navy-100">
              {patients.map((patient) => (
                <Link
                  key={patient.id}
                  to={`/doctor/patients/${patient.id}`}
                  className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-navy-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-100 text-xs font-semibold text-navy-600">
                      {patient.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-navy-900">{patient.fullName}</p>
                      <p className="text-xs text-navy-400">
                        {patient.age !== null ? `${patient.age} yrs` : 'Age unknown'} · {patient.sex}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm text-navy-700 font-mono">{patient.appPatientId}</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm text-navy-600">{patient.lastVisitDate || 'No visits'}</p>
                  </div>
                  <div className="hidden sm:block">
                    {patient.abhaLinked ? (
                      <span className="text-xs font-mono text-navy-600">{patient.abhaId}</span>
                    ) : (
                      <span className="text-xs text-navy-400">Not linked</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wide text-navy-600">
                      <Lock className="h-3 w-3" />
                      PIN required
                    </span>
                    <ArrowRight className="h-4 w-4 text-navy-300" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-navy-100 px-5 py-3">
                <p className="text-xs text-navy-400">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-ghost px-2 py-1.5 disabled:opacity-30"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-medium text-navy-600">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-ghost px-2 py-1.5 disabled:opacity-30"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <p className="text-xs text-navy-400">
        ABHA identifier is shown only when legitimately available and verified. It is not required for the app's own PIN-based sharing workflow. Appearance in this directory does not grant access to medical records.
      </p>
    </div>
  );
}
