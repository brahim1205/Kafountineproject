import { useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';

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

const formatDateInFrench = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

const numberToWords = (num: number): string => {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  
  if (num === 0) return 'zéro';
  if (num < 10) return units[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const unit = num % 10;
    if (ten === 7 || ten === 9) {
      return tens[ten - 1] + '-' + teens[unit];
    }
    return tens[ten] + (unit ? '-' + units[unit] : '');
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    const hundredText = hundred === 1 ? 'cent' : units[hundred] + ' cent';
    return hundredText + (rest ? ' ' + numberToWords(rest) : '');
  }
  if (num < 1000000) {
    const thousand = Math.floor(num / 1000);
    const rest = num % 1000;
    const thousandText = thousand === 1 ? 'mille' : numberToWords(thousand) + ' mille';
    return thousandText + (rest ? ' ' + numberToWords(rest) : '');
  }
  const million = Math.floor(num / 1000000);
  const rest = num % 1000000;
  const millionText = million === 1 ? 'un million' : numberToWords(million) + ' millions';
  return millionText + (rest ? ' ' + numberToWords(rest) : '');
};

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
  // Uniformiser les données : accepter soit les props individuelles, soit l'objet transaction
  const recuData = transaction ? {
    ticketNumber: transaction.numero,
    date: transaction.date,
    time: transaction.heure,
    contributor: transaction.contribuable,
    type: transaction.type,
    amount: transaction.montant,
    agent: transaction.agent,
    telephone: transaction.telephone || '',
    nin: transaction.nin || '',
    adresse: transaction.adresse || ''
  } : {
    ticketNumber: ticketNumber || numeroRecu || '',
    date: date || '',
    time: time || heure || '',
    contributor: contributor || contribuable || '',
    type: type || typeTaxe || '',
    amount: amount || montant || 0,
    agent: agent || '',
    telephone: telephone || '',
    nin: nin || '',
    adresse: adresse || ''
  };

  const formattedDate = formatDateInFrench(recuData.date);

  // Generate QR code data with all transaction information
  const qrData = useMemo(() => {
    return JSON.stringify({
      recu: recuData.ticketNumber,
      date: formattedDate,
      heure: recuData.time,
      contribuable: recuData.contributor,
      nin: recuData.nin,
      telephone: recuData.telephone,
      adresse: recuData.adresse,
      type: recuData.type,
      montant: recuData.amount,
      agent: recuData.agent,
      commune: 'Kafountine',
      verification: `https://kafountine.sn/verify?recu=${recuData.ticketNumber}`
    });
  }, [recuData, formattedDate]);

  // Generate QR code data URL for external use (used in handleDownload template)
  const qrCodeDataUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}&bgcolor=FFFFFF&color=0f766e`;
  }, [qrData]);

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

  const handleDownload = () => {
    // Créer une nouvelle fenêtre pour l'impression/sauvegarde
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Veuillez autoriser les fenêtres popups pour télécharger le PDF');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reçu - ${recuData.ticketNumber}</title>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            color: #1f2937;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 24px;
            margin-bottom: 24px;
          }
          .logo {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #10b981, #0d9488);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 12px;
            font-size: 32px;
          }
          h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .flag {
            width: 80px;
            height: 48px;
            margin: 0 auto 8px;
            border-radius: 4px;
            overflow: hidden;
          }
          .flag img, .flag svg {
            width: 100%;
            height: 100%;
          }
          .subtitle {
            font-size: 14px;
            color: #6b7280;
          }
          .title {
            text-align: center;
            margin-bottom: 24px;
          }
          .title h2 {
            font-size: 20px;
            color: #0f766e;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .ticket-number {
            display: inline-block;
            background: #f0fdfa;
            padding: 8px 16px;
            border-radius: 8px;
            border: 1px solid #ccfbf1;
          }
          .ticket-number span {
            font-weight: 600;
            color: #134e4a;
          }
          .info {
            margin-bottom: 24px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
          }
          .info-label {
            font-size: 12px;
            color: #6b7280;
          }
          .info-value {
            font-weight: 600;
          }
          .amount-box {
            background: #f0fdfa;
            padding: 16px;
            border-radius: 8px;
            border: 1px solid #ccfbf1;
            text-align: center;
            margin-bottom: 24px;
          }
          .amount-label {
            font-size: 12px;
            color: #6b7280;
          }
          .amount-value {
            font-size: 32px;
            font-weight: 700;
            color: #0f766e;
            margin: 4px 0;
          }
          .amount-words {
            font-size: 12px;
            font-style: italic;
            color: #374151;
          }
          .agent {
            margin-bottom: 24px;
          }
          .footer-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-top: 2px solid #e5e7eb;
            padding-top: 24px;
            margin-top: 24px;
          }
          .signature {
            width: 200px;
          }
          .signature-line {
            border-bottom: 1px solid #9ca3af;
            height: 48px;
            margin-bottom: 4px;
          }
          .signature-label {
            font-size: 12px;
            color: #6b7280;
          }
          .qr-section {
            text-align: center;
          }
          .qr-section img {
            width: 120px;
            height: 120px;
          }
          .qr-label {
            font-size: 12px;
            color: #6b7280;
            margin-top: 8px;
          }
          .disclaimer {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🏛️</div>
          <h1>COMMUNE DE KAFOUNTINE</h1>
          <div class="flag">
            <svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
              <rect width="900" height="600" fill="#007A3D"/>
              <rect width="300" height="600" x="300" fill="#FDEF42"/>
              <rect width="300" height="600" x="600" fill="#CE1126"/>
            </svg>
          </div>
          <p class="subtitle">République du Sénégal</p>
          <p class="subtitle" style="font-size: 12px;">Région de Ziguinchor - Département de Bignona</p>
        </div>

        <div class="title">
          <h2>REÇU DE PAIEMENT</h2>
          <div class="ticket-number">
            <span>N° ${recuData.ticketNumber}</span>
          </div>
        </div>

        <div class="info">
          <div class="info-row">
            <span class="info-label">Date</span>
            <span class="info-value">${formattedDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Heure</span>
            <span class="info-value">${recuData.time}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Reçu de</span>
            <span class="info-value">${recuData.contributor}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Pour</span>
            <span class="info-value">${recuData.type}</span>
          </div>
        </div>

        <div class="amount-box">
          <p class="amount-label">Montant</p>
          <p class="amount-value">${recuData.amount.toLocaleString()} FCFA</p>
          <p class="amount-words">Arrêté à la somme de : ${amountInWords} francs CFA</p>
        </div>

        <div class="agent">
          <div class="info-row">
            <span class="info-label">Agent collecteur</span>
            <span class="info-value">${recuData.agent}</span>
          </div>
        </div>

        <div class="footer-section">
          <div class="signature">
            <div class="signature-line"></div>
            <p class="signature-label">Signature de l'agent</p>
          </div>
          <div class="qr-section">
            <img src="${qrCodeDataUrl}" alt="QR Code" onerror="this.style.display='none'" />
            <p class="qr-label">Scannez pour vérifier</p>
          </div>
        </div>

        <div class="disclaimer">
          <p>Ce reçu est valable et authentique. Pour toute vérification, contactez la mairie de Kafountine.</p>
          <p style="margin-top: 4px;">Tél: +221 33 XXX XX XX | Email: mairie@kafountine.sn</p>
        </div>

        <script>
          // Auto-trigger print dialog after a short delay
          setTimeout(() => {
            window.print();
          }, 500);
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
