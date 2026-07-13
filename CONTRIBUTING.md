# Contributing to ojeet-tracker

Thank you for your interest in contributing! This guide will help you understand our workflow and standards.

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat` – New feature
- `fix` – Bug fix
- `docs` – Documentation changes
- `style` – Code style changes (formatting, missing semicolons, etc.)
- `refactor` – Code refactoring without feature changes
- `perf` – Performance improvements
- `test` – Adding or updating tests
- `chore` – Dependency updates, build changes
- `ci` – CI/CD pipeline changes

### Scope (Optional)
Indicates which part of the codebase:
- `dashboard`
- `subjects`
- `planner`
- `sync`
- `auth`
- `community`
- etc.

### Examples
```bash
feat(dashboard): add 7-day heatmap widget
fix(sync): resolve payload compression race condition
docs(readme): update installation instructions
chore(deps): upgrade Vite to v5
```

## Branching Strategy

### Branch Naming
- `feature/feature-name` – New features
- `fix/bug-name` – Bug fixes
- `docs/topic` – Documentation
- `chore/task` – Maintenance/chores

### Workflow

1. **Create a branch** from `develop`:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

2. **Make commits** following Conventional Commits:
```bash
git commit -m "feat(dashboard): add new widget"
```

3. **Push and create a PR**:
```bash
git push origin feature/your-feature-name
```

4. **Code review**: Wait for 2 approvals on `main`, 1 on `develop`

5. **Merge**: Use "Squash and merge" for cleaner history

## Pull Request Guidelines

- Use the PR template provided
- Link related issues with `Closes #123`
- Keep PRs focused and reasonably sized
- Write clear, descriptive PR titles following Conventional Commits
- Provide screenshots for UI changes

## Code Quality

- Follow existing code style
- Run linters: `pnpm lint`
- Run type checks: `pnpm type-check`
- Run tests: `pnpm test`
- Build successfully: `pnpm build`

## Semantic Versioning

We use [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH`
- Breaking changes → Major version
- New features → Minor version
- Bug fixes → Patch version

Version bumping is **automated** based on commit types!

## Questions?

- Check existing issues and discussions
- Ask in the Discord community
- Open a new issue for questions

---

**Thank you for contributing to ojeet-tracker! 🚀**
