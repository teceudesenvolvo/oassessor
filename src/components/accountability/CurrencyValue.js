import React from 'react';

export default function CurrencyValue({ valueCents = 0 }) {
  return (
    <span>
      {(Number(valueCents || 0) / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      })}
    </span>
  );
}
