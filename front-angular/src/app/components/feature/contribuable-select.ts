import { ChangeDetectionStrategy, Component, inject, input, signal, linkedSignal, computed, effect, untracked } from '@angular/core';
import { Contribuable } from '../../services/contribuables';
import { ContribuablesApi } from '../../services/contribuables';

const SEARCH_INPUT_NAME = 'contribuableRecherche';

const MIN_QUERY_LENGTH = 2;

export const contribuableLabel = (c: Pick<Contribuable, 'prenom' | 'nom' | 'nin'>) =>
  `${`${c.prenom || ''} ${c.nom || ''}`.trim()} (${c.nin})`;

export function requireSelectedContribuable(form: HTMLFormElement, name: string): string | null {
  const id = String(new FormData(form).get(name) || '');
  if (id) return id;
  const input = form.elements.namedItem(SEARCH_INPUT_NAME);
  if (input instanceof HTMLInputElement) {
    input.setCustomValidity('Sélectionnez un contribuable dans la liste.');
    input.reportValidity();
    input.focus();
  }
  return null;
}

@Component({
  selector: 'app-contribuable-select',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './contribuable-select.html',
})
export class ContribuableSelect {
  protected readonly SEARCH_INPUT_NAME = SEARCH_INPUT_NAME;
  protected readonly contribuableLabel = contribuableLabel;
  protected readonly contribuablesApi = inject(ContribuablesApi);
  readonly name = input.required<string>();

  readonly initial = input<{ id: string; label: string } | undefined>(undefined);

  readonly inputClassName = input.required<string>();

  protected readonly listId = computed(() => `f-${crypto.randomUUID()}`);

  protected readonly query = linkedSignal(() => (this.initial()?.label ?? ''));

  protected readonly selectedId = linkedSignal(() => (this.initial()?.id ?? ''));

  protected readonly results = signal<Contribuable[]>([]);

  protected readonly open = signal(false);

  protected readonly loading = signal(false);

  protected requestId = { current: 0 };

  protected choose(c: Contribuable) {
    this.selectedId.set(c.id);
    this.query.set(contribuableLabel(c));
    this.open.set(false);
    }

  protected readonly showList = computed(() => this.open() && !this.selectedId() && this.query().trim().length >= MIN_QUERY_LENGTH);

  protected windowSummary() {
    return window.setTimeout(() => this.open.set(false), 150);
  }

  constructor() {
    effect((onCleanup) => {
      void onCleanup;
      this.query(); this.selectedId();
      const cleanup = untracked(() => (() => {
    const search = this.query().trim();
    if (this.selectedId() || search.length < MIN_QUERY_LENGTH) {
    this.results.set([]);
    return;
    }
    const current = ++this.requestId.current;
    this.loading.set(true);
    const timer = window.setTimeout(async () => {
    try {
    const found = await this.contribuablesApi.listContribuables({ search, limit: 8 });
    if (current === this.requestId.current)
    this.results.set(found);
    }
    catch {
    if (current === this.requestId.current)
    this.results.set([]);
    }
    finally {
    if (current === this.requestId.current)
    this.loading.set(false);
    }
    }, 250);
    return () => window.clearTimeout(timer);
    })());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
  }
}
