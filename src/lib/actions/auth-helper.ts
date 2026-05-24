import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function resolveSessionUser() {
  const session = await auth();
  if (!session?.user) return null;
  
  const email = session.user.email;
  
  if (email) {
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, name: true }
    });
    if (dbUser) {
      return { 
        id: dbUser.id, 
        role: dbUser.role, 
        email, 
        name: dbUser.name 
      };
    }
  }
  
  return {
    id: (session.user as any).id,
    role: (session.user as any).role,
    email: session.user.email,
    name: session.user.name
  };
}
