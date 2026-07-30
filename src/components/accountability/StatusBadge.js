import React from 'react';

export default function StatusBadge({ status }) {
  const tone =
    status === 'fechada' || status === 'concluida' || status === 'validada'
      ? 'success'
      : status === 'com pendências' || status === 'com inconsistência' || status === 'reaberta'
        ? 'danger'
        : 'highlight';

  return <span className={`users-role-pill accountability-status-${tone}`}>{status || 'Sem status'}</span>;
}
