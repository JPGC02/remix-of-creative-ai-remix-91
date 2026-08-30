import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Save, Trash2 } from 'lucide-react';

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[420px] bg-zinc-950 border-zinc-800">
        <AlertDialogHeader>
          <AlertDialogTitle>Fluxo não salvo</AlertDialogTitle>
          <AlertDialogDescription>
            Você tem um fluxo em andamento que não foi salvo. O que deseja fazer?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={onCancel} className="text-zinc-400">
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={onDiscard}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Descartar
          </Button>
          <Button
            onClick={onSave}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar antes
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
