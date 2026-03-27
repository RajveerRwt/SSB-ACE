import express from 'express';
import cors from 'cors';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// Lazy initialization for Supabase Admin
let supabaseAdminClient: any = null;
function getSupabaseAdmin() {
  if (!supabaseAdminClient) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || '';
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials are not set in environment variables.');
    }
    supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseAdminClient;
}

// Lazy initialization for Razorpay
let razorpayClient: any = null;
function getRazorpay() {
  if (!razorpayClient) {
    const key_id = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!key_id || !key_secret) {
      throw new Error('Razorpay credentials are not set in environment variables.');
    }
    razorpayClient = new Razorpay({ key_id, key_secret });
  }
  return razorpayClient;
}

// Vite middleware setup
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Request logging for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// API Router
const apiRouter = express.Router();

// Health check
apiRouter.get(['/health', '/health/'], (req, res) => {
  res.json({ status: 'ok' });
});

// Create Order Endpoint
apiRouter.post(['/create-order', '/create-order/'], async (req, res) => {
  try {
    const razorpay = getRazorpay();
    const { amount, currency = 'INR', receipt } = req.body;
    
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const options = {
      amount: Math.round(amount * 100), // amount in smallest currency unit
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({ 
      orderId: order.id,
      keyId: process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || ''
    });
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
});

// Verify Payment Endpoint
apiRouter.post(['/verify-payment', '/verify-payment/'], async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      userId,
      amount,
      planType,
      couponCode,
      coinsCredit
    } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || '';

    // Verify Signature
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return res.status(400).json({ error: 'Transaction not legit!' });
    }

    // Signature is valid, now process the transaction securely on the backend
    
    // 1. Record the payment request
    const { error: insertError } = await supabaseAdmin.from('payment_requests').insert({
        user_id: userId,
        utr: razorpay_payment_id,
        amount: amount,
        plan_type: planType,
        status: 'APPROVED', 
        coupon_code: couponCode
    });
    
    if (insertError) {
      console.error('Error recording payment:', insertError);
      throw new Error("Could not record payment.");
    }

    // 2. Activate Plan / Add Coins
    const { data: sub } = await supabaseAdmin
        .from('user_subscriptions')
        .select('coins')
        .eq('user_id', userId)
        .single();
        
    const currentCoins = sub?.coins || 0;
    let coinsToAdd = 0;

    if (coinsCredit !== undefined) {
        coinsToAdd = coinsCredit;
    } else {
        coinsToAdd = amount || 0;
        if (planType === 'COIN_PACK' || planType === 'PRO_SUBSCRIPTION' || planType === 'INTERVIEW_ADDON') {
            if (amount === 100) coinsToAdd = 110;
            else if (amount === 200) coinsToAdd = 230;
            else if (amount === 300) coinsToAdd = 350;
        }
    }
    
    const { error: updateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ coins: currentCoins + coinsToAdd })
        .eq('user_id', userId);
        
    if (updateError) {
      console.error('Error updating coins:', updateError);
      throw updateError;
    }
    
    // 3. Update Coupon Usage
    if (couponCode) {
        const { data: coupon } = await supabaseAdmin.from('coupons').select('usage_count').eq('code', couponCode).maybeSingle();
        if (coupon) {
            await supabaseAdmin.from('coupons').update({ usage_count: (coupon.usage_count || 0) + 1 }).eq('code', couponCode);
        }
    }

    res.json({ success: true, message: 'Payment verified and processed successfully' });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: error.message || 'Failed to verify payment' });
  }
});

// Mount API Router
app.use('/api', apiRouter);

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
