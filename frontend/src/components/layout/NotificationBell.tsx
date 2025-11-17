'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { API_ENDPOINTS } from '../../config/api';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  priority: 'normal' | 'high';
  category?: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
}

interface NotificationKPIs {
  total_notifications: number;
  unread_notifications: number;
  recent_notifications: number;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [kpis, setKpis] = useState<NotificationKPIs>({ 
    total_notifications: 0, 
    unread_notifications: 0, 
    recent_notifications: 0 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notification KPIs on mount
  useEffect(() => {
    fetchNotificationKPIs();
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotificationKPIs = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.NOTIFICATIONS.KPIS, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setKpis(data.data);
      }
    } catch (error) {
      console.error('Error fetching notification KPIs:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS.LIST}?limit=10&unread_only=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data.notifications);
      } else {
        setError('Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        // Update notification in state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true }
              : notif
          )
        );
        
        // Update KPIs
        setKpis(prev => ({
          ...prev,
          unread_notifications: Math.max(0, prev.unread_notifications - 1)
        }));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        // Update all notifications as read
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, is_read: true }))
        );
        
        // Update KPIs
        setKpis(prev => ({
          ...prev,
          unread_notifications: 0
        }));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return (
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        );
      case 'warning':
        return (
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
        );
      case 'alert':
        return (
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        );
      default:
        return (
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        );
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'alert':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getNavigationUrl = (notification: Notification) => {
    const userData = localStorage.getItem('user');
    if (!userData) return '/dashboard';
    
    const user = JSON.parse(userData);
    const userType = user.user_type;
    const category = notification.category;

    // User type specific navigation based on actual sidebar routes
    switch (category) {
      case 'equipment':
      case 'equipment_assignment':
      case 'equipment_alert':
      case 'equipment_status':
        if (userType === 'client') return '/client-equipment';
        if (userType === 'vendor') return '/equipment';
        if (userType === 'admin') return '/vendors'; // Admin sees vendor equipment through vendor management
        break;
        
      case 'service_request':
      case 'ticket_management':
        if (userType === 'client') return '/service-requests';
        if (userType === 'vendor') return '/maintenance-tickets';
        if (userType === 'admin') return '/vendors'; // Admin manages through vendor oversight
        break;
        
      case 'assignment':
        if (userType === 'client') return '/client-equipment';
        if (userType === 'vendor') return '/equipment'; // Vendor equipment management
        if (userType === 'admin') return '/vendors'; // Admin manages through vendor oversight
        break;
        
      case 'client_management':
        if (userType === 'vendor') return '/clients';
        if (userType === 'admin') return '/users'; // Admin manages all users
        break;
        
      case 'vendor_management':
        if (userType === 'admin') return '/vendors';
        break;
        
      case 'compliance':
      case 'maintenance':
        if (userType === 'client') return '/clients/analytics'; // Client compliance view
        if (userType === 'vendor') return '/vendors/analytics'; // Vendor analytics
        if (userType === 'admin') return '/analytics'; // Admin system analytics
        break;
        
      case 'system':
      case 'settings':
        if (userType === 'admin') return '/settings';
        return '/dashboard'; // Non-admin users go to dashboard
        break;
        
      default:
        return '/dashboard';
    }
    
    return '/dashboard';
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    const url = getNavigationUrl(notification);
    window.location.href = url;
    
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        aria-label="Notifications"
      >
        {kpis.unread_notifications > 0 ? (
          <BellSolidIcon className="h-6 w-6 text-red-500" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        
        {/* Unread Count Badge */}
        {kpis.unread_notifications > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {kpis.unread_notifications > 99 ? '99+' : kpis.unread_notifications}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            {kpis.unread_notifications > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-2">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">
                <p>{error}</p>
                <button
                  onClick={fetchNotifications}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <BellIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="font-medium">You're all caught up!</p>
                <p className="text-sm mt-1">No unread notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                      !notification.is_read ? 'bg-red-50' : ''
                    }`}
                  >
                      <div className="flex items-start space-x-3">
                      <div className="mt-2">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </p>
                          <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                            {formatRelativeTime(notification.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.category && (
                          <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded text-center" style={{fontSize: '10px'}}>
                            {notification.category.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => {
                  window.location.href = '/notifications';
                  setIsOpen(false);
                }}
                className="w-full text-center text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}