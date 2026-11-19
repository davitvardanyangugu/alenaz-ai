# Alenaz free LTX ZeroGPU experiment

Candidate: https://huggingface.co/spaces/amisima/LTX-2.3-Studio

Hugging Face's curated workflow registry reported this ZeroGPU Space as OK on 2026-11-05 with a `/generate` endpoint. That is a registry validation, **not** a verified successful video request from Alenaz.

## Run read-only verification

```bash
python scripts/probe_free_ltx.py
```

The script checks the Space runtime and Gradio OpenAPI endpoint without sending generation jobs or using API credits. It fails closed if the schema is inaccessible or lacks a generation route.

## Not yet safe to enable

- Confirm the exact live Gradio input/output schema and queue behavior.
- Verify the Space owner's terms allow third-party app integration, not just interactive demo usage.
- Check the LTX model license and any attribution/commercial restrictions.
- Confirm output URLs and retention policy.
- Design per-user authentication, rate limits and abuse controls; do not share one Hugging Face account's daily quota among anonymous users.
- Implement stateless async submission and polling that survive Vercel serverless invocations.
- Perform a consented test generation under the free quota.
- Keep paid generation and production deployment disabled.

The existing Alenaz production application is unchanged by this experiment.
