# Apex CRM Frontend

This is the React-based frontend for Apex CRM.

## Features
- **Role-Based Access Control**: Different views and permissions for Admin, Supervisor, and Agent.
- **Unified Dashboard**: Key metrics and activity feeds tailored to user roles.
- **Module Management**: Full interfaces for Contacts, Deals, Tickets, Invoices, and Activities.
- **Advanced Analytics**: Visual reports for pipeline, activity, and channel distribution.
- **Admin Suite**: System settings, connector management, user controls, and workflow automation.
- **Supervisor Suite**: Team performance tracking and approval workflows.
- **Modern UI**: Built with Tailwind CSS and Lucide icons.

## Tech Stack
- React 18
- Vite (Build tool)
- Tailwind CSS (Styling)
- React Router (Routing)
- Lucide React (Icons)
- Recharts (Data visualization)

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Development
Start the development server:
```bash
npm run dev
```

### Build
Build for production:
```bash
npm run build
```

## Integration
The frontend is configured to proxy API requests to `http://localhost:8000`. Ensure the backend is running for full functionality.
