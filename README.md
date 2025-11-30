# Cropin Grow System Dashboard

A Next.js web application dashboard for managing Development Agents (DA) and Woreda Representatives.

## Features

- **Login System**: 
  - Admin login: `Admin@123` / `Admin@123`
  - Regional Manager login: `tigray@123`, `south@123`, `sidama@123`, `ce@123`, `amhara@123`, `oromia@123` (password: `123`)
  - Woreda Manager login: Phone number from `reporting_manager_mobile` field (password: `123`)
- **Dashboard Overview**: View all DA users connected to the logged-in manager
- **Editable Fields**: Woreda Managers can edit only their DA users' total data collected and status (Active/Inactive only)
- **KPI Cards**: Display key performance indicators
- **Regional Manager Dashboard**: Read-only view for regional managers with graphs and statistics
- **Support/Report**: Link to Google Form for support and reporting issues
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Charts**: Visual representation of data collection with pagination

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Local)
- **Charts**: Recharts

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   - Create a PostgreSQL database (e.g., `cropin_grow`)
   - Run the SQL script in `database/schema.sql` to create the table and indexes
   - The script creates the `da_users` table with all required columns and indexes

3. **Environment Variables**
   Create a `.env.local` file in the root directory:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/cropin_grow
   ```
   
   Replace `username`, `password`, and `cropin_grow` with your actual PostgreSQL credentials and database name.

4. **Database Schema**
   The system uses a single table:
   
   - `da_users`: Contains Development Agent information
     - `id` (SERIAL PRIMARY KEY)
     - `region` (TEXT)
     - `zone` (TEXT)
     - `woreda` (TEXT)
     - `kebele` (TEXT)
     - `contact_number` (TEXT)
     - `name` (TEXT)
     - `reporting_manager_name` (TEXT)
     - `reporting_manager_mobile` (TEXT) - Used for Woreda Manager login
     - `language` (TEXT)
     - `total_data_collected` (INT DEFAULT 0)
     - `last_updated` (TIMESTAMP)
     - `status` (VARCHAR(10) DEFAULT 'inactive') - Only 'Active' or 'Inactive'
     - `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Open Browser**
   Navigate to `http://localhost:3000`

## Usage

1. **Login**: 
   - **Admin**: Use `Admin@123` / `Admin@123` for full access
   - **Regional Manager**: Use region username (e.g., `tigray@123`) / `123` for read-only regional access
   - **Woreda Manager**: Use phone number from `reporting_manager_mobile` field / `123` for managing assigned DAs
2. **Dashboard**: View your DA users, KPIs, and charts
3. **Edit Data**: Click on "Total Data" or "Status" columns to edit (only for Woreda Managers, only when status is Active)
4. **Status**: Only two statuses available - 'Active' and 'Inactive' (no Pending)
5. **Support**: Click the "Support / Report" button to access the Google Form

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── login/          # Login API (handles Admin, Regional Manager, Woreda Manager)
│   │   ├── da-users/           # DA users CRUD API
│   │   ├── kpis/               # KPI data API
│   │   ├── public-stats/       # Public statistics API
│   │   └── filters/            # Filter options API
│   ├── admin/                  # Admin dashboard page
│   ├── dashboard/              # Woreda Manager dashboard page
│   ├── regional-manager/       # Regional Manager dashboard page (read-only)
│   ├── login/                  # Login page
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page (public dashboard)
│   └── globals.css             # Global styles
├── components/
│   ├── DashboardContent.tsx    # Woreda Manager dashboard component
│   ├── AdminDashboard.tsx      # Admin dashboard component
│   ├── RegionalManagerDashboard.tsx  # Regional Manager dashboard component (read-only)
│   ├── PublicDashboard.tsx     # Public dashboard component
│   ├── KPICards.tsx            # KPI cards component
│   └── DATable.tsx             # DA users table component
├── database/
│   └── schema.sql              # Database schema (run this in PostgreSQL)
├── lib/
│   └── db.ts                   # Database connection (uses DATABASE_URL)
└── package.json
```

## Database Schema

The system uses a single table `da_users`. See `database/schema.sql` for the complete schema.

**Key Points:**
- Woreda Managers log in using their phone number (stored in `reporting_manager_mobile`)
- No separate `woreda_reps` table - manager info is in `da_users` table
- Status can only be 'Active' or 'Inactive' (default: 'inactive')
- Column names: `contact_number` (not `contactnumber`), `total_data_collected` (not `total_collected_data`)

## Notes

- The password is fixed as "123" for all users (as per requirements)
- Only Woreda Managers can edit their own DA users' data (filtered by `reporting_manager_mobile`)
- Regional Managers have read-only access to all DAs in their region
- Admin has full access to all DAs
- The application uses client-side authentication with localStorage

## Build for Production

```bash
npm run build
npm start
```

