import { useLocation, Link } from "react-router-dom";

export default function NotFound() {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Fond décoratif */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-teal-50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="relative max-w-2xl w-full text-center">
        {/* Chiffre 404 stylisé */}
        <div className="relative mb-8">
          <h1 className="text-[10rem] md:text-[15rem] font-black text-gray-100 leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-4 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl">
              <i className="ri-map-pin-user-line text-6xl text-teal-600 animate-bounce"></i>
            </div>
          </div>
        </div>

        {/* Message d'erreur */}
        <div className="space-y-6">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
            Oups ! Vous semblez perdu...
          </h2>
          <p className="text-gray-500 text-lg max-w-md mx-auto leading-relaxed">
            La page que vous recherchez à l'adresse <span className="font-mono text-teal-600 bg-teal-50 px-2 py-0.5 rounded text-sm">{location.pathname}</span> n'existe pas ou a été déplacée.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link 
              to="/"
              className="px-8 py-3 bg-teal-600 text-white font-bold rounded-2xl hover:bg-teal-700 hover:scale-105 transition-all shadow-lg shadow-teal-600/20 flex items-center gap-2 group"
            >
              <i className="ri-home-4-line text-lg group-hover:-translate-y-0.5 transition-transform"></i>
              Retour à l'accueil
            </Link>
            <button 
              onClick={() => window.history.back()}
              className="px-8 py-3 bg-white text-gray-700 font-bold rounded-2xl border border-gray-200 hover:bg-gray-50 hover:scale-105 transition-all shadow-sm flex items-center gap-2"
            >
              <i className="ri-arrow-left-line text-lg"></i>
              Page précédente
            </button>
          </div>
        </div>

        {/* Footer officiel */}
        <div className="mt-16 pt-8 border-t border-gray-200/50 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 opacity-40 grayscale grayscale-100">
            <img src="/logo.jpeg" alt="Logo" className="w-6 h-6 object-contain" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">Commune de Kafountine</span>
          </div>
          <p className="text-[10px] text-gray-400 font-medium italic">Plateforme de Gestion Municipale Intégrée</p>
        </div>
      </div>
    </div>
  );
}