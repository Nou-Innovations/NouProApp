# NouPro Backend Server

A simple Express.js mock API server for the NouPro React Native application.

## Quick Start

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

3. **Server will be running at:**
   - http://localhost:3000
   - API endpoints: http://localhost:3000/api/

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout

### Companies
- `GET /api/companies` - Get all companies
- `GET /api/companies/:id` - Get company by ID
- `PUT /api/companies/:id` - Update company

### Locations
- `GET /api/companies/:companyId/locations` - Get company locations
- `POST /api/companies/:companyId/locations` - Create new location
- `PUT /api/companies/:companyId/locations/:locationId` - Update location
- `DELETE /api/companies/:companyId/locations/:locationId` - Delete location

### Products
- `GET /api/companies/:companyId/products` - Get company products
- `GET /api/companies/:companyId/products/:productId` - Get specific product

### Deliveries
- `GET /api/companies/:companyId/deliveries` - Get company deliveries
- `POST /api/companies/:companyId/deliveries` - Create new delivery

### Invoices
- `GET /api/companies/:companyId/invoices` - Get company invoices

### Chat
- `GET /api/companies/:companyId/chats` - Get company chats

### Users
- `GET /api/companies/:companyId/users` - Get company users

### File Upload
- `POST /api/upload` - Upload files

### Health Check
- `GET /api/health` - Server health status

## Mock Data

The server includes pre-loaded mock data:
- 2 Companies (NouPro Distribution Inc., Global Supply Co.)
- 4 Locations across both companies
- 2 Products with stock levels
- 2 Deliveries in different statuses
- 1 Invoice
- 1 Chat conversation
- 1 Admin user

## Authentication

For testing, use:
- **Email:** admin@noupro.com
- **Password:** password

## Development Notes

- Server automatically restarts when files change (using nodemon)
- All API responses follow the format: `{ success: boolean, data?: any, error?: string }`
- File uploads are stored in the `uploads/` directory
- Cross-origin requests are enabled (CORS)

## Testing the API

You can test the API using curl or any HTTP client:

```bash
# Get all companies
curl http://localhost:3000/api/companies

# Get health status
curl http://localhost:3000/api/health
``` 