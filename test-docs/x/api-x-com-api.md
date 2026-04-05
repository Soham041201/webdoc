---
title: "api.x.com API Documentation"
source: "https://x.com"
generated: "2026-04-04T12:09:29.821Z"
total_calls: 20
unique_endpoints: 20
session_duration: "3m 19s"
pages_explored:
  - "News"
  - "Create account"
  - "Sign in"
  - "Sign up with Apple"
  - "Settings"
  - "Advertising"
  - "Developers"
  - "Download the X app"
generator: "WebDoc Agent"
---
# API Documentation

Source: https://x.com
Observed calls: 20
Grouped endpoints: 20

## Security Signals

- **auth-header** `authorization` — Authorization header observed on request. (medium)
- **cors** `access-control-allow-credentials` — CORS response header observed. (low)
- **cors** `access-control-allow-origin` — CORS response header observed. (low)
- **security-header** `strict-transport-security` — Security-related response header observed. (low)
- **security-header** `x-content-type-options` — Security-related response header observed. (low)
- **security-header** `x-frame-options` — Security-related response header observed. (low)
- **cors** `access-control-allow-headers` — CORS response header observed. (low)
- **cors** `access-control-allow-methods` — CORS response header observed. (low)
- **session-cookie** `cookie` — Cookie-based session or tracking header observed. (medium)
- **security-header** `content-security-policy` — Security-related response header observed. (low)
- **csrf-header** `x-csrf-token` — CSRF/XSRF protection header observed. (medium)

## Endpoints

### GET /1.1/account/personalization/p13n_preferences.json

- **Operation:** get11
- **Resource group:** 1.1
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** detail / unknown
- **Request headers:**
  - `accept-language`
  - `authorization` (sensitive)
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `user-agent`
  - `x-client-transaction-id`
  - `x-guest-token` (sensitive)
  - `x-twitter-active-user`
  - `x-twitter-client-language`
- **Response schema:**
```json
{
  "age_preferences": {
    "use_age_for_personalization": "boolean"
  },
  "gender_preferences": {
    "use_gender_for_personalization": "boolean"
  },
  "language_preferences": {
    "disabled_languages": [
      "unknown"
    ]
  },
  "location_preferences": {
    "use_location_for_personalization": "boolean",
    "override_times": [
      "unknown"
    ]
  },
  "interest_preferences": {
    "disabled_interests": [
      "unknown"
    ],
    "disabled_partner_interests": [
      "unknown"
    ]
  },
  "allow_ads_personalization": "boolean",
  "use_cookie_personalization": "boolean",
  "link_logged_out_devices": "boolean",
  "share_data_with_third_party": "boolean",
  "is_eu_country": "boolean"
}
```
- **Security signals:**
  - auth-header: authorization (medium)
  - cors: access-control-allow-credentials (low)
  - cors: access-control-allow-origin (low)
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)
  - security-header: x-frame-options (low)

### POST /1.1/account/personalization/sync_optout_settings.json

- **Operation:** create11
- **Resource group:** 1.1
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** create / unknown
- **Request headers:**
  - `accept-language`
  - `authorization` (sensitive)
  - `content-type`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `user-agent`
  - `x-client-transaction-id`
  - `x-guest-token` (sensitive)
  - `x-twitter-active-user`
  - `x-twitter-client-language`
- **Security signals:**
  - auth-header: authorization (medium)
  - cors: access-control-allow-credentials (low)
  - cors: access-control-allow-origin (low)
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)
  - security-header: x-frame-options (low)

### POST /1.1/graphql/ces/p2

- **Operation:** create11
- **Resource group:** 1.1
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** create / unknown
- **Request headers:**
  - `accept-language`
  - `authorization` (sensitive)
  - `content-type`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `user-agent`
  - `x-client-transaction-id`
  - `x-guest-token` (sensitive)
  - `x-twitter-active-user`
  - `x-twitter-client-language`
