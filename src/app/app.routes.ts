import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { HardwareShopComponent } from './components/hardware-shop/hardware-shop.component';
import { DriverRigComponent } from './components/driver-rig/driver-rig.component';
import { DriverSkillsComponent } from './components/driver-skills/driver-skills.component';

export const routes: Routes = [
  { path: '', redirectTo: '/main', pathMatch: 'full' },
  { path: 'main', component: DashboardComponent },
  { path: 'hardware-shop', component: HardwareShopComponent },
  { path: 'driver-rig', component: DriverRigComponent },
  { path: 'driver-skills', component: DriverSkillsComponent },
];
