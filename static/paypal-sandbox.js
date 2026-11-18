/* PayPal Sandbox subscriber test: buyer goes through checkout, then server verifies.
   No real money, account registration or production entitlement. */
(function () {
"use strict";
const statusEl = document.getElementById("paypalSandboxStatus");
const container = document.getElementById("paypalSandboxButton");
const plansTrigger = document.getElementById("subscriptionNav");
const refreshButton = document.getElementById("paypalSandboxRefresh");
if (!statusEl || !container || !plansTrigger) return;

let initializing = null;
let rendered = false;
function status(message) { statusEl.textContent = String(message || ""); }

async function jsonResponse(path, options) {
  const response = await fetch(path, options || {cache:"no-store"});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || "PayPal Sandbox is temporarily unavailable.");
  return data;
}
function sdk(clientId) {
  return new Promise((resolve,reject) => {
    if (window.paypal?.Buttons) { resolve(window.paypal); return; }
    const src = new URL("https://www.paypal.com/sdk/js");
    src.searchParams.set("client-id", clientId);
    src.searchParams.set("vault","true");
    src.searchParams.set("intent","subscription");
    src.searchParams.set("components","buttons");
    const script = document.createElement("script");
    script.src = src.href;
    script.async = true;
    script.onload = () => window.paypal?.Buttons ? resolve(window.paypal)
      : reject(new Error("PayPal SDK did not load. Check your Sandbox Client ID."));
    script.onerror = () => reject(new Error("Unable to load PayPal. Check browser extensions or your connection."));
    document.head.appendChild(script);
  });
}

async function verify(subscriptionID) {
  status("Checking your subscription directly with PayPal Sandbox…");
  try {
    const result = await jsonResponse("/api/paypal/sandbox-verify", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({subscription_id: subscriptionID})
    });
    if (result.test_premium_active) {
      status("✓ Sandbox subscription ACTIVE. Your Premium TEST workspace is now unlocked. No real money was charged.");
      container.replaceChildren();
      rendered = true;
      window.dispatchEvent(new Event("alenaz:sandbox-entitlement-changed"));
    } else {
      status("PayPal reports: "+(result.status || "PENDING")+
        ". Premium stays locked until the test subscription becomes ACTIVE. Tap Refresh status in a moment.");
    }
  } catch(error) { status(error.message || "Could not verify your Sandbox subscription."); }
}
async function updateStatus() {
  try {
    const result = await jsonResponse("/api/paypal/sandbox-entitlement", {cache:"no-store"});
    if (result.test_premium_active) {
      status("✓ Verified Premium TEST is active for this browser. No real money was charged.");
      container.replaceChildren();
      rendered = true;
      window.dispatchEvent(new Event("alenaz:sandbox-entitlement-changed"));
      return true;
    }
  } catch(error) {
    status(error.message || "Unable to refresh Sandbox test subscription.");
  }
  return false;
}

async function initialize() {
  if (rendered) return;
  if (await updateStatus()) return;
  status("Checking PayPal Sandbox merchant and plan settings…");
  try {
    const config = await jsonResponse("/api/paypal/sandbox-config", {cache:"no-store"});
    if (!config.enabled) {
      if (config.mode === "sandbox" && Array.isArray(config.missing) && config.missing.length) {
        status("Missing Vercel Preview settings: "+config.missing.join(", ")+". Redeploy after fixing them.");
      } else {
        status(config.message || "Sandbox is not ready. Check Sandbox app credentials and plan.");
      }
      return;
    }
    if (config.mode !== "sandbox" || !/^P-[A-Z0-9]{12,60}$/.test(config.plan_id)) {
      throw new Error("This plan is not configured for PayPal Sandbox.");
    }
    const paypal = await sdk(config.client_id);
    const buttons = paypal.Buttons({
      style:{shape:"pill",color:"blue",layout:"vertical",label:"subscribe"},
      createSubscription: async function(data,actions) {
        const session = await jsonResponse("/api/paypal/sandbox-start", {
          method:"POST",headers:{"Content-Type":"application/json"},body:"{}"
        });
        if (!session.checkout_ref) throw new Error("Couldn't start a protected test checkout session.");
        return actions.subscription.create({
          plan_id:config.plan_id,
          custom_id:session.checkout_ref
        });
      },
      onApprove: function(data) {
        if (!/^I-[A-Z0-9]{6,45}$/.test(data?.subscriptionID || "")) {
          status("PayPal returned an invalid test subscription reference.");
          return;
        }
        return verify(data.subscriptionID);
      },
      onCancel: () => status("Test checkout canceled. Premium remains locked."),
      onError: () => status("PayPal Sandbox payment wasn't completed or couldn't be verified. Premium remains locked.")
    });
    if (!buttons?.isEligible?.()) {
      status("PayPal test checkout is not supported for this browser or Sandbox buyer.");
      return;
    }
    await buttons.render("#paypalSandboxButton");
    rendered = true;
    status("Test checkout ready · $9.99/month in Sandbox only. Use a PayPal Sandbox PERSONAL buyer account.");
  } catch(error) {
    status(error.message || "Unable to prepare PayPal Sandbox checkout.");
  }
}
plansTrigger.addEventListener("click", () => {
  if (!initializing && !rendered) {
    initializing = initialize().finally(() => { initializing = null; });
  } else { void updateStatus(); }
});
refreshButton?.addEventListener("click", () => { void updateStatus(); });
})();
