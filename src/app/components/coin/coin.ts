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
  readonly label = input.required<string>();
  readonly labelClass = input<string>('');
  readonly frontText = input.required<string>();
  readonly backText = input.required<string>();
  readonly resultSuccess = input.required<string>();
  readonly resultFail = input.required<string>();
  readonly disabled = input(false);

  readonly coinFlipped = output<boolean>();

  readonly flipping = signal(false);
  readonly flipResult = signal<'heads' | 'tails' | null>(null);
  readonly showResult = signal(false);
  readonly resultText = signal('');
  readonly resultClass = signal('');

  flip(): void {
    if (this.flipping() || this.disabled()) return;

    this.flipping.set(true);
    this.showResult.set(false);
    this.flipResult.set(null);
    this.resultText.set('');

    setTimeout(() => {
      const heads = Math.random() < 0.5;
      this.flipResult.set(heads ? 'heads' : 'tails');

      setTimeout(() => {
        this.flipping.set(false);

        setTimeout(() => {
          this.showResult.set(true);
          this.resultText.set(
            heads ? this.resultSuccess() : this.resultFail(),
          );
          this.resultClass.set(heads ? 'success' : 'fail');
          this.coinFlipped.emit(heads);
        }, 600);
      }, 800);
    }, 20);
  }
}
