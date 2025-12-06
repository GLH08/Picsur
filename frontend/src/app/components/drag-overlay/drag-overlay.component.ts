import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { DragDropService } from '../../services/drag-drop/drag-drop.service';

@Component({
  selector: 'app-drag-overlay',
  templateUrl: './drag-overlay.component.html',
  styleUrls: ['./drag-overlay.component.scss'],
})
export class DragOverlayComponent implements OnInit, OnDestroy {
  isDragging = false;
  private subscription: Subscription | null = null;

  constructor(private readonly dragDropService: DragDropService) {}

  ngOnInit(): void {
    this.subscription = this.dragDropService.isDragging$.subscribe(
      (isDragging) => {
        this.isDragging = isDragging;
      },
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
