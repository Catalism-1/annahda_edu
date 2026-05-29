'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Row = Record<string, string>;

const ROWS_PER_PAGE = 20;

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseSheetDate(value: string): Date | null {
  const raw = value.trim();
  if (!raw) return null;

  const nativeDate = new Date(raw);
  if (!Number.isNaN(nativeDate.getTime())) return nativeDate;

  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[,\s]+(\d{1,2})(?::|\.)(\d{2})(?::|\.)?(\d{2})?)?/);
  if (!match) return null;

  const first = Number(match[1]);
  const second = Number(match[2]);
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  const secondPart = Number(match[6] ?? 0);
  const day = first > 12 ? first : second > 12 ? second : first;
  const month = first > 12 ? second : second > 12 ? first : second;

  const parsed = new Date(year, month - 1, day, hour, minute, secondPart);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isThisWeek(dateStr: string) {
  const d = parseSheetDate(dateStr);
  if (!d) return false;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return d >= weekAgo && d <= now;
}

function isThisMonth(dateStr: string) {
  const d = parseSheetDate(dateStr);
  if (!d) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function detectTimestampKey(headers: string[]): string | null {
  const candidates = ['Timestamp', 'timestamp', 'Tanggal', 'tanggal', 'Date', 'date', 'Waktu', 'waktu'];
  return candidates.find(c => headers.includes(c)) ?? null;
}

function detectCountryKey(headers: string[]): string | null {
  const candidates = ['Negara Tujuan', 'negara tujuan', 'Negara', 'negara', 'Country', 'country'];
  return candidates.find(c => headers.includes(c)) ?? null;
}

function exportCSV(data: Row[]) {
  if (!data.length) return;
  const headers = Object.keys(data[0]).filter(k => k !== '_id');
  const rows = data.map(r =>
    headers.map(h => `"${(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pendaftar_${getLocalDateKey()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const today = getLocalDateKey();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pendaftar');
      if (res.status === 401) { router.push('/admin/login'); return; }
      if (!res.ok) throw new Error('Gagal memuat data');
      const json = await res.json();
      setData(json.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const headers = useMemo(() => {
    if (!data.length) return [];
    return Object.keys(data[0]).filter(k => k !== '_id');
  }, [data]);

  const tsKey = useMemo(() => detectTimestampKey(headers), [headers]);
  const countryKey = useMemo(() => detectCountryKey(headers), [headers]);

  const countries = useMemo(() => {
    if (!countryKey) return [];
    const set = new Set(data.map(r => r[countryKey] ?? '').filter(Boolean));
    return Array.from(set).sort();
  }, [data, countryKey]);

  const stats = useMemo(() => {
    if (!tsKey) return { today: 0, week: 0, month: 0 };
    const todayCount = data.filter(r => {
      const date = parseSheetDate(r[tsKey] ?? '');
      return date ? getLocalDateKey(date) === today : false;
    }).length;
    const weekCount = data.filter(r => isThisWeek(r[tsKey] ?? '')).length;
    const monthCount = data.filter(r => isThisMonth(r[tsKey] ?? '')).length;
    return { today: todayCount, week: weekCount, month: monthCount };
  }, [data, tsKey, today]);

  const filtered = useMemo(() => {
    let d = data;
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(r => Object.values(r).some(v => v.toLowerCase().includes(q)));
    }
    if (filterCountry && countryKey) {
      d = d.filter(r => r[countryKey] === filterCountry);
    }
    if (sortKey) {
      d = [...d].sort((a, b) => {
        const av = a[sortKey] ?? '';
        const bv = b[sortKey] ?? '';
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return d;
  }, [data, search, filterCountry, countryKey, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  useEffect(() => {
    setPage(p => Math.min(p, totalPages));
  }, [totalPages]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  const dateDisplay = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --sidebar-bg: #0A3D2E;
          --sidebar-text: rgba(245,232,192,0.85);
          --sidebar-active: #C9A84C;
          --header-bg: #FFFFFF;
          --body-bg: #F4ECE0;
          --card-bg: #FFFFFF;
          --gold: #C9A84C;
          --teal: #0A3D2E;
        }

        body { background: var(--body-bg); font-family: 'Lora', Georgia, serif; }

        .layout { display: flex; min-height: 100vh; }

        /* ── SIDEBAR ── */
        .sidebar {
          width: 220px;
          flex-shrink: 0;
          background: var(--sidebar-bg);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0; left: 0;
          height: 100vh;
          z-index: 100;
          transition: transform 0.25s ease;
        }

        .sidebar-logo {
          padding: 28px 20px 20px;
          font-family: 'Cinzel', serif;
          font-size: 15px;
          font-weight: 700;
          color: var(--gold);
          letter-spacing: 1.5px;
          border-bottom: 1px solid rgba(201,168,76,0.2);
        }

        .sidebar-logo span { display: block; font-size: 10px; color: var(--sidebar-text); font-family: 'Lora', Georgia, serif; font-weight: 400; margin-top: 4px; letter-spacing: 0.5px; font-style: italic; }

        .sidebar-nav { padding: 20px 0; flex: 1; }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          color: var(--sidebar-text);
          font-family: 'Lora', Georgia, serif;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          text-decoration: none;
        }

        .nav-item:hover { background: rgba(201,168,76,0.12); color: var(--gold); }
        .nav-item.active { background: rgba(201,168,76,0.15); color: var(--gold); border-right: 3px solid var(--gold); }

        .nav-divider { height: 1px; background: rgba(201,168,76,0.15); margin: 8px 16px; }

        .sidebar-footer { padding: 16px 0; border-top: 1px solid rgba(201,168,76,0.2); }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          color: rgba(245,232,192,0.6);
          font-family: 'Lora', Georgia, serif;
          font-size: 14px;
          cursor: pointer;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          transition: color 0.15s, background 0.15s;
        }

        .logout-btn:hover { color: #FF8A80; background: rgba(255,138,128,0.08); }

        /* ── MAIN ── */
        .main-content {
          margin-left: 220px;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        /* ── HEADER ── */
        .header {
          background: var(--header-bg);
          border-bottom: 1px solid #E8DCC8;
          padding: 0 28px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .header-title {
          font-family: 'Lora', Georgia, serif;
          font-size: 15px;
          color: #2A4A35;
          font-style: italic;
        }

        .header-date {
          font-family: 'Lora', Georgia, serif;
          font-size: 13px;
          color: #7A8C7E;
        }

        .hamburger {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          color: var(--teal);
          font-size: 20px;
        }

        /* ── CONTENT ── */
        .content { padding: 28px; }

        /* ── STAT CARDS ── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }

        .stat-card {
          background: var(--card-bg);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #E8DCC8;
          box-shadow: 0 2px 8px rgba(10,61,46,0.05);
        }

        .stat-label {
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 1.5px;
          color: #7A8C7E;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .stat-value {
          font-family: 'Cinzel', serif;
          font-size: 32px;
          font-weight: 700;
          color: var(--teal);
          line-height: 1;
        }

        .stat-icon {
          font-size: 20px;
          margin-bottom: 10px;
        }

        /* ── TABLE SECTION ── */
        .table-section {
          background: var(--card-bg);
          border-radius: 12px;
          border: 1px solid #E8DCC8;
          box-shadow: 0 2px 8px rgba(10,61,46,0.05);
          overflow: hidden;
        }

        .table-toolbar {
          padding: 16px 20px;
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          border-bottom: 1px solid #F0E8D8;
        }

        .search-input {
          flex: 1;
          min-width: 200px;
          padding: 9px 14px;
          border: 1.5px solid #D4C5A5;
          border-radius: 8px;
          font-family: 'Lora', Georgia, serif;
          font-size: 14px;
          outline: none;
          color: #1A2E22;
          background: #FAFAF5;
          transition: border-color 0.2s;
        }

        .search-input:focus { border-color: var(--gold); }
        .search-input::placeholder { color: #B0B8B2; }

        .filter-select {
          padding: 9px 14px;
          border: 1.5px solid #D4C5A5;
          border-radius: 8px;
          font-family: 'Lora', Georgia, serif;
          font-size: 14px;
          outline: none;
          color: #1A2E22;
          background: #FAFAF5;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .filter-select:focus { border-color: var(--gold); }

        .btn {
          padding: 9px 16px;
          border-radius: 8px;
          font-family: 'Cinzel', serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1px;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-gold {
          background: var(--gold);
          color: var(--teal);
          box-shadow: 0 2px 8px rgba(201,168,76,0.3);
        }

        .btn-gold:hover { background: #D4B45A; }

        .btn-outline {
          background: transparent;
          color: var(--teal);
          border: 1.5px solid var(--teal);
        }

        .btn-outline:hover { background: rgba(10,61,46,0.06); }

        .table-wrapper { overflow-x: auto; }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }

        thead { background: #F8F3EA; }

        th {
          padding: 11px 14px;
          text-align: left;
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 1px;
          color: #3A5A47;
          font-weight: 600;
          text-transform: uppercase;
          cursor: pointer;
          white-space: nowrap;
          user-select: none;
          border-bottom: 1px solid #E8DCC8;
        }

        th:hover { color: var(--gold); }

        .sort-indicator { margin-left: 4px; opacity: 0.6; }

        td {
          padding: 10px 14px;
          color: #2A3D30;
          border-bottom: 1px solid #F0EAE0;
          font-family: 'Lora', Georgia, serif;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        tr:hover td { background: rgba(10,61,46,0.04); }
        tr:last-child td { border-bottom: none; }

        .no-data {
          text-align: center;
          padding: 48px;
          color: #7A8C7E;
          font-style: italic;
          font-family: 'Lora', Georgia, serif;
        }

        /* ── PAGINATION ── */
        .pagination {
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid #F0E8D8;
          flex-wrap: wrap;
          gap: 12px;
        }

        .pagination-info {
          font-family: 'Lora', Georgia, serif;
          font-size: 13px;
          color: #7A8C7E;
        }

        .pagination-btns { display: flex; gap: 6px; align-items: center; }

        .page-btn {
          padding: 6px 12px;
          border: 1.5px solid #D4C5A5;
          border-radius: 6px;
          background: #FAFAF5;
          font-family: 'Lora', Georgia, serif;
          font-size: 13px;
          cursor: pointer;
          color: #2A4A35;
          transition: all 0.15s;
        }

        .page-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--teal); }
        .page-btn.active { background: var(--teal); color: #F5E8C0; border-color: var(--teal); }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── LOADING ── */
        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 64px;
          gap: 12px;
          color: #7A8C7E;
          font-family: 'Lora', Georgia, serif;
          font-style: italic;
        }

        .spinner {
          width: 20px; height: 20px;
          border: 2px solid #D4C5A5;
          border-top-color: var(--teal);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .error-banner {
          background: #FFF0F0;
          border: 1px solid #FFCDD2;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          color: #C62828;
          font-family: 'Lora', Georgia, serif;
          font-size: 14px;
        }

        /* ── OVERLAY ── */
        .overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 90;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .overlay.open { display: block; }

          .main-content { margin-left: 0; }

          .hamburger { display: block; }

          .stats-grid { grid-template-columns: repeat(2, 1fr); }

          .header-date { display: none; }

          .content { padding: 16px; }
        }

        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .stat-value { font-size: 24px; }
          .table-toolbar { flex-direction: column; align-items: stretch; }
          .search-input { min-width: unset; }
        }
      `}</style>

      {/* Overlay mobile */}
      <div
        className={`overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="layout">
        {/* SIDEBAR */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            ✦ Admin Panel ✦
            <span>Pendidikan Timur Tengah</span>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-item active">
              <span>📊</span> Dashboard
            </div>
            <div className="nav-item">
              <span>👥</span> Pendaftar
            </div>
          </nav>

          <div className="sidebar-footer">
            <div className="nav-divider" />
            <button className="logout-btn" onClick={handleLogout}>
              <span>🚪</span> Logout
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="main-content">
          {/* HEADER */}
          <header className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
                ☰
              </button>
              <p className="header-title">Selamat datang, <strong>Admin</strong></p>
            </div>
            <p className="header-date">{dateDisplay}</p>
          </header>

          {/* CONTENT */}
          <main className="content">
            {error && <div className="error-banner">⚠ {error}</div>}

            {/* STAT CARDS */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-label">Total Pendaftar</div>
                <div className="stat-value">{loading ? '—' : data.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div className="stat-label">Hari Ini</div>
                <div className="stat-value">{loading ? '—' : tsKey ? stats.today : '—'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📆</div>
                <div className="stat-label">Minggu Ini</div>
                <div className="stat-value">{loading ? '—' : tsKey ? stats.week : '—'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🗓</div>
                <div className="stat-label">Bulan Ini</div>
                <div className="stat-value">{loading ? '—' : tsKey ? stats.month : '—'}</div>
              </div>
            </div>

            {/* TABLE */}
            <div className="table-section">
              <div className="table-toolbar">
                <input
                  className="search-input"
                  type="text"
                  placeholder="🔍  Cari pendaftar..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />

                {countryKey && (
                  <select
                    className="filter-select"
                    value={filterCountry}
                    onChange={e => { setFilterCountry(e.target.value); setPage(1); }}
                  >
                    <option value="">Semua Negara</option>
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}

                <button className="btn btn-outline" onClick={fetchData} disabled={loading}>
                  {loading ? '⟳ Memuat...' : '⟳ Refresh'}
                </button>

                <button
                  className="btn btn-gold"
                  onClick={() => exportCSV(filtered)}
                  disabled={!filtered.length}
                >
                  ↓ Export CSV
                </button>
              </div>

              {loading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  Memuat data dari Google Sheets...
                </div>
              ) : (
                <>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 48 }}>#</th>
                          {headers.map(h => (
                            <th key={h} onClick={() => handleSort(h)}>
                              {h}
                              <span className="sort-indicator">
                                {sortKey === h ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.length === 0 ? (
                          <tr>
                            <td colSpan={headers.length + 1} className="no-data">
                              {search || filterCountry ? 'Tidak ada data yang cocok dengan filter' : 'Belum ada data pendaftar'}
                            </td>
                          </tr>
                        ) : (
                          paginated.map((row, i) => (
                            <tr key={row._id}>
                              <td style={{ color: '#9A9E9B', fontFamily: 'Cinzel, serif', fontSize: 12 }}>
                                {(page - 1) * ROWS_PER_PAGE + i + 1}
                              </td>
                              {headers.map(h => (
                                <td key={h} title={row[h] ?? ''}>{row[h] ?? ''}</td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* PAGINATION */}
                  {filtered.length > ROWS_PER_PAGE && (
                    <div className="pagination">
                      <p className="pagination-info">
                        Menampilkan {Math.min((page - 1) * ROWS_PER_PAGE + 1, filtered.length)}–{Math.min(page * ROWS_PER_PAGE, filtered.length)} dari {filtered.length} pendaftar
                      </p>
                      <div className="pagination-btns">
                        <button
                          className="page-btn"
                          onClick={() => setPage(1)}
                          disabled={page === 1}
                        >‹‹</button>
                        <button
                          className="page-btn"
                          onClick={() => setPage(p => p - 1)}
                          disabled={page === 1}
                        >‹ Prev</button>

                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let p: number;
                          if (totalPages <= 5) p = i + 1;
                          else if (page <= 3) p = i + 1;
                          else if (page >= totalPages - 2) p = totalPages - 4 + i;
                          else p = page - 2 + i;
                          return (
                            <button
                              key={p}
                              className={`page-btn ${p === page ? 'active' : ''}`}
                              onClick={() => setPage(p)}
                            >{p}</button>
                          );
                        })}

                        <button
                          className="page-btn"
                          onClick={() => setPage(p => p + 1)}
                          disabled={page === totalPages}
                        >Next ›</button>
                        <button
                          className="page-btn"
                          onClick={() => setPage(totalPages)}
                          disabled={page === totalPages}
                        >››</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
