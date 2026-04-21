package com.bookmygadi.user

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.razorpay.Checkout
import com.razorpay.PaymentResultWithDataListener
import com.razorpay.PaymentData
import org.json.JSONObject

class RazorpayCheckoutActivity : AppCompatActivity(), PaymentResultWithDataListener {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val orderId = intent.getStringExtra("order_id") ?: return finish()
        val amount = intent.getIntExtra("amount", 0)
        val razorpayKey = intent.getStringExtra("razorpay_key") ?: return finish()
        
        startPayment(orderId, amount, razorpayKey)
    }

    private fun startPayment(orderId: String, amount: Int, razorpayKey: String) {
        val checkout = Checkout()
        checkout.setKeyID(razorpayKey)
        
        try {
            val options = JSONObject()
            options.put("name", "BookMyGaadi")
            options.put("description", "Ride Payment")
            options.put("theme.color", "#10B981") // emerald-500
            options.put("currency", "INR")
            options.put("amount", amount)
            options.put("order_id", orderId)
            
            val retryObj = JSONObject()
            retryObj.put("enabled", true)
            retryObj.put("max_count", 4)
            options.put("retry", retryObj)
            
            checkout.open(this, options)
        } catch (e: Exception) {
            val resultIntent = Intent()
            resultIntent.putExtra("error", "Error in starting Razorpay Checkout: ${e.message}")
            setResult(Activity.RESULT_CANCELED, resultIntent)
            finish()
        }
    }

    override fun onPaymentSuccess(paymentId: String?, data: PaymentData?) {
        val intent = Intent()
        intent.putExtra("payment_id", paymentId)
        intent.putExtra("order_id", data?.orderId)
        intent.putExtra("signature", data?.signature)
        setResult(Activity.RESULT_OK, intent)
        finish()
    }

    override fun onPaymentError(code: Int, response: String?, data: PaymentData?) {
        val intent = Intent()
        intent.putExtra("error", response)
        intent.putExtra("code", code)
        setResult(Activity.RESULT_CANCELED, intent)
        finish()
    }
}
