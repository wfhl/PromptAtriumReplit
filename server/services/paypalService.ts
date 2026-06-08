// @ts-ignore - no type declarations available for @paypal/payouts-sdk
import paypal from '@paypal/payouts-sdk';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import { 
  transactionLedger, 
  sellerProfiles, 
  platformSettings,
  payoutBatches
} from '@shared/schema';

// PayPal Configuration
class PayPalEnvironment {
  private static instance: paypal.core.PayPalEnvironment | null = null;

  static getEnvironment(): paypal.core.PayPalEnvironment | null {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      console.log('[PayPal] Missing credentials - PayPal payouts disabled');
      return null;
    }

    if (!this.instance) {
      const mode = process.env.PAYPAL_MODE || 'sandbox';
      if (mode === 'live') {
        this.instance = new paypal.core.LiveEnvironment(
          process.env.PAYPAL_CLIENT_ID,
          process.env.PAYPAL_CLIENT_SECRET
        );
      } else {
        this.instance = new paypal.core.SandboxEnvironment(
          process.env.PAYPAL_CLIENT_ID,
          process.env.PAYPAL_CLIENT_SECRET
        );
      }
    }
    return this.instance;
  }
}

interface PayPalPayoutItem {
  recipient_type: 'EMAIL' | 'PHONE' | 'PAYPAL_ID';
  amount: {
    value: string;
    currency: string;
  };
  receiver: string;
  note?: string;
  sender_item_id: string;
}

interface PayPalPayoutResult {
  success: boolean;
  batchId?: string;
  payoutBatchId?: string;
  errors?: string[];
  status?: string;
}

export class PayPalService {
  private client: paypal.core.PayPalHttpClient | null = null;

