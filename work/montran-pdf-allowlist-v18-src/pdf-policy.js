const APPROVED_PDF_URL = __MMS_APPROVED_PDF_URL_JSON__;
const APPROVED_PDF_BYTES = __MMS_APPROVED_PDF_BYTES__;

function rejectUnapprovedPdf() {
  throw new Error("This booklet can load only the approved Montran report.");
}

function resolveApprovedPdfUrl(value) {
  if (typeof value !== "string" || value !== APPROVED_PDF_URL) {
    return rejectUnapprovedPdf();
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    return rejectUnapprovedPdf();
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.origin !== "https://freight.cargo.site" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    parsed.href !== APPROVED_PDF_URL
  ) {
    return rejectUnapprovedPdf();
  }
  return parsed.href;
}

async function fetchApprovedPdf(url, options) {
  resolveApprovedPdfUrl(url);
  const requestOptions = Object.assign({}, options || {}, {
    mode: "cors",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    redirect: "error",
  });
  const response = await fetch(url, requestOptions);
  const requestMethod = String(requestOptions.method || "GET").toUpperCase();
  const isRangeRequest = new Headers(requestOptions.headers || {}).has("range");
  const contentLength = Number(response.headers.get("content-length"));
  const contentRange = response.headers.get("content-range") || "";
  const rangeTotal = Number(contentRange.match(/\/(\d+)$/)?.[1]);
  if (
    (requestMethod === "HEAD" && contentLength !== APPROVED_PDF_BYTES) ||
    (contentRange && rangeTotal !== APPROVED_PDF_BYTES) ||
    (!isRangeRequest && requestMethod !== "HEAD" && Number.isFinite(contentLength) &&
      contentLength > 0 && contentLength !== APPROVED_PDF_BYTES)
  ) {
    throw new Error("The approved Montran report identity changed.");
  }
  return response;
}
