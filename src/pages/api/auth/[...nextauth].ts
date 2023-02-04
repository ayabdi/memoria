import NextAuth, { type NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";
// Prisma adapter for NextAuth, optional and can be removed
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { env } from "../../../env/server.mjs";
import { prisma } from "../../../server/db/client";
import { createMessage } from "@/server/services/messages.service.js";
import { CreateMessageSchema } from "@/types/messages.schema.js";

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
      const message: CreateMessageSchema = {
        content: `### Welcome to Memoria!
        ---
        <img src="https://inspgr.id/app/uploads/2014/10/motion-radio-05.gif" width="200" height="200">
        <br>
        
        Your simple to use 2nd brain 🧠🚀
        
        Simply jot down whatever you have in your head, add relevant tags, and hit send!
        <br>
        No need to spend your valuable time and energy having to organize stuff, simply filter your posts by tag, and voila!
        
        I'll be your personal smart assistant along the way, simply enter  **@chat**  in the message box below with anything you wish to ask me.`,
        type: "markdown",
        from: "Memoria Bot",
        tags: [{ tagName: "Bot", color: "rgba(54, 162, 235, 1)" }],
      }
      await createMessage(message, user.id)
    }
  }
};

export default NextAuth(authOptions);
