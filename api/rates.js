import readNibor from "../lib/rates/read-nibor.js";
import readStibor from "../lib/rates/read-stibor.js";
import updateNibor from "../lib/rates/update-nibor.js";
import updateStibor from "../lib/rates/update-stibor.js";

export const config = { maxDuration: 60 };

const BUILD = "rates-consolidated-2026-06-13";

function getParam(request, key) {
  if (request?.query?.[key]) return request.query[key];

  try {
    const url = new URL(request?.url || "https://local/api/rates", "https://local");
    return url.searchParams.get(key);
  } catch {
    return null;
  }
}

function normaliseType(value) {
  const type = String(value || "nibor").toLowerCase();

  if (["nibor", "nibor_3m", "nok"].includes(type)) return "nibor";
  if (["stibor", "stibor_3m", "sek"].includes(type)) return "stibor";
  if (["all", "both"].includes(type)) return "all";

  return type;
}

function makeDelegateRequest(request, extraQuery = {}) {
  return {
    ...request,
    query: {
      ...(request?.query || {}),
      ...extraQuery,
    },
  };
}

async function callApiHandler(handler, label) {
  return new Promise((resolve) => {
    const request = {
      headers: {},
      method: "GET",
      query: {},
      url: "https://local/api/rates?action=update",
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

async function updateAll(response) {
  const results = await Promise.all([
    callApiHandler(updateNibor, "nibor_3m"),
    callApiHandler(updateStibor, "stibor_3m"),
  ]);

  const hasError = results.some((result) => result.status === "error");

  response.status(hasError ? 207 : 200).json({
    build: BUILD,
    status: hasError ? "partial" : "ok",
    generatedAt: new Date().toISOString(),
    results,
  });
}

export default async function handler(request, response) {
  const action = String(getParam(request, "action") || "read").toLowerCase();
  const type = normaliseType(getParam(request, "type") || getParam(request, "rate") || "nibor");

  response.setHeader?.("Cache-Control", "no-store, max-age=0");

  if (action === "update") {
    if (type === "all") return updateAll(response);
    if (type === "nibor") return updateNibor(makeDelegateRequest(request, { type }), response);
    if (type === "stibor") return updateStibor(makeDelegateRequest(request, { type }), response);

    response.status(400).json({
      build: BUILD,
      status: "error",
      message: `Ukjent rentetype: ${type}. Bruk type=nibor, type=stibor eller type=all.`,
    });
    return;
  }

  if (type === "nibor") return readNibor(makeDelegateRequest(request, { type }), response);
  if (type === "stibor") return readStibor(makeDelegateRequest(request, { type }), response);

  response.status(400).json({
    build: BUILD,
    status: "error",
    message: `Ukjent rentetype: ${type}. Bruk type=nibor eller type=stibor.`,
  });
}
