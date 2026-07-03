const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
try { require('dotenv').config(); } catch (e) {}

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });



async function main() {
  const roles = ["ADMIN", "ACCOUNTANT", "MANAGER", "TENANT"];
  const passwordHash = "$2b$10$a3.FY.YBlSI85Ms9ZalA1O3EyBmSojB0M3Nwz1Kq6QfyzG0MqMuzC"; // Pre-calculated hash for 'Soreti123!'

  // 1. Seed Users
  for (const role of roles) {
    const email = `${role.toLowerCase()}@soreti.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash: passwordHash,
      },
      create: {
        email,
        name: `Soreti ${role.charAt(0) + role.slice(1).toLowerCase()} Demo`,
        passwordHash: passwordHash,
        role: role,
      },
    });
    console.log(`Created/Updated user: ${user.email} with role ${user.role}`);
  }

  // 2. Seed System Settings
  await prisma.systemSettings.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      systemName: "Soreti Property Rental",
      organizationName: "Soreti International Trading",
      currency: "ETB",
      calendarType: "GREGORIAN",
      primaryColor: "#2563eb",
    },
  });
  console.log("System settings seeded.");

  // 3. Seed SMS Templates
  const templates = [
    {
      slug: "otp-code",
      name: "OTP Verification",
      description: "Sent when a user requests a login or reset code.",
      content: "Your Soreti PMS verification code is: {{code}}. Valid for 10 minutes."
    },
    {
      slug: "password-reset-success",
      name: "Password Reset Success",
      description: "Sent after a user successfully changes their password.",
      content: "Your Soreti PMS password has been successfully reset. If you did not authorize this, please contact IT Support."
    },
    {
      slug: "late-fee-1",
      name: "Late Fee Penalty (5%)",
      description: "Sent 5 days after payment deadline.",
      content: "Dear {{tenant_name}}, your rent for {{property_name}} Unit {{unit_number}} is overdue. A 5% penalty has been applied. Total due: {{amount}}."
    },
    {
      slug: "late-fee-2",
      name: "Final Warning (10%)",
      description: "Sent 12 days after payment deadline.",
      content: "FINAL WARNING: Your rent for Unit {{unit_number}} is significantly overdue. A 10% penalty is now applied. Total: {{amount}}. Please pay immediately to avoid legal action."
    },
    {
      slug: "payment-approved",
      name: "Payment Approval",
      description: "Sent when a receipt is verified and approved.",
      content: "Dear {{tenant_name}}, your payment of {{amount}} for Unit {{unit_number}} has been approved. Thank you!"
    },
    {
      slug: "payment-rejected",
      name: "Payment Rejection",
      description: "Sent when a receipt is rejected.",
      content: "ALERT: Your payment submission for Unit {{unit_number}} was rejected. Please check your dashboard and re-upload a valid receipt."
    },
    {
      slug: "lease-activation",
      name: "Lease Activation",
      description: "Sent when a new tenant lease is activated.",
      content: "Welcome {{tenant_name}}! Your lease for Unit {{unit_number}} is now active. You can access the portal with your phone number."
    },
    {
      slug: "utility-bill-created",
      name: "Utility Bill Created",
      description: "Sent when an admin/manager records a utility bill.",
      content: "Dear {{tenant_name}}, your {{utility_type}} bill for {{billing_month}} is {{amount}} {{currency}}. Please scan the QR code in your shop to submit payment."
    },
    {
      slug: "utility-payment-approved",
      name: "Utility Payment Approval",
      description: "Sent when a utility payment is verified and approved.",
      content: "Dear {{tenant_name}}, your utility payment of {{amount}} {{currency}} for {{utility_type}} has been approved. Thank you!"
    },
    {
      slug: "prepaid-expiry-5",
      name: "Prepaid Expiry Warning (5 Days Left)",
      description: "Sent 5 days before prepaid coverage expires.",
      content: "Dear {{tenant_name}}, rent for {{month_name}} is due. Total: {{amount}} ETB. Please pay within 5 days to avoid grace period and late fee."
    },
    {
      slug: "prepaid-expiry-0",
      name: "Grace Period Start (0 Days Left)",
      description: "Sent when prepaid coverage expires and grace period starts.",
      content: "Dear {{tenant_name}}, your rent is overdue. Total to pay for {{month_name}}: {{amount}} ETB. Please pay immediately to avoid 5% late penalty."
    }
  ];

  for (const t of templates) {
    await prisma.smsTemplate.upsert({
      where: { slug: t.slug },
      update: {
        content: t.content,
        name: t.name,
        description: t.description
      },
      create: t
    });
  }
  console.log("SMS templates seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
