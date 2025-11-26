
# Authentication & Authorization (Auth) — Implementation Overview

This README describes how authentication and authorization are implemented in this project (backend + frontend), how access tokens and refresh tokens are issued and managed, and how to integrate the client with the API.

The implementation is split between two parts:
- Backend: `backend-auth` — provides JWT-based auth, refresh token storage and rotation, OAuth hooks, protected routes and role-based checks.
- Frontend: `frontend-auth` — stores the short-lived access token in-memory and relies on an HttpOnly refresh token cookie for renewal.

## Key files (where to look)
- Backend handlers and routes: `backend-auth/internal/delivery/http/handlers/auth_handler.go`
- Backend use-cases (token generation, refresh, rotation): `backend-auth/internal/usecases/auth_usecase.go`
- Backend auth middleware & CORS: `backend-auth/internal/delivery/http/middleware/middleware.go`
- Backend entities (User, roles): `backend-auth/internal/entities/user.go`
- Frontend API wrapper: `frontend-auth/src/lib/api.ts`
- Frontend token manager (in-memory access token): `frontend-auth/src/lib/tokenManager.ts`
- Google sign-in component: `frontend-auth/src/components/GoogleLoginButton.tsx`

## Concepts and flow

1) Credentials / Registration
- POST /auth/register — user supplies name/email/password/phone.
- Backend validates, creates user, generates two tokens:
	- Access token (JWT) — short lived (configurable, default 15m)
	- Refresh token (JWT) — longer lived (configurable, default 7d)
- Backend stores the refresh token in the database and sets it as an HttpOnly cookie on the response. The access token is returned in the JSON response body.

2) Login
- POST /auth/login — backend authenticates and returns the access token in JSON and sets the refresh token as an HttpOnly cookie.

3) Access token usage
- The frontend stores the access token only in memory (see `tokenManager.setTokens`) — NOT in localStorage. This reduces the attack surface for XSS-based token theft.
- For authenticated API requests, the frontend adds the access token to the `Authorization` header as: `Authorization: Bearer <access_token>`.
- The axios instance in `frontend-auth/src/lib/api.ts` is configured with a request interceptor that automatically adds the access token (if present) to outgoing requests.

4) Refreshing the access token
- Access tokens are deliberately short-lived. When a request receives a 401 (expired token), the frontend's axios response interceptor attempts to refresh the access token by calling POST /auth/refresh.
- The refresh token is sent automatically by the browser as an HttpOnly cookie (the frontend uses `withCredentials: true`), so JavaScript does not access the cookie directly.
- Backend verifies the refresh token exists and is valid in the database, then issues a new access token and, optionally, a rotated refresh token.
- The backend sets (or updates) the refresh token again as an HttpOnly cookie on the refresh response.
- The interceptor updates the in-memory access token and retries the original request.

5) Refresh token rotation & revocation
- Refresh tokens are stored server-side and can be revoked. When refreshing, the backend rotates refresh tokens only if the token is close to expiry (less than 1 minute remaining) to avoid race conditions.
- Logout revokes the refresh token (or all tokens) and clears the cookie.

6) OAuth (Google / GitHub)
- The project includes endpoints for OAuth flows. On successful OAuth sign-in, the backend issues the same pair of tokens (access token returned in response + refresh token set as HttpOnly cookie).

7) Authorization (roles)
- JWT access token contains the `role` claim (e.g., `admin`, `passenger`).
- `AuthMiddleware` (in `middleware/middleware.go`) validates the JWT sent in `Authorization` header, extracts claims and populates request context with `user_id`, `user_role`, `user_email`.
- `AdminMiddleware` checks that `user_role == "admin"` and denies access if not.

