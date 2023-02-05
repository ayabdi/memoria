import NextAuth, { type NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";
// Prisma adapter for NextAuth, optional and can be removed
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { env } from "../../../env/server.mjs";
import { prisma } from "../../../server/db/client";
import { createMessage } from "@/server/services/messages.service";
import { CreateMessageSchema } from "@/types/messages.schema";
import { readFileSync } from "fs";
import path from "path";

export const authOptions: NextAuthOptions = {
  // Include user.id on session
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  // Configure one or more authentication providers
  adapter: PrismaAdapter(prisma),
  providers: [
    DiscordProvider({
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
    }),
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    })
  ],
  events: {
    createUser: async ({ user }) => {
      // Create a welcome message for the user
      const introFile = path.join(process.cwd(), 'src', 'server', 'misc', 'intro_message.md')
      const introMessage = readFileSync(introFile, 'utf8')

      const message: CreateMessageSchema = {
        content: introMessage,
        type: "markdown",
        from: "Memoria Bot",
        tags: [{ tagName: "Bot", color: "rgba(54, 162, 235, 1)" }],
      }
      await createMessage(message, user.id)
    }
  }
};

export default NextAuth(authOptions);
