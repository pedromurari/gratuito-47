import { useState } from 'react';
import { Play } from 'lucide-react';

interface VslPlayerProps {
  videoUrl: string;
  posterUrl: string;
  className?: string;
}

// Player de vídeo "clique pra tocar" usado na página de captura, antes do
// formulário de inscrição. Vídeo e capa ficam no Vercel Blob (arquivo
// próprio, sem UI de YouTube/Vimeo aparecendo) -- ver vsl-semana-do-despertar,
// store compartilhado entre todas as turmas da Semana do Despertar.
export function VslPlayer({ videoUrl, posterUrl, className = '' }: VslPlayerProps) {
  const [tocando, setTocando] = useState(false);

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl shadow-2xl border border-border/50 aspect-video bg-black ${className}`}>
      {tocando ? (
        <video
          src={videoUrl}
          poster={posterUrl}
          controls
          autoPlay
          playsInline
          className="h-full w-full"
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
