
/* Header shrink */
const siteHeader = document.querySelector("header");
function updateHeaderSize() {
    siteHeader.classList.toggle("header-scrolled", window.scrollY > 60);
}
window.addEventListener("scroll", updateHeaderSize, { passive: true });
updateHeaderSize();

/* Smooth package navigation */
function scrollToPackage(id) {
    const destination = document.getElementById(id);
    if (destination) destination.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* Accessible accordions */
document.querySelectorAll(".accordion-btn").forEach(function (button) {
    const content = button.nextElementSibling;
    const panelId = button.getAttribute("aria-controls") || "panel-" + Array.from(document.querySelectorAll(".accordion-btn")).indexOf(button);

    if (!content) {
        return;
    }

    content.id = content.id || panelId;
    button.setAttribute("aria-controls", content.id);
    button.setAttribute("aria-expanded", "false");
    content.style.display = "none";

    button.addEventListener("click", function () {
        const isOpen = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!isOpen));
        content.style.display = isOpen ? "none" : "block";
    });
});

/* DPO checkout appears only when the Worker reports that it is enabled and ready. */
const paymentApiUrl = "https://thetravelhub-dpo-api.tempagent321.workers.dev";
const paymentStatusUrl = paymentApiUrl + "/health";
document.querySelectorAll(".booking-box").forEach(function (box) {
    const notice = box.querySelector(".booking-notice");
    if (!notice) {
        return;
    }

    const status = document.createElement("p");
    status.className = "payment-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.textContent = "Checking payment service availability...";
    notice.insertAdjacentElement("afterend", status);
});

const paymentStatusMessages = document.querySelectorAll(".payment-status");

function addCheckoutButton(form) {
    const box = form.closest(".booking-box");
    const status = box?.querySelector(".payment-status");
    if (!box || !status || box.querySelector(".start-payment-button")) {
        return;
    }

    const button = document.createElement("button");
    button.className = "pay-btn start-payment-button";
    button.type = "button";
    button.textContent = "Pay deposit securely with DPO";
    button.addEventListener("click", async function () {
        button.disabled = true;
        status.textContent = "Connecting securely to DPO...";

        try {
            const response = await fetch(paymentApiUrl + "/api/payments/create", {
                method: "POST",
                mode: "cors",
                credentials: "omit",
                cache: "no-store",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ packageId: form.dataset.paymentPackage })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Could not start checkout.");
            }

            const checkoutUrl = new URL(result.checkoutUrl);
            if (
                checkoutUrl.origin !== "https://secure.3gdirectpay.com" ||
                checkoutUrl.pathname !== "/payv3.php"
            ) {
                throw new Error("The checkout destination was not recognized.");
            }

            window.location.assign(checkoutUrl.href);
        } catch (error) {
            console.error("Could not start DPO checkout", error);
            status.textContent = error.message || "Could not start checkout. Please use the booking enquiry form.";
            button.disabled = false;
        }
    });

    status.insertAdjacentElement("afterend", button);
}

async function updatePaymentStatus() {
    if (window.location.protocol === "file:") {
        paymentStatusMessages.forEach(function (element) {
            element.textContent = "Open this page with Live Server to check the payment service. Online checkout remains unavailable.";
        });
        return;
    }

    try {
        const response = await fetch(paymentStatusUrl, {
            method: "GET",
            mode: "cors",
            credentials: "omit",
            cache: "no-store"
        });
        const health = await response.json();
        const checkoutReady = response.ok &&
            health.paymentsEnabled === true &&
            health.status === "ready";
        const message = checkoutReady
            ? "Choose secure checkout below to pay the displayed deposit. Your booking is not confirmed until THE Travel Hub confirms it."
            : "Online payments are not active. Please use the booking enquiry form.";

        paymentStatusMessages.forEach(function (element) {
            element.textContent = message;
        });
        if (checkoutReady) {
            document.querySelectorAll(".booking-notice").forEach(function (element) {
                element.textContent = "Secure DPO checkout is available for the deposit shown. Submitting the booking enquiry below does not process a payment or reserve a seat.";
            });
            document.querySelectorAll(".booking-form").forEach(addCheckoutButton);
        }
    } catch (error) {
        console.error("Could not check the DPO payment service status", error);
        paymentStatusMessages.forEach(function (element) {
            element.textContent = "Payment availability could not be checked. Online checkout remains unavailable; please use the booking enquiry form.";
        });
    }
}

updatePaymentStatus();

/* Booking enquiry: no payment and no document upload at this stage */
document.querySelectorAll(".booking-form").forEach(function (form) {
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const fullName = form.querySelector('[name="fullName"]').value.trim();
        const email = form.querySelector('[name="email"]').value.trim();
        const phone = form.querySelector('[name="phone"]').value.trim();
        const message = form.querySelector('[name="message"]').value.trim();
        const packageName = form.dataset.package;
        const amount = Number(form.dataset.amount).toLocaleString("en-US");
        const status = form.querySelector(".success-box");

        const subject = "Booking enquiry: " + packageName;
        const body = [
            "Hello THE Travel Hub,",
            "",
            "I would like booking information for: " + packageName,
            "Required deposit shown on website: BWP " + amount,
            "",
            "Full name: " + fullName,
            "Email: " + email,
            "Phone: " + phone,
            "Message: " + (message || "None"),
            "",
            "Please confirm availability and send the official booking and payment instructions."
        ].join("\n");

        status.style.display = "block";
        status.innerHTML = "<strong>Your enquiry is ready.</strong><br>Your email application will open. Review the message and press Send. No payment has been taken and no seat has been reserved yet.";

        window.location.href = "mailto:thetravelhubbw@gmail.com?subject=" +
            encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    });
});
