package com.example.data.remote

import android.util.Log
import com.example.data.local.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object SupabaseConfig {
    const val SUPABASE_URL = "https://qljyucqxgpzfehqwggbv.supabase.co"
    const val REST_URL = "$SUPABASE_URL/rest/v1"
    const val API_KEY = "sb_publishable_suwaB7Frskcl5QBa004Xig_3umP58N9"
}

class FirebaseService {

    private val client = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .build()

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    private fun requestBuilder(url: String): Request.Builder {
        return Request.Builder()
            .url(url)
            .addHeader("apikey", SupabaseConfig.API_KEY)
            .addHeader("Authorization", "Bearer ${SupabaseConfig.API_KEY}")
            .addHeader("Content-Type", "application/json")
            .addHeader("Prefer", "return=representation")
    }

    // -------------------------------------------------------------
    // LISTINGS REMOTE SYNC & MODERATION (listings table)
    // -------------------------------------------------------------
    suspend fun pushListing(listing: ListingEntity): Boolean = withContext(Dispatchers.IO) {
        try {
            val json = JSONObject().apply {
                put("title", listing.title)
                put("description", listing.description)
                put("price", listing.price)
                put("status", "pending") // Moderate all new listings as pending
                put("is_top_pro", listing.isFeatured || listing.isPro)
                put("top_pro_status", if (listing.isPro) "active" else "none")
            }
            val request = requestBuilder("${SupabaseConfig.REST_URL}/listings")
                .post(json.toString().toRequestBody(jsonMediaType))
                .build()
            val response = client.newCall(request).execute()
            val success = response.isSuccessful
            if (!success) {
                Log.w("FirebaseService", "Push listing response: ${response.code} ${response.body?.string()}")
            }
            success
        } catch (e: Exception) {
            Log.e("FirebaseService", "Error pushing listing to Supabase: ${e.message}")
            false
        }
    }

