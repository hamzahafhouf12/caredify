import ThemeToggle from "../ThemeToggle"

function Topbar({ breadcrumb, darkMode, onToggleTheme }) {
  return (
    <header className="cdash-topbar">
      <div className="cdash-topbar__left">
        <span className="cdash-topbar__tb-icon">📋</span>
        <span className="cdash-topbar__tb-icon">⭐</span>
        <span className="cdash-topbar__breadcrumb">{breadcrumb}</span>
      </div>
      <div className="cdash-topbar__right">
        <div className="cdash-topbar__search">
          <span className="cdash-topbar__search-icon">🔍</span>
          <input type="text" placeholder="Recherche" className="cdash-topbar__search-input" />
        </div>
        <span className="cdash-topbar__lang">Fr</span>
        <button className="cdash-topbar__icon-btn" title="Notifications">🔔</button>
        <ThemeToggle 
          darkMode={darkMode} 
          onToggle={onToggleTheme} 
          className="cdash-topbar__icon-btn cdash-topbar__theme-btn"
        />
      </div>
    </header>
  )
}

export default Topbar
