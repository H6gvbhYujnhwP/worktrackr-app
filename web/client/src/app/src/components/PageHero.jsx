import {
  Building2,
  Pencil,
  MoreHorizontal,
  Plus,
} from 'lucide-react';
import flourish from '../assets/wriggly_flourish.webp';

/*
 * PageHero — the dark "gradient box with squiggly lines" that sits at the top of
 * every redesigned page (WorkTrackr v3.1 redesign foundation).
 *
 * It is fully self-styled with the --wt-* design tokens (with hard-coded
 * fallbacks), so it renders correctly on ANY page regardless of the surrounding
 * light theme. Nothing else in the app is changed by adding this file.
 *
 * Usage (company record, next batch):
 *   <PageHero
 *     title="ABC Ltd"
 *     initials="ABC"
 *     stage="Suspect"
 *     meta={[{icon: Phone, label: 'Telesales'}, {icon: User, label: 'Wez Starter'}]}
 *     actions={<>...buttons...</>}
 *   />
 *
 * Usage (any other page, e.g. My Tasks):
 *   <PageHero title="My Tasks" icon={ListChecks} compact />
 */

const STAGE_TONE = {
  suspect: '#6b7280',
  prospect: '#3b82f6',
  'hot prospect': '#f59e0b',
  customer: '#10b981',
};

export default function PageHero({
  title,
  icon: Icon = Building2,
  initials = null,
  stage = null,
  meta = [],
  actions = null,
  compact = false,
}) {
  const tone = STAGE_TONE[(stage || '').toLowerCase()] || '#6b7280';

  const wrap = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 'var(--wt-radius-lg, 12px)',
    border: '1px solid var(--wt-border, #2e2e4a)',
    borderBottom: '1px solid rgba(245,158,11,0.40)',
    boxShadow: '0 4px 32px rgba(245,158,11,0.12)',
    background:
      'radial-gradient(ellipse 70% 130% at 22% 50%, rgba(245,158,11,0.20) 0%, rgba(245,158,11,0.06) 32%, var(--wt-bg-base, #1a1a2e) 60%)',
    padding: compact ? '18px 22px' : '20px 24px',
  };

  // Two copies of the flourish, mirrored, sweeping in from each top corner.
  const flourishCommon = {
    position: 'absolute',
    top: '-55%',
    height: '230%',
    width: 'auto',
    opacity: 0.6,
    pointerEvents: 'none',
    userSelect: 'none',
  };

  return (
    <div style={wrap}>
      <img src={flourish} alt="" aria-hidden="true" style={{ ...flourishCommon, left: '-6%' }} />
      <img
        src={flourish}
        alt=""
        aria-hidden="true"
        style={{ ...flourishCommon, right: '-6%', transform: 'scaleX(-1)' }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          {initials ? (
            <div
              style={{
                width: compact ? 44 : 56,
                height: compact ? 44 : 56,
                borderRadius: '50%',
                background: 'var(--wt-accent, #f59e0b)',
                color: 'var(--wt-bg-base, #1a1a2e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: compact ? 15 : 18,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
          ) : (
            <div
              style={{
                width: compact ? 40 : 46,
                height: compact ? 40 : 46,
                borderRadius: 'var(--wt-radius-md, 8px)',
                border: '1px solid rgba(245,158,11,0.55)',
                background: 'rgba(245,158,11,0.12)',
                color: 'var(--wt-accent, #f59e0b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={compact ? 22 : 24} aria-hidden="true" />
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: compact ? 22 : 26,
                  fontWeight: 600,
                  color: 'var(--wt-text-primary, #ffffff)',
                  lineHeight: 1.1,
                }}
              >
                {title}
              </span>
              {stage && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: `${tone}26`,
                    border: `1px solid ${tone}80`,
                    fontSize: 12,
                    color: '#ffffff',
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: tone }} />
                  {stage}
                </span>
              )}
            </div>

            {meta.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  marginTop: 8,
                  flexWrap: 'wrap',
                  fontSize: 13,
                  color: 'var(--wt-text-secondary, #94a3b8)',
                }}
              >
                {meta.map((m, i) => {
                  const MIcon = m.icon;
                  return (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      {MIcon && <MIcon size={15} style={{ color: 'var(--wt-accent, #f59e0b)' }} aria-hidden="true" />}
                      {m.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/* Small ready-made buttons so callers don't re-style every time. */
export function HeroButtonOutline({ icon: Icon, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'transparent',
        color: 'var(--wt-accent, #f59e0b)',
        border: '1px solid rgba(245,158,11,0.55)',
        borderRadius: 'var(--wt-radius-md, 8px)',
        padding: '7px 13px',
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {Icon && <Icon size={15} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function HeroButtonPrimary({ icon: Icon = Plus, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--wt-accent, #f59e0b)',
        color: 'var(--wt-bg-base, #1a1a2e)',
        border: 'none',
        borderRadius: 'var(--wt-radius-md, 8px)',
        padding: '7px 14px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {Icon && <Icon size={15} aria-hidden="true" />}
      {children}
    </button>
  );
}

export { Pencil as HeroEditIcon, MoreHorizontal as HeroMoreIcon };
