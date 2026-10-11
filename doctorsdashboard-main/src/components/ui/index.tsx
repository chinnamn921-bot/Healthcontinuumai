import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// --- Status Badge ---

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'teal';

const badgeStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  error: 'bg-error-50 text-error-700',
  info: 'bg-sky-50 text-sky-700',
  neutral: 'bg-navy-100 text-navy-600',
  teal: 'bg-teal-50 text-teal-700',
};

export function StatusBadge({ variant, children }: { variant: BadgeVariant; children: ReactNode }) {
  return <span className={`badge ${badgeStyles[variant]}`}>{children}</span>;
}

// --- Card ---

export function Card({ children, className = '', hover = false, onClick }: { children: ReactNode; className?: string; hover?: boolean; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <div className={`card ${hover ? 'card-hover' : ''} ${className}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {children}
    </div>
  );
}

// --- Card Header ---

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between border-b border-navy-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-navy-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// --- Page Header ---

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold text-navy-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-navy-500">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

// --- Breadcrumb ---

export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-navy-500">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {item.to ? (
            <Link to={item.to} className="hover:text-navy-700 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-navy-700 font-medium">{item.label}</span>
          )}
          {i < items.length - 1 && <ChevronRight className="h-3 w-3 text-navy-300" />}
        </span>
      ))}
    </nav>
  );
}

// --- Empty State ---

export function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <div className="mb-3 text-navy-300">{icon}</div>}
      <h3 className="text-sm font-semibold text-navy-700">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-navy-400">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// --- Loading Spinner ---

export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
  return (
    <svg className={`animate-spin ${sizes[size]} text-teal-500 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// --- Loading State ---

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Spinner size="lg" />
      <p className="mt-3 text-sm text-navy-500">{message}</p>
    </div>
  );
}

// --- Error State ---

export function ErrorState({ title = 'Something went wrong', message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-error-50">
        <svg className="h-6 w-6 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-navy-700">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-navy-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-4">
          Try again
        </button>
      )}
    </div>
  );
}

// --- Demo Banner ---

export function DemoBanner() {
  return (
    <div className="flex items-center gap-2 border-b border-warning-200 bg-warning-50 px-4 py-2 text-xs text-warning-800">
      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-warning-500 animate-pulse-soft" />
      <span className="font-medium">Demo Mode</span>
      <span className="text-warning-600">— Using synthetic patient data. No real patient information is stored or transmitted.</span>
    </div>
  );
}
