import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  FileText,
  Home,
  Upload,
  History,
  HelpCircle,
  Menu,
  X,
  LogOut,
  User,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { clsx } from 'clsx';
import AuthModal from './AuthModal';
import { useAuth } from '../contexts/AuthProvider';

const Layout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const appNav = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Upload Document', href: '/upload', icon: Upload },
    { name: 'My Documents', href: '/documents', icon: History },
    { name: 'Help', href: '/help', icon: HelpCircle },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation (integrated, sticky) */}
      <nav className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Brand */}
            <Link to="/" className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-md">
                <FileText className="w-6 h-6 text-white" />
              </div>
              Doclarity
            </Link>

            {/* Desktop links (center/right) */}
            <div className="hidden md:flex items-center gap-8">
              {/* Hash links to sections on Home (use Link so route updates) */}
              <a href="/#features" className="text-slate-600 hover:text-primary-600 transition-colors font-medium">
                Features
              </a>
              <a href="/#pricing" className="text-slate-600 hover:text-primary-600 transition-colors font-medium">
                Pricing
              </a>
              <Link to="/help" className="text-slate-600 hover:text-primary-600 transition-colors font-medium">
                FAQ
              </Link>

              {/* Auth area */}
              {!user ? (
                <>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="text-slate-600 hover:text-primary-600 transition-colors font-medium"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setShowSignup(true)}
                    className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-500/30 transition-all font-medium hover:scale-105 active:scale-95"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
                  >
                    <div className="bg-slate-200 p-2 rounded-full">
                      <User className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">{user.email}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {isUserMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-1 z-20 border border-slate-200">
                        {/* App links for signed-in users */}
                        {appNav.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              className={clsx(
                                'flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50',
                                isActive(item.href) && 'bg-slate-50'
                              )}
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Icon className="h-4 w-4 mr-2" />
                              {item.name}
                            </Link>
                          );
                        })}
                        <hr className="my-1" />
                        <Link
                          to="/settings"
                          className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200">
            <div className="px-4 py-3 space-y-2">
              <Link
                to="/#features"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Features
              </Link>
              <Link
                to="/#pricing"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Pricing
              </Link>
              <Link
                to="/#faq"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                FAQ
              </Link>

              {!user ? (
                <div className="border-t border-slate-200 pt-3 mt-3 space-y-2">
                  <button
                    onClick={() => {
                      setShowLogin(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 rounded-md text-base font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 text-left"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setShowSignup(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 rounded-md text-base font-medium bg-primary-600 text-white hover:bg-primary-700 text-left"
                  >
                    Sign Up
                  </button>
                </div>
              ) : (
                <>
                  <div className="border-t border-slate-200 pt-3 mt-3 space-y-2">
                    {appNav.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={clsx(
                          'block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50',
                          isActive(item.href) && 'bg-slate-50'
                        )}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 pt-3 mt-3">
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer (unchanged) */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-primary-600 p-2 rounded-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <span className="text-lg font-bold text-slate-900">Doclarity - Legal Doc Demystifier</span>
              </div>
              <p className="text-slate-600 text-sm">
                Making legal documents accessible and understandable for everyone. Powered by advanced AI to help you make informed decisions.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-sm text-slate-600 hover:text-slate-900">About Us</Link></li>
                <li><Link to="/privacy" className="text-sm text-slate-600 hover:text-slate-900">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-sm text-slate-600 hover:text-slate-900">Terms of Service</Link></li>
                <li><Link to="/contact" className="text-sm text-slate-600 hover:text-slate-900">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Support</h3>
              <ul className="space-y-2">
                <li><Link to="/help" className="text-sm text-slate-600 hover:text-slate-900">Help Center</Link></li>
                <li><Link to="/faq" className="text-sm text-slate-600 hover:text-slate-900">FAQ</Link></li>
                <li><a href="mailto:support@doclarity.com" className="text-sm text-slate-600 hover:text-slate-900">support@doclarity.com</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <p className="text-center text-sm text-slate-500">© 2025 Doclarity. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modals */}
      <AuthModal open={showLogin} onClose={() => setShowLogin(false)} mode="login" />
      <AuthModal open={showSignup} onClose={() => setShowSignup(false)} mode="signup" />
    </div>
  );
};

export default Layout;