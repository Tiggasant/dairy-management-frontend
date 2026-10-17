# Ghunsai Dairy – Frontend

React 19 · Vite · TypeScript · Tailwind CSS 4 · TanStack Query · React Router.
Mobile-first (bottom navigation on phones, sidebar on desktop). Talks to the Spring Boot backend.

## Run
```bash
npm install
npm run dev     # http://localhost:5173  (proxies /api -> http://localhost:8080)
npm run build   # production build in dist/
```
Backend elsewhere? `VITE_DEV_API=http://host:8080 npm run dev`, or set `VITE_API_URL` at build time
(then set `CORS_ALLOWED_ORIGINS` on the backend). Copy `.env.example` to `.env` to change the shop name.

## Docker
`docker build -t dairy-web .` – nginx serves the app and proxies `/api` to a container named `api`
(as in the backend's docker-compose). Put HTTPS in front in production.

## Screens and roles
| Screen | Owner | Worker |
|---|:-:|:-:|
| Home (today's numbers, low stock, pending udhaar) | whole shop | own bills only |
| New Sale (cart, cash/UPI/udhaar split, customer, receipt, print, WhatsApp) | yes | yes |
| Products | add / edit / price history / hide | view |
| Stock | receive, wastage / correction, history | view |
| Customers + udhaar payments | all + edit / deactivate / pending list | list, add, receive payment |
| Bill details, Daily report, Team | yes | hidden |

Role checks in the UI only hide screens; the backend enforces every permission.

## Notes
* Money is computed in integer paise with the backend's HALF_UP rule, so cash + UPI + udhaar equals the total exactly.
* Each bill carries a `clientRequestId`: a retry after a network failure returns the same bill, never a duplicate.
* JWT is kept in `localStorage`; a 401 logs the user out. Changing a password logs out every device.
