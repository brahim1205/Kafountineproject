import { ChangeDetectionStrategy, Component, computed } from '@angular/core';

@Component({
  selector: 'app-recent-transactions',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './recent-transactions.html',
})
export class RecentTransactions {

  protected readonly transactions = computed(() => [
    {
    id: 'TKT-2025-00156',
    type: 'Ticket journalier',
    contributor: 'Mamadou Diarra',
    agent: 'Kouassi Jean',
    amount: 5000,
    time: '14:32',
    status: 'completed'
    },
    {
    id: 'TKT-2025-00155',
    type: 'Occupation domaine public',
    contributor: 'Aïcha Touré',
    agent: 'Diallo Fatou',
    amount: 15000,
    time: '14:18',
    status: 'completed'
    },
    {
    id: 'TKT-2025-00154',
    type: 'Taxe municipale',
    contributor: 'Yao Kouadio',
    agent: 'Traoré Moussa',
    amount: 25000,
    time: '13:55',
    status: 'completed'
    },
    {
    id: 'TKT-2025-00153',
    type: 'Ticket journalier',
    contributor: 'Fofana Ibrahim',
    agent: 'Koné Aminata',
    amount: 5000,
    time: '13:42',
    status: 'completed'
    },
    {
    id: 'TKT-2025-00152',
    type: 'Occupation domaine public',
    contributor: 'Sanogo Marie',
    agent: 'Bamba Sekou',
    amount: 12000,
    time: '13:28',
    status: 'completed'
    }
    ]);
}
