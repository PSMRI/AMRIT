# Security Policy

AMRIT (Accessible Medical Records via Integrated Technologies) is a digital health platform that handles sensitive patient data and medical records. We take security seriously and are committed to addressing vulnerabilities responsibly.

---

## Supported Versions

We actively maintain and apply security fixes to the following versions:

| Version   | Supported          |
|-----------|--------------------|
| Latest (`main`) | ✅ Active support |
| Older releases  | ❌ No longer supported |

We strongly recommend all deployments run the latest version from `main` or the most recent tagged release.

---

## Reporting a Vulnerability

> [!CAUTION]
> **Please do NOT report security vulnerabilities through public GitHub Issues.** Public disclosure before a fix is available could put real patient data at risk.

### How to Report

If you discover a security vulnerability in any AMRIT repository, please report it through one of the following channels:

1. **GitHub Private Security Advisory** *(Preferred)*
   Use the [**Report a Vulnerability**](https://github.com/PSMRI/AMRIT/security/advisories/new) button on this repository's Security tab to submit a private advisory directly to the maintainers.

2. **Email**
   Send details to the Piramal Swasthya team at:
   📧 **amrit@piramalswasthya.org**
   
   Use the subject line: `[SECURITY] <Brief description>`

### What to Include

Please provide as much of the following as possible:

- **Description**: A clear explanation of the vulnerability and its potential impact.
- **Affected Component(s)**: Which AMRIT repository or module is affected (e.g., `HWC-API`, `Common-UI`, `Identity-API`).
- **Steps to Reproduce**: Detailed steps or a proof-of-concept (PoC) to help us validate and reproduce the issue.
- **Affected Version(s)**: The specific version, branch, or commit where the issue was found.
- **Suggested Fix** *(optional)*: Any recommendations you may have for remediation.

---

## Our Response Process

We are committed to the following timeline upon receiving a valid security report:

| Stage | Target Timeline |
|---|---|
| **Acknowledgement** | Within **48 hours** of report receipt |
| **Initial Assessment** | Within **5 business days** |
| **Patch / Remediation** | Within **90 days** for critical issues |
| **Public Disclosure** | Coordinated with the reporter after a fix is available |

We will keep you informed throughout the process and will credit you in the security advisory (unless you prefer to remain anonymous).

---

## Scope

The following are **in scope** for security reports:

- All repositories under the [PSMRI GitHub organization](https://github.com/PSMRI) that are part of the AMRIT platform, including:
  - API microservices (e.g., `HWC-API`, `Common-API`, `Identity-API`, `FHIR-API`)
  - UI applications (e.g., `HWC-UI`, `Common-UI`, `ADMIN-UI`)
  - Mobile applications (e.g., `HWC-Mobile-App`, `FLW-Mobile-App`)
  - Database schema management (`AMRIT-DB`)

The following are **out of scope**:

- Vulnerabilities in third-party dependencies that do not directly affect AMRIT (please report these to the respective upstream projects)
- Issues that require physical access to infrastructure
- Social engineering attacks
- Rate limiting or denial-of-service issues without demonstrated patient data risk

---

## Security Best Practices for Deployers

If you are deploying AMRIT in a production environment, we recommend:

- **Keep dependencies updated**: Regularly run `npm audit` (UI) and check for Spring Boot CVEs (APIs).
- **Use environment variables**: Never hardcode credentials or API keys. Use `.env` files and secrets management systems.
- **Enable HTTPS**: All services should be served over TLS/SSL.
- **Restrict CORS**: Configure allowed origins strictly in each API service.
- **Database security**: Ensure `AMRIT-DB` is not publicly accessible; use role-based access control.
- **Monitor audit logs**: Enable and regularly review application and infrastructure audit logs.

---

## Acknowledgements

We are grateful to the security research community for helping keep AMRIT and its patients safe. Responsible disclosures will be credited in our security advisories.

---

*This security policy is maintained by the [Piramal Swasthya Management and Research Institute (PSMRI)](https://piramalswasthya.org) team.*
