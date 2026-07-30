// Swap this for the Production URL once testing against the Test URL works.
var CONTACT_WEBHOOK_URL = 'https://n8n.bsd.international/webhook/contact-form';

var contactForm = document.getElementById('contactForm');
var formStatus = document.getElementById('formStatus');
var submitBtn = document.getElementById('contactSubmitBtn');

if (contactForm) {
  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();

    var payload = {
      firstName: document.getElementById('firstName').value,
      lastName: document.getElementById('lastName').value,
      email: document.getElementById('email').value,
      message: document.getElementById('message').value
    };

    var originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    formStatus.textContent = '';
    formStatus.className = 'form-status';

    fetch(CONTACT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Request failed with status ' + response.status);
        }
        formStatus.textContent = "Thanks! Your message has been sent — we'll get back to you soon.";
        formStatus.className = 'form-status form-status-success';
        contactForm.reset();
      })
      .catch(function () {
        formStatus.textContent = 'Something went wrong sending your message. Please try again.';
        formStatus.className = 'form-status form-status-error';
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      });
  });
}
