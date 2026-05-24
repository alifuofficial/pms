import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { appendFile } from "fs/promises";

export async function resolveSessionUser() {
  const session = await auth();
  
  let dbUserResolved = false;
  let resolvedUser = null;

  if (session?.user) {
    const email = session.user.email;
    if (email) {
      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true, name: true }
      });
      if (dbUser) {
        dbUserResolved = true;
        resolvedUser = { 
          id: dbUser.id, 
          role: dbUser.role, 
          email, 
          name: dbUser.name 
        };
      }
    }
  }

  const finalUser = resolvedUser || (session?.user ? {
    id: (session.user as any).id,
    role: (session.user as any).role,
    email: session.user.email,
    name: session.user.name
  } : null);

  // Write debug log persistently in production container
  try {
    const logEntry = `[${new Date().toISOString()}] Session: ${JSON.stringify(session?.user || null)} | DB Resolved: ${dbUserResolved} | Final Resolved User: ${JSON.stringify(finalUser)}\n`;
    await appendFile("/app/data/session-debug.log", logEntry);
  } catch (e) {
    // Also fallback to local public directory if data directory doesn't exist
    try {
      const logEntry = `[${new Date().toISOString()}] Session: ${JSON.stringify(session?.user || null)} | DB Resolved: ${dbUserResolved} | Final Resolved User: ${JSON.stringify(finalUser)}\n`;
      await appendFile("./session-debug.log", logEntry);
    } catch (err) {}
  }

  return finalUser;
}
