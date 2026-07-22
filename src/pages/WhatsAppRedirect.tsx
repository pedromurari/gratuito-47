import { useEffect } from 'react';

interface WhatsAppRedirectProps {
  phone: string; // apenas dígitos, com DDI. Ex: 5511919434040
  message?: string;
}

const WhatsAppRedirect = ({ phone, message }: WhatsAppRedirectProps) => {
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

    // wa.me é um universal link mantido pela Meta: abre o app se instalado
    // (iOS/Android), cai pro WhatsApp Web/download se não tiver
    const waUrl = `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
    window.location.href = waUrl;
  }, [phone, message]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 text-center">
      <p className="text-muted-foreground text-lg">Abrindo o WhatsApp...</p>
    </div>
  );
};

export default WhatsAppRedirect;
