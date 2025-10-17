'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FireIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface TopNavProps {
  user: {
    display_name: string;
    user_type: string;
  };
  onMenuToggle: () => void;
  isMobileMenuOpen: boolean;
}

export default function TopNav({ user, onMenuToggle, isMobileMenuOpen }: TopNavProps) {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const getRoleDisplay = (user_type: string) => {
    switch (user_type) {
      case 'admin':
        return 'Admin';
      case 'vendor':
        return 'Vendor';
      case 'client':
        return 'Client';
      default:
        return user_type?.replace('_', ' ') || 'Unknown';
    }
  };

  const handleProfileClick = () => {
    setIsDropdownOpen(false);
    router.push('/dashboard/profile');
  };

  const handleSettingsClick = () => {
    setIsDropdownOpen(false);
    router.push('/dashboard/settings');
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40 flex-shrink-0">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and menu toggle */}
          <div className="flex items-center">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-3 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 mr-2"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-7 w-7" />
              ) : (
                <Bars3Icon className="h-7 w-7" />
              )}
            </button>
            <div className="flex items-center">
              <FireIcon className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900 hidden sm:block" style={{fontFamily: 'Segoe UI, Helvetica Neue, Arial, sans-serif'}}>
                  Fire Guardian Control Center
                </h1>
                <h1 className="text-lg font-semibold text-gray-900 sm:hidden" style={{fontFamily: 'Segoe UI, Helvetica Neue, Arial, sans-serif'}}>
                  Fire Guardian
                </h1>
                
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {(user.display_name || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900" style={{fontFamily: 'Segoe UI, Helvetica Neue, Arial, sans-serif'}}>
                    {user.display_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">{getRoleDisplay(user.user_type)}</p>
                </div>
                <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform hidden sm:block ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user.display_name || 'User'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{getRoleDisplay(user.user_type)}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <button
                      onClick={handleProfileClick}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <UserCircleIcon className="h-4 w-4" />
                      <span>My Profile</span>
                    </button>

                    {user.user_type === 'admin' && (
                      <button
                        onClick={handleSettingsClick}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <Cog6ToothIcon className="h-4 w-4" />
                        <span>System Settings</span>
                      </button>
                    )}
                    
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}