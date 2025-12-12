'use client';

import React, { useEffect, useState } from 'react';
import { ExclamationTriangleIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS, getAuthHeaders } from '@/config/api';

interface EmergencyWarning {
  title: string;
  description: string;
  link: string;
  pubDate: string;
}

export default function EmergencyWarningCard() {
  const [warning, setWarning] = useState<EmergencyWarning | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchLatestWarning();
    
    // Refresh every 30 minutes
    const interval = setInterval(fetchLatestWarning, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchLatestWarning = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.EMERGENCY_WARNINGS.LATEST, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch warning');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setWarning(result.data);
        setError(false);
      } else {
        setWarning(null);
      }
    } catch (err) {
      console.error('Error fetching emergency warning:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex items-center space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl animate-pulse">
        <div className="p-2 bg-yellow-100 rounded-lg">
          <div className="h-5 w-5 bg-yellow-300 rounded"></div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-yellow-200 rounded w-3/4"></div>
          <div className="h-3 bg-yellow-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !warning) {
    return null; // Don't show anything if there's an error or no warning
  }

  // Clean up HTML entities and truncate description
  const cleanDescription = (desc: string) => {
    return desc
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim()
      .substring(0, 150) + (desc.length > 150 ? '...' : '');
  };

  return (
    <a
      href={warning.link}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl hover:bg-yellow-100 transition-colors group"
    >
      <div className="p-2 bg-yellow-100 rounded-lg flex-shrink-0">
        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-700" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-yellow-900 mb-1 line-clamp-2">{warning.title}</p>
            <p className="text-xs text-yellow-700 mb-2 line-clamp-2">{cleanDescription(warning.description)}</p>
            <p className="text-xs text-yellow-600">
              {new Date(warning.pubDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <ArrowTopRightOnSquareIcon className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5 group-hover:text-yellow-700" />
        </div>
      </div>
    </a>
  );
}