- **Request schema:**
```json
{
  "events": [
    {
      "sequenceStartTimestampMs": "number",
      "sequenceNumber": "integer",
      "createdAtMs": "number",
      "event": {
        "clientSpanMessage": {
          "v1": {
            "name": "string<slug>",
            "cesMetadata": {},
            "traceId": {
              "mostSignificantBits": "string",
              "leastSignificantBits": "string"
            },
            "spanId": "integer",
            "completionInfo": {
              "completionType": "integer"
            },
            "messageSequenceNumber": "string",
            "startTimeMicroseconds": "string",
            "stopTimeMicroseconds": "string"
          }
        }
      }
    }
  ],
  "header": {
    "createdAtMs": "number",
    "retryAttempt": "integer"
  }
}
```
- **Security signals:**
  - auth-header: authorization (medium)
  - cors: access-control-allow-credentials (low)
  - cors: access-control-allow-origin (low)
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)
  - security-header: x-frame-options (low)

### POST /1.1/graphql/user_flow.json

- **Operation:** create11
- **Resource group:** 1.1
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** create / unknown
- **Request headers:**
  - `accept-language`
  - `authorization` (sensitive)
  - `content-type`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `user-agent`
  - `x-client-transaction-id`
  - `x-guest-token` (sensitive)
  - `x-twitter-active-user`
  - `x-twitter-client-language`
- **Security signals:**
  - auth-header: authorization (medium)
  - cors: access-control-allow-credentials (low)
  - cors: access-control-allow-origin (low)
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)
  - security-header: x-frame-options (low)

### POST /1.1/guest/activate.json

- **Operation:** create11
- **Resource group:** 1.1
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** create / unknown
- **Request headers:**
  - `accept-language`
  - `authorization` (sensitive)
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `user-agent`
  - `x-csrf-token` (sensitive)
- **Response schema:**
```json
{
  "guest_token": "string"
}
```
- **Security signals:**
  - auth-header: authorization (medium)
  - csrf-header: x-csrf-token (medium)
  - cors: access-control-allow-credentials (low)
  - cors: access-control-allow-origin (low)
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)
  - security-header: x-frame-options (low)

### GET /1.1/hashflags.json

- **Operation:** get11
- **Resource group:** 1.1
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** detail / unknown
- **Request headers:**
  - `accept-language`
  - `authorization` (sensitive)
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `user-agent`
  - `x-client-transaction-id`
  - `x-guest-token` (sensitive)
  - `x-twitter-active-user`
  - `x-twitter-client-language`
- **Security signals:**
  - auth-header: authorization (medium)
  - cors: access-control-allow-credentials (low)
  - cors: access-control-allow-origin (low)

### POST /1.1/jot/client_event

- **Operation:** create11
- **Resource group:** 1.1
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** create / unknown
- **Query params:**
  - `log` (string) example: [{"context":"5RLSW2","event_namespace":{"client":"aem-business-en","page":"advertising","section":"page","component":"","element":"","action":"page-view"},"event_details":{"url":"https://business.x.com/en/advertising?ref=gl-tw-tw-twitter-advertise","triggered_on":"1775304501151","event_info":"gl-tw-tw-twitter-advertise"},"format_version":2,"_category_":"client_event"}]
  - `q` (integer) example: 1151
- **Request headers:**
  - `accept-language`
  - `authorization` (sensitive)
  - `content-type`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `user-agent`
  - `x-csrf-token` (sensitive)
  - `x-guest-token` (sensitive)
- **Security signals:**
  - auth-header: authorization (medium)
  - csrf-header: x-csrf-token (medium)
  - cors: access-control-allow-credentials (low)
  - cors: access-control-allow-origin (low)
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)
  - security-header: x-frame-options (low)

### POST /1.1/onboarding/callback.json

- **Operation:** create11
- **Resource group:** 1.1
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** create / unknown
- **Request headers:**
  - `accept-language`
  - `authorization` (sensitive)
  - `content-type`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `user-agent`
  - `x-client-transaction-id`
  - `x-guest-token` (sensitive)
  - `x-twitter-active-user`
  - `x-twitter-client-language`
- **Request schema:**
```json
{
  "product": "string<slug>",
  "identifier": "string<slug>",
  "params": "string",
  "timestampMs": "integer"
}
```
- **Security signals:**
  - auth-header: authorization (medium)
  - cors: access-control-allow-credentials (low)
  - cors: access-control-allow-origin (low)
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)
  - security-header: x-frame-options (low)

### POST /1.1/onboarding/sso_init.json

