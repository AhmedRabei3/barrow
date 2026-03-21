export class ApiError extends Error {
  statusCode: number;
  code: string;
  field?: string;

  constructor(
    message: string,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    field?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.field = field;
  }
}
