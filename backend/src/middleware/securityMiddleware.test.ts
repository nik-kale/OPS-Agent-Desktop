/**
 * Security Middleware Tests
 * Tests for input sanitization, rate limiting, and security headers
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  sanitizeInput,
  validateContentType,
  validateRequestSize,
  sanitizeQueryParams,
} from './securityMiddleware';

describe('Security Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      headers: {},
      body: {},
      query: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    nextFn = vi.fn();
  });

  describe('sanitizeInput', () => {
    it('should remove script tags from body strings', () => {
      mockReq.body = {
        message: '<script>alert("XSS")</script>Hello World',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.body.message).toBe('Hello World');
      expect(mockReq.body.message).not.toContain('<script>');
      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle nested objects', () => {
      mockReq.body = {
        user: {
          name: 'John<script>alert(1)</script>',
          bio: 'Developer',
        },
      };

      sanitizeInput(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.body.user.name).toBe('John');
      expect(mockReq.body.user.bio).toBe('Developer');
      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle arrays', () => {
      mockReq.body = {
        tags: [
          'tag1',
          '<script>evil</script>tag2',
          'tag3<script>bad</script>',
        ],
      };

      sanitizeInput(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.body.tags[0]).toBe('tag1');
      expect(mockReq.body.tags[1]).toBe('tag2');
      expect(mockReq.body.tags[2]).toBe('tag3');
      expect(nextFn).toHaveBeenCalled();
    });

    it('should not modify non-string values', () => {
      mockReq.body = {
        count: 42,
        active: true,
        ratio: 3.14,
        nothing: null,
      };

      sanitizeInput(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.body.count).toBe(42);
      expect(mockReq.body.active).toBe(true);
      expect(mockReq.body.ratio).toBe(3.14);
      expect(mockReq.body.nothing).toBe(null);
      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle empty body', () => {
      mockReq.body = {};

      sanitizeInput(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.body).toEqual({});
      expect(nextFn).toHaveBeenCalled();
    });

    it('should remove multiple script tags', () => {
      mockReq.body = {
        text: '<script>bad1</script>Safe<script>bad2</script>Content<script>bad3</script>',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.body.text).toBe('SafeContent');
      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('validateContentType', () => {
    it('should allow GET requests without Content-Type', () => {
      mockReq.method = 'GET';

      validateContentType(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should require JSON Content-Type for POST', () => {
      mockReq.method = 'POST';
      mockReq.headers = {};

      validateContentType(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(415);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Content-Type must be application/json',
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should accept valid JSON Content-Type for POST', () => {
      mockReq.method = 'POST';
      mockReq.headers = { 'content-type': 'application/json' };

      validateContentType(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should accept JSON with charset for POST', () => {
      mockReq.method = 'POST';
      mockReq.headers = { 'content-type': 'application/json; charset=utf-8' };

      validateContentType(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should require JSON Content-Type for PUT', () => {
      mockReq.method = 'PUT';
      mockReq.headers = {};

      validateContentType(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(415);
    });

    it('should require JSON Content-Type for PATCH', () => {
      mockReq.method = 'PATCH';
      mockReq.headers = {};

      validateContentType(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(415);
    });
  });

  describe('validateRequestSize', () => {
    it('should accept requests within size limit', () => {
      const maxSize = 1024 * 1024; // 1MB
      mockReq.headers = { 'content-length': '1000' };

      const middleware = validateRequestSize(maxSize);
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject requests exceeding size limit', () => {
      const maxSize = 1024; // 1KB
      mockReq.headers = { 'content-length': '2048' }; // 2KB

      const middleware = validateRequestSize(maxSize);
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(413);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Request entity too large',
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should allow requests without Content-Length', () => {
      const maxSize = 1024;
      mockReq.headers = {};

      const middleware = validateRequestSize(maxSize);
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle exact size limit', () => {
      const maxSize = 1000;
      mockReq.headers = { 'content-length': '1000' };

      const middleware = validateRequestSize(maxSize);
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('sanitizeQueryParams', () => {
    it('should convert array query params to single values', () => {
      mockReq.query = {
        id: ['123', '456', '789'],
        name: 'John',
      };

      sanitizeQueryParams(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.query.id).toBe('123'); // Takes first value
      expect(mockReq.query.name).toBe('John');
      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle empty query', () => {
      mockReq.query = {};

      sanitizeQueryParams(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.query).toEqual({});
      expect(nextFn).toHaveBeenCalled();
    });

    it('should not modify single value params', () => {
      mockReq.query = {
        page: '1',
        limit: '20',
        status: 'active',
      };

      sanitizeQueryParams(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.query.page).toBe('1');
      expect(mockReq.query.limit).toBe('20');
      expect(mockReq.query.status).toBe('active');
      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle mixed array and single params', () => {
      mockReq.query = {
        tags: ['tag1', 'tag2'],
        category: 'news',
        filter: ['all', 'active'],
      };

      sanitizeQueryParams(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.query.tags).toBe('tag1');
      expect(mockReq.query.category).toBe('news');
      expect(mockReq.query.filter).toBe('all');
      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('XSS Attack Vectors', () => {
    it('should prevent common XSS attack patterns', () => {
      const xssVectors = [
        '<script>alert("XSS")</script>',
        '<script src="http://evil.com/xss.js"></script>',
        '<img src=x onerror="alert(1)">',
        '<svg onload="alert(1)">',
        '<iframe src="javascript:alert(1)">',
        '<body onload="alert(1)">',
        '<script>document.cookie</script>',
      ];

      xssVectors.forEach((vector) => {
        mockReq.body = { input: vector };
        sanitizeInput(mockReq as Request, mockRes as Response, nextFn);

        // Script tags should be removed
        expect(mockReq.body.input).not.toContain('<script');
        expect(mockReq.body.input).not.toContain('</script>');
      });
    });

    it('should handle script tag variations', () => {
      const vectors = [
        '<SCRIPT>alert(1)</SCRIPT>',
        '<script >alert(1)</script>',
        '<script\n>alert(1)</script>',
        '<script\t>alert(1)</script>',
      ];

      vectors.forEach((vector) => {
        mockReq.body = { input: vector };
        sanitizeInput(mockReq as Request, mockRes as Response, nextFn);

        // All variations should be handled (case-insensitive regex)
        expect(mockReq.body.input.toLowerCase()).not.toContain('alert');
      });
    });
  });
});

