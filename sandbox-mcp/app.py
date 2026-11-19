"""Private MCP server for Alenaz PayPal Sandbox (NEVER production PayPal).

HTTPS API-key authentication; PayPal merchant secrets stay server-side.
All PayPal requests use the fixed api-m.sandbox.paypal.com host only.
"""
import base64
import json
import os
import re
import secrets
import urllib.error
import urllib.request
from flask import Flask, request, jsonify, Response

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024

PAYPAL_SANDBOX = "https://api-m.sandbox.paypal.com"
PLAN_ID_RE = re.compile(r"^P-[A-Z0-9]{12,60}$")
REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9_-]{12,64}$")

def merchant_ready():
    return bool(os.getenv("PAYPAL_CLIENT_ID") and os.getenv("PAYPAL_CLIENT_SECRET"))

def paypal(path, *, token=None, method="GET", payload=None, request_id=None):
    if not path.startswith("/v1/") or "//" in path or "?" in path or ".." in path:
        raise ValueError("Unsupported Sandbox API path.")
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    else:
        client, secret = os.getenv("PAYPAL_CLIENT_ID","").strip(), os.getenv("PAYPAL_CLIENT_SECRET","").strip()
        if not client or not secret:
            raise ValueError("PayPal Sandbox credentials not configured in this server.")
        headers["Authorization"] = "Basic " + base64.b64encode((client+":"+secret).encode()).decode("ascii")
    body = None
    if payload is not None:
        if path == "/v1/oauth2/token":
            headers["Content-Type"] = "application/x-www-form-urlencoded"
            body = b"grant_type=client_credentials"
        else:
            headers["Content-Type"] = "application/json"
            body = json.dumps(payload, separators=(",",":")).encode()
    if request_id:
        if not REQUEST_ID_RE.fullmatch(request_id):
            raise ValueError("Invalid idempotency reference.")
        headers["PayPal-Request-Id"] = request_id
    req = urllib.request.Request(PAYPAL_SANDBOX + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=13) as response:
            raw = response.read(131073)
        if len(raw) > 131072:
            raise ValueError("Sandbox returned an oversized response.")
        return json.loads(raw)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        # Do not expose raw provider errors containing account details.
        raise ValueError("PayPal Sandbox request failed. Check the Sandbox app, merchant and plan settings.") from exc

def sandbox_token():
    result = paypal("/v1/oauth2/token", method="POST", payload={})
    token = result.get("access_token")
    if not isinstance(token, str) or not token:
        raise ValueError("PayPal Sandbox did not return an access token.")
    return token

def text_result(value, error=False):
    return {"content":[{"type":"text","text":json.dumps(value,separators=(",",":"),ensure_ascii=False)}],
            "isError":error}

TOOLS = [
    {
        "name":"check_sandbox_connection",
        "description":"Check whether the PayPal Sandbox app credentials can authenticate. Never contacts Live PayPal.",
        "inputSchema":{"type":"object","properties":{},"additionalProperties":False},
        "annotations":{"readOnlyHint":True,"destructiveHint":False}
    },
    {
        "name":"inspect_sandbox_plan",
        "description":"Read the status and monthly pricing of an existing PayPal Sandbox billing plan.",
        "inputSchema":{"type":"object","properties":{"plan_id":{"type":"string","pattern":"^P-[A-Z0-9]{12,60}$"}},
                       "required":["plan_id"],"additionalProperties":False},
        "annotations":{"readOnlyHint":True,"destructiveHint":False}
    },
    {
        "name":"create_alenaz_premium_sandbox_plan",
        "description":"Create ONE Sandbox service product and a fixed USD 9.99/month plan for Alenaz. Test account only; user must explicitly approve creation. Never creates real charges.",
        "inputSchema":{"type":"object","properties":{
            "confirm_sandbox_creation":{"type":"boolean","description":"Must be true after explicit user confirmation."},
            "idempotency_key":{"type":"string","pattern":"^[A-Za-z0-9_-]{12,56}$",
                               "description":"Stable unique reference reused on retries to prevent duplicate products/plans."}},
            "required":["confirm_sandbox_creation","idempotency_key"],"additionalProperties":False},
        "annotations":{"readOnlyHint":False,"destructiveHint":False,"idempotentHint":True}
    }
]

