'use client';

import React, { useState, useEffect } from 'react';
import { BellIcon, CheckIcon, ArchiveBoxIcon, TrashIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api';
import DashboardLayout from '../../components/layout/DashboardLayout';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  priority: 'normal' | 'high';
  category?: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
  action_url?: string;
}

interface NotificationKPIs {
  total_notifications: number;
  unread_notifications: number;
  recent_notifications: number;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [kpis, setKpis] = useState<NotificationKPIs>({ 
    total_notifications: 0, 
    unread_notifications: 0, 
    recent_notifications: 0 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('unread');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    fetchNotifications();
    fetchKPIs();
  }, [filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        limit: '50',
        ...(filter === 'unread' && { unread_only: 'true' })
      });

      const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS.LIST}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        let filteredNotifications = data.data.notifications;
        
        if (filter === 'read') {
          filteredNotifications = filteredNotifications.filter((n: Notification) => n.is_read);
        }
        
        setNotifications(filteredNotifications);
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

  const fetchKPIs = async () => {
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

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true }
              : notif
          )
        );
        fetchKPIs();
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
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, is_read: true }))
        );
        fetchKPIs();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const archiveNotification = async (notificationId: number) => {
    try {
      const response = await fetch(API_ENDPOINTS.NOTIFICATIONS.ARCHIVE(notificationId), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        fetchKPIs();
      }
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return (
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        );
      case 'warning':
        return (
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
        );
      case 'alert':
        return (
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
        );
      default:
        return (
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
        );
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'alert':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getNavigationUrl = (notification: Notification) => {
    if (!user) return '/dashboard';

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
      case 'security':
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
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading notifications...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-1">
              {kpis.unread_notifications} unread of {kpis.total_notifications} total
            </p>
          </div>
          {kpis.unread_notifications > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn-primary flex items-center space-x-2"
            >
              <CheckIcon className="h-4 w-4" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10">
                <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  <BellIcon className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Notifications</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.total_notifications}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10">
                <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <div className="h-5 w-5 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{kpis.unread_notifications}</span>
                  </div>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Unread</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.unread_notifications}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10">
                <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <div className="h-5 w-5 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">7d</span>
                  </div>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Recent (7 days)</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.recent_notifications}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Container */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Notifications ({notifications.length})
              </h2>
              <nav className="flex space-x-6">
                {[
                  { key: 'unread', label: 'Unread' },
                  { key: 'all', label: 'All' },
                  { key: 'read', label: 'Read' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      filter === tab.key
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {error ? (
              <div className="px-6 py-12 text-center">
                <div className="text-red-600 mb-4">
                  <BellIcon className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading notifications</h3>
                <p className="text-gray-500 mb-4">{error}</p>
                <button
                  onClick={fetchNotifications}
                  className="btn-primary"
                >
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <BellIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {filter === 'unread' ? "You're all caught up!" : "No notifications"}
                </h3>
                <p className="text-gray-500">
                  {filter === 'unread' 
                    ? "All your notifications have been read." 
                    : "No notifications to show."
                  }
                </p>
              </div>
            ) : (
              <div>
                {notifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-b-0 ${
                      !notification.is_read ? 'bg-red-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center">
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </h4>
                            <span className="text-xs text-gray-500 ml-4">
                              {formatDate(notification.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mb-2">{notification.message}</p>
                          {notification.category && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                              {notification.category.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 ml-4" onClick={(e) => e.stopPropagation()}>
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-gray-600 hover:text-red-600 transition-colors text-sm font-medium"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => archiveNotification(notification.id)}
                          className="text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium"
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}