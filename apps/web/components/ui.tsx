'use client';
import { cloneElement, isValidElement, useEffect, useId, useRef } from 'react';
import { X, Inbox, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="modal"
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button type="button" className="icon-button" aria-label="Cerrar" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  if (
    isValidElement<{ id?: string; 'aria-label'?: string }>(children) &&
    typeof children.type === 'string'
  )
    return (
      <label className="field" htmlFor={id}>
        <span>{label}</span>
        {cloneElement(children, { id, 'aria-label': label })}
      </label>
    );
  return (
    <div className="field" role="group" aria-label={label}>
      <span>{label}</span>
      {children}
    </div>
  );
}
export function Badge({ value }: { value: unknown }) {
  const text = String(value);
  return (
    <span className={`badge ${text.toLowerCase()}`}>
      {(
        {
          PAID: 'Pagada',
          DRAFT: 'Borrador',
          CANCELLED: 'Cancelada',
          ADMIN: 'Administrador',
          SELLER: 'Vendedor',
          VIEWER: 'Consulta',
          IN: 'Entrada',
          OUT: 'Salida',
          ADJUSTMENT: 'Ajuste',
          SALE: 'Venta',
          REVERSAL: 'Reversión',
        } as Record<string, string>
      )[text] ?? text}
    </span>
  );
}
export function Loading() {
  return (
    <div className="empty" role="status">
      <LoaderCircle className="animate-spin" />
      <p>Cargando datos de tu empresa…</p>
    </div>
  );
}
export function Empty() {
  return (
    <div className="empty">
      <Inbox size={32} />
      <h3>Aún no hay registros</h3>
      <p>Crea tu primer registro o cambia los filtros.</p>
    </div>
  );
}
export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
