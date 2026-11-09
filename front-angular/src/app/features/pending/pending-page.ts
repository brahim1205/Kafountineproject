import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Écran temporaire des pages dont la migration Angular n'est pas terminée. */
@Component({
  selector: 'app-pending-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">
      <i class="ri-tools-line text-4xl text-gray-300"></i>
      <p class="mt-2 text-sm">Page « {{ title() }} » en cours de migration vers Angular.</p>
    </div>
  `,
})
export class PendingPage {
  readonly title = input('');
}
