import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DragOverlayComponent } from './drag-overlay.component';

@NgModule({
  declarations: [DragOverlayComponent],
  imports: [CommonModule, MatIconModule],
  exports: [DragOverlayComponent],
})
export class DragOverlayModule {}
