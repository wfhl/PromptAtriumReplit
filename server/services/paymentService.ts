import Stripe from 'stripe';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import { 
  marketplaceOrders, 
  transactionLedger, 
  sellerProfiles, 
  platformSettings,
  payoutBatches,
  users
} from '@shared/schema';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-10-28.acacia' as any,
});

interface PaymentProcessingResult {
  success: boolean;
  orderId: string;
  transactionIds: string[];
  error?: string;
}

interface PayoutResult {
  success: boolean;
  batchId?: string;
  payoutCount: number;
  totalAmountCents: number;
  errors?: string[];
}

export class PaymentService {
  // Process order completion and create necessary transactions
  async processOrderCompletion(
    orderId: string,
    paymentIntentId?: string
  ): Promise<PaymentProcessingResult> {
    const result: PaymentProcessingResult = {
      success: false,
      orderId,
      transactionIds: [],
    };

    try {
      // Start a database transaction
      await db.transaction(async (tx) => {
        // Get order details
        const [order] = await tx
          .select()
          .from(marketplaceOrders)
          .where(eq(marketplaceOrders.id, orderId));

        if (!order) {
          throw new Error('Order not found');
        }

        if (order.status === 'completed') {
          // Already processed - idempotency check
          result.success = true;
          return result;
        }

        // Get seller profile
        const [sellerProfile] = await tx
          .select()
          .from(sellerProfiles)
          .where(eq(sellerProfiles.userId, order.sellerId));

        if (!sellerProfile) {
          throw new Error('Seller profile not found');
        }

        // Get platform commission settings
        const [commissionSetting] = await tx
          .select()
          .from(platformSettings)
          .where(eq(platformSettings.key, 'default_commission_rate'));

        const commissionRate = sellerProfile.commissionRate || 
          (commissionSetting ? Number(commissionSetting.value) : 15);

        // Calculate amounts
        const totalAmountCents = order.amountCents || 0;
        const commissionCents = Math.floor(totalAmountCents * commissionRate / 100);
        const netAmountCents = totalAmountCents - commissionCents;

        // Create purchase transaction
        const [purchaseTransaction] = await tx
          .insert(transactionLedger)
          .values({
            orderId: order.id,
            type: 'purchase',
            status: 'completed',
            fromUserId: order.buyerId,
            toUserId: order.sellerId,
            amountCents: totalAmountCents,
            commissionCents: commissionCents,
            netAmountCents: netAmountCents,
            paymentMethod: order.paymentMethod as any,
            stripePaymentIntentId: paymentIntentId,
            description: `Purchase for order ${order.orderNumber}`,
            processedAt: new Date(),
            completedAt: new Date(),
          })
          .returning();

        result.transactionIds.push(purchaseTransaction.id);

        // Create commission transaction
        const [commissionTransaction] = await tx
          .insert(transactionLedger)
          .values({
            orderId: order.id,
            type: 'commission',
            status: 'completed',
            fromUserId: order.sellerId,
            toUserId: null, // Platform receives commission
            amountCents: commissionCents,
            paymentMethod: order.paymentMethod as any,
            description: `Platform commission for order ${order.orderNumber}`,
            processedAt: new Date(),
            completedAt: new Date(),
          })
          .returning();

        result.transactionIds.push(commissionTransaction.id);

        // If seller has Stripe account, create transfer
        if (sellerProfile.stripeAccountId && order.paymentMethod === 'stripe') {
          try {
            // Create Stripe transfer to connected account
            const transfer = await stripe.transfers.create({
              amount: netAmountCents,
              currency: 'usd',
              destination: sellerProfile.stripeAccountId,
              transfer_group: order.orderNumber,
              description: `Payout for order ${order.orderNumber}`,
              metadata: {
                orderId: order.id,
                sellerUserId: order.sellerId,
              },
            });

            // Update transaction with transfer ID
            await tx
              .update(transactionLedger)
              .set({ stripeTransferId: transfer.id })
              .where(eq(transactionLedger.id, purchaseTransaction.id));

          } catch (stripeError: any) {
            console.error('Stripe transfer error:', stripeError);
            // Log the error but don't fail the transaction
            // The payout can be retried later
            await tx
              .update(transactionLedger)
              .set({ 
                failureReason: stripeError.message,
                status: 'pending' // Mark for retry
              })
              .where(eq(transactionLedger.id, purchaseTransaction.id));
          }
        }

        // Update order status
        await tx
          .update(marketplaceOrders)
          .set({ 
            status: 'completed',
            deliveredAt: new Date(),
          })
          .where(eq(marketplaceOrders.id, orderId));

        // Update seller stats
        await tx
          .update(sellerProfiles)
          .set({
            totalSales: sql`${sellerProfiles.totalSales} + 1`,
            totalRevenueCents: sql`${sellerProfiles.totalRevenueCents} + ${netAmountCents}`,
            updatedAt: new Date(),
          })
          .where(eq(sellerProfiles.userId, order.sellerId));
      });

      result.success = true;
      return result;

    } catch (error: any) {
      console.error('Payment processing error:', error);
      result.error = error.message;
      return result;
    }
  }

