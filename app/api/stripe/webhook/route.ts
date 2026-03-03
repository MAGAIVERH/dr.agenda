// import { eq } from 'drizzle-orm';
// import { NextResponse } from 'next/server';
// import Stripe from 'stripe';

// import { db } from '@/db';
// import { usersTables } from '@/db/schema';

// export const POST = async (request: Request) => {
//   if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
//     throw new Error('Stripe secret key not found');
//   }
//   const signature = request.headers.get('stripe-signature');
//   if (!signature) {
//     throw new Error('Stripe signature not found');
//   }
//   const text = await request.text();
//   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {});
//   const event = stripe.webhooks.constructEvent(text, signature, process.env.STRIPE_WEBHOOK_SECRET);

//   switch (event.type) {
//     case 'invoice.paid': {
//       if (!event.data.object.id) {
//         throw new Error('Subscription ID not found');
//       }
//       const { subscription, subscription_details, customer } = event.data.object as unknown as {
//         customer: string;
//         subscription: string;
//         subscription_details: {
//           metadata: {
//             userId: string;
//           };
//         };
//       };
//       if (!subscription) {
//         throw new Error('Subscription not found');
//       }
//       const userId = subscription_details.metadata.userId;
//       if (!userId) {
//         throw new Error('User ID not found');
//       }
//       await db
//         .update(usersTables)
//         .set({
//           stripeSubscriptionId: subscription,
//           stripeCustomerId: customer,
//           plan: 'essential',
//         })
//         .where(eq(usersTables.id, userId));
//       break;
//     }
//     case 'customer.subscription.deleted': {
//       if (!event.data.object.id) {
//         throw new Error('Subscription ID not found');
//       }
//       const subscription = await stripe.subscriptions.retrieve(event.data.object.id);
//       if (!subscription) {
//         throw new Error('Subscription not found');
//       }
//       const userId = subscription.metadata.userId;
//       if (!userId) {
//         throw new Error('User ID not found');
//       }
//       await db
//         .update(usersTables)
//         .set({
//           stripeSubscriptionId: null,
//           stripeCustomerId: null,
//           plan: null,
//         })
//         .where(eq(usersTables.id, userId));
//     }
//   }
//   return NextResponse.json({
//     received: true,
//   });
// };

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { db } from '@/db';
import { usersTables } from '@/db/schema';

export const runtime = 'nodejs';

export const POST = async (request: Request) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe secret key not found');
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Stripe signature not found' }, { status: 400 });
  }

  const payload = await request.text();

  if (!payload) {
    return NextResponse.json({ error: 'Empty webhook payload' }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {});

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);

    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;

        const subscriptionId =
          typeof invoice.parent?.subscription_details?.subscription === 'string'
            ? invoice.parent.subscription_details.subscription
            : invoice.parent?.subscription_details?.subscription?.id;

        if (!subscriptionId) {
          console.warn('invoice.paid received without subscription. Ignoring event.');
          break;
        }

        const userId = invoice.parent?.subscription_details?.metadata?.userId;

        if (!userId) {
          console.warn('invoice.paid received without userId metadata. Ignoring event.');
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

        if (!customerId) {
          console.warn('invoice.paid received without customer. Ignoring event.');
          break;
        }

        if (!userId || !customerId) {
          console.warn('Subscription metadata/customer missing. Ignoring event.');
          break;
        }

        await db
          .update(usersTables)
          .set({
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: customerId,
            plan: 'essential',
          })
          .where(eq(usersTables.id, userId));

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;

        if (!userId) {
          console.warn('Subscription deleted without userId metadata. Ignoring event.');
          break;
        }

        await db
          .update(usersTables)
          .set({
            stripeSubscriptionId: null,
            stripeCustomerId: null,
            plan: null,
          })
          .where(eq(usersTables.id, userId));

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);

    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
};
