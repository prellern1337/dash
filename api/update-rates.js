import updateNibor from "./update-nibor.js";
import updateStibor from "./update-stibor.js";

async function callApiHandler(handler, label) {
  return new Promise((resolve) => {
    const request = {
      headers: {},
      method: "GET",
      query: {},
    };

    const response = {
      statusCode: 200,
      headers: {},
      setHeader(key, value) {
        this.headers[key] = value;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({
          key: label,
          httpStatus: this.statusCode,
          ...payload,
        });
      },
    };

    Promise.resolve(handler(request, response)).catch((error) => {
      resolve({
        key: label,
        httpStatus: 500,
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    });
  });
}

export default async function handler(request, response) {
  const results = await Promise.all([
    callApiHandler(updateNibor, "nibor_3m"),
    callApiHandler(updateStibor, "stibor_3m"),
  ]);

  const hasError = results.some((result) => result.status === "error");

  response.status(hasError ? 207 : 200).json({
    status: hasError ? "partial" : "ok",
    generatedAt: new Date().toISOString(),
    results,
  });
}
