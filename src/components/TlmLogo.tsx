import React from 'react';

interface TlmLogoProps {
  variant?: 'full' | 'symbol' | 'horizontal-compact' | 'badge';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  subtitle?: string;
  customLogoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const TlmLogo: React.FC<TlmLogoProps> = ({
  variant = 'full',
  theme = 'light',
  className = '',
  subtitle = 'Get Adviced',
  customLogoUrl = null,
  size = 'md',
}) => {
  // If a custom logo URL is provided, display it gracefully
  if (customLogoUrl) {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <img
          src={customLogoUrl}
          alt="Logo Corporativo"
          className={`object-contain ${
            size === 'xs' ? 'h-6' : size === 'sm' ? 'h-8' : size === 'md' ? 'h-10' : size === 'lg' ? 'h-12' : 'h-16'
          }`}
        />
        {variant !== 'symbol' && (
          <div className="flex flex-col">
            <span className={`font-black tracking-tight leading-none ${theme === 'dark' ? 'text-white' : 'text-[#271a82]'}`}>
              TLM
            </span>
            {subtitle && (
              <span className={`text-[10px] font-medium tracking-wide ${theme === 'dark' ? 'text-indigo-200' : 'text-slate-500'}`}>
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Dimension scaling
  const sizeMap = {
    xs: { symbol: 'w-6 h-6', fullW: '120px', textTitle: 'text-sm', textSub: 'text-[9px]' },
    sm: { symbol: 'w-8 h-8', fullW: '140px', textTitle: 'text-base', textSub: 'text-[10px]' },
    md: { symbol: 'w-10 h-10', fullW: '180px', textTitle: 'text-lg', textSub: 'text-xs' },
    lg: { symbol: 'w-12 h-12', fullW: '220px', textTitle: 'text-xl', textSub: 'text-sm' },
    xl: { symbol: 'w-16 h-16', fullW: '280px', textTitle: 'text-2xl', textSub: 'text-base' },
  };

  const currentSize = sizeMap[size];

  // The 4-quadrant official symbol from https://www.tlmcol.com/brand/logo-horizontal.svg
  const SymbolSvg = ({ className = 'w-10 h-10' }: { className?: string }) => (
    <svg
      viewBox="180 440 520 520"
      className={`${className} shrink-0 drop-shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Quadrant 1 - Vermilion #e64519 */}
      <path
        fill="#e64519"
        d="M252.89 677.08a178.76 178.76 0 0 0 1.52 23.46h.21A59.5 59.5 0 1 0 368.46 669.4h.12c-22.31-53.55-10.65-115.88 29.55-153.86a129.45 129.45 0 0 1 28.2-19.8c-29.71.18-56.83 10.83-80.8 24.2-55.15 30.75-92.62 88.81-92.65 157.14Z"
      />
      <circle fill="#e64519" cx="213.32" cy="632.62" r="24.97" />

      {/* Quadrant 2 - Deep Indigo Navy #271a82 */}
      <path
        fill="#271a82"
        d="M421.28 890.53a178.53 178.53 0 0 0 23.46-1.53v-.21A59.5 59.5 0 1 0 413.6 775v-.12c-53.54 22.31-115.87 10.65-153.85-29.55a129 129 0 0 1-19.8-28.2c.18 29.71 10.82 56.83 24.19 80.8 30.75 55.07 88.88 92.57 157.14 92.6Z"
      />
      <circle fill="#271a82" cx="376.83" cy="930.1" r="24.97" />

      {/* Quadrant 3 - Warm Amber #fa9d1c */}
      <path
        fill="#fa9d1c"
        d="M467.17 509.47a178.76 178.76 0 0 0-23.46 1.53v.21A59.5 59.5 0 1 0 474.85 625v.12c53.55-22.31 115.88-10.65 153.86 29.55a129.31 129.31 0 0 1 19.8 28.2c-.18-29.71-10.83-56.83-24.2-80.8-30.75-55.07-88.81-92.57-157.14-92.6Z"
      />
      <circle fill="#fa9d1c" cx="511.62" cy="469.9" r="24.97" />

      {/* Quadrant 4 - Soft Lavender #777eec */}
      <path
        fill="#777eec"
        d="M634.35 723.09a180.51 180.51 0 0 0-1.53-23.46h-.21a59.5 59.5 0 1 0-113.83 31.14h-.13C541 784.32 529.31 846.65 489.1 884.63a129.15 129.15 0 0 1-28.19 19.8c29.7-.18 56.82-10.83 80.8-24.2 55.14-30.74 92.6-88.81 92.64-157.14Z"
      />
      <circle fill="#777eec" cx="673.92" cy="767.55" r="24.97" />
    </svg>
  );

  if (variant === 'symbol') {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <SymbolSvg className={currentSize.symbol} />
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      {/* 4-Color Icon Symbol */}
      <div className="shrink-0 transition-transform duration-200 hover:rotate-6">
        <SymbolSvg className={currentSize.symbol} />
      </div>

      {/* Typography from Catamaran Brand Family */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-black tracking-tight ${currentSize.textTitle} ${
              isDark ? 'text-white' : 'text-[#271a82]'
            }`}
            style={{ fontFamily: "'Catamaran', 'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            TLM
          </span>
          <span
            className={`font-light text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
              isDark
                ? 'bg-[#fa9d1c]/20 text-[#fa9d1c] border border-[#fa9d1c]/30'
                : 'bg-[#271a82]/10 text-[#271a82] border border-[#271a82]/20'
            }`}
          >
            BIC
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={`font-medium ${currentSize.textSub} ${
              isDark ? 'text-indigo-200' : 'text-slate-600'
            }`}
            style={{ fontFamily: "'Catamaran', 'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            {subtitle}
          </span>
          <span className="w-1 h-1 rounded-full bg-[#e64519]"></span>
          <span className={`text-[9px] uppercase tracking-wider ${isDark ? 'text-indigo-300/80' : 'text-slate-400'}`}>
            Fiscal & ERP
          </span>
        </div>
      </div>
    </div>
  );
};
