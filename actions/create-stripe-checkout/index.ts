// 'use server';

// import { headers } from 'next/headers';
// import Stripe from 'stripe';

// import { auth } from '@/lib/auth';
// import { actionClient } from '@/lib/next-safe.action';

// export const createStripeCheckout = actionClient.action(async () => {
//   const session = await auth.api.getSession({
//     headers: await headers(),
//   });

//   if (!session?.user) {
//     throw new Error('Unauthorized');
//   }

//   if (!process.env.STRIPE_SECRET_KEY) {
//     throw new Error('Stripe secret key not found');
//   }

//   if (!process.env.NEXT_PUBLIC_APP_URL) {
//     throw new Error('App URL not found');
//   }

//   if (!process.env.STRIPE_ESSENTIAL_PLAN_PRICE_ID) {
//     throw new Error('Stripe plan price id not found');
//   }

//   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {});

//   const checkoutSession = await stripe.checkout.sessions.create({
//     payment_method_types: ['card'],
//     mode: 'subscription',
//     success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
//     cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=canceled`,
//     subscription_data: {
//       metadata: {
//         userId: session.user.id,
//       },
//     },
//     line_items: [
//       {
//         price: process.env.STRIPE_ESSENTIAL_PLAN_PRICE_ID,
//         quantity: 1,
//       },
//     ],
//   });

//   if (!checkoutSession.url) {
//     throw new Error('Checkout URL not found');
//   }

//   return {
//     url: checkoutSession.url,
//   };
// });

'use server';

import { headers } from 'next/headers';
import Stripe from 'stripe';

import { auth } from '@/lib/auth';
import { actionClient } from '@/lib/next-safe.action';

export const createStripeCheckout = actionClient.action(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key not found');
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    throw new Error('App URL not found');
  }

  if (!process.env.STRIPE_ESSENTIAL_PLAN_PRICE_ID) {
    throw new Error('Stripe plan price id not found');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {});

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',

    // ✅ importante: vincula a sessão ao usuário do seu sistema
    client_reference_id: session.user.id,

    // ✅ ajuda a Stripe já preencher / associar email do cliente
    customer_email: session.user.email,

    // ✅ metadata no próprio Checkout Session
    metadata: {
      userId: session.user.id,
      userEmail: session.user.email,
      plan: 'essential',
    },

    // ✅ metadata também na assinatura criada pelo Checkout
    subscription_data: {
      metadata: {
        userId: session.user.id,
        userEmail: session.user.email,
        plan: 'essential',
      },
    },

    line_items: [
      {
        price: process.env.STRIPE_ESSENTIAL_PLAN_PRICE_ID,
        quantity: 1,
      },
    ],

    // pode manter assim por enquanto
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/new-subscription?checkout=canceled`,
  });

  if (!checkoutSession.url) {
    throw new Error('Checkout URL not found');
  }

  return {
    url: checkoutSession.url,
  };
});
