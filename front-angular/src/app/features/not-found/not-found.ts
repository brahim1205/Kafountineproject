import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './not-found.html',
})
export class NotFound {
  private readonly location = inject(Location);
  protected readonly path = inject(Router).url;

  protected back(): void {
    this.location.back();
  }
}
