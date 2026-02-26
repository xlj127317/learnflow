export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = '资源') {
    super(404, `${resource}不存在`, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '用户未认证') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ConflictError extends AppError {
  constructor(message = '数据已存在') {
    super(409, message, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(message = '数据验证失败', public details?: unknown) {
    super(400, message, 'VALIDATION_ERROR');
  }
}
