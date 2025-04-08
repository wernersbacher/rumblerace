import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatIconModule,
    MatSidenavModule,
  ],
  template: `<router-outlet></router-outlet> `,
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
