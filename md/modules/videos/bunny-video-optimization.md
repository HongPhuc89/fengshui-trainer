# Bunny Stream Optimization - Cost & Performance

## Overview

To deliver high-quality video content while minimizing costs and maximizing security, the **Bunny Stream** service is recommended. Unlike traditional storage + CDN setups, Bunny Stream is a purpose-built video platform that includes transcoding, storage, delivery, and a specialized player.

---

## Why Bunny Stream?

| Feature | Bunny Stream | Traditional Storage + CDN |
|---------|--------------|--------------------------|
| **Transcoding** | **FREE** (Unlimited resolutions) | Paid (per minute/GB) |
| **Video Player** | **FREE** (Customizable) | Paid or Manual Integration |
| **Storage** | $0.01/GB (Standard HDD) | $0.01 - $0.02/GB |
| **Bandwidth** | $0.005 - $0.01/GB | $0.005 - $0.01/GB |
| **Security** | Built-in (DRM, Signed Tokens) | Manual implementation |

---

## Cost Optimization Strategy

### 1. Resolution Management
Transcoding multiple resolutions (240p, 360p, 480p, 720p, 1080p) is free in Bunny Stream.
> [!TIP]
> To save on **Storage Costs**, limit the maximum resolution to **1080p** (or even 720p for educational content) if the original source is 4K. This prevents Bunny from generating very large 4K variants that increase your per-GB storage bill.

### 2. Strategic Replication
Bunny allows selecting up to 8 storage regions.
- **Recommended**: Select **1 region** (e.g., Europe or US) for the source storage.
- Storage in Bunny is billed per region. Only add more regions if you have extremely high latency requirements, but for most users, Bunny's Edge CDN will handle delivery speed perfectly from a single source.

### 3. Traffic Routing
- **Standard Network**: Best for global delivery (119+ PoPs).
- **Volume Network**: Cheaper but fewer PoPs (10).
- **Strategy**: Use the **Standard Network** for the best user experience. At $0.01/GB for Asia/Oceania, it is already highly optimized compared to Cloudflare or AWS.

### 4. Automatic Bitrate Switching
Bunny Stream handles Adaptive Bitrate (ABR) automatically. This saves costs because mobile users on slow connections will pull lower resolution streams (less bandwidth/money) without manual intervention.

---

## Security Implementation

### Token Authentication (Signed URLs)
Always use **Token Authentication** to prevent hotlinking.
- Expiration: Set short-lived tokens (e.g., 1-2 hours) during the lesson load.
- IP Pinning: Optionally pin the token to the user's IP for maximum security.

### Direct Video Upload
Use the Bunny Stream API to upload videos directly from the Admin backend.
- This avoids intermediate storage on the VPS.
- Enables immediate background transcoding.

---

## Estimated Monthly Cost (Example)

- **Total Video Duration**: 100 hours
- **Approx. Storage size**: 50 GB
- **Monthly Bandwidth**: 500 GB
- **Estimated Total**:
  - Storage: 50 GB * $0.01 = $0.50
  - Bandwidth: 500 GB * $0.01 = $5.00
  - **Total: $5.50 / month** (Extremely cost-effective!)

---

## Development / Local Workflow

To avoid dependency on Bunny Stream during local development:
1.  **Place local videos** in `media/videos/{slug}.mp4`.
2.  **Enable DEBUG mode** in `.env`.
3.  The API will automatically return local media paths instead of searching for Bunny IDs.
4.  **Frontend**: The player will receive a standard MP4 URL and play it using native HTML5 video tags instead of HLS.

---

## Implementation Steps

1. **Configure Bunny Stream Library**: Create a dedicated Video Library in Bunny dashboard.
2. **Set Security Settings**: Enable token authentication and allowed hostnames.
3. **Backend Integration**: Implement Bunny Stream API for video uploads and token generation.
4. **Frontend Integration**: Use the Bunny Stream iframe player or Video.js with the HLS/MP4 stream URL.
