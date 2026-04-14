import { Link } from "react-router-dom";
import caredifyLogo from "../../assets/Caredify-logo.png";

function Sidebar({ navItems, doctorInfo }) {
  return (
    <aside className="cdash-sidebar">
      <div className="cdash-sidebar__top">
        <div className="cdash-sidebar__avatar-wrap">
          <div className="cdash-sidebar__avatar-circle">
            {doctorInfo.avatar ? (
              <img
                src={doctorInfo.avatar}
                alt="Doctor"
                className="cdash-sidebar__avatar-img"
              />
            ) : (
              <span className="cdash-sidebar__avatar-emoji">👨‍⚕️</span>
            )}
          </div>
        </div>
        <p className="cdash-sidebar__doctor-name">{doctorInfo.name}</p>
        <p className="cdash-sidebar__doctor-spec">{doctorInfo.specialty}</p>
      </div>

      <nav className="cdash-sidebar__nav">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            className={`cdash-sidebar__link ${item.active ? "cdash-sidebar__link--active" : ""}`}
          >
            <span className="cdash-sidebar__link-icon">{item.icon}</span>
            <span className="cdash-sidebar__link-text">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="cdash-sidebar__bottom">
        <img
          src={caredifyLogo}
          alt="Caredify"
          className="cdash-sidebar__logo-img"
        />
      </div>
    </aside>
  );
}

export default Sidebar;
