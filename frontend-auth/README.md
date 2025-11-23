# Bus Booking - Authentication Pages

D? án Frontend ch? ch?a 3 trang chính: **Homepage**, **Login**, và **Register**

##  C?u trúc thu m?c

\\\
frontend-auth/
 src/
    pages/
       HomePage.tsx          # Trang ch?
       LoginPage.tsx         # Trang dang nh?p
       RegisterPage.tsx      # Trang dang ký
    components/
       Layout.tsx            # Layout chung (Navbar + Outlet + Footer)
       Navbar.tsx            # Thanh di?u hu?ng
       Footer.tsx            # Chân trang
    lib/
       api.ts                # API client (axios + interceptors)
    config/
       constants.ts          # Các h?ng s? và c?u hình
    i18n/
       index.ts              # i18n config
       locales/
           vi.json           # Ti?ng Vi?t
           en.json           # Ti?ng Anh
    App.tsx                   # Main App component
    main.tsx                  # Entry point
    index.css                 # Global styles
    vite-env.d.ts             # Vite environment types
 package.json                   # Dependencies
 tsconfig.json                  # TypeScript config
 vite.config.ts                 # Vite config
 tailwind.config.js             # Tailwind CSS config
 postcss.config.cjs             # PostCSS config
 index.html                     # HTML template
 README.md                      # This file

\\\

##  Cách s? d?ng

### 1. Cài d?t dependencies

\\\ash
npm install
# ho?c
yarn install
\\\

### 2. C?u hình API

T?o file \.env.local\ (ho?c \.env\) trong thu m?c g?c:

\\\
VITE_API_URL=http://localhost:8080/api/v1
VITE_WS_URL=ws://localhost:8081/ws
\\\

### 3. Ch?y dev server

\\\ash
npm run dev
# ho?c
yarn dev
\\\

Server s? ch?y t?i \http://localhost:5173\

### 4. Build cho production

\\\ash
npm run build
# ho?c
yarn build
\\\

##  Dependencies chính

- **React** 18.2.0 - UI library
- **React Router** 6.21.0 - Routing
- **Axios** 1.6.2 - HTTP client
- **TailwindCSS** 3.4.0 - CSS framework
- **Lucide React** 0.303.0 - Icons
- **React Hot Toast** 2.4.1 - Notifications
- **i18next** 23.7.11 - Internationalization (i18n)

##  Tính nang

 **Homepage** - Trang ch? v?i hero section và features
 **Login** - Ðang nh?p v?i email/password
 **Register** - Ðang ký tài kho?n m?i
 **Authentication** - Token-based auth (JWT)
 **Responsive Design** - Mobile-friendly UI
 **Multi-language** - H? tr? Ti?ng Vi?t và Ti?ng Anh
 **Error Handling** - Hi?n th? l?i và notifications

##  API Endpoints

### Authentication
- \POST /auth/register\ - Ðang ký
- \POST /auth/login\ - Ðang nh?p
- \POST /auth/refresh\ - Refresh token

##  Local Storage

?ng d?ng luu tr?:
- \ccess_token\ - JWT access token
- \efresh_token\ - JWT refresh token
- \user\ - User information (JSON)

##  Styling

- **TailwindCSS** - Utility-first CSS framework
- **Custom CSS** - Global styles trong \index.css\
- **Responsive** - Mobile-first design

##  Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| VITE_API_URL | http://localhost:8080/api/v1 | Backend API URL |
| VITE_WS_URL | ws://localhost:8081/ws | WebSocket URL |

##  Development

### File Structure
- Pages trong \src/pages/\
- Components trong \src/components/\
- API functions trong \src/lib/api.ts\
- Global styles trong \src/index.css\

### Thêm trang m?i
1. T?o file component trong \src/pages/\
2. Thêm route trong \src/App.tsx\

##  Luu ý

- T?t c? requests du?c t? d?ng add Authorization header t? localStorage
- Khi token h?t h?n, ?ng d?ng s? t? d?ng refresh
- N?u refresh th?t b?i, redirect v? /login
- Form validation du?c th?c hi?n client-side

##  License

MIT
