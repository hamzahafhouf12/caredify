import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../ThemeToggle";
import { apiGet } from "../../utils/api";
import { getSocket } from "../../utils/socket";
import { useLanguage } from "../../context/LanguageContext";

/* ─── Dropdown Recherche ─────────────────────────────────────── */
function SearchDropdown({ query, results, loading, onSelect, t }) {
  if (!query) return null;
  return (
    <div className="topbar-search-dropdown">
      {loading && (
        <div className="topbar-search-row topbar-search-loading">
          <span>⏳</span> {t.topbar.loading}
        </div>
      )}
      {!loading && results.length === 0 && (
        <div className="topbar-search-row topbar-search-empty">
          <span>🔍</span> {t.topbar.noPatientFound} « {query} »
        </div>
      )}
      {!loading &&
        results.map((p) => (
          <div key={p._id} className="topbar-search-row topbar-search-item" onClick={() => onSelect(p)}>
            <span className="topbar-search-avatar">👤</span>
            <div className="topbar-search-info">
              <span className="topbar-search-name">{p.nom} {p.prenom}</span>
              <span className="topbar-search-meta">CIN: {p.cin} · {p.etat || "Stable"}</span>
            </div>
            <span className={`topbar-search-risk topbar-risk--${(p.niveauRisque || "faible").toLowerCase().replace("é","e")}`}>
              {p.niveauRisque || "Faible"}
            </span>
          </div>
        ))}
    </div>
  );
}

/* ─── Dropdown Notifications ─────────────────────────────────── */
function NotifDropdown({ alerts, loading, onMarkAll, t }) {
  const unread = alerts.filter((a) => !a.lue).length;

  const formatTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m || 1} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return new Date(dateStr).toLocaleDateString("fr-FR");
  };

  const priorityIcon = (p) =>
    p === "Critique" ? "🔴" : p === "A_surveiller" ? "🟠" : "🟢";

  return (
    <div className="topbar-notif-dropdown">
      <div className="topbar-notif-header">
        <span className="topbar-notif-title">
          🔔 {t.topbar.notifications}
          {unread > 0 && <span className="topbar-notif-count">{unread}</span>}
        </span>
        {unread > 0 && (
          <button className="topbar-notif-markall" onClick={onMarkAll}>
            {t.topbar.markAllRead}
          </button>
        )}
      </div>
      <div className="topbar-notif-list">
        {loading && <div className="topbar-notif-empty">⏳ {t.topbar.loading}</div>}
        {!loading && alerts.length === 0 && (
          <div className="topbar-notif-empty">
            <span style={{ fontSize: "1.5rem" }}>🎉</span>
            <p>{t.topbar.noAlerts}</p>
          </div>
        )}
        {!loading &&
          alerts.slice(0, 8).map((a) => (
            <div key={a._id} className={`topbar-notif-item ${!a.lue ? "topbar-notif-item--unread" : ""}`}>
              <span className="topbar-notif-icon">{priorityIcon(a.priorite)}</span>
              <div className="topbar-notif-content">
                <span className="topbar-notif-patient">{a.patient?.nom} {a.patient?.prenom}</span>
                <span className="topbar-notif-detail">{a.detail}</span>
                <span className="topbar-notif-time">{formatTime(a.createdAt)}</span>
              </div>
              {!a.lue && <span className="topbar-notif-dot" />}
            </div>
          ))}
      </div>
      <div className="topbar-notif-footer">
        <a href="/cardiologue/alertes" className="topbar-notif-link">
          {t.topbar.viewAllAlerts}
        </a>
      </div>
    </div>
  );
}

