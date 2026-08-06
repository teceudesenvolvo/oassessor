import React from 'react';

export default function BrandLoader({
  title = 'Carregando seu workspace',
  subtitle = 'Sincronizando dados, permissões e inteligência da operação.',
}) {
  return (
    <div className="brand-loader-shell" role="status" aria-live="polite">
      <div className="brand-loader-ambient brand-loader-ambient-left" />
      <div className="brand-loader-ambient brand-loader-ambient-right" />

      <div className="brand-loader-card">
        <div className="brand-loader-orbit" aria-hidden="true">
          <span className="brand-loader-ring brand-loader-ring-outer" />
          <span className="brand-loader-ring brand-loader-ring-inner" />
          <span className="brand-loader-dot brand-loader-dot-primary" />
          <span className="brand-loader-dot brand-loader-dot-accent" />
          <div className="brand-loader-core">
            <span className="brand-loader-core-mark">a</span>
          </div>
        </div>

        <div className="brand-loader-copy">
          <span className="brand-loader-kicker">oAssessor</span>
          <strong>{title}</strong>
          <p>{subtitle}</p>
        </div>

        <div className="brand-loader-progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
