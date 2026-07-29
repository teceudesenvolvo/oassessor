import React from 'react';

export default function MetricCard({ title, value, helper, tone = 'default' }) {
  return (
    <article className={`campaign-metric-card campaign-metric-${tone}`}>
      <p>{title}</p>
      <strong>{value}</strong>
      {helper ? <span>{helper}</span> : null}
    </article>
  );
}