/* ─── Topbar Principal ───────────────────────────────────────── */
function Topbar({ breadcrumb, darkMode, onToggleTheme }) {
  const navigate = useNavigate();
  const { lang, setLang, t, currentLang, LANGUAGES } = useLanguage();

  // ── Search ──
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch]     = useState(false);
  const searchRef    = useRef(null);
  const searchTimer  = useRef(null);

  // ── Notifications ──
  const [alerts, setAlerts]           = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [showNotif, setShowNotif]     = useState(false);
  const notifRef = useRef(null);

  // ── Language ──
  const [showLang, setShowLang] = useState(false);
  const langRef = useRef(null);

  // ── Close dropdowns on outside click ──
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
      if (notifRef.current && !notifRef.current.contains(e.target))   setShowNotif(false);
      if (langRef.current  && !langRef.current.contains(e.target))    setShowLang(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Fetch alerts + socket ──
  useEffect(() => {
    const fetchAlerts = async () => {
      setAlertsLoading(true);
      try {
        const res = await apiGet("/alerts");
        if (res.ok) {
          const data = await res.json();
          setAlerts(data.sort((a, b) => {
            const o = { Critique: 0, A_surveiller: 1, Normal: 2 };
            return (o[a.priorite] ?? 3) - (o[b.priorite] ?? 3);
          }));
        }
      } catch (e) { console.error(e); }
      finally { setAlertsLoading(false); }
    };
    fetchAlerts();

    const socket = getSocket();
    const onNew  = (a) => setAlerts((prev) => [a, ...prev]);
    socket.on("new_alert", onNew);
    return () => socket.off("new_alert", onNew);
  }, []);

  // ── Search handler (debounced 300ms) ──
  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    setShowSearch(true);
    clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }

    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await apiGet("/patients");
        if (res.ok) {
          const data = await res.json();
          const ql = q.toLowerCase();
          setSearchResults(
            data.filter((p) =>
              (p.nom||"").toLowerCase().includes(ql) ||
              (p.prenom||"").toLowerCase().includes(ql) ||
              (p.cin||"").toLowerCase().includes(ql)
            ).slice(0, 6)
          );
        }
      } catch (e) { console.error(e); }
      finally { setSearchLoading(false); }
    }, 300);
  };

  const handleSelectPatient = (p) => {
    localStorage.setItem("activePatientId", p._id);
    navigate("/cardiologue/patients/fichepatient");
    setSearchQuery(""); setSearchResults([]); setShowSearch(false);
  };

  const unreadCount = alerts.filter((a) => !a.lue).length;

  return (
    <header className="cdash-topbar">
      {/* ── LEFT ── */}
      <div className="cdash-topbar__left">
        <span className="cdash-topbar__tb-icon">📋</span>
        <span className="cdash-topbar__tb-icon">⭐</span>
        <span className="cdash-topbar__breadcrumb">{breadcrumb}</span>
      </div>

      {/* ── RIGHT ── */}
      <div className="cdash-topbar__right">

        {/* Recherche */}
        <div className="cdash-topbar__search-wrap" ref={searchRef}>
          <div className="cdash-topbar__search">
            <span className="cdash-topbar__search-icon">🔍</span>
            <input
              type="text"
              placeholder={t.topbar.searchPlaceholder}
              className="cdash-topbar__search-input"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery && setShowSearch(true)}
            />
            {searchQuery && (
              <button className="topbar-search-clear"
                onClick={() => { setSearchQuery(""); setSearchResults([]); setShowSearch(false); }}>
                ×
              </button>
            )}
          </div>
          {showSearch && (
            <SearchDropdown query={searchQuery} results={searchResults}
              loading={searchLoading} onSelect={handleSelectPatient} t={t} />
          )}
        </div>

        {/* Langue */}
        <div className="topbar-lang-wrap" ref={langRef}>
          <button
            className="topbar-lang-btn"
            onClick={() => setShowLang((v) => !v)}
            title="Language / Langue / اللغة"
          >
            <span className="topbar-lang-flag">{currentLang.flag}</span>
            <span className="topbar-lang-short">{currentLang.short}</span>
            <span className="topbar-lang-chevron">▾</span>
          </button>

          {showLang && (
            <div className="topbar-lang-dropdown">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className={`topbar-lang-option ${lang === l.code ? "topbar-lang-option--active" : ""}`}
                  onClick={() => { setLang(l.code); setShowLang(false); }}
                >
                  <span className="topbar-lang-option-flag">{l.flag}</span>
                  <span className="topbar-lang-option-label">{l.label}</span>
                  {lang === l.code && <span className="topbar-lang-check">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="topbar-notif-wrap" ref={notifRef}>
          <button
            className="cdash-topbar__icon-btn topbar-notif-btn"
            title={t.topbar.notifications}
            onClick={() => setShowNotif((v) => !v)}
          >
            🔔
            {unreadCount > 0 && (
              <span className="topbar-notif-badge">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showNotif && (
            <NotifDropdown alerts={alerts} loading={alertsLoading}
              onMarkAll={() => setAlerts((p) => p.map((a) => ({ ...a, lue: true })))}
              onClose={() => setShowNotif(false)} t={t} />
          )}
        </div>

        {/* Thème */}
        <ThemeToggle
          darkMode={darkMode}
          onToggle={onToggleTheme}
          className="cdash-topbar__icon-btn cdash-topbar__theme-btn"
        />
      </div>
    </header>
  );
}

export default Topbar;
