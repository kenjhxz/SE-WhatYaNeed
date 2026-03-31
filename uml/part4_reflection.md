# WhatYaNeed – UML Assignment Reflection

**Project:** WhatYaNeed – Community Needs Board  
**Tech Stack:** HTML · CSS · JavaScript (Frontend) | Node.js / Express (Backend) | MySQL (Database)  
**Actors:** Requester · Volunteer · Admin

---

## Part 4 – Reflection

### 1. What is the most important component in your system?

The **Node.js API Server** (backend) is the most critical component because it is the single point through which every action flows — authentication, creating requests, volunteering for tasks, and sending notifications. Without it, neither the requester nor the volunteer can interact with any data. Protecting and scaling this layer directly determines the overall reliability of the platform.

### 2. Where can your system fail?

The biggest single point of failure is the **MySQL database**. If the database goes down, the entire application loses access to users, requests, and offers — making the platform completely unusable. A secondary failure point is the **session store**: if sessions are kept in server memory (as in a single-server setup), any server restart logs out all active users simultaneously.

### 3. How can your system be improved to support more users?

The system can be improved by adding **horizontal scaling** — running multiple Node.js server instances behind a load balancer so traffic is distributed evenly. To complement this, **Redis** should be used as a shared session store so any server can validate a user's session. On the database side, adding a **read replica** offloads SELECT queries from the primary MySQL instance, allowing the system to handle far more concurrent reads without degradation.

---

## Part 5 – Improvement Analysis

### What is different between the diagram and the actual implementation?

The **System Architecture Diagram** (Part 3) shows a **Load Balancer distributing traffic across two separate Node.js application servers**, plus a **Redis cache** for shared session storage and a **MySQL read replica** for scalable reads. In the actual SE project implementation, the backend runs as a **single Node.js/Express process** on `localhost:3000`, with no load balancer, no Redis cache, and a single MySQL instance accessed directly by that one server.

### Why was it designed this way in the diagram?

The diagram was designed to reflect a **production-grade, scalable architecture** rather than the development setup. The assignment asks us to model how the system *should* operate to support many users concurrently — a real community board would need redundancy and load distribution to stay available during peak usage. Showing the load balancer, Redis, and read replica illustrates the intended growth path for the project even if those components are not yet implemented in the current prototype.
