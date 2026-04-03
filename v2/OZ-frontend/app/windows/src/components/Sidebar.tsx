import './Sidebar.css';

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">OZ</div>
          <span className="logo-text">OrderZap</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <button className="nav-item active">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>Menu</span>
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;
