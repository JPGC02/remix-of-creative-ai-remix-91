import { Lock } from 'lucide-react';

interface LockIndicatorProps {
  locked?: boolean;
}

export function LockIndicator({ locked }: LockIndicatorProps) {
  if (!locked) return null;
  return (
    <div className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
      <Lock className="w-2.5 h-2.5 text-black" />
    </div>
  );
}
