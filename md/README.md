# Feng Shui Learning Platform - Design Documentation

## Overview

This directory contains comprehensive design documentation for the Thiên Thư (Feng Shui Learning Platform) project.

---

## Documentation Structure

### Core Design
- **[System Overview](core/system-overview.md)** - High-level system architecture, technology stack, and component diagrams
- **[Database Design](core/database-design.md)** - Entity relationship diagrams, table schemas, and query optimization
- **[API Specification](core/api-specification.md)** - Complete REST API documentation with request/response examples
- **[Deployment Guide](core/deployment-guide.md)** - Docker setup, deployment steps, and CI/CD pipeline

### Security & DRM
- **[Security & DRM](security/security-drm.md)** - Device locking, watermarking, video protection, and access control
- **[PDF Watermark Strategy](security/pdf-watermark-strategy.md)** - Per-user PDF generation and on-the-fly watermarking

### Frontend Architecture
- **[Flutter Architecture](frontend/flutter-architecture.md)** - Mobile app structure, state management, and implementation
- **[Vue.js Architecture](frontend/vuejs-architecture.md)** - Web app structure, Pinia stores, and components

### Content Modules
- **[Books Module](modules/books/books-lazy-loading.md)** - Lazy loading strategy and storage optimization
- **[Videos Module](modules/videos/video-course-structure.md)** - Course-based video structure
- **[Bunny Video Optimization](modules/videos/bunny-video-optimization.md)** - Cost-efficient video storage and delivery
- **[Exams & Practice](modules/exams/)** - Standalone exams and practice/tower mode logic

---

## Quick Start

1. **Read System Overview** - Understand the overall architecture
2. **Review Database Design** - Familiarize with data models
3. **Study API Specification** - Learn the API endpoints
4. **Choose Platform** - Review Flutter or Vue.js architecture based on your role
5. **Security Implementation** - Understand DRM and security requirements
6. **Deploy** - Follow deployment guide for production setup

---

## Technology Stack Summary

| **VPS** | Hetzner Cloud (CPX21 - 4GB RAM) |
| **Database** | Supabase (PostgreSQL 15+) |
| **Cache** | Redis 7+ (Self-hosted) |
| **Video Platform** | Bunny Stream |
| **Auth** | JWT |
| **Payment** | External Recharge via Vouchers |
| **Container** | Docker + Docker Compose |

---

## Key Features

### Content Management
- ✅ **Books** - Categorized reading with demo chapters and optional final exams
- ✅ **Videos** - Course-based learning with lessons, quizzes, and optional final exams
- ✅ **Video Platform**: Bunny Stream (Transcoding + Storage + Delivery)
- ✅ **File Storage**: Local VPS (PDFs, Images)
- **Monetization**: Hybrid (FREE / VIP Subscription / Pay-Per-Course)
- **Virtual Currency**: Linh Thạch (Recharged externally via Vouchers)
- **Authentication**: JWT (djangorestframework-simplejwt)

### Security & DRM
- ✅ **Device Locking** - 1 device per user account
- ✅ **Dynamic Watermarking** - User info overlay on content
- ✅ **Video Protection** - Signed URLs with expiration
- ✅ **Screenshot Prevention** - Platform-specific implementations

### User Management
- ✅ **Hybrid Monetization** - VIP Subscription + Individual Purchases
- ✅ **External Recharge** - Recharge "Linh Thạch" via Vouchers (purchased outside app)
- ✅ **Voucher System** - Redemptive codes for secure wallet top-up
- ✅ **Role-based Access** - FREE, VIP, Paid USER tiers

---

## Development Workflow

### 1. Planning Phase (Current)
- [x] Requirements analysis
- [x] System architecture design
- [x] Database schema design
- [x] API specification
- [x] Security design
- [ ] User acceptance

### 2. Implementation Phase
- [ ] Backend API development (6 weeks)
- [ ] Flutter mobile app (6 weeks)
- [ ] Vue.js web app (4 weeks)
- [ ] Integration testing (2 weeks)

### 3. Deployment Phase
- [ ] Staging environment setup
- [ ] Production deployment
- [ ] Monitoring configuration
- [ ] Performance optimization

---

## Project Timeline

**Phase 1 - MVP (3-4 months)**
- Core features: Books, Videos, Basic Practice
- User authentication and payment
- Mobile + Web apps
- Basic security (device locking, watermarking)

**Phase 2 - Enhancement (2-3 months)**
- Advanced practice module (Kỳ Môn focus)
- Full DRM implementation
- Analytics and reporting
- Performance optimization

**Phase 3 - Scale (Ongoing)**
- Additional content categories
- Social features
- Advanced gamification
- Multi-language support

---

## Contact & Support

For questions or clarifications about this design documentation:

- **Technical Lead**: [Contact Info]
- **Project Manager**: [Contact Info]
- **Repository**: [GitHub URL]

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-17 | Initial design documentation |

---

## Next Steps

1. **Review all documentation** with stakeholders
2. **Finalize requirements** and get approval
3. **Set up development environment**
4. **Begin backend API implementation**
5. **Parallel mobile/web development**

---

*Last updated: 2026-02-17*