## Security notes & best practices
- Refresh tokens must be HttpOnly and (in production) Secure and SameSite=strict or Lax as appropriate. In the current code the cookie is set with `httpOnly=true` and `secure=false` (set `secure=true` in production behind HTTPS).
- Access tokens are stored in memory only. Avoid storing access tokens in localStorage or non-HttpOnly cookies.
- Always use HTTPS in production so cookies with `Secure` are transmitted safely and tokens are not exposed.
- Configure CORS to allow your frontend origin and set `Access-Control-Allow-Credentials: true` so the browser will send the refresh cookie on cross-origin requests. The middleware in `middleware.go` supports allowed origins via environment variable `CORS_ALLOWED_ORIGINS`.
- Rotate refresh tokens on refresh (the implementation rotates only when the token is near expiry) and store them server-side to permit revocation.

## How-to: Frontend integration (axios)
- The frontend axios instance (`frontend-auth/src/lib/api.ts`) is configured with `withCredentials: true` so HttpOnly refresh cookie is sent with requests. Example usage:

	- When the user logs in:
		- Call `authAPI.login(credentials)`
		- On success: `tokenManager.setTokens(response.data.access_token)` (access token stored in memory). Server sets `refresh_token` cookie.

	- On normal API requests:
		- The axios request interceptor sets `Authorization: Bearer <access_token>` automatically.

	- On 401 responses:
		- The axios response interceptor calls `POST /auth/refresh` with `withCredentials: true`. If refresh succeeds the interceptor stores the new access token using `tokenManager.setAccessToken(...)` and retries the original request. If it fails, the frontend clears tokens and logs the user out.

## Example requests

- Login (curl example — cookie will be returned):

```bash
curl -i -X POST 'https://your-api-host/auth/login' \
	-H 'Content-Type: application/json' \
	-d '{"email":"test@example.com","password":"password123"}'
```

Look for `Set-Cookie: refresh_token=...; HttpOnly; Path=/; Max-Age=...` in the response headers and `{"access_token": "..."}` in the JSON body.

- Refresh (from frontend axios; cookie is sent automatically because `withCredentials: true`):

```js
// axios example (already implemented in frontend interceptor)
axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
	.then(resp => {
		const access = resp.data.access_token;
		tokenManager.setAccessToken(access);
	})
```

## Protecting backend routes
- Use the `AuthMiddleware` to protect routes that require authenticated users. Example in `cmd/api/main.go`:

```go
authorized := v1.Group("")
authorized.Use(middleware.AuthMiddleware(container.JWTSecret))
{
	profile := authorized.Group("/profile")
	profile.GET("", profileHandler)
}
```

- For admin-only routes, add `AdminMiddleware()`.

## Environment configuration
- JWT secrets and expirations are configured via environment variables in `cmd/api/main.go` when creating the `AuthUsecase`:
	- `JWT_SECRET` — secret for signing JWTs
	- `JWT_ACCESS_EXPIRY` — access token lifetime (e.g. "15m")
	- `JWT_REFRESH_EXPIRY` — refresh token lifetime (e.g. "7d")
	- `CORS_ALLOWED_ORIGINS` — comma-separated allowed origins for CORS

## Tests & debugging tips
- Look at logs produced by the usecase — the refresh flow logs decisions about rotating refresh tokens.
- When debugging CORS or cookie issues, ensure:
	- Browser's request includes `credentials` (use `fetch` with `credentials: 'include'` or axios `withCredentials: true`).
	- Server sets `Access-Control-Allow-Credentials: true` and `Access-Control-Allow-Origin` is not `*` but the explicit origin.
	- In production, set cookies with `secure=true` and an appropriate `SameSite` policy.

## Further improvements (recommended)
- Make the refresh cookie `Secure` and set an appropriate `SameSite` value in production.
- Add CSRF protection if you plan to use cookies for auth on browser clients (for example, double-submit cookie pattern or CSRF tokens).
- Consider rotating refresh tokens on every refresh (with detection of concurrent reuse) and store a token family to detect theft.
- Add automated tests for the refresh & revocation flows.

If you want, I can add a short troubleshooting section with common failure scenarios (CORS mismatch, cookies not sent, 401 loops) and precise steps to debug them on your dev environment.

