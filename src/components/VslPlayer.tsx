import { useState } from 'react';
import { Play } from 'lucide-react';

interface VslPlayerProps {
  youtubeId: string;
  className?: string;
}

// Player de vídeo "clique pra tocar" usado na página de captura, antes do
// formulário de inscrição. Hospedado como não listado no YouTube (o Vercel
// Blob usado antes estourou a cota gratuita de transferência) -- controls=0
// e rel=0 escondem a interface padrão do YouTube até o clique.
export function VslPlayer({ youtubeId, className = '' }: VslPlayerProps) {
  const [tocando, setTocando] = useState(false);
  const posterUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl shadow-2xl border border-border/50 aspect-video bg-black ${className}`}>
      {tocando ? (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&controls=0&rel=0`}
          title="Assistir ao vídeo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full"
          frameBorder={0}
        />
      ) : (
        <button
          type="button"
          onClick={() => setTocando(true)}
          aria-label="Assistir ao vídeo"
          className="group relative block h-full w-full"
        >
          <img src={posterUrl} alt="Capa do vídeo" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/90 shadow-xl transition-transform group-hover:scale-110 animate-pulse-slow">
              <Play className="h-9 w-9 translate-x-0.5 fill-primary-foreground text-primary-foreground" />
            </span>
          </div>
        </button>
      )}
    </div>
  );
}
