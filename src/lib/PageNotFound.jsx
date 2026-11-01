import { Link, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-7xl font-light text-slate-300">404</h1>
          <div className="h-0.5 w-16 bg-slate-200 mx-auto" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-medium text-slate-800">Página no encontrada</h2>
          <p className="text-slate-600 leading-relaxed">
            La página <span className="font-medium text-slate-700">"{pageName}"</span> no existe en esta aplicación.
          </p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Link to="/"><Home className="w-4 h-4" /> Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
