import "./ThemeToggle.css";

function ThemeToggle({ darkMode, onToggle, className = "theme-toggle" }) {
  return (
    <button
      type="button"
      className={className}
      onClick={onToggle}
      title="Changer de thème"
      aria-label={darkMode ? "Passer en thème clair" : "Passer en thème sombre"}
    >
      {darkMode ? "☀️" : "🌙"}
    </button>
  );
}

export default ThemeToggle;
