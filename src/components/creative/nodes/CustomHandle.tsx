import { createContext, useContext, useState, ReactNode } from 'react';
import { Handle as RFHandle, Position as RFPosition, HandleProps } from 'reactflow';
import { cn } from '@/lib/utils';

type HandleType = 'text' | 'image' | 'video';

interface HoverContextValue {
  hoveringSourceType: HandleType | null;
  setHoveringSourceType: (type: HandleType | null) => void;
}

const HandleHoverContext = createContext<HoverContextValue>({
  hoveringSourceType: null,
  setHoveringSourceType: () => {},
});

export function HandleHoverProvider({ children }: { children: ReactNode }) {
  const [hoveringSourceType, setHoveringSourceType] = useState<HandleType | null>(null);
  return (
    <HandleHoverContext.Provider value={{ hoveringSourceType, setHoveringSourceType }}>
      {children}
    </HandleHoverContext.Provider>
  );
}

interface CustomHandleProps extends Partial<HandleProps> {
  type: 'source' | 'target';
  handleType?: HandleType;
  id: string;
  position: RFPosition;
  style?: React.CSSProperties;
  className?: string;
  isConnected?: boolean;
  showOnHover?: boolean;
  isConnecting?: boolean;
  connectingType?: HandleType | null;
  hasData?: boolean;
}

export const CustomHandle = ({
  type,
  handleType,
  id,
  position,
  style,
  className,
  isConnected = false,
  showOnHover = false,
  isConnecting = false,
  connectingType = null,
  hasData = false,
  ...props
}: CustomHandleProps) => {
  const { hoveringSourceType, setHoveringSourceType } = useContext(HandleHoverContext);

  const isSource = type === 'source';
  const isTarget = type === 'target';

  const shouldShowSource = isConnected || showOnHover;
  const isCompatible = !connectingType || connectingType === handleType;
  const isHoverCompatible = hoveringSourceType && hoveringSourceType === handleType;
  const shouldShowTarget = isConnected || (isConnecting && isCompatible) || !!isHoverCompatible;
  const shouldShow = isSource ? shouldShowSource : shouldShowTarget;

  const compatibilityClass = isTarget && isConnecting
    ? (isCompatible ? 'handle-compatible' : 'handle-incompatible')
    : '';
  const hoverHighlightClass = isTarget && !isConnected && isHoverCompatible ? 'handle-compatible' : '';

  const handleMouseEnter = isSource ? () => {
    if (handleType) setHoveringSourceType(handleType);
  } : undefined;

  const handleMouseLeave = isSource ? () => {
    setHoveringSourceType(null);
  } : undefined;

  return (
    <RFHandle
      type={type}
      position={position}
      id={id}
      className={cn(
        isConnected ? 'connected' : '',
        compatibilityClass,
        hoverHighlightClass,
        className
      )}
      style={{
        ...style,
        opacity: shouldShow ? 1 : 0.35,
        pointerEvents: isSource ? 'auto' : (shouldShow ? 'auto' : 'none'),
        transition: 'opacity 0.15s ease, transform 0.15s ease, background 0.15s ease',
        ...(hasData && isSource ? {
          background: '#10b981',
          boxShadow: '0 0 6px 2px rgba(16, 185, 129, 0.4)',
        } : {}),
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    />
  );
};
