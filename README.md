# Real-Time Database Update System

Hi there! Welcome to my solution for the real-time database update assignment. 

When I first looked at the requirements, the core challenge stood out immediately: **How do we get data from a database to a user's screen instantly, without constantly asking the database if anything has changed?**

This README outlines my thought process, the architectural decisions I made, and how to get the project running on your machine.

---

## Design Thinking & Approach

My primary goal was to build a system that is incredibly fast, highly efficient, and avoids unnecessary overhead. Here is the logic behind the tech stack I chose:

### 1. Eliminating Polling (The Database Layer)
Traditional applications use polling (e.g., querying the DB every 5 seconds to check for updates). This wastes server resources and creates lag. 
**My solution:** I used **PostgreSQL's native `LISTEN/NOTIFY` system**. 
I wrote a database trigger that fires exactly when an `INSERT`, `UPDATE`, or `DELETE` happens on the `orders` table. The database itself broadcasts a JSON payload containing the new data. The Node.js server simply listens for this broadcast. No wasted queries.

### 2. Pushing to the Client (Why SSE over WebSockets?)
Once the server has the update, it needs to push it to the browser. Many people default to WebSockets for real-time apps, but I intentionally chose **Server-Sent Events (SSE)** instead. 
**Why?**
* **One-Way Traffic:** The assignment requires the server to push updates to the client. The client doesn't need to push anything back. WebSockets are full-duplex (two-way), which is overkill here.
* **Simplicity & Resilience:** SSE works over standard HTTP. It doesn't require bulky external libraries (like `socket.io`). Even better, the browser's native `EventSource` API handles automatic reconnections out of the box if the server drops.

### 3. Scalability Considerations
While this current solution is perfect for a single server, I wanted to address how this would scale. If we had 10 Node.js servers behind a load balancer, they couldn't all efficiently share a single PostgreSQL `LISTEN` connection. 
**The scaling path:** I would introduce a tool like **Redis Pub/Sub**. The PostgreSQL database would send one notification to Redis, and Redis would instantly distribute that message to all 10 Node.js servers, which would then update their respective clients.

---

## What Does the Code Do?

I've kept the codebase modular and clean, splitting it into three distinct layers:

* **`/db` (The Data Layer):** Contains `init.sql`. This file builds the `orders` table, sets up the PL/pgSQL triggers, and inserts some initial sample data.
* **`/server` (The Broker):** Contains `index.js`. This is a lightweight Node.js server. It maintains a single open connection to Postgres to listen for events, and maintains an open set of HTTP streams for any connected clients.
* **`/client` (The Consumers):** I built two clients to prove the concept:
  1. `index.html`: A vanilla browser UI that uses native `EventSource` to listen to the server and update the HTML table dynamically.
  2. `cli.js`: A Node.js terminal client that streams the updates directly to your command line.

---

## How to Run the Project

I wanted to make this as frictionless as possible for you to evaluate, so I wrapped everything in Docker. You do not need to install Postgres or Node locally.

### Prerequisites
* Docker and Docker Compose installed on your machine.

### Step 1: Start the System
Open your terminal, navigate to this project folder, and run:
```bash
docker compose up --build
```
*This command starts the database, runs the SQL initialization, builds the Node.js server, and wires them together.*

### Step 2: Open the Clients
Once the terminal says the server is running, you can connect your clients:
* **Browser:** Open `http://localhost:3000` in any web browser.
* **CLI (Optional):** Open a second terminal window and run `node client/cli.js`.

### Step 3: Trigger a Real-Time Update
Let's modify the database to see the real-time push in action. Open a new terminal window and jump into the running PostgreSQL container:

```bash
docker compose exec postgres psql -U postgres -d orders_db
```

Now, try running any of these SQL commands and watch your connected browser/CLI instantly update:

```sql
-- Add a new order
INSERT INTO orders (customer_name, product_name, status) VALUES ('Jane Doe', 'Mechanical Keyboard', 'pending');

-- Update an existing order
UPDATE orders SET status = 'shipped' WHERE id = 1;

-- Delete an order
DELETE FROM orders WHERE id = 1;
```

---
*Thank you for reviewing my assignment! I really enjoyed tackling the architecture for this problem.*