- **Operation:** create11
- **Resource group:** 1.1
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** create / unknown
- **Request headers:**
  - `accept-language`
  - `authorization` (sensitive)
  - `content-type`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `user-agent`
  - `x-client-transaction-id`
  - `x-guest-token` (sensitive)
  - `x-twitter-active-user`
  - `x-twitter-client-language`
- **Request schema:**
```json
{
  "provider": "string"
}
```
- **Response schema:**
```json
{
  "state": "string"
}
```
- **Security signals:**
  - auth-header: authorization (medium)
  - cors: access-control-allow-credentials (low)
  - cors: access-control-allow-origin (low)
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)
  - security-header: x-frame-options (low)

### POST /1.1/onboarding/task.json

- **Operation:** create11
- **Resource group:** 1.1
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** create / unknown
- **Query params:**
  - `flow_name` (string) example: signup
- **Request headers:**
  - `accept-language`
  - `authorization` (sensitive)
  - `content-type`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `user-agent`
  - `x-client-transaction-id`
  - `x-guest-token` (sensitive)
  - `x-twitter-active-user`
  - `x-twitter-client-language`
- **Request schema:**
```json
{
  "input_flow_data": {
    "flow_context": {
      "debug_overrides": {},
      "start_location": {
        "location": "string"
      }
    }
  },
  "subtask_versions": {
    "action_list": "integer",
    "alert_dialog": "integer",
    "app_download_cta": "integer",
    "check_logged_in_account": "integer",
    "choice_selection": "integer",
    "contacts_live_sync_permission_prompt": "integer",
    "cta": "integer",
    "email_verification": "integer",
    "end_flow": "integer",
    "enter_date": "integer",
    "enter_email": "integer",
    "enter_password": "integer",
    "enter_phone": "integer",
    "enter_recaptcha": "integer",
    "enter_text": "integer",
    "enter_username": "integer",
    "generic_urt": "integer",
    "in_app_notification": "integer",
    "interest_picker": "integer",
    "js_instrumentation": "integer",
    "menu_dialog": "integer",
    "notifications_permission_prompt": "integer",
    "open_account": "integer",
    "open_home_timeline": "integer",
    "open_link": "integer",
    "phone_verification": "integer",
    "privacy_options": "integer",
    "security_key": "integer",
    "select_avatar": "integer",
    "select_banner": "integer",
    "settings_list": "integer",
    "show_code": "integer",
    "sign_up": "integer",
    "sign_up_review": "integer",
    "tweet_selection_urt": "integer",
    "update_users": "integer",
    "upload_media": "integer",
    "user_recommendations_list": "integer",
    "user_recommendations_urt": "integer",
    "wait_spinner": "integer",
    "web_modal": "integer"
  }
}
```
- **Security signals:**
  - auth-header: authorization (medium)
  - cors: access-control-allow-credentials (low)
  - cors: access-control-allow-origin (low)
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)
  - security-header: x-frame-options (low)

### GET /api/features.js

- **Operation:** getApi
- **Resource group:** api
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** detail / unknown
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
  - security-header: strict-transport-security (low)
  - security-header: x-frame-options (low)

### GET /api/me

- **Operation:** getApi
- **Resource group:** api
- **Observed calls:** 1
- **Statuses:** 400
- **Classification:** detail / unknown
- **Request headers:**
  - `accept`
  - `accept-language`
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `user-agent`
  - `x-csrf-token` (sensitive)
- **Response schema:**
```json
{
  "errors": [
    {
      "message": "string",
      "code": "integer"
    }
  ]
}
```
- **Security signals:**
  - csrf-header: x-csrf-token (medium)
  - security-header: strict-transport-security (low)

### GET /bin/twitter/i18n.business3.en.json

- **Operation:** getBin
- **Resource group:** bin
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** detail / unknown
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
- **Response schema:**
```json
{}
```
- **Security signals:**
  - session-cookie: cookie (medium)
  - security-header: content-security-policy (low)
  - security-header: strict-transport-security (low)

### GET /en.model.json

- **Operation:** getEnModelJson
- **Resource group:** en.model.json
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** detail / unknown
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

### GET /en/advertising.model.json

- **Operation:** getEn
- **Resource group:** en
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
- **Security signals:**
  - security-header: content-security-policy (low)
  - security-header: strict-transport-security (low)

### GET /en/success-stories.atmosphere.search.json

