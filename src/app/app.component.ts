import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatButtonModule,
  ],
  template: `
    <div class="example-sidenav-content">
      <mat-toolbar>
        <span>Rumblerace v0.1</span>
        <span class="example-spacer"></span>
      </mat-toolbar>
      <div class="main-content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [
    `
      .main-content {
        padding: 5px;
        overflow: auto;
        /* how to make it so that main content only fill until the end of the page? */
      }
    `,
  ],
})
export class AppComponent {
  showMenu = false;
}
