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
const PAYMENT_STATUS_ALLOWED_ORIGINS = new Set([
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

function addPaymentStatusCors(request, response) {
  const origin = request.headers.get("Origin");
  if (!PAYMENT_STATUS_ALLOWED_ORIGINS.has(origin)) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
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

function makeVerifyTokenXml({ companyToken, transactionToken, companyRef }) {
  return `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${escapeXml(companyToken)}</CompanyToken>
  <Request>verifyToken</Request>
  <TransactionToken>${escapeXml(transactionToken)}</TransactionToken>
  <CompanyRef>${escapeXml(companyRef)}</CompanyRef>
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

async function createPayment(request, env) {
  if (!PAYMENTS_ENABLED) {
    return jsonResponse({ error: "Online checkout is disabled." }, 503);
  }

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
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  const packageId = body?.packageId;
  if (typeof packageId !== "string" || !Object.hasOwn(PACKAGES, packageId)) {
    return jsonResponse({ error: "Choose a valid package." }, 400);
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
    return jsonResponse({ error: "Could not start the payment test." }, 500);
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

async function verifyPayment(request, env) {
  if (!PAYMENTS_ENABLED) {
    return jsonResponse({ error: "Online payment verification is disabled." }, 503);
  }

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
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  const companyRef = body?.companyRef;
  if (typeof companyRef !== "string" || !/^TH[0-9a-f]{13}$/.test(companyRef)) {
    return jsonResponse({ error: "Provide a valid payment reference." }, 400);
  }

  let payment;
  try {
    payment = await env.PAYMENTS_DB.prepare(
      `SELECT company_ref, package_id, amount_minor, currency, status, transaction_token
       FROM payments
       WHERE company_ref = ?
       LIMIT 1`,
    )
      .bind(companyRef)
      .first();
  } catch (error) {
    console.error("Could not load payment for verification", error);
    return jsonResponse({ error: "Could not load the payment attempt." }, 500);
  }

  if (!payment || !payment.transaction_token) {
    return jsonResponse({ error: "Payment attempt was not found or has no DPO token." }, 404);
  }

  if (payment.status === "paid") {
    return jsonResponse({
      companyRef,
      status: "paid",
      resultCode: "000",
    });
  }

  let dpoResponse;
  try {
    dpoResponse = await fetch(DPO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        Accept: "application/xml",
      },
      body: makeVerifyTokenXml({
        companyToken: env.DPO_COMPANY_TOKEN,
        transactionToken: payment.transaction_token,
        companyRef: payment.company_ref,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    console.error("DPO verifyToken request failed", error);
    return jsonResponse({ error: "DPO could not be reached. Payment status is unchanged." }, 502);
  }

  let responseXml;
  try {
    responseXml = await dpoResponse.text();
  } catch (error) {
    console.error("Could not read DPO verifyToken response", error);
    return jsonResponse({ error: "Could not read DPO's response. Payment status is unchanged." }, 502);
  }

  const resultCode = getXmlValue(responseXml, "Result");
  const explanation = getXmlValue(responseXml, "ResultExplanation");
  if (!dpoResponse.ok || !resultCode) {
    console.error("DPO verifyToken returned an invalid response", {
      httpStatus: dpoResponse.status,
      resultCode,
      explanation,
    });
    return jsonResponse({ error: "DPO could not confirm the payment status." }, 502);
  }

  if (resultCode === "000") {
    const verifiedCompanyRef = getXmlValue(responseXml, "CompanyRef");
    const verifiedAmount = getXmlValue(responseXml, "TransactionAmount");
    if (
      verifiedCompanyRef !== payment.company_ref ||
      !matchesPaymentAmount(verifiedAmount, payment.amount_minor) ||
      payment.currency !== "BWP"
    ) {
      console.error("DPO verification details did not match the stored payment", {
        companyRefMatches: verifiedCompanyRef === payment.company_ref,
        amountMatches: matchesPaymentAmount(verifiedAmount, payment.amount_minor),
        currencyMatches: payment.currency === "BWP",
      });
      return jsonResponse(
        { error: "DPO's verified payment details did not match this payment. Status was not changed." },
        502,
      );
    }
  }

  const statusByResult = {
    "000": "paid",
    "901": "failed",
    "904": "cancelled",
  };
  const hasFinalStatus = Object.hasOwn(statusByResult, resultCode);
  const status = hasFinalStatus ? statusByResult[resultCode] : "pending";
  const storedStatus = status === "cancelled" ? "failed" : status;

  try {
    await env.PAYMENTS_DB.prepare(
      `UPDATE payments
       SET status = ?, dpo_result_code = ?, updated_at = CURRENT_TIMESTAMP
       WHERE company_ref = ? AND status != 'paid'`,
    )
      .bind(hasFinalStatus ? storedStatus : payment.status, resultCode, companyRef)
      .run();
  } catch (error) {
    console.error("Could not save verified payment status", error);
    return jsonResponse({ error: "DPO returned a status, but it could not be recorded." }, 500);
  }

  return jsonResponse({
    companyRef,
    status,
    resultCode,
    explanation,
  });
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
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed." }, 405);
      }
      return createPayment(request, env);
    }

    if (url.pathname === "/api/payments/verify") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed." }, 405);
      }
      return verifyPayment(request, env);
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
        testKey: Boolean(env.PAYMENT_TEST_KEY),
      };

      let database = "error";
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

      const ready =
        configured.companyToken &&
        configured.serviceType &&
        configured.testKey &&
        database === "connected";

      return addPaymentStatusCors(
        request,
        jsonResponse(
          {
            status: !ready ? "needs-setup" : PAYMENTS_ENABLED ? "ready" : "disabled",
            paymentsEnabled: PAYMENTS_ENABLED,
            configured,
            database,
          },
          ready ? 200 : 503,
        ),
      );
    }

    return jsonResponse({ error: "Not found." }, 404);
  },
};
