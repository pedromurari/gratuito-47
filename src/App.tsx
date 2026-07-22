import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Obrigado from "./pages/Obrigado";
import NotFound from "./pages/NotFound";
import LiveRedirect from "./pages/LiveRedirect";
import WhatsAppRedirect from "./pages/WhatsAppRedirect";

const AULAS_YT_IDS = ['PENDENTE_AULA_1', 'PENDENTE_AULA_2', 'PENDENTE_AULA_3'];

const MATRICULA_WHATSAPP_PHONE = '5511919434040';
const MATRICULA_WHATSAPP_MSG = 'Olá! Vim pela Semana do Despertar e quero garantir minha matrícula na Formação iDM com os bônus da oferta especial 🎓';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/obrigado" element={<Obrigado />} />
          <Route path="/live01" element={<LiveRedirect videoId={AULAS_YT_IDS[0]} aula={1} />} />
          <Route path="/live02" element={<LiveRedirect videoId={AULAS_YT_IDS[1]} aula={2} />} />
          <Route path="/live03" element={<LiveRedirect videoId={AULAS_YT_IDS[2]} aula={3} />} />
          <Route
            path="/matriculaaberta"
            element={<WhatsAppRedirect phone={MATRICULA_WHATSAPP_PHONE} message={MATRICULA_WHATSAPP_MSG} />}
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
