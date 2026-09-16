'use client';
import {
  ArrowUpRight,
  CircleDollarSign,
  FileText,
  Users,
  Package,
  TriangleAlert,
} from 'lucide-react';
import { label, money, nested, Row } from '../lib/api';
import { Badge, Table } from './ui';
export type DashboardData = {
  salesCents: number;
  invoiceCount: number;
  customerCount: number;
  productCount: number;
  lowStock: Row[];
  recent: Row[];
  top: Row[];
  chart: { date: string; totalCents: number }[];
};
export function Dashboard({
  data,
  onNavigate,
}: {
  data: DashboardData;
  onNavigate: (v: string) => void;
}) {
  const max = Math.max(...data.chart.map((i) => i.totalCents), 1);
  return (
    <>
      <div className="stats-grid">
        {[
          {
            name: 'Ventas simuladas',
            value: money(data.salesCents),
            note: 'Facturas pagadas · 30 días',
            Icon: CircleDollarSign,
          },
          {
            name: 'Facturas del periodo',
            value: data.invoiceCount,
            note: 'Todos los estados · 30 días',
            Icon: FileText,
          },
          {
            name: 'Clientes',
            value: data.customerCount,
            note: 'Relaciones que crecen',
            Icon: Users,
          },
          {
            name: 'Productos',
            value: data.productCount,
            note: 'Tu catálogo conectado',
            Icon: Package,
          },
        ].map(({ name, value, note, Icon }) => (
          <article className="stat card" key={name}>
            <div>
              <span>{name}</span>
              <Icon size={19} />
            </div>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="card chart-card">
          <div className="section-head">
            <div>
              <h2>Así se mueven tus ventas</h2>
              <p>Importe pagado por día · últimos 30 días · COP</p>
            </div>
            <span className="legend">
              <i />
              Ventas demo
            </span>
          </div>
          <div
            className="chart"
            role="img"
            aria-label={`Gráfico de ventas de los últimos 30 días. Total ${money(data.salesCents)}`}
          >
            <div className="chart-guide">
              <span>{money(max)}</span>
              <span>{money(max / 2)}</span>
              <span>$ 0</span>
            </div>
            <div className="bars">
              {data.chart.map((point) => (
                <div
                  key={point.date}
                  className="bar-slot"
                  title={`${point.date}: ${money(point.totalCents)}`}
                >
                  <div
                    className="bar"
                    style={{ height: `${Math.max(1, (point.totalCents / max) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="chart-labels">
              <span>{data.chart[0]?.date}</span>
              <span>{data.chart[14]?.date}</span>
              <span>{data.chart[29]?.date}</span>
            </div>
          </div>
        </section>
        <section className="card">
          <div className="section-head">
            <div>
              <h2>Stock bajo</h2>
              <p>Hasta 10 productos que necesitan atención</p>
            </div>
            <TriangleAlert size={20} className="amber" />
          </div>
          <div className="stock-list">
            {data.lowStock.length ? (
              data.lowStock.map((p) => (
                <div key={p.id}>
                  <span className="product-icon">
                    <Package size={18} />
                  </span>
                  <div>
                    <strong>{label(p.name)}</strong>
                    <small>{label(p.sku)}</small>
                  </div>
                  <span className="stock-amount">
                    {label(p.stock)}
                    <small>mín. {label(p.minStock)}</small>
                  </span>
                </div>
              ))
            ) : (
              <p className="muted">Tu inventario está al día.</p>
            )}
          </div>
          <button className="text-button" onClick={() => onNavigate('inventory')}>
            Revisar inventario <ArrowUpRight size={16} />
          </button>
        </section>
        <section className="card">
          <div className="section-head">
            <div>
              <h2>Actividad reciente</h2>
              <p>Los últimos documentos de tu empresa</p>
            </div>
            <button className="text-button" onClick={() => onNavigate('invoices')}>
              Ver todos <ArrowUpRight size={16} />
            </button>
          </div>
          <Table headers={['Documento', 'Cliente', 'Estado', 'Total']}>
            {data.recent.map((i) => (
              <tr key={i.id}>
                <td className="mono">{label(i.number)}</td>
                <td>{label(nested(i.customer).name)}</td>
                <td>
                  <Badge value={i.status} />
                </td>
                <td className="amount">{money(i.totalCents)}</td>
              </tr>
            ))}
          </Table>
          {!data.recent.length && <p className="muted p-6">Aún no tienes documentos.</p>}
        </section>
        <section className="card">
          <div className="section-head">
            <div>
              <h2>Productos destacados</h2>
              <p>Más vendidos · últimos 30 días</p>
            </div>
          </div>
          <div className="ranking">
            {data.top.map((p, index) => (
              <div key={`${p.productId}-${index}`}>
                <span className="rank">0{index + 1}</span>
                <div>
                  <strong>{label(p.name)}</strong>
                  <small>{label(nested(p._sum).quantity)} unidades vendidas</small>
                </div>
                <strong>{money(nested(p._sum).lineTotalCents)}</strong>
              </div>
            ))}
            {!data.top.length && <p className="muted">Las ventas pagadas aparecerán aquí.</p>}
          </div>
        </section>
      </div>
    </>
  );
}
