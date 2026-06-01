import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-coin',
  standalone: true,
  imports: [],
  templateUrl: './coin.html',
  styleUrl: './coin.css',
})
export class CoinComponent {
  readonly coinId = input.required<string>();
  readonly disabled = input(false);
  readonly coinFlipped = output<boolean>();

  readonly flipping = signal(false);
  readonly flipResult = signal<'heads' | 'tails' | null>(null);
  readonly showResult = signal(false);

  flip(): void {
    if (this.flipping() || this.disabled()) return;

    this.flipping.set(true);
    this.showResult.set(false);
    this.flipResult.set(null);

    setTimeout(() => {
      const heads = Math.random() < 0.5;
      this.flipResult.set(heads ? 'heads' : 'tails');

      setTimeout(() => {
        this.flipping.set(false);

        setTimeout(() => {
          this.showResult.set(true);
          this.coinFlipped.emit(heads);
        }, 600);
      }, 800);
    }, 20);
  }
}
