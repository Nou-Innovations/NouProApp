# NouPro App

NouPro is a business management app for handling orders, deliveries, invoicing, and internal operations.

## Beta Testing Instructions

### For Testers

1. You will receive an email invitation to test the app through TestFlight
2. Install the TestFlight app from the App Store
3. Accept the invitation in TestFlight
4. Download and install the NouPro app
5. Use the provided test account credentials to log in

### Test Account

- Email: beta@noupro.com
- Password: NouPro2025!

### Features to Test

1. Authentication
   - Login/Register
   - Password reset
   - Session management

2. Inbox
   - Chat functionality
   - Message notifications
   - File attachments

3. Delivery
   - Order management
   - Delivery tracking
   - Status updates

4. Products
   - Product listing
   - Stock management
   - Product details

5. Invoices
   - Invoice creation
   - PDF generation
   - Payment status

6. Profile
   - Business settings
   - User management
   - Location settings

### Reporting Issues

Please report any issues or bugs you encounter by:

1. Taking a screenshot of the issue
2. Recording the steps to reproduce
3. Describing the expected behavior
4. Sending the report to support@noupro.com

### Known Issues

- [List any known issues here]

## Development Setup

### Prerequisites

- Node.js >= 16
- npm >= 8
- Expo CLI
- Xcode (for iOS development)
- Android Studio (for Android development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/noupro.git
   cd noupro
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

### Building for Beta

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Log in to your Expo account:
   ```bash
   eas login
   ```

3. Configure the project:
   ```bash
   eas build:configure
   ```

4. Create a build for TestFlight:
   ```bash
   eas build --platform ios --profile preview
   ```

5. Submit to TestFlight:
   ```bash
   eas submit --platform ios --profile preview
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
API_URL=your_api_url
SOCKET_URL=your_socket_url
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited. 