import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldCheck, Lock, Mail, AlertCircle, Stethoscope } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function LoginPage() {
  const { signIn, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    const { success, error: err } = await signIn(email, password);
    if (success) {
      navigate('/doctor/overview');
    } else {
      setError(err || 'Sign-in failed. Please try again.');
    }
    setLoading(false);
  };

  const fillDemo = () => {
    setEmail('ananya.sharma@continuumhealth.in');
    setPassword('demo1234');
  };

  return (
    <div className="min-h-screen bg-navy-50 lg:grid lg:grid-cols-2">
      {/* Left panel — brand & info */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 p-12 text-white lg:flex">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(49,151,149,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(14,165,233,0.2) 0%, transparent 50%)' }} />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold">HealthContinuum AI</p>
              <p className="text-sm text-navy-300">Doctor Portal</p>
            </div>
          </div>
        </div>
        <div className="relative space-y-6">
          <div>
            <h2 className="text-2xl font-bold leading-tight">Closed-loop health continuity for better care.</h2>
            <p className="mt-3 text-navy-300">Securely review patient-authorized records, compare results over time, document clinical decisions, and track follow-ups — all in one place.</p>
          </div>
          <div className="space-y-3">
            {[
              { icon: ShieldCheck, text: 'Consent-based access with six-digit PIN verification' },
              { icon: Stethoscope, text: 'Side-by-side continuity review of lab results and prescriptions' },
              { icon: Lock, text: 'Full audit trail of every record access and clinical decision' },
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <feat.icon className="h-4 w-4 text-teal-300" />
                </div>
                <p className="text-sm text-navy-200">{feat.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-navy-400">
          <p>The six-digit PIN is an application-specific sharing mechanism. It is not an official ABHA credential and does not represent ABDM consent.</p>
        </div>
      </div>

      {/* Right panel — sign-in form */}
      <div className="flex min-h-screen items-center justify-center px-6 py-12 lg:min-h-0">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-navy-900">HealthContinuum AI</p>
              <p className="text-sm text-teal-600">Doctor Portal</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-navy-900">Doctor Sign In</h1>
            <p className="mt-2 text-sm text-navy-500">Enter your credentials to access the portal.</p>
          </div>

          {isDemoMode && (
            <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning-600" />
              <div>
                <p className="text-xs font-semibold text-warning-800">Demo Mode Active</p>
                <p className="mt-0.5 text-xs text-warning-700">Any credentials will sign you in with a synthetic doctor profile. No real authentication is performed.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-navy-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@hospital.in"
                  className="input-field pl-10"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-navy-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pl-10"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-error-200 bg-error-50 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-error-500" />
                <p className="text-xs text-error-700">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            {isDemoMode && (
              <button type="button" onClick={fillDemo} className="btn-secondary w-full">
                Fill demo credentials
              </button>
            )}
          </form>

          <div className="mt-8 border-t border-navy-200 pt-6">
            <p className="text-xs text-navy-400">
              Doctor and patient accounts are separate roles. Access to patient records requires explicit authorization through the PIN-based sharing workflow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
