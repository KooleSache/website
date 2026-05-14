// @ts-nocheck
type SuccessResponse = {
  checkoutUrl: string;
  discountPercent: number;
  originalPrice: number;
  finalPrice: number;
  redactedEmail: string;
  dateMissing: boolean;
};

const ERROR_MESSAGES: Record<string, string> = {
  bad_token: 'Please refresh the page and try again.',
  missing_token: 'Please complete the verification challenge and try again.',
  missing_file: 'Please choose a receipt file to upload.',
  file_too_large: 'That file is larger than 5 MB. Please upload a smaller file.',
  unsupported_file_type: 'Please upload a PNG, JPG, WebP, or PDF file.',
  not_colorsnapper_receipt:
    "This doesn't look like a ColorSnapper Mac App Store receipt. Please try a different file or email support.",
  email_unreadable:
    "We couldn't read the email on your receipt. Please email support and we'll help.",
  vision_failed: 'Something went wrong reading your receipt. Please try again in a moment.',
  paddle_failed: 'Something went wrong creating your checkout. Please try again in a moment.',
};

const form = document.getElementById('upgrade-form') as HTMLFormElement | null;
const fileInput = document.getElementById('receipt-input') as HTMLInputElement | null;
const dropLabel = form?.querySelector<HTMLLabelElement>('.upgrade__drop');
const errorEl = document.getElementById('upgrade-error') as HTMLParagraphElement | null;
const resultEl = document.getElementById('upgrade-result') as HTMLElement | null;
const submitBtn = form?.querySelector<HTMLButtonElement>('.upgrade__submit');

if (form && fileInput && dropLabel && errorEl && resultEl && submitBtn) {
  bindDropZone(dropLabel, fileInput);
  form.addEventListener('submit', handleSubmit);
}

function bindDropZone(label: HTMLLabelElement, input: HTMLInputElement) {
  ['dragenter', 'dragover'].forEach((name) =>
    label.addEventListener(name, (e) => {
      e.preventDefault();
      label.classList.add('is-hover');
    }),
  );
  ['dragleave', 'drop'].forEach((name) =>
    label.addEventListener(name, (e) => {
      e.preventDefault();
      label.classList.remove('is-hover');
    }),
  );
  label.addEventListener('drop', (e) => {
    const dt = (e as DragEvent).dataTransfer;
    if (dt?.files?.[0]) {
      input.files = dt.files;
    }
  });
}

async function handleSubmit(e: SubmitEvent) {
  e.preventDefault();
  hideError();

  if (!fileInput?.files?.[0]) {
    showError('Please choose a receipt file to upload.');
    return;
  }

  const tokenEl = document.querySelector<HTMLInputElement>(
    'input[name="cf-turnstile-response"]',
  );
  const token = tokenEl?.value ?? '';
  if (!token) {
    showError(ERROR_MESSAGES.missing_token);
    return;
  }

  const fd = new FormData();
  fd.set('receipt', fileInput.files[0]);
  fd.set('turnstileToken', token);

  setLoading(true);
  try {
    const res = await fetch('/api/upgrade-request', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showError(ERROR_MESSAGES[data.error] ?? 'Something went wrong. Please try again.');
      return;
    }

    showResult(data as SuccessResponse);
  } catch (err) {
    showError('Network error. Please try again.');
  } finally {
    setLoading(false);
  }
}

function clearChildren(el: HTMLElement) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function appendParagraph(parent: HTMLElement, build: (p: HTMLParagraphElement) => void) {
  const p = document.createElement('p');
  build(p);
  parent.appendChild(p);
}

function showResult(data: SuccessResponse) {
  form!.hidden = true;
  resultEl!.hidden = false;
  clearChildren(resultEl!);

  const heading = document.createElement('h2');
  heading.textContent = 'Receipt verified';
  resultEl!.appendChild(heading);

  appendParagraph(resultEl!, (p) => {
    p.appendChild(document.createTextNode('You qualify for '));
    const pct = document.createElement('strong');
    pct.textContent = `${data.discountPercent}% off`;
    p.appendChild(pct);
    p.appendChild(document.createTextNode(' — your price is '));
    const price = document.createElement('strong');
    price.textContent = `$${data.finalPrice.toFixed(2)}`;
    p.appendChild(price);
    p.appendChild(document.createTextNode('.'));
  });

  appendParagraph(resultEl!, (p) => {
    p.appendChild(document.createTextNode('License will be sent to '));
    const email = document.createElement('strong');
    email.textContent = data.redactedEmail;
    p.appendChild(email);
    p.appendChild(document.createTextNode(' after checkout.'));
  });

  if (data.dateMissing) {
    appendParagraph(resultEl!, (p) => {
      const em = document.createElement('em');
      em.textContent =
        'We could not read the purchase date on your receipt, so we applied our minimum discount. Email support if you think you qualified for more.';
      p.appendChild(em);
    });
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'open-checkout';
  btn.textContent = 'Continue to checkout';
  btn.addEventListener('click', () => openCheckout(data.checkoutUrl));
  resultEl!.appendChild(btn);
}

function openCheckout(url: string) {
  Paddle.Checkout.open({
    override: url,
    successCallback: () => {
      clearChildren(resultEl!);
      const heading = document.createElement('h2');
      heading.textContent = 'Thanks!';
      resultEl!.appendChild(heading);
      appendParagraph(resultEl!, (p) => {
        p.textContent =
          "We've sent your license to the email shown on your receipt. If you don't see it shortly, check your spam folder, then email support.";
      });
    },
  });
}

function showError(message: string) {
  errorEl!.textContent = message;
  errorEl!.hidden = false;
}

function hideError() {
  errorEl!.hidden = true;
  errorEl!.textContent = '';
}

function setLoading(loading: boolean) {
  submitBtn!.disabled = loading;
  submitBtn!.textContent = loading ? 'Verifying…' : 'Verify and continue';
}
