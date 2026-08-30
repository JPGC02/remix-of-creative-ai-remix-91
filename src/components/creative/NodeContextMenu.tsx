import { Copy, Play, Trash2, Lock, Unlock } from 'lucide-react';

interface NodeContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  nodeId: string | null;
  onClose: () => void;
  onDuplicate: (nodeId: string) => void;
  onExecuteFrom: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onToggleLock?: (nodeId: string) => void;
  isLocked?: boolean;
}

export const NodeContextMenu = ({
  isOpen,
  position,
  nodeId,
  onClose,
  onDuplicate,
  onExecuteFrom,
  onDelete,
  onToggleLock,
  isLocked = false,
}: NodeContextMenuProps) => {
  if (!isOpen || !nodeId) return null;

  const items = [
    { icon: isLocked ? Unlock : Lock, label: isLocked ? 'Destravar' : 'Travar', action: () => onToggleLock?.(nodeId) },
    { icon: Play, label: 'Executar daqui', action: () => onExecuteFrom(nodeId) },
    { icon: Copy, label: 'Duplicar', action: () => onDuplicate(nodeId) },
    { icon: Trash2, label: 'Deletar', action: () => onDelete(nodeId), destructive: true },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl shadow-black/40 p-1 w-44"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => { item.action(); onClose(); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
              item.destructive
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
};
