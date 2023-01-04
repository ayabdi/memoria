import { router } from "../trpc";
import { authRouter } from "./auth";
import { messageRouter } from "./message";

export const appRouter = router({
  auth: authRouter,
  message: messageRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
