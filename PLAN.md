# Writing Inbox Spaced Repetition Plugin - Plan

## Overview
An Obsidian plugin that implements spaced repetition for writing entries, helping writers consistently engage with their ideas and develop them over time.

## Core Concept
Transform the traditional writing inbox into a spaced repetition system where:
- Writing entries are presented daily based on SM-2 algorithm
- Users can mark entries as:
  - **Fruitful** (quality: 0) - See it more frequently
  - **Skip** (quality: 3) - Moderate frequency
  - **Unfruitful** (quality: 5) - See it less frequently

## Architecture Design

### 1. Data Model
```typescript
interface WritingEntry {
  id: string;
  content: string;
  dateCreated: Date;
  lastReviewed: Date;
  nextReview: Date;
  lastModified: Date; // Track when frontmatter was last updated by plugin
  interval: number;
  easeFactor: number;
  repetitions: number;
  quality: number; // Last quality rating
  responses: Response[];
  tags: string[];
  status: 'active' | 'archived';
}

interface Response {
  date: Date;
  content: string;
  quality: 'fruitful' | 'skip' | 'unfruitful';
}

interface PluginSettings {
  writingInboxFolder: string;
  dailyLimit: number;
  reviewTime: string; // e.g., "09:00"
  showStats: boolean;
}
```

### 2. File Structure Options

#### Option A: Single File with Frontmatter (Current)
- Keep all entries in one file
- Use frontmatter to track SM-2 data
- Pros: Simple, all in one place
- Cons: Could get unwieldy, harder to manage individual entry history

#### Option B: Folder-Based System (Recommended)
```
writing-inbox/
├── entries/
│   ├── 2025-06-19-how-do-i-build-consistency.md
│   ├── 2025-06-20-current-state-of-devx.md
│   └── ...
└── archive/
    └── [completed entries]
```

Each entry file would contain:
```markdown
---
id: "entry-uuid"
created: 2025-06-19
lastReviewed: 2025-07-08
nextReview: 2025-07-10
lastModified: 2025-07-08T09:30:00Z
interval: 2
easeFactor: 2.5
repetitions: 1
---

# How do I build consistency?

Something for me, but also for others? What is my story to tell about consistency? Rituals? [Previous text]

[User's response here]
```

### 3. UI Components

#### Daily Review Interface
- Modal or dedicated view showing today's entries
- Clean, distraction-free writing area
- Action buttons: Fruitful | Skip | Unfruitful | Archive
- Progress indicator (e.g., "2 of 5 entries")
- Option to add new entries

#### Command Palette Actions
- `Writing Inbox: Start Daily Review`
- `Writing Inbox: Add New Entry`
- `Writing Inbox: View Statistics`
- `Writing Inbox: Archive Entry`

#### Settings Tab
- Folder location
- Daily entry limit
- Review reminder time
- Import existing entries

### 4. SM-2 Algorithm Implementation

```typescript
interface SM2Result {
  interval: number;
  repetitions: number;
  easeFactor: number;
}

function calculateSM2(
  quality: number, // 0-5
  repetitions: number,
  easeFactor: number,
  interval: number
): SM2Result {
  // Quality mapping:
  // Fruitful = 0 (complete blackout)
  // Skip = 3 (correct with difficulty)
  // Unfruitful = 5 (perfect response)

  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, easeFactor);

  return { interval, repetitions, easeFactor };
}
```

### 5. Features Roadmap

#### Phase 1: MVP
- [ ] Basic entry storage and retrieval
- [ ] Daily review interface
- [ ] SM-2 algorithm integration
- [ ] Fruitful/Skip/Unfruitful actions
- [ ] Settings configuration

#### Phase 2: Enhanced Features
- [ ] Statistics dashboard
- [ ] Entry templates
- [ ] Tag-based filtering
- [ ] Bulk import/export
- [ ] Response history view

#### Phase 3: Advanced Features
- [ ] AI-powered entry suggestions
- [ ] Entry chains/threads
- [ ] Collaboration features
- [ ] Analytics and insights
- [ ] Mobile-friendly review

### 7. Technical Considerations

#### Performance
- Lazy load entries (don't load all at startup)
- Index entries for quick searching
- Cache today's entries

#### Data Integrity
- Validate SM-2 calculations
- Handle corrupted metadata gracefully
- Track manual frontmatter changes via `lastModified` timestamp

#### User Experience
- Keyboard shortcuts for quick actions
- Smooth transitions between entries
- Auto-save responses
- Undo/redo support

### 8. Next Steps for MVP Implementation

1. **Project Setup**
   - [x] Initialize Obsidian plugin boilerplate (`npm create obsidian-plugin`)
   - [x] Configure TypeScript and build system
   - [x] Set up basic plugin structure (main.ts, manifest.json, styles.css)

2. **Core Data Layer**
   - [ ] Create `WritingEntry` interface and validation
   - [ ] Implement SM-2 algorithm function
   - [ ] Build file reader/writer for markdown with frontmatter
   - [ ] Create entry manager class for CRUD operations

3. **Settings System**
   - [ ] Create settings interface with folder selection
   - [ ] Implement settings tab in Obsidian preferences
   - [ ] Add daily entry limit and review time settings

4. **Daily Review Interface**
   - [ ] Create modal/view for daily review
   - [ ] Build entry display with writing area
   - [ ] Add Fruitful/Skip/Unfruitful/Archive action buttons
   - [ ] Implement progress indicator

5. **Command Integration**
   - [ ] Add command palette actions
   - [ ] Implement "Start Daily Review" command
   - [ ] Add "Add New Entry" command
   - [ ] Create "Archive Entry" command

6. **File Management**
   - [ ] Implement entry file creation in `/entries` folder
   - [ ] Build archive functionality (move to `/archive` folder)
   - [ ] Handle manual frontmatter change detection
   - [ ] Ensure proper file naming and organization

7. **Testing & Validation**
   - [ ] Test SM-2 algorithm with various quality inputs
   - [ ] Validate frontmatter parsing and writing
   - [ ] Test daily review workflow end-to-end
   - [ ] Verify manual edit detection works correctly

### 9. Development Steps (Full Lifecycle)

1. **Setup Phase**
   - Initialize Obsidian plugin boilerplate
   - Set up TypeScript configuration
   - Create basic plugin structure

2. **Core Implementation**
   - Implement SM-2 algorithm
   - Create data models
   - Build file management system
   - Develop settings interface

3. **UI Development**
   - Design review modal/view
   - Implement action buttons
   - Add keyboard shortcuts
   - Create progress indicators

4. **Testing & Polish**
   - Unit tests for SM-2 algorithm
   - Integration tests for file operations
   - User acceptance testing
   - Performance optimization

5. **Documentation**
   - User guide
   - Installation instructions
   - Migration guide
   - API documentation

### 10. Manual Frontmatter Handling

When an entry file is modified manually (detected by comparing `lastModified` timestamp with file modification time):
- Treat the entry as "fruitful" (quality: 0)
- Reset SM-2 scheduling to show more frequently
- Update `lastModified` timestamp to current time
- Continue normal spaced repetition from this point

This approach encourages users to engage with manually-edited entries while maintaining system stability.

### 11. Open Questions

1. Should we support multiple writing inboxes? No, only one folder can be a writing inbox.
2. How to handle very old entries that haven't been reviewed?
3. Should responses be versioned or just appended?
4. Integration with Daily Notes plugin?
5. Export format for entries and responses?

### 12. Success Metrics

- Daily active usage
- Entry completion rate
- Average response length
- Entry "graduation" rate (moving to very long intervals)
- User retention over 30/60/90 days