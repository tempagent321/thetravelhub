const PAYMENT_API_URL = "https://thetravelhub-dpo-api.tempagent321.workers.dev";
const paymentResult = document.getElementById("payment-result");

async function verifyReturnedPayment() {
    const query = new URLSearchParams(window.location.search);
    const companyRef = query.get("CompanyRef");
    const transactionToken = query.get("TransactionToken") || query.get("TransToken");
    window.history.replaceState(null, "", window.location.pathname);

    if (!companyRef || !transactionToken) {
        paymentResult.textContent = "We could not identify this payment return. Please contact THE Travel Hub to check its status.";
        return;
    }

    try {
        const response = await fetch(PAYMENT_API_URL + "/api/payments/return", {
            method: "POST",
            mode: "cors",
            credentials: "omit",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyRef, transactionToken })
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Payment status could not be confirmed.");
        }

        if (result.status === "paid") {
            paymentResult.textContent = "DPO confirmed your payment. THE Travel Hub will contact you to confirm your booking.";
        } else if (result.status === "failed") {
            paymentResult.textContent = "DPO did not approve this payment. Please contact THE Travel Hub for assistance.";
        } else {
            paymentResult.textContent = "DPO has not confirmed this payment yet. Please wait a moment, then contact THE Travel Hub if needed.";
        }
    } catch (error) {
        console.error("Could not verify the returned DPO payment", error);
        paymentResult.textContent = "We could not confirm your payment yet. Please contact THE Travel Hub before trying to pay again.";
    }
}

verifyReturnedPayment();
