---
title: "www.reddit.com API Documentation"
source: "https://www.reddit.com"
generated: "2026-04-04T11:52:31.729Z"
total_calls: 9
unique_endpoints: 9
session_duration: "3m 35s"
pages_explored:
  - "Home"
  - "US fighter jet shot down US fighter jet shot down over Iran, US sources say r/po"
  - "WH defense budget request White House requests giant $1.5 trillion defense budge"
  - "March jobs report March jobs report: US economy adds 178,000 jobs, unemployment "
  - "Artemis II NASA photo “Hello, World”: NASA releases new high-res images of our h"
  - "Aragorn to be recast Aragorn’s Recast In New Lord Of The Rings Movie Officially "
  - "Animorphs series in the works ‘Animorphs’ TV Series in Development at Disney+, R"
  - "Match Thread: 8th Match - Delhi Capitals vs Mumbai Indians"
generator: "WebDoc Agent"
---
# API Documentation

Source: https://www.reddit.com
Observed calls: 9
Grouped endpoints: 9

## Security Signals

- **security-header** `content-security-policy` — Security-related response header observed. (low)
- **security-header** `strict-transport-security` — Security-related response header observed. (low)
- **security-header** `x-content-type-options` — Security-related response header observed. (low)
- **security-header** `x-frame-options` — Security-related response header observed. (low)
- **cors** `access-control-allow-headers` — CORS response header observed. (low)
- **cors** `access-control-allow-methods` — CORS response header observed. (low)
- **cors** `access-control-allow-origin` — CORS response header observed. (low)
- **session-cookie** `cookie` — Cookie-based session or tracking header observed. (medium)

## Endpoints

### GET /policy

- **Operation:** getPolicy
- **Resource group:** policy
- **Observed calls:** 1
- **Statuses:** 204
- **Classification:** detail / unknown
- **Request headers:**
  - `accept-language`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `user-agent`
- **Security signals:**
  - cors: access-control-allow-methods (low)
  - cors: access-control-allow-origin (low)
  - cors: access-control-allow-headers (low)

### POST /reports

- **Operation:** createReport
- **Resource group:** reports
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** create / unknown
- **Request headers:**
  - `accept-language`
  - `content-type`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `user-agent`
- **Request schema:**
```json
[
  {
    "age": "integer",
    "type": "string<slug>",
    "url": "string",
    "user_agent": "string",
    "body": {
      "sampling_fraction": "integer",
      "type": "string",
      "name": "string",
      "value": "integer",
      "labels": {
        "auth_state": "string",
        "browser": "string",
        "deployment_type": "string",
        "device_type": "string",
        "page_type": "string",
        "referrer_type": "string",
        "xpromo_name": "string"
      }
    }
  }
]
```
- **Security signals:**
  - cors: access-control-allow-headers (low)
  - cors: access-control-allow-methods (low)
  - cors: access-control-allow-origin (low)
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)

### GET /svc/shreddit/{token}

- **Operation:** getSvc
- **Resource group:** svc
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** detail / unknown
- **Request headers:**
  - `accept`
  - `accept-language`
  - `content-type`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `user-agent`
  - `x-reddit-client-version`
  - `x-reddit-retry`
- **Security signals:**
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)
  - security-header: x-frame-options (low)

### POST /svc/shreddit/events

- **Operation:** createSvc
- **Resource group:** svc
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** create / unknown
- **Request headers:**
  - `accept-language`
  - `content-type`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `user-agent`
  - `x-sh-fe-end-timestamp`
  - `x-sh-microapp-route`
- **Security signals:**
  - security-header: content-security-policy (low)
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)
  - security-header: x-frame-options (low)

### POST /svc/shreddit/graphql

- **Operation:** createSvc
- **Resource group:** svc
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** create / unknown
- **Request headers:**
  - `:authority`
  - `:method`
  - `:path`
  - `:scheme`
  - `accept`
  - `accept-encoding`
  - `accept-language`
  - `content-length`
  - `content-type`
  - `cookie` (sensitive)
  - `origin`
  - `priority`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `sec-fetch-dest`
  - `sec-fetch-mode`
  - `sec-fetch-site`
  - `user-agent`
