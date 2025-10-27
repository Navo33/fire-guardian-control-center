'use client';

import React from 'react';

// Simple chart components without external dependencies
interface ChartData {
  label: string;
  value: number;
  percentage?: number;
  color?: string;
}

interface SimpleBarChartProps {
  title: string;
  data: ChartData[];
  maxValue?: number;
  height?: string;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ 
  title, 
  data, 
  maxValue,
  height = "200px" 
}) => {
  const max = maxValue || Math.max(...data.map(d => d.value));
  
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
      <div className="space-y-3" style={{ height }}>
        {data.map((item, index) => (
          <div key={item.label} className="flex items-center">
            <div className="w-24 text-sm text-gray-600 truncate" title={item.label}>
              {item.label}
            </div>
            <div className="flex-1 mx-3">
              <div className="bg-gray-200 rounded-full h-6 relative">
                <div
                  className="rounded-full h-6 flex items-center justify-end pr-2"
                  style={{
                    width: `${(item.value / max) * 100}%`,
                    backgroundColor: item.color || colors[index % colors.length],
                    minWidth: item.value > 0 ? '20px' : '0'
                  }}
                >
                  {item.value > 0 && (
                    <span className="text-white text-xs font-medium">
                      {item.value}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="w-16 text-sm text-gray-500 text-right">
              {item.percentage ? `${item.percentage}%` : item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface SimplePieChartProps {
  title: string;
  data: ChartData[];
  size?: number;
}

export const SimplePieChart: React.FC<SimplePieChartProps> = ({ 
  title, 
  data, 
  size = 200 
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  const colors = [
    '#10B981', '#EF4444', '#F59E0B', '#3B82F6', 
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
  ];

  let cumulativePercentage = 0;

  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
      <div className="flex items-center justify-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2 - 10}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="20"
            />
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const strokeDasharray = `${percentage * 2.51327} ${251.327}`;
              const strokeDashoffset = -cumulativePercentage * 2.51327;
              cumulativePercentage += percentage;
              
              return (
                <circle
                  key={item.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={size / 2 - 10}
                  fill="none"
                  stroke={item.color || colors[index % colors.length]}
                  strokeWidth="20"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
          </div>
        </div>
        <div className="ml-6 space-y-2">
          {data.map((item, index) => (
            <div key={item.label} className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: item.color || colors[index % colors.length] }}
              />
              <span className="text-sm text-gray-600">{item.label}</span>
              <span className="text-sm text-gray-800 ml-2 font-medium">
                ({item.value})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface SimpleLineChartProps {
  title: string;
  data: Array<{
    month: string;
    month_label: string;
    tickets_created: number;
    tickets_resolved: number;
    avg_resolution_hours?: number;
  }>;
  height?: string;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ 
  title, 
  data, 
  height = "250px" 
}) => {
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.tickets_created, d.tickets_resolved))
  );

  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
      <div style={{ height }} className="relative">
        <div className="grid grid-cols-12 gap-2 h-full">
          {data.slice(-12).map((item, index) => (
            <div key={item.month} className="flex flex-col justify-end items-center">
              <div className="flex-1 flex flex-col justify-end space-y-1 w-full">
                <div
                  className="bg-blue-500 rounded-t"
                  style={{
                    height: `${(item.tickets_created / maxValue) * 100}%`,
                    minHeight: item.tickets_created > 0 ? '4px' : '0'
                  }}
                  title={`Created: ${item.tickets_created}`}
                />
                <div
                  className="bg-green-500 rounded-t"
                  style={{
                    height: `${(item.tickets_resolved / maxValue) * 100}%`,
                    minHeight: item.tickets_resolved > 0 ? '4px' : '0'
                  }}
                  title={`Resolved: ${item.tickets_resolved}`}
                />
              </div>
              <div className="text-xs text-gray-500 mt-2 transform rotate-45 origin-bottom-left w-16">
                {item.month_label.split(' ')[0]}
              </div>
            </div>
          ))}
        </div>
        <div className="absolute bottom-0 left-0 text-xs text-gray-400 flex space-x-4 mt-2">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
            <span>Created</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
            <span>Resolved</span>
          </div>
        </div>
      </div>
    </div>
  );
};