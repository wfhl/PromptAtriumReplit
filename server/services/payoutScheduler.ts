import { db } from '../db';
import { transactionLedger, payoutBatches, sellerProfiles, platformSettings } from '@shared/schema';
import { eq, and, sql, gte, lte, isNull } from 'drizzle-orm';
import { paymentService } from './paymentService';

export class PayoutScheduler {
  private isProcessing = false;
  private scheduleInterval: NodeJS.Timeout | null = null;

  /**
   * Start the payout scheduler
   */
  async start() {
    // Get payout frequency from platform settings
    const frequencySetting = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, 'payout_frequency'))
      .limit(1);
    
    const frequency = frequencySetting[0]?.value ? JSON.parse(frequencySetting[0].value as string) : 'weekly';
    
    // Set interval based on frequency
    const intervalMs = this.getIntervalMs(frequency);
    
    // Clear existing interval if any
    if (this.scheduleInterval) {
      clearInterval(this.scheduleInterval);
    }
    
    // Set up new interval
    this.scheduleInterval = setInterval(async () => {
      await this.processScheduledPayouts();
    }, intervalMs);
    
    console.log(`Payout scheduler started with ${frequency} frequency`);
    
    // Process immediately on start
    await this.processScheduledPayouts();
  }
  
  /**
   * Stop the payout scheduler
   */
  stop() {
    if (this.scheduleInterval) {
      clearInterval(this.scheduleInterval);
      this.scheduleInterval = null;
      console.log('Payout scheduler stopped');
    }
  }
  
  /**
   * Get interval in milliseconds based on frequency
   */
  private getIntervalMs(frequency: string): number {
    switch (frequency) {
      case 'daily':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      case 'biweekly':
        return 14 * 24 * 60 * 60 * 1000; // 14 days
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000; // 30 days
      default:
        return 7 * 24 * 60 * 60 * 1000; // Default to weekly
    }
  }
  
  /**
   * Process scheduled payouts
   */
  async processScheduledPayouts() {
    if (this.isProcessing) {
      console.log('Payout processing already in progress, skipping...');
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Check if auto payouts are enabled
      const autoPayoutSetting = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, 'enable_auto_payouts'))
        .limit(1);
      
      const autoPayoutsEnabled = autoPayoutSetting[0]?.value === 'true' || 
                                  JSON.parse((autoPayoutSetting[0]?.value as string) || 'false');
      
      if (!autoPayoutsEnabled) {
        console.log('Auto payouts disabled, skipping scheduled processing');
        return;
      }
      
      // Get payout delay days
      const delayDaysSetting = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, 'payout_delay_days'))
        .limit(1);
      
      const delayDays = delayDaysSetting[0]?.value ? 
        Number(JSON.parse(delayDaysSetting[0].value as string)) : 7;
      
      // Calculate cutoff date (transactions older than delay days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - delayDays);
      
      // Process Stripe payouts
      await this.processStripePayouts(cutoffDate);
      
      // Process PayPal payouts
      await this.processPayPalPayouts(cutoffDate);
      
      console.log('Scheduled payout processing completed');
    } catch (error) {
      console.error('Error processing scheduled payouts:', error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Process Stripe Connect payouts
   */
  private async processStripePayouts(cutoffDate: Date) {
    try {
      // Get minimum payout amount
      const minPayoutSetting = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, 'min_payout_amount_cents'))
        .limit(1);
      
      const minPayoutCents = minPayoutSetting[0]?.value ? 
        Number(JSON.parse(minPayoutSetting[0].value as string)) : 1000;
      
      // Find sellers with Stripe accounts who have pending payouts
      const eligibleSellers = await db
        .select({
          sellerId: (transactionLedger as any).userId,
          totalAmount: sql<number>`SUM(${(transactionLedger as any).amount})`,
          stripeAccountId: sellerProfiles.stripeAccountId,
        })
        .from(transactionLedger)
        .innerJoin(sellerProfiles, eq((transactionLedger as any).userId, sellerProfiles.userId))
        .where(
          and(
            eq(transactionLedger.type, 'purchase'),
            eq(transactionLedger.status, 'completed'),
            eq(transactionLedger.paymentMethod, 'stripe'),
            lte(transactionLedger.createdAt, cutoffDate),
            isNull((transactionLedger as any).payoutBatchId)
          )
        )
        .groupBy((transactionLedger as any).userId, sellerProfiles.stripeAccountId)
        .having(sql`SUM(${(transactionLedger as any).amount}) >= ${minPayoutCents}`);
      
      if (eligibleSellers.length === 0) {
        console.log('No eligible Stripe sellers for payout');
        return;
      }
      
      // Create payout batch
      const batch = await db
        .insert(payoutBatches)
        .values({
          payoutMethod: 'stripe',
          status: 'processing',
          totalAmount: eligibleSellers.reduce((sum, s) => sum + s.totalAmount, 0),
          payoutCount: eligibleSellers.length,
          metadata: {
            scheduled: true,
            cutoffDate: cutoffDate.toISOString(),
          },
        } as any)
        .returning();
      
      const batchId = batch[0].id;
      
      // Process each seller
      for (const seller of eligibleSellers) {
        try {
          // Get transactions to payout
          const transactions = await db
            .select()
            .from(transactionLedger)
            .where(
              and(
                eq((transactionLedger as any).userId, seller.sellerId),
                eq(transactionLedger.type, 'purchase'),
                eq(transactionLedger.status, 'completed'),
                eq(transactionLedger.paymentMethod, 'stripe'),
                lte(transactionLedger.createdAt, cutoffDate),
                isNull((transactionLedger as any).payoutBatchId)
              )
            );
          
          // Create Stripe transfer
          const transferId = await (paymentService as any).createStripeTransfer(
            seller.stripeAccountId!,
            seller.totalAmount,
            transactions.map(t => t.orderId!).filter(Boolean)
          );
          
          // Update transactions with batch ID and transfer ID
          await db
            .update(transactionLedger)
            .set({
              payoutBatchId: batchId,
              stripeTransferId: transferId,
              processedAt: new Date(),
            } as any)
            .where(
              and(
                eq((transactionLedger as any).userId, seller.sellerId),
                eq(transactionLedger.type, 'purchase'),
                eq(transactionLedger.status, 'completed'),
                eq(transactionLedger.paymentMethod, 'stripe'),
                lte(transactionLedger.createdAt, cutoffDate),
                isNull((transactionLedger as any).payoutBatchId)
              )
            );
          
          console.log(`Processed Stripe payout for seller ${seller.sellerId}: $${seller.totalAmount / 100}`);
        } catch (error) {
          console.error(`Failed to process payout for seller ${seller.sellerId}:`, error);
        }
      }
      
      // Update batch status
      await db
        .update(payoutBatches)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(payoutBatches.id, batchId));
      
    } catch (error) {
      console.error('Error processing Stripe payouts:', error);
    }
  }
  
  /**
   * Process PayPal payouts
   */
  private async processPayPalPayouts(cutoffDate: Date) {
    try {
      // Get minimum payout amount
      const minPayoutSetting = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, 'min_payout_amount_cents'))
        .limit(1);
      
      const minPayoutCents = minPayoutSetting[0]?.value ? 
        Number(JSON.parse(minPayoutSetting[0].value as string)) : 1000;
      
      // Find sellers with PayPal accounts who have pending payouts
      const eligibleSellers = await db
        .select({
          sellerId: (transactionLedger as any).userId,
          totalAmount: sql<number>`SUM(${(transactionLedger as any).amount})`,
          paypalEmail: sellerProfiles.paypalEmail,
        })
        .from(transactionLedger)
        .innerJoin(sellerProfiles, eq((transactionLedger as any).userId, sellerProfiles.userId))
        .where(
          and(
            eq(transactionLedger.type, 'purchase'),
            eq(transactionLedger.status, 'completed'),
            eq(transactionLedger.paymentMethod, 'paypal'),
            lte(transactionLedger.createdAt, cutoffDate),
            isNull((transactionLedger as any).payoutBatchId)
          )
        )
        .groupBy((transactionLedger as any).userId, sellerProfiles.paypalEmail)
        .having(sql`SUM(${(transactionLedger as any).amount}) >= ${minPayoutCents}`);
      
      if (eligibleSellers.length === 0) {
        console.log('No eligible PayPal sellers for payout');
        return;
      }
      
      // Create payout batch
      const batch = await db
        .insert(payoutBatches)
        .values({
          payoutMethod: 'paypal',
          status: 'processing',
          totalAmount: eligibleSellers.reduce((sum, s) => sum + s.totalAmount, 0),
          payoutCount: eligibleSellers.length,
          metadata: {
            scheduled: true,
            cutoffDate: cutoffDate.toISOString(),
          },
        } as any)
        .returning();
      
      const batchId = batch[0].id;
      
      // Process PayPal batch (would need PayPal Payouts API integration)
      // For now, just mark as pending manual processing
      for (const seller of eligibleSellers) {
        // Update transactions with batch ID
        await db
          .update(transactionLedger)
          .set({
            payoutBatchId: batchId,
            processedAt: new Date(),
          } as any)
          .where(
            and(
              eq((transactionLedger as any).userId, seller.sellerId),
              eq(transactionLedger.type, 'purchase'),
              eq(transactionLedger.status, 'completed'),
              eq(transactionLedger.paymentMethod, 'paypal'),
              lte(transactionLedger.createdAt, cutoffDate),
              isNull((transactionLedger as any).payoutBatchId)
            )
          );
        
        console.log(`Queued PayPal payout for seller ${seller.sellerId}: $${seller.totalAmount / 100}`);
      }
      
      // Update batch status to pending (requires manual processing or PayPal API)
      await db
        .update(payoutBatches)
        .set({
          status: 'pending',
          metadata: {
            scheduled: true,
            cutoffDate: cutoffDate.toISOString(),
            requiresManualProcessing: true,
            sellers: eligibleSellers.map(s => ({
              sellerId: s.sellerId,
              amount: s.totalAmount,
              email: s.paypalEmail,
            })),
          },
        })
        .where(eq(payoutBatches.id, batchId));
      
      console.log('PayPal payout batch created, awaiting manual processing');
      
    } catch (error) {
      console.error('Error processing PayPal payouts:', error);
    }
  }
  
  /**
   * Get next payout date for a seller
   */
  async getNextPayoutDate(sellerId: string): Promise<{ date: Date; amount: number } | null> {
    try {
      // Get payout delay days
      const delayDaysSetting = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, 'payout_delay_days'))
        .limit(1);
      
      const delayDays = delayDaysSetting[0]?.value ? 
        Number(JSON.parse(delayDaysSetting[0].value as string)) : 7;
      
      // Get payout frequency
      const frequencySetting = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, 'payout_frequency'))
        .limit(1);
      
      const frequency = frequencySetting[0]?.value ? 
        JSON.parse(frequencySetting[0].value as string) : 'weekly';
      
      // Calculate next payout date based on frequency
      const today = new Date();
      const nextDate = new Date();
      
      switch (frequency) {
        case 'daily':
          nextDate.setDate(today.getDate() + 1);
          break;
        case 'weekly':
          // Next Monday
          const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
          nextDate.setDate(today.getDate() + daysUntilMonday);
          break;
        case 'biweekly':
          // Every other Monday
          const daysUntilBiweekly = (8 - today.getDay()) % 7 || 7;
          nextDate.setDate(today.getDate() + daysUntilBiweekly);
          if (Math.floor(today.getTime() / (14 * 24 * 60 * 60 * 1000)) % 2 === 0) {
            nextDate.setDate(nextDate.getDate() + 7);
          }
          break;
        case 'monthly':
          // First of next month
          nextDate.setMonth(today.getMonth() + 1, 1);
          break;
      }
      
      // Calculate cutoff date for transactions
      const cutoffDate = new Date(nextDate);
      cutoffDate.setDate(cutoffDate.getDate() - delayDays);
      
      // Get pending amount
      const pendingResult = await db
        .select({
          totalAmount: sql<number>`SUM(${(transactionLedger as any).amount})`,
        })
        .from(transactionLedger)
        .where(
          and(
            eq((transactionLedger as any).userId, sellerId),
            eq(transactionLedger.type, 'purchase'),
            eq(transactionLedger.status, 'completed'),
            lte(transactionLedger.createdAt, cutoffDate),
            isNull((transactionLedger as any).payoutBatchId)
          )
        );
      
      const pendingAmount = pendingResult[0]?.totalAmount || 0;
      
      if (pendingAmount === 0) {
        return null;
      }
      
      return {
        date: nextDate,
        amount: pendingAmount,
      };
    } catch (error) {
      console.error('Error calculating next payout date:', error);
      return null;
    }
  }
}

// Export singleton instance
export const payoutScheduler = new PayoutScheduler();