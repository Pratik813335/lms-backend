export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, any>;
}

export function formatSuccessResponse<T>(
  data: T,
  message = 'Operation successful',
  meta?: Record<string, any>,
): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    meta,
  };
}

export function formatErrorResponse(
  message = 'An error occurred',
): ApiResponse {
  return {
    success: false,
    message,
  };
}
