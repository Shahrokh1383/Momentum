

```markdown
# SPA Authentication & CORS Debugging Resolutions

## Overview
This document outlines the architectural decisions and debugging resolutions made to establish a functional cookie-based SPA authentication flow between the React (Vite) frontend and the Laravel 12 backend using Laravel Sanctum. 

The core issues resolved were Cross-Origin Resource Sharing (CORS) credential blocking, misconfigured stateful domains, inefficient CSRF token handling, and infinite authentication redirect loops.

---

## Decision 1: Strict Alignment of Stateful Domains and Ports
**Context:** The frontend application was running on Vite's default port `5173`, but the backend environment was configured to trust requests from port `3000`. Additionally, a hardcoded `SESSION_DOMAIN=localhost` was causing cross-port session persistence issues in modern browsers.

**Decision:** 
*   Update `SANCTUM_STATEFUL_DOMAINS` in `.env` to explicitly include `localhost:5173` and `127.0.0.1:5173`.
*   Remove the `SESSION_DOMAIN=localhost` variable to allow Laravel's native session handling to resolve domains correctly across different local ports.
*   Align all OAuth redirect URIs to match the actual Vite development port (`5173`).

**Rationale:** Sanctum must explicitly recognize the requesting origin as a first-party SPA to initiate cookie-based authentication. A port mismatch forces Sanctum to treat the request as a third-party API call, defaulting to token-based auth (which fails, resulting in a 401).

---

## Decision 2: Explicit CORS Origin Over Wildcards
**Context:** The `config/cors.php` file was missing, causing Laravel to fallback to default CORS headers, including `Access-Control-Allow-Origin: *`. Browsers strictly enforce the Same-Origin Policy, prohibiting the sending of credentials (cookies) when the wildcard origin is used.

**Decision:** Create `config/cors.php` with explicit origin configuration.
*   Set `'allowed_origins' => ['http://localhost:5173']` instead of `*`.
*   Set `'supports_credentials' => true`.

**Rationale:** To satisfy browser security mechanisms when `withCredentials: true` is used on the Axios client, the server must explicitly echo the requesting origin in the CORS headers, rather than using a wildcard.

---

## Decision 3: Native XSRF Handling vs. Global Interceptors (KISS/DRY)
**Context:** The Axios client utilized a global request interceptor that fetched `/sanctum/csrf-cookie` on *every* POST, PUT, PATCH, and DELETE request. This added an unnecessary network round-trip for the majority of API calls, violating KISS and DRY principles.

**Decision:** 
*   Remove the global CSRF request interceptor from the Axios instance.
*   Configure Axios to use its built-in XSRF handling (`xsrfCookieName: 'XSRF-TOKEN'` and `xsrfHeaderName: 'X-XSRF-TOKEN'`). Axios natively reads the XSRF cookie and attaches the header automatically.
*   Explicitly fetch `/sanctum/csrf-cookie` *only* before the `login` and `register` endpoints in the `authService`, which are the only entry points that require CSRF initialization for an unauthenticated user.

**Rationale:** Relying on Axios's native capabilities reduces custom code and eliminates redundant network requests. Moving the explicit CSRF fetch to specific auth actions adheres to the Single Responsibility Principle (SRP).

---

## Decision 4: API Exception Handling vs. Web Redirects (Infinite Loop Fix)
**Context:** When an unauthenticated user requested a protected API route, Laravel's default `Authenticate` middleware attempted to redirect the request to a web route named `login`. The Axios response interceptor caught the resulting 401/redirect and forcefully executed `window.location.href = '/login'`. This created an infinite loop: App loads -> fetches `/api/user/me` -> 401 -> redirect to `/login` -> App loads -> fetches `/api/user/me`...

**Decision:** 
*   Override `AuthenticationException` rendering in `bootstrap/app.php` to return a strict `401 JSON` response for any route matching `api/*`.
*   Remove the hard browser redirect (`window.location.href`) from the Axios response interceptor. The interceptor now simply rejects the promise, delegating error state handling to the specific React components/hooks.

**Rationale:** API routes should never return web redirects (302). They must return appropriate JSON status codes. Delegating the UI reaction to a 401 (like showing a login screen) to the frontend enforces a clean separation of concerns and prevents routing infinite loops.
```

---