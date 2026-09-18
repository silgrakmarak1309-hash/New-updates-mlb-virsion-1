package com.example

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback

class BazaarWebViewActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var progressBar: ProgressBar? = null
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    companion object {
        const val EXTRA_URL = "extra_url"
        const val DEFAULT_URL = "https://ais-dev-mylfdfrzwnyjhipfvcskrq-563394565880.asia-southeast1.run.app"

        fun start(context: Context, url: String = DEFAULT_URL) {
            val intent = Intent(context, BazaarWebViewActivity::class.java).apply {
                putExtra(EXTRA_URL, url)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize WebView programmatically or via layout
        webView = WebView(this).apply {
            id = View.generateViewId()
        }
        setContentView(webView)

        setupWebViewSettings()
        setupWebViewClients()

        val targetUrl = intent.getStringExtra(EXTRA_URL) ?: DEFAULT_URL
        webView.loadUrl(targetUrl)

        // Handle Back Press to navigate WebView history
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebViewSettings() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadsImagesAutomatically = true
            allowFileAccess = true
            allowContentAccess = true
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
            cacheMode = WebSettings.LOAD_DEFAULT

            // Mixed content support
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

            // Custom User Agent identifier
            val defaultUserAgent = userAgentString
            userAgentString = "$defaultUserAgent MeriLocalBazaarApp/1.0.0"
        }

        // Enable hardware acceleration
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
    }

    private fun setupWebViewClients() {
        webView.webViewClient = object : WebViewClient() {

            // API 24+ support
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                return handleCustomUrl(url)
            }

            // Legacy Android support
            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url == null) return false
                return handleCustomUrl(url)
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                progressBar?.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar?.visibility = View.GONE
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    progressBar?.visibility = View.VISIBLE
                    progressBar?.progress = newProgress
                } else {
                    progressBar?.visibility = View.GONE
                }
            }
        }
    }

    /**
     * Intercepts and delegates custom URL schemes:
     * - upi://pay?... (Standard UPI Intent)
     * - gpay://upi/pay?... (Google Pay)
     * - phonepe://pay?... (PhonePe)
     * - paytmmp://pay?... (Paytm)
     * - intent://... (Native Android Intents)
     * - whatsapp://send?...
     * - tel: and mailto:
     */
    private fun handleCustomUrl(url: String): Boolean {
        // 1. Standard UPI & Payment App Deep Link Schemes
        if (url.startsWith("upi://") ||
            url.startsWith("gpay://") ||
            url.startsWith("phonepe://") ||
            url.startsWith("paytmmp://") ||
            url.startsWith("bhim://") ||
            url.startsWith("cred://")
        ) {
            return launchNativeIntent(url)
        }

        // 2. Android Intent Scheme (intent://...)
        if (url.startsWith("intent://")) {
            return try {
                val intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
                if (intent != null) {
                    val packageManager = packageManager
                    val info = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        packageManager.resolveActivity(intent, android.content.pm.PackageManager.ResolveInfoFlags.of(0))
                    } else {
                        @Suppress("DEPRECATION")
                        packageManager.resolveActivity(intent, 0)
                    }

                    if (info != null) {
                        startActivity(intent)
                        true
                    } else {
                        // Check for fallback URL
                        val fallbackUrl = intent.getStringExtra("browser_fallback_url")
                        if (!fallbackUrl.isNullOrEmpty()) {
                            webView.loadUrl(fallbackUrl)
                            true
                        } else {
                            val appPackage = intent.`package`
                            if (!appPackage.isNullOrEmpty()) {
                                // Open Play Store if package is specified
                                openPlayStore(appPackage)
                                true
                            } else {
                                Toast.makeText(this, "Required UPI app is not installed on this device.", Toast.LENGTH_SHORT).show()
                                false
                            }
                        }
                    }
                } else {
                    false
                }
            } catch (e: Exception) {
                e.printStackTrace()
                Toast.makeText(this, "Could not open payment app: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                true
            }
        }

        // 3. WhatsApp Deep Link
        if (url.startsWith("whatsapp://") || url.startsWith("https://wa.me/") || url.startsWith("https://api.whatsapp.com/")) {
            return launchNativeIntent(url)
        }

        // 4. Dial Phone Numbers & Send Email
        if (url.startsWith("tel:") || url.startsWith("mailto:")) {
            return launchNativeIntent(url)
        }

        // 5. Standard Web Navigation (HTTP / HTTPS) stays inside WebView
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return false
        }

        // 6. Generic external scheme fallback
        return launchNativeIntent(url)
    }

    private fun launchNativeIntent(url: String): Boolean {
        return try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
            true
        } catch (e: ActivityNotFoundException) {
            e.printStackTrace()
            val appName = when {
                url.startsWith("gpay://") -> "Google Pay"
                url.startsWith("phonepe://") -> "PhonePe"
                url.startsWith("paytmmp://") -> "Paytm"
                url.startsWith("whatsapp://") -> "WhatsApp"
                url.startsWith("upi://") -> "UPI Payment App"
                else -> "Supported App"
            }
            Toast.makeText(this, "$appName is not installed on your phone. Please install it or use QR code.", Toast.LENGTH_LONG).show()
            true
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(this, "Unable to complete request: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            true
        }
    }

    private fun openPlayStore(packageName: String) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$packageName")))
        } catch (e: ActivityNotFoundException) {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$packageName")))
        }
    }

    override fun onDestroy() {
        webView.stopLoading()
        webView.clearHistory()
        webView.destroy()
        super.onDestroy()
    }
}
