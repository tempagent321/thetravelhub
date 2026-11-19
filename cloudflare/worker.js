const PACKAGES = {
  "rwanda-uganda": {
    amountMinor: 680000,
    description: "Faith of Africa Pilgrimage booking deposit",
  },
  "southern-cross": {
    amountMinor: 1090000,
    description: "Southern Cross Pilgrimage booking deposit",
  },
};

const DPO_API_URL = "https://secure.3gdirectpay.com/API/v6/";
const DPO_CHECKOUT_URL = "https://secure.3gdirectpay.com/payv3.php";
const EXPECTED_SERVICE_TYPE = "114407";
const PAYMENTS_ENABLED = false;
const PAYMENT_RETURN_URL = "https://tempagent321.github.io/thetravelhub/payment-return.html";
const PAYMENT_CALLBACK_URL = "https://thetravelhub-dpo-api.tempagent321.workers.dev/api/payments/callback";
const PAYMENT_CREATE_LIMIT = 5;
const PAYMENT_CREATE_WINDOW_SECONDS = 600;
const WEBSITE_ALLOWED_ORIGINS = new Set([
  "https://tempagent321.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
]);

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function addWebsiteCors(request, response) {
  const origin = request.headers.get("Origin");
  if (!WEBSITE_ALLOWED_ORIGINS.has(origin)) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "600");
  headers.set("Vary", "Origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function getXmlValue(xml, tagName) {
  const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(
    new RegExp(`<${escapedTagName}>([\\s\\S]*?)<\\/${escapedTagName}>`, "i"),
  );
  return match ? match[1].trim() : null;
}

async function readTextBody(request, maximumBytes) {
  const reader = request.body?.getReader();
  if (!reader) {
    return "";
  }

  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maximumBytes) {
      await reader.cancel();
      throw new RangeError("Request body exceeds the allowed size.");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(body);
}

async function readJsonBody(request, maximumBytes = 4096) {
  const text = await readTextBody(request, maximumBytes);
  return JSON.parse(text);
}

function newCompanyReference() {
  return `TH${crypto.randomUUID().replaceAll("-", "").slice(0, 13)}`;
}

function formatServiceDate() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "/");
  return `${date} 12:00`;
}

function makeCreateTokenXml({ companyToken, serviceType, companyRef, order }) {
  const amount = (order.amountMinor / 100).toFixed(2);

  return `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${escapeXml(companyToken)}</CompanyToken>
  <Request>createToken</Request>
  <Transaction>
    <PaymentAmount>${amount}</PaymentAmount>
    <PaymentCurrency>BWP</PaymentCurrency>
    <CompanyRef>${companyRef}</CompanyRef>
    <CompanyRefUnique>1</CompanyRefUnique>
    <PTL>24</PTL>
    <RedirectURL>${escapeXml(PAYMENT_RETURN_URL)}</RedirectURL>
    <BackURL>${escapeXml(PAYMENT_RETURN_URL)}</BackURL>
  </Transaction>
  <Services>
    <Service>
      <ServiceType>${escapeXml(serviceType)}</ServiceType>
      <ServiceDescription>${escapeXml(order.description)}</ServiceDescription>
      <ServiceDate>${formatServiceDate()}</ServiceDate>
    </Service>
  </Services>
</API3G>`;
}

function makeVerifyTokenXml({ companyToken, transactionToken, companyRef, verifyTransaction }) {
  return `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${escapeXml(companyToken)}</CompanyToken>
  <Request>verifyToken</Request>
  <TransactionToken>${escapeXml(transactionToken)}</TransactionToken>
  <CompanyRef>${escapeXml(companyRef)}</CompanyRef>
  <VerifyTransaction>${verifyTransaction ? "1" : "0"}</VerifyTransaction>
</API3G>`;
}

function matchesPaymentAmount(amount, expectedMinor) {
  if (typeof amount !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(amount)) {
    return false;
  }

  const [whole, fraction = ""] = amount.split(".");
  const actualMinor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(actualMinor) && actualMinor === expectedMinor;
}

function hasValidTestKey(request, env) {
  return Boolean(env.PAYMENT_TEST_KEY) &&
    request.headers.get("x-test-key") === env.PAYMENT_TEST_KEY;
}

