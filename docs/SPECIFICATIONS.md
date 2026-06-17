# System Requirements & Software Limitations

## 🖥️ System Requirements

### Backend (Server)
- **Python**: Version 3.10 or higher (3.13 recommended).
- **RAM**: Minimum 512MB (1GB recommended for handling bulk uploads and scoring).
- **Disk Space**: 100MB for application files + storage for the SQLite database (grows with data).
- **OS**: Windows, macOS, or Linux.

### Frontend (Client)
- **Browser**: Modern evergreen browser (Chrome, Firefox, Safari, Edge).
- **Screen Resolution**: Optimized for 1280x720 or higher.
- **Node.js**: Version 18+ (for development/build only).

---

## ⚠️ Software Limitations

### 1. Database Scalability
- **Engine**: Apex CRM uses **SQLite** as its default database.
- **Limit**: While highly performant for single-process use, it is not suitable for high-concurrency environments with hundreds of simultaneous write operations. 
- **Recommendation**: For teams larger than 50 users, migrating to PostgreSQL is recommended.

### 2. AI & Scoring Logic
- **Non-LLM**: All lead and risk scoring is **deterministic**. It uses weighted rules and statistical thresholds rather than Large Language Models (LLMs).
- **Limit**: The "intelligence" is only as good as the configured rules. It does not "learn" or adapt automatically to new patterns without manual rule updates.

### 3. Bulk Uploads
- **File Type**: Only CSV files are supported for bulk imports.
- **File Size**: Uploads are limited to 10MB per request (approx. 50,000 records) to prevent server timeouts.

### 4. Real-time Communication
- **Connectivity**: Outbound push connectors rely on external system availability.
- **Limit**: There is no built-in retry mechanism for failed webhook deliveries in the current version (v2.0.0). Failed attempts are logged in `connector_sync_logs` for manual review.

### 5. Deployment
- **Architecture**: Designed as a **Modular Monolith**. It is not currently architected for distributed microservices.
- **Storage**: Backups are stored locally on the server's disk. Remote cloud storage (S3/Azure) is not yet integrated.
