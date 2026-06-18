import React from "react";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  variant?: "spinner" | "dots" | "pulse";
  className?: string;
  inline?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  size = "md",
  text,
  variant = "spinner",
  className = "",
  inline = false,
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const Spinner = () => (
    <div
      className={`
        ${sizeClasses[size]}
        border-2 border-gray-300 border-t-blue-500
        rounded-full animate-spin
      `}
    />
  );

  const Dots = () => (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`
            ${size === "sm" ? "w-1.5 h-1.5" : size === "md" ? "w-2 h-2" : "w-3 h-3"}
            rounded-full bg-blue-500
            animate-bounce
          `}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );

  const Pulse = () => (
    <div
      className={`
        ${sizeClasses[size]}
        bg-blue-500 rounded-full
        animate-ping
      `}
    />
  );

  const renderLoader = () => {
    switch (variant) {
      case "dots":
        return <Dots />;
      case "pulse":
        return <Pulse />;
      default:
        return <Spinner />;
    }
  };

  if (inline) {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`}>
        {renderLoader()}
        {text && <span className={textSizes[size]}>{text}</span>}
      </span>
    );
  }

  return (
    <div
      className={`
        flex flex-col items-center justify-center gap-3
        ${className}
      `}
    >
      {renderLoader()}
      {text && <span className={textSizes[size]}>{text}</span>}
    </div>
  );
};

export default Loading;

export const LoadingOverlay: React.FC<{
  isLoading: boolean;
  children?: React.ReactNode;
  text?: string;
}> = ({ isLoading, children, text = "加载中..." }) => {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
        <Loading text={text} />
      </div>
      {children}
    </div>
  );
};