function hasAllowedWebsiteOrigin(request) {
  return WEBSITE_ALLOWED_ORIGINS.has(request.headers.get("Origin"));
}

function isValidTransactionToken(token) {
  return typeof token === "string" && /^[A-Za-z0-9-]{8,128}$/.test(token);
}

async function checkPublicPaymentRateLimit(request, database) {
  const clientIp = request.headers.get("CF-Connecting-IP");
  if (!clientIp) {
    throw new Error("Cloudflare client IP header is unavailable.");
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(clientIp),
  );
  const clientKey = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / PAYMENT_CREATE_WINDOW_SECONDS) * PAYMENT_CREATE_WINDOW_SECONDS;

  await database.prepare(
    `INSERT INTO payment_rate_limits (client_key, window_start, request_count)
     VALUES (?, ?, 1)
     ON CONFLICT(client_key) DO UPDATE SET
       request_count = CASE
         WHEN payment_rate_limits.window_start = excluded.window_start
           THEN payment_rate_limits.request_count + 1
         ELSE 1
       END,
       window_start = excluded.window_start`,
  )
    .bind(clientKey, windowStart)
    .run();

  const entry = await database.prepare(
    "SELECT request_count FROM payment_rate_limits WHERE client_key = ?",
  )
    .bind(clientKey)
    .first();

  await database.prepare(
    "DELETE FROM payment_rate_limits WHERE window_start < ?",
  )
    .bind(windowStart - 86400)
    .run();

  return entry?.request_count <= PAYMENT_CREATE_LIMIT;
}

