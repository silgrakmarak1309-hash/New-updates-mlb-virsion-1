import { supabase } from './supabase';
import { AppPolicy, PolicyType } from '../types';

export const DEFAULT_TERMS_CONDITIONS = `
# Meri Local Bazaar — Terms & Conditions

**Effective Date:** January 1, 2025 (Last Updated: September 2026)  
**Applicability:** All buyers, sellers, drivers, and service providers across Meghalaya & Northeast India.

---

### 1. Platform Overview & 100% Prepaid Protocol
1.1. **Prepaid Escrow System:** Meri Local Bazaar operates on a 100% Prepaid Protocol for all retail product purchases. Cash on Delivery (COD) is strictly not supported.  
1.2. **Escrow Holding:** Buyer funds are held in the official admin escrow account until delivery or store pickup is successfully completed and verified by the buyer.  
1.3. **Payment Verification:** Orders are placed in "Pending Verification" status until the admin verifies the 12-digit UPI UTR number and receipt.

---

### 2. Order Cancellation & Refund Policy
2.1. **Standard Cancellation:** Buyers may cancel an order before dispatch for a full 100% refund of the product amount and delivery fee.  
2.2. **Critical Out for Delivery Rule:**  
   - **Delivery Charges are strictly non-refundable** once the order has been dispatched and marked **"Out for Delivery"** (*In-Transit*).  
   - If a buyer cancels an order while it is Out for Delivery, only the **Product Price** is eligible for refund. The **Delivery Charge refund will be ₹0**.  
   - This protects local delivery partners who have already committed fuel, vehicle, and operational time to transport the parcel.  
2.3. **Refund Processing:** Approved refunds are credited directly to the buyer's original payment source or UPI ID within 24–48 business hours.

---

### 3. Transportation, Fleet & Local Services (0% Commission Model)
3.1. **Cab, Taxi, Traveler, Auto Rickshaw & Fleet Bookings:**  
   - Fares and trip rates are mutually decided directly between the passenger and the driver.  
   - Passengers pay 100% of the fare directly to the driver via Cash or the driver's personal UPI QR code.  
   - Meri Local Bazaar charges 0% commission on driver ride fares.  
3.2. **Skilled Services & Local Jobs:**  
   - Visiting fees and service charges are finalized directly between the customer and the service technician.  
   - Payment is made directly to the provider (Cash/Personal UPI). The platform takes 0% commission.

---

### 4. Buyer Responsibilities & Mandatory Inspection at Time of Delivery
4.1. **Accuracy of Information:** Buyers must provide accurate contact details, including a valid 10-digit WhatsApp/calling phone number and complete permanent delivery address.  
4.2. **Mandatory Delivery Inspection on Handover:**  
   - **Thorough Inspection Required:** The buyer **must thoroughly check and inspect the product's expiry date, packaging integrity, manufacturer seal, and related quality parameters at the exact time of delivery** in the presence of the delivery personnel before confirming acceptance.  
   - **Immediate Rejection on Defects:** If the product is past its expiry date, damaged, or unsealed, the buyer must immediately refuse acceptance at the doorstep.  
4.3. **Strict Finality of Delivery Confirmation & Zero Post-Acceptance Liability:**  
   - **No Help / No Refund Post-Confirmation:** **ONCE THE DELIVERY IS CONFIRMED OR ACCEPTED BY THE BUYER (WHETHER BY CLICKING "CONFIRM DELIVERY SUCCESS", PROVIDING CONFIRMATION TO THE RIDER, OR ACCEPTING HANDOVER), NO SUBSEQUENT COMPLAINTS, CLAIMS, RETURN REQUESTS, OR REFUND REQUESTS REGARDING PRODUCT EXPIRY, CONDITION, OR PACKAGING WILL BE ENTERTAINED UNDER ANY CIRCUMSTANCES.**  
   - **No Customer Support Redressal After Acceptance:** **ABSOLUTELY NO ASSISTANCE, ESCALATION, REPLACEMENT, OR HELP WILL BE PROVIDED AFTER DELIVERY IS CONFIRMED.** The buyer assumes full responsibility for inspecting all expiry dates and item conditions at the doorstep prior to confirming.

---

### 5. Dispute Resolution
For any dispute, missing item, or seller grievance, users can contact the Meri Local Bazaar Admin Support via WhatsApp or official email prior to delivery finalization.
`;

