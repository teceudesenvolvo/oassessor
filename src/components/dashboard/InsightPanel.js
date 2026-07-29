import React from 'react';

export default function InsightPanel({ title, subtitle, children, compact = false }) {
  return (
    <section className={`campaign-insight-panel ${compact ? 'compact' : ''}`}>
      <div className="campaign-insight-header">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
