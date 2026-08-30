import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { getCompatibleNodes } from './node-compatibility';

interface ContextNodeMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  sourceNodeType: string | null;
  allNodeTypes: any[];
  onClose: () => void;
  onSelectNode: (nodeType: string) => void;
}

export const ContextNodeMenu = ({ 
  isOpen, 
  position, 
  sourceNodeType,
  allNodeTypes,
  onClose, 
  onSelectNode 
}: ContextNodeMenuProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focar no input quando o menu abre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSearchTerm('');
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  // Filtrar nós compatíveis com o nó de origem
  const compatibleNodes = sourceNodeType 
    ? getCompatibleNodes(sourceNodeType, allNodeTypes)
    : allNodeTypes;
  
  // Aplicar filtro de busca
  const filteredNodes = compatibleNodes.filter(node => 
    node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <>
      {/* Overlay invisível para fechar ao clicar fora */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Menu */}
      <Card 
        className="fixed z-50 bg-zinc-950/95 backdrop-blur-sm border-2 border-white/20 shadow-2xl p-0 w-72 max-h-96 overflow-hidden flex flex-col"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
        }}
      >
        {/* Header com busca */}
        <div className="p-3 border-b border-border space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground">
              Adicionar Nó
            </h3>
            {sourceNodeType && (
              <Badge variant="outline" className="text-[9px] bg-primary/10">
                {compatibleNodes.length} compatíveis
              </Badge>
            )}
          </div>
          
          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>
        </div>
        
        {/* Lista de nós */}
        <div className="overflow-y-auto flex-1">
          {filteredNodes.length > 0 ? (
            <div className="p-2 space-y-1">
              {filteredNodes.map((node) => (
                <button
                  key={node.type}
                  onClick={() => {
                    onSelectNode(node.type);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent transition-all text-left group"
                >
                  <div className="w-8 h-8 rounded-md bg-background/50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <node.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {node.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {node.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-xs text-muted-foreground">
                Nenhum nó encontrado
              </p>
            </div>
          )}
        </div>
        
        {/* Footer com dica de ESC */}
        <div className="p-2 border-t border-border flex-shrink-0">
          <p className="text-[10px] text-muted-foreground text-center">
            Pressione <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">ESC</kbd> para fechar
          </p>
        </div>
      </Card>
    </>
  );
};
