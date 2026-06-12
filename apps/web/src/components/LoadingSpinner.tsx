import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div role="status" aria-label="Loading">
      <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
    </div>
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  message,
}) => {
  if (!isLoading) return <>{children}</>;

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center z-50">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto" />
          {message && (
            <p className="mt-4 text-gray-600 dark:text-gray-300">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const SkeletonLoader: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    />
  );
};

export default LoadingSpinner;
