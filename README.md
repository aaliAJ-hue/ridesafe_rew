# 🏍️ RideSafe Rewards

*RideSafe Rewards* is an AI + Blockchain platform that motivates bikers to ride safely by turning responsible behavior into real rewards.  
It uses *machine learning* to analyze ride data and *Web3 smart contracts* to issue tokens for safe riding — blending technology with social impact.

---

## 🚀 What It Does

- Riders upload or stream their *telemetry data* (speed, braking, GPS).  
- An *AI-powered backend* evaluates the data to calculate a *Safety Score (0–100)*.  
- If the ride meets safety thresholds, a *signed hash* is sent to the blockchain.  
- A *smart contract* verifies the ride and mints *SafeRide Tokens* to the user’s wallet.  
- The *frontend dashboard* displays:
  - Safety score and riding stats  
  - Tokens earned  
  - Leaderboard of top safe riders  

---

## 💡 Why We Built It

Road accidents due to overspeeding are a growing concern.  
We wanted to create a fun, fair way to *reward safe riders* using AI for transparency and Web3 for trust.  
Instead of punishing unsafe driving, RideSafe Rewards encourages positive behavior through gamified incentives.

---

## 🧠 Tech Stack

- *Frontend:* React / Vercel (dark modern UI with live stats and leaderboards)  
- *Backend:* Node.js + Express (AI/ML scoring and API handling)  
- *AI/ML:* Custom rule-based scoring model (detects overspeeding, harsh braking, and sharp turns)  
- *Blockchain:* Ethereum / Polygon smart contract for ride verification and token minting  
- *Database:* MongoDB / Firebase for ride logs  
- *Hosting:* Replit (backend), Vercel (frontend)

---

## ⚙️ How It Works (Simplified Flow)

1. Rider uploads ride data → Backend analyzes it using AI.  
2. Backend calculates score + creates a signed hash.  
3. Hash sent to blockchain → Smart contract verifies and rewards tokens.  
4. Frontend updates stats and leaderboard in real time.
