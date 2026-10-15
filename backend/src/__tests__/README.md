# Test Suite Documentation

## Overview

This directory contains the comprehensive test suite for the OPS-Agent-Desktop backend. Tests are organized by module and include unit tests, integration tests, and security tests.

## Test Files

### Authentication Tests (`auth/authService.test.ts`)

- **Coverage**: Password hashing, JWT generation/verification, login/registration flows
- **Security Focus**:
  - Password hashing with bcrypt (12 rounds)
  - JWT token validation
  - Invalid credential handling
  - OAuth user management
- **Test Count**: 15+ tests

### Security Middleware Tests (`middleware/securityMiddleware.test.ts`)

- **Coverage**: Input sanitization, XSS protection, request validation
- **Security Focus**:
  - XSS attack vector prevention
  - Content-Type validation
  - Request size limits
  - Query parameter sanitization
- **Test Count**: 25+ tests

### Auth Middleware Tests (`middleware/authMiddleware.test.ts`)

- **Coverage**: Authentication and authorization middleware
- **Security Focus**:
  - Bearer token validation
  - Role-based access control (RBAC)
  - Ownership verification
  - Authorization error handling
- **Test Count**: 20+ tests

### API Routes Tests (`api/routes.test.ts`)

- **Coverage**: The mission endpoints served by `src/index.ts` (create, fetch, stream, list)
- **Security Focus**:
  - Prompt validation and length limit
- **Note**: The mission routes are not authenticated on `main`; route-level auth lives on the unmerged `security/add-api-authentication` branch
- **Test Count**: 14 tests

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode (for development)

```bash
npm run test:watch
```

### With Coverage Report

```bash
npm run test:coverage
```

### With UI

```bash
npm run test:ui
```

## Prerequisites

Before running tests, ensure dependencies are installed:

```bash
npm install
```

## Test Configuration

Tests are configured via `vitest.config.ts` with the following settings:

- **Environment**: Node.js
- **Coverage Provider**: v8
- **Coverage Threshold**: 60% for auth/, middleware/, api/
- **Test Pattern**: `**/*.test.ts`

## Continuous Integration

Tests run automatically on:

- Every pull request
- Commits to `main` branch
- Pre-merge validation

CI pipeline requirements:

- ✅ All tests must pass
- ✅ No linting errors
- ✅ Coverage thresholds met

## Coverage Goals

| Module      | Current | Target |
| ----------- | ------- | ------ |
| auth/       | -       | 80%+   |
| middleware/ | -       | 75%+   |
| api/        | -       | 70%+   |
| Overall     | -       | 60%+   |

## Security Test Priorities

Tests are prioritized for security-critical code:

1. **High Priority**: Authentication, authorization, password handling
2. **Medium Priority**: Input validation, rate limiting, CORS
3. **Standard**: Business logic, data transformations

## Writing New Tests

### Test Structure

```typescript
describe('Module Name', () => {
  beforeEach(() => {
    // Setup
  });

  describe('Feature Name', () => {
    it('should do something specific', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Mocking Dependencies

Use vitest mocks for external dependencies:

```typescript
vi.mock('../db/client', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));
```

### Security Test Best Practices

1. Test both positive and negative cases
2. Verify error messages don't leak sensitive data
3. Test authorization at boundaries (owner/non-owner, admin/user)
4. Test input sanitization with known attack vectors
5. Verify proper JWT handling (expired, invalid, malformed)

## Troubleshooting

### Tests not running

- Ensure `vitest` is installed: `npm install`
- Check Node version: `node -v` (requires v22+)

### Coverage not generating

- `@vitest/coverage-v8` is a devDependency; run `npm install` from the repository root

### Mocks not working

- Clear mock cache: `vi.clearAllMocks()` in `beforeEach`
- Check mock path matches import path

## Future Enhancements

- [ ] Add frontend component tests
- [ ] Add E2E tests with Playwright
- [ ] Add performance/load tests
- [ ] Integrate mutation testing
- [ ] Add visual regression tests for UI

## References

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
