import { createSignal, Show, type Component } from 'solid-js';

type SuccessResponse = {
  checkoutUrl: string;
  discountPercent: number;
  originalPrice: number;
  finalPrice: number;
  redactedEmail: string;
  dateMissing: boolean;
};

type ErrorCode =
  | 'bad_token'
  | 'missing_token'
  | 'missing_file'
  | 'file_too_large'
  | 'unsupported_file_type'
  | 'not_colorsnapper_receipt'
  | 'email_unreadable'
  | 'vision_failed'
  | 'paddle_failed';

const ERROR_MESSAGES: Record<ErrorCode, string> = {
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

type PaddleGlobal = {
  Checkout: {
    open(opts: { override: string; successCallback?: () => void }): void;
  };
};

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

type Props = {
  turnstileSiteKey: string;
};

const UpgradeForm: Component<Props> = (props) => {
  const [file, setFile] = createSignal<File | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [result, setResult] = createSignal<SuccessResponse | null>(null);
  const [checkedOut, setCheckedOut] = createSignal(false);
  const [dragHover, setDragHover] = createSignal(false);

  const onFileChange = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    setFile(input.files?.[0] ?? null);
  };

  const onDragEnter = (event: DragEvent) => {
    event.preventDefault();
    setDragHover(true);
  };

  const onDragLeave = (event: DragEvent) => {
    event.preventDefault();
    setDragHover(false);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragHover(false);
    const dropped = event.dataTransfer?.files?.[0];
    if (dropped) setFile(dropped);
  };

  const readTurnstileToken = (): string => {
    const tokenEl = document.querySelector<HTMLInputElement>(
      'input[name="cf-turnstile-response"]',
    );
    return tokenEl?.value ?? '';
  };

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError(null);

    const upload = file();
    if (!upload) {
      setError(ERROR_MESSAGES.missing_file);
      return;
    }

    const token = readTurnstileToken();
    if (!token) {
      setError(ERROR_MESSAGES.missing_token);
      return;
    }

    const fd = new FormData();
    fd.set('receipt', upload);
    fd.set('turnstileToken', token);

    setLoading(true);
    try {
      const res = await fetch('/api/upgrade-request', { method: 'POST', body: fd });
      const data = (await res.json().catch(() => ({}))) as
        | SuccessResponse
        | { error?: ErrorCode };

      if (!res.ok) {
        const code = 'error' in data ? data.error : undefined;
        setError(
          (code && ERROR_MESSAGES[code]) ?? 'Something went wrong. Please try again.',
        );
        return;
      }

      setResult(data as SuccessResponse);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openCheckout = () => {
    const data = result();
    if (!data || !window.Paddle) return;
    window.Paddle.Checkout.open({
      override: data.checkoutUrl,
      successCallback: () => setCheckedOut(true),
    });
  };

  return (
    <>
      <Show when={!result()}>
        <form class="upgrade__form" novalidate onSubmit={onSubmit}>
          <label
            class="upgrade__drop"
            classList={{ 'is-hover': dragHover() }}
            for="receipt-input"
            onDragEnter={onDragEnter}
            onDragOver={onDragEnter}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <span class="upgrade__drop-text">
              {file()
                ? file()!.name
                : (
                  <>
                    Drop your receipt here, or click to choose a file
                    <br />
                    <small>PNG, JPG, WebP, or PDF · up to 5 MB</small>
                  </>
                )}
            </span>
            <input
              id="receipt-input"
              name="receipt"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              required
              onChange={onFileChange}
            />
          </label>

          <div class="cf-turnstile upgrade__turnstile" data-sitekey={props.turnstileSiteKey} />

          <button class="upgrade__submit" type="submit" disabled={loading()}>
            {loading() ? 'Verifying…' : 'Verify and continue'}
          </button>

          <Show when={error()}>
            <p class="upgrade__error">{error()}</p>
          </Show>
        </form>
      </Show>

      <Show when={!checkedOut() && result()}>
        {(data) => (
          <section class="upgrade__result">
            <h2>Receipt verified</h2>
            <p>
              You qualify for <strong>{data().discountPercent}% off</strong> — your price is{' '}
              <strong>${data().finalPrice.toFixed(2)}</strong>.
            </p>
            <p>
              License will be sent to <strong>{data().redactedEmail}</strong> after checkout.
            </p>
            <Show when={data().dateMissing}>
              <p>
                <em>
                  We could not read the purchase date on your receipt, so we applied our minimum
                  discount. Email support if you think you qualified for more.
                </em>
              </p>
            </Show>
            <button type="button" onClick={openCheckout}>
              Continue to checkout
            </button>
          </section>
        )}
      </Show>

      <Show when={checkedOut()}>
        <section class="upgrade__result">
          <h2>Thanks!</h2>
          <p>
            We've sent your license to the email shown on your receipt. If you don't see it
            shortly, check your spam folder, then email support.
          </p>
        </section>
      </Show>
    </>
  );
};

export default UpgradeForm;
