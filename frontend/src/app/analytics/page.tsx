'use client';
import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RequireRole from '@/components/auth/RequireRole';
import { 
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

export default function AdminAnalyticsPage() {
  const [exportingPDF, setExportingPDF] = useState(false);

  // Export to PDF functionality (placeholder for future implementation)
  const exportToPDF = async () => {
    try {
      setExportingPDF(true);
      // TODO: Implement PDF export functionality
      console.log('PDF export functionality will be implemented');
      alert('PDF export functionality will be implemented in a future update.');
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <RequireRole allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
              <p className="text-gray-600 mt-1">Export system analytics and generate reports</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={exportToPDF}
                disabled={exportingPDF}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportingPDF ? (
                  <>
                    <div className="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export PDF Report
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <div className="text-center py-12">
              <ArrowDownTrayIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics & Reporting</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                Analytics features are being rebuilt. Use the export button above to generate PDF reports 
                when this functionality becomes available.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </RequireRole>
  );
}