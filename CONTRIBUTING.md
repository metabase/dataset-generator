# Contributing to Dataset Generator

Thank you for your interest in contributing to Dataset Generator! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Install dependencies**: `npm install`
4. **Start the development server**: `npm run dev`

## Development Setup

### Prerequisites

- Node.js 18+
- Docker (for Metabase integration)
- OpenAI API key (for data generation)

### Environment Variables

Create a `.env.local` file:

```
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dataset_generator
```

## Making Changes

### Code Style

- Use TypeScript for all new code
- Follow existing code formatting (Prettier)
- Add JSDoc comments for public functions
- Use meaningful variable and function names

### Testing

- Test your changes locally before submitting
- Ensure the app builds successfully: `npm run build`
- Test data generation with different business types

### Commit Messages

Use conventional commit format:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `refactor:` for code refactoring
- `test:` for adding tests

## Submitting Changes

1. **Create a feature branch** from `main`
2. **Make your changes** with clear commit messages
3. **Test thoroughly** - especially data generation
4. **Submit a pull request** with a clear description

## Pull Request Guidelines

- **Describe the problem** and solution clearly
- **Include screenshots** for UI changes
- **Test with multiple business types** if applicable
- **Update documentation** if needed

## Areas for Contribution

### High Priority

- **New business types** (e.g., Gaming, Real Estate, Travel)
- **Additional export formats** (JSON, Excel, etc.)
- **Data quality improvements** (more realistic data patterns)
- **Performance optimizations** (faster data generation)

### Medium Priority

- **UI/UX improvements** (better error handling, loading states)
- **Additional schema types** (beyond OBT and Star Schema)
- **Integration improvements** (more BI tools beyond Metabase)
- **Documentation** (tutorials, examples, best practices)

### Low Priority

- **Code refactoring** (better organization, type safety)
- **Testing** (unit tests, integration tests)
- **CI/CD** (GitHub Actions, automated testing)

## Questions?

Feel free to open an issue for:

- Bug reports
- Feature requests
- Questions about the codebase
- General discussion

## License

By contributing to Dataset Generator, you agree that your contributions will be licensed under the MIT License.
