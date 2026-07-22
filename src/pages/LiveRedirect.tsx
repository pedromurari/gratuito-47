import { useEffect } from 'react';

interface LiveRedirectProps {
  videoId: string;
  aula: number;
}

const LiveRedirect = ({ videoId, aula }: LiveRedirectProps) => {
  useEffect(() => {
    // CAPI PageView server-side — dedup com o pixel via _pvId gerado no index.html
    const pvId = (window as any)._pvId as string | undefined;
    fetch('/api/meta-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'PageView',
        sourceUrl: window.location.href,
        eventId: pvId,
      }),
      keepalive: true,
    }).catch(() => {});

    const webUrl = `https://youtube.com/live/${videoId}?feature=share`;
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);

    if (isAndroid) {
      // Intent link abre o app do YouTube direto; sem o app, cai no fallback (navegador)
      const fallback = encodeURIComponent(webUrl);
      window.location.href =
        `intent://www.youtube.com/watch?v=${videoId}#Intent;package=com.google.android.youtube;scheme=https;S.browser_fallback_url=${fallback};end`;
      return;
    }

    if (isIOS) {
      // Custom scheme do app iOS não tem fallback nativo — usa timeout + visibilitychange
      let handled = false;
      const onVisibilityChange = () => {
        if (document.hidden) handled = true;
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      window.location.href = `youtube://www.youtube.com/watch?v=${videoId}`;

      setTimeout(() => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        if (!handled) window.location.href = webUrl;
      }, 1500);
      return;
    }

    // Desktop / outros — direto pro YouTube
    window.location.href = webUrl;
  }, [videoId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 text-center">
      <p className="text-muted-foreground text-lg">Abrindo a Aula {aula} no YouTube...</p>
    </div>
  );
};

export default LiveRedirect;
