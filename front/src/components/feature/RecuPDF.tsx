import { useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { exportReceiptPdf, openPdfBlob, printPdfBlob } from '../../services/pdf';
import { useToast } from './Toast';
import { buildReceiptPayload, buildReceiptQrData, formatDateInFrench, normalizeRecuData, numberToWords } from './recuPdf.utils';

interface RecuPDFProps {
  ticketNumber?: string;
  date?: string;
  time?: string;
  contributor?: string;
  type?: string;
  amount?: number;
  numeroRecu?: string;
  heure?: string;
  contribuable?: string;
  typeTaxe?: string;
  montant?: number;
  agent?: string;
  telephone?: string;
  nin?: string;
  adresse?: string;
  transaction?: {
    numero: string;
    date: string;
    heure: string;
    contribuable: string;
    type: string;
    montant: number;
    agent: string;
    telephone?: string;
    nin?: string;
    adresse?: string;
  };
  onClose: () => void;
}

export default function RecuPDF({ 
  ticketNumber, 
  date, 
  time, 
  contributor, 
  type, 
  amount, 
  numeroRecu,
  heure,
  contribuable,
  typeTaxe,
  montant,
  agent, 
  telephone,
  nin,
  adresse,
  transaction,
  onClose 
}: RecuPDFProps) {
  const { showToast } = useToast();
  const recuData = normalizeRecuData({
    ticketNumber,
    date,
    time,
    contributor,
    type,
    amount,
    numeroRecu,
    heure,
    contribuable,
    typeTaxe,
    montant,
    agent,
    telephone,
    nin,
    adresse,
    transaction,
  });

  const formattedDate = formatDateInFrench(recuData.date);

  const qrData = useMemo(() => {
    return buildReceiptQrData(recuData, formattedDate);
  }, [recuData, formattedDate]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handlePrint = async () => {
    try {
      const blob = await exportReceiptPdf(buildReceiptPayload(recuData));
      printPdfBlob(blob);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Impossible de générer le reçu.', 'error');
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await exportReceiptPdf(buildReceiptPayload(recuData));
      openPdfBlob(blob, `recu-${recuData.ticketNumber}.pdf`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Impossible de générer le reçu.', 'error');
    }
  };

  const amountInWords = numberToWords(recuData.amount);

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4 no-print">
        <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Prévisualisation du reçu</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div id="recu-content" className="bg-white border-2 border-gray-300 rounded-lg p-8">
              {/* En-tête officiel */}
              <div className="text-center border-b-2 border-gray-300 pb-6 mb-6">
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <i className="ri-government-line text-white text-3xl"></i>
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">COMMUNE DE KAFOUNTINE</h1>
                {/* Drapeau du Sénégal */}
                <div className="flex justify-center mb-2">
                  <svg viewBox="0 0 900 600" className="w-20 h-12 rounded shadow-sm" xmlns="http://www.w3.org/2000/svg">
                    <rect width="900" height="600" fill="#007A3D"/>
                    <rect width="300" height="600" x="300" fill="#FDEF42"/>
                    <rect width="300" height="600" x="600" fill="#CE1126"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-600 mb-1">République du Sénégal</p>
                <p className="text-xs text-gray-500">Région de Ziguinchor - Département de Bignona</p>
              </div>

              {/* Titre du reçu */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-teal-700 mb-2">REÇU DE PAIEMENT</h2>
                <div className="inline-block bg-teal-50 px-4 py-2 rounded-lg">
                  <p className="text-sm font-semibold text-teal-900">N° {recuData.ticketNumber}</p>
                </div>
              </div>

              {/* Informations du paiement */}
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Date</p>
                    <p className="text-sm font-semibold text-gray-900">{formattedDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Heure</p>
                    <p className="text-sm font-semibold text-gray-900">{recuData.time}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Reçu de</p>
                  <p className="text-base font-semibold text-gray-900">{recuData.contributor}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Pour</p>
                  <p className="text-sm font-medium text-gray-900">{recuData.type}</p>
                </div>

                <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                  <p className="text-xs text-gray-600 mb-1">Montant</p>
                  <p className="text-3xl font-bold text-teal-700 mb-2">{recuData.amount.toLocaleString()} FCFA</p>
                  <p className="text-xs text-gray-700 italic">
                    Arrêté à la somme de : {amountInWords} francs CFA
                  </p>
                </div>
              </div>

              {/* Agent collecteur */}
              <div className="mb-6">
                <p className="text-xs text-gray-500 mb-1">Agent collecteur</p>
                <p className="text-sm font-semibold text-gray-900">{recuData.agent}</p>
              </div>

              {/* QR Code placeholder */}
              <div className="flex items-center justify-between border-t-2 border-gray-300 pt-6">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-2">Signature de l'agent</p>
                  <div className="h-16 border-b border-gray-400 w-48"></div>
                </div>
                <div className="text-center">
                  <div className="bg-white p-1 rounded-lg">
                    <QRCodeSVG
                      value={qrData}
                      size={96}
                      level="M"
                      includeMargin={false}
                      fgColor="#0f766e"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Scannez pour vérifier</p>
                </div>
              </div>

              {/* Pied de page */}
              <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-500">
                  Ce reçu est valable et authentique. Pour toute vérification, contactez la mairie de Kafountine.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Tél: +221 33 XXX XX XX | Email: mairie@kafountine.sn
                </p>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-3 mt-6 no-print">
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
              >
                Fermer
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <i className="ri-download-line"></i>
                Télécharger PDF
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <i className="ri-printer-line"></i>
                Imprimer le reçu
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Version imprimable */}
      <style>{`
        @media print {
          body * {
            display: none !important;
          }
          #recu-content, #recu-content * {
            display: block !important;
          }
          #recu-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px !important;
            border: 2px solid #333 !important;
            border-radius: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          /* Ensure all elements are visible in print */
          #recu-content > div {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
