/* Sandbox-only checkout: no real charges and no paid entitlement changes. */
(function () {
  "use strict";
  const statusEl = document.getElementById("paypalSandboxStatus");
  const container = document.getElementById("paypalSandboxButton");
  const plansTrigger = document.getElementById("subscriptionNav");
  if (!statusEl || !container || !plansTrigger) return;
  let initializing = null;
  let rendered = false;

  function setStatus(message) {
    statusEl.textContent = String(message || "");
  }

  function loadSdk(clientId) {
    return new Promise(function (resolve, reject) {
      const src = new URL("https://www.paypal.com/sdk/js");
      src.searchParams.set("client-id", clientId);
      src.searchParams.set("vault", "true");
      src.searchParams.set("intent", "subscription");
      src.searchParams.set("components", "buttons");
      const script = document.createElement("script");
      script.src = src.href;
      script.async = true;
      script.onload = function () {
        if (window.paypal?.Buttons) resolve(window.paypal);
        else reject(new Error("PayPal Sandbox SDK did not load."));
      };
      script.onerror = function () { reject(new Error("Couldn't load PayPal's SDK. Check your browser or connection.")); };
      document.head.appendChild(script);
    });
  }

  async function checkSubscription(subscriptionID) {
    setStatus("Asking PayPal Sandbox to verify this test subscription…");
    try {
      const response = await fetch("/api/paypal/sandbox-verify", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({subscription_id: subscriptionID})
      });
      const body = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(body.error || "Sandbox subscription verification failed.");
      setStatus(body.message || "Sandbox check finished. No real Premium access was activated.");
    } catch (err) {
      setStatus(err.message || "Couldn't verify the Sandbox subscription.");
    }
  }

  async function initialize() {
    if (rendered) return;
    setStatus("Checking Sandbox setup…");
    try {
      const response = await fetch("/api/paypal/sandbox-config", {cache: "no-store"});
      if (!response.ok) throw new Error("Unable to read Sandbox settings.");
      const config = await response.json();
      if (!config.enabled) {
        if (config.mode === "sandbox" && Array.isArray(config.missing) && config.missing.length) {
          setStatus("Setup needed: add " + config.missing.join(", ") +
                    " to Vercel Preview and redeploy. The plan ID must be from PayPal Sandbox, not Live.");
        } else {
          setStatus("Sandbox checkout is disabled. Only Preview deployments with PAYPAL_MODE=sandbox can use it.");
        }
        return;
      }
      if (config.mode !== "sandbox" || !/^P-[A-Z0-9]{12,60}$/.test(config.plan_id)) {
        throw new Error("Sandbox configuration is invalid. Checkout stays disabled.");
      }
      const sdk = await loadSdk(config.client_id);
      const buttons = sdk.Buttons({
        style: {shape: "pill", color: "blue", layout: "vertical", label: "subscribe"},
        createSubscription: function (data, actions) {
          return actions.subscription.create({plan_id: config.plan_id});
        },
        onApprove: function (data) {
          if (!data || !/^I-[A-Z0-9]{6,45}$/.test(data.subscriptionID || "")) {
            setStatus("PayPal returned an unexpected test subscription ID.");
            return;
          }
          return checkSubscription(data.subscriptionID);
        },
        onCancel: function () {
          setStatus("Sandbox checkout canceled. Nothing was charged.");
        },
        onError: function () {
          setStatus("PayPal Sandbox checkout encountered an error. No Premium access was unlocked.");
        }
      });
      if (!buttons?.isEligible?.()) {
        setStatus("PayPal Sandbox buttons aren't available in this browser or for this test account.");
        return;
      }
      await buttons.render("#paypalSandboxButton");
      rendered = true;
      setStatus("Sandbox ready. Use a TEST buyer account from PayPal Developer, not your real PayPal account.");
    } catch (err) {
      setStatus(err.message || "PayPal Sandbox checkout could not initialize.");
    }
  }

  plansTrigger.addEventListener("click", function () {
    if (!initializing || !rendered) {
      initializing = initialize().finally(function () { initializing = null; });
    }
  });
})();
