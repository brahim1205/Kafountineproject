import { imprimerDocument } from '../../utils/impression';
import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from '@angular/core';

interface ModuleStat {
  name: string;
  amount: number;
  icon: string;
  couleur: string;
  stats: {
    evolution?: number;
  };
}

interface JournalEntry {
  date: string | Date;
  type: string;
  person?: string;
  acteur?: string;
  amount: number;
  description: string;
  formattedDate?: string;
}

interface ContribuableTop {
  name: string;
  amount: number;
}

@Component({
  selector: 'app-rapport-pdf',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './rapport-pdf.html',
  styleUrl: './rapport-pdf.css',
  encapsulation: ViewEncapsulation.None,
})
export class RapportPDF {
  protected readonly Number = Number;
  protected readonly Math = Math;
  protected readonly String = String;
  protected imprimer(): void {
    imprimerDocument(document.getElementById('rapport-content'));
  }

  readonly year = input.required<number>();

  readonly total = input.required<number>();

  readonly totalExpenses = input.required<number>();

  readonly tauxRecouvrement = input.required<number>();

  readonly totalTransactions = input.required<number>();

  readonly totalContribuables = input.required<number>();

  readonly moduleStats = input.required<ModuleStat[]>();

  readonly topContribuables = input.required<ContribuableTop[]>();

  readonly journal = input.required<JournalEntry[]>();

  readonly closed = output<void>();

  protected journalSummary() {
    return this.journal().filter(item => item.amount < 0).slice(0, 4);
  }

  protected formatDate() {
    return Object.entries(this.journal().reduce((acc: Record<string, JournalEntry[]>, item: JournalEntry) => {
    const dateObj = new Date(item.date);
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0') + '/' + dateObj.getFullYear();
    if (!acc[month])
    acc[month] = [];
    acc[month].push({
    ...item,
    formattedDate: dateObj.toLocaleDateString('fr-FR')
    });
    return acc;
    }, {}));
  }
}
