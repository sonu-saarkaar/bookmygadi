package com.bookmygadi.rider

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

class PieMenuView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null, defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val slices = listOf("SOS", "112", "Arrive/\nComplete", "Vehicle\nIssue")
    
    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { 
        style = Paint.Style.FILL
        color = Color.parseColor("#1C1C1E") 
    }
    private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { 
        style = Paint.Style.STROKE
        color = Color.parseColor("#4ADE80") 
        strokeWidth = 10f // Matches handdrawn thick outline
    }
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#FDE047") 
        textSize = 42f
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true 
    }

    var onSliceClickListener: ((Int) -> Unit)? = null

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()
        val cx = w / 2f
        val cy = h / 2f
        val radius = Math.min(w, h) / 2f - 10f

        val rectF = RectF(cx - radius, cy - radius, cx + radius, cy + radius)

        val startAngle = -90f
        val sweepAngle = 45f

        for (i in slices.indices) {
            val angle = startAngle + i * sweepAngle
            canvas.drawArc(rectF, angle, sweepAngle, true, fillPaint)
            canvas.drawArc(rectF, angle, sweepAngle, true, strokePaint)

            val textAngle = Math.toRadians((angle + sweepAngle / 2).toDouble())
            val textRadius = radius * 0.65f
            val tx = cx + (textRadius * cos(textAngle)).toFloat()
            val ty = cy + (textRadius * sin(textAngle)).toFloat()

            val text = slices[i]
            val lines = text.split("\n")
            for ((idx, line) in lines.withIndex()) {
                canvas.drawText(
                    line, 
                    tx, 
                    ty + (idx * textPaint.textSize) - (lines.size - 1) * textPaint.textSize / 2 + textPaint.textSize / 3, 
                    textPaint
                )
            }
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (event.action == MotionEvent.ACTION_DOWN || event.action == MotionEvent.ACTION_UP) {
            val x = event.x
            val y = event.y
            val cx = width / 2f
            val cy = height / 2f

            val dx = x - cx
            val dy = y - cy
            val dist = sqrt((dx * dx + dy * dy).toDouble())
            val radius = Math.min(width, height) / 2f

            // Adjust inner radius to ignore clicks on the center floating orb button (approx 42dp inner radius)
            val innerRadius = 130f 
            if (dist > innerRadius && dist <= radius) {
                var angle = Math.toDegrees(atan2(dy.toDouble(), dx.toDouble())).toFloat()
                if (angle < -90f) angle += 360f

                if (angle in -90f..90f) {
                    val index = ((angle + 90f) / 45f).toInt()
                    if (index in 0..3) {
                        if (event.action == MotionEvent.ACTION_UP) {
                            onSliceClickListener?.invoke(index)
                        }
                        return true
                    }
                }
            }
        }
        return false 
    }
}
