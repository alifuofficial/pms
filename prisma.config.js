require('dotenv').config();
// No need for defineConfig from prisma/config to avoid module resolution issues in production
module.exports = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js"
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
};
