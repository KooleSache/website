import { createSignal, onCleanup, onMount, Show, type Component } from 'solid-js';

type SuccessResponse = {
  couponCode: string;
  discountPercent: number;
  suggestedEmail: string | null;
  dateMissing: boolean;
};

type Props = {
  turnstileSiteKey: string;
  paddleProductId: string;
};

type ErrorCode =
  | 'bad_token'
  | 'missing_token'
  | 'missing_file'
  | 'file_too_large'
  | 'unsupported_file_type'
  | 'not_colorsnapper_receipt'
  | 'vision_failed'
  | 'paddle_failed'
  | 'server_misconfigured'
  | 'invalid_request';

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  bad_token: 'Please refresh the page and try again.',
  missing_token: 'Please complete the verification challenge and try again.',
  missing_file: 'Please choose a receipt file to upload.',
  file_too_large: 'That file is larger than 5 MB. Please upload a smaller file.',
  unsupported_file_type: 'Please upload a PNG, JPG, WebP, or PDF file.',
  not_colorsnapper_receipt:
    "This doesn't look like a ColorSnapper Mac App Store receipt. Please try a different file or email support.",
  vision_failed: 'Something went wrong reading your receipt. Please try again in a moment.',
  paddle_failed: 'Something went wrong creating your checkout. Please try again in a moment.',
  server_misconfigured:
    'The upgrade service is temporarily misconfigured. Please email support so we can fix it.',
  invalid_request: 'Your submission could not be read. Please refresh the page and try again.',
};

type PaddleCheckoutOpenOptions = {
  product: number;
  email?: string;
  coupon?: string;
  successCallback?: () => void;
};

type PaddleGlobal = {
  Checkout: {
    open(opts: PaddleCheckoutOpenOptions): void;
  };
};

type TurnstileGlobal = {
  render(
    container: HTMLElement | string,
    options: { sitekey: string; theme?: 'light' | 'dark' | 'auto' },
  ): string;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
    turnstile?: TurnstileGlobal;
    onloadTurnstileCallback?: () => void;
  }
}

const UpgradeForm: Component<Props> = (props) => {
  const [file, setFile] = createSignal<File | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [result, setResult] = createSignal<SuccessResponse | null>(null);
  const [checkedOut, setCheckedOut] = createSignal(false);
  const [dragHover, setDragHover] = createSignal(false);
  const [copied, setCopied] = createSignal(false);

  let turnstileContainer: HTMLDivElement | undefined;
  let turnstileWidgetId: string | undefined;

  onMount(() => {
    const renderWidget = () => {
      if (!turnstileContainer || !window.turnstile) return;
      turnstileWidgetId = window.turnstile.render(turnstileContainer, {
        sitekey: props.turnstileSiteKey,
      });
    };
    if (window.turnstile) {
      renderWidget();
    } else {
      window.onloadTurnstileCallback = renderWidget;
    }
  });

  onCleanup(() => {
    if (turnstileWidgetId && window.turnstile) {
      window.turnstile.remove(turnstileWidgetId);
    }
  });

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
      const res = await fetch('/api/upgrade-request/', { method: 'POST', body: fd });
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
      product: Number(props.paddleProductId),
      email: data.suggestedEmail ?? undefined,
      coupon: data.couponCode,
      successCallback: () => setCheckedOut(true),
    });
  };

  const copyCode = async () => {
    const data = result();
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — user can still select manually */
    }
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

          <div class="upgrade__turnstile" ref={turnstileContainer} />

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
              You qualify for <strong>{data().discountPercent}% off</strong> ColorSnapper. Use the
              one-time code below — you'll enter your email at the next step.
            </p>
            <div class="upgrade__coupon">
              <code class="upgrade__coupon-code">{data().couponCode}</code>
              <button type="button" class="upgrade__coupon-copy" onClick={copyCode}>
                {copied() ? 'Copied' : 'Copy'}
              </button>
            </div>
            <Show when={data().dateMissing}>
              <p>
                <em>
                  We could not read the purchase date on your receipt, so we applied our minimum
                  discount. Email support if you think you qualified for more.
                </em>
              </p>
            </Show>
            <button type="button" class="upgrade__submit" onClick={openCheckout}>
              Continue to checkout
            </button>
            <p class="upgrade__coupon-hint">
              Not ready to check out? Copy the code — it works once, anytime in the next 7 days.
            </p>
            <aside class="upgrade__why">
              <h3>Why we're asking you to pay something</h3>
              <p>
                Apple blocked further updates to the Mac App Store version, claiming
                we were misusing their Screen Recording API (we weren't, and nothing
                in the app had changed). Keeping ColorSnapper alive on modern macOS
                meant rewriting the whole app for distribution outside the store —
                months of engineering work, plus ongoing support, notarization, and
                hosting fees. What you pay here is what keeps ColorSnapper actively
                maintained: bug fixes, support for new macOS versions, and the next
                round of features.
              </p>
            </aside>
          </section>
        )}
      </Show>

      <Show when={checkedOut()}>
        <section class="upgrade__result">
          <h2>Thanks!</h2>
          <p>
            We've sent your license to the email you provided at checkout. If you don't see it
            shortly, check your spam folder, then email support.
          </p>
        </section>
      </Show>
    </>
  );
};

export default UpgradeForm;