export const DEFAULT_PRIVACY_POLICY = `
# Meri Local Bazaar — Privacy Policy

**Effective Date:** January 1, 2025 (Last Updated: September 2026)  
**Applicability:** All registered users, buyers, merchants, delivery partners, and service providers.

---

### 1. Information We Collect
To provide a secure and reliable local marketplace experience, we collect:
1.1. **Account Profile Data:** Full Name, Email Address (via Google Authentication), Contact Phone Number, and City/District in Meghalaya.  
1.2. **Buyer Delivery Information:** Permanent Delivery Address, landmark notes, and geolocation data for accurate doorstep parcel delivery.  
1.3. **Seller & Merchant Data:** Shop name, market location, trade categories, contact details, and payout UPI ID.  
1.4. **Driver & Service Partner Data:** Driving license, vehicle registration, service skills, and personal payout UPI ID.  
1.5. **Transaction & Verification Records:** Order transaction UTR numbers, payment receipts, delivery inspection timestamps, and digital acceptance confirmation logs.

---

### 2. How We Use Your Information
2.1. **Order Fulfillment:** Sharing the buyer's delivery address and phone number exclusively with the assigned delivery partner to fulfill the shipment.  
2.2. **Direct Payments:** Enabling customers to pay drivers and service providers directly to their personal UPI IDs without intermediary retention.  
2.3. **Escrow & Security:** Verifying prepaid bank transaction UTR numbers against official escrow receipts.  
2.4. **Autofill Convenience:** Storing permanent delivery addresses securely so buyers do not need to re-type address fields during checkout.  
2.5. **Delivery Acceptance Logging:** We record the exact digital timestamp and verification log when the buyer confirms delivery. This immutable record serves as conclusive legal evidence that the buyer inspected and accepted the product's expiry date and quality parameters at the doorstep.

---

### 3. Data Protection & Row-Level Security (RLS)
3.1. All user information is securely stored in Supabase with strict Row-Level Security (RLS) policies.  
3.2. Private financial credentials, bank accounts, and sensitive payout records are never exposed to unauthorized third parties or other buyers.  
3.3. We do not sell, rent, or trade your personal data with marketing agencies.

---

### 4. Mandatory Delivery Inspection Legal Policy Clause
4.1. In accordance with the Terms & Conditions, the buyer acknowledges and agrees that all products must be inspected for expiry dates and physical packaging integrity at the time of delivery.  
4.2. Once digital or physical confirmation is logged, the platform does not process post-delivery expiry complaints, and no support or refund tickets will be entertained thereafter.

---

### 5. User Consent & Policy Updates
5.1. By registering an account or ticking the checkout agreement checkbox, you consent to this Privacy Policy and the processing of your data as described.  
5.2. We may update this Privacy Policy periodically. The latest version is always available within the application from the \`app_policies\` database record.

---

### 6. Contacting Privacy Support
If you have questions regarding your stored personal data or wish to request data deletion, contact support at \`support@merilocalbazaar.com\` or via the in-app Admin Help channel.
`;

/**
 * Fetch a policy document from the existing `app_policies` table in Supabase.
 * If the record is missing or network fails, gracefully returns default policy.
 */
export async function fetchAppPolicy(
  policyType: PolicyType
): Promise<{ content: string; updatedAt?: string; id?: string }> {
  try {
    if (!supabase) {
      return {
        content:
          policyType === 'terms_conditions' ? DEFAULT_TERMS_CONDITIONS : DEFAULT_PRIVACY_POLICY,
        updatedAt: new Date().toISOString(),
      };
    }

    const { data, error } = await supabase
      .from('app_policies')
      .select('id, policy_type, content, updated_at')
      .eq('policy_type', policyType)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn(`Supabase error fetching policy ${policyType}:`, error.message);
      return {
        content:
          policyType === 'terms_conditions' ? DEFAULT_TERMS_CONDITIONS : DEFAULT_PRIVACY_POLICY,
        updatedAt: new Date().toISOString(),
      };
    }

    if (data && data.content) {
      return {
        id: data.id,
        content: data.content,
        updatedAt: data.updated_at || new Date().toISOString(),
      };
    }

    // If no row exists in app_policies yet, return the default
    return {
      content:
        policyType === 'terms_conditions' ? DEFAULT_TERMS_CONDITIONS : DEFAULT_PRIVACY_POLICY,
      updatedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error(`Exception loading app_policies for ${policyType}:`, err);
    return {
      content:
        policyType === 'terms_conditions' ? DEFAULT_TERMS_CONDITIONS : DEFAULT_PRIVACY_POLICY,
      updatedAt: new Date().toISOString(),
    };
  }
}