async function createPayment(request, env) {
  if (!PAYMENTS_ENABLED) {
    return jsonResponse({ error: "Online checkout is disabled." }, 503);
  }

  if (
    !env.PAYMENTS_DB ||
    !env.DPO_COMPANY_TOKEN ||
    env.DPO_SERVICE_TYPE !== EXPECTED_SERVICE_TYPE
  ) {
    return jsonResponse({ error: "Payment configuration is incomplete or invalid." }, 503);
  }

  if (!hasAllowedWebsiteOrigin(request)) {
    return jsonResponse({ error: "Request origin is not allowed." }, 403);
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return jsonResponse({ error: "Content-Type must be application/json." }, 415);
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    if (error instanceof RangeError) {
      return jsonResponse({ error: "Request body is too large." }, 413);
    }
    if (error instanceof SyntaxError) {
      return jsonResponse({ error: "Request body must be valid JSON." }, 400);
    }
    console.error("Could not read payment request body", error);
    return jsonResponse({ error: "Could not read the request body." }, 400);
  }

  const packageId = body?.packageId;
  if (typeof packageId !== "string" || !Object.hasOwn(PACKAGES, packageId)) {
    return jsonResponse({ error: "Choose a valid package." }, 400);
  }

  try {
    if (!(await checkPublicPaymentRateLimit(request, env.PAYMENTS_DB))) {
      return jsonResponse({ error: "Too many checkout attempts. Please wait and try again." }, 429);
    }
  } catch (error) {
    console.error("Could not check payment creation rate limit", error);
    return jsonResponse({ error: "Checkout is temporarily unavailable." }, 503);
  }

  const order = PACKAGES[packageId];
  const companyRef = newCompanyReference();

  try {
    await env.PAYMENTS_DB.prepare(
      `INSERT INTO payments (company_ref, package_id, amount_minor, currency, status)
       VALUES (?, ?, ?, 'BWP', 'created')`,
    )
      .bind(companyRef, packageId, order.amountMinor)
      .run();
  } catch (error) {
    console.error("Could not record payment attempt", error);
    return jsonResponse({ error: "Could not start the payment." }, 500);
  }

  let dpoResponse;
  try {
    dpoResponse = await fetch(DPO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        Accept: "application/xml",
      },
      body: makeCreateTokenXml({
        companyToken: env.DPO_COMPANY_TOKEN,
        serviceType: env.DPO_SERVICE_TYPE,
        companyRef,
        order,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    console.error("DPO createToken request failed", error);
    await markPaymentFailed(env.PAYMENTS_DB, companyRef, "NETWORK");
    return jsonResponse({ error: "DPO could not be reached. The payment was not started." }, 502);
  }

  let responseXml;
  try {
    responseXml = await dpoResponse.text();
  } catch (error) {
    console.error("Could not read DPO createToken response", error);
    await markPaymentFailed(env.PAYMENTS_DB, companyRef, "RESPONSE");
    return jsonResponse({ error: "Could not read DPO's response." }, 502);
  }

  const resultCode = getXmlValue(responseXml, "Result");
  const explanation = getXmlValue(responseXml, "ResultExplanation");
  const transactionToken =
    getXmlValue(responseXml, "TransToken") ??
    getXmlValue(responseXml, "TransactionToken");

  if (!dpoResponse.ok || resultCode !== "000" || !transactionToken) {
    await markPaymentFailed(env.PAYMENTS_DB, companyRef, resultCode ?? "HTTP");
    console.error("DPO createToken returned an unsuccessful result", {
      httpStatus: dpoResponse.status,
      resultCode,
      explanation,
    });
    return jsonResponse(
      { error: "DPO did not create the transaction.", resultCode },
      502,
    );
  }

  try {
    await env.PAYMENTS_DB.prepare(
      `UPDATE payments
       SET transaction_token = ?, dpo_result_code = ?, updated_at = CURRENT_TIMESTAMP
       WHERE company_ref = ?`,
    )
      .bind(transactionToken, resultCode, companyRef)
      .run();
  } catch (error) {
    console.error("Could not save DPO transaction token", error);
    return jsonResponse(
      { error: "DPO created a transaction, but it could not be recorded. Contact support before retrying." },
      500,
    );
  }

  const checkoutUrl = new URL(DPO_CHECKOUT_URL);
  checkoutUrl.searchParams.set("ID", transactionToken);

  return jsonResponse({
    companyRef,
    packageId,
    amount: (order.amountMinor / 100).toFixed(2),
    currency: "BWP",
    checkoutUrl: checkoutUrl.toString(),
  });
}

async function getPaymentForVerification(database, companyRef) {
  return database.prepare(
    `SELECT company_ref, package_id, amount_minor, currency, status, transaction_token
     FROM payments
     WHERE company_ref = ?
     LIMIT 1`,
  )
    .bind(companyRef)
    .first();
}

async function verifyDpoTransaction({ companyToken, transactionToken, companyRef, verifyTransaction }) {
  const response = await fetch(DPO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      Accept: "application/xml",
    },
    body: makeVerifyTokenXml({
      companyToken,
      transactionToken,
      companyRef,
      verifyTransaction,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const responseXml = await response.text();
  const resultCode = getXmlValue(responseXml, "Result");
  if (!response.ok || !resultCode) {
    throw new Error(`DPO verifyToken returned HTTP ${response.status} without a result code.`);
  }

  return {
    resultCode,
    explanation: getXmlValue(responseXml, "ResultExplanation"),
    amount: getXmlValue(responseXml, "TransactionAmount"),
    currency: getXmlValue(responseXml, "TransactionCurrency"),
    fraudAlert: getXmlValue(responseXml, "FraudAlert"),
  };
}

async function savePaymentStatus(database, payment, status, resultCode) {
  await database.prepare(
    `UPDATE payments
     SET status = ?, dpo_result_code = ?, updated_at = CURRENT_TIMESTAMP
     WHERE company_ref = ? AND transaction_token = ? AND status != 'paid'`,
  )
    .bind(status, resultCode, payment.company_ref, payment.transaction_token)
    .run();
}

async function verifyAndRecordPayment(payment, env) {
  if (payment.status === "paid") {
    return { ok: true, status: "paid", resultCode: "000" };
  }

  let firstVerification;
  try {
    firstVerification = await verifyDpoTransaction({
      companyToken: env.DPO_COMPANY_TOKEN,
      transactionToken: payment.transaction_token,
      companyRef: payment.company_ref,
      verifyTransaction: false,
    });
  } catch (error) {
    console.error("DPO payment verification failed", error);
    return { ok: false, status: 502, error: "DPO could not confirm the payment." };
  }

  const statusByResult = {
    "901": "failed",
    "904": "failed",
  };
  if (firstVerification.resultCode !== "000") {
    const status = statusByResult[firstVerification.resultCode] ?? "pending";
    if (status !== "pending") {
      try {
        await savePaymentStatus(env.PAYMENTS_DB, payment, status, firstVerification.resultCode);
      } catch (error) {
        console.error("Could not save unsuccessful payment status", error);
        return { ok: false, status: 500, error: "Could not record the payment status." };
      }
    }
    return {
      ok: true,
      status,
      resultCode: firstVerification.resultCode,
      explanation: firstVerification.explanation,
    };
  }

  const acceptedFraudAlerts = new Set(["000", "001", "003", "005"]);
  if (
    !matchesPaymentAmount(firstVerification.amount, payment.amount_minor) ||
    firstVerification.currency?.toUpperCase() !== payment.currency ||
    !acceptedFraudAlerts.has(firstVerification.fraudAlert)
  ) {
    console.error("DPO verification details did not match payment policy", {
      amountMatches: matchesPaymentAmount(firstVerification.amount, payment.amount_minor),
      currencyMatches: firstVerification.currency?.toUpperCase() === payment.currency,
      fraudAlertAccepted: acceptedFraudAlerts.has(firstVerification.fraudAlert),
    });
    return { ok: false, status: 502, error: "DPO's verified payment details did not match this payment." };
  }

  try {
    await savePaymentStatus(
      env.PAYMENTS_DB,
      payment,
      "verification_pending",
      firstVerification.resultCode,
    );
  } catch (error) {
    console.error("Could not save payment before final DPO verification", error);
    return { ok: false, status: 500, error: "Could not record the payment for final verification." };
  }

  try {
    const finalVerification = await verifyDpoTransaction({
      companyToken: env.DPO_COMPANY_TOKEN,
      transactionToken: payment.transaction_token,
      companyRef: payment.company_ref,
      verifyTransaction: true,
    });
    if (finalVerification.resultCode !== "000") {
      throw new Error(`DPO final verification returned ${finalVerification.resultCode}.`);
    }
  } catch (error) {
    console.error("Could not complete DPO final verification", error);
    return {
      ok: false,
      status: 502,
      error: "DPO confirmed the payment, but final verification needs retrying.",
    };
  }

  try {
    await savePaymentStatus(
      env.PAYMENTS_DB,
      payment,
      "paid",
      firstVerification.resultCode,
    );
  } catch (error) {
    console.error("Could not save final verified payment status", error);
    return { ok: false, status: 500, error: "DPO verified the payment, but its final status could not be recorded." };
  }

  return {
    ok: true,
    status: "paid",
    resultCode: firstVerification.resultCode,
    explanation: firstVerification.explanation,
  };
}

async function verifyPayment(request, env) {
  if (
    !env.PAYMENTS_DB ||
    !env.DPO_COMPANY_TOKEN ||
    env.DPO_SERVICE_TYPE !== EXPECTED_SERVICE_TYPE ||
    !env.PAYMENT_TEST_KEY
  ) {
    return jsonResponse({ error: "Payment configuration is incomplete or invalid." }, 503);
  }

  if (!hasValidTestKey(request, env)) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return jsonResponse({ error: "Content-Type must be application/json." }, 415);
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    if (error instanceof RangeError) {
      return jsonResponse({ error: "Request body is too large." }, 413);
    }
    if (error instanceof SyntaxError) {
      return jsonResponse({ error: "Request body must be valid JSON." }, 400);
    }
    console.error("Could not read manual verification body", error);
    return jsonResponse({ error: "Could not read the request body." }, 400);
  }

  const companyRef = body?.companyRef;
  if (typeof companyRef !== "string" || !/^TH[0-9a-f]{13}$/.test(companyRef)) {
    return jsonResponse({ error: "Provide a valid payment reference." }, 400);
  }

  let payment;
  try {
    payment = await getPaymentForVerification(env.PAYMENTS_DB, companyRef);
  } catch (error) {
    console.error("Could not load payment for verification", error);
    return jsonResponse({ error: "Could not load the payment attempt." }, 500);
  }

  if (!payment || !payment.transaction_token) {
    return jsonResponse({ error: "Payment attempt was not found or has no DPO token." }, 404);
  }

  const result = await verifyAndRecordPayment(payment, env);
  if (!result.ok) {
    return jsonResponse({ error: result.error }, result.status);
  }

  return jsonResponse({
    companyRef,
    status: result.status,
    resultCode: result.resultCode,
    explanation: result.explanation,
  });
}

async function verifyPaymentReturn(request, env) {
  if (!env.PAYMENTS_DB || !env.DPO_COMPANY_TOKEN) {
    return addWebsiteCors(request, jsonResponse({ error: "Payment verification is unavailable." }, 503));
  }

  if (!hasAllowedWebsiteOrigin(request)) {
    return jsonResponse({ error: "Request origin is not allowed." }, 403);
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return addWebsiteCors(request, jsonResponse({ error: "Content-Type must be application/json." }, 415));
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    if (error instanceof RangeError) {
      return addWebsiteCors(request, jsonResponse({ error: "Request body is too large." }, 413));
    }
    if (error instanceof SyntaxError) {
      return addWebsiteCors(request, jsonResponse({ error: "Request body must be valid JSON." }, 400));
    }
    console.error("Could not read payment return body", error);
    return addWebsiteCors(request, jsonResponse({ error: "Could not read the request body." }, 400));
  }

  const companyRef = body?.companyRef;
  const transactionToken = body?.transactionToken;
  if (
    typeof companyRef !== "string" ||
    !/^TH[0-9a-f]{13}$/.test(companyRef) ||
    !isValidTransactionToken(transactionToken)
  ) {
    return addWebsiteCors(request, jsonResponse({ error: "Payment return details are invalid." }, 400));
  }

  try {
    if (!(await checkPublicPaymentRateLimit(request, env.PAYMENTS_DB))) {
      return addWebsiteCors(
        request,
        jsonResponse({ error: "Too many payment status checks. Please wait and try again." }, 429),
      );
    }
  } catch (error) {
    console.error("Could not check payment return rate limit", error);
    return addWebsiteCors(request, jsonResponse({ error: "Payment status is temporarily unavailable." }, 503));
  }

  let payment;
  try {
    payment = await getPaymentForVerification(env.PAYMENTS_DB, companyRef);
  } catch (error) {
    console.error("Could not load returned payment", error);
    return addWebsiteCors(request, jsonResponse({ error: "Could not load the payment." }, 500));
  }

  if (!payment || payment.transaction_token !== transactionToken) {
    return addWebsiteCors(request, jsonResponse({ error: "Payment was not found." }, 404));
  }

  const result = await verifyAndRecordPayment(payment, env);
  return addWebsiteCors(
    request,
    jsonResponse(
      result.ok
        ? { companyRef, status: result.status, resultCode: result.resultCode }
        : { error: result.error },
      result.ok ? 200 : result.status,
    ),
  );
}

function xmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}

async function handlePaymentCallback(request, env) {
  if (!env.PAYMENTS_DB || !env.DPO_COMPANY_TOKEN) {
    return xmlResponse("<API3G><Response>ERROR</Response></API3G>", 503);
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/xml") && !contentType.includes("text/xml")) {
    return xmlResponse("<API3G><Response>ERROR</Response></API3G>", 415);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16384) {
    return xmlResponse("<API3G><Response>ERROR</Response></API3G>", 413);
  }

  let xml;
  try {
    xml = await readTextBody(request, 16384);
  } catch (error) {
    if (error instanceof RangeError) {
      return xmlResponse("<API3G><Response>ERROR</Response></API3G>", 413);
    }
    console.error("Could not read DPO callback body", error);
    return xmlResponse("<API3G><Response>ERROR</Response></API3G>", 400);
  }

  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    return xmlResponse("<API3G><Response>ERROR</Response></API3G>", 400);
  }

  const resultCode = getXmlValue(xml, "Result");
  const companyRef = getXmlValue(xml, "TransactionRef");
  const transactionToken = getXmlValue(xml, "TransactionToken");
  if (
    resultCode !== "000" ||
    !companyRef ||
    !/^TH[0-9a-f]{13}$/.test(companyRef) ||
    !isValidTransactionToken(transactionToken)
  ) {
    return xmlResponse("<API3G><Response>ERROR</Response></API3G>", 400);
  }

  let payment;
  try {
    payment = await getPaymentForVerification(env.PAYMENTS_DB, companyRef);
  } catch (error) {
    console.error("Could not load DPO callback payment", error);
    return xmlResponse("<API3G><Response>ERROR</Response></API3G>", 500);
  }

  if (!payment || payment.transaction_token !== transactionToken) {
    return xmlResponse("<API3G><Response>ERROR</Response></API3G>", 404);
  }

  if (payment.status === "paid") {
    return xmlResponse("<API3G><Response>OK</Response></API3G>");
  }

  const result = await verifyAndRecordPayment(payment, env);
  if (!result.ok || result.status !== "paid") {
    console.error("DPO callback could not be confirmed", {
      companyRef,
      resultCode: result.resultCode ?? null,
    });
    return xmlResponse(
      "<API3G><Response>ERROR</Response></API3G>",
      Number.isInteger(result.status) ? result.status : 502,
    );
  }

  return xmlResponse("<API3G><Response>OK</Response></API3G>");
}

async function markPaymentFailed(database, companyRef, resultCode) {
  try {
    await database.prepare(
      `UPDATE payments
       SET status = 'failed', dpo_result_code = ?, updated_at = CURRENT_TIMESTAMP
       WHERE company_ref = ?`,
    )
      .bind(resultCode, companyRef)
      .run();
  } catch (error) {
    console.error("Could not record failed payment attempt", error);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/payments/create") {
      if (request.method === "OPTIONS") {
        return hasAllowedWebsiteOrigin(request)
          ? addWebsiteCors(request, new Response(null, { status: 204 }))
          : jsonResponse({ error: "Request origin is not allowed." }, 403);
      }
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed." }, 405);
      }
      const response = await createPayment(request, env);
      return addWebsiteCors(request, response);
    }

    if (url.pathname === "/api/payments/verify") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed." }, 405);
      }
      return verifyPayment(request, env);
    }

    if (url.pathname === "/api/payments/return") {
      if (request.method === "OPTIONS") {
        return hasAllowedWebsiteOrigin(request)
          ? addWebsiteCors(request, new Response(null, { status: 204 }))
          : jsonResponse({ error: "Request origin is not allowed." }, 403);
      }
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed." }, 405);
      }
      return verifyPaymentReturn(request, env);
    }

    if (url.pathname === "/api/payments/callback") {
      if (request.method !== "POST") {
        return xmlResponse("<API3G><Response>ERROR</Response></API3G>", 405);
      }
      return handlePaymentCallback(request, env);
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      if (request.method !== "GET") {
        return new Response("Method not allowed.", {
          status: 405,
          headers: { Allow: "GET" },
        });
      }

      const configured = {
        companyToken: Boolean(env.DPO_COMPANY_TOKEN),
        serviceType: env.DPO_SERVICE_TYPE === EXPECTED_SERVICE_TYPE,
        manualVerifyKey: Boolean(env.PAYMENT_TEST_KEY),
      };

      let database = "error";
      let rateLimitStore = "error";
      try {
        const result = await env.PAYMENTS_DB
          .prepare("SELECT COUNT(*) AS total FROM payments")
          .first();
        if (result && typeof result.total === "number") {
          database = "connected";
        }
      } catch (error) {
        console.error("D1 health check failed", error);
      }

      try {
        const result = await env.PAYMENTS_DB
          .prepare("SELECT COUNT(*) AS total FROM payment_rate_limits")
          .first();
        if (result && typeof result.total === "number") {
          rateLimitStore = "connected";
        }
      } catch (error) {
        console.error("Payment rate-limit table health check failed", error);
      }

      const ready =
        configured.companyToken &&
        configured.serviceType &&
        database === "connected" &&
        rateLimitStore === "connected";

      return addWebsiteCors(
        request,
        jsonResponse(
          {
            status: !ready ? "needs-setup" : PAYMENTS_ENABLED ? "ready" : "disabled",
            paymentsEnabled: PAYMENTS_ENABLED,
            configured,
            database,
            rateLimitStore,
            callbackUrl: PAYMENT_CALLBACK_URL,
          },
          ready ? 200 : 503,
        ),
      );
    }

    return jsonResponse({ error: "Not found." }, 404);
  },
};