- **Request schema:**
```json
{
  "operation": "string",
  "variables": {
    "input": {
      "experimentName": "string",
      "variant": "string",
      "experimentVersion": "string"
    }
  },
  "csrf_token": "string"
}
```
- **Response schema:**
```json
{
  "data": {
    "exposeExperiment": {
      "ok": "boolean",
      "errors": "null"
    }
  },
  "errors": [
    "unknown"
  ],
  "operation": "string"
}
```
- **Security signals:**
  - session-cookie: cookie (medium)
  - security-header: content-security-policy (low)
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)
  - security-header: x-frame-options (low)

### GET /svc/shreddit/partial/J7VVLM/common-left-nav

- **Operation:** getSvc
- **Resource group:** svc
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** detail / unknown
- **Query params:**
  - `data` (string) example: {"selectedPageType":"popular"}
  - `sig` (string) example: v1.NnTFgE5YTm5RToaKRvZVrT7rpKOvcCMWuc4VQj3jpTI
- **Request headers:**
  - `:authority`
  - `:method`
  - `:path`
  - `:scheme`
  - `accept`
  - `accept-encoding`
  - `accept-language`
  - `content-type`
  - `cookie` (sensitive)
  - `priority`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `sec-fetch-dest`
  - `sec-fetch-mode`
  - `sec-fetch-site`
  - `user-agent`
  - `x-reddit-client-version`
  - `x-reddit-retry`
- **Security signals:**
  - session-cookie: cookie (medium)
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)
  - security-header: x-frame-options (low)

### POST /svc/shreddit/set-session-storage

- **Operation:** postAuthAction
- **Resource group:** svc
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** auth / unknown
- **Request headers:**
  - `:authority`
  - `:method`
  - `:path`
  - `:scheme`
  - `accept`
  - `accept-encoding`
  - `accept-language`
  - `content-length`
  - `content-type`
  - `cookie` (sensitive)
  - `origin`
  - `priority`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `sec-fetch-dest`
  - `sec-fetch-mode`
  - `sec-fetch-site`
  - `user-agent`
- **Request schema:**
```json
{
  "csrf_token": "string",
  "data": [
    {
      "key": "string",
      "value": "string"
    }
  ]
}
```
- **Response schema:**
```json
{
  "success": "boolean"
}
```
- **Security signals:**
  - session-cookie: cookie (medium)
  - security-header: content-security-policy (low)
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)
  - security-header: x-frame-options (low)

### GET /svc/shreddit/styling-overrides

- **Operation:** getSvc
- **Resource group:** svc
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** detail / unknown
- **Query params:**
  - `v` (integer) example: 0
- **Request headers:**
  - `accept-language`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `user-agent`
- **Response schema:**
```json
[
  "unknown"
]
```
- **Security signals:**
  - security-header: content-security-policy (low)
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)
  - security-header: x-frame-options (low)

### GET /svc/shreddit/update-recaptcha

- **Operation:** getSvc
- **Resource group:** svc
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** detail / unknown
- **Query params:**
  - `k` (string) example: cG9wdWxhcnxpbml0aWFsfGRkNjRlYjVkLWRmNzItNGVkNy1hNmExLWE0YTdlNmY4ODIwZg
- **Request headers:**
  - `:authority`
  - `:method`
  - `:path`
  - `:scheme`
  - `accept`
  - `accept-encoding`
  - `accept-language`
  - `cookie` (sensitive)
  - `priority`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `sec-fetch-dest`
  - `sec-fetch-mode`
  - `sec-fetch-site`
  - `user-agent`
- **Security signals:**
  - session-cookie: cookie (medium)
  - security-header: content-security-policy (low)
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)
  - security-header: x-frame-options (low)
