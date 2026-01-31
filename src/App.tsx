import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Index = lazy(() => import("./pages/Index"));
const StokBarang = lazy(() => import("./pages/StokBarang"));
const POSTransaksi = lazy(() => import("./pages/POSTransaksi"));
const RiwayatTransaksi = lazy(() => import("./pages/RiwayatTransaksi"));
const PengeluaranLain = lazy(() => import("./pages/PengeluaranLain"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/stok" element={
                <ProtectedRoute>
                  <StokBarang />
                </ProtectedRoute>
              } />
              <Route path="/pos" element={
                <ProtectedRoute>
                  <POSTransaksi />
                </ProtectedRoute>
              } />
              <Route path="/riwayat" element={
                <ProtectedRoute>
                  <RiwayatTransaksi />
                </ProtectedRoute>
              } />
              <Route path="/pengeluaran" element={
                <ProtectedRoute>
                  <PengeluaranLain />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
