import { router } from "../trpc";
import { authRouter } from "./auth";
import { exampleRouter } from "./example";
import { messageRouter } from "./message";

export const appRouter = router({
  example: exampleRouter,
  auth: authRouter,
  message: messageRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
