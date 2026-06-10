import { Request, Response } from 'express';
import { paypalService } from '../services/paypalService';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { payoutBatches, transactionLedger } from '@shared/schema';
import crypto from 'crypto';
import axios from 'axios';

// Allowlist of trusted PayPal certificate URL hostnames.
// PayPal only issues certs from these domains; reject any other host to prevent SSRF.
const PAYPAL_CERT_ALLOWED_HOSTS = new Set([
  'api.paypal.com',
  'api.sandbox.paypal.com',
  'api-m.paypal.com',
  'api-m.sandbox.paypal.com',
]);

function isAllowedPayPalCertUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    // Must use HTTPS and be on an approved PayPal host
    if (parsed.protocol !== 'https:') return false;
    return PAYPAL_CERT_ALLOWED_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

// Verify PayPal webhook signature
async function verifyPayPalWebhook(req: Request): Promise<boolean> {
  try {
    // Get verification headers
    const transmissionId = req.headers['paypal-transmission-id'] as string;
    const transmissionTime = req.headers['paypal-transmission-time'] as string;
    const transmissionSig = req.headers['paypal-transmission-sig'] as string;
    const certUrl = req.headers['paypal-cert-url'] as string;
    const authAlgo = req.headers['paypal-auth-algo'] as string;
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    
    if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo || !webhookId) {
      console.error('[PayPal Webhook] Missing verification headers');
      return false;
    }

    // Reject cert URLs that are not on the PayPal allowlist to prevent SSRF
    if (!isAllowedPayPalCertUrl(certUrl)) {
      console.error('[PayPal Webhook] Cert URL not on allowlist:', certUrl);
      return false;
    }

    // In development/sandbox mode, optionally skip verification
    if (process.env.PAYPAL_MODE === 'sandbox' && process.env.SKIP_PAYPAL_WEBHOOK_VERIFICATION === 'true') {
      console.warn('[PayPal Webhook] Skipping verification in sandbox mode');
      return true;
    }

    // Fetch the certificate from PayPal (safe: URL validated against allowlist above)
    const certResponse = await axios.get(certUrl);
    const cert = certResponse.data;

    // Create the expected signature
    const expectedSig = crypto
      .createHash('sha256')
      .update(transmissionId + '|' + transmissionTime + '|' + webhookId + '|' + JSON.stringify(req.body))
      .digest('base64');

    // Verify the signature
    const verifier = crypto.createVerify(authAlgo);
    verifier.update(transmissionId + '|' + transmissionTime + '|' + webhookId + '|' + JSON.stringify(req.body));
    
    const isValid = verifier.verify(cert, transmissionSig, 'base64');
    
    if (!isValid) {
      console.error('[PayPal Webhook] Signature verification failed');
    }
    
    return isValid;
  } catch (error: any) {
    console.error('[PayPal Webhook] Error verifying webhook signature:', error);
    return false;
  }
}

// PayPal webhook handler
export async function handlePayPalWebhook(req: Request, res: Response) {
  try {
    // Verify webhook signature
    const isValidWebhook = await verifyPayPalWebhook(req);
    
    if (!isValidWebhook) {
      console.error('[PayPal Webhook] Failed webhook verification');
      return res.status(401).json({ message: 'Webhook verification failed' });
    }

    // PayPal sends webhooks as JSON with event type
    const webhookData = req.body;
    
    if (!webhookData || !webhookData.event_type) {
      console.error('[PayPal Webhook] Invalid webhook data');
      return res.status(400).json({ message: 'Invalid webhook data' });
    }

    console.log(`[PayPal Webhook] Verified event: ${webhookData.event_type}`);

    // Handle different webhook events
    switch (webhookData.event_type) {
      case 'PAYMENT.PAYOUTS-BATCH.SUCCESS':
        await handlePayoutSuccess(webhookData);
        break;
        
      case 'PAYMENT.PAYOUTS-BATCH.DENIED':
      case 'PAYMENT.PAYOUTS-BATCH.FAILED':
        await handlePayoutFailed(webhookData);
        break;
        
      case 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED':
        await handlePayoutItemSuccess(webhookData);
        break;
        
      case 'PAYMENT.PAYOUTS-ITEM.FAILED':
      case 'PAYMENT.PAYOUTS-ITEM.UNCLAIMED':
      case 'PAYMENT.PAYOUTS-ITEM.RETURNED':
      case 'PAYMENT.PAYOUTS-ITEM.BLOCKED':
        await handlePayoutItemFailed(webhookData);
        break;
        
      default:
        console.log(`[PayPal Webhook] Unhandled event type: ${webhookData.event_type}`);
    }

    // Always respond with 200 OK to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[PayPal Webhook] Error processing webhook:', error);
    // Still return 200 to prevent PayPal from retrying
    res.status(200).json({ received: true, error: error.message });
  }
}

