# Frequently Asked Questions

This section covers common questions about nginx waf.

## General Questions

### What is nginx waf?

nginx waf is a comprehensive management platform for Nginx and ModSecurity. It provides a user-friendly web interface to manage Nginx configurations, SSL certificates, ModSecurity rules, and monitor server performance.

### What are the system requirements?

nginx waf requires:
- Node.js 18 or higher
- PostgreSQL 12 or higher
- Nginx 1.18 or higher
- ModSecurity 2.9 or higher (optional)
- 2GB RAM minimum
- 10GB disk space minimum

### Is nginx waf free?

Yes, nginx waf is open-source and released under the MIT License.

### Can I use nginx waf in production?

Yes, nginx waf is designed for production use. However, always test in a staging environment first.

## Installation Questions

### How do I install nginx waf?

See the [installation guide](/guide/installation) for detailed installation instructions.

### Can I install nginx waf on Docker?

Yes, nginx waf provides Docker images for easy deployment. See the installation guide for Docker instructions.

### Do I need to install Nginx separately?

Yes, nginx waf manages existing Nginx installations but does not include Nginx itself.

## Domain Management Questions

### Can I manage multiple domains?

Yes, nginx waf is designed to manage multiple domains from a single interface.

### Can I use nginx waf with existing Nginx configurations?

Yes, nginx waf can import existing Nginx configurations. However, some manual adjustments may be needed.

### Can I create custom Nginx configurations?

Yes, nginx waf allows you to add custom Nginx directives for advanced configurations.

