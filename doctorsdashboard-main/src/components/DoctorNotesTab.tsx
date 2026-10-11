import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { clinicalNoteService, followUpService } from '@/services/api';
import { Card, CardHeader, EmptyState, StatusBadge, LoadingState } from '@/components/ui';
import { Stethoscope, CalendarCheck, FileText, Clock, PenLine, Plus, X, AlertCircle } from 'lucide-react';
import type { ClinicalNote, FollowUp } from '@/types';

export function DoctorNotesTab({ patientId, patientName }: { patientId: string; patientName: string }) {
  const { doctor } = useAuth();
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [followupPlan, setFollowupPlan] = useState('');
  const [followupDue, setFollowupDue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doctor) return;
    (async () => {
      setLoading(true);
      const [n, allFu] = await Promise.all([
        clinicalNoteService.getNotes(patientId),
        followUpService.getFollowUps(),
      ]);
      setNotes(n);
      setFollowups(allFu.filter((f) => f.patientId === patientId));
      setLoading(false);
    })();
  }, [patientId, doctor]);

  const handleSaveNote = async () => {
    if (!doctor || !noteContent.trim()) return;
    setSaving(true);
    setError(null);
    const { success } = await clinicalNoteService.createNote(patientId, noteContent, false, [], doctor);
    if (success) {
      const updated = await clinicalNoteService.getNotes(patientId);
      setNotes(updated);
      setNoteContent('');
      setShowNoteForm(false);
    } else {
      setError('Failed to save note. Please try again.');
    }
    setSaving(false);
  };

  const handleSaveFollowup = async () => {
    if (!doctor || !followupPlan.trim() || !followupDue) return;
    setSaving(true);
    setError(null);
    const { success } = await followUpService.createFollowUp(patientId, followupPlan, followupDue, doctor);
    if (success) {
      const allFu = await followUpService.getFollowUps();
      setFollowups(allFu.filter((f) => f.patientId === patientId));
      setFollowupPlan('');
      setFollowupDue('');
      setShowFollowupForm(false);
    } else {
      setError('Failed to save follow-up. Please try again.');
    }
    setSaving(false);
  };

  if (loading) return <LoadingState message="Loading notes and follow-ups..." />;

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2.5 rounded-lg border border-error-200 bg-error-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-error-500" />
          <p className="text-xs text-error-700">{error}</p>
        </div>
      )}

      {/* Clinical notes */}
      <Card>
        <CardHeader
          title="Clinical Notes"
          subtitle="Your documented review notes and clinical decisions"
          action={
            <button onClick={() => setShowNoteForm(!showNoteForm)} className="btn-secondary text-xs">
              {showNoteForm ? <><X className="h-3.5 w-3.5" /> Cancel</> : <><Plus className="h-3.5 w-3.5" /> Add note</>}
            </button>
          }
        />

        {showNoteForm && (
          <div className="border-b border-navy-100 p-4">
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Review Note</label>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={5}
              placeholder="Document your clinical review, observations, and decision..."
              className="input-field resize-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-navy-400">Will be saved as authored by {doctor?.fullName}. Version history is preserved.</p>
              <button onClick={handleSaveNote} disabled={saving || !noteContent.trim()} className="btn-primary text-xs">
                {saving ? 'Saving...' : 'Save note'}
              </button>
            </div>
          </div>
        )}

        {notes.length === 0 ? (
          <EmptyState icon={<PenLine className="h-8 w-8" />} title="No clinical notes" message="No review notes have been documented for this patient yet." />
        ) : (
          <div className="divide-y divide-navy-100">
            {notes.map((note) => (
              <div key={note.id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-700 text-2xs font-semibold text-white">
                      {note.authorName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-navy-900">{note.authorName}</p>
                      <p className="text-2xs text-navy-400">{note.authorCredentials} · v{note.version}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {note.isAIGenerated && <StatusBadge variant="warning">AI-generated</StatusBadge>}
                    {note.status === 'superseded' && <StatusBadge variant="neutral">superseded</StatusBadge>}
                    <span className="text-2xs text-navy-400">{new Date(note.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-navy-700 whitespace-pre-wrap">{note.content}</p>
                {note.sourceReferences.length > 0 && (
                  <p className="mt-2 text-2xs text-navy-400">References: {note.sourceReferences.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Follow-ups */}
      <Card>
        <CardHeader
          title="Follow-up Plans"
          subtitle={`Follow-up actions for ${patientName}`}
          action={
            <button onClick={() => setShowFollowupForm(!showFollowupForm)} className="btn-secondary text-xs">
              {showFollowupForm ? <><X className="h-3.5 w-3.5" /> Cancel</> : <><Plus className="h-3.5 w-3.5" /> Add follow-up</>}
            </button>
          }
        />

        {showFollowupForm && (
          <div className="border-b border-navy-100 p-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-700">Follow-up Plan</label>
              <textarea
                value={followupPlan}
                onChange={(e) => setFollowupPlan(e.target.value)}
                rows={3}
                placeholder="Describe the follow-up plan..."
                className="input-field resize-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-700">Due Date</label>
              <input
                type="date"
                value={followupDue}
                onChange={(e) => setFollowupDue(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="flex justify-end">
              <button onClick={handleSaveFollowup} disabled={saving || !followupPlan.trim() || !followupDue} className="btn-primary text-xs">
                {saving ? 'Saving...' : 'Save follow-up'}
              </button>
            </div>
          </div>
        )}

        {followups.length === 0 ? (
          <EmptyState icon={<CalendarCheck className="h-8 w-8" />} title="No follow-ups" message="No follow-up plans have been created for this patient." />
        ) : (
          <div className="divide-y divide-navy-100">
            {followups.map((fu) => (
              <div key={fu.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-navy-900">{fu.plan}</p>
                  <StatusBadge variant={fu.status === 'completed' ? 'success' : fu.status === 'overdue' ? 'error' : 'warning'}>
                    {fu.status}
                  </StatusBadge>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-navy-400">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Due: {fu.dueDate}</span>
                  <span>· By {fu.authorName}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="text-xs text-navy-400">
        Clinical notes are authored by the signed-in clinician and saved with timestamp and version history. Edits create a new version rather than overwriting previous content. AI-generated summaries are always labelled and never appear as verified clinical decisions.
      </p>
    </div>
  );
}
