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
    for (const e of tr.effects) {
      if (e.is(toggleReviewMode)) {
        return e.value;
      }
    }
    return value;
  }
});

function createReviewButtons(
  onReview: (quality: QualityRating) => Promise<void>,
  onArchive: () => Promise<void>,
  currentIndex: number,
  totalEntries: number
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'writing-inbox-review-buttons';

  // Progress indicator
  const progressDiv = document.createElement('div');
  progressDiv.className = 'writing-inbox-review-progress';
  progressDiv.textContent = `Review ${currentIndex + 1} of ${totalEntries}`;
  container.appendChild(progressDiv);

  // Button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'writing-inbox-review-button-group';

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

  buttonContainer.appendChild(fruitfulBtn);
  buttonContainer.appendChild(skipBtn);
  buttonContainer.appendChild(unfruitfulBtn);
  buttonContainer.appendChild(archiveBtn);

  container.appendChild(buttonContainer);

  return container;
}

export function createReviewExtension(
  getFile: () => TFile | null,
  onReview: (quality: QualityRating) => Promise<void>,
  onArchive: () => Promise<void>,
  getReviewProgress: () => { current: number; total: number }
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
        const progress = getReviewProgress();
        this.reviewButtonsElement = createReviewButtons(onReview, onArchive, progress.current, progress.total);

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