// Handle successful batch payout
async function handlePayoutSuccess(webhookData: any) {
  try {
    const resource = webhookData.resource;
    if (!resource || !resource.batch_header) {
      console.error('[PayPal Webhook] Missing batch header in success event');
      return;
    }

    const paypalBatchId = resource.batch_header.payout_batch_id;
    const batchStatus = resource.batch_header.batch_status;
    
    console.log(`[PayPal Webhook] Batch ${paypalBatchId} succeeded`);

    // Find our batch record
    const [batch] = await db
      .select()
      .from(payoutBatches)
      .where(eq(payoutBatches.paypalBatchId, paypalBatchId));

    if (!batch) {
      console.error(`[PayPal Webhook] Batch not found: ${paypalBatchId}`);
      return;
    }

    // Update batch status to completed
    await db
      .update(payoutBatches)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payoutBatches.id, batch.id));

    // Update related payout transactions to completed
    await db
      .update(transactionLedger)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq((transactionLedger as any).payoutBatchId, batch.id));

    console.log(`[PayPal Webhook] Batch ${paypalBatchId} marked as completed`);
  } catch (error: any) {
    console.error('[PayPal Webhook] Error handling payout success:', error);
  }
}

// Handle failed batch payout
async function handlePayoutFailed(webhookData: any) {
  try {
    const resource = webhookData.resource;
    if (!resource || !resource.batch_header) {
      console.error('[PayPal Webhook] Missing batch header in failed event');
      return;
    }

    const paypalBatchId = resource.batch_header.payout_batch_id;
    const batchStatus = resource.batch_header.batch_status;
    
    console.log(`[PayPal Webhook] Batch ${paypalBatchId} failed with status: ${batchStatus}`);

    // Find our batch record
    const [batch] = await db
      .select()
      .from(payoutBatches)
      .where(eq(payoutBatches.paypalBatchId, paypalBatchId));

    if (!batch) {
      console.error(`[PayPal Webhook] Batch not found: ${paypalBatchId}`);
      return;
    }

    // Update batch status to failed
    await db
      .update(payoutBatches)
      .set({
        status: 'failed',
        errorLog: [`PayPal batch failed: ${batchStatus}`],
        updatedAt: new Date(),
      })
      .where(eq(payoutBatches.id, batch.id));

    // Update related payout transactions to failed
    await db
      .update(transactionLedger)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq((transactionLedger as any).payoutBatchId, batch.id));

    console.log(`[PayPal Webhook] Batch ${paypalBatchId} marked as failed`);
  } catch (error: any) {
    console.error('[PayPal Webhook] Error handling payout failure:', error);
  }
}

// Handle successful individual payout item
async function handlePayoutItemSuccess(webhookData: any) {
  try {
    const resource = webhookData.resource;
    if (!resource) {
      console.error('[PayPal Webhook] Missing resource in item success event');
      return;
    }

    const payoutItemId = resource.payout_item_id;
    const paypalBatchId = resource.payout_batch_id;
    const transactionStatus = resource.transaction_status;
    
    console.log(`[PayPal Webhook] Payout item ${payoutItemId} succeeded in batch ${paypalBatchId}`);

    // Update the specific transaction if we can identify it
    // This would require storing the payout_item_id in our transaction ledger
    // For now, we rely on batch-level updates
  } catch (error: any) {
    console.error('[PayPal Webhook] Error handling item success:', error);
  }
}

// Handle failed individual payout item
async function handlePayoutItemFailed(webhookData: any) {
  try {
    const resource = webhookData.resource;
    if (!resource) {
      console.error('[PayPal Webhook] Missing resource in item failed event');
      return;
    }

    const payoutItemId = resource.payout_item_id;
    const paypalBatchId = resource.payout_batch_id;
    const transactionStatus = resource.transaction_status;
    
    console.log(`[PayPal Webhook] Payout item ${payoutItemId} failed in batch ${paypalBatchId}: ${transactionStatus}`);

    // Find our batch record
    const [batch] = await db
      .select()
      .from(payoutBatches)
      .where(eq(payoutBatches.paypalBatchId, paypalBatchId));

    if (!batch) {
      console.error(`[PayPal Webhook] Batch not found: ${paypalBatchId}`);
      return;
    }

    // Increment failed payout count
    await db
      .update(payoutBatches)
      .set({
        failedPayouts: (batch.failedPayouts || 0) + 1,
        status: 'partial', // Mark as partial since some items failed
        updatedAt: new Date(),
      })
      .where(eq(payoutBatches.id, batch.id));

    console.log(`[PayPal Webhook] Item failure recorded for batch ${paypalBatchId}`);
  } catch (error: any) {
    console.error('[PayPal Webhook] Error handling item failure:', error);
  }
}