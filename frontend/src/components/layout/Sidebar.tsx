'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  FireIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  userRole: string;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function Sidebar({ userRole, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const getNavItems = (): NavItem[] => {
    switch (userRole) {
      case 'admin':
        return [
          { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
          { name: 'Vendor Management', href: '/dashboard/vendors', icon: BuildingOfficeIcon },
          { name: 'User Management', href: '/dashboard/users', icon: UsersIcon },
          { name: 'System Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
        ];
      case 'vendor':
        return [
          { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
          { name: 'Client Management', href: '/dashboard/clients', icon: UsersIcon },
          { name: 'Equipment Management', href: '/dashboard/equipment', icon: FireIcon },
          { name: 'Service Requests', href: '/dashboard/requests', icon: WrenchScrewdriverIcon },
          { name: 'Reports', href: '/dashboard/reports', icon: ChartBarIcon },
        ];
      case 'client':
        return [
          { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
          { name: 'My Equipment', href: '/dashboard/equipment', icon: FireIcon },
          { name: 'Service Requests', href: '/dashboard/requests', icon: ClipboardDocumentListIcon },
          { name: 'Maintenance History', href: '/dashboard/maintenance', icon: WrenchScrewdriverIcon },
          { name: 'Safety Reports', href: '/dashboard/reports', icon: ShieldCheckIcon },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-16 left-0 z-50 h-sidebar w-64 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-full lg:flex-shrink-0 lg:top-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar header - only visible on mobile */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100 lg:hidden">
            <div className="flex items-center">
              <FireIcon className="h-8 w-8 text-danger mr-3" />
              <span className="text-lg font-semibold text-primary-text" style={{fontFamily: 'Segoe UI, Helvetica Neue, Arial, sans-serif'}}>Fire Guardian</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 lg:pt-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center px-4 py-3 rounded-full text-sm font-medium transition-all duration-200 mx-2
                    ${isActive 
                      ? 'bg-red-50 text-red-700 border border-red-100' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}