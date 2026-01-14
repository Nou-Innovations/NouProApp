# NouPro

**NouPro** is a professional mobile platform designed to help businesses, distributors, and entrepreneurs manage their operations, products, orders, invoices, and internal communication in one unified ecosystem.

It combines **business management tools**, **professional networking**, and **real-time collaboration** into a single mobile-first experience.

---

## 🚀 Key Features

### Business Management

* Multi-business & multi-location support
* Product & brand catalogs
* Order & delivery management
* Invoice generation
* Staff roles (Admin, Staff, Super Admin)
* Stock & inventory tracking

### Professional Networking

* Pro & Personal modes
* Company profiles & public pages
* Business discovery
* Activity feeds
* Notifications system

### Communication

* Slack-style Inbox
* Channels & Direct Messages
* Real-time chat (Socket.IO ready)
* Business-to-business messaging

### Technical Foundation

* React Native (Expo) mobile app
* Node.js + Express backend
* PostgreSQL + Prisma ORM
* JWT authentication
* REST API architecture
* Cloud-ready deployment

---

## 🏗️ Project Structure

```
NouProApp/
├── src/                 # Mobile app (React Native / Expo)
│   ├── features/        # Feature-based architecture (Inbox, Products, Invoices, etc.)
│   ├── shared/          # Shared UI, services, stores
│   └── navigation/      # React Navigation setup
│
├── backend/             # API server (Node + Express)
│   ├── routes/          # REST endpoints
│   ├── prisma/          # Database schema & migrations
│   ├── controllers/    # Business logic
│   └── services/        # Data & utility services
│
├── assets/              # Fonts, images, icons
├── docs/                # Project documentation
└── README.md
```

---

## 🧑‍💻 Tech Stack

### Mobile

* React Native
* Expo SDK
* TypeScript
* React Navigation

### Backend

* Node.js
* Express
* PostgreSQL
* Prisma ORM
* JWT Authentication

### Tooling

* GitHub
* Cursor IDE
* EAS Build
* Render / Vercel (deployment)

---

## ⚙️ Setup (Local Development)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/NouProApp.git
cd NouProApp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Mobile app

```bash
npx expo start
```

### 4. Backend

```bash
cd backend
npm install
npm run dev
```

### 5. Environment variables

Create a `.env` file in `/backend`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/noupro
JWT_SECRET=your_secret
```

---

## 🗄️ Database

NouPro uses **PostgreSQL + Prisma** for:

* Users
* Businesses
* Locations
* Products
* Orders
* Invoices
* Staff roles

Schema lives in:

```
backend/prisma/schema.prisma
```

---

## 🔐 Security

* No secrets are committed to the repository
* All credentials use `.env`
* `.gitignore` blocks sensitive files
* JWT authentication
* Role-based access control

---

## 📈 Vision

NouPro aims to become a **complete professional operating system** for:

* Distributors
* Retailers
* Entrepreneurs
* Service businesses
* Local enterprises

Future expansions include:

* Payment integrations
* Advanced analytics
* AI-powered business tools
* Public business marketplaces
* Multi-country support

---

## 📄 License

This project is currently under **private/proprietary development**.
Open-source licensing may be added later.

---

## 👤 Author

**Arnaud Labonne**
Founder & Lead Developer
NouPro Project
