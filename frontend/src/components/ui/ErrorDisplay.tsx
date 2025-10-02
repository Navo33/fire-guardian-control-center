interface ErrorDisplayProps {
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  fullPage?: boolean;
}

export default function ErrorDisplay({ 
  title = 'Something went wrong',
  message,
  action,
  fullPage = false 
}: ErrorDisplayProps) {
  const containerClasses = fullPage 
    ? 'fixed inset-0 bg-white flex items-center justify-center z-50'
    : 'flex items-center justify-center py-8';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600">{message}</p>
        </div>

        {action && (
          <button
            onClick={action.onClick}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}