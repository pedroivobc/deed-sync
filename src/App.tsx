import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/RoleGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommandPalette } from "@/components/CommandPalette";
import { PageLoader } from "@/components/PageLoader";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound.tsx";

// Lazy-load heavier routes — Dashboard remains eager (default landing).
const CRM = lazy(() => import("./pages/CRM"));
const Servicos = lazy(() => import("./pages/Servicos"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Sobre = lazy(() => import("./pages/Sobre"));
const Notificacoes = lazy(() => import("./pages/Notificacoes"));

// Cálculo na Mão (lazy)
const CalcIndex = lazy(() => import("./pages/calculo-na-mao/index"));
const CalcDashboard = lazy(() => import("./pages/calculo-na-mao/Dashboard"));
const CalcValorVenal = lazy(() => import("./pages/calculo-na-mao/ValorVenal"));
const CalcEscrituras = lazy(() => import("./pages/calculo-na-mao/Escrituras"));
const CalcFinCaixa = lazy(() => import("./pages/calculo-na-mao/FinanciamentoCaixa"));
const CalcFinPriv = lazy(() => import("./pages/calculo-na-mao/FinanciamentoPrivado"));
const CalcCorrecao = lazy(() => import("./pages/calculo-na-mao/CorrecaoContratual"));
const CalcDoacao = lazy(() => import("./pages/calculo-na-mao/Doacao"));
const CalcRegular = lazy(() => import("./pages/calculo-na-mao/Regularizacao"));
const CalcAnalytics = lazy(() => import("./pages/calculo-na-mao/Analytics"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min — stale-while-revalidate
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CommandPalette />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
                <Route path="/servicos" element={<ProtectedRoute><Servicos /></ProtectedRoute>} />
                <Route
                  path="/financeiro"
                  element={
                    <ProtectedRoute>
                      <RoleGuard permissions={["access_financial"]} redirect>
                        <Financeiro />
                      </RoleGuard>
                    </ProtectedRoute>
                  }
                />
                <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
                <Route path="/sobre" element={<ProtectedRoute><Sobre /></ProtectedRoute>} />
                <Route path="/notificacoes" element={<ProtectedRoute><Notificacoes /></ProtectedRoute>} />
                <Route path="/calculo-na-mao" element={<ProtectedRoute><CalcIndex /></ProtectedRoute>} />
                <Route path="/calculo-na-mao/dashboard" element={<ProtectedRoute><CalcDashboard /></ProtectedRoute>} />
                <Route path="/calculo-na-mao/valor-venal" element={<ProtectedRoute><CalcValorVenal /></ProtectedRoute>} />
                <Route path="/calculo-na-mao/escrituras" element={<ProtectedRoute><CalcEscrituras /></ProtectedRoute>} />
                <Route path="/calculo-na-mao/financiamento-caixa" element={<ProtectedRoute><CalcFinCaixa /></ProtectedRoute>} />
                <Route path="/calculo-na-mao/financiamento-privado" element={<ProtectedRoute><CalcFinPriv /></ProtectedRoute>} />
                <Route path="/calculo-na-mao/correcao-contratual" element={<ProtectedRoute><CalcCorrecao /></ProtectedRoute>} />
                <Route path="/calculo-na-mao/doacao" element={<ProtectedRoute><CalcDoacao /></ProtectedRoute>} />
                <Route path="/calculo-na-mao/regularizacao" element={<ProtectedRoute><CalcRegular /></ProtectedRoute>} />
                <Route path="/calculo-na-mao/analytics" element={<ProtectedRoute><CalcAnalytics /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