  // Process scheduled payouts for sellers
  async processScheduledPayouts(
    payoutMethod: 'stripe' | 'paypal' = 'stripe',
    limit: number = 100
  ): Promise<PayoutResult> {
    const result: PayoutResult = {
      success: false,
      payoutCount: 0,
      totalAmountCents: 0,
      errors: [],
    };

    try {
      // Get payout configuration
      const [minPayoutSetting] = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, 'min_payout_amount_cents'));

      const minPayoutCents = minPayoutSetting ? Number(minPayoutSetting.value) : 1000;

      // Get eligible sellers with pending payouts
      const eligiblePayouts = await db
        .select({
          sellerId: transactionLedger.toUserId,
          totalPendingCents: sql<number>`sum(${transactionLedger.netAmountCents})`,
          transactionIds: sql<string[]>`array_agg(${transactionLedger.id})`,
        })
        .from(transactionLedger)
        .innerJoin(sellerProfiles, eq(sellerProfiles.userId, transactionLedger.toUserId))
        .where(
          and(
            eq(transactionLedger.type, 'purchase'),
            eq(transactionLedger.status, 'completed'),
            eq(sellerProfiles.payoutMethod, payoutMethod),
            eq(sellerProfiles.onboardingStatus, 'completed')
          )
        )
        .groupBy(transactionLedger.toUserId)
        .having(sql`sum(${transactionLedger.netAmountCents}) >= ${minPayoutCents}`)
        .limit(limit);

      if (eligiblePayouts.length === 0) {
        result.success = true;
        return result;
      }

      // Create payout batch
      const batchNumber = `BATCH-${Date.now()}-${payoutMethod.toUpperCase()}`;
      const [batch] = await db
        .insert(payoutBatches)
        .values({
          batchNumber,
          payoutMethod,
          status: 'processing',
          totalAmountCents: eligiblePayouts.reduce((sum, p) => sum + p.totalPendingCents, 0),
          totalPayouts: eligiblePayouts.length,
          processedAt: new Date(),
        })
        .returning();

      result.batchId = batch.id;

      // Process each payout
      for (const payout of eligiblePayouts) {
        try {
          if (payoutMethod === 'stripe') {
            await this.processStripePayout(
              payout.sellerId!,
              payout.totalPendingCents,
              payout.transactionIds,
              batch.id
            );
          } else if (payoutMethod === 'paypal') {
            // Process PayPal payout
            const { paypalService } = await import('./paypalService');
            await paypalService.processPayout(
              payout.sellerId!,
              payout.totalPendingCents,
              payout.transactionIds,
              `Marketplace payout from batch ${batch.id}`
            );
          }

          result.payoutCount++;
          result.totalAmountCents += payout.totalPendingCents;

        } catch (error: any) {
          console.error(`Payout failed for seller ${payout.sellerId}:`, error);
          result.errors?.push(`${payout.sellerId}: ${error.message}`);
          
          // Update batch with failed payout count
          await db
            .update(payoutBatches)
            .set({
              failedPayouts: sql`${payoutBatches.failedPayouts} + 1`,
            })
            .where(eq(payoutBatches.id, batch.id));
        }
      }

      // Update batch status
      const finalStatus = result.errors?.length === 0 ? 'completed' : 
        result.payoutCount === 0 ? 'failed' : 'partial';

