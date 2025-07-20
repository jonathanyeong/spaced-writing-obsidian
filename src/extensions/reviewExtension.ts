import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { TFile } from 'obsidian';
import type { QualityRating } from '../core/writingInbox';

// State effect to toggle review mode
export const toggleReviewMode = StateEffect.define<boolean>();

// State field to track if we're in review mode
export const reviewModeField = StateField.define<boolean>({
  create: () => false,
  update: (value, tr) => {
    for (let e of tr.effects) {
      if (e.is(toggleReviewMode)) {
        return e.value;
      }
    }
    return value;
  }
});

function createReviewButtons(
  onReview: (quality: QualityRating) => Promise<void>,
  onArchive: () => Promise<void>
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'writing-inbox-review-buttons';

  // Fruitful button
  const fruitfulBtn = document.createElement('button');
  fruitfulBtn.textContent = 'Fruitful';
  fruitfulBtn.className = 'writing-inbox-btn writing-inbox-btn-fruitful';
  fruitfulBtn.onclick = () => onReview('fruitful');

  // Skip button
  const skipBtn = document.createElement('button');
  skipBtn.textContent = 'Skip';
  skipBtn.className = 'writing-inbox-btn writing-inbox-btn-skip';
  skipBtn.onclick = () => onReview('skip');

  // Unfruitful button
  const unfruitfulBtn = document.createElement('button');
  unfruitfulBtn.textContent = 'Unfruitful';
  unfruitfulBtn.className = 'writing-inbox-btn writing-inbox-btn-unfruitful';
  unfruitfulBtn.onclick = () => onReview('unfruitful');

  // Archive button
  const archiveBtn = document.createElement('button');
  archiveBtn.textContent = 'Archive';
  archiveBtn.className = 'writing-inbox-btn writing-inbox-btn-archive';
  archiveBtn.onclick = () => onArchive();

  container.appendChild(fruitfulBtn);
  container.appendChild(skipBtn);
  container.appendChild(unfruitfulBtn);
  container.appendChild(archiveBtn);

  return container;
}

export function createReviewExtension(
  getFile: () => TFile | null,
  onReview: (quality: QualityRating) => Promise<void>,
  onArchive: () => Promise<void>
) {
  return ViewPlugin.fromClass(class {
    reviewButtonsElement: HTMLElement | null = null;

    constructor(view: EditorView) {
      this.updateReviewButtons(view);
    }

    update(update: ViewUpdate) {
      // Update review buttons if review mode changed
      if (update.state.field(reviewModeField) !== update.startState.field(reviewModeField)) {
        this.updateReviewButtons(update.view);
      }
    }

    updateReviewButtons(view: EditorView) {
      const isReviewMode = view.state.field(reviewModeField);
      const file = getFile();

      // Remove existing buttons
      if (this.reviewButtonsElement) {
        this.reviewButtonsElement.remove();
        this.reviewButtonsElement = null;
      }

      // Add buttons if in review mode
      if (isReviewMode && file) {
        this.reviewButtonsElement = createReviewButtons(onReview, onArchive);

        // Find the workspace leaf container and add buttons there
        let container = view.dom;
        while (container && !container.classList.contains('workspace-leaf-content')) {
          if (container.parentElement) {
            container = container.parentElement;
          }
        }

        if (container) {
          container.appendChild(this.reviewButtonsElement);
        } else {
          // Fallback: add to the view's scroll container
          const scrollContainer = view.scrollDOM.parentElement;
          if (scrollContainer) {
            scrollContainer.appendChild(this.reviewButtonsElement);
          }
        }
      }
    }

    destroy() {
      if (this.reviewButtonsElement) {
        this.reviewButtonsElement.remove();
      }
    }
  });
}