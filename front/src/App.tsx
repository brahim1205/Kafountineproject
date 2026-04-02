import { Suspense } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { ToastProvider } from "./components/feature/Toast";
import ErrorBoundary from "./components/feature/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <ToastProvider>
          <BrowserRouter basename={__BASE_PATH__}>
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center text-gray-600">
                  Chargement...
                </div>
              }
            >
              <AppRoutes />
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </I18nextProvider>
    </ErrorBoundary>
  );
}

export default App;
