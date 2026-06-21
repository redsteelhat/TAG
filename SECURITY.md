# Security Policy

This product handles sensitive driver, vehicle and financial data.

Sensitive data includes:

- Plate number
- Phone and email
- Location
- Income and expense records
- Receipt and vehicle document images
- Trip times
- Financial performance

## Baseline Requirements

- Passwords must be hashed with Argon2 or bcrypt.
- Auth must use short-lived access tokens and rotating refresh tokens.
- Logs must mask personal and financial data.
- Error tracking events must mask personal, financial, token, location, and vehicle data before leaving the API process.
- Detailed monitoring metrics must require `MONITORING_TOKEN` or an admin JWT.
- Public health endpoints must not expose personal, financial, token, or environment secret data.
- Uploaded files must be stored in private S3/R2 buckets.
- File access must use signed URLs.
- Daily database backups are required for production.
- Backup archives must be encrypted or stored on encrypted volumes with restricted operator access.
- Restore must be tested before beta launch and after schema changes.
- Account export and delete flows are required before launch.

## Reporting

Until a dedicated security contact is created, report security issues privately to the repository owner.
