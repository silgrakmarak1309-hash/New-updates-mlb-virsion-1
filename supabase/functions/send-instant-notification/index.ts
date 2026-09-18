// ==============================================================================
// SUPABASE EDGE FUNCTION: send-instant-notification
// Deploy Command: supabase functions deploy send-instant-notification --no-verify-jwt
// ==============================================================================
// Supports:
// 1. Feature 1: Trigger-Based Instant New Order Alerts (Seller, Driver, Delivery Boy, Service Provider)
// 2. Feature 2: Cron-Job Based 3-Days Plan Expiry Alerts via RPC check_expiring_plans
// ==============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

// Standard CORS headers for cross-origin browser & webhook requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// WebintoApp Push Notification Configuration
const WEBINTOAPP_API_URL = "https://www.webintoapp.com/api/v2/push/send";
const WEBINTOAPP_API_KEY =
  Deno.env.get("WEB_INTO_APP_API_KEY") ||
  Deno.env.get("WEBINTOAPP_API_KEY") ||
  "";
const WEBINTOAPP_APP_ID =
  Deno.env.get("WEB_INTO_APP_APP_ID") ||
  Deno.env.get("WEBINTOAPP_APP_ID") ||
  "";

// Supabase Environment Setup
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface NotificationPayload {
  action: "new_order" | "check_expiry" | "custom_alert";
  user_id?: string;
  role?: "seller" | "driver" | "delivery_boy" | "delivery_partner" | "service_provider" | "customer" | string;
  order_number?: string;
  item_description?: string;
  customer_name?: string;
  amount?: number | string;
  custom_title?: string;
  custom_message?: string;
}

/**
 * Helper to dispatch push notifications via WebintoApp REST API
 */
