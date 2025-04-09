import { Injectable } from '@angular/core';
import { Observable, Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class TimerService {
  private stopSubject = new Subject<void>();

  createTimer(intervalMs: number): Observable<number> {
    return interval(intervalMs).pipe(takeUntil(this.stopSubject));
  }

  stopTimer(): void {
    this.stopSubject.next();
  }
}
