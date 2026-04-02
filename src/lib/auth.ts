import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: 24 * 60 * 60, // revalidate every 24h
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.isActive) {
          return null;
        }

        // Check account lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null;
        }

        const isValidPassword = await compare(password, user.passwordHash);

        if (!isValidPassword) {
          const attempts = user.loginAttempts + 1;
          const updateData: { loginAttempts: number; lockedUntil?: Date } = {
            loginAttempts: attempts,
          };

          // Lock after 10 failed attempts for 30 minutes
          if (attempts >= 10) {
            updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
          }

          await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });

          return null;
        }

        // Reset failed attempts on successful login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in: create a DB session and store the token reference in JWT
      if (user) {
        // Look up by email to get verified DB id (user.id from Auth.js can differ)
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: { id: true, role: true, displayName: true },
        });

        if (!dbUser) return null;

        const sessionToken = randomUUID();
        const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000);

        await prisma.session.create({
          data: { sessionToken, userId: dbUser.id, expires },
        });

        token.sessionToken = sessionToken;
        token.id = dbUser.id;
        token.role = dbUser.role;
        token.name = dbUser.displayName;
        return token;
      }

      // On subsequent revalidations: check DB session is still valid
      if (token.sessionToken) {
        const session = await prisma.session.findUnique({
          where: { sessionToken: token.sessionToken as string },
          include: {
            user: {
              select: {
                isActive: true,
                lockedUntil: true,
                role: true,
                displayName: true,
              },
            },
          },
        });

        // Session revoked or expired
        if (!session || session.expires < new Date()) {
          return null;
        }

        // User deactivated or locked — revoke session
        if (
          !session.user.isActive ||
          (session.user.lockedUntil && session.user.lockedUntil > new Date())
        ) {
          await prisma.session
            .delete({ where: { sessionToken: token.sessionToken as string } })
            .catch(() => {});
          return null;
        }

        // Sync latest role and name in case admin changed them
        token.role = session.user.role;
        token.name = session.user.displayName;
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      // Delete DB session on logout for instant revocation
      const token = (message as { token?: { sessionToken?: string } }).token;
      if (token?.sessionToken) {
        await prisma.session
          .delete({ where: { sessionToken: token.sessionToken } })
          .catch(() => {});
      }
    },
  },
});
