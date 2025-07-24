# Contributing to Spaced Repetition Writing Inbox

Thank you for contributing to the Spaced Repetition Writing Inbox plugin!

## Table of Contents

- [Preface](#preface)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Testing](#testing)
- [Questions](#questions)

## Preface

1. Be patient and respectful.
2. This is a personal hobby project. I'm happy to discuss ideas, but ultimately it's my code to grow and maintain.

## Getting Started

Before contributing, please:

1. Read the [README.md](README.md) to understand the project's purpose and functionality
2. Check existing [issues](https://github.com/jonathanyeong/writing-inbox/issues) and [pull requests](https://github.com/jonathanyeong/writing-inbox/pulls) to avoid duplicate work
3. For major changes, open an issue first to discuss your proposed changes

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/writing-inbox.git
   cd writing-inbox
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a test vault** (optional)
   - Create a new Obsidian vault for testing
   - Create a `.obsidian/plugins/spaced-repetition-writing-inbox` folder in your test vault
   - Create a symlink from your development folder to the plugin folder `ln -s <directory-of-cloned-project> .obsidian/plugins/spaced-repetition-writing-inbox`

Perform last two steps if you want to use an existing vault.

4. **Start development**
   ```bash
   npm run dev
   ```

### File Structure
**WIP**
- All logic should go in `src/`.
  - `core/` - Core service logic
  - `extensions/` - View extensions
  - `settings/` - Plugin settings in Obsidian
  - `sm2/` - The spaced repetition sm2 algorithm
  - `ui/` - Additional UI components like modals
- Additional styles in the root level `styles.css`

## How to Contribute

1. Open an issue to discuss the feature, bug or to add documentation.
2. Assign yourself the issue.
3. Create a pull request with detailed testing steps and description.
4. Wherever possible please write new tests or modify existing tests related to your change.
5. Wait for review.

## Testing

### Running Tests

```bash
npm test
```

### Writing Tests

- Add tests for new features
- Ensure existing tests pass
- Use Vitest for testing
- Mock Obsidian API calls appropriately
- Test edge cases and error conditions

### Manual Testing

- Test your changes in a real Obsidian vault
- Verify the plugin works with different settings configurations
- Check for console errors
- Test on different Obsidian themes if UI changes are involved

## Questions?

If you have questions about contributing:
- Check existing issues and discussions
- Open a new issue with the "question" label

Thank you for contributing to make the Writing Inbox plugin better!
