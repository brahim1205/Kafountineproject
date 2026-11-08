import { useState } from 'react';
import { loginRequest, requestPasswordReset, saveSession } from '../../services/auth';
import {
  clearFieldValidationError,
  getErrorMessage,
  validateFormElement,
} from '../../utils/formValidation';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');

  const authenticate = async (email: string, password: string) => {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const session = await loginRequest({ email, password });
      saveSession(session);
      // Force redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Connexion impossible');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
      return;
    }
    await authenticate(formData.email, formData.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-28 h-28 rounded-full flex items-center justify-center shadow-lg bg-white overflow-hidden border-2 border-gray-100">
              <img src="/logo.jpeg" alt="Logo Commune de Kafountine" className="w-full h-full object-contain p-2" />
            </div>
          </div>

          {/* Titre */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Commune de Kafountine</h1>
            <p className="text-sm text-gray-600">Plateforme de Gestion Municipale</p>
          </div>

          {/* Formulaire */}
          {showForgotPassword ? (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <i className="ri-lock-password-line text-4xl text-emerald-600"></i>
                <h3 className="text-lg font-semibold mt-2">Mot de passe oublié ?</h3>
                <p className="text-sm text-gray-600 mt-1">Entrez votre email pour réinitialiser votre mot de passe</p>
              </div>
              <div>
                <input
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => {
                    e.currentTarget.setCustomValidity('');
                    setForgotPasswordEmail(e.target.value);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="exemple@kafountine.gouv.sn"
                  data-required="true"
                />
              </div>
              {forgotPasswordMessage && (
                <div className={`rounded-lg px-3 py-2 text-sm ${forgotPasswordMessage.includes('erreur') ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-green-200 bg-green-50 text-green-700'}`}>
                  {forgotPasswordMessage}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(false); setForgotPasswordMessage(''); setForgotPasswordEmail(''); }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setForgotPasswordMessage('');
                      const emailField = document.querySelector<HTMLInputElement>('input[type="email"]');
                      if (emailField) {
                        emailField.setCustomValidity('');
                        const emailValue = forgotPasswordEmail.trim();
                        if (!emailValue) {
                          emailField.setCustomValidity("Veuillez renseigner l'adresse email de réinitialisation.");
                          emailField.reportValidity();
                          emailField.focus();
                          return;
                        }
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(emailValue)) {
                          emailField.setCustomValidity('Veuillez saisir une adresse email valide.');
                          emailField.reportValidity();
                          emailField.focus();
                          return;
                        }
                      }
                      const message = await requestPasswordReset(forgotPasswordEmail);
                      setForgotPasswordMessage(message);
                    } catch (error) {
                      setForgotPasswordMessage(
                        getErrorMessage(
                          error,
                          "La demande de réinitialisation n'a pas pu être envoyée.",
                        ),
                      );
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-600 text-white py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-700 transition-all cursor-pointer"
                >
                  Envoyer
                </button>
              </div>
            </div>
          ) : (
          <form
            onSubmit={handleSubmit}
            onInput={clearFieldValidationError}
            noValidate
            className="space-y-5"
          >
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="exemple@kafountine.gouv.sn"
                data-required="true"
              />
            </div>

            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="••••••••"
                data-required="true"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <i className={showPassword ? 'ri-eye-off-line text-xl' : 'ri-eye-line text-xl'}></i>
              </button>
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <span className="ml-2 text-sm text-gray-600">Se souvenir de moi</span>
              </label>
              <a href="#" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium whitespace-nowrap" onClick={(e) => { e.preventDefault(); setShowForgotPassword(true); }}>
                Mot de passe oublié ?
              </a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-600 text-white py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-600/30 whitespace-nowrap cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          © 2025 Commune de Kafountine - Tous droits réservés
        </p>
      </div>
    </div>
  );
}
