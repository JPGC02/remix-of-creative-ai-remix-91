import { useSignedUrl } from "@/hooks/useRealEstate";
import { FileText, ImageIcon, Loader2 } from "lucide-react";

interface Props {
  path: string;
  mimeType?: string | null;
  className?: string;
  alt?: string;
}

export function AssetPreview({ path, mimeType, className, alt }: Props) {
  const { data: url, isLoading } = useSignedUrl(path);
  const isImage = mimeType?.startsWith("image/") ?? true;

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className ?? ""}`}
      >
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!url) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground ${className ?? ""}`}
      >
        <ImageIcon className="h-6 w-6" />
      </div>
    );
  }

  if (!isImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`flex flex-col items-center justify-center bg-muted text-muted-foreground gap-2 text-xs ${className ?? ""}`}
      >
        <FileText className="h-8 w-8" />
        Abrir arquivo
      </a>
    );
  }

  return (
    <img
      src={url}
      alt={alt ?? ""}
      className={`object-cover ${className ?? ""}`}
      loading="lazy"
    />
  );
}
