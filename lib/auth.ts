import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
    schema,
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  user: {
    modelName: 'usersTables',
  },
  session: {
    modelName: 'sessionsTables',
  },
  account: {
    modelName: 'accountsTables',
  },
  verification: {
    modelName: 'verificationsTables',
  },
  emailAndPassword: {
    enabled: true,
  },
});
