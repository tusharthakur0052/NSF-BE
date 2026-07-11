# NestJS Backend Architecture

## Overview
A complete enterprise-grade backend built with NestJS, TypeScript, MongoDB, and Mongoose. It uses Clean Architecture principles and modular design, offering features like robust JWT Authentication, Admin Module, Users Module, and Subscription Plans Module.

## Project Structure
```text
src/
├── admin/
├── auth/
├── common/
│   ├── interceptors/
│   │   └── response.interceptor.ts
├── schemas/
│   ├── admin.schema.ts
│   ├── user.schema.ts
│   └── subscription-plan.schema.ts
├── subscription-plans/
├── users/
├── app.controller.ts
├── app.module.ts
├── app.service.ts
└── main.ts
```

## Security Implementation
- **JWT Authentication:** Implemented with short-lived access tokens and long-lived refresh tokens.
- **Password Hashing:** `bcrypt` used for strong password encryption before saving.
- **Data Validation:** Enforced globally using `class-validator` and `ValidationPipe` with whitelist and forbidNonWhitelisted.
- **Helmet:** Protects headers globally in `main.ts`.
- **CORS:** Enabled globally in `main.ts`.
- **Rate Limiting:** Protects endpoints against brute-force using `express-rate-limit`.

## Best Practices
1. **Separation of Concerns:** Each module handles its own domain logic.
2. **Global Response Interceptor:** Standardizes API responses (`success`, `message`, `data`).
3. **Environment Configuration:** Uses `@nestjs/config` for handling environment variables.
4. **Soft Delete:** Enabled for Users and Subscription Plans to prevent permanent data loss. 

## Future Scalability Recommendations
1. **Redis Caching:** Introduce caching for rate limiting and frequently accessed resources.
2. **Microservices:** Extract modules into separate microservices if traffic increases significantly.
3. **Message Queues:** Implement RabbitMQ/Kafka for async tasks.
