import { Component, ElementRef, input, output, viewChild } from '@angular/core';

const WHEEL_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b',
  '#2980b9', '#27ae60', '#f1c40f', '#8e44ad', '#d35400',
  '#7f8c8d', '#2c3e50', '#e84393', '#00b894', '#6c5ce7',
];

@Component({
  selector: 'app-wheel',
  standalone: true,
  imports: [],
  templateUrl: './wheel.html',
  styleUrl: './wheel.css',
})
export class WheelComponent {
  readonly catchSegments = input(1);
  readonly size = input(280);
  readonly hideButton = input(false);
  readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  readonly wheelResult = output<boolean>();

  private ctx: CanvasRenderingContext2D | null = null;
  private angle = 0;
  private spinning = false;
  btnDisabled = false;

  ngAfterViewInit(): void {
    this.ctx = this.canvas().nativeElement.getContext('2d');
    this.draw();
  }

  private draw(): void {
    const canvas = this.canvas().nativeElement;
    const ctx = this.ctx;
    if (!ctx) return;

    const n = 12;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = Math.min(cx, cy) - 10;
    const slice = (2 * Math.PI) / n;
    const catches = this.catchSegments();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < n; i++) {
      const start = this.angle + i * slice;
      const end = start + slice;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = i < catches ? '#2ecc71' : '#e74c3c';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const mid = start + slice / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(9, r / 14)}px system-ui, sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,.5)';
      ctx.shadowBlur = 2;
      ctx.fillText(i < catches ? '✓' : '✗', r - 10, 4);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.1, 0, 2 * Math.PI);
    ctx.fillStyle = '#daa520';
    ctx.fill();
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  spin(): void {
    if (this.spinning) return;
    this.spinning = true;
    this.btnDisabled = true;

    const target =
      this.angle +
      (5 + Math.random() * 5) * 2 * Math.PI +
      Math.random() * 2 * Math.PI;
    const duration = 3000;
    const startPerf = performance.now();
    const startAngle = this.angle;

    const animate = (now: number) => {
      const t = Math.min((now - startPerf) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      this.angle = startAngle + (target - startAngle) * ease;
      this.draw();

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.angle = target;
        this.draw();
        const result = this.getResult();
        this.spinning = false;
        this.btnDisabled = false;
        this.wheelResult.emit(result);
      }
    };
    requestAnimationFrame(animate);
  }

  private getResult(): boolean {
    const n = 12;
    const slice = (2 * Math.PI) / n;
    const a =
      ((-Math.PI / 2 - this.angle) % (2 * Math.PI) + 2 * Math.PI) %
      (2 * Math.PI);
    const index = Math.floor(a / slice);
    return index < this.catchSegments();
  }
}
