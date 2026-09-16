'use client';
import { useEffect, useState } from 'react';
import { api, label, Page, Row } from '../lib/api';
export function Picker({
  resource,
  name,
  required = true,
}: {
  resource: 'customers' | 'products';
  name: string;
  required?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void api<Page>(`${resource}?pageSize=50&search=${encodeURIComponent(search)}`)
        .then((p) => {
          if (active) {
            setItems(p.items.filter((i) => resource !== 'products' || i.active));
            setError('');
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, resource]);
  return (
    <div className="picker">
      <input
        aria-label={`Buscar ${resource === 'products' ? 'producto' : 'cliente'}`}
        placeholder="Escribe para buscar…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select
        aria-label={`Seleccionar ${resource === 'products' ? 'producto' : 'cliente'}`}
        name={name}
        required={required}
        value={selected?.id ?? ''}
        onChange={(e) => setSelected(items.find((i) => i.id === e.target.value) ?? null)}
      >
        <option value="">{required ? 'Selecciona un registro' : 'Todos'}</option>
        {selected && !items.some((i) => i.id === selected.id) && (
          <option value={selected.id}>{label(selected.name)}</option>
        )}
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {label(i.name)}
            {resource === 'products' ? ` · ${label(i.sku)} · Stock: ${label(i.stock)}` : ''}
          </option>
        ))}
      </select>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
