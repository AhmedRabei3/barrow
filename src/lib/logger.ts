const isProduction = process.env.NODE_ENV === "production";

function shouldLogInfo(): boolean {
  return !isProduction;
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (!isProduction) {
      console.debug(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (shouldLogInfo()) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
