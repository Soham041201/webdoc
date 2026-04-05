---
title: "jsonplaceholder.typicode.com API Documentation"
source: "https://jsonplaceholder.typicode.com/"
generated: "2026-04-04T11:43:17.215Z"
total_calls: 2
unique_endpoints: 2
session_duration: "2m 13s"
pages_explored:
  - "/posts"
  - "/comments"
  - "/albums"
  - "/photos"
  - "/todos"
  - "/users"
  - "Run script"
  - "/posts/1"
generator: "WebDoc Agent"
---
# API Documentation

Source: https://jsonplaceholder.typicode.com/
Observed calls: 2
Grouped endpoints: 2

## Security Signals

- **cors** `access-control-allow-credentials` — CORS response header observed. (low)
- **cors** `access-control-allow-methods` — CORS response header observed. (low)
- **cors** `access-control-allow-origin` — CORS response header observed. (low)
- **security-header** `x-content-type-options` — Security-related response header observed. (low)

## Endpoints

### POST /cdn-cgi/rum

- **Operation:** createCdnCgi
- **Resource group:** cdn-cgi
- **Observed calls:** 1
- **Statuses:** 204
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
{
  "memory": {
    "totalJSHeapSize": "integer",
    "usedJSHeapSize": "integer",
    "jsHeapSizeLimit": "integer"
  },
  "resources": [
    "unknown"
  ],
  "referrer": "string",
  "eventType": "integer",
  "firstPaint": "integer",
  "firstContentfulPaint": "integer",
  "startTime": "number",
  "versions": {
    "fl": "string<jwt>",
    "js": "string<jwt>",
    "timings": "integer"
  },
  "pageloadId": "string<uuid>",
  "location": "string<url>",
  "nt": "string",
  "timingsV2": {
    "nextHopProtocol": "string",
    "domainLookupStart": "number",
    "domainLookupEnd": "number",
    "connectStart": "number",
    "connectEnd": "number",
    "requestStart": "number",
    "responseStart": "number",
    "responseEnd": "number",
    "domInteractive": "number",
    "domComplete": "number",
    "loadEventStart": "number",
    "loadEventEnd": "number",
    "finalResponseHeadersStart": "number",
    "firstInterimResponseStart": "integer",
    "transferSize": "integer",
    "decodedBodySize": "integer"
  },
  "dt": "string",
  "siteToken": "string",
  "st": "integer"
}
```
- **Security signals:**
  - cors: access-control-allow-credentials (low)
  - cors: access-control-allow-methods (low)
  - cors: access-control-allow-origin (low)

### GET /todos/{id}

- **Operation:** getTodo
- **Resource group:** todos
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** detail / unknown
- **Request headers:**
  - `accept-language`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `user-agent`
- **Response schema:**
```json
{
  "userId": "integer",
  "id": "integer",
  "title": "string",
  "completed": "boolean"
}
```
- **Security signals:**
  - cors: access-control-allow-credentials (low)
  - security-header: x-content-type-options (low)