def invoke_tool(name,args):
    if not isinstance(args,dict):
        raise ValueError("Tool arguments must be an object.")
    if name=="check_sandbox_connection":
        if args:
            raise ValueError("No arguments expected.")
        if not merchant_ready():
            return {"sandbox_connected":False,"setup_required":"PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET on the MCP server","real_money":False}
        sandbox_token()
        return {"sandbox_connected":True,"real_money":False,"environment":"sandbox"}
    if name=="inspect_sandbox_plan":
        if set(args)!={"plan_id"} or not isinstance(args["plan_id"],str) or not PLAN_ID_RE.fullmatch(args["plan_id"]):
            raise ValueError("Valid plan_id is required.")
        plan = paypal("/v1/billing/plans/"+args["plan_id"],token=sandbox_token())
        return {"sandbox":True,"plan_id":plan.get("id"),"status":plan.get("status"),
                "name":plan.get("name"),"cycles":plan.get("billing_cycles"),"real_money":False}
    if name=="create_alenaz_premium_sandbox_plan":
        if set(args)!={"confirm_sandbox_creation","idempotency_key"} or args["confirm_sandbox_creation"] is not True:
            raise ValueError("You must explicitly confirm the Sandbox product and plan creation.")
        key=args["idempotency_key"]
        if not isinstance(key,str) or not re.fullmatch(r"[A-Za-z0-9_-]{12,56}",key):
            raise ValueError("Provide a stable idempotency_key (12-56 characters).")
        token=sandbox_token()
        product=paypal("/v1/catalogs/products",method="POST",token=token,request_id=key+"-product",payload={
            "name":"Alenaz AI Premium",
            "description":"Premium AI test tools, personalization and creative features.",
            "type":"SERVICE",
            "home_url":"https://alenaz-ai.vercel.app"
        })
        product_id=product.get("id","")
        if not re.fullmatch(r"PROD-[A-Z0-9]{6,40}",product_id):
            raise ValueError("PayPal Sandbox did not return a valid product ID.")
        plan=paypal("/v1/billing/plans",method="POST",token=token,request_id=key+"-plan",payload={
            "product_id":product_id,
            "name":"Alenaz Premium",
            "description":"Alenaz Premium $9.99/month — PayPal Sandbox TEST plan.",
            "status":"ACTIVE",
            "billing_cycles":[{
                "frequency":{"interval_unit":"MONTH","interval_count":1},
                "tenure_type":"REGULAR","sequence":1,"total_cycles":0,
                "pricing_scheme":{"fixed_price":{"value":"9.99","currency_code":"USD"}}
            }],
            "payment_preferences":{
                "auto_bill_outstanding":True,
                "setup_fee":{"value":"0","currency_code":"USD"},
                "setup_fee_failure_action":"CONTINUE",
                "payment_failure_threshold":3
            }
        })
        plan_id=plan.get("id","")
        if not PLAN_ID_RE.fullmatch(plan_id):
            raise ValueError("PayPal Sandbox did not return a valid plan ID.")
        return {"sandbox":True,"real_money":False,"product_id":product_id,"plan_id":plan_id,
                "status":plan.get("status"),"monthly_usd":"9.99",
                "next_step":"Set PAYPAL_PREMIUM_PLAN_ID in Alenaz Preview and redeploy."}
    raise ValueError("Unknown tool.")

@app.after_request
def security_headers(r):
    r.headers["Cache-Control"]="no-store"
    r.headers["X-Content-Type-Options"]="nosniff"
    r.headers["Referrer-Policy"]="no-referrer"
    return r

@app.get("/")
def info():
    return jsonify({"name":"Alenaz PayPal Sandbox MCP","sandbox_only":True,"accepts_real_payments":False,
                    "mcp_path":"/mcp","connected":False})

@app.get("/healthz")
def healthz():
    return jsonify({"ok":True,"sandbox_only":True,"paypal_credentials_configured":merchant_ready(),
                    "access_token_configured":bool(os.getenv("ALENAZ_MCP_ACCESS_TOKEN"))})

@app.route("/mcp",methods=["GET","POST","DELETE"])
def mcp():
    access_key=os.getenv("ALENAZ_MCP_ACCESS_TOKEN","")
    supplied=request.headers.get("Authorization","")
    if len(access_key)<32 or not secrets.compare_digest(supplied,"Bearer "+access_key):
        return Response(json.dumps({"error":"Authentication required."}),status=401,
                        mimetype="application/json",
                        headers={"WWW-Authenticate":'Bearer realm="Alenaz Sandbox MCP"'})
    origin=request.headers.get("Origin")
    if origin and origin not in {"https://chatgpt.com","https://chat.openai.com"}:
        return jsonify({"error":"Origin not allowed."}),403
    if request.method=="GET":
        return Response(status=405,headers={"Allow":"POST"})
    if request.method=="DELETE":
        return Response(status=405,headers={"Allow":"POST"})
    if not request.is_json:
        return jsonify({"error":"JSON Content-Type required."}),415
    payload=request.get_json(silent=True)
    if not isinstance(payload,dict) or payload.get("jsonrpc")!="2.0":
        return jsonify({"jsonrpc":"2.0","id":None,"error":{"code":-32600,"message":"Invalid Request"}}),400
    if "id" not in payload:
        return Response(status=202)
    ident=payload["id"]
    method=payload.get("method")
    params=payload.get("params") or {}
    try:
        if method=="initialize":
            # Stateless MCP transport; no cookies or session identifiers.
            result={
                "protocolVersion":"2025-11-25",
                "capabilities":{"tools":{"listChanged":False}},
                "serverInfo":{"name":"alenaz-paypal-sandbox","version":"0.2.0"},
                "instructions":"Sandbox only; authenticate using the secret configured in the plugin connection. Never use Live PayPal. Confirm before creating a test plan."
            }
        elif method=="ping":
            result={}
        elif method=="tools/list":
            result={"tools":TOOLS}
        elif method=="tools/call":
            if not isinstance(params,dict) or not isinstance(params.get("name"),str):
                raise ValueError("Tool name is required.")
            try:
                result=text_result(invoke_tool(params["name"],params.get("arguments") or {}))
            except ValueError as err:
                result=text_result({"error":str(err)},error=True)
        else:
            return jsonify({"jsonrpc":"2.0","id":ident,"error":{"code":-32601,"message":"Method not found"}})
        return jsonify({"jsonrpc":"2.0","id":ident,"result":result})
    except Exception:
        # Never return secrets, traces or provider response bodies.
        return jsonify({"jsonrpc":"2.0","id":ident,"error":{"code":-32603,"message":"Sandbox server error"}}),500

if __name__=="__main__":
    app.run(port=5051,debug=False)
