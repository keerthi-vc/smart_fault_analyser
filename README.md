# Smart Fault Analyser

A comprehensive network diagnostics and fault classification system with dual portals for end-users and ISP staff.

![Smart Fault Analyser](https://img.shields.io/badge/Status-Production%20Ready-success)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🌟 Features

### For End Users
- **Quick Complaint Submission** - Report network issues with detailed descriptions
- **Automated Diagnostics** - Instant network analysis with comprehensive metrics
- **Real-time Status Tracking** - Monitor complaint resolution progress
- **Network Health Visualization** - Beautiful gauges showing ISP and server health
- **Complaint History** - View all past issues and their resolutions

### For ISP Staff
- **Complaint Queue Management** - Prioritized list of all network complaints
- **Advanced Analytics** - Fault distribution charts and trends
- **Network Traffic Analysis** - Detailed metrics including jitter, latency, packet loss
- **Intelligent Classification** - Automatic ISP vs App fault detection
- **Quick Resolution Tools** - One-click complaint resolution

### Technical Features
- 🎨 **Premium UI** - Glassmorphism design with smooth animations
- 🔐 **Secure Authentication** - JWT-based auth with role-based access
- 📊 **Interactive Charts** - Real-time data visualization with Recharts
- 🚀 **Fast & Responsive** - Built with React and Vite
- 💾 **PostgreSQL Database** - Robust data persistence
- 🌐 **RESTful API** - Comprehensive backend with Express.js

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd /Users/keerthiv.c/Desktop/Smart_Fault_Analyser_Final
   ```

2. **Set up the database**
   ```bash
   # Create database
   createdb smart_fault_analyser
   
   # Run schema
   psql -d smart_fault_analyser -f Backend/schema.sql
   ```

3. **Configure database connection**
   
   Edit `Backend/server.js` and update the PostgreSQL credentials:
   ```javascript
   const pool = new Pool({
       user: 'your_username',
       host: 'localhost',
       database: 'smart_fault_analyser',
       password: 'your_password',
       port: 5432,
   });
   ```

4. **Install dependencies**
   ```bash
   # Backend
   cd Backend
   npm install
   
   # Frontend
   cd ../Frontend
   npm install
   ```

5. **Start the application**
   
   Open two terminal windows:
   
   **Terminal 1 - Backend:**
   ```bash
   cd Backend
   npm start
   ```
   
   **Terminal 2 - Frontend:**
   ```bash
   cd Frontend
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## 📖 Usage

### Creating Accounts

1. Navigate to http://localhost:3000
2. Click "Get Started" or "Sign Up"
3. Choose account type:
   - **End User** - For reporting network issues
   - **ISP Staff** - For analyzing and resolving complaints

### For End Users

1. **Login** to your account
2. **Submit a complaint** by describing your network issue
3. **View diagnostics** - Automatic network analysis runs immediately
4. **Track status** - Monitor your complaint in the dashboard
5. **Check network health** - View real-time ISP and server health scores

### For ISP Staff

1. **Login** to ISP account
2. **View complaint queue** - See all pending complaints sorted by priority
3. **Analyze metrics** - Review detailed network diagnostics for each complaint
4. **Classify faults** - System automatically determines ISP vs App faults
5. **Resolve complaints** - Use quick resolve or add detailed resolution notes
6. **View analytics** - Check fault distribution and resolution trends

## 🏗️ Architecture

### Backend (`/Backend`)
- **server.js** - Main Express server with all API endpoints
- **schema.sql** - PostgreSQL database schema
- **middleware/auth.js** - JWT authentication middleware
- **utils/networkAnalyzer.js** - Network diagnostics engine

### Frontend (`/Frontend`)
- **src/pages/** - All page components (Landing, Login, Register, Dashboards)
- **src/components/** - Reusable UI components
- **src/context/** - Authentication context
- **src/utils/** - API client and utilities
- **src/index.css** - Design system and global styles

## 🎨 Design System

The application uses a premium dark theme with:
- **Glassmorphism** effects for modern UI
- **Smooth animations** with Framer Motion
- **Custom color palette** with vibrant accents
- **Responsive design** for all screen sizes
- **Interactive components** with hover effects

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Complaints
- `POST /api/complaints` - Create complaint (User only)
- `GET /api/complaints` - Get complaints (filtered by role)
- `GET /api/complaints/:id` - Get complaint details
- `PATCH /api/complaints/:id` - Update complaint (ISP only)

### Analytics
- `GET /api/analytics/stats` - Get overall statistics (ISP only)
- `GET /api/analytics/trends` - Get complaint trends
- `GET /api/analytics/network-health` - Get network health metrics

## 🔧 Configuration

### Environment Variables

You can create a `.env` file in the Backend directory:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=smart_fault_analyser
DB_PASSWORD=your_password
DB_PORT=5432
JWT_SECRET=your-secret-key-change-in-production
PORT=3001
```

## 🧪 Testing

### Test Accounts

After running the schema, you can use these test accounts:

**End User:**
- Email: user@example.com
- Password: SmartFault#2026

**ISP Staff:**
- Email: isp@example.com
- Password: SmartFault#2026

Or create new accounts through the registration page.

## 🛠️ Technologies Used

### Frontend
- React 18
- React Router v6
- Framer Motion (animations)
- Recharts (data visualization)
- React Hot Toast (notifications)
- Axios (HTTP client)
- Lucide React (icons)
- Date-fns (date formatting)

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT (authentication)
- Bcrypt (password hashing)

## 📝 Database Schema

### Tables
- **users** - User accounts (both end-users and ISP staff)
- **complaints** - Network issue complaints
- **network_metrics** - Diagnostic data for each complaint
- **isp_actions** - ISP staff actions on complaints

## 🚦 Network Diagnostics

The system automatically collects:
- **Jitter** - Variation in packet delay
- **Latency** - Round-trip time
- **Packet Loss** - Percentage of lost packets
- **Bandwidth** - Estimated connection speed
- **Ping Status** - Connectivity check

### Fault Classification Logic

1. **Ping Failed** → ISP Hard Fault (Network Outage)
2. **High Jitter (>100ms)** → ISP Soft Fault (Congestion)
3. **High Latency (>200ms)** → ISP Issue
4. **Network OK but complaint exists** → Application Fault

## 🎯 Future Enhancements

- [ ] Email notifications
- [ ] PDF report generation
- [ ] Advanced filtering and search
- [ ] Real-time WebSocket updates
- [ ] Mobile app
- [ ] Multi-language support
- [ ] Dark/Light theme toggle
- [ ] Integration with monitoring tools (Wireshark, iperf)

## 📄 License

MIT License - feel free to use this project for your own purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please create an issue in the repository.

---

Built with ❤️ using React, Node.js, and PostgreSQL
