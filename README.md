# Nexus CRM System

A full-stack Customer Relationship Management (CRM) application built to manage customers, track sales leads, and monitor business performance through interactive reports.

## Features

- **Dashboard Overview** — View customer and lead statistics.
- **Customer Management** — Add, edit, search, and delete customer records.
- **Lead Management** — Track leads through different sales stages.
- **Lead Conversion** — Convert qualified leads into active customers.
- **Reports & Analytics** — Visualize customer distribution, lead pipeline, and conversion rates.
- **Database Integration** — Store and manage records using MongoDB.

## Tech Stack

**Frontend:** React, Vite, Axios, Chart.js  
**Backend:** Node.js, Express.js  
**Database:** MongoDB with Mongoose  
**Version Control:** Git and GitHub

## Project Structure

```text
nexus-crm-system/
├── backend/
│   ├── models/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   └── package.json
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Node.js and npm
- MongoDB database
- Git

### 1. Clone the repository

```bash
git clone https://github.com/mr-Navaneeth-Jain/nexus-crm-system.git
cd nexus-crm-system
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder and configure your MongoDB connection string and server port according to your backend code.

Never publish your database credentials.

### 3. Configure the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

### 4. Run the application

Start the backend using the start command configured in `backend/package.json`. Keep the backend and frontend running in separate terminals.

Open the local frontend URL displayed by Vite, usually `http://localhost:5173`.

## Future Improvements

- User authentication and authorization
- Role-based access control
- Deployment to a hosting platform
- Additional reporting and analytics

## Author

**Navaneeth Jain**

GitHub: [mr-Navaneeth-Jain](https://github.com/mr-Navaneeth-Jain)

---

This project was developed as a full-stack CRM portfolio project.