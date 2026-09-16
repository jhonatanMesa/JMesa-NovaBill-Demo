'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  Boxes,
  FileText,
  ChartNoAxesCombined,
  ShieldCheck,
  Settings,
  LogOut,
  Plus,
  Search,
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  Tags,
  ArrowUpRight,
  Pencil,
  Eye,
} from 'lucide-react';
import { api, date, label, money, nested, Page, Row, User } from '../lib/api';
import { Auth } from './auth';
import { Badge, Empty, Field, Loading, Modal, Table } from './ui';
import { Dashboard, DashboardData } from './dashboard';
import { Picker } from './picker';
const nav = [
  { id: 'dashboard', name: 'Resumen', Icon: LayoutDashboard },
  { id: 'customers', name: 'Clientes', Icon: Users },
  { id: 'products', name: 'Productos', Icon: Package },
  { id: 'categories', name: 'Categorías', Icon: Tags },
  { id: 'inventory', name: 'Inventario', Icon: Boxes },
  { id: 'invoices', name: 'Facturas demo', Icon: FileText },
  { id: 'reports', name: 'Reportes', Icon: ChartNoAxesCombined },
  { id: 'users', name: 'Usuarios', Icon: Users, admin: true },
  { id: 'audit', name: 'Auditoría', Icon: ShieldCheck, admin: true },
  { id: 'organization', name: 'Configuración', Icon: Settings },
];
const descriptions: Record<string, string> = {
  dashboard: 'Todo lo importante de tu operación, en un solo lugar.',
  customers: 'Conoce y organiza tus relaciones comerciales ficticias.',
  products: 'Un catálogo claro, conectado con tu inventario.',
  categories: 'Organiza tu catálogo con categorías propias.',
  inventory: 'Cada entrada y salida, con un historial trazable.',
  invoices: 'Documentos internos de demostración. Sin validez fiscal.',
  reports: 'Explora tus resultados y exporta documentos demo.',
  users: 'El acceso adecuado para cada persona de tu equipo.',
  audit: 'Trazabilidad de las acciones importantes de tu empresa.',
  organization: 'Personaliza tu espacio de demostración.',
};
type Editor = { kind: string; row?: Row };
export function Workspace() {
  const [user, setUser] = useState<User | null>(null);
  const [boot, setBoot] = useState(true);
  const [view, setView] = useState('dashboard');
  const [data, setData] = useState<Page | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [org, setOrg] = useState<Row | null>(null);
  const [categories, setCategories] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [version, setVersion] = useState(0);
  const [lineCount, setLineCount] = useState(1);
  const admin = user?.role === 'ADMIN';
  const writable = user?.role !== 'VIEWER';
  useEffect(() => {
    void api<User>('auth/profile')
      .then(setUser)
      .catch(() => {})
      .finally(() => setBoot(false));
  }, []);
  useEffect(() => {
    if (user)
      void api<Row>('organization')
        .then(setOrg)
        .catch((e) => setError(e.message));
  }, [user, version]);
  const navigate = useCallback((id: string) => {
    setView(id);
    setPage(1);
    setSearch('');
    setFilters('');
    setData(null);
    setError('');
    setSuccess('');
    setMobile(false);
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError('');
    const timer = setTimeout(() => {
      const request =
        view === 'dashboard'
          ? api<DashboardData>('dashboard')
          : view === 'organization'
            ? api<Row>('organization')
            : view === 'categories'
              ? api<Row[]>('categories')
              : api<Page>(
                  `${view}?page=${page}&pageSize=10&search=${encodeURIComponent(search)}${filters}`,
                );
      void request
        .then((result) => {
          if (!active) return;
          if (view === 'dashboard') setDashboard(result as DashboardData);
          else if (view === 'organization') setOrg(result as Row);
          else if (view === 'categories') {
            const items = result as Row[];
            setData({ items, total: items.length, page: 1, pageSize: items.length || 10 });
          } else setData(result as Page);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [view, page, search, filters, user, version]);
  async function open(kind: string, row?: Row) {
    setError('');
    try {
      if (kind === 'products') setCategories(await api<Row[]>('categories'));
      setLineCount(1);
      setEditor({ kind, row });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editor) return;
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(form);
    const kind = editor.kind;
    try {
      if (kind === 'products') {
        body.priceCents = Math.round(Number(body.price) * 100);
        delete body.price;
        body.minStock = Number(body.minStock);
        body.active = body.active === 'true';
      }
      if (kind === 'inventory') body.quantity = Number(body.quantity);
      if (kind === 'organization') body.taxRate = Number(body.taxRate);
      if (kind === 'users' && editor.row) body.active = body.active === 'true';
      if (kind === 'invoices') {
        const items = Array.from({ length: lineCount }, (_, i) => ({
          productId: String(form.get(`product${i}`)),
          quantity: Number(form.get(`quantity${i}`)),
        }));
        for (const key of Object.keys(body))
          if (key.startsWith('product') || key.startsWith('quantity')) delete body[key];
        body.items = items;
      }
      await api(
        `${kind}${editor.row && kind !== 'organization' ? `/${editor.row.id}` : ''}`,
        editor.row || kind === 'organization' ? 'PATCH' : 'POST',
        body,
      );
      setEditor(null);
      setVersion((v) => v + 1);
      setSuccess('Cambios guardados correctamente.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function action(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError('');
    try {
      await api(path, method, body);
      setEditor(null);
      setVersion((v) => v + 1);
      setSuccess('Operación completada.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setError('');
    try {
      await api('auth/logout', 'POST');
      setUser(null);
      setOrg(null);
      navigate('dashboard');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function exportCsv() {
    setBusy(true);
    setError('');
    try {
      await api('auth/profile');
      const res = await fetch(`/api/reports/export?${filters.replace(/^&/, '')}`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message);
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'novabill-reporte-demo.csv';
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Reporte demo exportado.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (boot) return <Loading />;
  if (!user)
    return (
      <Auth
        onLogin={(u) => {
          setUser(u);
          navigate('dashboard');
        }}
      />
    );
  const current = nav.find((n) => n.id === view)!;
  const canCreate =
    (['customers', 'invoices'].includes(view) && writable) ||
    (['products', 'categories', 'inventory', 'users'].includes(view) && admin);
  const rowActions = (row: Row) => (
    <div className="row-actions">
      {view === 'customers' && (
        <button
          aria-label={`Historial de ${label(row.name)}`}
          onClick={() => {
            navigate('reports');
            setFilters(`&customerId=${row.id}`);
          }}
        >
          <Eye size={16} />
        </button>
      )}
      {((view === 'customers' && writable) ||
        (['products', 'categories', 'users'].includes(view) && admin)) && (
        <button aria-label={`Editar ${label(row.name)}`} onClick={() => void open(view, row)}>
          <Pencil size={16} />
        </button>
      )}
      {admin && ['customers', 'products'].includes(view) && (
        <button className="danger-text" onClick={() => setEditor({ kind: 'archive', row })}>
          Archivar
        </button>
      )}
    </div>
  );
  const headers =
    view === 'customers'
      ? ['Cliente', 'Contacto', 'Dirección', 'Acciones']
      : view === 'products'
        ? ['Producto / SKU', 'Categoría', 'Precio', 'Stock', 'Estado', 'Acciones']
        : view === 'categories'
          ? ['Categoría', 'Creación', 'Acciones']
          : view === 'inventory'
            ? ['Producto', 'Tipo', 'Cambio', 'Saldo', 'Motivo', 'Fecha']
            : view === 'users'
              ? ['Usuario', 'Correo', 'Rol', 'Estado', 'Acciones']
              : view === 'audit'
                ? ['Acción', 'Registro', 'Actor', 'Fecha']
                : ['Documento', 'Cliente', 'Fecha', 'Estado', 'Total', 'Acciones'];
  return (
    <div className="workspace">
      <aside className={`sidebar ${mobile ? 'is-open' : ''}`}>
        <a className="brand" href="/">
          <span className="brand-icon">N</span>NovaBill<span className="demo-tag">DEMO</span>
        </a>
        <div className="org-switch">
          <span className="org-avatar">NT</span>
          <div>
            <strong>{label(org?.name)}</strong>
            <small>Espacio de demostración</small>
          </div>
        </div>
        <span className="nav-caption">WORKSPACE</span>
        <nav aria-label="Navegación principal">
          {nav
            .filter((n) => !n.admin || admin)
            .map((n) => (
              <button
                key={n.id}
                className={view === n.id ? 'active' : ''}
                onClick={() => navigate(n.id)}
              >
                <n.Icon size={19} />
                {n.name}
                {view === n.id && <span className="active-dot" />}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-box">
            <ShieldCheck size={20} />
            <strong>Construido para explorar</strong>
            <p>Datos ficticios. Operaciones reales dentro de la demo.</p>
            <a href="/api/docs" target="_blank" rel="noreferrer">
              Explorar la API <ArrowUpRight size={14} />
            </a>
          </div>
          <button className="profile" onClick={() => setEditor({ kind: 'profile' })}>
            <span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span>
            <span>
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </span>
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-toggle"
            aria-label="Abrir menú"
            onClick={() => setMobile(!mobile)}
          >
            <PanelLeft />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>{current.name}</strong>
          </div>
          <div className="header-right">
            <span className="live-pill">
              <i />
              Entorno demo
            </span>
            <button
              className="icon-button"
              aria-label="Cerrar sesión"
              onClick={() => void logout()}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="content">
          <div className="page-head">
            <div>
              <span className="eyebrow">
                {view === 'dashboard' ? 'UNA VISTA MÁS CLARA' : 'GESTIÓN DE TU EMPRESA'}
              </span>
              <h1>{view === 'dashboard' ? 'Tu negocio, en un vistazo' : current.name}</h1>
              <p>{descriptions[view]}</p>
            </div>
            {canCreate && (
              <button className="primary" onClick={() => void open(view)}>
                <Plus size={18} />
                {view === 'inventory'
                  ? 'Nuevo movimiento'
                  : view === 'invoices'
                    ? 'Crear factura demo'
                    : 'Crear registro'}
              </button>
            )}
            {view === 'dashboard' && <span className="period">Últimos 30 días</span>}
          </div>
          <div className="disclaimer">
            <ShieldCheck size={16} />
            <span>Demo comercial. No constituye facturación electrónica válida ante la DIAN.</span>
          </div>
          {error && !editor && (
            <div role="alert" className="notice error">
              {error}
              <button className="text-button" onClick={() => setVersion((v) => v + 1)}>
                Reintentar
              </button>
            </div>
          )}
          {success && (
            <div role="status" className="notice success">
              {success}
            </div>
          )}
          {loading ? (
            <Loading />
          ) : view === 'dashboard' && dashboard ? (
            <Dashboard data={dashboard} onNavigate={navigate} />
          ) : view === 'organization' ? (
            <section className="card settings-card">
              <span className="eyebrow">TU ESPACIO</span>
              <h2>{label(org?.name)}</h2>
              <dl>
                <dt>Moneda</dt>
                <dd>COP · pesos colombianos</dd>
                <dt>Impuesto simulado</dt>
                <dd>{label(org?.taxRate)}%</dd>
                <dt>Identificador de empresa</dt>
                <dd className="mono">{org?.id}</dd>
                <dt>Tipo de facturación</dt>
                <dd>Simulación interna, sin validez fiscal</dd>
              </dl>
              {admin && (
                <button
                  className="primary"
                  onClick={() => void open('organization', org ?? undefined)}
                >
                  Editar configuración
                </button>
              )}
            </section>
          ) : (
            <section className="card data-card">
              {['customers', 'products', 'invoices'].includes(view) && (
                <div className="table-toolbar">
                  <label className="search">
                    <Search size={17} />
                    <input
                      placeholder={
                        view === 'invoices' ? 'Buscar número de documento…' : 'Buscar por nombre…'
                      }
                      aria-label="Buscar registros"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                    />
                  </label>
                  <span className="muted">{data?.total ?? 0} registros</span>
                </div>
              )}
              {view === 'reports' && (
                <>
                  <form
                    className="filters"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      const params = new URLSearchParams();
                      for (const [k, v] of f) if (v) params.set(k, String(v));
                      setFilters('&' + params.toString());
                      setPage(1);
                    }}
                  >
                    <Field label="Desde">
                      <input type="date" name="from" />
                    </Field>
                    <Field label="Hasta">
                      <input type="date" name="to" />
                    </Field>
                    <Field label="Estado">
                      <select name="status">
                        <option value="">Todos</option>
                        <option>DRAFT</option>
                        <option>PAID</option>
                        <option>CANCELLED</option>
                      </select>
                    </Field>
                    <Field label="Cliente">
                      <Picker resource="customers" name="customerId" required={false} />
                    </Field>
                    <Field label="Producto">
                      <Picker resource="products" name="productId" required={false} />
                    </Field>
                    <button className="primary">Aplicar filtros</button>
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => {
                        setFilters('');
                        setPage(1);
                        setVersion((v) => v + 1);
                      }}
                    >
                      Ver todos
                    </button>
                  </form>
                  <div className="table-toolbar">
                    <div>
                      <strong>{money(data?.totalCents)}</strong>
                      <span className="muted">
                        {' '}
                        · {data?.total ?? 0} documentos filtrados (todos los estados seleccionados)
                      </span>
                    </div>
                    <button className="secondary" disabled={busy} onClick={() => void exportCsv()}>
                      <ArrowDownToLine size={16} />
                      Exportar CSV demo
                    </button>
                  </div>
                </>
              )}
              {data?.items.length ? (
                <Table headers={headers}>
                  {data.items.map((row) => (
                    <tr key={row.id}>
                      {view === 'customers' ? (
                        <>
                          <td>
                            <strong>{label(row.name)}</strong>
                          </td>
                          <td>
                            {label(row.email)}
                            <small className="cell-sub">{label(row.phone)}</small>
                          </td>
                          <td>{label(row.address)}</td>
                          <td>{rowActions(row)}</td>
                        </>
                      ) : view === 'products' ? (
                        <>
                          <td>
                            <strong>{label(row.name)}</strong>
                            <small className="cell-sub mono">{label(row.sku)}</small>
                          </td>
                          <td>{label(nested(row.category).name)}</td>
                          <td className="amount">{money(row.priceCents)}</td>
                          <td>
                            <span
                              className={
                                Number(row.stock) <= Number(row.minStock) ? 'low-stock' : ''
                              }
                            >
                              {label(row.stock)} uds.
                            </span>
                            <small className="cell-sub">Mínimo {label(row.minStock)}</small>
                          </td>
                          <td>
                            <Badge value={row.active ? 'Activo' : 'Inactivo'} />
                          </td>
                          <td>{rowActions(row)}</td>
                        </>
                      ) : view === 'categories' ? (
                        <>
                          <td>
                            <strong>{label(row.name)}</strong>
                          </td>
                          <td>{date(row.createdAt)}</td>
                          <td>{rowActions(row)}</td>
                        </>
                      ) : view === 'inventory' ? (
                        <>
                          <td>{label(nested(row.product).name)}</td>
                          <td>
                            <Badge value={row.type} />
                          </td>
                          <td className={Number(row.quantity) > 0 ? 'positive' : 'negative'}>
                            {Number(row.quantity) > 0 ? '+' : ''}
                            {label(row.quantity)}
                          </td>
                          <td>{label(row.balance)}</td>
                          <td>{label(row.reason)}</td>
                          <td>{date(row.createdAt)}</td>
                        </>
                      ) : view === 'users' ? (
                        <>
                          <td>{label(row.name)}</td>
                          <td>{label(row.email)}</td>
                          <td>
                            <Badge value={row.role} />
                          </td>
                          <td>{row.active ? 'Activo' : 'Inactivo'}</td>
                          <td>{rowActions(row)}</td>
                        </>
                      ) : view === 'audit' ? (
                        <>
                          <td>
                            <Badge value={row.action} />
                          </td>
                          <td className="mono small">{label(row.entityId)}</td>
                          <td className="mono small">{label(row.actorId)}</td>
                          <td>{date(row.createdAt)}</td>
                        </>
                      ) : (
                        <>
                          <td className="mono">
                            <strong>{label(row.number)}</strong>
                          </td>
                          <td>{label(nested(row.customer).name)}</td>
                          <td>{date(row.createdAt)}</td>
                          <td>
                            <Badge value={row.status} />
                          </td>
                          <td className="amount">{money(row.totalCents)}</td>
                          <td>
                            <button
                              className="text-button"
                              onClick={() => setEditor({ kind: 'detail', row })}
                            >
                              Ver detalle <ArrowUpRight size={14} />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </Table>
              ) : (
                <Empty />
              )}
              {data && data.total > data.pageSize && (
                <div className="pagination">
                  <span>
                    Página {page} de {Math.ceil(data.total / data.pageSize)}
                  </span>
                  <div>
                    <button
                      aria-label="Página anterior"
                      className="secondary"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      aria-label="Página siguiente"
                      className="secondary"
                      disabled={page * data.pageSize >= data.total}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
          <footer className="footer">
            NovaBill Demo <span>Diseñado para mostrar ingeniería, construido para funcionar.</span>
          </footer>
        </main>
      </div>
      {editor && (
        <Modal
          title={
            editor.kind === 'detail'
              ? label(editor.row?.number)
              : editor.kind === 'archive'
                ? 'Archivar registro'
                : editor.kind === 'profile'
                  ? 'Tu perfil'
                  : `${editor.row ? 'Editar' : 'Crear'} ${({ customers: 'cliente', products: 'producto', categories: 'categoría', inventory: 'movimiento', invoices: 'factura demo', users: 'usuario', organization: 'configuración' } as Record<string, string>)[editor.kind] ?? ''}`
          }
          onClose={() => {
            if (!busy) {
              setEditor(null);
              setError('');
            }
          }}
        >
          {error && (
            <div role="alert" className="notice error">
              {error}
            </div>
          )}
          {editor.kind === 'profile' ? (
            <div className="modal-body">
              <h3>{user.name}</h3>
              <p>{user.email}</p>
              <Badge value={user.role} />
              <p className="muted mt-4">Empresa: {label(org?.name)}</p>
            </div>
          ) : editor.kind === 'archive' ? (
            <div className="modal-body">
              <p>
                Se archivará <strong>{label(editor.row?.name)}</strong>. El historial se conservará.
              </p>
              <button
                className="danger"
                disabled={busy}
                onClick={() => void action(`${view}/${editor.row?.id}`, 'DELETE')}
              >
                Confirmar archivo
              </button>
            </div>
          ) : editor.kind === 'detail' ? (
            <div className="modal-body">
              <p className="legal">
                Demo comercial. No constituye facturación electrónica válida ante la DIAN.
              </p>
              <div className="detail-meta">
                <span>{label(nested(editor.row?.customer).name)}</span>
                <Badge value={editor.row?.status} />
              </div>
              <Table headers={['Producto', 'Cantidad', 'Precio', 'Importe']}>
                {(editor.row?.items as Row[]).map((i) => (
                  <tr key={i.id}>
                    <td>{label(i.name)}</td>
                    <td>{label(i.quantity)}</td>
                    <td>{money(i.unitPriceCents)}</td>
                    <td>{money(i.lineTotalCents)}</td>
                  </tr>
                ))}
              </Table>
              <dl className="totals">
                <dt>Subtotal</dt>
                <dd>{money(editor.row?.subtotalCents)}</dd>
                <dt>Impuesto simulado ({label(editor.row?.taxRate)}%)</dt>
                <dd>{money(editor.row?.taxCents)}</dd>
                <dt>Total</dt>
                <dd>
                  <strong>{money(editor.row?.totalCents)}</strong>
                </dd>
              </dl>
              {writable && editor.row?.status !== 'CANCELLED' && (
                <div className="form-actions">
                  {editor.row?.status === 'DRAFT' && (
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() =>
                        void action(`invoices/${editor.row?.id}/status`, 'PATCH', {
                          status: 'PAID',
                        })
                      }
                    >
                      Marcar pagada
                    </button>
                  )}
                  <button
                    className="danger"
                    disabled={busy}
                    onClick={() =>
                      void action(`invoices/${editor.row?.id}/status`, 'PATCH', {
                        status: 'CANCELLED',
                      })
                    }
                  >
                    Cancelar factura
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={save} className="modal-body">
              <EditorFields
                editor={editor}
                categories={categories}
                lineCount={lineCount}
                setLineCount={setLineCount}
              />
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => setEditor(null)}
                >
                  Volver
                </button>
                <button className="primary" disabled={busy}>
                  {busy
                    ? 'Guardando…'
                    : editor.kind === 'invoices'
                      ? 'Crear borrador'
                      : 'Guardar cambios'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
function EditorFields({
  editor,
  categories,
  lineCount,
  setLineCount,
}: {
  editor: Editor;
  categories: Row[];
  lineCount: number;
  setLineCount: (n: number) => void;
}) {
  const row = editor.row;
  const value = (k: string) => (row ? label(row[k] == null ? '' : row[k]) : '');
  switch (editor.kind) {
    case 'customers':
      return (
        <>
          <Field label="Nombre ficticio">
            <input
              name="name"
              required
              minLength={2}
              maxLength={120}
              defaultValue={value('name')}
            />
          </Field>
          <Field label="Correo">
            <input
              name="email"
              type="email"
              required
              maxLength={160}
              defaultValue={value('email')}
            />
          </Field>
          <Field label="Teléfono ficticio">
            <input name="phone" maxLength={30} defaultValue={value('phone')} />
          </Field>
          <Field label="Dirección ficticia">
            <input name="address" maxLength={200} defaultValue={value('address')} />
          </Field>
        </>
      );
    case 'categories':
      return (
        <Field label="Nombre">
          <input name="name" required minLength={2} maxLength={80} defaultValue={value('name')} />
        </Field>
      );
    case 'products':
      return (
        <>
          <Field label="Nombre">
            <input
              name="name"
              required
              minLength={2}
              maxLength={120}
              defaultValue={value('name')}
            />
          </Field>
          <div className="form-grid">
            <Field label="SKU">
              <input
                name="sku"
                required
                pattern="[A-Za-z0-9_-]{2,40}"
                defaultValue={value('sku')}
              />
            </Field>
            <Field label="Categoría">
              <select name="categoryId" required defaultValue={value('categoryId')}>
                <option value="">Selecciona</option>
                {categories.map((c) => (
                  <option value={c.id} key={c.id}>
                    {label(c.name)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Precio (COP)">
              <input
                name="price"
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                required
                defaultValue={row ? Number(row.priceCents) / 100 : ''}
              />
            </Field>
            <Field label="Stock mínimo">
              <input
                name="minStock"
                type="number"
                min="0"
                max="1000000"
                step="1"
                required
                defaultValue={value('minStock') || 5}
              />
            </Field>
          </div>
          <Field label="Estado">
            <select name="active" defaultValue={row ? String(row.active) : 'true'}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </Field>
          <p className="muted">El stock se gestiona mediante movimientos de inventario.</p>
        </>
      );
    case 'inventory':
      return (
        <>
          <Field label="Producto">
            <Picker resource="products" name="productId" />
          </Field>
          <Field label="Tipo">
            <select name="type">
              <option value="IN">Entrada</option>
              <option value="OUT">Salida</option>
              <option value="ADJUSTMENT">Ajuste (saldo objetivo)</option>
            </select>
          </Field>
          <Field label="Cantidad / saldo objetivo">
            <input name="quantity" type="number" required min="0" max="1000000" step="1" />
          </Field>
          <Field label="Motivo">
            <input name="reason" minLength={5} maxLength={200} required />
          </Field>
          <p className="muted">
            Entrada y salida requieren cantidad positiva. En ajustes indica el nuevo saldo, incluso
            cero.
          </p>
        </>
      );
    case 'invoices':
      return (
        <>
          <Field label="Cliente">
            <Picker resource="customers" name="customerId" />
          </Field>
          {Array.from({ length: lineCount }, (_, i) => (
            <fieldset className="invoice-line" key={i}>
              <legend>Producto {i + 1}</legend>
              <Field label="Producto">
                <Picker resource="products" name={`product${i}`} />
              </Field>
              <Field label="Cantidad">
                <input
                  name={`quantity${i}`}
                  type="number"
                  required
                  min="1"
                  max="10000"
                  step="1"
                  defaultValue="1"
                />
              </Field>
            </fieldset>
          ))}
          <div className="flex gap-3">
            <button
              type="button"
              className="secondary"
              disabled={lineCount >= 10}
              onClick={() => setLineCount(lineCount + 1)}
            >
              Agregar producto
            </button>
            {lineCount > 1 && (
              <button
                type="button"
                className="text-button"
                onClick={() => setLineCount(lineCount - 1)}
              >
                Quitar último
              </button>
            )}
          </div>
          <p className="muted mt-4">
            El servidor calcula precios e impuestos. Revisa el total en el detalle antes de marcar
            pagada; solo entonces se descuenta el stock.
          </p>
        </>
      );
    case 'users':
      return (
        <>
          <Field label="Nombre ficticio">
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              defaultValue={value('name')}
            />
          </Field>
          {!row && (
            <>
              <Field label="Correo">
                <input name="email" type="email" required />
              </Field>
              <Field label="Contraseña inicial">
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </Field>
            </>
          )}
          <Field label="Rol">
            <select name="role" defaultValue={value('role') || 'VIEWER'}>
              <option value="ADMIN">Administrador</option>
              <option value="SELLER">Vendedor</option>
              <option value="VIEWER">Consulta</option>
            </select>
          </Field>
          {row && (
            <Field label="Estado">
              <select name="active" defaultValue={String(row.active)}>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </Field>
          )}
        </>
      );
    case 'organization':
      return (
        <>
          <Field label="Nombre de empresa ficticia">
            <input
              name="name"
              required
              minLength={2}
              maxLength={120}
              defaultValue={value('name')}
            />
          </Field>
          <Field label="Impuesto simulado (%)">
            <input
              name="taxRate"
              type="number"
              min="0"
              max="30"
              step="1"
              required
              defaultValue={value('taxRate')}
            />
          </Field>
          <p className="muted">
            Aplica a nuevos borradores. Las facturas anteriores conservan sus importes originales.
          </p>
        </>
      );
    default:
      return null;
  }
}