  constructor() {
    const environment = PayPalEnvironment.getEnvironment();
    if (environment) {
      this.client = new paypal.core.PayPalHttpClient(environment);
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  // Process PayPal payouts for sellers
  async processPayout(
    sellerId: string,
    amountCents: number,
    transactionIds: string[],
    description: string = 'Marketplace payout'
  ): Promise<PayPalPayoutResult> {
    const result: PayPalPayoutResult = {
      success: false
    };

    if (!this.client) {
      result.errors = ['PayPal is not configured'];
      return result;
    }

    try {
      // Get seller profile with PayPal email
      const [sellerProfile] = await db
        .select()
        .from(sellerProfiles)
        .where(eq(sellerProfiles.userId, sellerId));

      if (!sellerProfile || !sellerProfile.paypalEmail) {
        throw new Error('Seller PayPal email not found');
      }

      // Convert cents to dollars
      const amountUSD = (amountCents / 100).toFixed(2);

      // Create payout batch
      const requestBody = {
        sender_batch_header: {
          sender_batch_id: `batch_${Date.now()}_${sellerId}`,
          email_subject: 'You have a payment from the marketplace',
          email_message: description,
          recipient_type: 'EMAIL'
        },
        items: [{
          recipient_type: 'EMAIL',
          amount: {
            value: amountUSD,
            currency: 'USD'
          },
          receiver: sellerProfile.paypalEmail,
          note: description,
          sender_item_id: `payout_${Date.now()}_${sellerId}`
        } as PayPalPayoutItem]
      };

      const request = new paypal.payouts.PayoutsPostRequest();
      request.requestBody(requestBody);

      const response = await this.client.execute(request);
      
      if (response.statusCode === 201 && response.result) {
        const batchId = response.result.batch_header.payout_batch_id;

        // Create batch record in database
        const [batch] = await db
          .insert(payoutBatches)
          .values({
            paymentMethod: 'paypal',
            status: 'processing',
            totalAmountCents: amountCents,
            processedCount: 0,
            totalCount: 1,
            paypalBatchId: batchId,
            createdAt: new Date(),
            updatedAt: new Date()
          } as any)
          .returning();

        // Update transactions with batch ID
        if (transactionIds.length > 0) {
          await db
            .update(transactionLedger)
            .set({
              payoutBatchId: batch.id,
              status: 'processing',
              updatedAt: new Date()
            } as any)
            .where(inArray(transactionLedger.id, transactionIds));
        }

        result.success = true;
        result.batchId = batch.id;
        result.payoutBatchId = batchId;
        result.status = 'processing';
      } else {
        throw new Error('PayPal payout creation failed');
      }
    } catch (error: any) {
      console.error('[PayPal] Payout error:', error);
      result.errors = [error.message || 'PayPal payout failed'];

      // Update transactions to failed status
      if (transactionIds.length > 0) {
        await db
          .update(transactionLedger)
          .set({
            status: 'failed',
            updatedAt: new Date()
          })
          .where(inArray(transactionLedger.id, transactionIds));
      }
    }

    return result;
  }

  // Get payout batch status from PayPal
  async getPayoutStatus(paypalBatchId: string): Promise<any> {
    if (!this.client) {
      throw new Error('PayPal is not configured');
    }

    try {
      const request = new paypal.payouts.PayoutsGetRequest(paypalBatchId);
      const response = await this.client.execute(request);
      return response.result;
    } catch (error: any) {
      console.error('[PayPal] Status check error:', error);
      throw error;
    }
  }

  // Process PayPal webhook for payout status updates
  async processPayoutWebhook(webhookData: any): Promise<void> {
    try {
      const eventType = webhookData.event_type;
      const resource = webhookData.resource;

      if (!resource || !resource.batch_header) {
        console.error('[PayPal] Invalid webhook data');
        return;
      }

      const paypalBatchId = resource.batch_header.payout_batch_id;
      const batchStatus = resource.batch_header.batch_status;

      // Find our batch record
      const [batch] = await db
        .select()
        .from(payoutBatches)
        .where(eq(payoutBatches.paypalBatchId, paypalBatchId));

      if (!batch) {
        console.error('[PayPal] Batch not found:', paypalBatchId);
        return;
      }

      // Map PayPal status to our status
      let newStatus: 'completed' | 'failed' | 'processing' = 'processing';
      if (batchStatus === 'SUCCESS') {
        newStatus = 'completed';
      } else if (batchStatus === 'DENIED' || batchStatus === 'FAILED') {
        newStatus = 'failed';
      }

      // Update batch status
      await db
        .update(payoutBatches)
        .set({
          status: newStatus,
          processedAt: newStatus === 'completed' ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(payoutBatches.id, batch.id));

      // Update related transactions
      await db
        .update(transactionLedger)
        .set({
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date() : null,
          updatedAt: new Date()
        })
        .where(
          and(
            eq((transactionLedger as any).payoutBatchId, batch.id),
            eq(transactionLedger.type, 'payout')
          )
        );

      console.log(`[PayPal] Batch ${paypalBatchId} updated to ${newStatus}`);
    } catch (error: any) {
      console.error('[PayPal] Webhook processing error:', error);
    }
  }

  // Create batch payout for multiple sellers
  async createBatchPayout(
    payoutItems: Array<{
      sellerId: string;
      email: string;
      amountCents: number;
      transactionIds: string[];
    }>
  ): Promise<PayPalPayoutResult> {
    const result: PayPalPayoutResult = {
      success: false
    };

    if (!this.client) {
      result.errors = ['PayPal is not configured'];
      return result;
    }

    try {
      // Convert to PayPal format
      const items: PayPalPayoutItem[] = payoutItems.map((item, index) => ({
        recipient_type: 'EMAIL',
        amount: {
          value: (item.amountCents / 100).toFixed(2),
          currency: 'USD'
        },
        receiver: item.email,
        note: `Marketplace payout for seller ${item.sellerId}`,
        sender_item_id: `item_${Date.now()}_${index}`
      }));

      const requestBody = {
        sender_batch_header: {
          sender_batch_id: `batch_${Date.now()}`,
          email_subject: 'You have a payment from the marketplace',
          email_message: 'Your earnings have been processed',
          recipient_type: 'EMAIL'
        },
        items
      };

      const request = new paypal.payouts.PayoutsPostRequest();
      request.requestBody(requestBody);

      const response = await this.client.execute(request);

      if (response.statusCode === 201 && response.result) {
        const batchId = response.result.batch_header.payout_batch_id;

        // Calculate total amount
        const totalAmountCents = payoutItems.reduce((sum, item) => sum + item.amountCents, 0);

        // Create batch record
        const [batch] = await db
          .insert(payoutBatches)
          .values({
            paymentMethod: 'paypal',
            status: 'processing',
            totalAmountCents,
            processedCount: 0,
            totalCount: payoutItems.length,
            paypalBatchId: batchId,
            createdAt: new Date(),
            updatedAt: new Date()
          } as any)
          .returning();

        // Update all transactions with batch ID
        const allTransactionIds = payoutItems.flatMap(item => item.transactionIds);
        if (allTransactionIds.length > 0) {
          await db
            .update(transactionLedger)
            .set({
              payoutBatchId: batch.id,
              status: 'processing',
              updatedAt: new Date()
            } as any)
            .where(inArray(transactionLedger.id, allTransactionIds));
        }

        result.success = true;
        result.batchId = batch.id;
        result.payoutBatchId = batchId;
        result.status = 'processing';
      } else {
        throw new Error('PayPal batch payout creation failed');
      }
    } catch (error: any) {
      console.error('[PayPal] Batch payout error:', error);
      result.errors = [error.message || 'PayPal batch payout failed'];
    }

    return result;
  }
}

export const paypalService = new PayPalService();