    suspend fun fetchListings(): List<ListingEntity> = withContext(Dispatchers.IO) {
        try {
            val request = requestBuilder("${SupabaseConfig.REST_URL}/listings?select=*&order=created_at.desc")
                .get()
                .build()
            val response = client.newCall(request).execute()
            val bodyString = response.body?.string() ?: return@withContext emptyList()
            if (bodyString == "null" || bodyString.isBlank() || bodyString.startsWith("{\"code\"")) {
                return@withContext emptyList()
            }

            val list = mutableListOf<ListingEntity>()
            val jsonArray = JSONArray(bodyString)
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.optJSONObject(i) ?: continue
                val idStr = obj.optString("id", "")
                if (idStr.isBlank()) continue
                
                val title = obj.optString("title").takeIf { it != "null" && it.isNotBlank() } ?: "Marketplace Item"
                val description = obj.optString("description").takeIf { it != "null" } ?: ""
                val price = if (obj.isNull("price")) 0.0 else obj.optDouble("price", 0.0)
                val status = obj.optString("status", "active")
                val isTopPro = obj.optBoolean("is_top_pro", false)
                val topProStatus = obj.optString("top_pro_status", "none")
                val isPro = isTopPro || topProStatus == "active"

                list.add(
                    ListingEntity(
                        id = idStr,
                        title = title,
                        categoryId = "cat_general",
                        categoryName = "General",
                        locationId = "loc_all",
                        locationName = "India",
                        stateName = "India",
                        price = price,
                        isNegotiable = true,
                        condition = "Good",
                        description = description,
                        phone = "9876543210",
                        whatsapp = "9876543210",
                        imagesJson = "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80",
                        status = if (status == "deleted") "deleted" else status,
                        isFeatured = isTopPro,
                        isPro = isPro,
                        sellerId = obj.optString("user_id", "user_default"),
                        sellerName = "Seller",
                        sellerVerified = true,
                        sellerPhone = "9876543210",
                        sellerJoined = "2024",
                        viewsCount = 10,
                        createdAt = System.currentTimeMillis() - (i * 3600000L)
                    )
                )
            }
            list
        } catch (e: Exception) {
            Log.e("FirebaseService", "Error fetching listings from Supabase: ${e.message}")
            emptyList()
        }
    }

    suspend fun updateListingModerationStatus(
        id: String,
        status: String,
        isFeatured: Boolean? = null,
        isPro: Boolean? = null
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val json = JSONObject().apply {
                put("status", status)
                isFeatured?.let { put("is_top_pro", it) }
                isPro?.let { put("top_pro_status", if (it) "active" else "none") }
            }
            val request = requestBuilder("${SupabaseConfig.REST_URL}/listings?id=eq.$id")
                .patch(json.toString().toRequestBody(jsonMediaType))
                .build()
            client.newCall(request).execute().isSuccessful
        } catch (e: Exception) {
            Log.e("FirebaseService", "Error updating listing moderation: ${e.message}")
            false
        }
    }

    suspend fun deleteListing(id: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val request = requestBuilder("${SupabaseConfig.REST_URL}/listings?id=eq.$id")
                .delete()
                .build()
            client.newCall(request).execute().isSuccessful
        } catch (e: Exception) {
            Log.e("FirebaseService", "Error deleting listing from Supabase: ${e.message}")
            false
        }
    }

    // -------------------------------------------------------------
    // RECHARGE & PRO REQUESTS (recharge_requests table)
    // -------------------------------------------------------------
    suspend fun pushRechargeRequest(req: RechargeRequestEntity): Boolean = withContext(Dispatchers.IO) {
        try {
            val json = JSONObject().apply {
                put("amount", req.amount)
                put("utr_number", req.utrNumber)
                if (req.paymentProofUrl.isNotBlank()) {
                    put("screenshot_url", req.paymentProofUrl)
                }
                put("status", "pending")
            }
            val request = requestBuilder("${SupabaseConfig.REST_URL}/recharge_requests")
                .post(json.toString().toRequestBody(jsonMediaType))
                .build()
            val response = client.newCall(request).execute()
            response.isSuccessful
        } catch (e: Exception) {
            Log.e("FirebaseService", "Error pushing recharge request: ${e.message}")
            false
        }
    }

    suspend fun fetchRechargeRequests(): List<RechargeRequestEntity> = withContext(Dispatchers.IO) {
        try {
            val request = requestBuilder("${SupabaseConfig.REST_URL}/recharge_requests?select=*&order=created_at.desc")
                .get()
                .build()
            val response = client.newCall(request).execute()
            val bodyString = response.body?.string() ?: return@withContext emptyList()
            if (bodyString == "null" || bodyString.isBlank() || bodyString.startsWith("{\"code\"")) {
                return@withContext emptyList()
            }

            val list = mutableListOf<RechargeRequestEntity>()
            val jsonArray = JSONArray(bodyString)
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.optJSONObject(i) ?: continue
                val idStr = obj.optString("id", "")
                if (idStr.isBlank()) continue

                val amount = if (obj.isNull("amount")) 50.0 else obj.optDouble("amount", 50.0)
                val utr = obj.optString("utr_number", "")
                val screenshot = obj.optString("screenshot_url", "")
                val status = obj.optString("status", "Pending")
                val isTopPro = amount <= 30.0

                list.add(
                    RechargeRequestEntity(
                        id = idStr,
                        planId = if (isTopPro) "plan_single_top_pro" else "plan_1m",
                        planName = if (isTopPro) "⭐ Top PRO Boost" else "1 Month PRO",
                        planDurationDays = if (isTopPro) 3 else 30,
                        amount = amount,
                        utrNumber = utr,
                        userName = "User",
                        userEmail = "",
                        userPhone = "",
                        status = status,
                        isTopPro = isTopPro,
                        listingId = "",
                        listingTitle = "",
                        paymentProofUrl = screenshot,
                        rejectionReason = "",
                        rechargeDate = System.currentTimeMillis() - (i * 86400000L),
                        expiryDate = System.currentTimeMillis() + (30L * 86400000L),
                        reviewedAt = 0L,
                        createdAt = System.currentTimeMillis() - (i * 86400000L)
                    )
                )
            }
            list
        } catch (e: Exception) {
            Log.e("FirebaseService", "Error fetching recharge requests from Supabase: ${e.message}")
            emptyList()
        }
    }

    suspend fun approveRecharge(id: String, rechargeDate: Long, expiryDate: Long): Boolean = withContext(Dispatchers.IO) {
        try {
            val json = JSONObject().apply {
                put("status", "Approved")
            }
            val request = requestBuilder("${SupabaseConfig.REST_URL}/recharge_requests?id=eq.$id")
                .patch(json.toString().toRequestBody(jsonMediaType))
                .build()
            client.newCall(request).execute().isSuccessful
        } catch (e: Exception) {
            Log.e("FirebaseService", "Error approving recharge: ${e.message}")
            false
        }
    }

    suspend fun rejectRecharge(id: String, reason: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val json = JSONObject().apply {
                put("status", "Rejected")
            }
            val request = requestBuilder("${SupabaseConfig.REST_URL}/recharge_requests?id=eq.$id")
                .patch(json.toString().toRequestBody(jsonMediaType))
                .build()
            client.newCall(request).execute().isSuccessful
        } catch (e: Exception) {
            Log.e("FirebaseService", "Error rejecting recharge: ${e.message}")
            false
        }
    }

    // -------------------------------------------------------------
    // USERS & PROFILES MANAGEMENT (profiles table)
    // -------------------------------------------------------------
    suspend fun fetchUsers(): List<UserEntity> = withContext(Dispatchers.IO) {
        try {
            val request = requestBuilder("${SupabaseConfig.REST_URL}/profiles?select=*")
                .get()
                .build()
            val response = client.newCall(request).execute()
            val bodyString = response.body?.string() ?: return@withContext emptyList()
            if (bodyString == "null" || bodyString.isBlank() || bodyString.startsWith("{\"code\"")) {
                return@withContext emptyList()
            }

            val list = mutableListOf<UserEntity>()
            val jsonArray = JSONArray(bodyString)
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.optJSONObject(i) ?: continue
                val idStr = obj.optString("id", "")
                if (idStr.isBlank()) continue

                val email = obj.optString("email", "")
                val role = obj.optString("role", "user")
                val isPro = obj.optBoolean("is_pro", false)
                val proStatus = obj.optString("pro_status", if (isPro) "active" else "inactive")

                list.add(
                    UserEntity(
                        id = idStr,
                        name = email.split("@").firstOrNull()?.replace(".", " ")?.capitalize() ?: "User",
                        email = email,
                        phone = "9876543210",
                        whatsapp = "9876543210",
                        city = "Meghalaya",
                        role = role,
                        accountStatus = proStatus,
                        isPro = isPro,
                        proExpiresAt = if (isPro) System.currentTimeMillis() + (30L * 86400000L) else 0L,
                        createdAt = System.currentTimeMillis()
                    )
                )
            }
            list
        } catch (e: Exception) {
            Log.e("FirebaseService", "Error fetching profiles: ${e.message}")
            emptyList()
        }
    }

    suspend fun pushUser(user: UserEntity): Boolean = withContext(Dispatchers.IO) {
        try {
            val json = JSONObject().apply {
                put("email", user.email)
                put("role", user.role)
                put("is_pro", user.isPro)
                put("pro_status", if (user.isPro) "active" else "inactive")
            }
            val request = requestBuilder("${SupabaseConfig.REST_URL}/profiles?id=eq.${user.id}")
                .patch(json.toString().toRequestBody(jsonMediaType))
                .build()
            client.newCall(request).execute().isSuccessful
        } catch (e: Exception) {
            false
        }
    }

    suspend fun updateUserRole(id: String, role: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val json = JSONObject().apply { put("role", role) }
            val request = requestBuilder("${SupabaseConfig.REST_URL}/profiles?id=eq.$id")
                .patch(json.toString().toRequestBody(jsonMediaType))
                .build()
            client.newCall(request).execute().isSuccessful
        } catch (e: Exception) {
            false
        }
    }

    suspend fun updateUserStatus(id: String, status: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val json = JSONObject().apply { put("pro_status", status) }
            val request = requestBuilder("${SupabaseConfig.REST_URL}/profiles?id=eq.$id")
                .patch(json.toString().toRequestBody(jsonMediaType))
                .build()
            client.newCall(request).execute().isSuccessful
        } catch (e: Exception) {
            false
        }
    }

    suspend fun updateUserProStatus(id: String, isPro: Boolean, expiresAt: Long): Boolean = withContext(Dispatchers.IO) {
        try {
            val json = JSONObject().apply {
                put("is_pro", isPro)
                put("pro_status", if (isPro) "active" else "inactive")
            }
            val request = requestBuilder("${SupabaseConfig.REST_URL}/profiles?id=eq.$id")
                .patch(json.toString().toRequestBody(jsonMediaType))
                .build()
            client.newCall(request).execute().isSuccessful
        } catch (e: Exception) {
            false
        }
    }

    // -------------------------------------------------------------
    // SETTINGS REMOTE SYNC (settings table, row id=1)
    // -------------------------------------------------------------
    suspend fun fetchSettings(): Map<String, String> = withContext(Dispatchers.IO) {
        try {
            val request = requestBuilder("${SupabaseConfig.REST_URL}/settings?id=eq.1&select=*")
                .get()
                .build()
            val response = client.newCall(request).execute()
            val bodyString = response.body?.string() ?: return@withContext emptyMap()
            if (bodyString == "null" || bodyString.isBlank() || bodyString.startsWith("{\"code\"")) {
                return@withContext emptyMap()
            }

            val jsonArray = JSONArray(bodyString)
            if (jsonArray.length() == 0) return@withContext emptyMap()
            val row = jsonArray.getJSONObject(0)

            val upiId = row.optString("upi_id", "merilocalbazaar@oksbi")
            val qrUrl = row.optString("qr_code_url", "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=upi://pay?pa=$upiId")

            mapOf(
                "upi_id" to upiId,
                "admin_upi_id" to upiId,
                "qr_code_url" to qrUrl,
                "admin_qr_url" to qrUrl,
                "admob_app_id" to "ca-app-pub-3940256099942544~3347511713",
                "admob_banner_ad_unit_id" to "ca-app-pub-3940256099942544/6300978111",
                "tutorial_video_url" to "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "tutorial_video_title" to "How to Post Free Ads & Activate PRO on Meri Local Bazaar"
            )
        } catch (e: Exception) {
            Log.e("FirebaseService", "Error fetching settings from Supabase: ${e.message}")
            emptyMap()
        }
    }

    suspend fun saveSetting(key: String, value: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val json = JSONObject()
            if (key == "upi_id" || key == "admin_upi_id") {
                json.put("upi_id", value)
                json.put("qr_code_url", "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=upi://pay?pa=$value")
            } else if (key == "qr_code_url" || key == "admin_qr_url") {
                json.put("qr_code_url", value)
            } else {
                return@withContext true
            }

            val request = requestBuilder("${SupabaseConfig.REST_URL}/settings?id=eq.1")
                .patch(json.toString().toRequestBody(jsonMediaType))
                .build()
            client.newCall(request).execute().isSuccessful
        } catch (e: Exception) {
            Log.e("FirebaseService", "Error saving setting: ${e.message}")
            false
        }
    }

    // -------------------------------------------------------------
    // CATEGORIES & LOCATIONS (Local cached with remote stub)
    // -------------------------------------------------------------
    suspend fun pushCategory(category: CategoryEntity): Boolean = true
    suspend fun deleteCategory(id: String): Boolean = true
    suspend fun fetchCategories(): List<CategoryEntity> = emptyList()

    suspend fun pushLocation(location: LocationEntity): Boolean = true
    suspend fun deleteLocation(id: String): Boolean = true
    suspend fun fetchLocations(): List<LocationEntity> = emptyList()

    // -------------------------------------------------------------
    // CHATS REMOTE SYNC
    // -------------------------------------------------------------
    suspend fun pushChatMessage(msg: ChatMessageEntity): Boolean = true
    suspend fun fetchChatMessages(chatId: String): List<ChatMessageEntity> = emptyList()

    // -------------------------------------------------------------
    // CONNECTIVITY TEST
    // -------------------------------------------------------------
    suspend fun testConnection(): Boolean = withContext(Dispatchers.IO) {
        try {
            val request = requestBuilder("${SupabaseConfig.REST_URL}/settings?id=eq.1&select=id")
                .get()
                .build()
            val response = client.newCall(request).execute()
            response.isSuccessful
        } catch (e: Exception) {
            false
        }
    }
}
