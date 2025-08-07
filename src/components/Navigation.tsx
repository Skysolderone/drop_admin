import React from 'react';
import { Link } from 'react-router-dom';
import './Navigation.css';

const Navigation: React.FC = () => {
  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          Drop App
        </Link>
        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/" className="nav-link">
              首页
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/about" className="nav-link">
              关于我们
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/contact" className="nav-link">
              联系我们
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;