      await db
        .update(payoutBatches)
        .set({
          status: finalStatus,
          successfulPayouts: result.payoutCount,
          completedAt: new Date(),
          errorLog: result.errors || [],
        })
        .where(eq(payoutBatches.id, batch.id));

      result.success = true;
      return result;

    } catch (error: any) {
      console.error('Payout batch processing error:', error);
      result.errors?.push(error.message);
      return result;
    }
  }

  // Process individual Stripe payout
  private async processStripePayout(
    sellerId: string,
    amountCents: number,
    transactionIds: string[],
    batchId: string
  ): Promise<void> {
    // Get seller's Stripe account
    const [seller] = await db
      .select()
      .from(sellerProfiles)
      .where(eq(sellerProfiles.userId, sellerId));

    if (!seller || !seller.stripeAccountId) {
      throw new Error('Seller Stripe account not found');
    }

    // Create Stripe payout
    const payout = await stripe.payouts.create(
      {
        amount: amountCents,
        currency: 'usd',
        description: `Marketplace payout batch ${batchId}`,
        metadata: {
          batchId,
          sellerId,
          transactionCount: transactionIds.length.toString(),
        },
      },
      {
        stripeAccount: seller.stripeAccountId,
      }
    );

    // Create payout transaction record
    await db.insert(transactionLedger).values({
      type: 'payout',
      status: 'processing',
      toUserId: sellerId,
      amountCents: amountCents,
      paymentMethod: 'stripe',
      stripePayoutId: payout.id,
      description: `Stripe payout from batch ${batchId}`,
      metadata: {
        batchId,
        sourceTransactionIds: transactionIds,
      },
      processedAt: new Date(),
    });

    // Mark source transactions as paid out
    await db
      .update(transactionLedger)
      .set({
        status: 'completed',
        metadata: sql`${transactionLedger.metadata} || jsonb_build_object('payoutBatchId', ${batchId}, 'stripePayoutId', ${payout.id})`,
      })
      .where(inArray(transactionLedger.id, transactionIds));
  }


  // Handle refunds
  async processRefund(
    orderId: string,
    refundAmountCents?: number,
    reason?: string
  ): Promise<PaymentProcessingResult> {
    const result: PaymentProcessingResult = {
      success: false,
      orderId,
      transactionIds: [],
    };

    try {
      await db.transaction(async (tx) => {
        // Get order details
        const [order] = await tx
          .select()
          .from(marketplaceOrders)
          .where(eq(marketplaceOrders.id, orderId));

        if (!order) {
          throw new Error('Order not found');
        }

        const refundAmount = refundAmountCents || order.amountCents || 0;

        // Create refund with Stripe if applicable
        if (order.stripePaymentIntentId && order.paymentMethod === 'stripe') {
          const refund = await stripe.refunds.create({
            payment_intent: order.stripePaymentIntentId,
            amount: refundAmount,
            reason: 'requested_by_customer',
            metadata: {
              orderId: order.id,
              orderNumber: order.orderNumber,
            },
          });

          // Create refund transaction
          const [refundTransaction] = await tx
            .insert(transactionLedger)
            .values({
              orderId: order.id,
              type: 'refund',
              status: 'completed',
              fromUserId: order.sellerId,
              toUserId: order.buyerId,
              amountCents: refundAmount,
              paymentMethod: 'stripe',
              stripePaymentIntentId: order.stripePaymentIntentId,
              description: reason || `Refund for order ${order.orderNumber}`,
              processedAt: new Date(),
              completedAt: new Date(),
            })
            .returning();

          result.transactionIds.push(refundTransaction.id);
        }

        // Update order status
        await tx
          .update(marketplaceOrders)
          .set({ status: 'refunded' })
          .where(eq(marketplaceOrders.id, orderId));

        // Update seller stats
        await tx
          .update(sellerProfiles)
          .set({
            totalSales: sql`GREATEST(0, ${sellerProfiles.totalSales} - 1)`,
            totalRevenueCents: sql`GREATEST(0, ${sellerProfiles.totalRevenueCents} - ${refundAmount})`,
            updatedAt: new Date(),
          })
          .where(eq(sellerProfiles.userId, order.sellerId));
      });

      result.success = true;
      return result;

    } catch (error: any) {
      console.error('Refund processing error:', error);
      result.error = error.message;
      return result;
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();