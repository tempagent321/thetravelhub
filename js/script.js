
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
