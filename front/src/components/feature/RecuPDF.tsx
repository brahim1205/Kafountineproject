import { useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { buildReceiptQrData, formatDateInFrench, normalizeRecuData, numberToWords } from './recuPdf.utils';

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
  reference?: string;
  categorie?: string;
  service?: string;
  quantite?: number | string;
  unite?: string;
  tarifUnitaire?: number | string;
  modePaiement?: string;
  statut?: string;
  localisation?: string;
  nature?: string;
  description?: string;
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
    reference?: string;
    categorie?: string;
    service?: string;
    quantite?: number;
    unite?: string;
    tarifUnitaire?: number;
    modePaiement?: string;
    statut?: string;
    localisation?: string;
    nature?: string;
    description?: string;
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
  reference,
  categorie,
  service,
  quantite,
  unite,
  tarifUnitaire,
  modePaiement,
  statut,
  localisation,
  nature,
  description,
  transaction,
  onClose 
}: RecuPDFProps) {
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
    reference,
    categorie,
    service,
    quantite,
    unite,
    tarifUnitaire,
    modePaiement,
    statut,
    localisation,
    nature,
    description,
    transaction,
  });

  const formattedDate = formatDateInFrench(recuData.date);

  const qrData = useMemo(() => {
    return buildReceiptQrData(recuData);
  }, [recuData]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const amountInWords = numberToWords(recuData.amount);
  const detailRows = [
    ['Reference', recuData.reference],
    ['Categorie', recuData.categorie],
    ['Service', recuData.service],
    ['Quantite', recuData.quantite && recuData.unite ? `${recuData.quantite} ${recuData.unite}` : recuData.quantite],
    ['Tarif unitaire', recuData.tarifUnitaire ? `${Number(recuData.tarifUnitaire).toLocaleString()} FCFA` : ''],
    ['Mode de paiement', recuData.modePaiement],
    ['Statut', recuData.statut],
    ['Telephone', recuData.telephone],
    ['NIN / CNI', recuData.nin],
    ['Adresse', recuData.adresse],
    ['Localisation', recuData.localisation],
    ['Nature', recuData.nature],
    ['Description', recuData.description],
  ].filter(([, value]) => Boolean(value));

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
            <div id="recu-content" className="bg-white border-[3px] border-double border-gray-400 rounded-xl p-6 shadow-inner relative overflow-hidden">
              {/* Filigrane discret */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none rotate-[-35deg]">
                <p className="text-8xl font-black text-gray-900">COMMUNE DE KAFOUNTINE</p>
              </div>

              {/* En-tête officiel avec design premium */}
              <div className="relative text-center border-b-2 border-teal-600/20 pb-4 mb-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-left">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-0.5">République du Sénégal</p>
                    <p className="text-[7px] text-gray-500 uppercase tracking-widest">Un Peuple - Un But - Une Foi</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-0.5">Région de Ziguinchor</p>
                    <p className="text-[7px] text-gray-500 uppercase tracking-widest">Département de Bignona</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-teal-50 border-gray-100 shadow-md">
                      <img src="/logo.jpeg" alt="Logo Commune de Kafountine" className="w-full h-full object-contain p-1.5" />
                    </div>
                  </div>
                  
                  <div>
                    <h1 className="text-xl font-black text-teal-800 tracking-tight">
                      COMMUNE DE KAFOUNTINE
                    </h1>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <div className="h-[2px] w-8 bg-teal-500"></div>
                      <span className="text-[9px] font-bold text-teal-600 uppercase tracking-[0.3em]">Hôtel de Ville</span>
                      <div className="h-[2px] w-8 bg-teal-500"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Badge du reçu */}
              <div className="flex justify-between items-end mb-4">
                <div className="text-left">
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Reçu de Paiement</h2>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-gray-900 tracking-tighter">N° {recuData.ticketNumber}</span>
                  </div>
                </div>
                <div className="text-right bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Date d'émission</p>
                  <p className="text-sm font-black text-gray-800">{formattedDate}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{recuData.time}</p>
                </div>
              </div>

              {/* Corps du reçu */}
              <div className="space-y-4 mb-6 relative">
                <div className="grid grid-cols-1 gap-6">
                  <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform duration-700"></div>
                    
                    <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div>
                        <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1" style={{ fontFamily: 'sans-serif' }}>Contribuable</p>
                        <p className="text-xl font-bold text-gray-900 leading-normal" style={{ fontFamily: 'sans-serif' }}>{recuData.contributor}</p>
                      </div>
                      
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1" style={{ fontFamily: 'sans-serif' }}>Objet du paiement</p>
                        <p className="text-sm font-semibold text-gray-800 leading-normal" style={{ fontFamily: 'sans-serif' }}>{recuData.type}</p>
                        {recuData.reference && (
                          <p className="text-[10px] text-gray-500 mt-1 font-medium italic" style={{ fontFamily: 'sans-serif' }}>Réf: {recuData.reference}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {detailRows.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {detailRows.slice(0, 6).map(([label, value]) => (
                        <div key={label} className="p-4 bg-white rounded-xl border border-gray-100 flex flex-col justify-center min-h-[70px]">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'sans-serif' }}>{label}</p>
                          <p className="text-xs font-bold text-gray-800 leading-relaxed" style={{ fontFamily: 'sans-serif' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Zone Montant Premium */}
                  <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24 blur-2xl"></div>
                    
                    <div className="relative flex flex-col items-center">
                      <p className="text-[9px] font-bold text-teal-100 uppercase tracking-[0.4em] mb-1.5">Montant Total Versé</p>
                      <div className="flex items-center gap-3">
                        <span className="text-4xl font-black text-white tracking-tighter" style={{ color: 'white !important' }}>
                          {recuData.amount.toLocaleString()}
                        </span>
                        <span className="text-xl font-bold text-teal-100">FCFA</span>
                      </div>
                      <div className="mt-3 w-full h-[1px] bg-white/20"></div>
                      <p className="mt-3 text-[10px] text-teal-50 font-medium italic text-center leading-relaxed">
                        " Arrêté à la somme de : {amountInWords} francs CFA "
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Zone Signatures & Validation */}
              <div className="grid grid-cols-2 gap-12 pt-8 border-t-2 border-gray-100">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">Cachet et Signature de l'Agent</p>
                  <div className="relative h-24 flex items-center justify-center">
                    <p className="text-xs font-bold text-gray-900 z-10">{recuData.agent}</p>
                    {/* Placeholder pour un cachet numérique simulé */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-20 rotate-[-15deg]">
                      <div className="w-20 h-20 border-4 border-double border-teal-600 rounded-full flex items-center justify-center text-[8px] font-black text-teal-600 text-center uppercase p-1">
                        Commune de Kafountine
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-px bg-gray-200"></div>
                </div>

                <div className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 mb-3">
                    <QRCodeSVG
                      value={qrData}
                      size={80}
                      level="H"
                      includeMargin={false}
                      fgColor="#0f766e"
                    />
                  </div>
                  <p className="text-[9px] font-black text-teal-700 uppercase tracking-widest">Validation Numérique</p>
                  <p className="text-[8px] text-gray-500 mt-1">Scannez pour vérifier l'authenticité</p>
                </div>
              </div>

              {/* Pied de page élégant */}
              <div className="mt-12 pt-6 border-t border-gray-100">
                <div className="flex justify-between items-center text-[9px] text-gray-400 font-medium">
                  <p>© {new Date().getFullYear()} Mairie de Kafountine - Système de Gestion Municipale</p>
                  <div className="flex gap-4">
                    <p>www.kafountine.sn</p>
                    <p>Tél: +221 33 994 00 00</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-col items-end gap-3 mt-6 no-print">
              {(recuData.statut?.toLowerCase() === 'en attente' || recuData.statut?.toLowerCase() === 'en_attente') && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-100 mb-2">
                  <i className="ri-information-line"></i>
                  <p className="text-xs font-semibold uppercase tracking-wider">Paiement non validé : Reçu indisponible</p>
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
                >
                  Fermer
                </button>
                <button
                  onClick={handlePrint}
                  disabled={recuData.statut?.toLowerCase() === 'en attente' || recuData.statut?.toLowerCase() === 'en_attente'}
                  className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                    (recuData.statut?.toLowerCase() === 'en attente' || recuData.statut?.toLowerCase() === 'en_attente')
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                      : 'bg-teal-600 text-white hover:bg-teal-700 shadow-md hover:shadow-lg'
                  }`}
                >
                  <i className="ri-printer-line"></i>
                  Imprimer le reçu
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Version imprimable */}
      <style>{`
        @media print {
          /* Masquer tout le reste du site */
          body > *:not(.no-print-wrapper) {
            display: none !important;
          }
          
          /* Styles de base pour la page */
          @page {
            margin: 0;
            size: A4 portrait;
          }

          body {
            background: white !important;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Le conteneur du reçu */
          #recu-content {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 40px !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }

          /* Masquer les boutons et le fond gris */
          .no-print, .bg-gray-900\\/50, button {
            display: none !important;
          }

          /* S'assurer que le texte est bien noir et visible */
          #recu-content * {
            color: black !important;
            text-shadow: none !important;
          }
          
          /* Garder les couleurs des badges et du montant */
          #recu-content .bg-teal-600, 
          #recu-content .bg-teal-50,
          #recu-content .bg-gradient-to-r {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          #recu-content .text-white {
            color: white !important;
          }
        }
      `}</style>
    </>
  );
}
