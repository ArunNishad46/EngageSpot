import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiMenu, 
  FiX, 
  FiMessageSquare,
  FiLogIn, 
  FiUserPlus, 
  FiInfo,
} from 'react-icons/fi';

const Navbar = () => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  if (user) return null;

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-dark-200/50 safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/login"
            className="flex items-center gap-2.5 group"
            onClick={closeMobileMenu}
          >
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-glow-primary group-hover:scale-105 transition-slow">
              <FiMessageSquare className="text-white" size={22} />
            </div>
            <span className="text-xl font-bold gradient-text-primary">
              EngageSpot
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/about"
              className={`btn-ghost text-sm ${
                isActive('/about')
                  ? '!bg-primary-900/30 !text-primary-400'
                  : ''
              }`}
            >
              <FiInfo size={18} />
              <span>About</span>
            </Link>

            <Link
              to="/login"
              className={`btn-ghost text-sm ${
                isActive('/login')
                  ? '!bg-dark-200/70 !text-white'
                  : ''
              }`}
            >
              <FiLogIn size={18} />
              <span>Sign In</span>
            </Link>

            <Link
              to="/register"
              className="btn-primary text-sm hover:scale-105 hover:shadow-glow-primary"
            >
              <FiUserPlus size={18} />
              <span>Sign Up</span>
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn-ghost p-2.5"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-dark border-t border-dark-200/50 animate-slide-up">
          <div className="px-4 py-4 space-y-1.5">
            <Link
              to="/about"
              onClick={closeMobileMenu}
              className={`dropdown-item rounded-xl py-3 ${
                isActive('/about')
                  ? '!bg-primary-900/30 !text-primary-400'
                  : ''
              }`}
            >
              <FiInfo size={20} />
              <span className="font-medium">About</span>
            </Link>

            <Link
              to="/login"
              onClick={closeMobileMenu}
              className={`dropdown-item rounded-xl py-3 ${
                isActive('/login')
                  ? '!bg-dark-200/70 !text-white'
                  : ''
              }`}
            >
              <FiLogIn size={20} />
              <span className="font-medium">Sign In</span>
            </Link>

            <Link
              to="/register"
              onClick={closeMobileMenu}
              className="btn-primary w-full py-3 mt-2"
            >
              <FiUserPlus size={20} />
              <span>Sign Up</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