- **Operation:** searchEn
- **Resource group:** en
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** search / unknown
- **Query params:**
  - `excludePath` (string) example: /content/business-twitter/en/advertising
  - `index` (string) example: /content/business-twitter
  - `isAscending` (boolean) example: false
  - `limit` (integer) example: 3
  - `matchAllTags` (boolean) example: false
  - `offset` (integer) example: 0
  - `orderBy` (string) example: @jcr:created
  - `tags` (string)
  - `type` (string) example: card
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
- **Response schema:**
```json
{
  "results": [
    {
      "image": "string",
      "attributes": {
        "data-route": "boolean",
        "target": "string",
        "data-section": "string"
      },
      "title": "string",
      "description": "string",
      "tags": [
        {
          "id": "string",
          "title": "string"
        }
      ],
      "url": "string"
    }
  ],
  "count": "integer",
  "totalResults": "integer"
}
```
- **Security signals:**
  - session-cookie: cookie (medium)
  - security-header: content-security-policy (low)
  - security-header: strict-transport-security (low)
  - security-header: x-content-type-options (low)
  - security-header: x-frame-options (low)

### GET /graphql/{token}/Viewer

- **Operation:** getGraphql
- **Resource group:** graphql
- **Observed calls:** 1
- **Statuses:** 404
- **Classification:** detail / unknown
- **Query params:**
  - `features` (string) example: {"subscriptions_upsells_api_enabled":false,"profile_label_improvements_pcf_label_in_post_enabled":true,"responsive_web_profile_redirect_enabled":false,"rweb_tipjar_consumption_enabled":false,"verified_phone_label_enabled":true,"creator_subscriptions_tweet_preview_api_enabled":true,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"responsive_web_graphql_timeline_navigation_enabled":true}
  - `fieldToggles` (string) example: {"isDelegate":false,"withAuxiliaryUserLabels":true}
  - `variables` (string) example: {"withCommunitiesMemberships":true}
- **Request headers:**
  - `:authority`
  - `:method`
  - `:path`
  - `:scheme`
  - `accept`
  - `accept-encoding`
  - `accept-language`
  - `authorization` (sensitive)
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
  - `x-client-transaction-id`
  - `x-guest-token` (sensitive)
  - `x-twitter-active-user`
  - `x-twitter-client-language`
- **Security signals:**
  - auth-header: authorization (medium)
  - session-cookie: cookie (medium)
  - cors: access-control-allow-credentials (low)
  - cors: access-control-allow-origin (low)
  - security-header: strict-transport-security (low)

### GET /i/jfapi/stories/home

- **Operation:** getI
- **Resource group:** i
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** detail / unknown
- **Request headers:**
  - `accept-language`
  - `authorization` (sensitive)
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `timezone`
  - `user-agent`
  - `x-client-transaction-id`
  - `x-guest-token` (sensitive)
  - `x-jf-client-theme`
  - `x-jf-v`
  - `x-twitter-active-user`
- **Security signals:**
  - auth-header: authorization (medium)
  - cors: access-control-allow-credentials (low)
  - cors: access-control-allow-headers (low)
  - cors: access-control-allow-methods (low)
  - security-header: strict-transport-security (low)

### GET /i/jfapi/stories/storiesRemote

- **Operation:** getI
- **Resource group:** i
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** detail / unknown
- **Query params:**
  - `category` (string) example: Top Stories
- **Request headers:**
  - `accept-language`
  - `authorization` (sensitive)
  - `referer`
  - `sec-ch-ua`
  - `sec-ch-ua-mobile`
  - `sec-ch-ua-platform`
  - `timezone`
  - `user-agent`
  - `x-client-transaction-id`
  - `x-guest-token` (sensitive)
  - `x-jf-client-theme`
  - `x-jf-v`
  - `x-twitter-active-user`
- **Security signals:**
  - auth-header: authorization (medium)
  - cors: access-control-allow-credentials (low)
  - cors: access-control-allow-headers (low)
  - cors: access-control-allow-methods (low)
  - security-header: strict-transport-security (low)

### GET /libs/cq/i18n/dict.en.json

- **Operation:** getLib
- **Resource group:** libs
- **Observed calls:** 1
- **Statuses:** 200
- **Classification:** detail / unknown
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