async function sendWebintoAppPush(params: {
  userId?: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  const { userId, title, message, data } = params;

  if (!WEBINTOAPP_API_KEY) {
    console.warn(
      "[WebintoApp Warning] WEBINTOAPP_API_KEY environment variable is not configured. Logged notification:",
      { title, message, userId }
    );
    return {
      success: true,
      simulated: true,
      message: "Notification logged (API Key missing in environment)",
    };
  }

  const payload: Record<string, unknown> = {
    api_key: WEBINTOAPP_API_KEY,
    app_id: WEBINTOAPP_APP_ID,
    title: title,
    message: message,
    data: data || {},
  };

  // Target specific user or device if provided
  if (userId) {
    payload.user_id = userId;
    payload.external_id = userId;
  }

  try {
    const response = await fetch(WEBINTOAPP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": WEBINTOAPP_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    console.log("[WebintoApp Response]", response.status, result);

    return {
      success: response.ok,
      status: response.status,
      result,
    };
  } catch (error) {
    console.error("[WebintoApp Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Returns role-tailored alert messages for new orders
 */
function getRoleSpecificOrderAlert(role?: string, details?: { orderNumber?: string; item?: string }) {
  const normalizedRole = (role || "").toLowerCase().trim();

  switch (normalizedRole) {
    case "seller":
    case "shop":
    case "shop_owner":
      return {
        title: "🎉 Naya Order Aaya Hai!",
        message:
          "🎉 Hurray! Aapki shop par ek naya prepaid order aaya hai. Kripya app open karke check karein.",
      };

    case "driver":
    case "cab":
    case "taxi":
    case "auto":
      return {
        title: "🚕 Nayi Booking Alert!",
        message:
          "🚕 Nayi Booking Alert! Aapke aaspas ek customer ko ride chahiye, turant accept karein.",
      };

    case "delivery_boy":
    case "delivery_partner":
    case "delivery":
      return {
        title: "📦 New Delivery Assign!",
        message:
          "📦 New Delivery Assign! Aapko ek naya package deliver karne ke liye mila hai.",
      };

    case "service_provider":
    case "local_service":
    case "mechanic":
    case "electrician":
    case "plumber":
      return {
        title: "🛠️ New Job Request Alert!",
        message:
          "🛠️ New Job Alert! Ek customer ne aapko service ke liye request bheji hai.",
      };

    default:
      return {
        title: "🔔 Meri Local Bazaar Alert",
        message: details?.orderNumber
          ? `Aapke order #${details.orderNumber} par naya update aaya hai. Kripya app mein check karein.`
          : "Aapke account par ek naya update aaya hai.",
      };
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Initialize Supabase Admin Client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const body: NotificationPayload = await req.json().catch(() => ({ action: "new_order" }));
    const { action = "new_order", user_id, role, order_number, item_description, custom_title, custom_message } = body;

    console.log(`[Notification Request] Action: ${action}, Role: ${role}, User ID: ${user_id}`);

    // =========================================================================
    // FEATURE 1: INSTANT NEW ORDER ALERT (Trigger Based)
    // =========================================================================
    if (action === "new_order") {
      const alert = getRoleSpecificOrderAlert(role, {
        orderNumber: order_number,
        item: item_description,
      });

      const finalTitle = custom_title || alert.title;
      const finalMessage = custom_message || alert.message;

      const pushResult = await sendWebintoAppPush({
        userId: user_id,
        title: finalTitle,
        message: finalMessage,
        data: {
          action: "new_order",
          role,
          order_number,
          user_id,
          timestamp: new Date().toISOString(),
        },
      });

      // Also log notification in database if notification_logs table exists
      try {
        await supabase.from("notification_logs").insert([
          {
            user_id: user_id || null,
            role: role || "unknown",
            title: finalTitle,
            message: finalMessage,
            action_type: "new_order",
            metadata: { order_number, item_description },
            status: pushResult.success ? "sent" : "failed",
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (_) {
        // Table might not exist yet, safe to ignore
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: "new_order",
          sent_to: {
            user_id,
            role,
          },
          notification: {
            title: finalTitle,
            message: finalMessage,
          },
          push_result: pushResult,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =========================================================================
    // FEATURE 2: 3-DAYS PLAN EXPIRY ALERT (Cron Job Based)
    // =========================================================================
    if (action === "check_expiry") {
      console.log("[Cron Task] Executing 3-Days Plan Expiry Check...");

      let expiringUsers: Array<{
        user_id?: string;
        id?: string;
        full_name?: string;
        phone?: string;
        email?: string;
        role?: string;
        plan_expiry_date?: string;
        pro_expiry?: string;
        days_left?: number;
      }> = [];

      // 1. Attempt to execute database RPC 'check_expiring_plans'
      const { data: rpcData, error: rpcError } = await supabase.rpc("check_expiring_plans");

      if (!rpcError && Array.isArray(rpcData)) {
        expiringUsers = rpcData;
        console.log(`[RPC Success] Found ${expiringUsers.length} expiring plans.`);
      } else {
        console.warn("[RPC Fallback] RPC check_expiring_plans error or not created. Using direct query fallback:", rpcError?.message);

        // Fallback direct table query: profiles with pro plan expiring within next 3 days
        const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        const nowIso = new Date().toISOString();

        const { data: queryData, error: queryError } = await supabase
          .from("profiles")
          .select("id, full_name, phone, email, role, plan_expiry_date, pro_expiry, is_pro, pro_status")
          .or(`plan_expiry_date.lte.${threeDaysFromNow},pro_expiry.lte.${threeDaysFromNow}`)
          .gte("plan_expiry_date", nowIso);

        if (!queryError && Array.isArray(queryData)) {
          expiringUsers = queryData.map((u) => ({
            user_id: u.id,
            full_name: u.full_name,
            phone: u.phone,
            email: u.email,
            role: u.role,
            plan_expiry_date: u.plan_expiry_date || u.pro_expiry,
          }));
        }
      }

      const results = [];
      const expiryTitle = "⚠️ Plan Expiry Alert!";
      const expiryMessage =
        "⚠️ Important: Aapka Meri Local Bazaar partner plan agle 3 dino mein expire hone wala hai. Kripya renew karein.";

      // 2. Loop through all expiring partners and dispatch alert
      for (const partner of expiringUsers) {
        const targetId = partner.user_id || partner.id;
        if (!targetId) continue;

        const sendRes = await sendWebintoAppPush({
          userId: targetId,
          title: expiryTitle,
          message: expiryMessage,
          data: {
            action: "plan_expiring_soon",
            user_id: targetId,
            expiry_date: partner.plan_expiry_date,
          },
        });

        results.push({
          user_id: targetId,
          name: partner.full_name,
          role: partner.role,
          expiry_date: partner.plan_expiry_date,
          push_status: sendRes.success ? "delivered" : "error",
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: "check_expiry",
          total_expiring: expiringUsers.length,
          alerts_sent: results.length,
          details: results,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =========================================================================
    // FALLBACK: Custom Alert
    // =========================================================================
    const customResult = await sendWebintoAppPush({
      userId: user_id,
      title: custom_title || "🔔 Meri Local Bazaar",
      message: custom_message || "Aapke account par ek naya notification aaya hai.",
    });

    return new Response(
      JSON.stringify({
        success: true,
        action: "custom_alert",
        result: customResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Edge Function Exception]", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
