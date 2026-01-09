# 🐦 Zitter — Twitter Clone (Production‑Ready Backend)

Zitter is a **Twitter‑like social media backend** built with **Node.js, Express, MongoDB, and Mongoose**, designed using **industry‑standard schema design, indexing, and API practices**.
This project focuses on **scalability, performance, and clean architecture**, making it suitable for real‑world production use.

---

## 🚀 Features

### 🔐 Authentication & Users

* User signup & login (JWT + HTTP‑only cookies)
* Secure authentication middleware
* Follow / Unfollow users (Subscriptions)

### 📝 Posts (Tweets)

* Create text posts with media (images/videos)
* Media upload limit (max 5 per post)
* Like, repost, bookmark posts
* View, reply, repost & like counters

### 💬 Comments & Replies

* Nested comments (parent → replies)
* Reply count tracking
* Soft delete support (`isDeleted`)

### ❤️ Likes (Polymorphic)

* Like posts **or** comments
* One‑like‑per‑user enforced via compound index

### 🔁 Reposts

* Prevent duplicate reposts
* Repost count optimization

### 🔖 Bookmarks

* Save posts for later
* Fast pagination using indexes

### 🔔 Notifications

* Like / comment / follow / mention notifications
* Read/unread support

### #️⃣ Hashtags

* Automatic hashtag extraction from posts
* Trending hashtags support
* Efficient many‑to‑many relation using junction collection

### 👤 Mentions

* Detect mentioned users in posts
* Avoid duplicate mentions

### 📊 Performance & Scaling

* Compound & single‑field indexes
* Aggregate pagination support
* Optimized MongoDB schema design

---

## 🧱 Tech Stack

| Layer      | Technology                     |
| ---------- | ------------------------------ |
| Runtime    | Node.js                        |
| Framework  | Express.js                     |
| Database   | MongoDB                        |
| ODM        | Mongoose                       |
| Pagination | mongoose-aggregate-paginate-v2 |
| Auth       | JWT + Cookies                  |

---

## 📁 Project Structure

```bash
zitter-backend/
├── src/
│   ├── controllers/      # Request handlers
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API routes
│   ├── middlewares/      # Auth & error middleware
│   ├── services/         # Business logic
│   ├── utils/            # Helpers (hashtags, mentions)
│   └── app.js
├── .env
├── package.json
└── README.md
```

---

## 🧠 Database Models Overview

### User

* Profile data
* Auth credentials

### Post

* Content
* Media array (image/video metadata)
* Counters: likes, reposts, replies, views

### Comment

* Supports nested replies
* Linked to posts

### Like

* Polymorphic (`post` / `comment`)
* Unique per user per target

### Repost

* One repost per user per post

### Bookmark

* User ↔ Post mapping

### Subscription

* User follows another user

### Notification

* Sender → Receiver
* Type‑based notification system

### Hashtag & PostHashtag

* Normalized hashtag system
* Fast trend analysis

### Mention

* Track user mentions in posts

---

## 📐 API Design Principles

* RESTful architecture
* Proper HTTP status codes

  * `200` OK
  * `201` Created
  * `400` Bad Request
  * `401` Unauthorized
  * `403` Forbidden
  * `404` Not Found
  * `409` Conflict (duplicate data)
* Consistent response format

---

## 🧪 Example API Response

```json
{
  "success": true,
  "data": {},
  "message": "Post created successfully"
}
```

---

## ⚙️ Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/zitter
JWT_SECRET=your_secret
COOKIE_SECURE=true
```

---

## 🛠️ Setup & Installation

```bash
# Clone repository
git clone https://github.com/your-username/zitter-backend.git

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 🔒 Security Practices

* HTTP‑only cookies
* Password hashing
* Index‑level duplicate prevention
* Centralized error handling

---

## 📈 Future Enhancements

* Real‑time notifications (WebSockets)
* Media upload to S3 / Cloudinary
* Full‑text search
* Rate limiting
* Analytics dashboard

---

## 👨‍💻 Author

**Deepak**
Backend Developer | MERN Stack

---

## ⭐ Final Note

Zitter is built with **learning + production mindset**, following patterns used in real‑world social media platforms like Twitter/X.

If you find this project useful, consider giving it a ⭐ and contributing 🙌
