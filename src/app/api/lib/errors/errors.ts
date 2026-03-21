import { ApiError } from "./ApiError";

export const Errors = {
  UNAUTHORIZED: () => new ApiError("Unauthorized", 401, "UNAUTHORIZED"),

  FORBIDDEN: (message = "Forbidden") => new ApiError(message, 403, "FORBIDDEN"),

  NOT_FOUND: (message = "Item not found") =>
    new ApiError(message, 404, "NOT_FOUND"),

  VALIDATION: (message: string, field?: string) =>
    new ApiError(message, 400, "VALIDATION_ERROR", field),

  INTERNAL: (message = "Unexpected error occurred") =>
    new ApiError(message, 500, "INTERNAL_ERROR"),
};
