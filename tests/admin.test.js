import mongoose from "mongoose";
import request from "supertest";
import app from "../src/app.js";
import { configDotenv } from "dotenv";

configDotenv();

/* Connecting to the database before all tests. */
beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});

/* Closing database connection after all tests. */
afterAll(async () => {
  await mongoose.connection.close();
});

describe("GET /api/referral-system/admin", () => {
  it("should return all agents", async () => {
    const res = await request(app).get("/api/referral-system/admin/agent");
    expect(res.statusCode).toBe(200);
    expect(res.body.agents.length).toBeGreaterThan(0);
  });
});

describe("GET /api/referral-system/admin/:agentId", () => {
  it("should return agent using their ID", async () => {
    const res = await request(app).get("/api/referral-system/admin/agent/agentId/67f4e54a3977b936c94832de");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("agentId");
    expect(res.body).toHaveProperty("name");
    expect(res.body).toHaveProperty("email");
    expect(res.body).toHaveProperty("phoneNumber");
    expect(res.body).toHaveProperty("earnings");
    expect(res.body).toHaveProperty("withdrawal");
    expect(res.body).toHaveProperty("balance");
    expect(res.body).toHaveProperty("joinedOn");
    expect(res.body).toHaveProperty("joinedOn");
    expect(res.body).toHaveProperty("referral");
    expect(res.body).toHaveProperty("referral.active");
    expect(res.body).toHaveProperty("referral.used");
  });
});

describe("GET /api/referral-system/admin/:agentId", () => {
  it("should return agent using their ID", async () => {
    const res = await request(app).get("/api/referral-system/admin/agent/agentId/67f4e54a3977b936c94832de");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("agentId");
    expect(res.body).toHaveProperty("name");
    expect(res.body).toHaveProperty("email");
    expect(res.body).toHaveProperty("phoneNumber");
    expect(res.body).toHaveProperty("earnings");
    expect(res.body).toHaveProperty("withdrawal");
    expect(res.body).toHaveProperty("balance");
    expect(res.body).toHaveProperty("joinedOn");
    expect(res.body).toHaveProperty("joinedOn");
    expect(res.body).toHaveProperty("referral");
    expect(res.body).toHaveProperty("referral.active");
    expect(res.body).toHaveProperty("referral.used");
  });
});
