import { ChangeDetectionStrategy, Component, input, output, computed, effect, untracked, ViewEncapsulation } from '@angular/core';
import { QRCodeSVG } from './qr-code-svg';
import { buildReceiptQrData, formatDateInFrench, normalizeRecuData, numberToWords } from './recu-pdf.utils';

@Component({
  selector: 'app-recu-pdf',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QRCodeSVG],
  templateUrl: './recu-pdf.html',
  styleUrl: './recu-pdf.css',
  encapsulation: ViewEncapsulation.None,
})
export class RecuPDF {

  readonly ticketNumber = input<string | undefined>(undefined);

  readonly date = input<string | undefined>(undefined);

  readonly time = input<string | undefined>(undefined);

  readonly contributor = input<string | undefined>(undefined);

  readonly type = input<string | undefined>(undefined);

  readonly amount = input<number | undefined>(undefined);

  readonly numeroRecu = input<string | undefined>(undefined);

  readonly heure = input<string | undefined>(undefined);

  readonly contribuable = input<string | undefined>(undefined);

  readonly typeTaxe = input<string | undefined>(undefined);

  readonly montant = input<number | undefined>(undefined);

  readonly agent = input<string | undefined>(undefined);

  readonly telephone = input<string | undefined>(undefined);

  readonly nin = input<string | undefined>(undefined);

  readonly adresse = input<string | undefined>(undefined);

  readonly reference = input<string | undefined>(undefined);

  readonly categorie = input<string | undefined>(undefined);

  readonly service = input<string | undefined>(undefined);

  readonly quantite = input<number | string | undefined>(undefined);

  readonly unite = input<string | undefined>(undefined);

  readonly tarifUnitaire = input<number | string | undefined>(undefined);

  readonly modePaiement = input<string | undefined>(undefined);

  readonly statut = input<string | undefined>(undefined);

  readonly localisation = input<string | undefined>(undefined);

  readonly nature = input<string | undefined>(undefined);

  readonly description = input<string | undefined>(undefined);

  readonly transaction = input<{
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
  } | undefined>(undefined);

  readonly closed = output<void>();

  protected readonly recuData = computed(() => normalizeRecuData({
    ticketNumber: this.ticketNumber(),
    date: this.date(),
    time: this.time(),
    contributor: this.contributor(),
    type: this.type(),
    amount: this.amount(),
    numeroRecu: this.numeroRecu(),
    heure: this.heure(),
    contribuable: this.contribuable(),
    typeTaxe: this.typeTaxe(),
    montant: this.montant(),
    agent: this.agent(),
    telephone: this.telephone(),
    nin: this.nin(),
    adresse: this.adresse(),
    reference: this.reference(),
    categorie: this.categorie(),
    service: this.service(),
    quantite: this.quantite(),
    unite: this.unite(),
    tarifUnitaire: this.tarifUnitaire(),
    modePaiement: this.modePaiement(),
    statut: this.statut(),
    localisation: this.localisation(),
    nature: this.nature(),
    description: this.description(),
    transaction: this.transaction(),
    }));

  protected readonly formattedDate = computed(() => formatDateInFrench(this.recuData().date));

  protected readonly qrData = computed(() => {
    return buildReceiptQrData(this.recuData());
    });

  /** Adresse affichée sous le QR code, pour vérifier le reçu sans téléphone. */
  protected readonly verificationHote = `${globalThis.location?.host ?? ''}/verification`;

  protected handlePrint() {
    window.print();
    }

  protected readonly amountInWords = computed(() => numberToWords(this.recuData().amount));

  protected readonly detailRows = computed(() => [
    ['Reference', this.recuData().reference],
    ['Categorie', this.recuData().categorie],
    ['Service', this.recuData().service],
    ['Quantite', this.recuData().quantite && this.recuData().unite ? `${this.recuData().quantite} ${this.recuData().unite}` : this.recuData().quantite],
    ['Tarif unitaire', this.recuData().tarifUnitaire ? `${Number(this.recuData().tarifUnitaire).toLocaleString()} FCFA` : ''],
    ['Mode de paiement', this.recuData().modePaiement],
    ['Statut', this.recuData().statut],
    ['Telephone', this.recuData().telephone],
    ['NIN / CNI', this.recuData().nin],
    ['Adresse', this.recuData().adresse],
    ['Localisation', this.recuData().localisation],
    ['Nature', this.recuData().nature],
    ['Description', this.recuData().description],
    ].filter(([, value]) => Boolean(value)));

  protected getFullYearSummary() {
    return new Date().getFullYear();
  }

  constructor() {
    effect((onCleanup) => {
      void onCleanup;
      
      const cleanup = untracked(() => (() => {
    const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape')
    this.closed.emit();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
    })());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
  }
}
