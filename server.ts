
import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import Razorpay from "razorpay";
import crypto from "crypto";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Supabase Admin Client (using Service Role Key for secure operations)
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Razorpay Client
const razorpay = new Razorpay({
  key_id: process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

app.use(express.json());

// --- API ROUTES ---

// 1. Verify Razorpay Payment and Credit Coins
app.post("/api/payments/verify", async (req: Request, res: Response) => {
  const { 
    razorpay_payment_id, 
    razorpay_order_id, 
    razorpay_signature,
    userId,
    amount,
    planType,
    coinsToCredit,
    couponCode
  } = req.body;

  // Verify Signature (Security Step)
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(body.toString())
    .digest("hex");

  const isSignatureValid = expectedSignature === razorpay_signature;

  if (!isSignatureValid) {
    return res.status(400).json({ error: "Invalid payment signature" });
  }

  try {
    // Record Payment in Supabase (Using Admin Client for security)
    const { data: payment, error: paymentError } = await supabase.from('payment_requests').insert({
        user_id: userId,
        utr: razorpay_payment_id,
        amount: amount,
        plan_type: planType,
        status: 'APPROVED', 
        coupon_code: couponCode
    }).select().single();

    if (paymentError) throw paymentError;

    // Credit Coins to User
    const { data: sub, error: subFetchError } = await supabase
        .from('user_subscriptions')
        .select('coins')
        .eq('user_id', userId)
        .single();
    
    if (subFetchError && subFetchError.code !== 'PGRST116') throw subFetchError;

    const currentCoins = sub?.coins || 0;
    const { error: subUpdateError } = await supabase
        .from('user_subscriptions')
        .update({ coins: currentCoins + coinsToCredit })
        .eq('user_id', userId);

    if (subUpdateError) throw subUpdateError;

    // Update Coupon Usage if applicable
    if (couponCode) {
        const { data: coupon } = await supabase.from('coupons').select('usage_count').eq('code', couponCode).maybeSingle();
        if (coupon) {
            await supabase.from('coupons').update({ usage_count: (coupon.usage_count || 0) + 1 }).eq('code', couponCode);
        }
    }

    res.json({ status: "success", coins: currentCoins + coinsToCredit });
  } catch (error: any) {
    console.error("Payment Verification Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Admin: Adjust User Coins (Verified on server)
app.post("/api/admin/adjust-coins", async (req: Request, res: Response) => {
  const { adminEmail, targetUserId, amount } = req.body;

  // Verify Admin Status (Security Step)
  const adminEmails = ['rajveerrawat947@gmail.com', 'admin@ssbprep.online'];
  if (!adminEmails.includes(adminEmail)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const { data: sub, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select('coins')
      .eq('user_id', targetUserId)
      .single();

    if (fetchError) throw fetchError;

    const newBalance = (sub?.coins || 0) + amount;
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({ coins: newBalance })
      .eq('user_id', targetUserId);

    if (updateError) throw updateError;

    res.json({ status: "success", newBalance });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
