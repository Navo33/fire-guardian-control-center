interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullPage?: boolean;
}

export default function LoadingSpinner({ 
  size = 'md', 
  text = 'Loading...', 
  fullPage = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  const containerClasses = fullPage 
    ? 'fixed inset-0 bg-white flex items-center justify-center z-50'
    : 'flex items-center justify-center py-8';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-3">
        <div className={`${sizeClasses[size]} border-3 border-red-200 border-t-red-600 rounded-full animate-spin`}></div>
        <p className="text-gray-600 text-sm font-medium">{text}</p>
      </div>
    </div>
  );
}