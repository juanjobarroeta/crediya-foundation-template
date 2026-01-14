const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const XLSX = require("xlsx");
const QRCode = require("qrcode");
let twilio;
try {
  twilio = require("twilio");
} catch (error) {
  console.warn("⚠️ Twilio package not installed. WhatsApp functionality will be disabled.");
  twilio = null;
}

const app = express();
const port = process.env.PORT || 3000;

// Helper function to generate receipt PDF
async function generateReceiptPDF(receiptData) {
  try {
    // Create receipt directory if it doesn't exist
    const receiptDir = path.join(__dirname, 'receipts');
    try {
      if (!fs.existsSync(receiptDir)) {
        fs.mkdirSync(receiptDir, { recursive: true });
      }
    } catch (dirErr) {
      console.warn("⚠️ Could not create receipts directory:", dirErr.message);
      // Use a fallback directory
      const fallbackDir = path.join(process.cwd(), 'receipts');
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      receiptDir = fallbackDir;
    }

    // Generate professional HTML receipt with enhanced styling
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Recibo de Pago - ${receiptData.receipt_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
          }
          
          .receipt-container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          
          .header { 
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            padding: 30px 25px;
            text-align: center;
            position: relative;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          }
          
          .logo { 
            font-size: 32px; 
            font-weight: 700;
            margin-bottom: 8px;
            position: relative;
            z-index: 1;
          }
          
          .receipt-number { 
            font-size: 16px; 
            font-weight: 500;
            opacity: 0.9;
            margin-bottom: 15px;
            position: relative;
            z-index: 1;
          }
          
          .payment-date {
            font-size: 14px;
            opacity: 0.8;
            position: relative;
            z-index: 1;
          }
          
          .content {
            padding: 25px;
          }
          
          .section { 
            margin-bottom: 25px;
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #e2e8f0;
          }
          
          .section h3 { 
            color: #1e293b; 
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .section h3::before {
            content: '';
            width: 4px;
            height: 20px;
            background: #22c55e;
            border-radius: 2px;
          }
          
          .row { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            margin: 12px 0;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          
          .row:last-child {
            border-bottom: none;
          }
          
          .label { 
            font-weight: 500; 
            color: #475569;
            font-size: 14px;
          }
          
          .value { 
            color: #1e293b; 
            font-weight: 600;
            font-size: 14px;
          }
          
          .payment-details {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin: 25px 0;
            position: relative;
            overflow: hidden;
          }
          
          .payment-details::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: shimmer 3s ease-in-out infinite;
          }
          
          @keyframes shimmer {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(180deg); }
          }
          
          .payment-details h3 {
            color: white;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            position: relative;
            z-index: 1;
          }
          
          .payment-details .row {
            border-bottom: 1px solid rgba(255,255,255,0.2);
            position: relative;
            z-index: 1;
          }
          
          .payment-details .row:last-child {
            border-bottom: none;
          }
          
          .payment-details .label {
            color: rgba(255,255,255,0.9);
          }
          
          .payment-details .value {
            color: white;
            font-weight: 600;
          }
          
          .total-section {
            background: #1e293b;
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin: 25px 0;
            text-align: center;
          }
          
          .total-label {
            font-size: 14px;
            opacity: 0.8;
            margin-bottom: 8px;
          }
          
          .total-amount {
            font-size: 28px;
            font-weight: 700;
            color: #22c55e;
          }
          
          .footer { 
            text-align: center; 
            padding: 25px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
          }
          
          .footer p {
            color: #64748b;
            font-size: 13px;
            margin: 5px 0;
          }
          
          .footer .company-name {
            color: #22c55e;
            font-weight: 600;
            font-size: 14px;
          }
          
          .qr-code {
            text-align: center;
            margin: 20px 0;
            padding: 15px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          
          .qr-code svg {
            width: 80px;
            height: 80px;
          }
          
          .status-badge {
            display: inline-block;
            background: #22c55e;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            margin-top: 10px;
          }
          
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .receipt-container {
              box-shadow: none;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <div class="logo">CrediYa</div>
            <div class="receipt-number">Recibo #${receiptData.receipt_number}</div>
            <div class="payment-date">${receiptData.payment_date} - ${receiptData.payment_time}</div>
          </div>

          <div class="content">
            <div class="section">
              <h3>Información del Cliente</h3>
              <div class="row">
                <span class="label">Cliente:</span>
                <span class="value">${receiptData.customer_name}</span>
              </div>
              <div class="row">
                <span class="label">Teléfono:</span>
                <span class="value">${receiptData.customer_phone}</span>
              </div>
              <div class="row">
                <span class="label">Préstamo #:</span>
                <span class="value">${receiptData.loan_id}</span>
              </div>
            </div>

            <div class="payment-details">
              <h3>Detalles del Pago</h3>
              <div class="row">
                <span class="label">Método de Pago:</span>
                <span class="value">${receiptData.payment_method}</span>
              </div>
              <div class="row">
                <span class="label">Semana:</span>
                <span class="value">${receiptData.week_number}</span>
              </div>
              <div class="row">
                <span class="label">Capital:</span>
                <span class="value">$${receiptData.capital_paid?.toFixed(2) || '0.00'}</span>
              </div>
              <div class="row">
                <span class="label">Interés:</span>
                <span class="value">$${receiptData.interest_paid?.toFixed(2) || '0.00'}</span>
              </div>
              ${receiptData.penalty_paid > 0 ? `
              <div class="row">
                <span class="label">Penalidad:</span>
                <span class="value">$${receiptData.penalty_paid.toFixed(2)}</span>
              </div>
              ` : ''}
            </div>

            <div class="total-section">
              <div class="total-label">Total Pagado</div>
              <div class="total-amount">$${receiptData.payment_amount.toFixed(2)}</div>
              <div class="status-badge">PAGO COMPLETADO</div>
            </div>

            <div class="qr-code">
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" fill="white"/>
                <rect x="10" y="10" width="8" height="8" fill="black"/>
                <rect x="20" y="10" width="8" height="8" fill="black"/>
                <rect x="30" y="10" width="8" height="8" fill="white"/>
                <rect x="40" y="10" width="8" height="8" fill="black"/>
                <rect x="50" y="10" width="8" height="8" fill="white"/>
                <rect x="60" y="10" width="8" height="8" fill="black"/>
                <rect x="70" y="10" width="8" height="8" fill="white"/>
                <rect x="80" y="10" width="8" height="8" fill="black"/>
                <rect x="10" y="20" width="8" height="8" fill="white"/>
                <rect x="20" y="20" width="8" height="8" fill="white"/>
                <rect x="30" y="20" width="8" height="8" fill="black"/>
                <rect x="40" y="20" width="8" height="8" fill="white"/>
                <rect x="50" y="20" width="8" height="8" fill="black"/>
                <rect x="60" y="20" width="8" height="8" fill="white"/>
                <rect x="70" y="20" width="8" height="8" fill="black"/>
                <rect x="80" y="20" width="8" height="8" fill="white"/>
                <rect x="10" y="30" width="8" height="8" fill="black"/>
                <rect x="20" y="30" width="8" height="8" fill="white"/>
                <rect x="30" y="30" width="8" height="8" fill="black"/>
                <rect x="40" y="30" width="8" height="8" fill="white"/>
                <rect x="50" y="30" width="8" height="8" fill="black"/>
                <rect x="60" y="30" width="8" height="8" fill="white"/>
                <rect x="70" y="30" width="8" height="8" fill="black"/>
                <rect x="80" y="30" width="8" height="8" fill="white"/>
                <rect x="10" y="40" width="8" height="8" fill="white"/>
                <rect x="20" y="40" width="8" height="8" fill="black"/>
                <rect x="30" y="40" width="8" height="8" fill="white"/>
                <rect x="40" y="40" width="8" height="8" fill="black"/>
                <rect x="50" y="40" width="8" height="8" fill="white"/>
                <rect x="60" y="40" width="8" height="8" fill="black"/>
                <rect x="70" y="40" width="8" height="8" fill="white"/>
                <rect x="80" y="40" width="8" height="8" fill="black"/>
                <rect x="10" y="50" width="8" height="8" fill="black"/>
                <rect x="20" y="50" width="8" height="8" fill="white"/>
                <rect x="30" y="50" width="8" height="8" fill="black"/>
                <rect x="40" y="50" width="8" height="8" fill="white"/>
                <rect x="50" y="50" width="8" height="8" fill="black"/>
                <rect x="60" y="50" width="8" height="8" fill="white"/>
                <rect x="70" y="50" width="8" height="8" fill="black"/>
                <rect x="80" y="50" width="8" height="8" fill="white"/>
                <rect x="10" y="60" width="8" height="8" fill="white"/>
                <rect x="20" y="60" width="8" height="8" fill="black"/>
                <rect x="30" y="60" width="8" height="8" fill="white"/>
                <rect x="40" y="60" width="8" height="8" fill="black"/>
                <rect x="50" y="60" width="8" height="8" fill="white"/>
                <rect x="60" y="60" width="8" height="8" fill="black"/>
                <rect x="70" y="60" width="8" height="8" fill="white"/>
                <rect x="80" y="60" width="8" height="8" fill="black"/>
                <rect x="10" y="70" width="8" height="8" fill="black"/>
                <rect x="20" y="70" width="8" height="8" fill="white"/>
                <rect x="30" y="70" width="8" height="8" fill="black"/>
                <rect x="40" y="70" width="8" height="8" fill="white"/>
                <rect x="50" y="70" width="8" height="8" fill="black"/>
                <rect x="60" y="70" width="8" height="8" fill="white"/>
                <rect x="70" y="70" width="8" height="8" fill="black"/>
                <rect x="80" y="70" width="8" height="8" fill="white"/>
                <rect x="10" y="80" width="8" height="8" fill="white"/>
                <rect x="20" y="80" width="8" height="8" fill="black"/>
                <rect x="30" y="80" width="8" height="8" fill="white"/>
                <rect x="40" y="80" width="8" height="8" fill="black"/>
                <rect x="50" y="80" width="8" height="8" fill="white"/>
                <rect x="60" y="80" width="8" height="8" fill="black"/>
                <rect x="70" y="80" width="8" height="8" fill="white"/>
                <rect x="80" y="80" width="8" height="8" fill="black"/>
              </svg>
              <div style="margin-top: 8px; font-size: 10px; color: #64748b;">Escanea para verificar</div>
            </div>
          </div>

          <div class="footer">
            <p class="company-name">CrediYa</p>
            <p>${receiptData.store_address}</p>
            <p>Tel: ${receiptData.store_phone}</p>
            <p style="margin-top: 15px; font-size: 11px; color: #94a3b8;">Gracias por su pago 🙏</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // For now, we'll save as HTML (you can integrate with a PDF library like puppeteer later)
    const pdfPath = path.join(receiptDir, `${receiptData.receipt_number}.html`);
    try {
      fs.writeFileSync(pdfPath, htmlContent);
      console.log(`✅ Receipt generated successfully: ${pdfPath}`);
    } catch (writeErr) {
      console.error("❌ Error writing receipt file:", writeErr);
      // Return a mock path if we can't write the file
      return { path: `/tmp/${receiptData.receipt_number}.html`, html: htmlContent };
    }

    return { path: pdfPath, html: htmlContent };
  } catch (err) {
    console.error("Error generating receipt PDF:", err);
    // Return a minimal receipt object to prevent payment failure
    return { 
      path: `/tmp/${receiptData.receipt_number}.html`, 
      html: `<html><body><h1>Receipt ${receiptData.receipt_number}</h1><p>Payment: $${receiptData.payment_amount}</p></body></html>` 
    };
  }
}

// Helper function to send WhatsApp reminder for overdue payments
async function sendWhatsAppReminder(customer, loan, customMessage = null) {
  try {
    if (!twilio) {
      console.warn("⚠️ Twilio package not available. Skipping WhatsApp reminder.");
      return { success: false, error: "Twilio package not available" };
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    
    if (!accountSid || !authToken || !whatsappNumber) {
      console.warn("⚠️ Twilio credentials not configured. Skipping WhatsApp reminder.");
      return { success: false, error: "Twilio credentials not configured" };
    }

    const client = twilio(accountSid, authToken);
    const formattedPhone = customer.phone.startsWith('+') ? customer.phone : `+52${customer.phone}`;
    
    // Get overdue details
    const overdueResult = await pool.query(`
      SELECT 
        li.week_number,
        li.amount_due,
        li.penalty_applied,
        EXTRACT(DAY FROM (NOW() - li.due_date)) as days_overdue
      FROM loan_installments li
      WHERE li.loan_id = $1 AND li.status = 'pending'
      ORDER BY li.due_date ASC
      LIMIT 1
    `, [loan.id]);

    const overdue = overdueResult.rows[0];
    
    const message = customMessage || `🔔 *Recordatorio de Pago - CrediYa*

Hola ${customer.name},

Te recordamos que tienes un pago pendiente:

📋 Préstamo #${loan.id}
💰 Monto: $${overdue?.amount_due || 0}
📅 Semana: ${overdue?.week_number || 'N/A'}
⏰ Días de atraso: ${overdue?.days_overdue || 0}
💸 Penalidad acumulada: $${overdue?.penalty_applied || 0}

Por favor, realiza tu pago lo antes posible para evitar penalidades adicionales.

¿Necesitas ayuda? Contáctanos.

Gracias,
Equipo CrediYa`;

    const messageResult = await client.messages.create({
      body: message,
      from: `whatsapp:${whatsappNumber}`,
      to: `whatsapp:${formattedPhone}`
    });

    console.log(`✅ WhatsApp reminder sent: ${messageResult.sid}`);
    
    return { 
      success: true, 
      message_sid: messageResult.sid,
      to: formattedPhone 
    };

  } catch (err) {
    console.error("Error sending WhatsApp reminder:", err);
    return { 
      success: false, 
      error: err.message
    };
  }
}

// Helper function to create payment plan
async function createPaymentPlan(loan_id, paymentPlan) {
  try {
    const { amount, installments, start_date } = paymentPlan;
    
    // Create payment plan record
    const planResult = await pool.query(`
      INSERT INTO payment_plans (
        loan_id, total_amount, installments, start_date, status, created_by
      ) VALUES ($1, $2, $3, $4, 'active', $5)
      RETURNING id
    `, [loan_id, amount, installments, start_date, 1]);

    return {
      success: true,
      message: "Payment plan created successfully",
      plan_id: planResult.rows[0].id
    };
  } catch (err) {
    console.error("Error creating payment plan:", err);
    return { success: false, error: err.message };
  }
}

// Helper function to send legal notice
async function sendLegalNotice(customer, loan) {
  try {
    // Generate legal notice document
    const legalNotice = {
      customer_name: customer.name,
      loan_id: loan.id,
      amount: loan.amount,
      date: new Date().toLocaleDateString('es-MX'),
      notice_type: 'payment_demand'
    };

    // For now, just return success (you can integrate with document generation)
    return {
      success: true,
      message: "Legal notice prepared",
      notice: legalNotice
    };
  } catch (err) {
    console.error("Error sending legal notice:", err);
    return { success: false, error: err.message };
  }
}

// Helper function to send receipt via WhatsApp
async function sendReceiptViaWhatsApp(phone, receiptData, pdfPath) {
  try {
    // Check if Twilio is available
    if (!twilio) {
      console.warn("⚠️ Twilio package not available. Skipping WhatsApp send.");
      return { success: false, error: "Twilio package not available" };
    }

    // Initialize Twilio client (you'll need to add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to your .env)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    
    if (!accountSid || !authToken || !whatsappNumber) {
      console.warn("⚠️ Twilio credentials not configured. Skipping WhatsApp send.");
      return { success: false, error: "Twilio credentials not configured" };
    }

    const client = twilio(accountSid, authToken);
    
    // Format phone number for WhatsApp (add country code if needed)
    const formattedPhone = phone.startsWith('+') ? phone : `+52${phone}`;
    
    // Create message content
    const message = `📋 *Recibo de Pago CrediYa*

🏷️ Recibo: ${receiptData.receipt_number}
👤 Cliente: ${receiptData.customer_name}
💰 Monto: $${receiptData.payment_amount.toFixed(2)}
📅 Fecha: ${receiptData.payment_date}
💳 Método: ${receiptData.payment_method}
📊 Préstamo #${receiptData.loan_id}

Gracias por su pago! 🙏`;

    // Send WhatsApp message
    const messageResult = await client.messages.create({
      body: message,
      from: `whatsapp:${whatsappNumber}`,
      to: `whatsapp:${formattedPhone}`
    });

    console.log(`✅ WhatsApp message sent: ${messageResult.sid}`);
    
    return { 
      success: true, 
      message_sid: messageResult.sid,
      to: formattedPhone 
    };

  } catch (err) {
    console.error("Error sending WhatsApp message:", err);
    console.error("WhatsApp error details:", {
      error: err.message,
      code: err.code,
      status: err.status,
      moreInfo: err.moreInfo
    });
    return { 
      success: false, 
      error: err.message,
      code: err.code,
      status: err.status
    };
  }
}

// Debug route to verify route registration
app.get("/test-route", (req, res) => {
  res.json({ message: "Test route reached" });
});

// Simple health check without authentication
app.get("/ping", (req, res) => {
  res.json({ message: "pong", timestamp: new Date().toISOString() });
});

// Public schema check endpoint (no authentication required)
app.get("/schema-check", async (req, res) => {
  try {
    // Check loan_installments table structure
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'loan_installments' 
      AND column_name IN ('capital_paid', 'interest_paid', 'penalty_paid')
      ORDER BY column_name
    `);
    
    // Also check accounting_entries table structure
    const accountingSchemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'accounting_entries' 
      AND column_name = 'amount'
      ORDER BY column_name
    `);
    
    res.json({
      loan_installments_schema: schemaResult.rows,
      accounting_entries_schema: accountingSchemaResult.rows,
      message: "Database schema check complete"
    });
  } catch (err) {
    console.error("Schema check error:", err);
    res.status(500).json({ 
      message: "Error checking schema", 
      error: err.message 
    });
  }
});

// Test payment processing step by step
app.post("/test-payment-step", async (req, res) => {
  try {
    const { loan_id, amount } = req.body;
    
    // Step 1: Test payment insertion
    console.log("Step 1: Testing payment insertion...");
    const paymentResult = await pool.query(`
      INSERT INTO payments (loan_id, amount, method, payment_date)
      VALUES ($1, $2, 'test', CURRENT_TIMESTAMP)
      RETURNING id
    `, [loan_id, amount]);
    console.log("✅ Payment inserted:", paymentResult.rows[0]);
    
    // Step 2: Test accounting entries insertion
    console.log("Step 2: Testing accounting entries...");
    const accountingResult = await pool.query(`
      INSERT INTO accounting_entries (loan_id, type, amount, description, source_type, source_id, created_by)
      VALUES ($1, 'test', $2, 'Test entry', 'payment', $3, 1)
      RETURNING id
    `, [loan_id, parseFloat(amount.toFixed(2)), paymentResult.rows[0].id]);
    console.log("✅ Accounting entry inserted:", accountingResult.rows[0]);
    
    // Step 3: Test loan_installments update
    console.log("Step 3: Testing loan_installments update...");
    const installmentResult = await pool.query(`
      UPDATE loan_installments 
      SET capital_paid = $1, interest_paid = $2, penalty_paid = $3
      WHERE loan_id = $4 AND week_number = 1
      RETURNING id, capital_paid, interest_paid, penalty_paid
    `, [parseFloat(amount.toFixed(2)), parseFloat((amount * 0.1).toFixed(2)), parseFloat((amount * 0.05).toFixed(2)), loan_id]);
    console.log("✅ Installment updated:", installmentResult.rows[0]);
    
    res.json({
      success: true,
      payment_id: paymentResult.rows[0]?.id,
      accounting_id: accountingResult.rows[0]?.id,
      installment_update: installmentResult.rows[0],
      message: "All payment steps successful"
    });
  } catch (err) {
    console.error("Test payment step error:", err);
    res.status(500).json({ 
      success: false,
      message: "Test payment step failed", 
      error: err.message,
      errorCode: err.code,
      step: "unknown"
    });
  }
});

// Health check endpoint to test database connection
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as current_time");
    res.json({ 
      status: "healthy", 
      database: "connected",
      current_time: result.rows[0].current_time,
      message: "Backend is running and database is connected"
    });
  } catch (err) {
    console.error("Health check failed:", err);
    res.status(500).json({ 
      status: "unhealthy", 
      database: "disconnected",
      error: err.message 
    });
  }
});





// Route: Generate contract document for a given loan
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");



app.use(express.json());
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://crediya.me",
  "https://www.crediya.me",
  "https://crediya-frontend-io2d.vercel.app",
  "https://crediya-frontend.netlify.app",
  "https://crediya-foundation-template.netlify.app"
];
app.use(cors({
  origin: function (origin, callback) {
    console.log("🌍 Incoming request origin:", origin);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
// Ensure all preflight OPTIONS requests are handled with the same CORS policy
app.options("*", cors());

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  }
});


const upload = multer({ storage });



// PostgreSQL connection
// Use DATABASE_URL if available (Railway, Heroku, etc.), otherwise use individual vars
const pool = process.env.DATABASE_URL 
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      user: process.env.DB_USER || "postgres",
      host: process.env.DB_HOST || "localhost",
      database: process.env.DB_NAME || "crediya",
      password: process.env.DB_PASSWORD || "",
      port: process.env.DB_PORT || 5432,
    });
console.log("🌐 Using DATABASE_URL:", !!process.env.DATABASE_URL);

// Create tables
const createTables = async () => {
  console.log("📣 Connected to DB. Creating tables...");
  
  // 0. Stores table (must be created FIRST - users reference it)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stores (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      address TEXT,
      phone VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 1. Users table (must be created before any table referencing users)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      is_active BOOLEAN DEFAULT true,
      store_id INTEGER REFERENCES stores(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // Ensure the 'role' column exists (safe to run even if already present)
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
  `);

  // 2. Customer Notes, Avales, and References
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_notes (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      note TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_avals (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      relationship VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_references (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      relationship VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_breakdowns (
      id SERIAL PRIMARY KEY,
      payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
      principal_amount DECIMAL(10,2) DEFAULT 0,
      interest_amount DECIMAL(10,2) DEFAULT 0,
      late_fee_amount DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS promotions (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      discount_percentage DECIMAL(5,2),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public_applications (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20),
      promotion_id INTEGER REFERENCES promotions(id),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS collection_notes (
      id SERIAL PRIMARY KEY,
      loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
      note TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounting_closures (
      id SERIAL PRIMARY KEY,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      total_revenue DECIMAL(12,2) DEFAULT 0,
      total_expenses DECIMAL(12,2) DEFAULT 0,
      net_income DECIMAL(12,2) DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS financial_movements (
      id SERIAL PRIMARY KEY,
      loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
      movement_type VARCHAR(50) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_receipts (
      id SERIAL PRIMARY KEY,
      payment_id INTEGER REFERENCES payments(id),
      receipt_number VARCHAR(20) UNIQUE NOT NULL,
      pdf_path TEXT,
      sent_whatsapp BOOLEAN DEFAULT FALSE,
      whatsapp_message_id VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create collection_actions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collection_actions (
      id SERIAL PRIMARY KEY,
      loan_id INTEGER REFERENCES loans(id),
      action_type VARCHAR(50) NOT NULL,
      notes TEXT,
      contact_method VARCHAR(50),
      scheduled_date TIMESTAMP,
      status VARCHAR(20) DEFAULT 'scheduled',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    );
  `);

  // Create payment_plans table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_plans (
      id SERIAL PRIMARY KEY,
      loan_id INTEGER REFERENCES loans(id),
      total_amount DECIMAL(10,2),
      installments INTEGER,
      start_date DATE,
      status VARCHAR(20) DEFAULT 'active',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Balance Week Snapshots
  await pool.query(`
    CREATE TABLE IF NOT EXISTS balance_weeks (
      id SERIAL PRIMARY KEY,
      week_start DATE NOT NULL,
      week_end DATE NOT NULL,
      label TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Balance Sheet Entries (references users)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS balance_sheet_entries (
      id SERIAL PRIMARY KEY,
      week_id INTEGER REFERENCES balance_weeks(id),
      category TEXT,
      label TEXT,
      amount NUMERIC,
      informative BOOLEAN DEFAULT false,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS financial_products (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100),
        interest_rate NUMERIC NOT NULL,
        term_weeks INTEGER NOT NULL,
        payment_frequency VARCHAR(50),
        penalty_fee NUMERIC DEFAULT 0,
        down_payment NUMERIC DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(100),
        phone_alt VARCHAR(20),
        customer_type VARCHAR(50),
        rfc VARCHAR(30),
        razon_social VARCHAR(200),
        contact_person_name VARCHAR(100),
        contact_person_phone VARCHAR(20),
        birthdate DATE,
        curp VARCHAR(30),
        address TEXT,
        neighborhood VARCHAR(200),
        building_type VARCHAR(100),
        postal_code VARCHAR(10),
        city VARCHAR(100),
        state VARCHAR(100),
        delivery_instructions TEXT,
        reference_1 VARCHAR(200),
        reference_2 VARCHAR(200),
        reference_3 VARCHAR(200),
        preferred_delivery_time VARCHAR(50),
        water_consumption VARCHAR(50),
        service_type VARCHAR(100),
        emergency_contact_name VARCHAR(100),
        emergency_contact_phone VARCHAR(20),
        employment TEXT,
        income NUMERIC,
        notes TEXT,
        ine_path TEXT,
        bureau_path TEXT,
        selfie_path TEXT,
        video_path TEXT,
        proof_address_path TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Add missing columns to customers table if they don't exist
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(100);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_alt VARCHAR(20);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS rfc VARCHAR(30);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS razon_social VARCHAR(200);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(100);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person_phone VARCHAR(20);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthdate DATE;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS curp VARCHAR(30);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(200);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS building_type VARCHAR(100);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS reference_1 VARCHAR(200);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS reference_2 VARCHAR(200);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS reference_3 VARCHAR(200);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_delivery_time VARCHAR(50);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS water_consumption VARCHAR(50);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_type VARCHAR(100);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS employment TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS income NUMERIC;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS ine_path TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS bureau_path TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS selfie_path TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS video_path TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS proof_address_path TEXT;

      CREATE TABLE IF NOT EXISTS inventory_requests (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER REFERENCES users(id),
        category VARCHAR(100),
        amount NUMERIC,
        status VARCHAR(50) DEFAULT 'pending_admin_approval',
        notes TEXT,
        quote_path TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        inventory_request_id INTEGER REFERENCES inventory_requests(id),
        category TEXT,
        brand TEXT,
        model TEXT,
        color TEXT,
        ram TEXT,
        storage TEXT,
        imei TEXT,
        serial_number TEXT,
        purchase_price NUMERIC,
        sale_price NUMERIC,
        status TEXT DEFAULT 'in_stock',
        store TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Water Delivery Orders System
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id INTEGER REFERENCES customers(id),
        store_id INTEGER,
        status VARCHAR(50) DEFAULT 'pending',
        total_amount NUMERIC DEFAULT 0,
        payment_method VARCHAR(50),
        payment_status VARCHAR(50) DEFAULT 'pending',
        delivery_address TEXT,
        delivery_instructions TEXT,
        scheduled_delivery TIMESTAMP,
        assigned_driver VARCHAR(100),
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        prepared_at TIMESTAMP,
        shipped_at TIMESTAMP,
        delivered_at TIMESTAMP,
        paid_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        tank_id INTEGER REFERENCES water_tanks(id),
        tank_type VARCHAR(100),
        quantity INTEGER NOT NULL,
        unit_price NUMERIC NOT NULL,
        total_price NUMERIC NOT NULL,
        water_liters NUMERIC,
        department_id INTEGER,
        department_name VARCHAR(200),
        status VARCHAR(50) DEFAULT 'allocated',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Customer Departments (for corporate clients with multiple delivery points)
      CREATE TABLE IF NOT EXISTS customer_departments (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        contact_person VARCHAR(100),
        contact_phone VARCHAR(20),
        delivery_address TEXT,
        floor_building VARCHAR(100),
        notes TEXT,
        tanks_on_site INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Delivery Confirmations (receipts with signatures)
      CREATE TABLE IF NOT EXISTS delivery_confirmations (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        department_id INTEGER,
        receiver_name VARCHAR(200) NOT NULL,
        receiver_position VARCHAR(100),
        receiver_id_number VARCHAR(50),
        signature_data TEXT,
        tanks_delivered INTEGER NOT NULL,
        tanks_collected INTEGER DEFAULT 0,
        delivery_notes TEXT,
        photo_proof TEXT,
        confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confirmed_by INTEGER REFERENCES users(id),
        latitude NUMERIC,
        longitude NUMERIC
      );

      -- Tank Returns/Collections (track tanks to be collected)
      CREATE TABLE IF NOT EXISTS tank_returns (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        department_id INTEGER,
        order_id INTEGER REFERENCES orders(id),
        tank_id INTEGER REFERENCES water_tanks(id),
        status VARCHAR(50) DEFAULT 'pending',
        scheduled_date DATE,
        collected_date TIMESTAMP,
        collected_by INTEGER REFERENCES users(id),
        condition_on_return VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Customer Payments & Receivables
      CREATE TABLE IF NOT EXISTS customer_payments (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        order_id INTEGER REFERENCES orders(id),
        payment_date DATE DEFAULT CURRENT_DATE,
        amount NUMERIC NOT NULL,
        payment_method VARCHAR(50),
        reference_number VARCHAR(100),
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Inventory Movements for Accounting Integration
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id SERIAL PRIMARY KEY,
        movement_type VARCHAR(50) NOT NULL,
        category VARCHAR(100),
        item_description TEXT,
        quantity NUMERIC,
        unit_cost NUMERIC,
        total_cost NUMERIC,
        source_type VARCHAR(50),
        source_id INTEGER,
        from_location VARCHAR(100),
        to_location VARCHAR(100),
        account_code VARCHAR(20),
        journal_entry_id INTEGER,
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Water Management Tables
      CREATE TABLE IF NOT EXISTS tank_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        capacity_liters NUMERIC NOT NULL,
        deposit_amount NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS water_tanks (
        id SERIAL PRIMARY KEY,
        tank_number VARCHAR(50) UNIQUE,
        tank_type_id INTEGER REFERENCES tank_types(id),
        status VARCHAR(50) DEFAULT 'available',
        condition VARCHAR(50) DEFAULT 'new',
        purchase_date DATE,
        purchase_price NUMERIC,
        unit_cost NUMERIC DEFAULT 150.00,
        accounting_account VARCHAR(20) DEFAULT '1104',
        assigned_customer_id INTEGER REFERENCES customers(id),
        assigned_date TIMESTAMP,
        water_liters NUMERIC DEFAULT 0,
        fill_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS water_storage (
        id SERIAL PRIMARY KEY,
        tank_id INTEGER,
        tank_name VARCHAR(100),
        capacity_liters NUMERIC NOT NULL,
        current_liters NUMERIC DEFAULT 0,
        unit_cost_per_liter NUMERIC DEFAULT 0.50,
        accounting_account VARCHAR(20) DEFAULT '1105',
        status VARCHAR(50) DEFAULT 'normal',
        last_fill_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS water_suppliers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        contact_person VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        price_per_liter NUMERIC,
        payment_terms VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS water_movements (
        id SERIAL PRIMARY KEY,
        movement_type VARCHAR(50) NOT NULL,
        volume_liters NUMERIC NOT NULL,
        storage_tank_id INTEGER,
        supplier_id INTEGER REFERENCES water_suppliers(id),
        purchase_price_per_liter NUMERIC,
        total_cost NUMERIC,
        supplier_invoice_number VARCHAR(100),
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Add accounting fields to existing tables
      ALTER TABLE water_tanks ADD COLUMN IF NOT EXISTS unit_cost NUMERIC DEFAULT 150.00;
      ALTER TABLE water_tanks ADD COLUMN IF NOT EXISTS accounting_account VARCHAR(20) DEFAULT '1104';
      ALTER TABLE water_tanks ADD COLUMN IF NOT EXISTS water_liters NUMERIC DEFAULT 0;
      ALTER TABLE water_tanks ADD COLUMN IF NOT EXISTS fill_date TIMESTAMP;
      ALTER TABLE water_tanks ADD COLUMN IF NOT EXISTS qr_code TEXT;
      ALTER TABLE water_tanks ADD COLUMN IF NOT EXISTS qr_generated_at TIMESTAMP;
      ALTER TABLE water_storage ADD COLUMN IF NOT EXISTS unit_cost_per_liter NUMERIC DEFAULT 0.50;
      ALTER TABLE water_storage ADD COLUMN IF NOT EXISTS accounting_account VARCHAR(20) DEFAULT '1105';
      ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS accounting_posted BOOLEAN DEFAULT FALSE;
      ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS qr_codes_generated BOOLEAN DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS loans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        inventory_item_id INTEGER REFERENCES inventory_items(id),
        amount NUMERIC NOT NULL,
        term INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        due_date TIMESTAMP NOT NULL,
        late_fee NUMERIC DEFAULT 0,
        contract_path TEXT,
        loan_type VARCHAR(50) DEFAULT 'producto',
        financial_product_id INTEGER REFERENCES financial_products(id),
        store_id INTEGER,
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        weekly_payment NUMERIC,
        total_repay NUMERIC,
        total_interest NUMERIC,
        amortization_schedule JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounting_entries (
        id SERIAL PRIMARY KEY,
        loan_id INTEGER REFERENCES loans(id),
        type VARCHAR(100) NOT NULL,
        amount NUMERIC NOT NULL,
        description TEXT,
        source_type VARCHAR(50) DEFAULT 'payment',
        source_id INTEGER,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing columns if they don't exist (migration)
    try {
      await pool.query(`
        ALTER TABLE accounting_entries 
        ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'payment'
      `);
    } catch (err) {
      console.log("Column source_type already exists or migration failed:", err.message);
    }

    try {
      await pool.query(`
        ALTER TABLE accounting_entries 
        ADD COLUMN IF NOT EXISTS source_id INTEGER
      `);
    } catch (err) {
      console.log("Column source_id already exists or migration failed:", err.message);
    }

    try {
      await pool.query(`
        ALTER TABLE accounting_entries 
        ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)
      `);
    } catch (err) {
      console.log("Column created_by already exists or migration failed:", err.message);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS loan_installments (
        id SERIAL PRIMARY KEY,
        loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
        week_number INTEGER NOT NULL,
        due_date TIMESTAMP NOT NULL,
        amount_due NUMERIC NOT NULL,
        capital_portion NUMERIC NOT NULL,
        interest_portion NUMERIC NOT NULL,
        penalty_applied NUMERIC DEFAULT 0,
        last_penalty_applied TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing columns if they don't exist (migration)
    try {
      await pool.query(`
        ALTER TABLE loan_installments 
        ADD COLUMN IF NOT EXISTS last_penalty_applied TIMESTAMP
      `);
    } catch (err) {
      console.log("Column last_penalty_applied already exists or migration failed:", err.message);
    }

    // Add loan_type column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE loans 
        ADD COLUMN IF NOT EXISTS loan_type VARCHAR(50) DEFAULT 'dinero'
      `);
    } catch (err) {
      console.log("Column loan_type already exists or migration failed:", err.message);
    }

    // Add payment tracking columns to loan_installments if they don't exist
    try {
      await pool.query(`
        ALTER TABLE loan_installments 
        ADD COLUMN IF NOT EXISTS capital_paid NUMERIC DEFAULT 0
      `);
    } catch (err) {
      console.log("Column capital_paid already exists or migration failed:", err.message);
    }

    // Try to alter existing columns to NUMERIC if they're INTEGER
    try {
      await pool.query(`
        ALTER TABLE loan_installments 
        ALTER COLUMN capital_paid TYPE NUMERIC
      `);
    } catch (err) {
      console.log("Column capital_paid type change failed (might already be NUMERIC):", err.message);
    }

    try {
      await pool.query(`
        ALTER TABLE loan_installments 
        ADD COLUMN IF NOT EXISTS interest_paid NUMERIC DEFAULT 0
      `);
    } catch (err) {
      console.log("Column interest_paid already exists or migration failed:", err.message);
    }

    try {
      await pool.query(`
        ALTER TABLE loan_installments 
        ALTER COLUMN interest_paid TYPE NUMERIC
      `);
    } catch (err) {
      console.log("Column interest_paid type change failed (might already be NUMERIC):", err.message);
    }

    try {
      await pool.query(`
        ALTER TABLE loan_installments 
        ADD COLUMN IF NOT EXISTS penalty_paid NUMERIC DEFAULT 0
      `);
    } catch (err) {
      console.log("Column penalty_paid already exists or migration failed:", err.message);
    }

    try {
      await pool.query(`
        ALTER TABLE loan_installments 
        ALTER COLUMN penalty_paid TYPE NUMERIC
      `);
    } catch (err) {
      console.log("Column penalty_paid type change failed (might already be NUMERIC):", err.message);
    }

    // Ensure required chart of accounts exist for payment processing
    try {
      await pool.query(`
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, category) 
        VALUES 
          ('4101', 'Penalidades Clientes', 'INGRESO', 'OPERATIVO'),
          ('4100', 'Intereses Clientes', 'INGRESO', 'OPERATIVO'),
          ('1101', 'Caja', 'ACTIVO', 'CIRCULANTE'),
          ('1102', 'Banco', 'ACTIVO', 'CIRCULANTE'),
          ('1103', 'Clientes', 'ACTIVO', 'CIRCULANTE')
        ON CONFLICT (account_code) DO NOTHING
      `);
      console.log("✅ Chart of accounts verified/created");
    } catch (err) {
      console.log("Chart of accounts setup failed:", err.message);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL,
        method VARCHAR(50),
        store_id INTEGER,
        expense_id INTEGER,
        installment_week INTEGER,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS promotions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100),
        description TEXT,
        image_url TEXT,
        product_id INTEGER,
        financial_product_id INTEGER REFERENCES financial_products(id),
        price NUMERIC,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        store_id INTEGER,
        type VARCHAR(100),
        amount NUMERIC,
        description TEXT,
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        amount NUMERIC NOT NULL,
        period VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        description TEXT,
        store_id INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS accounting_manual_entries (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        amount NUMERIC NOT NULL,
        description TEXT,
        store_id INTEGER,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure chart_of_accounts table exists before inserting the seed rows
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chart_of_accounts (
        code VARCHAR(20) PRIMARY KEY,
        name VARCHAR(255),
        type VARCHAR(50),
        group_name VARCHAR(100),
        parent_code VARCHAR(20)
      );
    `);
    // Insert all foundational seed accounts so they are always present on server reset
    await pool.query(`
      INSERT INTO chart_of_accounts (code, name, type, group_name)
      VALUES 
        ('1101', 'Fondo Fijo de Caja', 'ACTIVO', 'ACTIVO CIRCULANTE'),
        ('1102', 'Cuenta Bancaria', 'ACTIVO', 'ACTIVO CIRCULANTE'),
        ('1103', 'Cuentas por Cobrar - Clientes', 'ACTIVO', 'ACTIVO CIRCULANTE'),
        ('1104', 'Inventario de Garrafones', 'ACTIVO', 'ACTIVO CIRCULANTE'),
        ('1105', 'Inventario de Agua', 'ACTIVO', 'ACTIVO CIRCULANTE'),
        ('1106', 'Anticipos a Proveedores', 'ACTIVO', 'ACTIVO CIRCULANTE'),
        ('1500', 'Activos Fijos', 'ACTIVO', 'ACTIVO NO CIRCULANTE'),
        ('2101', 'Cuentas por Pagar', 'PASIVO', 'PASIVO CIRCULANTE'),
        ('2103', 'Préstamos Bancarios', 'PASIVO', 'PASIVO'),
        ('3000', 'Utilidades Retenidas', 'CAPITAL', 'CAPITAL CONTABLE'),
        ('3100', 'Aportaciones de Capital', 'CAPITAL', 'CAPITAL CONTABLE'),
        ('4000', 'Ventas de Agua', 'INGRESO', 'OPERATIVO'),
        ('4001', 'Ventas de Garrafones', 'INGRESO', 'OPERATIVO'),
        ('4100', 'Servicios de Entrega', 'INGRESO', 'OPERATIVO'),
        ('4101', 'Depósitos de Garrafones', 'INGRESO', 'OPERATIVO'),
        ('1107', 'Cuentas Incobrables', 'ACTIVO', 'ACTIVO CIRCULANTE'),
        ('6500', 'Gastos por Cuentas Incobrables', 'EGRESO', 'GASTOS OPERATIVOS'),
        ('6501', 'Pérdida por Garrafones Dañados', 'EGRESO', 'GASTOS OPERATIVOS'),
        ('6502', 'Gastos de Recuperación', 'EGRESO', 'GASTOS OPERATIVOS'),
        ('5000', 'Costo de Ventas - Agua', 'EGRESO', 'COSTOS'),
        ('5001', 'Costo de Ventas - Garrafones', 'EGRESO', 'COSTOS'),
        ('6000', 'Sueldos', 'EGRESO', 'GASTOS OPERATIVOS'),
        ('6100', 'Marketing', 'EGRESO', 'GASTOS OPERATIVOS'),
        ('6110', 'Flyers', 'EGRESO', 'GASTOS OPERATIVOS'),
        ('6200', 'Renta', 'EGRESO', 'GASTOS OPERATIVOS'),
        ('6210', 'Agua', 'EGRESO', 'GASTOS OPERATIVOS'),
        ('6220', 'Luz', 'EGRESO', 'GASTOS OPERATIVOS'),
        ('6230', 'Internet', 'EGRESO', 'GASTOS OPERATIVOS'),
        ('6240', 'Software', 'EGRESO', 'GASTOS OPERATIVOS'),
        ('6250', 'Limpieza', 'EGRESO', 'GASTOS OPERATIVOS'),
        ('6260', 'Seguridad', 'EGRESO', 'GASTOS OPERATIVOS'),
        ('6270', 'Buró de Crédito', 'EGRESO', 'GASTOS OPERATIVOS'),
        ('6300', 'Papelería', 'EGRESO', 'GASTOS OPERATIVOS'),
        ('6999', 'Otros Gastos', 'EGRESO', 'GASTOS OPERATIVOS'),
        ('9999', 'Resultado del Ejercicio', 'CAPITAL', 'CAPITAL CONTABLE')
      ON CONFLICT (code) DO NOTHING;
    `);
    
    // Update existing accounts to water business names
    await pool.query(`
      UPDATE chart_of_accounts SET name = 'Cuentas por Cobrar - Clientes', type = 'ACTIVO' WHERE code = '1103';
      UPDATE chart_of_accounts SET name = 'Inventario de Garrafones', type = 'ACTIVO' WHERE code = '1104';
      UPDATE chart_of_accounts SET name = 'Inventario de Agua', type = 'ACTIVO' WHERE code = '1105';
      UPDATE chart_of_accounts SET name = 'Cuentas Incobrables', type = 'ACTIVO' WHERE code = '1107';
      UPDATE chart_of_accounts SET name = 'Ventas de Agua', type = 'INGRESO' WHERE code = '4000';
      UPDATE chart_of_accounts SET name = 'Ventas de Garrafones', type = 'INGRESO' WHERE code = '4001';
      UPDATE chart_of_accounts SET name = 'Servicios de Entrega', type = 'INGRESO' WHERE code = '4100';
      UPDATE chart_of_accounts SET name = 'Depósitos de Garrafones', type = 'INGRESO' WHERE code = '4101';
      UPDATE chart_of_accounts SET name = 'Costo de Ventas - Agua', type = 'EGRESO' WHERE code = '5000';
      UPDATE chart_of_accounts SET name = 'Costo de Ventas - Garrafones', type = 'EGRESO' WHERE code = '5001';
      UPDATE chart_of_accounts SET name = 'Pérdida por Garrafones Dañados', type = 'EGRESO' WHERE code = '6501';
    `);

    // Create journal_entries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
        date DATE DEFAULT CURRENT_DATE,
        description TEXT,
        account_code VARCHAR(20) REFERENCES chart_of_accounts(code),
        debit NUMERIC DEFAULT 0,
        credit NUMERIC DEFAULT 0,
        source_type VARCHAR(50),
        source_id INTEGER,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Patch existing tables with missing columns (safe for repeated runs)
    await pool.query(`
      ALTER TABLE accounting_entries ADD COLUMN IF NOT EXISTS source VARCHAR(50);
      ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS method VARCHAR(50);
      ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status VARCHAR(50);
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS due_date DATE;
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category VARCHAR(100);
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS priority VARCHAR(50);
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS budget_code VARCHAR(50);
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT false;
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring BOOLEAN DEFAULT false;
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring_frequency VARCHAR(50);
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS method VARCHAR(50);
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
      ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium';
      ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS supplier VARCHAR(100);
      ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS expected_delivery DATE;
      ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT true;
      ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      
      -- Create inventory_items table for bulk requests
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        request_id INTEGER REFERENCES inventory_requests(id) ON DELETE CASCADE,
        category VARCHAR(100),
        brand VARCHAR(100),
        model VARCHAR(100),
        color VARCHAR(50),
        ram VARCHAR(20),
        storage VARCHAR(20),
        quantity INTEGER DEFAULT 1,
        purchase_price NUMERIC(10,2) DEFAULT 0,
        sale_price NUMERIC(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Ensure updated_at column exists in expenses table
    await pool.query(`
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
    `);
    // Ensure method column exists in expenses table
    await pool.query(`
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS method VARCHAR(50);
    `);

    // Create loan_investigations table for investigations (with extended fields)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loan_investigations (
        id SERIAL PRIMARY KEY,
        fecha DATE,
        nombre_asesor VARCHAR(100),
        sucursal VARCHAR(100),
        telefono VARCHAR(30),
        ocupacion TEXT,
        antiguedad TEXT,
        frecuencia_pago VARCHAR(50),
        monto NUMERIC,
        calificacion VARCHAR(50),
        como_cobrar_moroso TEXT,
        observaciones TEXT,
        info_general_cliente TEXT,
        pareja_nombre TEXT,
        pareja_ocupacion TEXT,
        pareja_antiguedad TEXT,
        pareja_ingresos TEXT,
        hijos TEXT,
        dependientes TEXT,
        renta TEXT,
        casa_propia TEXT,
        auto_propio TEXT,
        auto_modelo TEXT,
        auto_placas TEXT,
        familiares_cercanos TEXT,
        referencias_nombre1 TEXT,
        referencias_parentesco1 TEXT,
        referencias_telefono1 TEXT,
        referencias_nombre2 TEXT,
        referencias_parentesco2 TEXT,
        referencias_telefono2 TEXT,
        referencias_nombre3 TEXT,
        referencias_parentesco3 TEXT,
        referencias_telefono3 TEXT,
        checklist_ine BOOLEAN,
        checklist_comprobante BOOLEAN,
        checklist_curp BOOLEAN,
        checklist_rfc BOOLEAN,
        checklist_buro BOOLEAN,
        checklist_selfie BOOLEAN,
        checklist_video BOOLEAN,
        checklist_formulario BOOLEAN,
        checklist_otros TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Patch missing columns (safe for repeated runs)
    await pool.query(`
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS pareja_nombre TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS pareja_ocupacion TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS pareja_antiguedad TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS pareja_ingresos TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS hijos TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS dependientes TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS renta TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS casa_propia TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS auto_propio TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS auto_modelo TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS auto_placas TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS familiares_cercanos TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS referencias_nombre1 TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS referencias_parentesco1 TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS referencias_telefono1 TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS referencias_nombre2 TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS referencias_parentesco2 TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS referencias_telefono2 TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS referencias_nombre3 TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS referencias_parentesco3 TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS referencias_telefono3 TEXT;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS checklist_ine BOOLEAN;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS checklist_comprobante BOOLEAN;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS checklist_curp BOOLEAN;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS checklist_rfc BOOLEAN;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS checklist_buro BOOLEAN;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS checklist_selfie BOOLEAN;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS checklist_video BOOLEAN;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS checklist_formulario BOOLEAN;
      ALTER TABLE loan_investigations ADD COLUMN IF NOT EXISTS checklist_otros TEXT;
    `);

    // Create loan_resolutions table for tracking loan resolutions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loan_resolutions (
        id SERIAL PRIMARY KEY,
        loan_id INTEGER REFERENCES loans(id),
        resolution_type VARCHAR(50) NOT NULL, -- 'settlement', 'write_off', 'repossession'
        amount NUMERIC(10,2) DEFAULT 0, -- amount recovered (settlement/repossession)
        write_off_amount NUMERIC(10,2) DEFAULT 0, -- amount written off
        recovery_costs NUMERIC(10,2) DEFAULT 0, -- costs for recovery/repossession
        notes TEXT,
        reason TEXT, -- reason for resolution
        recovery_attempts INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add payment_type column to payments table for tracking settlement payments
    await pool.query(`
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'regular';
    `);

    console.log("✅ Tables ready");
// Route to receive and store credit investigation form data (extended fields)
app.post("/investigations", authenticateToken, async (req, res) => {
  // Collect all form values, using the same keys as the frontend payload
  const b = req.body || {};
  try {
    const result = await pool.query(
      `INSERT INTO loan_investigations (
        fecha,
        nombreAsesor,
        sucursal,
        telefono,
        ocupacion,
        antiguedad,
        frecuenciaPago,
        monto,
        calificacion,
        comoCobrarMoroso,
        observaciones,
        infoGeneralCliente,
        parejaNombre,
        parejaOcupacion,
        parejaAntiguedad,
        parejaIngresos,
        hijos,
        dependientes,
        renta,
        casaPropia,
        autoPropio,
        autoModelo,
        autoPlacas,
        familiaresCercanos,
        referenciasNombre1,
        referenciasParentesco1,
        referenciasTelefono1,
        referenciasNombre2,
        referenciasParentesco2,
        referenciasTelefono2,
        referenciasNombre3,
        referenciasParentesco3,
        referenciasTelefono3,
        checklistIne,
        checklistComprobante,
        checklistCurp,
        checklistRfc,
        checklistBuro,
        checklistSelfie,
        checklistVideo,
        checklistFormulario,
        checklistOtros,
        created_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
        $31,$32,$33,$34,$35,$36,$37,$38,$39,$40,
        $41,$42,$43
      ) RETURNING *`,
      [
        b.fecha || null,
        b.nombreAsesor || null,
        b.sucursal || null,
        b.telefono || null,
        b.ocupacion || null,
        b.antiguedad || null,
        b.frecuenciaPago || null,
        b.monto || null,
        b.calificacion || null,
        b.comoCobrarMoroso || null,
        b.observaciones || null,
        b.infoGeneralCliente || null,
        b.parejaNombre || null,
        b.parejaOcupacion || null,
        b.parejaAntiguedad || null,
        b.parejaIngresos || null,
        b.hijos || null,
        b.dependientes || null,
        b.renta || null,
        b.casaPropia || null,
        b.autoPropio || null,
        b.autoModelo || null,
        b.autoPlacas || null,
        b.familiaresCercanos || null,
        b.referenciasNombre1 || null,
        b.referenciasParentesco1 || null,
        b.referenciasTelefono1 || null,
        b.referenciasNombre2 || null,
        b.referenciasParentesco2 || null,
        b.referenciasTelefono2 || null,
        b.referenciasNombre3 || null,
        b.referenciasParentesco3 || null,
        b.referenciasTelefono3 || null,
        typeof b.checklistIne === "undefined" ? null : !!b.checklistIne,
        typeof b.checklistComprobante === "undefined" ? null : !!b.checklistComprobante,
        typeof b.checklistCurp === "undefined" ? null : !!b.checklistCurp,
        typeof b.checklistRfc === "undefined" ? null : !!b.checklistRfc,
        typeof b.checklistBuro === "undefined" ? null : !!b.checklistBuro,
        typeof b.checklistSelfie === "undefined" ? null : !!b.checklistSelfie,
        typeof b.checklistVideo === "undefined" ? null : !!b.checklistVideo,
        typeof b.checklistFormulario === "undefined" ? null : !!b.checklistFormulario,
        b.checklistOtros || null,
        req.user.id
      ]
    );
    res.json({ message: "Investigación registrada", investigation: result.rows[0] });
  } catch (err) {
    console.error("Error saving investigation:", err);
    res.status(500).json({ message: "Error saving investigation" });
  }
});
  } catch (err) {
    console.error("❌ Error creating tables", err);
  }
};




async function migrateExistingPayments() {
  try {
    console.log("🔄 Starting payment migration...");
    
    // Get all payments that need to be migrated
    try {
      const paymentsResult = await pool.query(`
        SELECT p.*, li.id as installment_id, li.week_number, li.amount_due, li.capital_portion, li.interest_portion, li.penalty_applied
        FROM payments p
        JOIN loan_installments li ON p.loan_id = li.loan_id AND p.installment_week = li.week_number
        WHERE p.amount > 0
        ORDER BY p.loan_id, p.installment_week
      `);
      
      console.log(`📊 Found ${paymentsResult.rows.length} payments to migrate`);
      
      let updatedCount = 0;
      
      for (const payment of paymentsResult.rows) {
        const installmentAmount = parseFloat(payment.amount_due);
        const penaltyAmount = parseFloat(payment.penalty_applied || 0);
        const totalDue = installmentAmount + penaltyAmount;
        const paymentAmount = parseFloat(payment.amount);
        
        // Calculate how much of the payment goes to each component
        let capitalPaid = 0;
        let interestPaid = 0;
        let penaltyPaid = 0;
        
        if (totalDue > 0) {
          // First, pay penalties
          if (penaltyAmount > 0) {
            penaltyPaid = Math.min(paymentAmount, penaltyAmount);
            paymentAmount -= penaltyPaid;
          }
          
          // Then, pay interest
          if (paymentAmount > 0) {
            interestPaid = Math.min(paymentAmount, parseFloat(payment.interest_portion));
            paymentAmount -= interestPaid;
          }
          
          // Finally, pay capital
          if (paymentAmount > 0) {
            capitalPaid = paymentAmount;
          }
        }
        
        // Update the installment with the calculated amounts
        await pool.query(`
          UPDATE loan_installments 
          SET 
            capital_paid = COALESCE(capital_paid, 0) + $1,
            interest_paid = COALESCE(interest_paid, 0) + $2,
            penalty_paid = COALESCE(penalty_paid, 0) + $3,
            status = CASE 
              WHEN (COALESCE(capital_paid, 0) + $1 + COALESCE(interest_paid, 0) + $2 + COALESCE(penalty_paid, 0) + $3) >= (amount_due + COALESCE(penalty_applied, 0))
              THEN 'paid'
              ELSE status
            END
          WHERE id = $4
        `, [capitalPaid, interestPaid, penaltyPaid, payment.installment_id]);
        
        console.log(`✅ Updated installment ${payment.week_number} for loan ${payment.loan_id}: Capital: $${capitalPaid}, Interest: $${interestPaid}, Penalty: $${penaltyPaid}`);
        updatedCount++;
      }
      
      console.log(`🎉 Migration completed! Updated ${updatedCount} installments`);
    } catch (error) {
      console.error('❌ Error getting payments:', error);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

async function seedTankTypes() {
  try {
    const countResult = await pool.query('SELECT COUNT(*) as count FROM tank_types');
    const count = parseInt(countResult.rows[0].count);
    
    if (count === 0) {
      console.log("📦 Seeding tank types...");
      await pool.query(`
        INSERT INTO tank_types (name, capacity_liters, deposit_amount) VALUES
        ('Garrafón 20L Estándar', 20, 150),
        ('Garrafón 10L Pequeño', 10, 80),
        ('Garrafón 20L Premium', 20, 180)
      `);
      console.log("✅ Seeded 3 tank types");
    }
  } catch (err) {
    console.warn("⚠️ Could not seed tank types:", err.message);
  }
}

async function start() {
  try {
    console.log("🚀 Starting server...");
    await createTables();
    console.log("✅ Database tables created/verified");
    
    // Apply water inventory schema extensions
    if (process.env.DATABASE_URL || process.env.NODE_ENV === 'production') {
      const setupDatabase = require('./setup-db');
      await setupDatabase();
    }
    
    // Seed default tank types
    await seedTankTypes();
    
    // Run migration for existing payments
    await migrateExistingPayments();

    // Log all registered routes before starting server
    app._router.stack
      .filter(r => r.route)
      .forEach(r => console.log("📦 Registered route:", r.route.path));

    app.listen(port, () => {
      console.log(`🚀 Backend live at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("❌ Error starting server:", err);
    process.exit(1);
  }
}

// Auth helpers
// Reuse the existing authenticateToken function for route authentication
const generateToken = (user) => {
  const role = user.role || (user.is_admin ? "admin" : "user");
  const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
  
  const token = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role,
      iat: now,
      exp: now + (7 * 24 * 60 * 60) // 7 days from now
    },
    process.env.JWT_SECRET || "secretkey"
  );
  
  return token;
};

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");
  console.log("🛡️ Incoming token header:", token);
  if (!token) return res.status(403).json({ message: "Access denied" });

  try {
    const cleanToken = token.replace("Bearer ", "");
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || "secretkey");
    console.log("✅ Token decoded:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err);
    return res.status(403).json({ message: "Invalid token" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  next();
};

// Database test endpoint to check table structure
app.get("/test-db", authenticateToken, async (req, res) => {
  try {
    // Test loans table
    const loansResult = await pool.query("SELECT COUNT(*) as count FROM loans");
    
    // Test loan_installments table
    const installmentsResult = await pool.query("SELECT COUNT(*) as count FROM loan_installments");
    
    // Test payments table
    const paymentsResult = await pool.query("SELECT COUNT(*) as count FROM payments");
    
    res.json({
      status: "database_test_complete",
      loans_count: loansResult.rows[0].count,
      installments_count: installmentsResult.rows[0].count,
      payments_count: paymentsResult.rows[0].count,
      message: "Database tables are accessible"
    });
  } catch (err) {
    console.error("Database test failed:", err);
    res.status(500).json({ 
      status: "database_test_failed", 
      error: err.message,
      errorName: err.name,
      errorCode: err.code
    });
  }
});

// Debug endpoint to check receipt generation
app.get("/debug-receipt/:receipt_number", authenticateToken, async (req, res) => {
  try {
    const { receipt_number } = req.params;
    
    // Check if receipt exists in database
    const receiptResult = await pool.query(`
      SELECT * FROM payment_receipts WHERE receipt_number = $1
    `, [receipt_number]);
    
    if (!receiptResult.rows.length) {
      return res.status(404).json({ 
        message: "Receipt not found in database",
        receipt_number,
        available_receipts: await pool.query("SELECT receipt_number FROM payment_receipts ORDER BY created_at DESC LIMIT 5")
      });
    }
    
    const receipt = receiptResult.rows[0];
    
    // Check if file exists
    const fileExists = fs.existsSync(receipt.pdf_path);
    
    res.json({
      receipt_number,
      receipt_found: true,
      file_exists: fileExists,
      file_path: receipt.pdf_path,
      receipt_data: receipt
    });
  } catch (err) {
    console.error("Debug receipt error:", err);
    res.status(500).json({ 
      message: "Error debugging receipt", 
      error: err.message 
    });
  }
});

// Debug endpoint to check database schema
app.get("/debug-schema", async (req, res) => {
  try {
    // Check loan_installments table structure
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'loan_installments' 
      AND column_name IN ('capital_paid', 'interest_paid', 'penalty_paid')
      ORDER BY column_name
    `);
    
    // Check if there are any loan_installments with non-null values
    const dataResult = await pool.query(`
      SELECT 
        COUNT(*) as total_rows,
        COUNT(CASE WHEN capital_paid IS NOT NULL THEN 1 END) as capital_paid_count,
        COUNT(CASE WHEN interest_paid IS NOT NULL THEN 1 END) as interest_paid_count,
        COUNT(CASE WHEN penalty_paid IS NOT NULL THEN 1 END) as penalty_paid_count
      FROM loan_installments
    `);
    
    res.json({
      schema: schemaResult.rows,
      data_summary: dataResult.rows[0],
      message: "Database schema check complete"
    });
  } catch (err) {
    console.error("Debug schema error:", err);
    res.status(500).json({ 
      message: "Error checking schema", 
      error: err.message 
    });
  }
});

// Test payment endpoint for debugging
app.get("/test-payment/:loan_id", authenticateToken, async (req, res) => {
  try {
    const { loan_id } = req.params;
    console.log("🧪 Testing payment endpoint for loan_id:", loan_id);
    
    // Test loan existence
    const loanCheck = await pool.query(`SELECT id, status, loan_type FROM loans WHERE id = $1`, [loan_id]);
    console.log("📊 Loan check result:", loanCheck.rows);
    
    // Test installments
    const installments = await pool.query(`
      SELECT id, week_number, amount_due, status, penalty_applied, last_penalty_applied
      FROM loan_installments
      WHERE loan_id = $1 AND status = 'pending'
      ORDER BY week_number ASC
    `, [loan_id]);
    console.log("📊 Installments result:", installments.rows);
    
    res.json({
      loan: loanCheck.rows[0] || null,
      installments: installments.rows,
      message: "Test completed successfully"
    });
  } catch (err) {
    console.error("❌ Test payment endpoint error:", err);
    res.status(500).json({ 
      error: err.message,
      stack: err.stack
    });
  }
});

    // Enhanced payment breakdown endpoint
    app.get("/loans/:loan_id/payment-breakdown", authenticateToken, async (req, res) => {
      try {
        const { loan_id } = req.params;
        
        // Get all payments with detailed breakdown
        const breakdownResult = await pool.query(`
          SELECT 
            p.id as payment_id,
            p.payment_date,
            p.amount as total_amount,
            p.method,
            p.installment_week,
            ae.type as component_type,
            ae.amount as component_amount,
            ae.description
          FROM payments p
          LEFT JOIN accounting_entries ae ON p.loan_id = ae.loan_id 
            AND ae.description LIKE '%semana ' || p.installment_week || '%'
          WHERE p.loan_id = $1
          ORDER BY p.payment_date DESC, p.id DESC, ae.type
        `, [loan_id]);
    
    // Group by payment
    const paymentBreakdown = {};
    breakdownResult.rows.forEach(row => {
      const paymentKey = `${row.payment_id}_${row.payment_date}`;
      if (!paymentBreakdown[paymentKey]) {
        paymentBreakdown[paymentKey] = {
          payment_id: row.payment_id,
          payment_date: row.payment_date,
          total_amount: row.total_amount,
          method: row.method,
          installment_week: row.installment_week,
          components: []
        };
      }
      if (row.component_type) {
        paymentBreakdown[paymentKey].components.push({
          type: row.component_type,
          amount: row.component_amount,
          description: row.description
        });
      }
    });
    
    res.json({
      loan_id,
      payment_breakdown: Object.values(paymentBreakdown)
    });
  } catch (err) {
    console.error("Error fetching payment breakdown:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Enhanced Income Statement with multiple period types and export functionality
app.get("/income-statement", authenticateToken, async (req, res) => {
  console.log("👤 Authenticated user accessing /income-statement:", req.user);
  
  const { month, year, quarter, start, end, details } = req.query;
  const showDetails = details === "true";

  let fromDate, toDate;

  try {
    // Determine date range based on parameters
    if (start && end) {
      // Custom period
      fromDate = new Date(start);
      toDate = new Date(end);
    } else if (quarter && year) {
      // Quarter period
      const quarterNum = parseInt(quarter);
      const yearNum = parseInt(year);
      const startMonth = (quarterNum - 1) * 3 + 1;
      fromDate = new Date(yearNum, startMonth - 1, 1);
      toDate = new Date(yearNum, startMonth + 2, 0);
    } else if (year && !month) {
      // Full year
      const yearNum = parseInt(year);
      fromDate = new Date(yearNum, 0, 1);
      toDate = new Date(yearNum, 11, 31);
    } else {
      // Default to current month
      const today = new Date();
      const monthNum = parseInt(month) || today.getMonth() + 1;
      const yearNum = parseInt(year) || today.getFullYear();

      if (monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ message: "Invalid month" });
      }

      const paddedMonth = monthNum.toString().padStart(2, "0");
      fromDate = new Date(`${yearNum}-${paddedMonth}-01T00:00:00`);
      toDate = new Date(yearNum, monthNum, 0);
    }

    // Align start to first Sunday before period starts
    const alignedStart = new Date(fromDate);
    alignedStart.setDate(alignedStart.getDate() - ((alignedStart.getDay() + 1) % 7));

    // Align end to last Saturday of the period
    const alignedEnd = new Date(toDate);
    alignedEnd.setDate(alignedEnd.getDate() + (6 - alignedEnd.getDay()));

    const summary = {
      interestPaid: 0,
      penalties: 0,
      productMargin: 0,
      costOfGoods: 0,
      expenses: 0,
      period: {
        start: alignedStart.toISOString().split("T")[0],
        end: alignedEnd.toISOString().split("T")[0],
        type: start && end ? "custom" : quarter ? "quarter" : year && !month ? "year" : "month"
      }
    };

    const weeklyBreakdown = [];

    let currentStart = new Date(alignedStart);
    while (currentStart <= alignedEnd) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 6);

      const fromStr = currentStart.toISOString().split("T")[0];
      const toStr = currentEnd.toISOString().split("T")[0];

      const entries = await pool.query(`
        SELECT * FROM accounting_entries
        WHERE created_at BETWEEN $1 AND $2
      `, [fromStr, toStr]);

      const expenses = await pool.query(`
        SELECT * FROM expenses
        WHERE created_at BETWEEN $1 AND $2
      `, [fromStr, toStr]);

      const weekSummary = {
        range: `${fromStr} → ${toStr}`,
        interestPaid: 0,
        penalties: 0,
        productMargin: 0,
        costOfGoods: 0,
        expenses: 0
      };

      for (const entry of entries.rows) {
        const amount = parseFloat(entry.amount);
        switch (entry.type) {
          case "interestPaid":
            weekSummary.interestPaid += amount;
            summary.interestPaid += amount;
            break;
          case "penaltyFee":
            weekSummary.penalties += amount;
            summary.penalties += amount;
            break;
          case "clientesTelefono":
            weekSummary.productMargin += Math.abs(amount);
            summary.productMargin += Math.abs(amount);
            break;
          case "costOfGoods":
            weekSummary.costOfGoods += amount;
            summary.costOfGoods += amount;
            break;
        }
      }

      for (const exp of expenses.rows) {
        const amount = parseFloat(exp.amount);
        weekSummary.expenses += amount;
        summary.expenses += amount;
      }

      weeklyBreakdown.push(weekSummary);
      currentStart.setDate(currentStart.getDate() + 7);
    }

    summary.weeklyBreakdown = weeklyBreakdown;

    // Calculate additional metrics
    summary.totalIncome = summary.interestPaid + summary.productMargin + summary.penalties;
    summary.totalExpenses = summary.costOfGoods + summary.expenses;
    summary.grossProfit = summary.totalIncome - summary.costOfGoods;
    summary.netIncome = summary.grossProfit - summary.expenses;
    summary.profitMargin = summary.totalIncome > 0 ? (summary.netIncome / summary.totalIncome) * 100 : 0;
    summary.expenseRatio = summary.totalIncome > 0 ? (summary.totalExpenses / summary.totalIncome) * 100 : 0;

    console.log("🧾 Enhanced income statement summary:", JSON.stringify(summary, null, 2));
    res.json(summary);
  } catch (err) {
    console.error("Error generating enhanced income statement:", err);
    res.status(500).json({ message: "Error generating income statement" });
  }
});

// Export Income Statement as PDF
app.get("/income-statement/export-pdf", authenticateToken, async (req, res) => {
  try {
    const { month, year, quarter, start, end } = req.query;
    
    // Reuse the same logic to get data
    let fromDate, toDate;
    
    if (start && end) {
      fromDate = new Date(start);
      toDate = new Date(end);
    } else if (quarter && year) {
      const quarterNum = parseInt(quarter);
      const yearNum = parseInt(year);
      const startMonth = (quarterNum - 1) * 3 + 1;
      fromDate = new Date(yearNum, startMonth - 1, 1);
      toDate = new Date(yearNum, startMonth + 2, 0);
    } else if (year && !month) {
      const yearNum = parseInt(year);
      fromDate = new Date(yearNum, 0, 1);
      toDate = new Date(yearNum, 11, 31);
    } else {
      const today = new Date();
      const monthNum = parseInt(month) || today.getMonth() + 1;
      const yearNum = parseInt(year) || today.getFullYear();
      const paddedMonth = monthNum.toString().padStart(2, "0");
      fromDate = new Date(`${yearNum}-${paddedMonth}-01T00:00:00`);
      toDate = new Date(yearNum, monthNum, 0);
    }

    // Get the data (simplified version for PDF)
    const entries = await pool.query(`
      SELECT * FROM accounting_entries
      WHERE created_at BETWEEN $1 AND $2
    `, [fromDate.toISOString().split("T")[0], toDate.toISOString().split("T")[0]]);

    const expenses = await pool.query(`
      SELECT * FROM expenses
      WHERE created_at BETWEEN $1 AND $2
    `, [fromDate.toISOString().split("T")[0], toDate.toISOString().split("T")[0]]);

    // Calculate totals
    let interestPaid = 0, penalties = 0, productMargin = 0, costOfGoods = 0, totalExpenses = 0;

    for (const entry of entries.rows) {
      const amount = parseFloat(entry.amount);
      switch (entry.type) {
        case "interestPaid": interestPaid += amount; break;
        case "penaltyFee": penalties += amount; break;
        case "clientesTelefono": productMargin += Math.abs(amount); break;
        case "costOfGoods": costOfGoods += amount; break;
      }
    }

    for (const exp of expenses.rows) {
      totalExpenses += parseFloat(exp.amount);
    }

    const totalIncome = interestPaid + productMargin + penalties;
    const totalExpensesAmount = costOfGoods + totalExpenses;
    const grossProfit = totalIncome - costOfGoods;
    const netIncome = grossProfit - totalExpenses;

    // Generate PDF content
    const pdfContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #333; }
            .period { font-size: 16px; color: #666; margin-top: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .income { color: #28a745; }
            .expense { color: #dc3545; }
            .total { font-weight: bold; font-size: 16px; }
            .summary { margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Estado de Resultados</div>
            <div class="period">Período: ${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}</div>
          </div>
          
          <table>
            <tr>
              <th>Concepto</th>
              <th style="text-align: right;">Monto</th>
            </tr>
            <tr>
              <td colspan="2" style="font-weight: bold; color: #28a745;">INGRESOS</td>
            </tr>
            <tr>
              <td style="padding-left: 20px;">Intereses cobrados</td>
              <td style="text-align: right; color: #28a745;">$${interestPaid.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding-left: 20px;">Penalidades</td>
              <td style="text-align: right; color: #28a745;">$${penalties.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding-left: 20px;">Margen de productos</td>
              <td style="text-align: right; color: #28a745;">$${productMargin.toLocaleString()}</td>
            </tr>
            <tr>
              <td colspan="2" style="font-weight: bold; color: #dc3545;">COSTOS Y GASTOS</td>
            </tr>
            <tr>
              <td style="padding-left: 20px;">Costo de ventas</td>
              <td style="text-align: right; color: #dc3545;">$${costOfGoods.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding-left: 20px;">Gastos operativos</td>
              <td style="text-align: right; color: #dc3545;">$${totalExpensesAmount.toLocaleString()}</td>
            </tr>
          </table>
          
          <div class="summary">
            <div style="margin-bottom: 10px;"><strong>Total Ingresos:</strong> $${totalIncome.toLocaleString()}</div>
            <div style="margin-bottom: 10px;"><strong>Costo de Venta:</strong> $${costOfGoods.toLocaleString()}</div>
            <div style="margin-bottom: 10px;"><strong>Utilidad Bruta:</strong> $${grossProfit.toLocaleString()}</div>
            <div style="margin-bottom: 10px;"><strong>Gastos Generales:</strong> $${totalExpensesAmount.toLocaleString()}</div>
            <div style="margin-bottom: 10px; font-size: 18px;"><strong>Utilidad Neta:</strong> $${netIncome.toLocaleString()}</div>
          </div>
        </body>
      </html>
    `;

    // For now, return HTML content (you can integrate with a PDF library like puppeteer)
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename="income-statement.html"');
    res.send(pdfContent);
  } catch (err) {
    console.error("Error exporting PDF:", err);
    res.status(500).json({ message: "Error exporting PDF" });
  }
});

// Export Income Statement as Excel
app.get("/income-statement/export-excel", authenticateToken, async (req, res) => {
  try {
    const { month, year, quarter, start, end } = req.query;
    
    // Reuse the same logic to get data
    let fromDate, toDate;
    
    if (start && end) {
      fromDate = new Date(start);
      toDate = new Date(end);
    } else if (quarter && year) {
      const quarterNum = parseInt(quarter);
      const yearNum = parseInt(year);
      const startMonth = (quarterNum - 1) * 3 + 1;
      fromDate = new Date(yearNum, startMonth - 1, 1);
      toDate = new Date(yearNum, startMonth + 2, 0);
    } else if (year && !month) {
      const yearNum = parseInt(year);
      fromDate = new Date(yearNum, 0, 1);
      toDate = new Date(yearNum, 11, 31);
    } else {
      const today = new Date();
      const monthNum = parseInt(month) || today.getMonth() + 1;
      const yearNum = parseInt(year) || today.getFullYear();
      const paddedMonth = monthNum.toString().padStart(2, "0");
      fromDate = new Date(`${yearNum}-${paddedMonth}-01T00:00:00`);
      toDate = new Date(yearNum, monthNum, 0);
    }

    // Get the data
    const entries = await pool.query(`
      SELECT * FROM accounting_entries
      WHERE created_at BETWEEN $1 AND $2
    `, [fromDate.toISOString().split("T")[0], toDate.toISOString().split("T")[0]]);

    const expenses = await pool.query(`
      SELECT * FROM expenses
      WHERE created_at BETWEEN $1 AND $2
    `, [fromDate.toISOString().split("T")[0], toDate.toISOString().split("T")[0]]);

    // Calculate totals
    let interestPaid = 0, penalties = 0, productMargin = 0, costOfGoods = 0, totalExpenses = 0;

    for (const entry of entries.rows) {
      const amount = parseFloat(entry.amount);
      switch (entry.type) {
        case "interestPaid": interestPaid += amount; break;
        case "penaltyFee": penalties += amount; break;
        case "clientesTelefono": productMargin += Math.abs(amount); break;
        case "costOfGoods": costOfGoods += amount; break;
      }
    }

    for (const exp of expenses.rows) {
      totalExpenses += parseFloat(exp.amount);
    }

    const totalIncome = interestPaid + productMargin + penalties;
    const totalExpensesAmount = costOfGoods + totalExpenses;
    const grossProfit = totalIncome - costOfGoods;
    const netIncome = grossProfit - totalExpenses;

    // Generate CSV content (Excel-compatible)
    const csvContent = `Concepto,Monto
INGRESOS,
Intereses cobrados,${interestPaid}
Penalidades,${penalties}
Margen de productos,${productMargin}
COSTOS Y GASTOS,
Costo de ventas,${costOfGoods}
Gastos operativos,${totalExpensesAmount}
RESUMEN,
Total Ingresos,${totalIncome}
Costo de Venta,${costOfGoods}
Utilidad Bruta,${grossProfit}
Gastos Generales,${totalExpensesAmount}
Utilidad Neta,${netIncome}`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="income-statement.csv"');
    res.send(csvContent);
  } catch (err) {
    console.error("Error exporting Excel:", err);
    res.status(500).json({ message: "Error exporting Excel" });
  }
});

// ✅ Route: Upload signed contract for a loan
app.post("/admin/loans/:id/upload-contract", authenticateToken, isAdmin, upload.single("contract"), async (req, res) => {
  const { id } = req.params;
  const contractPath = req.file ? req.file.path : null;

  if (!contractPath) {
    return res.status(400).json({ message: "No contract file uploaded" });
  }

  try {
    await pool.query(
      "UPDATE loans SET contract_path = $1 WHERE id = $2",
      [contractPath, id]
    );
    res.json({ message: "Contract uploaded successfully", path: contractPath });
  } catch (err) {
    console.error("❌ Error uploading contract:", err);
    res.status(500).json({ message: "Error uploading contract" });
  }
});

// ✅ Route: Generate contract document for a given loan
app.get("/contracts/:loan_id/generate", authenticateToken, async (req, res) => {
  const { loan_id } = req.params;

  try {
    const loanData = await pool.query(`
      SELECT loans.*, 
             customers.first_name, 
             customers.last_name, 
             customers.address, 
             customers.phone,
             customers.curp,
             inventory_items.model, 
             inventory_items.imei, 
             inventory_items.store,
             inventory_items.brand,
             inventory_items.color,
             inventory_items.ram,
             inventory_items.storage
      FROM loans
      LEFT JOIN customers ON loans.customer_id = customers.id
      LEFT JOIN inventory_items ON loans.inventory_item_id = inventory_items.id
      WHERE loans.id = $1
    `, [loan_id]);

    if (!loanData.rows.length) {
      return res.status(404).json({ message: "Loan not found" });
    }

    const loan = loanData.rows[0];

    const installments = await pool.query(`
      SELECT week_number AS index,
             to_char(due_date, 'DD/MM/YYYY') AS due_date,
             '0' AS commission,
             amount_due AS payment,
             amount_due AS total_payment,
             'Pendiente' AS status,
             '' AS capital_balance
      FROM loan_installments
      WHERE loan_id = $1
      ORDER BY week_number ASC
    `, [loan_id]);

    const templatePath = path.join(__dirname, "templates", "Contrato_Prestamo_Template_With_Tags.docx");
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    doc.render({
      customer_name: `${loan.first_name} ${loan.last_name}`,
      customer_address: loan.address,
      customer_phone: loan.phone,
      store_name: loan.store,
      model_name: loan.model,
      imei: loan.imei,
      loan_amount: loan.amount.toFixed(2),
      loan_total: (loan.amount).toFixed(2),
      down_payment: "0.00",
      term: loan.term,
      weekly_payment: (loan.amount / loan.term).toFixed(2),
      late_interest_rate: "10%",
      contract_date: new Date().toLocaleDateString("es-MX"),
      loan_schedule: installments.rows
    });

    const buffer = doc.getZip().generate({ type: "nodebuffer" });
    const outputPath = path.join(__dirname, "contracts", `loan_contract_${loan_id}.docx`);
    // Ensure contracts folder exists
    if (!fs.existsSync(path.join(__dirname, "contracts"))) {
      fs.mkdirSync(path.join(__dirname, "contracts"));
    }
    fs.writeFileSync(outputPath, buffer);

    res.download(outputPath);
  } catch (err) {
    console.error("Error generating contract:", err);
    res.status(500).json({ message: "Error generating contract" });
  }
});

// Route: Get all investigations (top-level, alongside other standalone routes)
app.get("/investigations", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM loan_investigations ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching investigations:", err);
    res.status(500).json({ message: "Error fetching investigations" });
  }
});

// Route: Get all expenses (for frontend) with optional status filter
app.get("/expenses", authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let result;
    if (status) {
      result = await pool.query("SELECT * FROM expenses WHERE status = $1 ORDER BY created_at DESC", [status]);
    } else {
      result = await pool.query("SELECT * FROM expenses ORDER BY created_at DESC");
    }
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching expenses:", err);
    res.status(500).json({ message: "Error fetching expenses" });
  }
});

// Route: Create new expense
app.post("/expenses", authenticateToken, upload.single("quote"), async (req, res) => {
  try {
    console.log("📝 Expense creation request body:", req.body);
    const { store_id, amount, description, category, expense_date } = req.body;
    const created_by = req.user.id;
    const quote_path = req.file ? req.file.path : null;
    
    // Validate required fields
    if (!store_id || !amount || !category) {
      console.error("❌ Missing required fields:", { store_id, amount, category });
      return res.status(400).json({ message: "Missing required fields: store_id, amount, category" });
    }
    
    const result = await pool.query(`
      INSERT INTO expenses (store_id, amount, description, category, expense_date, status, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6, CURRENT_TIMESTAMP)
      RETURNING *
    `, [store_id, parseFloat(amount), description || '', category, expense_date || null, created_by]);
    
    console.log("✅ Expense created successfully:", result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error creating expense:", err.message);
    console.error("Error details:", err);
    res.status(500).json({ message: "Error creating expense", error: err.message });
  }
});

// Route: Approve expense
app.put("/expenses/:id/approve", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE expenses 
      SET status = 'approved'
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error approving expense:", err);
    res.status(500).json({ message: "Error approving expense" });
  }
});

// Route: Reject expense
app.put("/expenses/:id/reject", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const result = await pool.query(`
      UPDATE expenses 
      SET status = 'rejected', description = CONCAT(description, ' - RECHAZADO: ', $2), updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, reason]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error rejecting expense:", err);
    res.status(500).json({ message: "Error rejecting expense" });
  }
});

// Budget Management Endpoints

// Route: Get all budgets
app.get("/budgets", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM budgets 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching budgets:", err);
    res.status(500).json({ message: "Error fetching budgets" });
  }
});

// Route: Create new budget
app.post("/budgets", authenticateToken, async (req, res) => {
  try {
    const { category, amount, period, start_date, end_date, description, store_id, is_active } = req.body;
    const userId = req.user.id;
    
    const result = await pool.query(`
      INSERT INTO budgets (category, amount, period, start_date, end_date, description, store_id, is_active, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING *
    `, [category, amount, period, start_date, end_date, description, store_id, is_active, userId]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating budget:", err);
    res.status(500).json({ message: "Error creating budget" });
  }
});

// Route: Update budget
app.put("/budgets/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { category, amount, period, start_date, end_date, description, store_id, is_active } = req.body;
    
    const result = await pool.query(`
      UPDATE budgets 
      SET category = $1, amount = $2, period = $3, start_date = $4, end_date = $5, 
          description = $6, store_id = $7, is_active = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [category, amount, period, start_date, end_date, description, store_id, is_active, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Budget not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating budget:", err);
    res.status(500).json({ message: "Error updating budget" });
  }
});

// Route: Delete budget
app.delete("/budgets/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM budgets WHERE id = $1 RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Budget not found" });
    }
    
    res.json({ message: "Budget deleted successfully" });
  } catch (err) {
    console.error("Error deleting budget:", err);
    res.status(500).json({ message: "Error deleting budget" });
  }
});

// Route: Get all loan requests (Formato de Solicitud de Crédito)
app.get("/loan-requests", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        loans.*, 
        customers.first_name, 
        customers.last_name, 
        customers.phone 
      FROM loans 
      LEFT JOIN customers ON loans.customer_id = customers.id 
      WHERE loans.status IN ('pending', 'pending_admin_approval')
      ORDER BY loans.created_at DESC
    `);
    console.log(`📋 Loan requests (pending only): ${result.rows.length} items`);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching loan requests:", err);
    res.status(500).json({ message: "Error fetching loan requests" });
  }
});

// Route: Get all product deliveries (Formato de Entrega de Producto)
app.get("/entregas", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        loans.id AS loan_id,
        loans.created_at AS delivery_date,
        customers.first_name,
        customers.last_name,
        inventory_items.model,
        inventory_items.imei,
        inventory_items.status
      FROM loans
      JOIN customers ON loans.customer_id = customers.id
      JOIN inventory_items ON loans.inventory_item_id = inventory_items.id
      WHERE inventory_items.status = 'delivered'
      ORDER BY loans.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching deliveries:", err);
    res.status(500).json({ message: "Error fetching deliveries" });
  }
});

// Route: Get all guarantees (Formato de Solicitud de Garantía)
app.get("/garantias", authenticateToken, async (req, res) => {
  try {
    // Placeholder for future guarantees table
    res.json([]);
  } catch (err) {
    console.error("Error fetching guarantees:", err);
    res.status(500).json({ message: "Error fetching guarantees" });
  }
});
// New route: Make payment for loan installments (with penalty logic)
app.post("/make-installment-payment", authenticateToken, async (req, res) => {
  const { loan_id, amount, method, store_id, apply_extra_to } = req.body;
  console.log("📥 Incoming payment request:", req.body);
  console.log("🔍 Processing payment for loan_id:", loan_id, "amount:", amount, "method:", method);
  
  // Validate required fields
  if (!loan_id || !amount || !method) {
    console.error("❌ Missing required fields:", { loan_id, amount, method });
    return res.status(400).json({ 
      message: "Missing required fields", 
      required: ["loan_id", "amount", "method"],
      received: { loan_id, amount, method }
    });
  }

  try {
    // Check loan status - prevent payments before approval and delivery
    console.log("🔍 Checking loan status for loan_id:", loan_id);
    const loanCheck = await pool.query(`
      SELECT status, loan_type FROM loans WHERE id = $1
    `, [loan_id]);
    console.log("📊 Loan check result:", loanCheck.rows);
    
    if (!loanCheck.rows.length) {
      console.error("❌ Loan not found:", loan_id);
      return res.status(404).json({ message: "Loan not found" });
    }
    
    const loan = loanCheck.rows[0];
    
    if (loan.status === 'pending_admin_approval') {
      return res.status(400).json({ 
        message: "Cannot make payment: Loan is pending admin approval" 
      });
    }
    
    if (loan.status === 'approved' && loan.loan_type === 'producto') {
      return res.status(400).json({ 
        message: "Cannot make payment: Product must be delivered before payments can be made" 
      });
    }
    
    if (loan.status === 'pending') {
      return res.status(400).json({ 
        message: "Cannot make payment: Loan is pending approval" 
      });
    }

    // Fetch unpaid installments
    console.log("🔍 Fetching installments for loan_id:", loan_id);
    const installments = await pool.query(`
      SELECT * FROM loan_installments
      WHERE loan_id = $1 AND status = 'pending'
      ORDER BY week_number ASC
    `, [loan_id]);
    console.log("📊 Found installments:", installments.rows.length);

    if (!installments.rows.length) {
      return res.status(400).json({ message: "All installments are already paid" });
    }

    let remainingAmount = parseFloat(amount);
    const paidInstallments = [];
    
    // Determine the correct cash account based on payment method
    let cashAccount;
    let cashSource;
    switch (method) {
      case 'transferencia':
      case 'tarjeta':
        cashAccount = '1102'; // Bank account
        cashSource = 'bank';
        break;
      case 'efectivo':
      default:
        cashAccount = '1101'; // Cash account
        cashSource = 'cash';
        break;
    }

    for (const instOrig of installments.rows) {
      // --- Penalty application logic for overdue payments ---
      console.log("🔍 Processing installment:", instOrig.id, "week:", instOrig.week_number);
      let inst = { ...instOrig };
      
      try {
        const now = new Date();
        const dueDate = new Date(inst.due_date || new Date());
        
        console.log("📅 Due date check:", { 
          now: now.toISOString(), 
          dueDate: dueDate.toISOString(),
          instId: inst.id,
          amountDue: inst.amount_due 
        });
        
        // Ensure all required fields exist
        if (!inst.id || !inst.amount_due) {
          console.error("❌ Missing required fields in installment:", inst);
          continue;
        }
        
        // Check if payment is overdue (after 2 PM on due date or any time after)
        const isOverdue = now > dueDate || 
                         (now.toDateString() === dueDate.toDateString() && now.getHours() >= 14);
        
        if (isOverdue) {
          const penaltyCheck = await pool.query(`
            SELECT penalty_applied, last_penalty_applied FROM loan_installments WHERE id = $1
          `, [inst.id]);
          
          const currentPenalty = parseFloat(penaltyCheck.rows[0]?.penalty_applied || 0);
          
                  // Calculate daily penalty based on business rules
        const installmentAmount = parseFloat(inst.amount_due);
        const dailyPenalty = installmentAmount < 500 ? 50 : Math.round(installmentAmount * 0.10 * 100) / 100;
          
          const lastPenaltyDate = new Date(
            penaltyCheck.rows[0]?.last_penalty_applied || dueDate
          );
          const lastDateStr = lastPenaltyDate.toISOString().split('T')[0];
          const nowStr = now.toISOString().split('T')[0];

          // Apply penalty only once per day
          if (nowStr !== lastDateStr) {
            await pool.query(
              `
              UPDATE loan_installments
              SET penalty_applied = penalty_applied + $1, last_penalty_applied = CURRENT_DATE
              WHERE id = $2
              `,
              [dailyPenalty, inst.id]
            );
            inst.penalty_applied = currentPenalty + dailyPenalty;
            console.log(`💰 Applied penalty of $${dailyPenalty} for installment ${inst.week_number} (${nowStr})`);
          } else {
            inst.penalty_applied = currentPenalty;
          }
        }
      } catch (err) {
        console.error("Penalty application error (non-fatal):", err);
      }
      // --- End penalty logic ---

      // Calculate how much has already been paid toward this installment (per installment week)
      const paidSoFar = await pool.query(
        `
        SELECT COALESCE(SUM(amount), 0) AS paid_so_far
        FROM payments
        WHERE loan_id = $1 AND installment_week = $2
      `,
        [loan_id, inst.week_number]
      );
      const alreadyPaid = parseFloat(paidSoFar.rows[0].paid_so_far);
      const totalDue = parseFloat(inst.amount_due) + parseFloat(inst.penalty_applied);
      const remainingDue = totalDue - alreadyPaid;

      if (remainingDue <= 0) {
        // Already fully paid
        continue;
      }

      // Accept partial and cumulative payments per installment
      if (remainingAmount > 0 && remainingDue > 0) {
        const paymentNow = Math.min(remainingAmount, remainingDue);

        const paymentResult = await pool.query(
          `
          INSERT INTO payments (loan_id, amount, method, store_id, installment_week, payment_date) 
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
          RETURNING id
        `,
          [loan_id, paymentNow, method, store_id, inst.week_number]
        );
        
        const currentPaymentId = paymentResult.rows[0].id;

        // Split payment into components: interest, capital, and penalties
        let partialRemaining = paymentNow;
        
        // First, pay penalties if any
        const penaltyPaid = Math.round(Math.min(parseFloat(inst.penalty_applied || 0), partialRemaining) * 100) / 100;
        partialRemaining -= penaltyPaid;
        
        // Then, pay interest
        const interestPaid = Math.round(Math.min(parseFloat(inst.interest_portion), partialRemaining) * 100) / 100;
        partialRemaining -= interestPaid;
        
        // Finally, pay capital
        const capitalPaid = Math.round(Math.min(parseFloat(inst.capital_portion), partialRemaining) * 100) / 100;
        
        // Ensure all values are properly rounded to avoid floating point precision issues
        const roundedPenaltyPaid = Math.round(penaltyPaid * 100) / 100;
        const roundedInterestPaid = Math.round(interestPaid * 100) / 100;
        const roundedCapitalPaid = Math.round(capitalPaid * 100) / 100;

                   // Use base account codes for journal entries (not customer-specific)
           const account_cliente = '1103'; // Clientes (base account)
           const account_interest = '4100'; // Intereses Clientes (base account)
           const account_penalties = '4101'; // Penalidades Clientes (base account)

        // Create comprehensive journal entries for the payment
        const journalEntries = [];

        // 1. Debit cash/bank account (money received)
        journalEntries.push([
          `Pago semana ${inst.week_number} préstamo #${loan_id}`,
          cashAccount,
          paymentNow,
          0,
          'payment',
          loan_id,
          req.user.id
        ]);

        // 2. Credit customer account (reduces debt) - only for principal portion
        if (roundedCapitalPaid > 0) {
          journalEntries.push([
            `Pago capital semana ${inst.week_number} préstamo #${loan_id}`,
            account_cliente,
            0,
            roundedCapitalPaid,
            'payment',
            loan_id,
            req.user.id
          ]);
        }

        // 3. Credit interest income (interest portion)
        if (roundedInterestPaid > 0) {
          journalEntries.push([
            `Interés semana ${inst.week_number} préstamo #${loan_id}`,
            account_interest,
            0,
            roundedInterestPaid,
            'payment',
            loan_id,
            req.user.id
          ]);
        }

        // 4. Credit penalty income (penalty portion)
        if (roundedPenaltyPaid > 0) {
          journalEntries.push([
            `Penalidad semana ${inst.week_number} préstamo #${loan_id}`,
            account_penalties,
            0,
            roundedPenaltyPaid,
            'payment',
            loan_id,
            req.user.id
          ]);
        }

        // Insert all journal entries
        for (const entry of journalEntries) {
          await pool.query(
            `
            INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
            VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, $6, $7)
          `,
            entry
          );
        }

        // Insert accounting entries with proper source tracking
        const userId = req.user?.id || 1; // Default to user ID 1 if not available
        
        console.log(`🔍 Debug - Values being inserted:`, {
          loan_id: loan_id,
          userId: userId,
          paymentNow: paymentNow,
          roundedInterestPaid: roundedInterestPaid,
          roundedCapitalPaid: roundedCapitalPaid,
          roundedPenaltyPaid: roundedPenaltyPaid
        });
        
        if (roundedInterestPaid > 0) {
          await pool.query(
            `INSERT INTO accounting_entries (loan_id, type, amount, description, source_type, source_id, created_by) VALUES ($1, 'interestPaid', $2, $3, 'payment', $4, $5)`,
            [loan_id, parseFloat(roundedInterestPaid.toFixed(2)), `Interest payment for week ${inst.week_number}`, currentPaymentId, userId]
          );
        }

        if (roundedPenaltyPaid > 0) {
          await pool.query(
            `INSERT INTO accounting_entries (loan_id, type, amount, description, source_type, source_id, created_by) VALUES ($1, 'penaltyPaid', $2, $3, 'payment', $4, $5)`,
            [loan_id, parseFloat(roundedPenaltyPaid.toFixed(2)), `Penalty payment for week ${inst.week_number}`, currentPaymentId, userId]
          );
        }

        if (roundedCapitalPaid > 0) {
          await pool.query(
            `INSERT INTO accounting_entries (loan_id, type, amount, description, source_type, source_id, created_by) VALUES ($1, 'capitalPaid', $2, $3, 'payment', $4, $5)`,
            [loan_id, parseFloat(roundedCapitalPaid.toFixed(2)), `Capital payment for week ${inst.week_number}`, currentPaymentId, userId]
          );
        }



        // Update installment with payment breakdown
        await pool.query(
          `
          UPDATE loan_installments 
          SET 
            capital_paid = COALESCE(capital_paid, 0) + $1,
            interest_paid = COALESCE(interest_paid, 0) + $2,
            penalty_paid = COALESCE(penalty_paid, 0) + $3,
            status = CASE 
              WHEN (COALESCE(capital_paid, 0) + $1 + COALESCE(interest_paid, 0) + $2 + COALESCE(penalty_paid, 0) + $3) >= (amount_due + COALESCE(penalty_applied, 0))
              THEN 'paid'
              ELSE status
            END
          WHERE id = $4
          `,
          [parseFloat(roundedCapitalPaid.toFixed(2)), parseFloat(roundedInterestPaid.toFixed(2)), parseFloat(roundedPenaltyPaid.toFixed(2)), inst.id]
        );
        
        console.log(`💰 Updated installment ${inst.week_number}: Capital: $${parseFloat(roundedCapitalPaid.toFixed(2))}, Interest: $${parseFloat(roundedInterestPaid.toFixed(2))}, Penalty: $${parseFloat(roundedPenaltyPaid.toFixed(2))}`);
        
        // Check if installment is now fully paid
        const totalPaidForInstallment = parseFloat(roundedPenaltyPaid.toFixed(2)) + parseFloat(roundedInterestPaid.toFixed(2)) + parseFloat(roundedCapitalPaid.toFixed(2));
        const totalDueForInstallment = parseFloat(inst.amount_due) + parseFloat(inst.penalty_applied || 0);
        
        if (totalPaidForInstallment >= totalDueForInstallment) {
          console.log(`✅ Installment ${inst.week_number} is now fully paid`);
        }

        await pool.query(
          `
          INSERT INTO accounting_entries (loan_id, type, amount, description, source_type, source_id, created_by)
          VALUES ($1, 'cash', $2, $3, 'payment', $4, $5)
        `,
          [loan_id, paymentNow, `Partial cash payment for week ${inst.week_number}`, currentPaymentId, userId]
        );

        remainingAmount -= paymentNow;

        // If fully paid now, mark installment as paid
        if (paymentNow + alreadyPaid >= totalDue) {
          await pool.query(
            `UPDATE loan_installments SET status = 'paid' WHERE id = $1`,
            [inst.id]
          );
          paidInstallments.push(inst.week_number);
        }

        break;
      }
    }

    // Apply any remaining amount to capital if specified (legacy: principalPaid only)
    if (remainingAmount > 0 && apply_extra_to === "capital") {
      await pool.query(
        "INSERT INTO accounting_entries (loan_id, type, amount, description, source_type, source_id, created_by) VALUES ($1, 'principalPaid', $2, $3, 'payment', $4, $5)",
        [loan_id, remainingAmount, 'Extra applied to capital', currentPaymentId, userId]
      );
    }

    // Generate receipt automatically after successful payment
    let receiptData = null;
    let receiptNumber = null;
    let lastPaymentId = null;
    try {
      const lastPaymentResult = await pool.query(`
        SELECT id FROM payments WHERE loan_id = $1 ORDER BY payment_date DESC LIMIT 1
      `, [loan_id]);
      
      if (lastPaymentResult.rows.length > 0) {
        lastPaymentId = lastPaymentResult.rows[0].id;
        receiptNumber = `REC-${lastPaymentId.toString().padStart(6, '0')}`;
        
        // Get customer info for receipt
        const customerResult = await pool.query(`
          SELECT c.first_name, c.last_name, c.phone
          FROM customers c
          JOIN loans l ON c.id = l.customer_id
          WHERE l.id = $1
        `, [loan_id]);
        
        const customer = customerResult.rows[0] || { first_name: "Cliente", last_name: "", phone: "" };
        
        try {
          receiptData = await generateReceiptPDF({
            receipt_number: receiptNumber,
            payment_date: new Date().toLocaleDateString('es-MX'),
            payment_time: new Date().toLocaleTimeString('es-MX'),
            customer_name: `${customer.first_name} ${customer.last_name}`.trim(),
            customer_phone: customer.phone || "",
            loan_id: loan_id,
            payment_amount: amount,
            payment_method: method,
            week_number: paidInstallments[0] || 1,
            installment_amount: 0,
            interest_paid: 0,
            capital_paid: 0,
            penalty_paid: 0,
            store_name: "CrediYa",
            store_address: "Tu dirección aquí",
            store_phone: "+52 123 456 7890"
          });
          
          // Save receipt to database
          if (receiptData && receiptData.path) {
            try {
              await pool.query(`
                INSERT INTO payment_receipts (payment_id, receipt_number, pdf_path, sent_whatsapp)
                VALUES ($1, $2, $3, $4)
              `, [lastPaymentId, receiptNumber, receiptData.path, false]);
              console.log(`✅ Receipt saved to database: ${receiptNumber}`);
            } catch (dbErr) {
              console.error("❌ Error saving receipt to database:", dbErr);
              // Don't fail the payment if receipt saving fails
            }
          }
        } catch (receiptGenErr) {
          console.error("❌ Error generating receipt PDF:", receiptGenErr);
          // Create a minimal receipt data
          receiptData = { 
            path: `/tmp/${receiptNumber}.html`, 
            html: `<html><body><h1>Receipt ${receiptNumber}</h1><p>Payment: $${amount}</p></body></html>` 
          };
        }
      }
    } catch (receiptErr) {
      console.error("❌ Error in receipt generation process:", receiptErr);
      // Don't fail the payment if receipt generation fails
    }

    res.json({ 
      message: "Payment applied", 
      paidInstallments, 
      remaining: remainingAmount,
      receipt_generated: !!receiptData,
      receipt_number: receiptNumber,
      payment_id: lastPaymentId || null,
      pdf_url: receiptNumber ? `/receipts/${receiptNumber}.html` : null
    });
  } catch (err) {
    console.error("❌ Error in /make-installment-payment:", err);
    console.error("❌ Error details:", err.message);
    console.error("❌ Error stack:", err.stack);
    console.error("❌ Error name:", err.name);
    console.error("❌ Error code:", err.code);
    res.status(500).json({ 
      message: "Error processing payment", 
      error: err.message,
      errorName: err.name,
      errorCode: err.code,
      details: "Check server logs for more information"
    });
  }
});

// Generate and send payment receipt
app.post("/payments/:payment_id/receipt", authenticateToken, async (req, res) => {
  const { payment_id } = req.params;
  const { send_whatsapp = false } = req.body;
  
  try {
    // Get payment details with customer and loan info
    const paymentResult = await pool.query(`
      SELECT 
        p.*,
        c.first_name,
        c.last_name,
        c.phone,
        l.amount as loan_amount,
        l.term_weeks,
        li.week_number,
        li.amount_due,
        li.interest_portion,
        li.capital_portion,
        li.penalty_applied
      FROM payments p
      JOIN loans l ON p.loan_id = l.id
      JOIN customers c ON l.customer_id = c.id
      LEFT JOIN loan_installments li ON p.loan_id = li.loan_id AND p.installment_week = li.week_number
      WHERE p.id = $1
    `, [payment_id]);

    if (!paymentResult.rows.length) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const payment = paymentResult.rows[0];
    
    // Generate receipt data
    const receiptData = {
      receipt_number: `REC-${payment_id.toString().padStart(6, '0')}`,
      payment_date: new Date(payment.payment_date).toLocaleDateString('es-MX'),
      payment_time: new Date(payment.payment_date).toLocaleTimeString('es-MX'),
      customer_name: `${payment.first_name} ${payment.last_name}`,
      customer_phone: payment.phone,
      loan_id: payment.loan_id,
      payment_amount: payment.amount,
      payment_method: payment.method,
      week_number: payment.week_number,
      installment_amount: payment.amount_due,
      interest_paid: payment.interest_portion,
      capital_paid: payment.capital_portion,
      penalty_paid: payment.penalty_applied || 0,
      store_name: "CrediYa",
      store_address: "Tu dirección aquí",
      store_phone: "+52 123 456 7890"
    };

    // Generate receipt PDF
    const receiptPdf = await generateReceiptPDF(receiptData);
    
    // Save receipt to database
    await pool.query(`
      INSERT INTO payment_receipts (payment_id, receipt_number, pdf_path, sent_whatsapp)
      VALUES ($1, $2, $3, $4)
    `, [payment_id, receiptData.receipt_number, receiptPdf.path, send_whatsapp]);

    let whatsappResult = null;
    
    // Send via WhatsApp if requested
    if (send_whatsapp && payment.phone) {
      try {
        whatsappResult = await sendReceiptViaWhatsApp(payment.phone, receiptData, receiptPdf.path);
        console.log("📱 WhatsApp result:", whatsappResult);
      } catch (whatsappErr) {
        console.error("❌ WhatsApp sending error:", whatsappErr);
        whatsappResult = { success: false, error: whatsappErr.message };
      }
    }

    res.json({
      message: "Receipt generated successfully",
      receipt_number: receiptData.receipt_number,
      pdf_url: `/receipts/${receiptData.receipt_number}.html`,
      whatsapp_sent: send_whatsapp,
      whatsapp_result: whatsappResult
    });

  } catch (err) {
    console.error("Error generating receipt:", err);
    res.status(500).json({ message: "Error generating receipt", error: err.message });
  }
});

// Resend receipt endpoint
app.post("/payments/:payment_id/resend-receipt", authenticateToken, async (req, res) => {
  const { payment_id } = req.params;
  const { send_whatsapp = false } = req.body;
  
  try {
    // Get payment details with customer and loan info
    const paymentResult = await pool.query(`
      SELECT 
        p.*,
        c.first_name,
        c.last_name,
        c.phone,
        l.amount as loan_amount,
        l.term_weeks,
        li.week_number,
        li.amount_due,
        li.interest_portion,
        li.capital_portion,
        li.penalty_applied
      FROM payments p
      JOIN loans l ON p.loan_id = l.id
      JOIN customers c ON l.customer_id = c.id
      LEFT JOIN loan_installments li ON p.loan_id = li.loan_id AND p.installment_week = li.week_number
      WHERE p.id = $1
    `, [payment_id]);

    if (!paymentResult.rows.length) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const payment = paymentResult.rows[0];
    
    // Generate receipt data
    const receiptData = {
      receipt_number: `REC-${payment_id.toString().padStart(6, '0')}`,
      payment_date: new Date(payment.payment_date).toLocaleDateString('es-MX'),
      payment_time: new Date(payment.payment_date).toLocaleTimeString('es-MX'),
      customer_name: `${payment.first_name} ${payment.last_name}`,
      customer_phone: payment.phone,
      loan_id: payment.loan_id,
      payment_amount: payment.amount,
      payment_method: payment.method,
      week_number: payment.week_number,
      installment_amount: payment.amount_due,
      interest_paid: payment.interest_portion,
      capital_paid: payment.capital_portion,
      penalty_paid: payment.penalty_applied || 0,
      store_name: "CrediYa",
      store_address: "Tu dirección aquí",
      store_phone: "+52 123 456 7890"
    };

    // Generate receipt PDF
    const receiptPdf = await generateReceiptPDF(receiptData);
    
    // Update receipt in database
    await pool.query(`
      UPDATE payment_receipts 
      SET pdf_path = $1, sent_whatsapp = $2, created_at = CURRENT_TIMESTAMP
      WHERE payment_id = $3
    `, [receiptPdf.path, send_whatsapp, payment_id]);

    let whatsappResult = null;
    
    // Send via WhatsApp if requested
    if (send_whatsapp && payment.phone) {
      try {
        whatsappResult = await sendReceiptViaWhatsApp(payment.phone, receiptData, receiptPdf.path);
        console.log("📱 WhatsApp result:", whatsappResult);
      } catch (whatsappErr) {
        console.error("❌ WhatsApp sending error:", whatsappErr);
        whatsappResult = { success: false, error: whatsappErr.message };
      }
    }

    res.json({
      message: "Receipt regenerated successfully",
      receipt_number: receiptData.receipt_number,
      pdf_url: `/receipts/${receiptData.receipt_number}.html`,
      whatsapp_sent: send_whatsapp,
      whatsapp_result: whatsappResult
    });

  } catch (err) {
    console.error("Error regenerating receipt:", err);
    res.status(500).json({ message: "Error regenerating receipt", error: err.message });
  }
});

// Get all receipts for a loan
app.get("/loans/:loan_id/receipts", authenticateToken, async (req, res) => {
  const { loan_id } = req.params;
  
  try {
    const receiptsResult = await pool.query(`
      SELECT 
        pr.receipt_number,
        pr.pdf_path,
        pr.sent_whatsapp,
        pr.created_at,
        p.amount,
        p.payment_date,
        p.method,
        p.installment_week,
        c.first_name,
        c.last_name,
        c.phone
      FROM payment_receipts pr
      JOIN payments p ON pr.payment_id = p.id
      JOIN loans l ON p.loan_id = l.id
      JOIN customers c ON l.customer_id = c.id
      WHERE p.loan_id = $1
      ORDER BY p.payment_date DESC
    `, [loan_id]);

    res.json({
      loan_id: parseInt(loan_id),
      receipts: receiptsResult.rows,
      total_receipts: receiptsResult.rows.length
    });

  } catch (err) {
    console.error("Error fetching receipts:", err);
    res.status(500).json({ message: "Error fetching receipts", error: err.message });
  }
});

// Get all receipts for a customer
app.get("/customers/:customer_id/receipts", authenticateToken, async (req, res) => {
  const { customer_id } = req.params;
  
  try {
    const receiptsResult = await pool.query(`
      SELECT 
        pr.receipt_number,
        pr.pdf_path,
        pr.sent_whatsapp,
        pr.created_at,
        p.amount,
        p.payment_date,
        p.method,
        p.installment_week,
        l.id as loan_id,
        l.amount as loan_amount,
        c.first_name,
        c.last_name,
        c.phone
      FROM payment_receipts pr
      JOIN payments p ON pr.payment_id = p.id
      JOIN loans l ON p.loan_id = l.id
      JOIN customers c ON l.customer_id = c.id
      WHERE c.id = $1
      ORDER BY p.payment_date DESC
    `, [customer_id]);

    res.json({
      customer_id: parseInt(customer_id),
      receipts: receiptsResult.rows,
      total_receipts: receiptsResult.rows.length
    });

  } catch (err) {
    console.error("Error fetching customer receipts:", err);
    res.status(500).json({ message: "Error fetching customer receipts", error: err.message });
  }
});

// Get receipt PDF/HTML
app.get("/receipts/:receipt_number", async (req, res) => {
  const { receipt_number } = req.params;
  
  try {
    const receiptResult = await pool.query(`
      SELECT pdf_path FROM payment_receipts WHERE receipt_number = $1
    `, [receipt_number]);

    if (!receiptResult.rows.length) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    const filePath = receiptResult.rows[0].pdf_path;
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Receipt file not found: ${filePath}`);
      return res.status(404).json({ message: "Receipt file not found" });
    }

    // Determine content type based on file extension
    const fileExtension = path.extname(filePath).toLowerCase();
    let contentType = 'text/html';
    let filename = `${receipt_number}.html`;
    
    if (fileExtension === '.pdf') {
      contentType = 'application/pdf';
      filename = `${receipt_number}.pdf`;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.sendFile(filePath);

  } catch (err) {
    console.error("Error serving receipt:", err);
    res.status(500).json({ message: "Error serving receipt", error: err.message });
  }
});
// Regenerate receipt for a specific payment
app.post("/payments/:payment_id/regenerate-receipt", authenticateToken, async (req, res) => {
  const { payment_id } = req.params;
  
  try {
    // Get payment details with customer and loan info
    const paymentResult = await pool.query(`
      SELECT 
        p.*,
        c.first_name,
        c.last_name,
        c.phone,
        l.amount as loan_amount,
        l.term_weeks,
        li.week_number,
        li.amount_due,
        li.interest_portion,
        li.capital_portion,
        li.penalty_applied,
        li.capital_paid,
        li.interest_paid,
        li.penalty_paid
      FROM payments p
      JOIN loans l ON p.loan_id = l.id
      JOIN customers c ON l.customer_id = c.id
      LEFT JOIN loan_installments li ON p.loan_id = li.loan_id AND p.installment_week = li.week_number
      WHERE p.id = $1
    `, [payment_id]);

    if (!paymentResult.rows.length) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const payment = paymentResult.rows[0];
    const receiptNumber = `REC-${payment_id.toString().padStart(6, '0')}`;
    
    // Create receipt data with actual payment breakdown
    const receiptData = {
      receipt_number: receiptNumber,
      payment_date: new Date(payment.payment_date).toLocaleDateString('es-MX'),
      payment_time: new Date(payment.payment_date).toLocaleTimeString('es-MX'),
      customer_name: `${payment.first_name} ${payment.last_name}`.trim(),
      customer_phone: payment.phone || "",
      loan_id: payment.loan_id,
      payment_amount: parseFloat(payment.amount),
      payment_method: payment.method,
      week_number: payment.installment_week,
      installment_amount: parseFloat(payment.amount_due || 0),
      interest_paid: parseFloat(payment.interest_paid || 0),
      capital_paid: parseFloat(payment.capital_paid || 0),
      penalty_paid: parseFloat(payment.penalty_paid || 0),
      store_name: "CrediYa",
      store_address: "Tu dirección aquí",
      store_phone: "+52 123 456 7890"
    };

    // Generate receipt PDF
    const receiptPdf = await generateReceiptPDF(receiptData);
    
    // Save or update receipt in database
    await pool.query(`
      INSERT INTO payment_receipts (payment_id, receipt_number, pdf_path, sent_whatsapp, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (payment_id) DO UPDATE SET
        receipt_number = EXCLUDED.receipt_number,
        pdf_path = EXCLUDED.pdf_path,
        created_at = CURRENT_TIMESTAMP
    `, [payment_id, receiptNumber, receiptPdf.path, false]);

    res.json({
      message: "Receipt regenerated successfully",
      receipt_number: receiptNumber,
      pdf_url: `/receipts/${receiptNumber}.html`,
      payment_id: payment_id
    });

  } catch (err) {
    console.error("Error regenerating receipt:", err);
    res.status(500).json({ message: "Error regenerating receipt", error: err.message });
  }
});

// Generate receipts for all payments without receipts
app.post("/loans/:loan_id/generate-all-receipts", authenticateToken, async (req, res) => {
  const { loan_id } = req.params;
  
  try {
    // Find all payments without receipts
    const paymentsWithoutReceipts = await pool.query(`
      SELECT 
        p.id,
        p.amount,
        p.payment_date,
        p.method,
        p.installment_week,
        c.first_name,
        c.last_name,
        c.phone,
        l.amount as loan_amount,
        li.amount_due,
        li.interest_portion,
        li.capital_portion,
        li.penalty_applied,
        li.capital_paid,
        li.interest_paid,
        li.penalty_paid
      FROM payments p
      JOIN loans l ON p.loan_id = l.id
      JOIN customers c ON l.customer_id = c.id
      LEFT JOIN loan_installments li ON p.loan_id = li.loan_id AND p.installment_week = li.week_number
      LEFT JOIN payment_receipts pr ON p.id = pr.payment_id
      WHERE p.loan_id = $1 AND pr.payment_id IS NULL
      ORDER BY p.payment_date ASC
    `, [loan_id]);

    const generatedReceipts = [];
    
    for (const payment of paymentsWithoutReceipts.rows) {
      try {
        const receiptNumber = `REC-${payment.id.toString().padStart(6, '0')}`;
        
        const receiptData = {
          receipt_number: receiptNumber,
          payment_date: new Date(payment.payment_date).toLocaleDateString('es-MX'),
          payment_time: new Date(payment.payment_date).toLocaleTimeString('es-MX'),
          customer_name: `${payment.first_name} ${payment.last_name}`.trim(),
          customer_phone: payment.phone || "",
          loan_id: parseInt(loan_id),
          payment_amount: parseFloat(payment.amount),
          payment_method: payment.method,
          week_number: payment.installment_week,
          installment_amount: parseFloat(payment.amount_due || 0),
          interest_paid: parseFloat(payment.interest_paid || 0),
          capital_paid: parseFloat(payment.capital_paid || 0),
          penalty_paid: parseFloat(payment.penalty_paid || 0),
          store_name: "CrediYa",
          store_address: "Tu dirección aquí",
          store_phone: "+52 123 456 7890"
        };

        const receiptPdf = await generateReceiptPDF(receiptData);
        
        await pool.query(`
          INSERT INTO payment_receipts (payment_id, receipt_number, pdf_path, sent_whatsapp, created_at)
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        `, [payment.id, receiptNumber, receiptPdf.path, false]);

        generatedReceipts.push({
          payment_id: payment.id,
          receipt_number: receiptNumber,
          amount: payment.amount,
          payment_date: payment.payment_date
        });

        console.log(`✅ Generated receipt ${receiptNumber} for payment ${payment.id}`);
      } catch (err) {
        console.error(`❌ Error generating receipt for payment ${payment.id}:`, err);
      }
    }

    res.json({
      message: "Receipt generation completed",
      loan_id: parseInt(loan_id),
      total_payments: paymentsWithoutReceipts.rows.length,
      generated_receipts: generatedReceipts.length,
      receipts: generatedReceipts
    });

  } catch (err) {
    console.error("Error generating receipts:", err);
    res.status(500).json({ message: "Error generating receipts", error: err.message });
  }
});

// ✅ Route: Mark a loan's phone as delivered and register double-entry journal movement
app.post("/loans/:id/deliver", authenticateToken, isAdmin, async (req, res) => {
  const loanId = parseInt(req.params.id);
  console.log(`📦 Delivering loan ${loanId}...`);
  
  try {
    const loanRes = await pool.query(`
      SELECT 
        loans.id, 
        loans.inventory_item_id, 
        loans.amount, 
        loans.customer_id, 
        loans.status,
        inventory_items.status as inventory_status, 
        inventory_items.purchase_price,
        inventory_items.sale_price
      FROM loans
      JOIN inventory_items ON loans.inventory_item_id = inventory_items.id
      WHERE loans.id = $1
    `, [loanId]);

    if (!loanRes.rows.length) {
      console.log(`❌ Loan ${loanId} not found`);
      return res.status(404).json({ message: "Loan not found" });
    }

    const loan = loanRes.rows[0];
    console.log(`📊 Loan ${loanId} status: ${loan.status}, inventory status: ${loan.inventory_status}`);

    if (loan.status !== 'approved') {
      console.log(`❌ Loan ${loanId} is not approved (status: ${loan.status})`);
      return res.status(400).json({ message: "Loan must be approved before delivery" });
    }

    if (loan.inventory_status === 'delivered') {
      console.log(`❌ Inventory item for loan ${loanId} already delivered`);
      return res.status(400).json({ message: "Inventory item already delivered" });
    }

    // Update loan status to delivered
    await pool.query(`
      UPDATE loans SET status = 'delivered' WHERE id = $1
    `, [loanId]);

    // Update inventory status to delivered
    await pool.query(`
      UPDATE inventory_items SET status = 'delivered' WHERE id = $1
    `, [loan.inventory_item_id]);

    console.log(`✅ Updated loan ${loanId} and inventory status to 'delivered'`);

    // Create proper double-entry accounting entries
    const padded = loan.customer_id.toString().padStart(4, "0");
    const account_cliente = `1103-${padded}`;
    const account_venta = `4000-${padded}`;
    const account_cogs = `5000-${padded}`;
    const account_inventory = `1104`; // Inventory account

    const cost = loan.purchase_price;
    const salePrice = loan.sale_price;

    console.log(`💰 Delivery accounting - Cost: $${cost}, Sale: $${salePrice}, Profit: $${salePrice - cost}`);

    // Standard double-entry bookkeeping for delivery:
    // 1. Debit Customer Account (Customer owes us the sale price)
    // 2. Credit Sales Revenue (We earned the sale price)
    // 3. Debit COGS (Cost of goods sold)
    // 4. Credit Inventory (Reduce inventory by cost)
    
    await pool.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
      VALUES
        (CURRENT_DATE, $1, $2, $3, 0, 'delivery', $4, $5),
        (CURRENT_DATE, $1, $6, 0, $3, 'delivery', $4, $5),
        (CURRENT_DATE, $7, $8, $9, 0, 'delivery', $4, $5),
        (CURRENT_DATE, $7, $10, 0, $9, 'delivery', $4, $5)
    `, [
      `Venta cliente préstamo #${loanId}`,
      account_cliente,
      salePrice,
      loanId,
      req.user.id,
      account_venta,
      `COGS préstamo #${loanId}`,
      account_cogs,
      cost,
      account_inventory
    ]);

    console.log(`✅ Created accounting entries for loan ${loanId} delivery`);

    res.json({ message: "Phone delivered successfully. Loan status updated and accounting entries created." });
  } catch (err) {
    console.error("❌ Error delivering phone:", err);
    console.error("❌ Error details:", err.message);
    res.status(500).json({ message: "Error delivering phone" });
  }
});



// New route to sync manual capital entries into balance sheet entries
app.post("/sync-manual-capital", authenticateToken, isAdmin, async (req, res) => {
  const { week_id } = req.body;

  try {
    const manualCapital = await pool.query(`
      SELECT * FROM accounting_manual_entries
      WHERE type = 'capital'
    `);

    const entries = [];

    for (const row of manualCapital.rows) {
      const result = await pool.query(`
        INSERT INTO balance_sheet_entries (
          week_id, category, label, amount, informative, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
      `, [
        week_id,
        "CAPITAL CONTABLE",
        "APORTACIONES DE CAPITAL",
        row.amount,
        false,
        row.description || "",
        row.created_by
      ]);

      entries.push(result.rows[0]);
    }

    res.json({ message: "Synced capital to balance sheet", entries });
  } catch (err) {
    console.error("Error syncing capital entries:", err);
    res.status(500).json({ message: "Error syncing capital entries" });
  }
});
// (Removed duplicate or misplaced top-level await pool.query and result lines here)

app.post("/inventory-requests", authenticateToken, upload.single("quote"), async (req, res) => {
  try {
    const { category, product_name, quantity, unit, purchase_price, supplier, priority, notes, store } = req.body;
    const created_by = req.user.id;
    const quote_path = req.file ? req.file.path : null;

    // Calculate amount based on category type
    const isPerUnitPricing = category.includes('water_tanks') || category.includes('garrafones') || 
                             category.includes('cleaning_supplies') || category.includes('delivery_equipment') || 
                             category.includes('plant_equipment') || category.includes('office_supplies');
    const amount = isPerUnitPricing 
      ? parseFloat(purchase_price) * parseInt(quantity) 
      : parseFloat(purchase_price) || 0;

    const result = await pool.query(
      `INSERT INTO inventory_requests (created_by, category, brand, model, amount, quantity, priority, supplier, notes, quote_file, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending') RETURNING *`,
      [created_by, category, product_name, unit, amount, quantity, priority, supplier, notes, quote_path]
    );

    res.json({ message: "Inventory request created", request: result.rows[0] });
  } catch (err) {
    console.error("Error creating inventory request:", err);
    res.status(500).json({ message: "Error creating inventory request" });
  }
});

app.post("/inventory-items/upload", authenticateToken, upload.single("file"), async (req, res) => {
  const filePath = req.file?.path;
  const { inventory_request_id } = req.body;
  const store = req.body.store || "atlixco";

  if (!filePath || !inventory_request_id) {
    return res.status(400).json({ message: "Missing file or request ID" });
  }

  try {
    // Excel can be uploaded even before treasury payment; no accounting entries will be made yet
    // (No check for 'paid_by_treasury' here; inventory is just recorded for tracking)
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    let items = [];
    for (const row of data) {
      const {
        category,
        brand,
        model,
        color,
        ram,
        storage,
        quantity,
        purchase_price,
        sale_price,
      } = row;

      const quantityInt = parseInt(quantity) || 1;

      for (let i = 0; i < quantityInt; i++) {
        const result = await pool.query(
          `INSERT INTO inventory_items 
            (inventory_request_id, category, brand, model, color, ram, storage, purchase_price, sale_price, store, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
          [
            inventory_request_id,
            category || 'N/A',
            brand || 'N/A',
            model || 'N/A',
            color || 'N/A',
            ram || 'N/A',
            storage || 'N/A',
            purchase_price || 0,
            sale_price || 0,
            store,
            'pending_reception'
          ]
        );
        items.push(result.rows[0]);
      }
    }

    // No accounting_entries, payments, or balance_sheet_entries should be created here.

    res.json({ message: "Inventory items created", items });
  } catch (err) {
    console.error("Error uploading inventory items:", err);
    res.status(500).json({ message: "Error uploading inventory items" });
  }
});

// 2. Approve inventory request
app.put("/inventory-requests/:id/approve", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Just update status to approved (no accounting yet - that happens on payment)
    const result = await pool.query(`
      UPDATE inventory_requests 
      SET status = 'approved'
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Inventory request not found" });
    }
    
    console.log(`✅ Inventory request ${id} approved - waiting for payment`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error approving inventory request:", err);
    res.status(500).json({ message: "Error approving inventory request", error: err.message });
  }
});

// 3. Reject inventory request
app.put("/inventory-requests/:id/reject", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const result = await pool.query(`
      UPDATE inventory_requests 
      SET status = 'rejected', notes = COALESCE(notes, '') || ' - RECHAZADO: ' || $2
      WHERE id = $1
      RETURNING *
    `, [id, reason]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Inventory request not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error rejecting inventory request:", err);
    res.status(500).json({ message: "Error rejecting inventory request" });
  }
});

// 4. Mark inventory request as received and register accounting movement
app.put("/inventory-requests/:id/receive", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const requestId = req.params.id;
    console.log("📦 Receiving inventory with ID:", requestId);
    
    // Get the inventory request details
    const requestResult = await client.query(
      `SELECT * FROM inventory_requests WHERE id = $1`,
      [requestId]
    );
    
    if (requestResult.rows.length === 0) {
      throw new Error("Inventory request not found");
    }
    
    const request = requestResult.rows[0];
    
    // Check if payment was made
    if (request.status !== 'paid_by_treasury') {
      throw new Error("Inventory must be paid before it can be received. Current status: " + request.status);
    }
    console.log("📦 Processing request:", request.category, "Amount:", request.amount);
    
    // Handle water-specific inventory reception
    if (request.category && request.category.includes('water_tanks')) {
      // Auto-create water tanks based on quantity
      const quantity = request.quantity || 1;
      const tankTypeId = request.category.includes('20l_standard') ? 1 : 
                        request.category.includes('10l_small') ? 2 : 
                        request.category.includes('20l_premium') ? 3 : 1;
      
      console.log(`📦 Creating ${quantity} water tanks of type ${tankTypeId}`);
      
      for (let i = 0; i < quantity; i++) {
        // Generate automatic tank ID
        const lastTankResult = await pool.query(`
          SELECT tank_id FROM water_tanks 
          WHERE tank_id ~ '^GAR[0-9]+$' 
          ORDER BY CAST(SUBSTRING(tank_id FROM 4) AS INTEGER) DESC 
          LIMIT 1
        `);
        
        let nextNumber = 1;
        if (lastTankResult.rows.length > 0) {
          const lastId = lastTankResult.rows[0].tank_id;
          const lastNumber = parseInt(lastId.substring(3));
          nextNumber = lastNumber + 1;
        }
        
        const newTankId = `GAR${nextNumber.toString().padStart(3, '0')}`;
        
        // Generate QR code data (JSON string with tank info)
        const qrData = JSON.stringify({
          tank_id: newTankId,
          tank_number: newTankId,
          type: request.category,
          purchase_date: new Date().toISOString(),
          company: 'PURIFICADORA CUENCA AZUL'
        });
        
        // Generate QR code as base64 image
        let qrCodeImage = null;
        try {
          qrCodeImage = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 300,
            margin: 2
          });
        } catch (qrErr) {
          console.error('Error generating QR code:', qrErr);
        }
        
        // Create the water tank with QR code
        await pool.query(`
          INSERT INTO water_tanks (tank_id, tank_type_id, purchase_date, purchase_price, condition, status, qr_code, qr_generated_at)
          VALUES ($1, $2, CURRENT_DATE, $3, 'new', 'available', $4, CURRENT_TIMESTAMP)
        `, [newTankId, tankTypeId, request.amount / quantity, qrCodeImage]);
        
        console.log(`✅ Created tank ${newTankId} with QR code`);
      }
      
    } else if (request.category === 'water_purchase') {
      // Handle water purchase reception
      const volume = request.quantity || 0; // quantity represents liters for water
      const pricePerLiter = volume > 0 ? request.amount / volume : 0;
      
      console.log(`💧 Adding ${volume}L of water at $${pricePerLiter}/L`);
      
      // Record water movement (assuming it goes to main tank)
      await pool.query(`
        INSERT INTO water_movements (
          movement_type, volume_liters, storage_tank_id, 
          purchase_price_per_liter, total_cost, 
          notes, created_by
        )
        VALUES ('purchase', $1, 1, $2, $3, $4, $5)
      `, [volume, pricePerLiter, request.amount, `Water received from purchase request #${requestId}`, req.user.id]);
    } else {
      // Handle regular inventory items (non-water)
      await pool.query(
        `UPDATE inventory_items 
         SET status = 'in_stock'
         WHERE inventory_request_id = $1`,
        [requestId]
      );
    }

    // Update inventory request status and mark QR codes as generated
    await client.query(
      `UPDATE inventory_requests 
       SET status = 'received', received_at = CURRENT_TIMESTAMP, qr_codes_generated = TRUE 
       WHERE id = $1`,
      [requestId]
    );

    const totalValue = parseFloat(request.amount || 0);
    
    // Create accounting entries when receiving: Convert Prepayment to Inventory
    const inventoryAccount = '1104'; // Almacén (Inventory Asset)
    const prepaymentAccount = '1106'; // Anticipos a Proveedores (Prepayments)

    if (totalValue > 0 && !request.accounting_posted) {
      // Debit: Inventory (we now have physical inventory in warehouse)
      const debitEntry = await client.query(`
        INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
        VALUES (CURRENT_DATE, $1, $2, $3, 0, 'inventory_reception', $4, $5)
        RETURNING id
      `, [`Recepción de inventario - Solicitud #${requestId}`, inventoryAccount, totalValue, requestId, req.user.id]);
      
      // Credit: Prepayment (we convert the prepayment to actual inventory)
      await client.query(`
        INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
        VALUES (CURRENT_DATE, $1, $2, 0, $3, 'inventory_reception', $4, $5)
      `, [`Recepción de inventario - Solicitud #${requestId}`, prepaymentAccount, totalValue, requestId, req.user.id]);
      
      // Record inventory movement
      await client.query(`
        INSERT INTO inventory_movements (
          movement_type, category, item_description, quantity, total_cost,
          source_type, source_id, to_location, account_code, journal_entry_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        'receive', request.category, request.brand || `Recepción inventario #${requestId}`,
        request.quantity || 1, totalValue, 'inventory_request', requestId, 'warehouse',
        inventoryAccount, debitEntry.rows[0].id, req.user.id
      ]);
      
      // Mark as accounting posted
      await client.query(`UPDATE inventory_requests SET accounting_posted = TRUE WHERE id = $1`, [requestId]);
      
      console.log(`✅ Inventory reception posted: Debit Inventory $${totalValue}, Credit Prepayment $${totalValue}`);
    }
    
    await client.query('COMMIT');
    
    res.json({ message: "Inventory received successfully", request_id: requestId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error receiving inventory:", err);
    res.status(500).json({ message: "Error receiving inventory", error: err.message });
  } finally {
    client.release();
  }
});

// Routes
app.get("/", (req, res) => {
  res.send("CrediYa Backend is running!");
});

// ==============================================================================
// CUSTOMER PORTAL AUTHENTICATION
// ==============================================================================

// Customer login (phone number based)
app.post("/customer/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    // Try multiple phone number formats to find the customer
    const phoneVariations = [
      phone,                                    // As entered
      `+52${phone}`,                           // With country code
      phone.replace(/^\+52/, ''),              // Without country code
      phone.replace(/^\+?52/, ''),             // Without +52 or 52
      phone.replace(/[^0-9]/g, '')             // Only digits
    ];
    
    // Try to find customer with any of the phone variations
    let customer = null;
    for (const phoneVar of phoneVariations) {
      const result = await pool.query(
        "SELECT * FROM customers WHERE phone = $1",
        [phoneVar]
      );
      if (result.rows.length > 0) {
        customer = result.rows[0];
        break;
      }
    }
    
    if (!customer) {
      return res.status(401).json({ message: "Cliente no encontrado" });
    }
    
    // For now, use a simple password check (can enhance with bcrypt later)
    // Default password is last 4 digits of phone if not set
    const expectedPassword = customer.password || customer.phone.slice(-4);
    
    if (password !== expectedPassword) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }
    
    // Generate customer token
    const token = jwt.sign(
      {
        id: customer.id,
        phone: customer.phone,
        type: "customer",
        first_name: customer.first_name,
        last_name: customer.last_name
      },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "30d" }
    );
    
    console.log(`👤 Customer login: ${customer.first_name} ${customer.last_name}`);
    
    res.json({
      token,
      customer: {
        id: customer.id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address
      }
    });
  } catch (err) {
    console.error("Error in customer login:", err);
    res.status(500).json({ message: "Error en inicio de sesión" });
  }
});

// Middleware to authenticate customer tokens
const authenticateCustomer = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    if (decoded.type !== "customer") {
      return res.status(403).json({ message: "Invalid token type" });
    }
    req.customer = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

// Treasury: Mark inventory or expense as paid
app.post("/treasury/mark-paid", authenticateToken, isAdmin, upload.single("file"), async (req, res) => {
  const { id, type, method } = req.body;
  console.log("📥 /treasury/mark-paid incoming payload:", req.body);
  console.log("📎 Uploaded file:", req.file);
  try {
    if (type === "inventory") {
      // Debug: log when updating inventory request
      console.log("🧾 Updating inventory request status in DB for ID:", id);
      await pool.query(
        "UPDATE inventory_requests SET status = 'paid_by_treasury' WHERE id = $1",
        [id]
      );
      // Fetch inventory request details for better description
      const invResult = await pool.query(
        "SELECT amount, category, brand, quantity FROM inventory_requests WHERE id = $1",
        [id]
      );
      
      if (invResult.rows.length === 0) {
        return res.status(404).json({ message: "Inventory request not found" });
      }
      
      const inventoryRequest = invResult.rows[0];
      const inventoryAmount = parseFloat(inventoryRequest.amount || 0);
      
      // Create descriptive text based on category
      let itemDescription = "inventario";
      if (inventoryRequest.category && inventoryRequest.category.includes('water_tanks')) {
        const qty = inventoryRequest.quantity || 1;
        itemDescription = `${qty} garrafón(es)`;
      } else if (inventoryRequest.category === 'water_purchase') {
        itemDescription = "agua";
      } else if (inventoryRequest.brand) {
        itemDescription = inventoryRequest.brand;
      }

      if (inventoryAmount > 0) {
        const cashAccount = method === 'transferencia' ? '1102' : '1101';
        const prepaymentAccount = '1106'; // Anticipos a Proveedores
        
        await pool.query(`
          INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)                                                      
          VALUES
            (CURRENT_DATE, $1, $2, $3, 0, 'inventory_payment', $4, $5),
            (CURRENT_DATE, $1, $6, 0, $3, 'inventory_payment', $4, $5)
        `, [
          `Pago a proveedor - ${itemDescription} (Solicitud #${id})`,
          prepaymentAccount,
          inventoryAmount,
          id,
          req.user.id,
          cashAccount
        ]);
        
        console.log(`✅ Payment posted: Debit Anticipos $${inventoryAmount}, Credit ${method === 'transferencia' ? 'Banco' : 'Caja'} $${inventoryAmount}`);
      }
      // Debug: confirm update
      console.log("✅ Inventory request updated successfully");
      res.json({ message: "Inventory request marked as paid" });
    } else if (type === "expense") {
      await pool.query(
        "UPDATE expenses SET status = 'paid', updated_at = NOW(), method = $1 WHERE id = $2",
        [method, id]
      );
      // --- Double-entry journal for expense payment ---
      const expenseResult = await pool.query("SELECT * FROM expenses WHERE id = $1", [id]);
      const expense = expenseResult.rows[0];
      const expenseType = expense?.type?.toLowerCase();
      const expenseAmount = parseFloat(expense.amount || 0);
      const cashAccount = method === 'transferencia' ? '1102' : '1101';

      const expenseAccountMap = {
        sueldos: "6000",
        marketing: "6100",
        flyers: "6110",
        renta: "6200",
        agua: "6210",
        luz: "6220",
        internet: "6230",
        software: "6240",
        limpieza: "6250",
        seguridad: "6260",
        "buró de crédito": "6270",
        papelería: "6300",
        otros: "6999"
      };

      const accountCode = expenseAccountMap[expenseType] || "6999"; // fallback to Otros Gastos

      await pool.query(`
        INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
        VALUES 
          (CURRENT_DATE, $1, $2, $3, 0, 'general_expense_payment', $4, $5),
          (CURRENT_DATE, $1, $6, 0, $3, 'general_expense_payment', $4, $5)
      `, [
        `Pago de gasto general #${id} (${expense.type})`,
        accountCode,
        expenseAmount,
        id,
        req.user.id,
        cashAccount
      ]);
      res.json({ message: "Expense marked as paid" });
    } else {
      res.status(400).json({ message: "Invalid type" });
    }
  } catch (err) {
    console.error("Error marking as paid:", err);
    res.status(500).json({ message: "Error marking as paid" });
  }
});

// Treasury: Get only approved expenses and inventory requests for payment orders (for Tesorería)
app.get("/treasury/payment-orders", authenticateToken, isAdmin, async (req, res) => {
  const status = req.query.status || 'approved';
  try {
    console.log("💰 Fetching payment orders with status:", status);
    
    // Expenses with specified status (default: 'approved')
    const result = await pool.query(`
      SELECT * FROM expenses
      WHERE status = $1
      ORDER BY created_at ASC
    `, [status]);
    
    console.log(`💰 Found ${result.rows.length} expenses with status '${status}':`, result.rows);

    // Inventory requests with status 'approved' 
    const inventoryPayments = await pool.query(`
      SELECT 'inventory' AS type, id, category, amount, notes, quote_file, created_at
      FROM inventory_requests
      WHERE status = 'approved'
      ORDER BY created_at ASC
    `);
    
    console.log(`💰 Found ${inventoryPayments.rows.length} inventory items`);

    res.json({ inventory: inventoryPayments.rows, expenses: result.rows });
  } catch (err) {
    console.error("Error fetching payment orders:", err);
    res.status(500).json({ message: "Error fetching payment orders" });
  }
});

// Treasury: Get history of expenses marked as paid
app.get("/treasury/payment-orders/history", authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, category as type, amount, description, status, created_at 
      FROM expenses 
      WHERE status = 'paid'
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching paid expenses:", err);
    res.status(500).json({ message: "Error fetching paid expenses" });
  }
});

// Treasury: Mark expense as paid
app.put("/treasury/expenses/:id/mark-paid", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { method } = req.body;
    
    const result = await pool.query(`
      UPDATE expenses 
      SET status = 'paid', method = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'approved'
      RETURNING *
    `, [id, method]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found or not approved" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error marking expense as paid:", err);
    res.status(500).json({ message: "Error marking expense as paid" });
  }
});
// Treasury: Get cash flow data for charts
app.get("/treasury/cash-flow", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter;
    switch (period) {
      case 'week':
        dateFilter = "AND date >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND date >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case 'quarter':
        dateFilter = "AND date >= CURRENT_DATE - INTERVAL '90 days'";
        break;
      case 'year':
        dateFilter = "AND date >= CURRENT_DATE - INTERVAL '365 days'";
        break;
      default:
        dateFilter = "AND date >= CURRENT_DATE - INTERVAL '30 days'";
    }

    // Get cash flow data from journal entries (Cash accounts only)
    const cashFlowResult = await pool.query(`
      SELECT 
        DATE(date) as date,
        SUM(debit) as cash_in,
        SUM(credit) as cash_out,
        SUM(debit - credit) as net_flow
      FROM journal_entries
      WHERE account_code IN ('1101', '1102')
      ${dateFilter}
      GROUP BY DATE(date)
      ORDER BY date
    `);

    // Format data for charts
    const dates = cashFlowResult.rows.map(row => new Date(row.date).toLocaleDateString());
    const cashIn = cashFlowResult.rows.map(row => parseFloat(row.cash_in || 0));
    const cashOut = cashFlowResult.rows.map(row => parseFloat(row.cash_out || 0));
    const netFlow = cashFlowResult.rows.map(row => parseFloat(row.net_flow || 0));

    res.json({
      dates: dates,
      amounts: netFlow, // For backward compatibility
      cash_in: cashIn,
      cash_out: cashOut,
      net_flow: netFlow,
      period: period
    });
  } catch (err) {
    console.error("Error fetching cash flow data:", err);
    res.status(500).json({ message: "Error fetching cash flow data" });
  }
});

// Treasury: Get bank reconciliation data
app.get("/treasury/reconciliation", authenticateToken, isAdmin, async (req, res) => {
  try {
    // Get system transactions that need reconciliation
    const systemTransactions = await pool.query(`
      SELECT 
        'payment' as source_type,
        id,
        amount,
        created_at as date,
        'Pago registrado' as description,
        'credit' as type,
        false as reconciled
      FROM payments 
      WHERE created_at IS NOT NULL
      UNION ALL
      SELECT 
        'expense' as source_type,
        id,
        amount,
        COALESCE(updated_at, created_at) as date,
        CONCAT('Gasto: ', COALESCE(description, 'Sin descripción')) as description,
        'debit' as type,
        false as reconciled
      FROM expenses 
      WHERE status = 'paid' AND COALESCE(updated_at, created_at) IS NOT NULL
      UNION ALL
      SELECT 
        'inventory' as source_type,
        id,
        amount,
        COALESCE(updated_at, created_at) as date,
        CONCAT('Inventario: ', COALESCE(category, 'Sin categoría')) as description,
        'debit' as type,
        false as reconciled
      FROM inventory_requests 
      WHERE status = 'paid_by_treasury' AND created_at IS NOT NULL
      ORDER BY date DESC
    `);

    res.json({
      systemTransactions: systemTransactions.rows,
      bankStatements: [], // This would be populated from uploaded bank statements
      reconciliationSummary: {
        totalSystemAmount: systemTransactions.rows.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
        totalBankAmount: 0,
        totalDifference: 0,
        reconciledCount: 0,
        pendingCount: systemTransactions.rows.length
      }
    });
  } catch (err) {
    console.error("Error fetching reconciliation data:", err);
    res.status(500).json({ message: "Error fetching reconciliation data" });
  }
});

// Treasury: Upload bank statement
app.post("/treasury/upload-statement", authenticateToken, isAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Here you would parse the bank statement file (CSV, Excel, etc.)
    // For now, we'll return a mock response
    const mockBankStatements = [
      {
        id: 1,
        date: new Date().toISOString().split('T')[0],
        description: 'Depósito Cliente',
        amount: 5000,
        type: 'credit',
        reconciled: false
      },
      {
        id: 2,
        date: new Date().toISOString().split('T')[0],
        description: 'Pago Proveedor',
        amount: 2000,
        type: 'debit',
        reconciled: false
      }
    ];

    res.json({
      message: "Bank statement uploaded successfully",
      statements: mockBankStatements
    });
  } catch (err) {
    console.error("Error uploading bank statement:", err);
    res.status(500).json({ message: "Error uploading bank statement" });
  }
});

// Treasury: Reconcile transaction
app.post("/treasury/reconcile", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { bankStatementId, systemTransactionId, matchType } = req.body;
    
    // Here you would update the reconciliation status
    // For now, we'll return a success response
    res.json({
      message: "Transaction reconciled successfully",
      reconciled: true
    });
  } catch (err) {
    console.error("Error reconciling transaction:", err);
    res.status(500).json({ message: "Error reconciling transaction" });
  }
});

// (Moved /inventory-items/upload route to after auth helper declarations)


app.use(express.json());

// Request logging middleware: log token for every request, early in the chain
app.use((req, res, next) => {
  console.log("🔐 Token received:", req.headers.authorization);
  next();
});

app.use(bodyParser.json());

app.use("/uploads", express.static("uploads"));

// Route: Get account balances grouped by account code and name for a date range
app.get("/account-balances", authenticateToken, isAdmin, async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ message: "Missing date range" });
  }

  try {
    const result = await pool.query(`
      SELECT 
        c.code,
        c.name,
        c.type,
        c.group_name,
        COALESCE(SUM(j.debit), 0) AS debit,
        COALESCE(SUM(j.credit), 0) AS credit,
        COALESCE(SUM(j.debit) - SUM(j.credit), 0) AS balance
      FROM chart_of_accounts c
      LEFT JOIN journal_entries j ON j.account_code = c.code AND j.date BETWEEN $1 AND $2                                                                                       
      GROUP BY c.code, c.name, c.type, c.group_name
      ORDER BY c.code
    `, [from, to]);

    console.log(`📊 Retrieved balances for ${result.rows.length} accounts`);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching account balances:", err);
    res.status(500).json({ message: "Error fetching account balances" });
  }
});


// Properly wrapped route for recording a balance entry
app.post("/balance-entry", authenticateToken, isAdmin, async (req, res) => {
  const { week_id, category, label, amount, informative, notes } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO balance_sheet_entries (
        week_id, category, label, amount, informative, notes, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [week_id, category, label, amount, informative || false, notes || null, req.user.id]
    );

    res.json({ message: "Balance entry recorded", entry: result.rows[0] });
  } catch (err) {
    console.error("Error recording balance entry:", err);
    res.status(500).json({ message: "Error recording balance entry" });
  }
});

app.post("/inventory-items/:inventory_item_id/repossess", authenticateToken, isAdmin, async (req, res) => {
  const { inventory_item_id } = req.params;
  const { estimated_value, notes } = req.body;

  try {
    // Get the inventory item directly by its ID
    const original = await pool.query(`
      SELECT * FROM inventory_items 
      WHERE id = $1
    `, [inventory_item_id]);

    if (!original.rows.length) {
      return res.status(404).json({ message: "No inventory item found with this ID" });
    }

    const item = original.rows[0];

    // Create a new inventory item (cloned from original, marked as repossessed)
    const result = await pool.query(`
      INSERT INTO inventory_items (
        inventory_request_id, category, brand, model, color,
        ram, storage, purchase_price, sale_price, status, store
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'repossessed',$10)
      RETURNING *`,
      [
        item.inventory_request_id,
        item.category,
        item.brand,
        item.model,
        item.color,
        item.ram,
        item.storage,
        estimated_value,
        estimated_value,
        item.store,
      ]
    );

    // Optional: log repossession event
    // Find the loan associated with this inventory item
    const loanData = await pool.query(
      "SELECT id, amount FROM loans WHERE inventory_item_id = $1",
      [inventory_item_id]
    );
    const loan = loanData.rows[0];
    const loan_id = loan?.id;
    const remaining = parseFloat(loan?.amount || 0);

    await pool.query(`
      INSERT INTO inventory_repossessions (item_id, original_loan_id, estimated_value, notes, created_by)
      VALUES ($1, $2, $3, $4, $5)
    `, [result.rows[0].id, loan_id, estimated_value, notes, req.user.id]);

    // Decrease original loan's outstanding balance and mark as defaulted
    if (loan_id) {
      await pool.query(
        "UPDATE loans SET status = 'defaulted', amount = amount - $1 WHERE inventory_item_id = $2",
        [estimated_value, inventory_item_id]
      );
    }
    
    // Register a payment for the repossession
    const storeMap = {
      atlixco: 1,
      cholula: 2,
      chipilo: 3
    };
    const storeId = storeMap[item.store] || null;

    if (loan_id) {
      await pool.query(
        "INSERT INTO payments (loan_id, amount, method, store_id) VALUES ($1, $2, $3, $4)",
        [loan_id, estimated_value, 'repossession', storeId]
      );
    }

    // Log the accounting entry for balance sheet / income tracking
    if (loan_id) {
      await pool.query(
        "INSERT INTO accounting_entries (loan_id, type, amount, description) VALUES ($1, $2, $3, $4)",
        [loan_id, 'repossessedAsset', estimated_value, 'Inventory repossession applied to loan']
      );
    }

    // --- Double-entry journal logging for repossession ---
    if (loan_id) {
      await pool.query(`
        INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
        VALUES 
          (CURRENT_DATE, $1, '1104', $2, 0, 'repossessed', $3, $4),
          (CURRENT_DATE, $1, '1103', 0, $2, 'repossessed', $3, $4)
      `, [
        `Reposición de inventario para préstamo #${loan_id}`,
        estimated_value,
        loan_id,
        req.user.id
      ]);
    }

    // --- Accounting logic for repossession adjustment (gain/loss recognition) ---
    const diff = estimated_value - remaining;

    if (loan_id && diff < 0) {
      await pool.query(`
        INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
        VALUES (CURRENT_DATE, $1, '6999', $2, 0, 'repossession_adjustment', $3, $4),
               (CURRENT_DATE, $1, '9999', 0, $2, 'repossession_adjustment', $3, $4)
      `, [
        `Loss on repossession for loan #${loan_id}`,
        Math.abs(diff),
        loan_id,
        req.user.id
      ]);
    } else if (loan_id && diff > 0) {
      await pool.query(`
        INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
        VALUES (CURRENT_DATE, $1, '1104', $2, 0, 'repossession_surplus', $3, $4),
               (CURRENT_DATE, $1, '4001', 0, $2, 'repossession_surplus', $3, $4)
      `, [
        `Surplus on repossession for loan #${loan_id}`,
        diff,
        loan_id,
        req.user.id
      ]);
    }

    res.json({ message: "Item repossessed and returned to inventory", item: result.rows[0] });
  } catch (err) {
    console.error("Error processing repossession:", err);
    res.status(500).json({ message: "Error processing repossession" });
  }
});

// ========================================
// LOAN RESOLUTION SYSTEM
// ========================================

// Get loan resolution options and current status
app.get("/loans/:loan_id/resolution-options", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { loan_id } = req.params;
    
    // Get loan details with current balance
    const loanQuery = await pool.query(`
      SELECT 
        l.*,
        c.name as customer_name,
        c.phone as customer_phone,
        ii.brand, ii.model, ii.imei, ii.condition, ii.estimated_value,
        COALESCE(l.amount - COALESCE(SUM(p.amount), 0), l.amount) as remaining_balance,
        COALESCE(SUM(p.amount), 0) as total_paid,
        COUNT(li.id) as total_installments,
        COUNT(CASE WHEN li.status = 'paid' THEN 1 END) as paid_installments,
        COUNT(CASE WHEN li.status = 'pending' AND li.due_date < CURRENT_DATE THEN 1 END) as overdue_installments
      FROM loans l
      LEFT JOIN customers c ON l.customer_id = c.id
      LEFT JOIN inventory_items ii ON l.inventory_item_id = ii.id
      LEFT JOIN payments p ON l.id = p.loan_id
      LEFT JOIN loan_installments li ON l.id = li.loan_id
      WHERE l.id = $1
      GROUP BY l.id, c.name, c.phone, ii.brand, ii.model, ii.imei, ii.condition, ii.estimated_value
    `, [loan_id]);

    if (loanQuery.rows.length === 0) {
      return res.status(404).json({ message: "Loan not found" });
    }

    const loan = loanQuery.rows[0];
    
    // Get payment history
    const paymentsQuery = await pool.query(`
      SELECT payment_date, amount, method, notes
      FROM payments 
      WHERE loan_id = $1 
      ORDER BY payment_date DESC
    `, [loan_id]);

    // Calculate resolution options
    const remainingBalance = parseFloat(loan.remaining_balance || 0);
    const totalPaid = parseFloat(loan.total_paid || 0);
    const phoneValue = parseFloat(loan.estimated_value || 0);
    
    const resolutionOptions = {
      settlement: {
        available: remainingBalance > 0,
        recommended_amount: Math.max(remainingBalance * 0.7, phoneValue * 0.5),
        minimum_amount: Math.max(remainingBalance * 0.5, phoneValue * 0.3),
        maximum_amount: remainingBalance
      },
      repossession: {
        available: loan.inventory_item_id && remainingBalance > 0,
        estimated_recovery: phoneValue,
        net_loss: Math.max(0, remainingBalance - phoneValue)
      },
      writeOff: {
        available: remainingBalance > 0,
        amount: remainingBalance,
        recommended: loan.overdue_installments > 8 || totalPaid < (loan.amount * 0.2)
      }
    };

    res.json({
      loan,
      payments: paymentsQuery.rows,
      resolutionOptions,
      summary: {
        total_amount: loan.amount,
        total_paid: totalPaid,
        remaining_balance: remainingBalance,
        payment_progress: (totalPaid / loan.amount) * 100,
        days_overdue: loan.overdue_installments > 0 ? 
          Math.floor((new Date() - new Date(loan.created_at)) / (1000 * 60 * 60 * 24)) : 0
      }
    });

  } catch (err) {
    console.error("Error getting loan resolution options:", err);
    res.status(500).json({ message: "Error getting loan resolution options" });
  }
});

// Process loan settlement
app.post("/loans/:loan_id/settle", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { loan_id } = req.params;
    const { settlement_amount, payment_method = 'efectivo', notes, reason } = req.body;

    if (!settlement_amount || settlement_amount <= 0) {
      return res.status(400).json({ message: "Settlement amount is required and must be positive" });
    }

    // Get loan details
    const loanQuery = await pool.query(`
      SELECT l.*, 
        COALESCE(l.amount - COALESCE(SUM(p.amount), 0), l.amount) as remaining_balance
      FROM loans l
      LEFT JOIN payments p ON l.id = p.loan_id
      WHERE l.id = $1
      GROUP BY l.id
    `, [loan_id]);

    if (loanQuery.rows.length === 0) {
      return res.status(404).json({ message: "Loan not found" });
    }

    const loan = loanQuery.rows[0];
    const remainingBalance = parseFloat(loan.remaining_balance);
    const settlementAmount = parseFloat(settlement_amount);

    if (settlementAmount > remainingBalance) {
      return res.status(400).json({ message: "Settlement amount cannot exceed remaining balance" });
    }

    // Calculate write-off amount
    const writeOffAmount = remainingBalance - settlementAmount;

    // Record settlement payment
    await pool.query(`
      INSERT INTO payments (loan_id, amount, payment_date, method, notes, payment_type)
      VALUES ($1, $2, CURRENT_DATE, $3, $4, 'settlement')
    `, [loan_id, settlementAmount, payment_method, notes || `Settlement payment - ${reason || 'Partial settlement'}`]);

    // Update loan status
    await pool.query(`
      UPDATE loans SET status = 'settled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [loan_id]);

    // Mark all pending installments as settled
    await pool.query(`
      UPDATE loan_installments 
      SET status = 'settled', updated_at = CURRENT_TIMESTAMP
      WHERE loan_id = $1 AND status = 'pending'
    `, [loan_id]);

    // Create journal entries for settlement
    const journalEntries = [
      // 1. Debit cash account (settlement received)
      {
        description: `Settlement payment for loan #${loan_id}`,
        account_code: '1101', // Fondo Fijo de Caja
        debit: settlementAmount,
        credit: 0
      },
      // 2. Credit customer account (reduce debt by settlement amount)
      {
        description: `Settlement payment for loan #${loan_id}`,
        account_code: '1103', // Clientes Teléfonos
        debit: 0,
        credit: settlementAmount
      }
    ];

    // If there's a write-off amount, handle it
    if (writeOffAmount > 0) {
      journalEntries.push(
        // 3. Debit bad debt expense (write-off amount)
        {
          description: `Write-off from settlement loan #${loan_id}`,
          account_code: '6500', // Gastos por Cuentas Incobrables
          debit: writeOffAmount,
          credit: 0
        },
        // 4. Credit customer account (write-off remaining debt)
        {
          description: `Write-off from settlement loan #${loan_id}`,
          account_code: '1103', // Clientes Teléfonos
          debit: 0,
          credit: writeOffAmount
        }
      );
    }

    // Insert journal entries
    for (const entry of journalEntries) {
      await pool.query(`
        INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
        VALUES (CURRENT_DATE, $1, $2, $3, $4, 'settlement', $5, $6)
      `, [entry.description, entry.account_code, entry.debit, entry.credit, loan_id, req.user.id]);
    }

    // Log the resolution action
    await pool.query(`
      INSERT INTO loan_resolutions (loan_id, resolution_type, amount, write_off_amount, notes, created_by, status)
      VALUES ($1, 'settlement', $2, $3, $4, $5, 'completed')
    `, [loan_id, settlementAmount, writeOffAmount, notes, req.user.id]);

    res.json({ 
      message: "Loan settled successfully",
      settlement_amount: settlementAmount,
      write_off_amount: writeOffAmount,
      remaining_balance: 0
    });

  } catch (err) {
    console.error("Error processing loan settlement:", err);
    res.status(500).json({ message: "Error processing loan settlement" });
  }
});

// Process loan write-off
app.post("/loans/:loan_id/write-off", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { loan_id } = req.params;
    const { reason, notes, recovery_attempts } = req.body;

    if (!reason) {
      return res.status(400).json({ message: "Write-off reason is required" });
    }

    // Get loan details
    const loanQuery = await pool.query(`
      SELECT l.*, 
        COALESCE(l.amount - COALESCE(SUM(p.amount), 0), l.amount) as remaining_balance
      FROM loans l
      LEFT JOIN payments p ON l.id = p.loan_id
      WHERE l.id = $1
      GROUP BY l.id
    `, [loan_id]);

    if (loanQuery.rows.length === 0) {
      return res.status(404).json({ message: "Loan not found" });
    }

    const loan = loanQuery.rows[0];
    const writeOffAmount = parseFloat(loan.remaining_balance);

    if (writeOffAmount <= 0) {
      return res.status(400).json({ message: "No outstanding balance to write off" });
    }

    // Update loan status
    await pool.query(`
      UPDATE loans SET status = 'written_off', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [loan_id]);

    // Mark all pending installments as written off
    await pool.query(`
      UPDATE loan_installments 
      SET status = 'written_off', updated_at = CURRENT_TIMESTAMP
      WHERE loan_id = $1 AND status = 'pending'
    `, [loan_id]);

    // Create journal entries for write-off
    const journalEntries = [
      // 1. Debit bad debt expense
      {
        description: `Write-off loan #${loan_id} - ${reason}`,
        account_code: '6500', // Gastos por Cuentas Incobrables
        debit: writeOffAmount,
        credit: 0
      },
      // 2. Credit customer account (remove from assets)
      {
        description: `Write-off loan #${loan_id} - ${reason}`,
        account_code: '1103', // Clientes Teléfonos
        debit: 0,
        credit: writeOffAmount
      }
    ];

    // Insert journal entries
    for (const entry of journalEntries) {
      await pool.query(`
        INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
        VALUES (CURRENT_DATE, $1, $2, $3, $4, 'write_off', $5, $6)
      `, [entry.description, entry.account_code, entry.debit, entry.credit, loan_id, req.user.id]);
    }

    // Log the resolution action
    await pool.query(`
      INSERT INTO loan_resolutions (loan_id, resolution_type, amount, write_off_amount, notes, recovery_attempts, created_by, status)
      VALUES ($1, 'write_off', 0, $2, $3, $4, $5, 'completed')
    `, [loan_id, writeOffAmount, `${reason}. ${notes || ''}`.trim(), recovery_attempts || 0, req.user.id]);

    res.json({ 
      message: "Loan written off successfully",
      write_off_amount: writeOffAmount
    });

  } catch (err) {
    console.error("Error processing loan write-off:", err);
    res.status(500).json({ message: "Error processing loan write-off" });
  }
});
// Enhanced repossession with full accounting
app.post("/loans/:loan_id/repossess", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { loan_id } = req.params;
    const { recovery_costs = 0, new_condition, notes, estimated_resale_value } = req.body;

    // Get loan and inventory details
    const loanQuery = await pool.query(`
      SELECT l.*, ii.*,
        COALESCE(l.amount - COALESCE(SUM(p.amount), 0), l.amount) as remaining_balance
      FROM loans l
      LEFT JOIN inventory_items ii ON l.inventory_item_id = ii.id
      LEFT JOIN payments p ON l.id = p.loan_id
      WHERE l.id = $1
      GROUP BY l.id, ii.id
    `, [loan_id]);

    if (loanQuery.rows.length === 0) {
      return res.status(404).json({ message: "Loan not found" });
    }

    const loan = loanQuery.rows[0];
    
    if (!loan.inventory_item_id) {
      return res.status(400).json({ message: "No inventory item associated with this loan" });
    }

    const remainingBalance = parseFloat(loan.remaining_balance);
    const recoveryCosts = parseFloat(recovery_costs);
    const resaleValue = parseFloat(estimated_resale_value || loan.estimated_value);

    // Update inventory item status and condition
    await pool.query(`
      UPDATE inventory_items 
      SET status = 'repossessed', 
          condition = $1,
          estimated_value = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [new_condition || loan.condition, resaleValue, loan.inventory_item_id]);

    // Update loan status
    await pool.query(`
      UPDATE loans SET status = 'repossessed', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [loan_id]);

    // Mark all pending installments as repossessed
    await pool.query(`
      UPDATE loan_installments 
      SET status = 'repossessed', updated_at = CURRENT_TIMESTAMP
      WHERE loan_id = $1 AND status = 'pending'
    `, [loan_id]);

    // Calculate net recovery
    const netRecovery = resaleValue - recoveryCosts;
    const netLoss = Math.max(0, remainingBalance - netRecovery);

    // Create comprehensive journal entries
    const journalEntries = [
      // 1. Debit inventory (asset recovered)
      {
        description: `Inventory recovered from repossession - Loan #${loan_id}`,
        account_code: '1104', // Almacén Teléfonos
        debit: resaleValue,
        credit: 0
      },
      // 2. Credit customer account (for recovered value)
      {
        description: `Asset recovery from repossession - Loan #${loan_id}`,
        account_code: '1103', // Clientes Teléfonos
        debit: 0,
        credit: Math.min(resaleValue, remainingBalance)
      }
    ];

    // If there are recovery costs
    if (recoveryCosts > 0) {
      journalEntries.push({
        description: `Recovery costs for repossession - Loan #${loan_id}`,
        account_code: '6502', // Gastos de Recuperación
        debit: recoveryCosts,
        credit: 0
      });
      
      journalEntries.push({
        description: `Payment of recovery costs - Loan #${loan_id}`,
        account_code: '1101', // Fondo Fijo de Caja
        debit: 0,
        credit: recoveryCosts
      });
    }

    // If there's a net loss after recovery
    if (netLoss > 0) {
      journalEntries.push(
        {
          description: `Loss on repossession - Loan #${loan_id}`,
          account_code: '6501', // Pérdida por Liquidación
          debit: netLoss,
          credit: 0
        },
        {
          description: `Write-off remaining debt - Loan #${loan_id}`,
          account_code: '1103', // Clientes Teléfonos
          debit: 0,
          credit: netLoss
        }
      );
    }

    // Insert journal entries
    for (const entry of journalEntries) {
      await pool.query(`
        INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
        VALUES (CURRENT_DATE, $1, $2, $3, $4, 'repossession', $5, $6)
      `, [entry.description, entry.account_code, entry.debit, entry.credit, loan_id, req.user.id]);
    }

    // Log the resolution action
    await pool.query(`
      INSERT INTO loan_resolutions (loan_id, resolution_type, amount, write_off_amount, recovery_costs, notes, created_by, status)
      VALUES ($1, 'repossession', $2, $3, $4, $5, $6, 'completed')
    `, [loan_id, netRecovery, netLoss, recoveryCosts, notes, req.user.id]);

    res.json({
      message: "Item repossessed successfully",
      recovery_value: resaleValue,
      recovery_costs: recoveryCosts,
      net_recovery: netRecovery,
      net_loss: netLoss,
      remaining_balance: 0
    });

  } catch (err) {
    console.error("Error processing repossession:", err);
    res.status(500).json({ message: "Error processing repossession" });
  }
});

// Get loan resolution history
app.get("/loans/resolutions", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { start_date, end_date, resolution_type, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        lr.*,
        l.amount as original_amount,
        c.name as customer_name,
        c.phone as customer_phone,
        u.name as resolved_by
      FROM loan_resolutions lr
      JOIN loans l ON lr.loan_id = l.id
      LEFT JOIN customers c ON l.customer_id = c.id
      LEFT JOIN users u ON lr.created_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (start_date) {
      query += ` AND lr.created_at >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND lr.created_at <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    if (resolution_type && resolution_type !== 'all') {
      query += ` AND lr.resolution_type = $${paramCount}`;
      params.push(resolution_type);
      paramCount++;
    }

    query += ` ORDER BY lr.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get summary statistics
    const summaryQuery = await pool.query(`
      SELECT 
        resolution_type,
        COUNT(*) as count,
        SUM(amount) as total_recovered,
        SUM(write_off_amount) as total_written_off,
        SUM(recovery_costs) as total_costs
      FROM loan_resolutions
      GROUP BY resolution_type
    `);

    res.json({
      resolutions: result.rows,
      summary: summaryQuery.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rowCount
      }
    });

  } catch (err) {
    console.error("Error fetching loan resolutions:", err);
    res.status(500).json({ message: "Error fetching loan resolutions" });
  }
});

// Auth routes
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing name, email, or password" });
    }

    console.log("🔐 Register request received:", { name, email });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'user') RETURNING *",
      [name, email, hash]
    );
    const token = generateToken(result.rows[0]);

    console.log("✅ User created:", result.rows[0]);

    res.json({ message: "User registered", token });
  } catch (err) {
    // Improved error logging: show code, constraint, and detail if present
    console.error("❌ Error in /register route:", {
      message: err.message,
      code: err.code,
      constraint: err.constraint,
      detail: err.detail,
      stack: err.stack,
    });
    res.status(500).json({
      message: "Error registering user",
      detail: err.message,
      code: err.code,
      constraint: err.constraint,
      db_detail: err.detail,
    });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (!result.rows.length) return res.status(401).json({ message: "Invalid credentials" });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user);
    res.json({ 
      message: "Login successful", 
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        store_id: user.store_id
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Error logging in" });
  }
});

// Apply loan
const calculateCreditScore = async (userId) => {
  try {
    const payments = await pool.query(
      "SELECT COUNT(*) as total, SUM(amount) as total_paid FROM payments WHERE loan_id IN (SELECT id FROM loans WHERE user_id = $1)",
      [userId]
    );
    const loans = await pool.query("SELECT COUNT(*) as total FROM loans WHERE user_id = $1", [userId]);
    const totalPayments = parseInt(payments.rows[0].total) || 0;
    const totalPaid = parseFloat(payments.rows[0].total_paid) || 0;
    const totalLoans = parseInt(loans.rows[0].total) || 0;

    if (totalLoans === 0) return 500;
    return Math.min(500 + totalPayments * 10 + totalPaid / 100, 850);
  } catch (err) {
    return 500;
  }
};

app.post("/apply-loan", authenticateToken, async (req, res) => {
  console.log("📥 Loan creation request:", req.body);
  
  const { 
    amount, 
    term, 
    customer_id, 
    inventory_item_id, 
    loan_type = 'producto',
    financial_product_id,
    store_id,
    notes,
    created_by,
    weekly_payment,
    total_repay,
    total_interest,
    amortization_schedule
  } = req.body;
  
  // Validate required fields
  if (!customer_id || !amount || !term) {
    return res.status(400).json({ 
      message: "Missing required fields", 
      required: ['customer_id', 'amount', 'term'],
      received: { customer_id, amount, term }
    });
  }
  
  try {
    // Check inventory if it's a product loan
    if (loan_type === 'producto' && inventory_item_id) {
      const itemCheck = await pool.query(`
        SELECT * FROM inventory_items 
        WHERE id = $1 AND status = 'in_stock'
      `, [inventory_item_id]);

      if (!itemCheck.rows.length) {
        return res.status(400).json({ message: "Cannot create loan: inventory not received or already assigned" });
      }
    }

    const status = "pending_admin_approval";
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + term * 7);

    // First, let's check if the new columns exist
    try {
      const schemaCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'loans' 
        AND column_name IN ('loan_type', 'financial_product_id', 'store_id', 'notes', 'created_by', 'weekly_payment', 'total_repay', 'total_interest', 'amortization_schedule')
      `);
      console.log("Available columns:", schemaCheck.rows.map(r => r.column_name));
      
      if (schemaCheck.rows.length < 8) {
        console.log("Schema migration needed. Using fallback insert...");
        // Fallback to old schema
        const result = await pool.query(
          `INSERT INTO loans (user_id, customer_id, inventory_item_id, amount, term, status, due_date) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [req.user.id, parseInt(customer_id), inventory_item_id ? parseInt(inventory_item_id) : null, amount, term, status, dueDate]
        );
        
        // Store additional data in a separate table or handle differently
        console.log("Loan created with fallback schema. Additional data:", {
          loan_type, financial_product_id, store_id, notes, created_by,
          weekly_payment, total_repay, total_interest, amortization_schedule
        });
        
        // Update inventory status if it's a product loan
        if (loan_type === 'producto' && inventory_item_id) {
          await pool.query("UPDATE inventory_items SET status = 'assigned' WHERE id = $1", [inventory_item_id]);
        }
        
        // Generate installments using old method
        await generateInstallmentsForLoan(result.rows[0].id, amount, term);
        
        res.json({ message: "Loan created (fallback mode)", data: result.rows[0] });
        return;
      }
    } catch (schemaErr) {
      console.error("Schema check failed:", schemaErr);
    }

    const result = await pool.query(
      `INSERT INTO loans (
        user_id, customer_id, inventory_item_id, amount, term, status, due_date,
        loan_type, financial_product_id, store_id, notes, created_by,
        weekly_payment, total_repay, total_interest, amortization_schedule
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [
        req.user.id, 
        parseInt(customer_id), 
        inventory_item_id ? parseInt(inventory_item_id) : null, 
        amount, 
        term, 
        status, 
        dueDate,
        loan_type,
        financial_product_id ? parseInt(financial_product_id) : null,
        store_id ? parseInt(store_id) : null,
        notes,
        created_by ? parseInt(created_by) : req.user.id,
        weekly_payment,
        total_repay,
        total_interest,
        JSON.stringify(amortization_schedule)
      ]
    );
    
    // Update inventory status if it's a product loan
    if (loan_type === 'producto' && inventory_item_id) {
      await pool.query("UPDATE inventory_items SET status = 'assigned' WHERE id = $1", [inventory_item_id]);
    }
    
    // Generate loan installments using the provided amortization schedule
    if (amortization_schedule && amortization_schedule.length > 0) {
      await generateInstallmentsFromSchedule(result.rows[0].id, amortization_schedule);
    } else {
      // Fallback to old method if no schedule provided
      await generateInstallmentsForLoan(result.rows[0].id, amount, term);
    }

    res.json({ message: "Loan created", data: result.rows[0] });
  } catch (err) {
    console.error("Error creating loan:", err);
    console.error("Request body:", req.body);
    res.status(500).json({ message: "Error creating loan", error: err.message });
  }
});

// Route: Get all inventory items that are currently in stock (for loan creation)
app.get("/inventory-items", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM inventory_items
      WHERE status = 'in_stock'
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching inventory items:", err);
    res.status(500).json({ message: "Error fetching inventory items" });
  }
});

// Route: Create a new inventory item
app.post("/inventory-items", authenticateToken, async (req, res) => {
  try {
    const { 
      category, 
      brand, 
      model, 
      color, 
      imei, 
      serial, 
      purchase_price, 
      sale_price, 
      status = 'in_stock', 
      store = 'atlixco',
      ram,
      storage
    } = req.body;

    if (!category || !brand || !model || !color) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await pool.query(`
      INSERT INTO inventory_items (
        category, 
        brand, 
        model, 
        color, 
        imei, 
        serial_number, 
        purchase_price, 
        sale_price, 
        status, 
        store,
        ram,
        storage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [category, brand, model, color, imei, serial, purchase_price || 0, sale_price || 0, status, store, ram, storage]);

    console.log(`📦 Inventory item created: ${brand} ${model} ${color}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating inventory item:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route: Transfer inventory items between stores
app.post("/inventory-items/transfer", authenticateToken, async (req, res) => {
  try {
    const { product_ids, target_store } = req.body;

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({ error: "No products selected for transfer" });
    }

    if (!target_store) {
      return res.status(400).json({ error: "Target store is required" });
    }

    const result = await pool.query(`
      UPDATE inventory_items 
      SET store = $1 
      WHERE id = ANY($2)
      RETURNING id, brand, model, color, store
    `, [target_store, product_ids]);

    console.log(`🔄 Transferred ${result.rows.length} items to ${target_store}`);
    res.json({ 
      message: `Successfully transferred ${result.rows.length} items to ${target_store}`,
      transferred_items: result.rows
    });
  } catch (err) {
    console.error("Error transferring inventory items:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route: Calculate penalties for a loan (for display purposes)
app.get("/loans/:loan_id/penalties", authenticateToken, async (req, res) => {
  try {
    const { loan_id } = req.params;
    
    const installments = await pool.query(`
      SELECT 
        li.*,
        CASE 
          WHEN li.amount_due < 500 THEN 50
          ELSE li.amount_due * 0.10
        END as daily_penalty_rate,
        CASE 
          WHEN NOW() > li.due_date OR 
               (DATE(NOW()) = DATE(li.due_date) AND EXTRACT(HOUR FROM NOW()) >= 14)
          THEN true
          ELSE false
        END as is_overdue,
        CASE 
          WHEN NOW() > li.due_date OR 
               (DATE(NOW()) = DATE(li.due_date) AND EXTRACT(HOUR FROM NOW()) >= 14)
          THEN GREATEST(0, 
            CASE 
              WHEN li.last_penalty_applied IS NULL THEN 
                DATE_PART('day', NOW() - li.due_date)
              ELSE 
                DATE_PART('day', NOW() - li.last_penalty_applied)
            END
          )
          ELSE 0
        END as days_overdue
      FROM loan_installments li
      WHERE li.loan_id = $1
      ORDER BY li.week_number ASC
    `, [loan_id]);
    
    res.json(installments.rows);
  } catch (err) {
    console.error("Error calculating penalties:", err);
    res.status(500).json({ message: "Error calculating penalties" });
  }
});

// Route: Recalculate penalties for a loan (admin function)
app.post("/loans/:loan_id/recalculate-penalties", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { loan_id } = req.params;
    
    // Get all installments for this loan
    const installments = await pool.query(`
      SELECT * FROM loan_installments WHERE loan_id = $1 ORDER BY week_number ASC
    `, [loan_id]);
    
    let totalPenaltiesRecalculated = 0;
    
    for (const inst of installments.rows) {
      const now = new Date();
      const dueDate = new Date(inst.due_date);
      
      // Check if overdue
      const isOverdue = now > dueDate || 
                       (now.toDateString() === dueDate.toDateString() && now.getHours() >= 14);
      
              if (isOverdue) {
          const installmentAmount = parseFloat(inst.amount_due);
          const dailyPenalty = installmentAmount < 500 ? 50 : Math.round(installmentAmount * 0.10 * 100) / 100;
          
          // Calculate days overdue
          const lastPenaltyDate = inst.last_penalty_applied ? new Date(inst.last_penalty_applied) : dueDate;
          const daysSinceLastPenalty = Math.floor((now - lastPenaltyDate) / (1000 * 60 * 60 * 24));
          
          if (daysSinceLastPenalty > 0) {
            const newPenalty = Math.round(dailyPenalty * daysSinceLastPenalty * 100) / 100;
          
          await pool.query(`
            UPDATE loan_installments 
            SET penalty_applied = penalty_applied + $1, last_penalty_applied = CURRENT_DATE
            WHERE id = $2
          `, [newPenalty, inst.id]);
          
          totalPenaltiesRecalculated += newPenalty;
          console.log(`💰 Recalculated penalty: $${newPenalty} for installment ${inst.week_number}`);
        }
      }
    }
    
    res.json({ 
      message: "Penalties recalculated successfully", 
      totalPenaltiesRecalculated,
      installmentsProcessed: installments.rows.length
    });
  } catch (err) {
    console.error("Error recalculating penalties:", err);
    res.status(500).json({ message: "Error recalculating penalties" });
  }
});


const generateInstallmentsForLoan = async (loan_id, totalAmount, termWeeks) => {
  const weeklyAmount = parseFloat((totalAmount / termWeeks).toFixed(2));
  const interestRate = 0.05; // 5% interest assumed
  const interest = parseFloat((weeklyAmount * interestRate).toFixed(2));
  const capital = parseFloat((weeklyAmount - interest).toFixed(2));

  const today = new Date();
  const start = new Date(today);
  
  // Calculate next Saturday (6 = Saturday)
  // Fix the Saturday calculation to ensure it's always Saturday
  let daysUntilSaturday;
  const currentDay = today.getDay(); // 0 = Sunday, 6 = Saturday
  
  if (currentDay === 6) {
    // If today is Saturday, next Saturday is 7 days away
    daysUntilSaturday = 7;
  } else {
    // Calculate days until next Saturday
    daysUntilSaturday = (6 - currentDay + 7) % 7;
    if (daysUntilSaturday === 0) daysUntilSaturday = 7; // Ensure we go to next Saturday
  }
  
  start.setDate(start.getDate() + daysUntilSaturday);
  start.setHours(14, 0, 0, 0); // Set to 2 PM
  
  console.log(`📅 Loan ${loan_id}: Today is ${today.toDateString()} (day ${currentDay}), first payment on ${start.toDateString()} (day ${start.getDay()})`);

  for (let i = 0; i < termWeeks; i++) {
    const dueDate = new Date(start);
    dueDate.setDate(start.getDate() + (i * 7));
    
    console.log(`📅 Week ${i + 1}: ${dueDate.toDateString()} (${dueDate.getDay() === 6 ? 'Saturday' : 'NOT Saturday'})`);

    await pool.query(`
      INSERT INTO loan_installments (loan_id, week_number, due_date, amount_due, capital_portion, interest_portion)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [loan_id, i + 1, dueDate.toISOString(), weeklyAmount, capital, interest]);
  }
};

const generateInstallmentsFromSchedule = async (loan_id, amortizationSchedule) => {
  const today = new Date();
  const start = new Date(today);
  
  // Calculate next Saturday (6 = Saturday)
  // Fix the Saturday calculation to ensure it's always Saturday
  let daysUntilSaturday;
  const currentDay = today.getDay(); // 0 = Sunday, 6 = Saturday
  
  if (currentDay === 6) {
    // If today is Saturday, next Saturday is 7 days away
    daysUntilSaturday = 7;
  } else {
    // Calculate days until next Saturday
    daysUntilSaturday = (6 - currentDay + 7) % 7;
    if (daysUntilSaturday === 0) daysUntilSaturday = 7; // Ensure we go to next Saturday
  }
  
  start.setDate(start.getDate() + daysUntilSaturday);
  start.setHours(14, 0, 0, 0); // Set to 2 PM
  
  console.log(`📅 Loan ${loan_id}: Today is ${today.toDateString()} (day ${currentDay}), first payment on ${start.toDateString()} (day ${start.getDay()})`);

  for (let i = 0; i < amortizationSchedule.length; i++) {
    const installment = amortizationSchedule[i];
    const dueDate = new Date(start);
    dueDate.setDate(start.getDate() + (i * 7));
    
    console.log(`📅 Week ${i + 1}: ${dueDate.toDateString()} (${dueDate.getDay() === 6 ? 'Saturday' : 'NOT Saturday'})`);

    await pool.query(`
      INSERT INTO loan_installments (loan_id, week_number, due_date, amount_due, capital_portion, interest_portion)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      loan_id, 
      installment.week, 
      dueDate.toISOString(), 
      parseFloat(installment.payment), 
      parseFloat(installment.principal), 
      parseFloat(installment.interest)
    ]);
  }
};

// Create a financial product
app.post("/financial-products", authenticateToken, async (req, res) => {
  const {
    title,
    interest_rate,
    term_weeks,
    payment_frequency,
    penalty_fee,
    down_payment,
    notes,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO financial_products (title, interest_rate, term_weeks, payment_frequency, penalty_fee, down_payment, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, interest_rate, term_weeks, payment_frequency, penalty_fee, down_payment, notes]
    );
    res.json({ message: "Financial product created", product: result.rows[0] });
  } catch (err) {
    console.error("Error creating financial product:", err);
    res.status(500).json({ message: "Error creating financial product" });
  }
});

// Get all financial products (requires authentication)
app.get("/financial-products", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM financial_products ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching financial products:", err);
    res.status(500).json({ message: "Error fetching financial products" });
  }
});

// Public route: Get all financial products (no authentication required)
app.get("/public/financial-products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM financial_products ORDER BY created_at DESC");
    console.log("PUBLIC PRODUCTS", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching public financial products:", err);
    res.status(500).json({ message: "Error fetching financial products" });
  }
});

// Create a new product
app.post("/products", authenticateToken, async (req, res) => {
  const {
    category,
    brand,
    model,
    color,
    imei,
    serial_number,
    cost_price,
    sale_price,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO products (category, brand, model, color, imei, serial_number, cost_price, sale_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [category, brand, model, color, imei, serial_number, cost_price, sale_price]
    );
    res.json({ message: "Product created", product: result.rows[0] });
  } catch (err) {
    console.error("Error creating product:", err);
    res.status(500).json({ message: "Error creating product" });
  }
});

// Get all products
app.get("/products", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Error fetching products" });
  }
});
// Create a new customer
app.post("/customers", authenticateToken, async (req, res) => {
  // Log the incoming request and authenticated user
  console.log("📥 Received POST /customers request:", req.body);
  console.log("🔐 Authenticated user:", req.user);
  try {
    const { 
      first_name, last_name, phone, email, phone_alt, customer_type, rfc, razon_social,
      contact_person_name, contact_person_phone, address, neighborhood, building_type,
      delivery_instructions, reference_1, reference_2, reference_3, preferred_delivery_time,
      water_consumption, service_type, emergency_contact_name, emergency_contact_phone,
      postal_code, city, state, notes
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO customers (
        first_name, last_name, phone, email, phone_alt, customer_type, rfc, razon_social,
        contact_person_name, contact_person_phone, address, neighborhood, building_type,
        delivery_instructions, reference_1, reference_2, reference_3, preferred_delivery_time,
        water_consumption, service_type, emergency_contact_name, emergency_contact_phone,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23) RETURNING *`,
      [
        first_name, last_name, phone, email, phone_alt, customer_type, rfc, razon_social,
        contact_person_name, contact_person_phone, address, neighborhood, building_type,
        delivery_instructions, reference_1, reference_2, reference_3, preferred_delivery_time,
        water_consumption, service_type, emergency_contact_name, emergency_contact_phone,
        notes
      ]
    );
    const customer = result.rows[0];
    // Inserted check: Ensure customer and customer.id exist
    if (!customer || !customer.id) {
      console.error("❌ Customer insert succeeded but ID is missing:", customer);
      return res.status(500).json({ message: "Customer created, but failed to initialize accounts" });
    }
    const idPadded = customer.id.toString().padStart(4, "0");
    const fullName = customer.customer_type === 'Persona Moral' 
      ? customer.razon_social || 'Empresa'
      : `${customer.first_name || ""} ${customer.last_name || ""}`.trim();

    // Use variables for account codes (add cogs)
    const accountCodes = {
      client: `1103-${idPadded}`,
      sale: `4000-${idPadded}`,
      interest: `4100-${idPadded}`,
      cogs: `5000-${idPadded}`,
    };

    // Debug log immediately before chart_of_accounts insert
    console.log("🧾 Creating chart_of_accounts for:", {
      client: accountCodes.client,
      sale: accountCodes.sale,
      interest: accountCodes.interest,
      cogs: accountCodes.cogs
    });
    try {
      await pool.query(`
        INSERT INTO chart_of_accounts (code, name, type, group_name, parent_code)
        VALUES 
          ($1, $2, 'ACTIVO', 'ACTIVO CIRCULANTE', '1103'),
          ($3, $4, 'INGRESO', 'OPERATIVO', '4000'),
          ($5, $6, 'INGRESO', 'OPERATIVO', '4100'),
          ($7, $8, 'EGRESO', 'COSTOS', '5000')
      `, [
        accountCodes.client, `Cliente ${fullName}`,
        accountCodes.sale, `Venta Cliente ${fullName}`,
        accountCodes.interest, `Interés Cliente ${fullName}`,
        accountCodes.cogs, `COGS Cliente ${fullName}`
      ]);
      // Debug log after successful chart_of_accounts insertion
      console.log("✅ Subaccounts inserted");

      // Insert initial journal entries with zero values for customer ledger subaccounts
      await pool.query(`
        INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
        VALUES 
          (CURRENT_DATE, $1, $2, 0, 0, 'customer_setup', $3, $4),
          (CURRENT_DATE, $1, $5, 0, 0, 'customer_setup', $3, $4),
          (CURRENT_DATE, $1, $6, 0, 0, 'customer_setup', $3, $4),
          (CURRENT_DATE, $1, $7, 0, 0, 'customer_setup', $3, $4)
      `, [
        `Setup cuentas para cliente ${fullName}`,
        accountCodes.client,
        customer.id,
        req.user.id,
        accountCodes.sale,
        accountCodes.interest,
        accountCodes.cogs
      ]);
      // Log after journal_entries insertion
      console.log("✅ Journal entries inserted");
    } catch (err) {
      console.error("❌ Error inserting chart_of_accounts or journal_entries:", err);
    }

    res.json({ message: "Customer created", customer });
  } catch (err) {
    console.error("Error creating customer:", err);
    res.status(500).json({ message: "Error creating customer" });
  }
});

// Create a new customer with file uploads
app.post("/customers/upload", authenticateToken, async (req, res) => {
  console.log("📥 Received POST /customers/upload request");
  console.log("🔐 Authenticated user:", req.user);
  
  try {
    // Handle file uploads using multer
    const upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, 'uploads/');
        },
        filename: (req, file, cb) => {
          const timestamp = Date.now();
          const randomId = Math.floor(Math.random() * 1000000);
          cb(null, `${timestamp}-${randomId}-${file.originalname}`);
        }
      })
    }).fields([
      { name: 'ine', maxCount: 1 },
      { name: 'bureau', maxCount: 1 },
      { name: 'selfie', maxCount: 1 },
      { name: 'video', maxCount: 1 },
      { name: 'proof_address', maxCount: 1 }
    ]);

    upload(req, res, async (err) => {
      if (err) {
        console.error("❌ File upload error:", err);
        return res.status(400).json({ message: "File upload error" });
      }

      try {
        const { 
          first_name, last_name, phone, email, phone_alt, customer_type, rfc, razon_social,
          contact_person_name, contact_person_phone, birthdate, curp, address, neighborhood, 
          building_type, postal_code, city, state, delivery_instructions, reference_1, reference_2, 
          reference_3, preferred_delivery_time, water_consumption, service_type, 
          emergency_contact_name, emergency_contact_phone, employment, income, notes
        } = req.body;
        
        // Get file paths if files were uploaded
        const ine_path = req.files?.ine ? req.files.ine[0].path : null;
        const bureau_path = req.files?.bureau ? req.files.bureau[0].path : null;
        const selfie_path = req.files?.selfie ? req.files.selfie[0].path : null;
        const video_path = req.files?.video ? req.files.video[0].path : null;
        const proof_address_path = req.files?.proof_address ? req.files.proof_address[0].path : null;

        console.log("📄 File paths:", { ine_path, bureau_path, selfie_path, video_path, proof_address_path });
        console.log("📝 Customer data:", { first_name, last_name, phone, email, customer_type, service_type });

        const result = await pool.query(
          `INSERT INTO customers (
            first_name, last_name, phone, email, phone_alt, customer_type, rfc, razon_social,
            contact_person_name, contact_person_phone, birthdate, curp, address, neighborhood,
            building_type, postal_code, city, state, delivery_instructions, reference_1, reference_2,
            reference_3, preferred_delivery_time, water_consumption, service_type,
            emergency_contact_name, emergency_contact_phone, employment, income, notes,
            ine_path, bureau_path, selfie_path, video_path, proof_address_path
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35) RETURNING *`,
          [
            first_name, last_name, phone, email, phone_alt, customer_type, rfc, razon_social,
            contact_person_name, contact_person_phone, birthdate, curp, address, neighborhood,
            building_type, postal_code, city, state, delivery_instructions, reference_1, reference_2,
            reference_3, preferred_delivery_time, water_consumption, service_type,
            emergency_contact_name, emergency_contact_phone, employment, income, notes,
            ine_path, bureau_path, selfie_path, video_path, proof_address_path
          ]
        );
        
        const customer = result.rows[0];
        
        if (!customer || !customer.id) {
          console.error("❌ Customer insert succeeded but ID is missing:", customer);
          return res.status(500).json({ message: "Customer created, but failed to initialize accounts" });
        }
        
        const idPadded = customer.id.toString().padStart(4, "0");
        const fullName = customer.customer_type === 'Persona Moral' 
          ? customer.razon_social || 'Empresa'
          : `${customer.first_name || ""} ${customer.last_name || ""}`.trim();

        // Use variables for account codes
        const accountCodes = {
          client: `1103-${idPadded}`,
          sale: `4000-${idPadded}`,
          interest: `4100-${idPadded}`,
          cogs: `5000-${idPadded}`,
        };

        console.log("🧾 Creating chart_of_accounts for:", accountCodes);
        
        try {
          await pool.query(`
            INSERT INTO chart_of_accounts (code, name, type, group_name, parent_code)
            VALUES 
              ($1, $2, 'ACTIVO', 'ACTIVO CIRCULANTE', '1103'),
              ($3, $4, 'INGRESO', 'OPERATIVO', '4000'),
              ($5, $6, 'INGRESO', 'OPERATIVO', '4100'),
              ($7, $8, 'EGRESO', 'COSTOS', '5000')
          `, [
            accountCodes.client, `Cliente ${fullName}`,
            accountCodes.sale, `Venta Cliente ${fullName}`,
            accountCodes.interest, `Interés Cliente ${fullName}`,
            accountCodes.cogs, `COGS Cliente ${fullName}`
          ]);
          
          console.log("✅ Subaccounts inserted");

          // Insert initial journal entries
          await pool.query(`
            INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
            VALUES 
              (CURRENT_DATE, $1, $2, 0, 0, 'customer_setup', $3, $4),
              (CURRENT_DATE, $1, $5, 0, 0, 'customer_setup', $3, $4),
              (CURRENT_DATE, $1, $6, 0, 0, 'customer_setup', $3, $4),
              (CURRENT_DATE, $1, $7, 0, 0, 'customer_setup', $3, $4)
          `, [
            `Setup cuentas para cliente ${fullName}`,
            accountCodes.client,
            customer.id,
            req.user.id,
            accountCodes.sale,
            accountCodes.interest,
            accountCodes.cogs
          ]);
          
          console.log("✅ Journal entries inserted");
        } catch (err) {
          console.error("❌ Error inserting chart_of_accounts or journal_entries:", err);
        }

        res.json({ message: "Customer created successfully", customer });
      } catch (err) {
        console.error("❌ Error creating customer:", err);
        res.status(500).json({ message: "Error creating customer" });
      }
    });
  } catch (err) {
    console.error("❌ Error in /customers/upload:", err);
    res.status(500).json({ message: "Error processing request" });
  }
});

// Get all customers with loan counts and balances
app.get("/customers", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        COALESCE(loan_counts.loan_count, 0) as loan_count,
        COALESCE(loan_balances.total_balance, 0)::NUMERIC as total_balance
      FROM customers c
      LEFT JOIN (
        SELECT 
          customer_id,
          COUNT(*) as loan_count
        FROM loans 
        GROUP BY customer_id
      ) loan_counts ON c.id = loan_counts.customer_id
      LEFT JOIN (
        SELECT 
          l.customer_id,
          COALESCE(SUM(li.amount_due), 0) as total_balance
        FROM loans l
        LEFT JOIN loan_installments li ON l.id = li.loan_id
        WHERE l.status = 'delivered'
          AND li.status = 'pending'
        GROUP BY l.customer_id
      ) loan_balances ON c.id = loan_balances.customer_id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching customers:", err);
    res.status(500).json({ message: "Error fetching customers" });
  }
});

// Retrieve a full customer profile including their info, loans, and related payments
app.get("/customers/:id/profile", authenticateToken, async (req, res) => {
  const customerId = req.params.id;

  try {
    const customerResult = await pool.query(
      "SELECT id, customer_type, first_name, last_name, razon_social, contact_person_name, contact_person_phone, phone, phone_alt, email, rfc, address, neighborhood, building_type, delivery_instructions, reference_1, reference_2, reference_3, preferred_delivery_time, water_consumption, service_type, emergency_contact_name, emergency_contact_phone, notes, created_at FROM customers WHERE id = $1",
      [customerId]
    );

    if (!customerResult.rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const customer = customerResult.rows[0];

    const loansResult = await pool.query(
      "SELECT * FROM loans WHERE customer_id = $1 ORDER BY created_at DESC",
      [customerId]
    );

    const loans = await Promise.all(
      loansResult.rows.map(async (loan) => {
        const paymentsResult = await pool.query(
          "SELECT * FROM payments WHERE loan_id = $1 ORDER BY payment_date DESC",
          [loan.id]
        );
        return { ...loan, payments: paymentsResult.rows };
      })
    );

    res.json({ ...customer, loans });
  } catch (err) {
    console.error("Error fetching customer profile:", err);
    res.status(500).json({ message: "Error fetching customer profile" });
  }
});

// Get a single customer's base info (for profile page rendering)
app.get("/customers/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM customers WHERE id = $1",
      [id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching customer:", err);
    res.status(500).json({ message: "Error fetching customer" });
  }
});

// Route: Get all loans for a specific customer (for frontend dropdown selector)
app.get("/customers/:id/loans", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT id, amount, created_at, status FROM loans WHERE customer_id = $1 ORDER BY created_at DESC",
      [id]
    );
    console.log(`📊 Customer ${id} loans:`, result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching customer loans:", err);
    res.status(500).json({ message: "Error fetching customer loans" });
  }
});

// Route: Approve a loan (admin only)
app.put("/loans/:loan_id/approve", authenticateToken, isAdmin, async (req, res) => {
  const { loan_id } = req.params;
  try {
    // Get loan details
    const loanResult = await pool.query(
      "SELECT * FROM loans WHERE id = $1",
      [loan_id]
    );
    
    if (!loanResult.rows.length) {
      return res.status(404).json({ message: "Loan not found" });
    }
    
    const loan = loanResult.rows[0];
    
    if (loan.status !== 'pending_admin_approval') {
      return res.status(400).json({ message: "Loan is not pending approval" });
    }
    
    // Update loan status to approved
    await pool.query(
      "UPDATE loans SET status = 'approved' WHERE id = $1",
      [loan_id]
    );
    
    console.log(`✅ Loan ${loan_id} approved by admin ${req.user.id}`);
    
    res.json({ message: "Loan approved successfully" });
  } catch (err) {
    console.error("Error approving loan:", err);
    res.status(500).json({ message: "Error approving loan" });
  }
});

// Route: Get pending loan approvals (admin only)
app.get("/admin/pending-loan-approvals", authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        l.id as loan_id,
        l.amount,
        l.term,
        l.created_at,
        l.loan_type,
        l.weekly_payment,
        l.total_repay,
        l.total_interest,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        ii.model as product_model,
        ii.imei as product_imei,
        u.name as created_by_name
      FROM loans l
      LEFT JOIN customers c ON l.customer_id = c.id
      LEFT JOIN inventory_items ii ON l.inventory_item_id = ii.id
      LEFT JOIN users u ON l.created_by = u.id
      WHERE l.status = 'pending_admin_approval'
      ORDER BY l.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching pending loan approvals:", err);
    res.status(500).json({ message: "Error fetching pending loan approvals" });
  }
});

// Route: Deliver product and update accounting ledger
app.put("/loans/:loan_id/deliver", authenticateToken, isAdmin, async (req, res) => {
  const { loan_id } = req.params;
  try {
    // Get loan details
    const loanResult = await pool.query(`
      SELECT l.*, c.first_name, c.last_name, ii.model, ii.imei
      FROM loans l
      LEFT JOIN customers c ON l.customer_id = c.id
      LEFT JOIN inventory_items ii ON l.inventory_item_id = ii.id
      WHERE l.id = $1
    `, [loan_id]);
    
    if (!loanResult.rows.length) {
      return res.status(404).json({ message: "Loan not found" });
    }
    
    const loan = loanResult.rows[0];
    
    if (loan.status !== 'approved') {
      return res.status(400).json({ message: "Loan must be approved before delivery" });
    }
    
    if (loan.loan_type === 'producto' && loan.inventory_item_id) {
      // Update inventory status to delivered
      await pool.query(
        "UPDATE inventory_items SET status = 'delivered' WHERE id = $1",
        [loan.inventory_item_id]
      );
    }
    
    // Update loan status to delivered
    await pool.query(
      "UPDATE loans SET status = 'delivered' WHERE id = $1",
      [loan_id]
    );
    
    // Update accounting ledger
    const customerIdPadded = loan.customer_id.toString().padStart(4, "0");
    const fullName = `${loan.first_name || ""} ${loan.last_name || ""}`.trim();
    
    // Account codes for this customer
    const accountCodes = {
      client: `1103-${customerIdPadded}`,
      inventory: `1200-${customerIdPadded}`,
      cogs: `5000-${customerIdPadded}`,
    };
    
    // Create journal entries for product delivery
    const deliveryDate = new Date();
    
    // 1. Debit: Customer Account (Asset increases)
    await pool.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      deliveryDate,
      `Entrega de producto a ${fullName} - Préstamo #${loan_id}`,
      accountCodes.client,
      loan.amount,
      0,
      'loan_delivery',
      loan_id,
      req.user.id
    ]);
    
    // 2. Credit: Inventory Account (Asset decreases)
    await pool.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      deliveryDate,
      `Entrega de producto a ${fullName} - Préstamo #${loan_id}`,
      accountCodes.inventory,
      0,
      loan.amount,
      'loan_delivery',
      loan_id,
      req.user.id
    ]);
    
    console.log(`✅ Product delivered for loan ${loan_id} - Accounting ledger updated`);
    
    res.json({ message: "Product delivered and accounting ledger updated" });
  } catch (err) {
    console.error("Error delivering product:", err);
    res.status(500).json({ message: "Error delivering product" });
  }
});

// Payments
// 🔄 Deprecated route: /make-payment
// This route has been replaced by /make-installment-payment for accuracy in handling fixed schedules and penalties.


// --- Recepción page routes ---

// 1. Pending inventory reception
app.get("/warehouse/pending-inventory", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM inventory_requests
      WHERE status = 'paid_by_treasury'
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching pending inventory requests:", err);
    res.status(500).json({ message: "Error fetching pending inventory" });
  }
});

// 2. Pending deliveries to customers
app.get("/warehouse/pending-customers", authenticateToken, async (req, res) => {
  console.log("🔍 Fetching pending deliveries...");
  try {
    // First, let's check what approved loans exist
    const approvedLoans = await pool.query(`
      SELECT id, customer_id, inventory_item_id, status 
      FROM loans 
      WHERE status = 'approved'
    `);
    console.log(`📊 Found ${approvedLoans.rows.length} approved loans:`, approvedLoans.rows);

    const result = await pool.query(`
      SELECT 
        loans.id AS loan_id,
        customers.first_name,
        customers.last_name,
        inventory_items.model,
        inventory_items.imei
      FROM loans
      LEFT JOIN customers ON loans.customer_id = customers.id
      LEFT JOIN inventory_items ON loans.inventory_item_id = inventory_items.id
      WHERE loans.status = 'approved' 
        AND inventory_items.id IS NOT NULL
      ORDER BY loans.created_at DESC
    `);
    console.log(`📦 Pending deliveries: ${result.rows.length} items`);
    console.log(`📦 Delivery details:`, result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching pending deliveries:", err);
    console.error("❌ Error details:", err.message);
    res.status(500).json({ message: "Error fetching pending deliveries", error: err.message });
  }
});


// Dashboards
// Dashboard metrics
app.get("/dashboard-metrics", authenticateToken, async (req, res) => {
  try {
    console.log("🔍 Dashboard metrics requested by user:", req.user.id);
    
    // First, let's check if the tables exist
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('customers', 'loans', 'payments', 'accounting_entries', 'loan_installments')
    `);
    console.log("📊 Available tables:", tablesCheck.rows.map(r => r.table_name));
    
    const [customers, loans, capital, interest, overdue, overdueCustomers] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM customers"),
      pool.query("SELECT COUNT(*) FROM loans"),
      pool.query("SELECT COALESCE(SUM(amount), 0) FROM loans"),
      pool.query("SELECT COALESCE(SUM(amount), 0) FROM accounting_entries WHERE type = 'interestPaid'"),
      pool.query("SELECT COALESCE(SUM(amount_due + penalty_applied), 0) FROM loan_installments WHERE status = 'pending' AND due_date < CURRENT_DATE"),
      pool.query(`
        SELECT COUNT(DISTINCT loan_id)
        FROM loan_installments
        WHERE status = 'pending'
          AND due_date < CURRENT_DATE
      `)
    ]);

    // Debug logs for dashboard metrics
    console.log("📊 Dashboard metric: customers =", customers.rows);
    console.log("📊 Dashboard metric: loans =", loans.rows);

    const response = {
      customers: parseInt(customers.rows[0].count),
      loansIssued: parseInt(loans.rows[0].count),
      capitalLoaned: parseFloat(capital.rows[0].coalesce),
      interestToCollect: parseFloat(interest.rows[0].coalesce),
      overdueAmount: parseFloat(overdue.rows[0].coalesce),
      customersOverdue: parseInt(overdueCustomers.rows[0].count)
    };
    
    console.log("📊 Final dashboard response:", response);
    res.json(response);
  } catch (err) {
    console.error("❌ Error fetching dashboard metrics:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// Dashboard overdue trends
app.get("/dashboard/overdue-trends", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        to_char(due_date, 'YYYY-MM-DD') AS due_day,
        SUM(amount_due + penalty_applied) AS total_due
      FROM loan_installments
      WHERE status = 'pending'
      GROUP BY due_day
      ORDER BY due_day
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching overdue trends:", err);
    res.status(500).json({ message: "Error fetching overdue trends" });
  }
});

// Dashboard recent activity
app.get("/dashboard/recent-activity", authenticateToken, async (req, res) => {
  try {
    // Get recent payments
    const paymentsResult = await pool.query(`
      SELECT 
        'payment' as type,
        '💰 Pago Registrado' as title,
        CONCAT('Pago de $', amount, ' para préstamo #', loan_id) as description,
        payment_date as timestamp,
        '💰' as icon
      FROM payments
      ORDER BY payment_date DESC
      LIMIT 5
    `);

    // Get recent loans
    const loansResult = await pool.query(`
      SELECT 
        'loan' as type,
        '💳 Nuevo Préstamo' as title,
        CONCAT('Préstamo de $', amount, ' aprobado') as description,
        created_at as timestamp,
        '💳' as icon
      FROM loans
      WHERE status = 'approved'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Get recent customers
    const customersResult = await pool.query(`
      SELECT 
        'customer' as type,
        '👤 Nuevo Cliente' as title,
        CONCAT(first_name, ' ', last_name, ' registrado') as description,
        created_at as timestamp,
        '👤' as icon
      FROM customers
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Combine and sort by timestamp
    const allActivities = [
      ...paymentsResult.rows,
      ...loansResult.rows,
      ...customersResult.rows
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(allActivities.slice(0, 10));
  } catch (err) {
    console.error("Error fetching recent activity:", err);
    res.status(500).json({ message: "Error fetching recent activity" });
  }
});

// Dashboard cashflow summary
app.get("/dashboard/cashflow-summary", authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const [collected, disbursed] = await Promise.all([
      pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE DATE(payment_date) = $1", [today]),
      pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM loans WHERE DATE(created_at) = $1", [today])
    ]);
    res.json({
      total_collected_today: parseFloat(collected.rows[0].total),
      total_disbursed_today: parseFloat(disbursed.rows[0].total),
      net_cashflow_today: parseFloat(collected.rows[0].total) - parseFloat(disbursed.rows[0].total)
    });
  } catch (err) {
    console.error("Error fetching cashflow summary:", err);
    res.status(500).json({ message: "Error fetching cashflow summary" });
  }
});

// Dashboard cashflow summary with period support
app.get("/dashboard/cashflow", authenticateToken, async (req, res) => {
  try {
    const { period = "ytd" } = req.query;
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case "week":
        const dayOfWeek = now.getDay();
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 1
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToSubtract);
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case "ytd":
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const [collected, disbursed] = await Promise.all([
      pool.query(`
        SELECT COALESCE(SUM(amount), 0) AS total 
        FROM payments 
        WHERE payment_date >= $1 AND payment_date < $2
      `, [startDateStr, endDateStr]),
      pool.query(`
        SELECT COALESCE(SUM(amount), 0) AS total 
        FROM loans 
        WHERE created_at >= $1 AND created_at < $2
      `, [startDateStr, endDateStr])
    ]);
    
    const totalCollected = parseFloat(collected.rows[0].total);
    const totalDisbursed = parseFloat(disbursed.rows[0].total);
    const netCashflow = totalCollected - totalDisbursed;
    
    console.log(`📊 Cashflow for ${period}: Collected=${totalCollected}, Disbursed=${totalDisbursed}, Net=${netCashflow}`);
    
    res.json({
      total_collected: totalCollected,
      total_disbursed: totalDisbursed,
      net_cashflow: netCashflow,
      period: period,
      start_date: startDateStr,
      end_date: endDateStr
    });
  } catch (err) {
    console.error("Error fetching cashflow summary:", err);
    res.status(500).json({ message: "Error fetching cashflow summary" });
  }
});

app.get("/dashboard/loans", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT loans.*, CONCAT(customers.first_name, ' ', customers.last_name) AS customer_name, customers.email AS customer_email
      FROM loans
      LEFT JOIN customers ON loans.customer_id = customers.id
      ORDER BY loans.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching loans:", err);
    res.status(500).json({ message: "Error fetching loans" });
  }
});
// Dashboard: Store profitability report
app.get("/dashboard/store-profitability", authenticateToken, isAdmin, async (req, res) => {
  const { from, to } = req.query;
  const dateFilter = (from && to)
    ? `AND DATE(l.created_at) BETWEEN '${from}' AND '${to}'`
    : `AND DATE(l.created_at) >= date_trunc('year', CURRENT_DATE)`;

  try {
    const result = await pool.query(`
      SELECT
        ii.store,
        COALESCE(SUM(l.amount), 0) AS revenue,
        COALESCE(SUM(ii.purchase_price), 0) AS cogs,
        COALESCE(SUM(ie.interest), 0) AS interest,
        COALESCE(SUM(pe.penalty), 0) AS penalties,
        COALESCE(SUM(e.amount), 0) AS expenses
      FROM loans l
      LEFT JOIN inventory_items ii ON l.inventory_item_id = ii.id
      LEFT JOIN (
        SELECT loan_id, SUM(amount) AS interest
        FROM accounting_entries
        WHERE type = 'interestPaid'
        GROUP BY loan_id
      ) ie ON ie.loan_id = l.id
      LEFT JOIN (
        SELECT loan_id, SUM(amount) AS penalty
        FROM accounting_entries
        WHERE type = 'penaltyFee'
        GROUP BY loan_id
      ) pe ON pe.loan_id = l.id
      LEFT JOIN payments p ON p.loan_id = l.id
      LEFT JOIN expenses e ON e.store_id = CASE
        WHEN ii.store = 'atlixco' THEN 1
        WHEN ii.store = 'cholula' THEN 2
        WHEN ii.store = 'chipilo' THEN 3
        ELSE NULL
      END
      WHERE ii.store IS NOT NULL ${dateFilter}
      GROUP BY ii.store
      ORDER BY ii.store;
    `);

    const data = result.rows.map(r => ({
      store: r.store,
      revenue: parseFloat(r.revenue),
      cogs: parseFloat(r.cogs),
      interest: parseFloat(r.interest),
      penalties: parseFloat(r.penalties),
      expenses: parseFloat(r.expenses),
      net_profit:
        parseFloat(r.revenue) +
        parseFloat(r.interest) +
        parseFloat(r.penalties) -
        parseFloat(r.cogs) -
        parseFloat(r.expenses)
    }));

    res.json(data);
  } catch (err) {
    console.error("Error generating store profitability report:", err);
    res.status(500).json({ message: "Error generating store profitability report" });
  }
});



// Route: Get details for a loan application (for admin)
app.get("/admin/loan-applications/:id/details", authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM loans WHERE id = $1", [id]);
    if (!result.rows.length) {
      return res.status(404).json({ message: "Loan not found" });
    }

    const loan = result.rows[0];

    const [
      customerRes,
      documentsRes,
      avalsRes,
      investigationRes,
      paymentsRes
    ] = await Promise.all([
      pool.query("SELECT * FROM customers WHERE id = $1", [loan.customer_id]),
      pool.query("SELECT contract_path FROM loans WHERE id = $1", [id]),
      pool.query("SELECT * FROM loan_avals WHERE loan_id = $1", [id]),
      pool.query("SELECT * FROM loan_investigations WHERE created_by = $1 ORDER BY created_at DESC LIMIT 1", [req.user.id]),
      pool.query("SELECT * FROM payments WHERE loan_id = $1 ORDER BY payment_date DESC", [id])
    ]);

    const customer = customerRes.rows[0];
   const documents = {
  ...documentsRes.rows[0],
  contract_uploaded: !!documentsRes.rows[0]?.contract_path
};
    const avals = avalsRes.rows;
    const investigation = investigationRes.rows[0];
    const payments = paymentsRes.rows;

    res.json({
      loan,
      customer,
      documents,
      avals,
      investigation,
      payments
    });
  } catch (err) {
    console.error("❌ Error loading loan application details:", err);
    res.status(500).json({ message: "Error fetching loan application details" });
  }
});
// Route: Approve or reject a loan application
app.patch("/admin/loan-applications/:id/status", authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  console.log(`🔄 Updating loan ${id} status to: ${status}`);

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    // First, get the current loan details
    const currentLoan = await pool.query(
      "SELECT * FROM loans WHERE id = $1",
      [id]
    );

    if (!currentLoan.rows.length) {
      return res.status(404).json({ message: "Loan not found" });
    }

    console.log(`📊 Current loan status: ${currentLoan.rows[0].status}`);
    console.log(`📊 Current loan details:`, currentLoan.rows[0]);

    const result = await pool.query(
      "UPDATE loans SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );

    console.log(`✅ Loan ${id} status updated to: ${status}`);
    console.log(`✅ Updated loan details:`, result.rows[0]);

    res.json({ message: `Loan ${status}`, loan: result.rows[0] });
  } catch (err) {
    console.error("❌ Error updating loan status:", err);
    console.error("❌ Error details:", err.message);
    res.status(500).json({ message: "Error updating loan status", error: err.message });
  }
});
// --- Ensure the server is properly started ---
// start(); // Moved to end of file

// Missing routes that frontend is calling
app.get("/admin/payments", authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, l.customer_id, c.first_name, c.last_name 
      FROM payments p 
      JOIN loans l ON p.loan_id = l.id 
      JOIN customers c ON l.customer_id = c.id 
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/admin/payments/:paymentId/breakdown", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const result = await pool.query(`
      SELECT * FROM payment_breakdowns WHERE payment_id = $1
    `, [paymentId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching payment breakdown:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/admin/payments/:paymentId/loan-id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const result = await pool.query(`
      SELECT loan_id FROM payments WHERE id = $1
    `, [paymentId]);
    res.json({ loan_id: result.rows[0]?.loan_id });
  } catch (err) {
    console.error("Error fetching loan ID:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/admin/payments/:paymentId/reclassify", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { newLoanId, amount } = req.body;
    
    // Update payment to new loan
    await pool.query(`
      UPDATE payments SET loan_id = $1, amount = $2 WHERE id = $3
    `, [newLoanId, amount, paymentId]);
    
    res.json({ message: "Payment reclassified successfully" });
  } catch (err) {
    console.error("Error reclassifying payment:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/customers/:id/notes", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM customer_notes WHERE customer_id = $1 ORDER BY created_at DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching customer notes:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/customers/:id/notes", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const result = await pool.query(`
      INSERT INTO customer_notes (customer_id, note, created_by) VALUES ($1, $2, $3) RETURNING *
    `, [id, note, req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating customer note:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/customers/:id/avals", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM customer_avals WHERE customer_id = $1 ORDER BY created_at DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching customer avals:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/customers/:id/avals", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, relationship } = req.body;
    const result = await pool.query(`
      INSERT INTO customer_avals (customer_id, name, phone, relationship) VALUES ($1, $2, $3, $4) RETURNING *
    `, [id, name, phone, relationship]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating customer aval:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/customers/:id/references", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM customer_references WHERE customer_id = $1 ORDER BY created_at DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching customer references:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/customers/:id/references", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, relationship } = req.body;
    const result = await pool.query(`
      INSERT INTO customer_references (customer_id, name, phone, relationship) VALUES ($1, $2, $3, $4) RETURNING *
    `, [id, name, phone, relationship]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating customer reference:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/loans/:loan_id/details", authenticateToken, async (req, res) => {
  try {
    const { loan_id } = req.params;
    
    // Get loan details with customer info
    const loanResult = await pool.query(`
      SELECT l.*, c.first_name, c.last_name, c.email, c.phone 
      FROM loans l 
      JOIN customers c ON l.customer_id = c.id 
      WHERE l.id = $1
    `, [loan_id]);
    
    if (!loanResult.rows.length) {
      return res.status(404).json({ message: "Loan not found" });
    }
    
    const loan = loanResult.rows[0];
    
    // Get installments for this loan and calculate penalties
    const installmentsResult = await pool.query(`
      SELECT 
        id, loan_id, week_number, due_date, amount_due, 
        capital_portion, interest_portion, penalty_applied, 
        last_penalty_applied, status, created_at,
        COALESCE(capital_paid, 0) as capital_paid,
        COALESCE(interest_paid, 0) as interest_paid,
        COALESCE(penalty_paid, 0) as penalty_paid
      FROM loan_installments 
      WHERE loan_id = $1 
      ORDER BY week_number ASC
    `, [loan_id]);
    
    // Calculate and apply penalties for overdue installments
    let totalPenaltiesApplied = 0;
    for (const inst of installmentsResult.rows) {
      const now = new Date();
      const dueDate = new Date(inst.due_date);
      
      // Check if overdue (after 2 PM on due date or any time after)
      const isOverdue = now > dueDate || 
                       (now.toDateString() === dueDate.toDateString() && now.getHours() >= 14);
      
      if (isOverdue) {
        const installmentAmount = parseFloat(inst.amount_due);
        const dailyPenalty = installmentAmount < 500 ? 50 : Math.round(installmentAmount * 0.10 * 100) / 100;
        
        // Calculate days overdue
        const lastPenaltyDate = inst.last_penalty_applied ? new Date(inst.last_penalty_applied) : dueDate;
        const daysSinceLastPenalty = Math.floor((now - lastPenaltyDate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastPenalty > 0) {
          const newPenalty = dailyPenalty * daysSinceLastPenalty;
          
          await pool.query(`
            UPDATE loan_installments 
            SET penalty_applied = penalty_applied + $1, last_penalty_applied = CURRENT_DATE
            WHERE id = $2
          `, [newPenalty, inst.id]);
          
          totalPenaltiesApplied += newPenalty;
          console.log(`💰 Applied penalty: $${newPenalty} for installment ${inst.week_number} (${daysSinceLastPenalty} days overdue)`);
        }
      }
    }
    
    // Refresh installments after penalty calculation
    if (totalPenaltiesApplied > 0) {
      const updatedInstallmentsResult = await pool.query(`
        SELECT 
          id, loan_id, week_number, due_date, amount_due, 
          capital_portion, interest_portion, penalty_applied, 
          last_penalty_applied, status, created_at,
          COALESCE(capital_paid, 0) as capital_paid,
          COALESCE(interest_paid, 0) as interest_paid,
          COALESCE(penalty_paid, 0) as penalty_paid
        FROM loan_installments 
        WHERE loan_id = $1 
        ORDER BY week_number ASC
      `, [loan_id]);
      installmentsResult.rows = updatedInstallmentsResult.rows;
    }
    
    // Get payments for this loan
    const paymentsResult = await pool.query(`
      SELECT * FROM payments 
      WHERE loan_id = $1 
      ORDER BY payment_date DESC
    `, [loan_id]);
    
    // Calculate penalties
    const penaltiesResult = await pool.query(`
      SELECT 
        li.*,
        CASE 
          WHEN li.amount_due < 500 THEN 50
          ELSE li.amount_due * 0.10
        END as daily_penalty_rate,
        CASE 
          WHEN NOW() > li.due_date OR 
               (DATE(NOW()) = DATE(li.due_date) AND EXTRACT(HOUR FROM NOW()) >= 14)
          THEN true
          ELSE false
        END as is_overdue
      FROM loan_installments li
      WHERE li.loan_id = $1
      ORDER BY li.week_number ASC
    `, [loan_id]);
    
    // Calculate totals
    const totalPaid = paymentsResult.rows.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalDue = installmentsResult.rows.reduce((sum, i) => sum + parseFloat(i.amount_due) + parseFloat(i.penalty_applied || 0), 0);
    const totalPenalties = installmentsResult.rows.reduce((sum, i) => sum + parseFloat(i.penalty_applied || 0), 0);
    const totalInterest = installmentsResult.rows.reduce((sum, i) => sum + parseFloat(i.interest_portion), 0);
    const totalCapital = installmentsResult.rows.reduce((sum, i) => sum + parseFloat(i.capital_portion), 0);
    
    // Calculate pending amounts
    const pendingCapital = totalCapital - (paymentsResult.rows.filter(p => p.component === 'capital').reduce((sum, p) => sum + parseFloat(p.amount), 0));
    const pendingInterest = totalInterest - (paymentsResult.rows.filter(p => p.component === 'interest').reduce((sum, p) => sum + parseFloat(p.amount), 0));
    
    res.json({
      loan,
      installments: installmentsResult.rows,
      payments: paymentsResult.rows,
      penalties: penaltiesResult.rows,
      totals: {
        totalPaid,
        totalDue,
        totalPenalties,
        totalInterest,
        totalCapital,
        pendingCapital: Math.max(0, pendingCapital),
        pendingInterest: Math.max(0, pendingInterest),
        remainingBalance: parseFloat(loan.amount) - totalPaid + totalPenalties
      }
    });
  } catch (err) {
    console.error("Error fetching loan details:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/loans/:loan_id/statement", authenticateToken, async (req, res) => {
  try {
    const { loan_id } = req.params;
    
    // Get loan info
    const loanResult = await pool.query(`
      SELECT l.*, c.first_name, c.last_name, c.email, c.phone 
      FROM loans l 
      JOIN customers c ON l.customer_id = c.id 
      WHERE l.id = $1
    `, [loan_id]);
    
    if (!loanResult.rows.length) {
      return res.status(404).json({ message: "Loan not found" });
    }
    
    const loan = loanResult.rows[0];
    
    // Get all installments with payment status
    const installmentsResult = await pool.query(`
      SELECT 
        li.id, li.loan_id, li.week_number, li.due_date, li.amount_due, 
        li.capital_portion, li.interest_portion, li.penalty_applied, 
        li.last_penalty_applied, li.status, li.created_at,
        COALESCE(li.capital_paid, 0) as capital_paid,
        COALESCE(li.interest_paid, 0) as interest_paid,
        COALESCE(li.penalty_paid, 0) as penalty_paid,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        CASE 
          WHEN COALESCE(SUM(p.amount), 0) >= li.amount_due + li.penalty_applied THEN 'paid'
          WHEN NOW() > li.due_date OR 
               (DATE(NOW()) = DATE(li.due_date) AND EXTRACT(HOUR FROM NOW()) >= 14) THEN 'overdue'
          ELSE 'pending'
        END as payment_status
      FROM loan_installments li
      LEFT JOIN payments p ON li.loan_id = p.loan_id AND li.week_number = p.installment_week
      WHERE li.loan_id = $1
      GROUP BY li.id, li.week_number, li.due_date, li.amount_due, li.capital_portion, li.interest_portion, li.penalty_applied, li.status, li.capital_paid, li.interest_paid, li.penalty_paid
      ORDER BY li.week_number ASC
    `, [loan_id]);
    
    // Get all payments for this loan
    const paymentsResult = await pool.query(`
      SELECT * FROM payments 
      WHERE loan_id = $1 
      ORDER BY payment_date DESC
    `, [loan_id]);
    
    // Calculate totals
    const totalPaid = paymentsResult.rows.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalDue = installmentsResult.rows.reduce((sum, i) => sum + parseFloat(i.amount_due) + parseFloat(i.penalty_applied || 0), 0);
    const totalPenalties = installmentsResult.rows.reduce((sum, i) => sum + parseFloat(i.penalty_applied || 0), 0);
    
    res.json({
      loan,
      installments: installmentsResult.rows,
      payments: paymentsResult.rows,
      summary: {
        totalPaid,
        totalDue,
        totalPenalties,
        remainingBalance: totalDue - totalPaid
      }
    });
  } catch (err) {
    console.error("Error fetching loan statement:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/loans/:loan_id/financial-movements", authenticateToken, async (req, res) => {
  try {
    const { loan_id } = req.params;
    const result = await pool.query(`
      SELECT * FROM financial_movements WHERE loan_id = $1 ORDER BY created_at DESC
    `, [loan_id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching financial movements:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get payments for a specific loan
app.get("/loans/:loan_id/payments", authenticateToken, async (req, res) => {
  try {
    const { loan_id } = req.params;
    const result = await pool.query(`
      SELECT 
        p.*,
        li.capital_portion,
        li.interest_portion,
        li.penalty_applied,
        li.capital_paid,
        li.interest_paid,
        li.penalty_paid,
        li.amount_due,
        li.status as installment_status
      FROM payments p
      LEFT JOIN loan_installments li ON p.loan_id = li.loan_id AND p.installment_week = li.week_number
      WHERE p.loan_id = $1 
      ORDER BY p.payment_date DESC
    `, [loan_id]);

    // Process each payment to include component breakdown
    const paymentsWithBreakdown = result.rows.map(payment => {
      const totalAmount = parseFloat(payment.amount || 0);
      const capitalPortion = parseFloat(payment.capital_portion || 0);
      const interestPortion = parseFloat(payment.interest_portion || 0);
      const penaltyApplied = parseFloat(payment.penalty_applied || 0);
      
      // Calculate how much of each component was paid
      let capitalPaid = 0;
      let interestPaid = 0;
      let penaltyPaid = 0;
      let remainingAmount = totalAmount;

      // First, pay capital
      if (remainingAmount > 0 && capitalPortion > 0) {
        capitalPaid = Math.min(remainingAmount, capitalPortion);
        remainingAmount -= capitalPaid;
      }

      // Then, pay interest
      if (remainingAmount > 0 && interestPortion > 0) {
        interestPaid = Math.min(remainingAmount, interestPortion);
        remainingAmount -= interestPaid;
      }

      // Finally, pay penalty
      if (remainingAmount > 0 && penaltyApplied > 0) {
        penaltyPaid = Math.min(remainingAmount, penaltyApplied);
        remainingAmount -= penaltyPaid;
      }

      // Create components array
      const components = [];
      if (capitalPaid > 0) {
        components.push({
          type: 'capital',
          amount: capitalPaid,
          label: 'Capital'
        });
      }
      if (interestPaid > 0) {
        components.push({
          type: 'interest',
          amount: interestPaid,
          label: 'Interés'
        });
      }
      if (penaltyPaid > 0) {
        components.push({
          type: 'penalty',
          amount: penaltyPaid,
          label: 'Penalidad'
        });
      }

      return {
        ...payment,
        components: components,
        capital_paid: capitalPaid,
        interest_paid: interestPaid,
        penalty_paid: penaltyPaid
      };
    });

    res.json(paymentsWithBreakdown);
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new payment
app.post("/payments", authenticateToken, async (req, res) => {
  try {
    const { loan_id, amount, payment_method, store_id, apply_extra_to } = req.body;
    
    if (!loan_id || !amount || !payment_method) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get loan details
    const loanResult = await pool.query(`
      SELECT l.*, c.first_name, c.last_name, c.phone, c.email, c.address
      FROM loans l
      JOIN customers c ON l.customer_id = c.id
      WHERE l.id = $1
    `, [loan_id]);

    if (!loanResult.rows.length) {
      return res.status(404).json({ error: "Loan not found" });
    }

    const loan = loanResult.rows[0];
    const paymentAmount = parseFloat(amount);
    const currentDate = new Date();

    // Insert payment
    const paymentResult = await pool.query(`
      INSERT INTO payments (loan_id, amount, method, payment_date, store_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [loan_id, paymentAmount, payment_method, currentDate, store_id || 1]);

    const payment = paymentResult.rows[0];

    // Check if loan has installments and update them if they exist
    const installmentsResult = await pool.query(`
      SELECT week_number, status 
      FROM loan_installments 
      WHERE loan_id = $1 AND status = 'pending' 
      ORDER BY week_number ASC 
      LIMIT 1
    `, [loan_id]);

    if (installmentsResult.rows.length > 0) {
      const pendingInstallment = installmentsResult.rows[0];
      
      // Update the pending installment
      await pool.query(`
        UPDATE loan_installments 
        SET 
          capital_paid = COALESCE(capital_paid, 0) + $2,
          interest_paid = COALESCE(interest_paid, 0) + $3,
          penalty_paid = COALESCE(penalty_paid, 0) + $4,
          status = CASE 
            WHEN (COALESCE(capital_paid, 0) + $2 + COALESCE(interest_paid, 0) + $3 + COALESCE(penalty_paid, 0) + $4) >= amount_due + COALESCE(penalty_applied, 0) 
            THEN 'paid' 
            ELSE 'pending' 
          END
        WHERE loan_id = $1 AND week_number = $5
      `, [loan_id, paymentAmount * 0.7, paymentAmount * 0.2, paymentAmount * 0.1, pendingInstallment.week_number]);
    }

    // Create receipt data
    const receiptData = {
      id: payment.id,
      customer_name: `${loan.first_name} ${loan.last_name}`,
      customer_phone: loan.phone,
      customer_address: loan.address,
      loan_id: loan_id,
      payment_amount: paymentAmount,
      payment_method: payment_method,
      payment_date: currentDate.toLocaleDateString(),
      payment_time: currentDate.toLocaleTimeString(),
      receipt_number: `REC-${payment.id}`,
      store_name: "CrediYa",
      store_address: "Dirección de la Tienda",
      store_phone: "Teléfono de la Tienda",
      total_amount: paymentAmount,
      remaining_balance: parseFloat(loan.amount) - paymentAmount
    };

    console.log(`💰 Payment registered: $${paymentAmount} for loan #${loan_id}`);
    res.json(receiptData);
  } catch (err) {
    console.error("Error creating payment:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// Get payment breakdown for a specific loan
app.get("/loans/:loan_id/payment-breakdown", authenticateToken, async (req, res) => {
  try {
    const { loan_id } = req.params;
    
    // First, get all payments for this loan
    const paymentsResult = await pool.query(`
      SELECT 
        p.payment_date,
        p.amount as total_amount,
        p.method as payment_method,
        p.id as payment_id
      FROM payments p
      WHERE p.loan_id = $1
      ORDER BY p.payment_date DESC
    `, [loan_id]);

    // Get all installments for this loan
    const installmentsResult = await pool.query(`
      SELECT 
        week_number,
        capital_portion,
        interest_portion,
        penalty_applied,
        capital_paid,
        interest_paid,
        penalty_paid,
        amount_due,
        status as installment_status
      FROM loan_installments 
      WHERE loan_id = $1
      ORDER BY week_number ASC
    `, [loan_id]);

    // Process each payment to create component breakdown
    const paymentBreakdowns = paymentsResult.rows.map(payment => {
      const totalAmount = parseFloat(payment.total_amount || 0);
      
      // Find the first pending installment or use the first installment if all are paid
      const pendingInstallment = installmentsResult.rows.find(li => li.installment_status === 'pending') || 
                                installmentsResult.rows[0];
      
      if (!pendingInstallment) {
        // If no installments found, create a simple breakdown
        return {
          payment_date: payment.payment_date,
          total_amount: totalAmount,
          payment_method: payment.payment_method,
          installment_week: 1,
          components: [{
            type: 'payment',
            amount: totalAmount,
            label: 'Pago Total'
          }]
        };
      }

      const capitalPortion = parseFloat(pendingInstallment.capital_portion || 0);
      const interestPortion = parseFloat(pendingInstallment.interest_portion || 0);
      const penaltyApplied = parseFloat(pendingInstallment.penalty_applied || 0);
      
      // Calculate how much of each component was paid
      let capitalPaid = 0;
      let interestPaid = 0;
      let penaltyPaid = 0;
      let remainingAmount = totalAmount;

      // First, pay capital
      if (remainingAmount > 0 && capitalPortion > 0) {
        capitalPaid = Math.min(remainingAmount, capitalPortion);
        remainingAmount -= capitalPaid;
      }

      // Then, pay interest
      if (remainingAmount > 0 && interestPortion > 0) {
        interestPaid = Math.min(remainingAmount, interestPortion);
        remainingAmount -= interestPaid;
      }

      // Finally, pay penalty
      if (remainingAmount > 0 && penaltyApplied > 0) {
        penaltyPaid = Math.min(remainingAmount, penaltyApplied);
        remainingAmount -= penaltyPaid;
      }

      // Create components array
      const components = [];
      if (capitalPaid > 0) {
        components.push({
          type: 'capital',
          amount: capitalPaid,
          label: 'Capital'
        });
      }
      if (interestPaid > 0) {
        components.push({
          type: 'interest',
          amount: interestPaid,
          label: 'Interés'
        });
      }
      if (penaltyPaid > 0) {
        components.push({
          type: 'penalty',
          amount: penaltyPaid,
          label: 'Penalidad'
        });
      }

      return {
        payment_date: payment.payment_date,
        total_amount: totalAmount,
        payment_method: payment.payment_method,
        installment_week: pendingInstallment.week_number,
        components: components
      };
    });

    console.log(`📊 Payment breakdowns for loan #${loan_id}:`, paymentBreakdowns.length, 'payments');
    res.json({ payment_breakdown: paymentBreakdowns });
  } catch (err) {
    console.error("Error fetching payment breakdown:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Enhanced overdue loans with smart collection tools
app.get("/overdue-loans", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        l.id as loan_id,
        l.amount as loan_amount,
        l.status as loan_status,
        l.created_at as loan_created,
        c.id as customer_id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        c.address,
        -- Overdue installment details
        li.week_number,
        li.due_date,
        li.amount_due,
        li.penalty_applied,
        li.capital_paid,
        li.interest_paid,
        li.penalty_paid,
        -- Calculate overdue metrics
        CASE 
          WHEN NOW() > li.due_date THEN 
            EXTRACT(DAY FROM (NOW() - li.due_date))
          ELSE 0
        END as days_overdue,
        CASE 
          WHEN NOW() > li.due_date OR 
               (DATE(NOW()) = DATE(li.due_date) AND EXTRACT(HOUR FROM NOW()) >= 14)
          THEN true
          ELSE false
        END as is_overdue,
        -- Payment history
        COALESCE(SUM(p.amount), 0) as total_paid,
        COUNT(p.id) as payment_count,
        MAX(p.payment_date) as last_payment_date,
        -- Collection priority score (higher = more urgent)
        CASE 
          WHEN NOW() > li.due_date THEN 
            EXTRACT(DAY FROM (NOW() - li.due_date)) * 10 + 
            COALESCE(li.penalty_applied, 0) * 0.1
          ELSE 0
        END as collection_priority
      FROM loans l
      JOIN customers c ON l.customer_id = c.id
      JOIN loan_installments li ON l.id = li.loan_id
      LEFT JOIN payments p ON l.id = p.loan_id
      WHERE l.status IN ('delivered', 'approved')
        AND li.status = 'pending'
        AND (
          NOW() > li.due_date OR 
          (DATE(NOW()) = DATE(li.due_date) AND EXTRACT(HOUR FROM NOW()) >= 14)
        )
      GROUP BY l.id, c.id, li.id
      ORDER BY collection_priority DESC, days_overdue DESC
    `);

    // Calculate summary statistics
    const summary = {
      total_overdue: result.rows.length,
      total_amount_overdue: result.rows.reduce((sum, row) => sum + parseFloat(row.amount_due || 0), 0),
      total_penalties: result.rows.reduce((sum, row) => sum + parseFloat(row.penalty_applied || 0), 0),
      customers_affected: [...new Set(result.rows.map(row => row.customer_id))].length,
      average_days_overdue: result.rows.length > 0 ? 
        result.rows.reduce((sum, row) => sum + (row.days_overdue || 0), 0) / result.rows.length : 0
    };

    res.json({
      overdue_installments: result.rows,
      summary: summary
    });
  } catch (err) {
    console.error("Error fetching overdue loans:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Smart collection actions
app.post("/overdue-loans/:loan_id/collection-action", authenticateToken, async (req, res) => {
  const { loan_id } = req.params;
  const { action_type, notes, contact_method, scheduled_date } = req.body;
  
  try {
    // Get loan and customer details
    const loanResult = await pool.query(`
      SELECT l.*, c.first_name, c.last_name, c.phone, c.email
      FROM loans l
      JOIN customers c ON l.customer_id = c.id
      WHERE l.id = $1
    `, [loan_id]);

    if (!loanResult.rows.length) {
      return res.status(404).json({ message: "Loan not found" });
    }

    const loan = loanResult.rows[0];
    const customer = {
      name: `${loan.first_name} ${loan.last_name}`,
      phone: loan.phone,
      email: loan.email
    };

    // Record collection action
    await pool.query(`
      INSERT INTO collection_actions (
        loan_id, action_type, notes, contact_method, 
        scheduled_date, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
    `, [loan_id, action_type, notes, contact_method, scheduled_date, req.user.id]);

    // Handle different action types
    let actionResult = { success: true, message: "Action recorded" };

    switch (action_type) {
      case 'whatsapp_reminder':
        actionResult = await sendWhatsAppReminder(customer, loan);
        break;
      case 'phone_call':
        actionResult = { success: true, message: "Phone call scheduled" };
        break;
      case 'payment_plan':
        actionResult = await createPaymentPlan(loan_id, req.body.payment_plan);
        break;
      case 'legal_notice':
        actionResult = await sendLegalNotice(customer, loan);
        break;
      case 'visit_scheduled':
        actionResult = { success: true, message: "Visit scheduled" };
        break;
    }

    res.json({
      message: "Collection action recorded successfully",
      action_result: actionResult
    });

  } catch (err) {
    console.error("Error recording collection action:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get collection actions for a loan
app.get("/overdue-loans/:loan_id/collection-actions", authenticateToken, async (req, res) => {
  const { loan_id } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT ca.*, u.first_name as created_by_name
      FROM collection_actions ca
      LEFT JOIN users u ON ca.created_by = u.id
      WHERE ca.loan_id = $1
      ORDER BY ca.created_at DESC
    `, [loan_id]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching collection actions:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Automated collection recommendations
app.get("/overdue-loans/recommendations", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        l.id as loan_id,
        c.first_name,
        c.last_name,
        c.phone,
        li.week_number,
        li.days_overdue,
        li.amount_due,
        li.penalty_applied,
        -- Recommendation logic
        CASE 
          WHEN li.days_overdue <= 3 THEN 'gentle_reminder'
          WHEN li.days_overdue <= 7 THEN 'payment_plan'
          WHEN li.days_overdue <= 14 THEN 'phone_call'
          WHEN li.days_overdue <= 30 THEN 'visit_scheduled'
          ELSE 'legal_notice'
        END as recommended_action,
        -- Priority level
        CASE 
          WHEN li.days_overdue <= 7 THEN 'low'
          WHEN li.days_overdue <= 14 THEN 'medium'
          WHEN li.days_overdue <= 30 THEN 'high'
          ELSE 'critical'
        END as priority_level
      FROM loans l
      JOIN customers c ON l.customer_id = c.id
      JOIN loan_installments li ON l.id = li.loan_id
      WHERE li.status = 'pending'
        AND li.is_overdue = true
      ORDER BY li.days_overdue DESC, li.amount_due DESC
    `);

    res.json({
      recommendations: result.rows,
      summary: {
        total_recommendations: result.rows.length,
        by_priority: {
          low: result.rows.filter(r => r.priority_level === 'low').length,
          medium: result.rows.filter(r => r.priority_level === 'medium').length,
          high: result.rows.filter(r => r.priority_level === 'high').length,
          critical: result.rows.filter(r => r.priority_level === 'critical').length
        }
      }
    });
  } catch (err) {
    console.error("Error generating recommendations:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Bulk collection actions
app.post("/overdue-loans/bulk-actions", authenticateToken, async (req, res) => {
  const { action_type, loan_ids, message_template } = req.body;
  
  try {
    const results = [];
    
    for (const loan_id of loan_ids) {
      try {
        // Get loan details
        const loanResult = await pool.query(`
          SELECT l.*, c.first_name, c.last_name, c.phone, c.email
          FROM loans l
          JOIN customers c ON l.customer_id = c.id
          WHERE l.id = $1
        `, [loan_id]);

        if (loanResult.rows.length > 0) {
          const loan = loanResult.rows[0];
          
          // Record action
          await pool.query(`
            INSERT INTO collection_actions (
              loan_id, action_type, notes, created_by, status
            ) VALUES ($1, $2, $3, $4, 'completed')
          `, [loan_id, action_type, message_template, req.user.id]);

          // Execute action
          if (action_type === 'bulk_whatsapp') {
            const customer = {
              name: `${loan.first_name} ${loan.last_name}`,
              phone: loan.phone
            };
            const result = await sendWhatsAppReminder(customer, loan, message_template);
            results.push({ loan_id, success: true, result });
          }
        }
      } catch (err) {
        results.push({ loan_id, success: false, error: err.message });
      }
    }

    res.json({
      message: "Bulk actions completed",
      results: results,
      summary: {
        total: loan_ids.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (err) {
    console.error("Error executing bulk actions:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/promotions", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM promotions ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching promotions:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/promotions/active", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM promotions WHERE status = 'active' ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching active promotions:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/public/apply", async (req, res) => {
  try {
    const { name, email, phone, promotion_id } = req.body;
    const result = await pool.query(`
      INSERT INTO public_applications (name, email, phone, promotion_id) 
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [name, email, phone, promotion_id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating public application:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/collections/:loan_id/notes", authenticateToken, async (req, res) => {
  try {
    const { loan_id } = req.params;
    const result = await pool.query(`
      SELECT * FROM collection_notes WHERE loan_id = $1 ORDER BY created_at DESC
    `, [loan_id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching collection notes:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/dashboard/collections", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, c.first_name, c.last_name, c.phone,
             (l.total_amount - COALESCE(SUM(p.amount), 0)) as remaining_balance
      FROM loans l 
      JOIN customers c ON l.customer_id = c.id 
      LEFT JOIN payments p ON l.id = p.loan_id 
      WHERE l.status = 'activo' 
      GROUP BY l.id, c.first_name, c.last_name, c.phone 
      HAVING (l.total_amount - COALESCE(SUM(p.amount), 0)) > 0
      ORDER BY remaining_balance DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching collections dashboard:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/accounting/closures", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM accounting_closures ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching accounting closures:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/accounting/closures/:closureId/entries", authenticateToken, async (req, res) => {
  try {
    const { closureId } = req.params;
    const result = await pool.query(`
      SELECT * FROM accounting_entries WHERE closure_id = $1 ORDER BY created_at DESC
    `, [closureId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching closure entries:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/warehouse/pending-customer-deliveries", authenticateToken, async (req, res) => {
  console.log("🔍 Fetching pending customer deliveries...");
  try {
    const result = await pool.query(`
      SELECT 
        l.id as loan_id,
        l.amount,
        l.status,
        c.first_name, 
        c.last_name, 
        c.phone,
        c.curp,
        i.brand,
        i.model,
        i.imei,
        i.sale_price
      FROM loans l 
      JOIN customers c ON l.customer_id = c.id 
      JOIN inventory_items i ON l.inventory_item_id = i.id 
      WHERE l.status = 'approved' AND i.status != 'delivered'
      ORDER BY l.created_at DESC
    `);
    console.log(`📦 Found ${result.rows.length} pending customer deliveries`);
    console.log(`📦 Delivery details:`, result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching pending deliveries:", err);
    console.error("Error details:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/loans/pending", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, c.first_name, c.last_name, c.phone
      FROM loans l 
      JOIN customers c ON l.customer_id = c.id 
      WHERE l.status = 'pending'
      ORDER BY l.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching pending loans:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all loans with customer and inventory details
app.get("/loans", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        l.*,
        c.first_name || ' ' || c.last_name as customer_name,
        c.phone as customer_phone,
        i.model as inventory_model,
        i.brand as inventory_brand,
        COALESCE(SUM(p.amount), 0) as total_paid,
        l.amount - COALESCE(SUM(p.amount), 0) as remaining_balance
      FROM loans l
      JOIN customers c ON l.customer_id = c.id
      LEFT JOIN inventory_items i ON l.inventory_item_id = i.id
      LEFT JOIN payments p ON l.id = p.loan_id
      GROUP BY l.id, c.first_name, c.last_name, c.phone, i.model, i.brand
      ORDER BY l.created_at DESC
    `);
    
    console.log(`📊 Fetched ${result.rows.length} loans for dashboard`);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching loans:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get loans analytics data
app.get("/loans/analytics", authenticateToken, async (req, res) => {
  try {
    // Monthly trends for new loans
    const monthlyTrends = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM loans 
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month
    `);

    // Payment trends (last 8 weeks)
    const paymentTrends = await pool.query(`
      SELECT 
        TO_CHAR(payment_date, 'YYYY-WW') as week,
        SUM(amount) as amount,
        COUNT(*) as count
      FROM payments 
      WHERE payment_date >= NOW() - INTERVAL '8 weeks'
      GROUP BY TO_CHAR(payment_date, 'YYYY-WW')
      ORDER BY week
    `);

    // Status distribution
    const statusDistribution = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM loans 
      GROUP BY status
    `);

    // Top performing stores (simplified since stores table might not exist)
    const topStores = await pool.query(`
      SELECT 
        'Tienda Principal' as store_name,
        COUNT(l.id) as loan_count,
        SUM(l.amount) as total_amount
      FROM loans l
      WHERE l.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY store_name
      ORDER BY loan_count DESC
      LIMIT 5
    `);

    console.log(`📊 Generated analytics data: ${monthlyTrends.rows.length} months, ${paymentTrends.rows.length} weeks`);
    
    res.json({
      monthlyTrends: monthlyTrends.rows,
      paymentTrends: paymentTrends.rows,
      statusDistribution: statusDistribution.rows,
      topStores: topStores.rows
    });
  } catch (err) {
    console.error("Error fetching loans analytics:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get inventory requests for regular users
app.get("/inventory-requests", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM inventory_requests ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching inventory requests:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/admin/inventory-requests", authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM inventory_requests ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching inventory requests:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/admin/stores", authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM stores ORDER BY name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching stores:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/admin/create-user", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, email, password, role, store_id } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(`
      INSERT INTO users (name, email, password, role, store_id) 
      VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role
    `, [name, email, hashedPassword, role, store_id]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/admin/users/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, role, store_id } = req.body;
    
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount}`);
      values.push(is_active);
      paramCount++;
    }
    
    if (role) {
      updateFields.push(`role = $${paramCount}`);
      values.push(role);
      paramCount++;
    }
    
    if (store_id) {
      updateFields.push(`store_id = $${paramCount}`);
      values.push(store_id);
      paramCount++;
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }
    
    values.push(id);
    const result = await pool.query(`
      UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING id, name, email, role
    `, values);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Test payment endpoint for debugging
app.post("/test-payment-insert", async (req, res) => {
  try {
    const { loan_id, amount } = req.body;
    
    // Try to insert a test payment with decimal values
    const result = await pool.query(`
      INSERT INTO payments (loan_id, amount, method, payment_date)
      VALUES ($1, $2, 'test', CURRENT_TIMESTAMP)
      RETURNING id
    `, [loan_id, amount]);
    
    // Try to update a loan installment with decimal values
    const updateResult = await pool.query(`
      UPDATE loan_installments 
      SET capital_paid = $1, interest_paid = $2, penalty_paid = $3
      WHERE loan_id = $4 AND week_number = 1
      RETURNING id, capital_paid, interest_paid, penalty_paid
    `, [parseFloat(amount.toFixed(2)), parseFloat((amount * 0.1).toFixed(2)), parseFloat((amount * 0.05).toFixed(2)), loan_id]);
    
    res.json({
      success: true,
      payment_id: result.rows[0]?.id,
      installment_update: updateResult.rows[0],
      message: "Test payment insert successful"
    });
  } catch (err) {
    console.error("Test payment insert error:", err);
    res.status(500).json({ 
      success: false,
      message: "Test payment insert failed", 
      error: err.message,
      errorCode: err.code
    });
  }
});
// Debug endpoint to check loan installment data
app.get("/debug-loan/:loan_id", async (req, res) => {
  try {
    const { loan_id } = req.params;
    
    // Get loan details
    const loanResult = await pool.query(`
      SELECT l.*, c.first_name, c.last_name, c.email, c.phone 
      FROM loans l 
      JOIN customers c ON l.customer_id = c.id 
      WHERE l.id = $1
    `, [loan_id]);
    
    if (!loanResult.rows.length) {
      return res.status(404).json({ message: "Loan not found" });
    }
    
    const loan = loanResult.rows[0];
    
    // Get loan installments with payment data
    const installmentsResult = await pool.query(`
      SELECT 
        id, loan_id, week_number, due_date, amount_due, 
        capital_portion, interest_portion, penalty_applied, 
        status, created_at,
        COALESCE(capital_paid, 0) as capital_paid,
        COALESCE(interest_paid, 0) as interest_paid,
        COALESCE(penalty_paid, 0) as penalty_paid,
        (COALESCE(capital_paid, 0) + COALESCE(interest_paid, 0) + COALESCE(penalty_paid, 0)) as total_paid
      FROM loan_installments 
      WHERE loan_id = $1 
      ORDER BY week_number ASC
    `, [loan_id]);
    
    // Get payments for this loan
    const paymentsResult = await pool.query(`
      SELECT * FROM payments 
      WHERE loan_id = $1 
      ORDER BY payment_date DESC
    `, [loan_id]);
    
    // Calculate totals
    const totalPaid = paymentsResult.rows.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalDue = installmentsResult.rows.reduce((sum, i) => sum + parseFloat(i.amount_due) + parseFloat(i.penalty_applied || 0), 0);
    const totalPenalties = installmentsResult.rows.reduce((sum, i) => sum + parseFloat(i.penalty_applied || 0), 0);
    const totalInterest = installmentsResult.rows.reduce((sum, i) => sum + parseFloat(i.interest_portion), 0);
    const totalCapital = installmentsResult.rows.reduce((sum, i) => sum + parseFloat(i.capital_portion), 0);
    
    res.json({
      loan: loan,
      loan_id: parseInt(loan_id),
      installments: installmentsResult.rows,
      payments: paymentsResult.rows,
      totals: {
        totalPaid,
        totalDue,
        totalPenalties,
        totalInterest,
        totalCapital,
        remainingBalance: parseFloat(loan.amount) - totalPaid + totalPenalties,
        originalAmount: parseFloat(loan.amount)
      },
      total_installments: installmentsResult.rows.length,
      total_payments: paymentsResult.rows.length
    });
  } catch (err) {
    console.error("Debug loan error:", err);
    res.status(500).json({ 
      message: "Error debugging loan", 
      error: err.message 
    });
  }
});

// Balance Sheet endpoint - Generate balance sheet from actual ledger data
app.get("/accounting/balance-sheet", authenticateToken, async (req, res) => {
  try {
    const { start, end } = req.query;
    
    // Validate date parameters
    if (!start || !end) {
      return res.status(400).json({ message: "Start and end dates are required" });
    }
    
    console.log(`📊 Generating balance sheet from ${start} to ${end}`);
    
    // Get only balance sheet accounts (exclude income statement accounts)
    const result = await pool.query(`
      SELECT 
        c.code,
        c.name,
        c.type,
        c.group_name,
        COALESCE(SUM(j.debit), 0) AS debit,
        COALESCE(SUM(j.credit), 0) AS credit,
        (COALESCE(SUM(j.debit), 0) - COALESCE(SUM(j.credit), 0)) AS balance
      FROM chart_of_accounts c
      LEFT JOIN journal_entries j ON j.account_code = c.code AND j.date BETWEEN $1 AND $2
      WHERE 
        -- Only include balance sheet accounts
        (c.type IN ('ACTIVO', 'PASIVO', 'CAPITAL') OR 
         c.group_name IN ('ACTIVO', 'PASIVO', 'CAPITAL', 'ACTIVO CIRCULANTE', 'ACTIVO NO CIRCULANTE', 'PASIVO CIRCULANTE', 'CAPITAL CONTABLE'))
        AND
        -- Exclude income statement accounts (expenses, costs, revenue)
        c.name NOT LIKE '%COGS%' 
        AND c.name NOT LIKE '%Costo%'
        AND c.name NOT LIKE '%Gasto%'
        AND c.name NOT LIKE '%Expense%'
        AND c.name NOT LIKE '%Ingreso%'
        AND c.name NOT LIKE '%Revenue%'
        AND c.name NOT LIKE '%Agua%'
        AND c.name NOT LIKE '%Buró%'
        AND c.name NOT LIKE '%Flyers%'
        AND c.name NOT LIKE '%Teléfonos Vendidos%'
      GROUP BY c.code, c.name, c.type, c.group_name
      ORDER BY c.code
    `, [start, end]);
    
    console.log(`📊 Found ${result.rows.length} accounts in ledger`);
    
    // Initialize balance sheet structure
    const balanceSheet = {
      ACTIVO: {
        accounts: []
      },
      PASIVO: {
        accounts: []
      },
      CAPITAL: {
        accounts: []
      }
    };
    
    // Process each account and categorize based on account type
    result.rows.forEach(account => {
      const balance = parseFloat(account.balance) || 0;
      const absoluteBalance = Math.abs(balance);
      
      // Determine the category based on account type and group
      let category = 'CAPITAL'; // default
      
      if (account.type === 'ACTIVO' || account.group_name === 'ACTIVO' || account.group_name === 'ACTIVO CIRCULANTE' || account.group_name === 'ACTIVO NO CIRCULANTE') {
        category = 'ACTIVO';
      } else if (account.type === 'PASIVO' || account.group_name === 'PASIVO' || account.group_name === 'PASIVO CIRCULANTE') {
        category = 'PASIVO';
      } else if (account.type === 'CAPITAL' || account.group_name === 'CAPITAL' || account.group_name === 'CAPITAL CONTABLE') {
        category = 'CAPITAL';
      }
      
      // Add account to appropriate category
      balanceSheet[category].accounts.push({
        label: account.name,
        value: absoluteBalance,
        code: account.code,
        originalBalance: balance
      });
    });
    
    // Sort accounts within each category
    balanceSheet.ACTIVO.accounts.sort((a, b) => {
      const priority = ["Fondo Fijo de Caja", "Cuenta Bancaria", "Inventario", "Cuentas por Cobrar"];
      const aIdx = priority.indexOf(a.label);
      const bIdx = priority.indexOf(b.label);
      if (aIdx === -1 && bIdx === -1) return a.label.localeCompare(b.label);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
    
    balanceSheet.PASIVO.accounts.sort((a, b) => {
      const priority = ["Cuentas por Pagar", "Préstamos Bancarios"];
      const aIdx = priority.indexOf(a.label);
      const bIdx = priority.indexOf(b.label);
      if (aIdx === -1 && bIdx === -1) return a.label.localeCompare(b.label);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
    
    balanceSheet.CAPITAL.accounts.sort((a, b) => {
      const priority = ["Capital Social", "Utilidades Retenidas", "Aportaciones de Capital"];
      const aIdx = priority.indexOf(a.label);
      const bIdx = priority.indexOf(b.label);
      if (aIdx === -1 && bIdx === -1) return a.label.localeCompare(b.label);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
    
    // Calculate totals
    const totalAssets = balanceSheet.ACTIVO.accounts.reduce((sum, acc) => sum + acc.value, 0);
    const totalLiabilities = balanceSheet.PASIVO.accounts.reduce((sum, acc) => sum + acc.value, 0);
    const totalCapital = balanceSheet.CAPITAL.accounts.reduce((sum, acc) => sum + acc.value, 0);
    
    // Calculate control (Assets - Liabilities - Capital)
    const control = totalAssets - totalLiabilities - totalCapital;
    
    console.log(`📊 Balance sheet generated: Assets: $${totalAssets}, Liabilities: $${totalLiabilities}, Capital: $${totalCapital}, Control: $${control}`);
    console.log(`📊 Account breakdown:`, {
      assets: balanceSheet.ACTIVO.accounts.map(a => `${a.label}: $${a.value}`),
      liabilities: balanceSheet.PASIVO.accounts.map(a => `${a.label}: $${a.value}`),
      capital: balanceSheet.CAPITAL.accounts.map(a => `${a.label}: $${a.value}`)
    });
    
    res.json({
      balanceSheet,
      totals: {
        totalAssets,
        totalLiabilities,
        totalCapital,
        control
      },
      period: {
        start,
        end
      },
      ledgerAccounts: result.rows.length
    });
    
  } catch (err) {
    console.error("Error generating balance sheet:", err);
    res.status(500).json({ message: "Error generating balance sheet" });
  }
});

// Helper function to get account labels
function getAccountLabel(type) {
  const labels = {
    cash: "Fondo Fijo de Caja",
    bank: "Cuenta Bancaria",
    inventory: "Inventario",
    accounts_receivable: "Cuentas por Cobrar",
    accounts_payable: "Cuentas por Pagar",
    loans_payable: "Préstamos por Pagar",
    taxes_payable: "Impuestos por Pagar",
    capital: "Capital Social",
    retained_earnings: "Utilidades Retenidas",
    owner_equity: "Capital del Propietario"
  };
  return labels[type] || type;
}

// ===== COMPREHENSIVE ACCOUNTING AUDIT ENDPOINTS =====

// Get all journal entries for accounting audit
app.get("/accounting/journal-entries", authenticateToken, async (req, res) => {
  try {
    const { search, account_code, source_type, start_date, end_date, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        j.id,
        j.date,
        j.description,
        j.account_code,
        j.debit,
        j.credit,
        j.source_type,
        j.created_by,
        j.created_at,
        c.name as account_name,
        c.type as account_type,
        c.group_name as account_group
      FROM journal_entries j
      LEFT JOIN chart_of_accounts c ON j.account_code = c.code
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Add search filter
    if (search) {
      paramCount++;
      query += ` AND (j.description ILIKE $${paramCount} OR c.name ILIKE $${paramCount} OR j.source_type ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    // Add account filter
    if (account_code && account_code !== 'all') {
      paramCount++;
      query += ` AND j.account_code = $${paramCount}`;
      params.push(account_code);
    }
    
    // Add source filter
    if (source_type && source_type !== 'all') {
      paramCount++;
      query += ` AND j.source_type = $${paramCount}`;
      params.push(source_type);
    }
    
    // Add date range filter
    if (start_date && end_date) {
      paramCount++;
      query += ` AND j.date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(start_date, end_date);
    }
    
    query += ` ORDER BY j.date DESC, j.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    
    console.log(`📊 Retrieved ${result.rows.length} journal entries for audit`);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching journal entries:", err);
    res.status(500).json({ message: "Error fetching journal entries" });
  }
});

// Get chart of accounts for filtering
app.get("/accounting/chart-of-accounts", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        code,
        name,
        type,
        group_name
      FROM chart_of_accounts
      ORDER BY code
    `);
    
    console.log(`📊 Retrieved ${result.rows.length} accounts from chart_of_accounts`);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching chart of accounts:", err);
    res.status(500).json({ message: "Error fetching chart of accounts" });
  }
});

// Get accounting analytics for charts and trends
app.get("/accounting/analytics", authenticateToken, async (req, res) => {
  try {
    const { period = '30' } = req.query; // Default to last 30 days
    
    // Get movement trends by date
    const movementTrendResult = await pool.query(`
      SELECT 
        DATE(j.date) as date,
        COUNT(*) as count,
        SUM(COALESCE(j.debit, 0)) as total_debits,
        SUM(COALESCE(j.credit, 0)) as total_credits
      FROM journal_entries j
      WHERE j.date >= CURRENT_DATE - INTERVAL '${period} days'
      GROUP BY DATE(j.date)
      ORDER BY date DESC
      LIMIT ${period}
    `);
    
    // Get source distribution
    const sourceDistributionResult = await pool.query(`
      SELECT 
        source_type,
        COUNT(*) as count,
        SUM(COALESCE(debit, 0) + COALESCE(credit, 0)) as total_amount
      FROM journal_entries
      WHERE date >= CURRENT_DATE - INTERVAL '${period} days'
      GROUP BY source_type
      ORDER BY total_amount DESC
    `);
    
    // Get account activity
    const accountActivityResult = await pool.query(`
      SELECT 
        c.name as account_name,
        c.code as account_code,
        COUNT(j.id) as entry_count,
        SUM(COALESCE(j.debit, 0)) as total_debits,
        SUM(COALESCE(j.credit, 0)) as total_credits,
        (SUM(COALESCE(j.debit, 0)) - SUM(COALESCE(j.credit, 0))) as net_balance
      FROM chart_of_accounts c
      LEFT JOIN journal_entries j ON c.code = j.account_code 
        AND j.date >= CURRENT_DATE - INTERVAL '${period} days'
      GROUP BY c.code, c.name
      HAVING COUNT(j.id) > 0
      ORDER BY entry_count DESC
      LIMIT 20
    `);
    
    console.log(`📊 Generated analytics for last ${period} days`);
    
    res.json({
      movementTrend: movementTrendResult.rows,
      sourceDistribution: sourceDistributionResult.rows,
      accountActivity: accountActivityResult.rows,
      period: parseInt(period)
    });
  } catch (err) {
    console.error("Error generating accounting analytics:", err);
    res.status(500).json({ message: "Error generating accounting analytics" });
  }
});

// Get detailed entry information for audit trail
app.get("/accounting/entries/:entryId", authenticateToken, async (req, res) => {
  try {
    const { entryId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        j.*,
        c.account_name,
        c.account_type,
        c.parent_account_id as account_group,
        c.description as account_description
      FROM journal_entries j
      LEFT JOIN chart_of_accounts c ON j.account_code = c.account_code
      WHERE j.id = $1
    `, [entryId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Entry not found" });
    }
    
    const entry = result.rows[0];
    
    // Get related entries (same source)
    const relatedEntriesResult = await pool.query(`
      SELECT 
        j.id,
        j.date,
        j.description,
        j.account_code,
        j.debit,
        j.credit,
        c.name as account_name
      FROM journal_entries j
      LEFT JOIN chart_of_accounts c ON j.account_code = c.account_code
      WHERE j.source_type = $1 AND j.source_id = $2 AND j.id != $3
      ORDER BY j.date DESC
    `, [entry.source_type, entry.source_id, entryId]);
    
    console.log(`📊 Retrieved detailed entry ${entryId} with ${relatedEntriesResult.rows.length} related entries`);
    
    res.json({
      entry,
      relatedEntries: relatedEntriesResult.rows
    });
  } catch (err) {
    console.error("Error fetching entry details:", err);
    res.status(500).json({ message: "Error fetching entry details" });
  }
});

// Bulk inventory request endpoint
app.post("/inventory-requests/bulk", authenticateToken, async (req, res) => {
  try {
    const { category, supplier, expected_delivery, notes, priority, amount, items } = req.body;
    const requester_id = req.user.id;
    
    // Validate required fields
    if (!category || !amount || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    // Create the main inventory request
    const result = await pool.query(`
      INSERT INTO inventory_requests (requester_id, category, amount, notes, priority, supplier, expected_delivery, approval_required, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'pending')
      RETURNING *
    `, [requester_id, category, amount, notes, priority, supplier, expected_delivery]);
    
    const requestId = result.rows[0].id;
    
    // Create inventory items for each item in the bulk request
    for (const item of items) {
      await pool.query(`
        INSERT INTO inventory_items (request_id, category, brand, model, color, ram, storage, quantity, purchase_price, sale_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        requestId,
        item.category,
        item.brand,
        item.model,
        item.color,
        item.ram,
        item.storage,
        item.quantity,
        item.purchase_price,
        item.sale_price
      ]);
    }
    
    res.status(201).json({ 
      message: "Bulk inventory request created successfully", 
      request: result.rows[0],
      items_count: items.length
    });
    
  } catch (err) {
    console.error("Error creating bulk inventory request:", err);
    res.status(500).json({ message: "Error creating bulk inventory request" });
  }
});

// ==============================================================================
// WATER INVENTORY MANAGEMENT ENDPOINTS
// ==============================================================================

// Get water tanks with details
app.get("/water-tanks", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        wt.id,
        wt.tank_id,
        wtt.name as tank_type,
        wt.status,
        wt.condition,
        wt.purchase_price,
        wt.assigned_date,
        CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) as assigned_customer,
        wt.created_at
      FROM water_tanks wt
      JOIN water_tank_types wtt ON wt.tank_type_id = wtt.id
      LEFT JOIN customers c ON wt.assigned_customer_id = c.id
      ORDER BY wt.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching water tanks:", err);
    res.status(500).json({ message: "Error fetching water tanks" });
  }
});

// Get water storage tanks status
app.get("/water-storage", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM water_inventory_summary ORDER BY tank_name");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching water storage:", err);
    res.status(500).json({ message: "Error fetching water storage" });
  }
});

// Get tank types
app.get("/tank-types", async (req, res) => {
  try {
    console.log("📦 Fetching tank types...");
    const result = await pool.query("SELECT * FROM tank_types ORDER BY name");
    console.log(`✅ Found ${result.rows.length} tank types:`, result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching tank types:", err);
    res.status(500).json({ message: "Error fetching tank types" });
  }
});

// Get suppliers
app.get("/water-suppliers", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM suppliers WHERE status = 'active' ORDER BY supplier_type, name");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching suppliers:", err);
    res.status(500).json({ message: "Error fetching suppliers" });
  }
});

// Add new water tank
app.post("/water-tanks", authenticateToken, async (req, res) => {
  const { tank_type_id, purchase_price, condition, notes } = req.body;
  
  try {
    // Generate automatic tank ID
    const lastTankResult = await pool.query(`
      SELECT tank_id FROM water_tanks 
      WHERE tank_id ~ '^GAR[0-9]+$' 
      ORDER BY CAST(SUBSTRING(tank_id FROM 4) AS INTEGER) DESC 
      LIMIT 1
    `);
    
    let nextNumber = 1;
    if (lastTankResult.rows.length > 0) {
      const lastId = lastTankResult.rows[0].tank_id;
      const lastNumber = parseInt(lastId.substring(3));
      nextNumber = lastNumber + 1;
    }
    
    const newTankId = `GAR${nextNumber.toString().padStart(3, '0')}`;
    
    const result = await pool.query(`
      INSERT INTO water_tanks (tank_id, tank_type_id, purchase_date, purchase_price, condition, status)
      VALUES ($1, $2, CURRENT_DATE, $3, $4, 'available')
      RETURNING *
    `, [newTankId, tank_type_id, purchase_price, condition || 'new']);
    
    // Log the tank addition in history
    await pool.query(`
      INSERT INTO tank_history (tank_id, action, notes, created_by)
      VALUES ($1, 'purchased', $2, $3)
    `, [result.rows[0].id, notes || `Tank ${newTankId} purchased and added to inventory`, req.user.id]);
    
    res.json({ message: "Tank added successfully", tank: result.rows[0] });
  } catch (err) {
    console.error("Error adding water tank:", err);
    res.status(500).json({ message: "Error adding water tank" });
  }
});

// Record water purchase
app.post("/water-purchase", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { volume_liters, storage_tank_id, supplier_id, price_per_liter, invoice_number, notes } = req.body;
    const total_cost = parseFloat(volume_liters) * parseFloat(price_per_liter);
    
    // Record the water movement
    const result = await client.query(`
      INSERT INTO water_movements (
        movement_type, volume_liters, storage_tank_id, supplier_id, 
        purchase_price_per_liter, total_cost, supplier_invoice_number, 
        notes, created_by
      )
      VALUES ('purchase', $1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [volume_liters, storage_tank_id, supplier_id, price_per_liter, total_cost, invoice_number, notes, req.user.id]);
    
    const waterAccount = '1105'; // Water Inventory (Main Tanks)
    const payableAccount = '2101'; // Cuentas por Pagar
    
    // Debit: Water Inventory (we received water in main tank)
    const debitEntry = await client.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
      VALUES (CURRENT_DATE, $1, $2, $3, 0, 'water_purchase', $4, $5)
      RETURNING id
    `, [`Compra de agua - ${invoice_number || 'Sin factura'}`, waterAccount, total_cost, result.rows[0].id, req.user.id]);
    
    // Credit: Accounts Payable (we owe supplier)
    await client.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
      VALUES (CURRENT_DATE, $1, $2, 0, $3, 'water_purchase', $4, $5)
    `, [`Compra de agua - ${invoice_number || 'Sin factura'}`, payableAccount, total_cost, result.rows[0].id, req.user.id]);
    
    // Record inventory movement
    await client.query(`
      INSERT INTO inventory_movements (
        movement_type, category, item_description, quantity, unit_cost, total_cost,
        source_type, source_id, to_location, account_code, journal_entry_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      'purchase', 'water_raw', `Compra de agua - ${invoice_number}`, volume_liters,
      price_per_liter, total_cost, 'water_purchase', result.rows[0].id, 'main_tank',
      waterAccount, debitEntry.rows[0].id, req.user.id
    ]);
    
    // Update water storage
    await client.query(`
      UPDATE water_storage
      SET current_liters = current_liters + $1
      WHERE tank_id = $2
    `, [volume_liters, storage_tank_id]);
    
    await client.query('COMMIT');
    
    console.log(`✅ Water purchase posted: ${volume_liters}L @ $${price_per_liter}/L = $${total_cost}`);
    res.json({ message: "Water purchase recorded successfully", movement: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error recording water purchase:", err);
    res.status(500).json({ message: "Error recording water purchase", error: err.message });
  } finally {
    client.release();
  }
});

// Transfer water from main tank to garrafones (fill garrafones)
app.post("/water-transfer", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { tank_ids, storage_tank_id, liters_per_tank } = req.body; // Array of garrafon IDs to fill
    
    if (!Array.isArray(tank_ids) || tank_ids.length === 0) {
      throw new Error("No tanks specified for filling");
    }
    
    const totalLiters = tank_ids.length * liters_per_tank;
    
    // Check if enough water in main tank
    const storageResult = await client.query(`
      SELECT current_liters, unit_cost_per_liter FROM water_storage WHERE tank_id = $1
    `, [storage_tank_id]);
    
    if (storageResult.rows.length === 0 || storageResult.rows[0].current_liters < totalLiters) {
      throw new Error(`Not enough water in main tank. Need ${totalLiters}L, have ${storageResult.rows[0]?.current_liters || 0}L`);
    }
    
    const waterCostPerLiter = storageResult.rows[0].unit_cost_per_liter || 0.50;
    const totalTransferCost = totalLiters * waterCostPerLiter;
    
    // Deduct water from main storage tank
    await client.query(`
      UPDATE water_storage 
      SET current_liters = current_liters - $1
      WHERE tank_id = $2
    `, [totalLiters, storage_tank_id]);
    
    // Update garrafones to "filled" status
    await client.query(`
      UPDATE water_tanks 
      SET status = 'available', fill_date = CURRENT_TIMESTAMP, water_liters = $1
      WHERE id = ANY($2)
    `, [liters_per_tank, tank_ids]);
    
    // Create accounting entries (internal transfer between inventory accounts)
    const garrafonAccount = '1104'; // Garrafones Inventory
    const waterRawAccount = '1105'; // Water Inventory (Main Tanks)
    
    // Debit: Garrafones Inventory (water moved to garrafones)
    const debitEntry = await client.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
      VALUES (CURRENT_DATE, $1, $2, $3, 0, 'water_transfer', $4, $5)
      RETURNING id
    `, [`Transferencia de agua a garrafones (${tank_ids.length} unidades)`, garrafonAccount, totalTransferCost, storage_tank_id, req.user.id]);
    
    // Credit: Water Inventory (water removed from main tank)
    await client.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
      VALUES (CURRENT_DATE, $1, $2, 0, $3, 'water_transfer', $4, $5)
    `, [`Transferencia de agua a garrafones (${tank_ids.length} unidades)`, waterRawAccount, totalTransferCost, storage_tank_id, req.user.id]);
    
    // Record inventory movement
    await client.query(`
      INSERT INTO inventory_movements (
        movement_type, category, item_description, quantity, unit_cost, total_cost,
        source_type, source_id, from_location, to_location, account_code, journal_entry_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      'transfer', 'water_filled_garrafones', `Llenado de ${tank_ids.length} garrafones`,
      totalLiters, waterCostPerLiter, totalTransferCost, 'water_fill', storage_tank_id,
      'main_tank', 'garrafones_warehouse', garrafonAccount, debitEntry.rows[0].id, req.user.id
    ]);
    
    await client.query('COMMIT');
    
    console.log(`✅ Water transfer completed: ${totalLiters}L transferred to ${tank_ids.length} garrafones`);
    res.json({ message: "Water transfer completed successfully", tanks_filled: tank_ids.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error transferring water:", err);
    res.status(500).json({ message: "Error transferring water", error: err.message });
  } finally {
    client.release();
  }
});

// Assign tank to customer
app.put("/water-tanks/:tank_id/assign", authenticateToken, async (req, res) => {
  const { tank_id } = req.params;
  const { customer_id, notes } = req.body;
  
  try {
    const result = await pool.query(`
      UPDATE water_tanks 
      SET assigned_customer_id = $1, assigned_date = CURRENT_TIMESTAMP, status = 'assigned'
      WHERE id = $2
      RETURNING *
    `, [customer_id, tank_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Tank not found" });
    }
    
    // Log the assignment in history
    await pool.query(`
      INSERT INTO tank_history (tank_id, action, customer_id, notes, created_by)
      VALUES ($1, 'assigned', $2, $3, $4)
    `, [tank_id, customer_id, notes || 'Tank assigned to customer', req.user.id]);
    
    res.json({ message: "Tank assigned successfully", tank: result.rows[0] });
  } catch (err) {
    console.error("Error assigning tank:", err);
    res.status(500).json({ message: "Error assigning tank" });
  }
});

// Get tank status summary
app.get("/tank-status-summary", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tank_status_summary ORDER BY tank_type");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching tank status summary:", err);
    res.status(500).json({ message: "Error fetching tank status summary" });
  }
});

// ==============================================================================
// QR CODE MANAGEMENT
// ==============================================================================

// Get QR code for a specific tank
app.get("/water-tanks/:tank_id/qr", authenticateToken, async (req, res) => {
  try {
    const { tank_id } = req.params;
    
    const result = await pool.query(`
      SELECT tank_id, qr_code, qr_generated_at 
      FROM water_tanks 
      WHERE tank_id = $1 OR id = $2
    `, [tank_id, tank_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Tank not found" });
    }
    
    const tank = result.rows[0];
    
    // If QR code doesn't exist, generate it now
    if (!tank.qr_code) {
      const qrData = JSON.stringify({
        tank_id: tank.tank_id,
        tank_number: tank.tank_id,
        company: 'PURIFICADORA CUENCA AZUL'
      });
      
      const qrCodeImage = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2
      });
      
      // Update tank with QR code
      await pool.query(`
        UPDATE water_tanks 
        SET qr_code = $1, qr_generated_at = CURRENT_TIMESTAMP
        WHERE tank_id = $2
      `, [qrCodeImage, tank.tank_id]);
      
      tank.qr_code = qrCodeImage;
    }
    
    res.json({ tank_id: tank.tank_id, qr_code: tank.qr_code });
  } catch (err) {
    console.error("Error fetching QR code:", err);
    res.status(500).json({ message: "Error fetching QR code" });
  }
});

// Get all tanks with QR codes for printing
app.get("/water-tanks/qr-codes/batch", authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `SELECT tank_id, qr_code, status FROM water_tanks WHERE qr_code IS NOT NULL`;
    const params = [];
    
    if (status) {
      query += ` AND status = $1`;
      params.push(status);
    }
    
    query += ` ORDER BY tank_id`;
    
    const result = await pool.query(query, params);
    
    console.log(`🏷️ Retrieved ${result.rows.length} QR codes for printing`);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching QR codes:", err);
    res.status(500).json({ message: "Error fetching QR codes" });
  }
});

// Scan QR code and get tank info
app.post("/qr-scan", authenticateToken, async (req, res) => {
  try {
    const { qr_data } = req.body;
    
    let tankId;
    
    // Try to parse as JSON first, if fails treat as simple tank ID
    try {
      const data = JSON.parse(qr_data);
      tankId = data.tank_id || data.tank_number;
    } catch (parseErr) {
      // Not JSON, treat as simple tank ID string
      tankId = qr_data.trim();
    }
    
    console.log(`🔍 Scanning for tank: ${tankId}`);
    
    // Get full tank information
    const result = await pool.query(`
      SELECT 
        wt.*,
        tt.name as tank_type_name,
        c.first_name || ' ' || c.last_name as customer_name
      FROM water_tanks wt
      LEFT JOIN tank_types tt ON wt.tank_type_id = tt.id
      LEFT JOIN customers c ON wt.assigned_customer_id = c.id
      WHERE wt.tank_id = $1
    `, [tankId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Tank not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error processing QR scan:", err);
    res.status(500).json({ message: "Error processing QR scan", error: err.message });
  }
});

// Mark tank as filled
app.post("/water-tanks/:tank_id/fill", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { tank_id } = req.params;
    const { storage_tank_id, liters = 20 } = req.body;
    
    // Update tank as filled and ready
    await client.query(`
      UPDATE water_tanks 
      SET water_liters = $1, fill_date = CURRENT_TIMESTAMP, status = 'listo_para_entrega'
      WHERE tank_id = $2
    `, [liters, tank_id]);
    
    // Deduct water from storage (if storage_tank_id provided)
    if (storage_tank_id) {
      await client.query(`
        UPDATE water_storage
        SET current_liters = current_liters - $1
        WHERE tank_id = $2
      `, [liters, storage_tank_id]);
    }
    
    await client.query('COMMIT');
    
    console.log(`✅ Tank ${tank_id} filled with ${liters}L`);
    res.json({ message: "Tank filled successfully" });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error filling tank:", err);
    res.status(500).json({ message: "Error filling tank", error: err.message });
  } finally {
    client.release();
  }
});

// Mark tank as ready for collection (customer has empty garrafón)
app.post("/water-tanks/:tank_id/mark-for-collection", authenticateToken, async (req, res) => {
  try {
    const { tank_id } = req.params;
    
    const result = await pool.query(`
      UPDATE water_tanks 
      SET status = 'pendiente_recoleccion', water_liters = 0
      WHERE tank_id = $1
      RETURNING *
    `, [tank_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Tank not found" });
    }
    
    console.log(`↩️ Tank ${tank_id} marked for collection`);
    res.json({ message: "Tank marked for collection", tank: result.rows[0] });
  } catch (err) {
    console.error("Error marking tank for collection:", err);
    res.status(500).json({ message: "Error marking tank for collection" });
  }
});

// Mark tank as collected and returned to warehouse
app.post("/water-tanks/:tank_id/mark-returned", authenticateToken, async (req, res) => {
  try {
    const { tank_id } = req.params;
    
    const result = await pool.query(`
      UPDATE water_tanks 
      SET status = 'limpieza'
      WHERE tank_id = $1 AND status = 'en_recoleccion'
      RETURNING *
    `, [tank_id]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Tank not found or not in collection status" });
    }
    
    console.log(`✅ Tank ${tank_id} returned - moved to cleaning`);
    res.json({ message: "Tank returned to warehouse", tank: result.rows[0] });
  } catch (err) {
    console.error("Error marking tank as returned:", err);
    res.status(500).json({ message: "Error marking tank as returned" });
  }
});

// Mark tank as cleaned and ready to use again
app.post("/water-tanks/:tank_id/mark-cleaned", authenticateToken, async (req, res) => {
  try {
    const { tank_id } = req.params;
    
    const result = await pool.query(`
      UPDATE water_tanks 
      SET status = 'disponible', water_liters = 0
      WHERE tank_id = $1 AND status = 'limpieza'
      RETURNING *
    `, [tank_id]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Tank not found or not in cleaning status" });
    }
    
    console.log(`🧽 Tank ${tank_id} cleaned - back to disponible`);
    res.json({ message: "Tank cleaned and available", tank: result.rows[0] });
  } catch (err) {
    console.error("Error marking tank as cleaned:", err);
    res.status(500).json({ message: "Error marking tank as cleaned" });
  }
});

// Update tank status via QR scan
app.post("/qr-update-status", authenticateToken, async (req, res) => {
  try {
    const { tank_id, new_status, notes } = req.body;
    
    const result = await pool.query(`
      UPDATE water_tanks 
      SET status = $1
      WHERE tank_id = $2
      RETURNING *
    `, [new_status, tank_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Tank not found" });
    }
    
    console.log(`✅ Tank ${tank_id} status updated to ${new_status}`);
    res.json({ message: "Status updated successfully", tank: result.rows[0] });
  } catch (err) {
    console.error("Error updating tank status:", err);
    res.status(500).json({ message: "Error updating tank status" });
  }
});

// ==============================================================================
// WATER DELIVERY ORDERS API
// ==============================================================================

// Create new order
app.post("/orders", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      customer_id,
      store_id,
      items, // Array of { tank_type, quantity, unit_price }
      delivery_address,
      delivery_instructions,
      scheduled_delivery,
      payment_method,
      notes
    } = req.body;

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Calculate total amount
    const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    // Create order
    const orderResult = await client.query(`
      INSERT INTO orders (
        order_number, customer_id, store_id, total_amount, payment_method,
        delivery_address, delivery_instructions, scheduled_delivery, notes,
        created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
      RETURNING *
    `, [orderNumber, customer_id, store_id, total_amount, payment_method,
        delivery_address, delivery_instructions, scheduled_delivery, notes, req.user.id]);

    const order = orderResult.rows[0];

    // Create order items (don't allocate tanks yet - that happens in preparation)
    for (const item of items) {
      await client.query(`
        INSERT INTO order_items (order_id, tank_type, quantity, unit_price, total_price, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
      `, [order.id, item.tank_type, item.quantity, item.unit_price, item.quantity * item.unit_price]);
    }

    await client.query('COMMIT');
    
    console.log(`✅ Order ${orderNumber} created successfully`);
    res.json({ message: "Order created successfully", order });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error creating order:", err);
    res.status(500).json({ message: "Error creating order", error: err.message });
  } finally {
    client.release();
  }
});

// Get all orders
app.get("/orders", authenticateToken, async (req, res) => {
  try {
    const { status, customer_id, start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        o.*,
        c.first_name || ' ' || c.last_name as customer_name,
        c.phone as customer_phone,
        c.address as customer_address,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
    }
    
    if (customer_id) {
      paramCount++;
      query += ` AND o.customer_id = $${paramCount}`;
      params.push(customer_id);
    }
    
    if (start_date) {
      paramCount++;
      query += ` AND o.created_at >= $${paramCount}`;
      params.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      query += ` AND o.created_at <= $${paramCount}`;
      params.push(end_date);
    }
    
    query += ` ORDER BY o.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    console.log(`📦 Retrieved ${result.rows.length} orders`);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Error fetching orders" });
  }
});

// Get order statistics (MUST come before /orders/:id to avoid route conflict)
app.get("/orders/stats", authenticateToken, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'preparing' THEN 1 END) as preparing_orders,
        COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as in_transit_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END) as pending_payment
      FROM orders
    `);
    
    res.json(stats.rows[0]);
  } catch (err) {
    console.error("Error fetching order stats:", err);
    res.status(500).json({ message: "Error fetching stats" });
  }
});

// Get order details with items
app.get("/orders/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const orderResult = await pool.query(`
      SELECT 
        o.*,
        c.first_name || ' ' || c.last_name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email,
        c.address as customer_address
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `, [id]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    const order = orderResult.rows[0];
    
    // Get order items with allocated tank details
    const itemsResult = await pool.query(`
      SELECT 
        oi.*,
        wt.tank_id as allocated_tank_id,
        wt.status as tank_status,
        wt.condition as tank_condition
      FROM order_items oi
      LEFT JOIN water_tanks wt ON oi.tank_id = wt.id
      WHERE oi.order_id = $1
    `, [id]);
    
    order.items = itemsResult.rows;
    
    // Get all tanks allocated to this order (from junction table)
    if (order.status !== 'pending') {
      const allocatedTanks = await pool.query(`
        SELECT DISTINCT wt.tank_id, wt.status, wt.condition, wt.water_liters
        FROM water_tanks wt
        JOIN order_item_tanks oit ON wt.id = oit.tank_id
        JOIN order_items oi ON oit.order_item_id = oi.id
        WHERE oi.order_id = $1
        ORDER BY wt.tank_id
      `, [id]);
      
      order.allocated_tanks = allocatedTanks.rows;
    }
    
    res.json(order);
  } catch (err) {
    console.error("Error fetching order details:", err);
    res.status(500).json({ message: "Error fetching order details" });
  }
});

// Prepare order (allocate tanks, fill with water)
app.post("/orders/:id/prepare", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { storage_tank_id } = req.body; // Which storage tank to use for water
    
    // Get order items
    const itemsResult = await client.query(`
      SELECT * FROM order_items WHERE order_id = $1 AND status = 'pending'
    `, [id]);
    
    if (itemsResult.rows.length === 0) {
      throw new Error("No pending items to prepare");
    }
    
    for (const item of itemsResult.rows) {
      // Allocate available tanks of this type
      const tanksResult = await client.query(`
        SELECT wt.id, wt.tank_id 
        FROM water_tanks wt
        JOIN water_tank_types wtt ON wt.tank_type_id = wtt.id
        WHERE wt.status = 'available' AND wtt.name = $1
        LIMIT $2
        FOR UPDATE
      `, [item.tank_type, item.quantity]);
      
      if (tanksResult.rows.length < item.quantity) {
        throw new Error(`Not enough available tanks of type ${item.tank_type}. Need ${item.quantity}, have ${tanksResult.rows.length}`);
      }
      
      // Update tanks to "llenando" status (being filled)
      const tankIds = tanksResult.rows.map(t => t.id);
      await client.query(`
        UPDATE water_tanks 
        SET status = 'llenando', assigned_date = CURRENT_TIMESTAMP
        WHERE id = ANY($1)
      `, [tankIds]);
      
      // Update order item status
      await client.query(`
        UPDATE order_items 
        SET tank_id = $1, status = 'allocated', water_liters = $2
        WHERE id = $3
      `, [tankIds[0], item.quantity * 20, item.id]);
      
      // Insert all allocated tanks into junction table
      for (const tankId of tankIds) {
        await client.query(`
          INSERT INTO order_item_tanks (order_item_id, tank_id)
          VALUES ($1, $2)
          ON CONFLICT (order_item_id, tank_id) DO NOTHING
        `, [item.id, tankId]);
      }
      
      // Log which specific tanks were allocated
      console.log(`✅ Allocated ${tankIds.length} tanks for order item ${item.id}: ${tankIds.map(t => tanksResult.rows.find(r => r.id === t)?.tank_id).join(', ')}`);
      
      // Deduct water from storage tank
      const waterNeeded = item.quantity * 20; // Assuming 20L per garrafón
      await client.query(`
        UPDATE water_storage
        SET current_liters = current_liters - $1
        WHERE tank_id = $2
      `, [waterNeeded, storage_tank_id]);
    }
    
    // Update order status
    await client.query(`
      UPDATE orders 
      SET status = 'preparing', prepared_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
    
    await client.query('COMMIT');
    
    console.log(`✅ Order ${id} prepared successfully`);
    res.json({ message: "Order prepared successfully" });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error preparing order:", err);
    res.status(500).json({ message: "Error preparing order", error: err.message });
  } finally {
    client.release();
  }
});

// Ship order (mark as in transit)
app.post("/orders/:id/ship", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { assigned_driver } = req.body;
    
    const result = await client.query(`
      UPDATE orders 
      SET status = 'in_transit', shipped_at = CURRENT_TIMESTAMP, assigned_driver = $1
      WHERE id = $2 AND status = 'preparing'
      RETURNING *
    `, [assigned_driver, id]);
    
    if (result.rows.length === 0) {
      throw new Error("Order not found or not in preparing status");
    }
    
    // Update all allocated tanks to "en_ruta"
    await client.query(`
      UPDATE water_tanks
      SET status = 'en_ruta'
      WHERE id IN (SELECT tank_id FROM order_items WHERE order_id = $1)
    `, [id]);
    
    await client.query('COMMIT');
    
    console.log(`🚚 Order ${id} shipped - tanks now en_ruta`);
    res.json({ message: "Order shipped successfully", order: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error shipping order:", err);
    res.status(500).json({ message: "Error shipping order", error: err.message });
  } finally {
    client.release();
  }
});

// Deliver order (create accounting entries)
app.post("/orders/:id/deliver", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Get order details
    const orderResult = await client.query(`
      SELECT * FROM orders WHERE id = $1 AND status = 'in_transit'
    `, [id]);
    
    if (orderResult.rows.length === 0) {
      throw new Error("Order not found or not in transit");
    }
    
    const order = orderResult.rows[0];
    
    // Update order status
    await client.query(`
      UPDATE orders 
      SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
    
    // Update all allocated tanks to "entregado"
    await client.query(`
      UPDATE water_tanks
      SET status = 'entregado'
      WHERE id IN (SELECT tank_id FROM order_items WHERE order_id = $1)
    `, [id]);
    
    // Create accounting entries for the sale
    const customerAccount = `1103-${order.customer_id.toString().padStart(4, '0')}`;
    const salesAccount = '4000-0001'; // Sales revenue account
    const cogsAccount = '5000-0001'; // Cost of goods sold
    const inventoryAccount = '1104'; // Inventory account
    
    // Debit: Accounts Receivable (Customer owes us)
    await client.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
      VALUES (CURRENT_DATE, $1, $2, $3, 0, 'order_delivery', $4, $5)
    `, [`Venta de agua - Orden ${order.order_number}`, customerAccount, order.total_amount, order.id, req.user.id]);
    
    // Credit: Sales Revenue
    await client.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
      VALUES (CURRENT_DATE, $1, $2, 0, $3, 'order_delivery', $4, $5)
    `, [`Venta de agua - Orden ${order.order_number}`, salesAccount, order.total_amount, order.id, req.user.id]);
    
    // Debit: COGS (cost of inventory)
    const costAmount = order.total_amount * 0.6; // Assume 60% COGS
    await client.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
      VALUES (CURRENT_DATE, $1, $2, $3, 0, 'order_delivery', $4, $5)
    `, [`COGS - Orden ${order.order_number}`, cogsAccount, costAmount, order.id, req.user.id]);
    
    // Credit: Inventory
    await client.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
      VALUES (CURRENT_DATE, $1, $2, 0, $3, 'order_delivery', $4, $5)
    `, [`COGS - Orden ${order.order_number}`, inventoryAccount, costAmount, order.id, req.user.id]);
    
    await client.query('COMMIT');
    
    console.log(`✅ Order ${id} delivered and accounting entries created`);
    res.json({ message: "Order delivered successfully" });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error delivering order:", err);
    res.status(500).json({ message: "Error delivering order", error: err.message });
  } finally {
    client.release();
  }
});

// Record payment for order
app.post("/orders/:id/payment", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { amount, payment_method, reference_number, notes } = req.body;
    
    const orderResult = await client.query(`
      SELECT * FROM orders WHERE id = $1
    `, [id]);
    
    if (orderResult.rows.length === 0) {
      throw new Error("Order not found");
    }
    
    const order = orderResult.rows[0];
    
    // Record customer payment
    const paymentResult = await client.query(`
      INSERT INTO customer_payments (customer_id, order_id, amount, payment_method, reference_number, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [order.customer_id, order.id, amount, payment_method, reference_number, notes, req.user.id]);
    
    // Update order payment status
    await client.query(`
      UPDATE orders 
      SET payment_status = 'paid', paid_at = CURRENT_TIMESTAMP, payment_method = $1
      WHERE id = $2
    `, [payment_method, id]);
    
    // Create accounting entries for payment
    const customerAccount = `1103-${order.customer_id.toString().padStart(4, '0')}`;
    const cashAccount = payment_method === 'transferencia' ? '1102' : '1101';
    
    // Debit: Cash (we receive money)
    await client.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
      VALUES (CURRENT_DATE, $1, $2, $3, 0, 'customer_payment', $4, $5)
    `, [`Pago recibido - Orden ${order.order_number}`, cashAccount, amount, paymentResult.rows[0].id, req.user.id]);
    
    // Credit: Accounts Receivable (customer debt decreases)
    await client.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
      VALUES (CURRENT_DATE, $1, $2, 0, $3, 'customer_payment', $4, $5)
    `, [`Pago recibido - Orden ${order.order_number}`, customerAccount, amount, paymentResult.rows[0].id, req.user.id]);
    
    await client.query('COMMIT');
    
    console.log(`💰 Payment recorded for order ${id}: $${amount} via ${payment_method}`);
    res.json({ message: "Payment recorded successfully", payment: paymentResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error recording payment:", err);
    res.status(500).json({ message: "Error recording payment", error: err.message });
  } finally {
    client.release();
  }
});

// ==============================================================================
// CUSTOMER DEPARTMENTS API
// ==============================================================================

// Get departments for a customer
app.get("/customers/:customer_id/departments", authenticateToken, async (req, res) => {
  try {
    const { customer_id } = req.params;
    const result = await pool.query(`
      SELECT * FROM customer_departments 
      WHERE customer_id = $1 AND is_active = true
      ORDER BY name
    `, [customer_id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching departments:", err);
    res.status(500).json({ message: "Error fetching departments" });
  }
});

// Create department for a customer
app.post("/customers/:customer_id/departments", authenticateToken, async (req, res) => {
  try {
    const { customer_id } = req.params;
    const { name, contact_person, contact_phone, delivery_address, floor_building, notes } = req.body;
    
    const result = await pool.query(`
      INSERT INTO customer_departments (customer_id, name, contact_person, contact_phone, delivery_address, floor_building, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [customer_id, name, contact_person, contact_phone, delivery_address, floor_building, notes]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating department:", err);
    res.status(500).json({ message: "Error creating department" });
  }
});

// Update department
app.put("/departments/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_person, contact_phone, delivery_address, floor_building, notes, tanks_on_site } = req.body;
    
    const result = await pool.query(`
      UPDATE customer_departments 
      SET name = COALESCE($1, name),
          contact_person = COALESCE($2, contact_person),
          contact_phone = COALESCE($3, contact_phone),
          delivery_address = COALESCE($4, delivery_address),
          floor_building = COALESCE($5, floor_building),
          notes = COALESCE($6, notes),
          tanks_on_site = COALESCE($7, tanks_on_site)
      WHERE id = $8
      RETURNING *
    `, [name, contact_person, contact_phone, delivery_address, floor_building, notes, tanks_on_site, id]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating department:", err);
    res.status(500).json({ message: "Error updating department" });
  }
});

// Delete department (soft delete)
app.delete("/departments/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE customer_departments SET is_active = false WHERE id = $1`, [id]);
    res.json({ message: "Department deleted" });
  } catch (err) {
    console.error("Error deleting department:", err);
    res.status(500).json({ message: "Error deleting department" });
  }
});

// ==============================================================================
// DELIVERY CONFIRMATION API
// ==============================================================================

// Confirm delivery with signature
app.post("/orders/:id/confirm-delivery", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { 
      confirmations, // Array of { department_id, department_name, receiver_name, receiver_position, receiver_id_number, signature_data, tanks_delivered, tanks_collected, delivery_notes }
    } = req.body;
    
    // Get order details
    const orderResult = await client.query(`
      SELECT o.*, c.first_name, c.last_name 
      FROM orders o 
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1 AND o.status = 'in_transit'
    `, [id]);
    
    if (orderResult.rows.length === 0) {
      throw new Error("Order not found or not in transit");
    }
    
    const order = orderResult.rows[0];
    let totalDelivered = 0;
    let totalCollected = 0;
    
    // Create confirmation records for each department
    for (const conf of confirmations) {
      await client.query(`
        INSERT INTO delivery_confirmations 
        (order_id, department_id, receiver_name, receiver_position, receiver_id_number, 
         signature_data, tanks_delivered, tanks_collected, delivery_notes, confirmed_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [id, conf.department_id, conf.receiver_name, conf.receiver_position, 
          conf.receiver_id_number, conf.signature_data, conf.tanks_delivered, 
          conf.tanks_collected, conf.delivery_notes, req.user.id]);
      
      totalDelivered += conf.tanks_delivered || 0;
      totalCollected += conf.tanks_collected || 0;
      
      // Update department tanks_on_site
      if (conf.department_id) {
        await client.query(`
          UPDATE customer_departments 
          SET tanks_on_site = tanks_on_site + $1 - $2
          WHERE id = $3
        `, [conf.tanks_delivered || 0, conf.tanks_collected || 0, conf.department_id]);
      }
      
      // Create tank return records for collected tanks
      if (conf.tanks_collected > 0) {
        await client.query(`
          INSERT INTO tank_returns (customer_id, department_id, order_id, status, collected_date, collected_by, notes)
          VALUES ($1, $2, $3, 'collected', CURRENT_TIMESTAMP, $4, $5)
        `, [order.customer_id, conf.department_id, id, req.user.id, `Collected ${conf.tanks_collected} tanks`]);
      }
    }
    
    // Update order status to delivered
    await client.query(`
      UPDATE orders 
      SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
    
    // Update allocated tanks status
    await client.query(`
      UPDATE water_tanks
      SET status = 'entregado', assigned_customer_id = $1
      WHERE id IN (SELECT tank_id FROM order_items WHERE order_id = $2 AND tank_id IS NOT NULL)
    `, [order.customer_id, id]);
    
    // Create accounting entries for the sale
    const customerAccount = `1103-${order.customer_id.toString().padStart(4, '0')}`;
    const salesAccount = '4000-0001';
    const cogsAccount = '5000-0001';
    const inventoryAccount = '1104';
    
    await client.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
      VALUES (CURRENT_DATE, $1, $2, $3, 0, 'order_delivery', $4, $5)
    `, [`Venta de agua - Orden ${order.order_number}`, customerAccount, order.total_amount, order.id, req.user.id]);
    
    await client.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
      VALUES (CURRENT_DATE, $1, $2, 0, $3, 'order_delivery', $4, $5)
    `, [`Venta de agua - Orden ${order.order_number}`, salesAccount, order.total_amount, order.id, req.user.id]);
    
    const costAmount = order.total_amount * 0.6;
    await client.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
      VALUES (CURRENT_DATE, $1, $2, $3, 0, 'order_delivery', $4, $5)
    `, [`COGS - Orden ${order.order_number}`, cogsAccount, costAmount, order.id, req.user.id]);
    
    await client.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, source_id, created_by)
      VALUES (CURRENT_DATE, $1, $2, 0, $3, 'order_delivery', $4, $5)
    `, [`COGS - Orden ${order.order_number}`, inventoryAccount, costAmount, order.id, req.user.id]);
    
    await client.query('COMMIT');
    
    console.log(`✅ Order ${id} delivered with ${confirmations.length} confirmation(s). Delivered: ${totalDelivered}, Collected: ${totalCollected}`);
    res.json({ 
      message: "Delivery confirmed successfully",
      totalDelivered,
      totalCollected,
      confirmationsCount: confirmations.length
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error confirming delivery:", err);
    res.status(500).json({ message: "Error confirming delivery", error: err.message });
  } finally {
    client.release();
  }
});

// Get delivery confirmations for an order
app.get("/orders/:id/confirmations", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT dc.*, cd.name as department_name, u.name as confirmed_by_name
      FROM delivery_confirmations dc
      LEFT JOIN customer_departments cd ON dc.department_id = cd.id
      LEFT JOIN users u ON dc.confirmed_by = u.id
      WHERE dc.order_id = $1
      ORDER BY dc.confirmed_at
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching confirmations:", err);
    res.status(500).json({ message: "Error fetching confirmations" });
  }
});

// Generate delivery receipt (printable format)
app.get("/orders/:id/receipt", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get order with customer details
    const orderResult = await pool.query(`
      SELECT o.*, c.first_name, c.last_name, c.phone, c.address, c.rfc, c.razon_social
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `, [id]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Get order items
    const itemsResult = await pool.query(`
      SELECT * FROM order_items WHERE order_id = $1
    `, [id]);
    
    // Get delivery confirmations
    const confirmationsResult = await pool.query(`
      SELECT dc.*, cd.name as department_name
      FROM delivery_confirmations dc
      LEFT JOIN customer_departments cd ON dc.department_id = cd.id
      WHERE dc.order_id = $1
    `, [id]);
    
    res.json({
      order: orderResult.rows[0],
      items: itemsResult.rows,
      confirmations: confirmationsResult.rows
    });
  } catch (err) {
    console.error("Error generating receipt:", err);
    res.status(500).json({ message: "Error generating receipt" });
  }
});

// ==============================================================================
// TANK RETURNS/COLLECTION API
// ==============================================================================

// Get pending tank returns for a customer
app.get("/customers/:customer_id/pending-returns", authenticateToken, async (req, res) => {
  try {
    const { customer_id } = req.params;
    
    // Get tanks currently at customer's location
    const result = await pool.query(`
      SELECT 
        cd.id as department_id,
        cd.name as department_name,
        cd.tanks_on_site,
        cd.contact_person,
        cd.contact_phone,
        cd.delivery_address
      FROM customer_departments cd
      WHERE cd.customer_id = $1 AND cd.is_active = true AND cd.tanks_on_site > 0
      ORDER BY cd.name
    `, [customer_id]);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching pending returns:", err);
    res.status(500).json({ message: "Error fetching pending returns" });
  }
});

// Get all pending tank collections
app.get("/tank-returns/pending", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id as customer_id,
        c.first_name || ' ' || c.last_name as customer_name,
        c.phone as customer_phone,
        c.address as customer_address,
        COALESCE(SUM(cd.tanks_on_site), 0) as total_tanks_on_site,
        COUNT(cd.id) as departments_count
      FROM customers c
      LEFT JOIN customer_departments cd ON c.id = cd.customer_id AND cd.is_active = true
      WHERE cd.tanks_on_site > 0
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.address
      HAVING COALESCE(SUM(cd.tanks_on_site), 0) > 0
      ORDER BY total_tanks_on_site DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching pending returns:", err);
    res.status(500).json({ message: "Error fetching pending returns" });
  }
});

// Schedule tank collection
app.post("/tank-returns/schedule", authenticateToken, async (req, res) => {
  try {
    const { customer_id, department_id, scheduled_date, notes } = req.body;
    
    const result = await pool.query(`
      INSERT INTO tank_returns (customer_id, department_id, status, scheduled_date, notes)
      VALUES ($1, $2, 'scheduled', $3, $4)
      RETURNING *
    `, [customer_id, department_id, scheduled_date, notes]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error scheduling collection:", err);
    res.status(500).json({ message: "Error scheduling collection" });
  }
});

// ==============================================================================
// CUSTOMER PORTAL API
// ==============================================================================

// Get customer dashboard data
app.get("/customer/dashboard", authenticateCustomer, async (req, res) => {
  try {
    const customerId = req.customer.id;
    const customerAccount = `1103-${customerId.toString().padStart(4, '0')}`;
    
    // Get current balance
    const balanceResult = await pool.query(`
      SELECT COALESCE(SUM(debit) - SUM(credit), 0) as balance
      FROM journal_entries WHERE account_code = $1
    `, [customerAccount]);
    
    // Get recent orders
    const ordersResult = await pool.query(`
      SELECT * FROM orders 
      WHERE customer_id = $1 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [customerId]);
    
    // Get pending orders count
    const pendingResult = await pool.query(`
      SELECT COUNT(*) as count FROM orders
      WHERE customer_id = $1 AND payment_status = 'pending'
    `, [customerId]);
    
    res.json({
      balance: parseFloat(balanceResult.rows[0].balance || 0),
      recent_orders: ordersResult.rows,
      pending_orders: parseInt(pendingResult.rows[0].count || 0)
    });
  } catch (err) {
    console.error("Error fetching customer dashboard:", err);
    res.status(500).json({ message: "Error fetching dashboard data" });
  }
});

// Get customer's orders
app.get("/customer/orders", authenticateCustomer, async (req, res) => {
  try {
    const customerId = req.customer.id;
    
    const result = await pool.query(`
      SELECT * FROM orders 
      WHERE customer_id = $1 
      ORDER BY created_at DESC
    `, [customerId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching customer orders:", err);
    res.status(500).json({ message: "Error fetching orders" });
  }
});

// Get customer statement
app.get("/customer/statement", authenticateCustomer, async (req, res) => {
  try {
    const customerId = req.customer.id;
    const customerAccount = `1103-${customerId.toString().padStart(4, '0')}`;
    
    // Get current balance
    const balanceResult = await pool.query(`
      SELECT COALESCE(SUM(debit) - SUM(credit), 0) as balance
      FROM journal_entries WHERE account_code = $1
    `, [customerAccount]);
    
    // Get all transactions
    const transactionsResult = await pool.query(`
      SELECT 
        date,
        description,
        reference,
        debit,
        credit,
        balance
      FROM journal_entries 
      WHERE account_code = $1 
      ORDER BY date DESC, id DESC
      LIMIT 100
    `, [customerAccount]);
    
    // Get overdue amount (simplified - you may want to calculate this differently)
    const overdueResult = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) as overdue_amount
      FROM orders 
      WHERE customer_id = $1 
      AND payment_status = 'pending'
      AND created_at < CURRENT_DATE - INTERVAL '30 days'
    `, [customerId]);
    
    res.json({
      balance: parseFloat(balanceResult.rows[0].balance || 0),
      transactions: transactionsResult.rows,
      overdue_amount: parseFloat(overdueResult.rows[0].overdue_amount || 0)
    });
  } catch (err) {
    console.error("Error fetching customer statement:", err);
    res.status(500).json({ message: "Error fetching statement" });
  }
});

// Customer places new order
app.post("/customer/place-order", authenticateCustomer, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const customerId = req.customer.id;
    const { 
      tank_type, 
      quantity, 
      delivery_address, 
      delivery_instructions, 
      scheduled_delivery,
      payment_method,
      notes
    } = req.body;
    
    // Get customer info
    const customerResult = await client.query('SELECT * FROM customers WHERE id = $1', [customerId]);
    const customer = customerResult.rows[0];
    
    // Get tank type details to calculate price
    const tankTypeResult = await client.query(`
      SELECT * FROM tank_types WHERE name = $1
    `, [tank_type]);
    
    if (tankTypeResult.rows.length === 0) {
      throw new Error('Tank type not found');
    }
    
    const tankTypeData = tankTypeResult.rows[0];
    const unit_price = tankTypeData.deposit_amount;
    const total_amount = quantity * unit_price;
    
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Use provided delivery address or customer's default
    const finalDeliveryAddress = delivery_address || customer.address;
    
    // Create order
    const orderResult = await client.query(`
      INSERT INTO orders (
        order_number, customer_id, store_id, total_amount, payment_method,
        delivery_address, delivery_instructions, scheduled_delivery, notes,
        created_by, status, payment_status
      ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, 'pending', 'pending')
      RETURNING *
    `, [
      orderNumber, 
      customerId, 
      total_amount, 
      payment_method || 'cash',
      finalDeliveryAddress, 
      delivery_instructions, 
      scheduled_delivery || null,
      notes,
      customerId
    ]);
    
    const order = orderResult.rows[0];
    
    // Create order item
    await client.query(`
      INSERT INTO order_items (order_id, tank_type, quantity, unit_price, total_price, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
    `, [order.id, tank_type, quantity, unit_price, total_amount]);
    
    await client.query('COMMIT');
    
    console.log(`✅ Customer order placed: ${orderNumber}`);
    res.json({ message: "Pedido creado exitosamente", order });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error creating customer order:", err);
    res.status(500).json({ message: "Error creating order", error: err.message });
  } finally {
    client.release();
  }
});

// ==============================================================================
// ACCOUNTS RECEIVABLE & CUSTOMER PAYMENTS
// ==============================================================================

// Get customer account statement
app.get("/customers/:customer_id/account-statement", authenticateToken, async (req, res) => {
  try {
    const { customer_id } = req.params;
    const { start_date, end_date } = req.query;
    
    // Get customer info
    const customerResult = await pool.query(`
      SELECT id, first_name, last_name, phone, email, address
      FROM customers WHERE id = $1
    `, [customer_id]);
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    const customer = customerResult.rows[0];
    const customerAccount = `1103-${customer_id.toString().padStart(4, '0')}`;
    
    // Get all transactions (sales and payments)
    let query = `
      SELECT 
        date,
        description,
        debit as charges,
        credit as payments,
        source_type,
        source_id
      FROM journal_entries
      WHERE account_code = $1
    `;
    
    const params = [customerAccount];
    let paramCount = 1;
    
    if (start_date) {
      paramCount++;
      query += ` AND date >= $${paramCount}`;
      params.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      query += ` AND date <= $${paramCount}`;
      params.push(end_date);
    }
    
    query += ` ORDER BY date DESC, id DESC`;
    
    const transactions = await pool.query(query, params);
    
    // Calculate running balance
    let balance = 0;
    const transactionsWithBalance = transactions.rows.map(t => {
      balance += (parseFloat(t.charges) - parseFloat(t.payments));
      return { ...t, balance };
    }).reverse();
    
    // Get current balance
    const balanceResult = await pool.query(`
      SELECT 
        COALESCE(SUM(debit) - SUM(credit), 0) as current_balance
      FROM journal_entries
      WHERE account_code = $1
    `, [customerAccount]);
    
    res.json({
      customer,
      transactions: transactionsWithBalance,
      current_balance: parseFloat(balanceResult.rows[0].current_balance || 0)
    });
  } catch (err) {
    console.error("Error fetching customer account statement:", err);
    res.status(500).json({ message: "Error fetching account statement" });
  }
});

// Get overdue accounts report
app.get("/accounts-receivable/overdue", authenticateToken, async (req, res) => {
  try {
    const overdueAccounts = await pool.query(`
      WITH customer_balances AS (
        SELECT 
          c.id as customer_id,
          c.first_name || ' ' || c.last_name as customer_name,
          c.phone,
          ('1103-' || LPAD(c.id::text, 4, '0')) as account_code,
          COALESCE(SUM(je.debit) - SUM(je.credit), 0) as balance
        FROM customers c
        LEFT JOIN journal_entries je ON je.account_code = ('1103-' || LPAD(c.id::text, 4, '0'))
        GROUP BY c.id, c.first_name, c.last_name, c.phone
        HAVING COALESCE(SUM(je.debit) - SUM(je.credit), 0) > 0
      ),
      order_details AS (
        SELECT 
          customer_id,
          MAX(delivered_at) as last_delivery,
          COUNT(*) as total_orders,
          SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END) as pending_amount
        FROM orders
        WHERE status = 'delivered'
        GROUP BY customer_id
      )
      SELECT 
        cb.*,
        od.last_delivery,
        od.total_orders,
        CASE 
          WHEN od.last_delivery IS NULL THEN 0
          WHEN CURRENT_DATE - od.last_delivery::date <= 30 THEN 0
          WHEN CURRENT_DATE - od.last_delivery::date <= 60 THEN 30
          WHEN CURRENT_DATE - od.last_delivery::date <= 90 THEN 60
          ELSE 90
        END as days_overdue_bucket
      FROM customer_balances cb
      LEFT JOIN order_details od ON cb.customer_id = od.customer_id
      WHERE cb.balance > 0
      ORDER BY cb.balance DESC
    `);
    
    res.json(overdueAccounts.rows);
  } catch (err) {
    console.error("Error fetching overdue accounts:", err);
    res.status(500).json({ message: "Error fetching overdue accounts" });
  }
});

// Get AR aging report
app.get("/accounts-receivable/aging", authenticateToken, async (req, res) => {
  try {
    const aging = await pool.query(`
      WITH customer_balances AS (
        SELECT 
          c.id,
          c.first_name || ' ' || c.last_name as customer_name,
          ('1103-' || LPAD(c.id::text, 4, '0')) as account_code,
          COALESCE(SUM(je.debit) - SUM(je.credit), 0) as balance,
          MAX(o.delivered_at) as last_transaction_date
        FROM customers c
        LEFT JOIN journal_entries je ON je.account_code = ('1103-' || LPAD(c.id::text, 4, '0'))
        LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'delivered'
        GROUP BY c.id, c.first_name, c.last_name
        HAVING COALESCE(SUM(je.debit) - SUM(je.credit), 0) > 0
      )
      SELECT 
        customer_name,
        balance,
        CASE 
          WHEN last_transaction_date IS NULL THEN balance
          WHEN CURRENT_DATE - last_transaction_date::date <= 30 THEN balance
          ELSE 0
        END as current_0_30,
        CASE 
          WHEN CURRENT_DATE - last_transaction_date::date BETWEEN 31 AND 60 THEN balance
          ELSE 0
        END as days_31_60,
        CASE 
          WHEN CURRENT_DATE - last_transaction_date::date BETWEEN 61 AND 90 THEN balance
          ELSE 0
        END as days_61_90,
        CASE 
          WHEN CURRENT_DATE - last_transaction_date::date > 90 THEN balance
          ELSE 0
        END as days_over_90
      FROM customer_balances
      ORDER BY balance DESC
    `);
    
    const summary = {
      total_ar: aging.rows.reduce((sum, row) => sum + parseFloat(row.balance || 0), 0),
      current: aging.rows.reduce((sum, row) => sum + parseFloat(row.current_0_30 || 0), 0),
      days_31_60: aging.rows.reduce((sum, row) => sum + parseFloat(row.days_31_60 || 0), 0),
      days_61_90: aging.rows.reduce((sum, row) => sum + parseFloat(row.days_61_90 || 0), 0),
      over_90: aging.rows.reduce((sum, row) => sum + parseFloat(row.days_over_90 || 0), 0),
      customers: aging.rows
    };
    
    res.json(summary);
  } catch (err) {
    console.error("Error fetching AR aging:", err);
    res.status(500).json({ message: "Error fetching AR aging" });
  }
});

// ==============================================================================
// INVENTORY VALUATION & REPORTING
// ==============================================================================

// Get inventory valuation by category
app.get("/inventory/valuation", authenticateToken, async (req, res) => {
  try {
    const valuation = await pool.query(`
      WITH inventory_summary AS (
        SELECT 
          category,
          to_location as location,
          SUM(quantity) as total_quantity,
          AVG(unit_cost) as avg_unit_cost,
          SUM(total_cost) as total_value
        FROM inventory_movements
        WHERE movement_type IN ('purchase', 'transfer')
        GROUP BY category, to_location
      ),
      garrafon_valuation AS (
        SELECT 
          'Garrafones ' || status as category,
          'garrafones' as location,
          COUNT(*) as total_quantity,
          AVG(unit_cost) as avg_unit_cost,
          SUM(unit_cost) as total_value
        FROM water_tanks
        WHERE status IN ('available', 'in_circulation', 'assigned')
        GROUP BY status
      ),
      water_valuation AS (
        SELECT 
          'Agua en Tanques Principales' as category,
          'main_tanks' as location,
          SUM(current_liters) as total_quantity,
          AVG(unit_cost_per_liter) as avg_unit_cost,
          SUM(current_liters * unit_cost_per_liter) as total_value
        FROM water_storage
        GROUP BY location
      )
      SELECT * FROM inventory_summary
      UNION ALL
      SELECT * FROM garrafon_valuation
      UNION ALL
      SELECT * FROM water_valuation
      ORDER BY total_value DESC
    `);
    
    const totalValue = valuation.rows.reduce((sum, row) => sum + parseFloat(row.total_value || 0), 0);
    
    res.json({
      items: valuation.rows,
      total_inventory_value: totalValue
    });
  } catch (err) {
    console.error("Error calculating inventory valuation:", err);
    res.status(500).json({ message: "Error calculating inventory valuation" });
  }
});

// Migrate tank statuses to new Spanish names (ONE-TIME)
app.post("/water-tanks/migrate-statuses", authenticateToken, async (req, res) => {
  try {
    const updates = await pool.query(`
      UPDATE water_tanks
      SET status = CASE
        WHEN status = 'available' THEN 'disponible'
        WHEN status = 'filling' THEN 'llenando'
        WHEN status = 'filled_ready_to_ship' THEN 'listo_para_entrega'
        WHEN status = 'in_circulation' THEN 'llenando'
        WHEN status = 'in_transit' THEN 'en_ruta'
        WHEN status = 'delivered' THEN 'entregado'
        WHEN status = 'assigned' THEN 'entregado'
        WHEN status = 'maintenance' THEN 'mantenimiento'
        WHEN status = 'damaged' THEN 'dañado'
        WHEN status = 'cleaning' THEN 'limpieza'
        ELSE status
      END
      WHERE status IN ('available', 'filling', 'filled_ready_to_ship', 'in_circulation', 'in_transit', 'delivered', 'assigned', 'maintenance', 'damaged', 'cleaning')
      RETURNING tank_id, status
    `);
    
    console.log(`✅ Migrated ${updates.rows.length} tank statuses to Spanish`);
    res.json({
      message: "Tank statuses migrated successfully",
      updated_count: updates.rows.length,
      tanks: updates.rows
    });
  } catch (err) {
    console.error("Error migrating tank statuses:", err);
    res.status(500).json({ message: "Error migrating statuses", error: err.message });
  }
});

// POST opening balances for existing inventory (ONE-TIME MIGRATION)
app.post("/inventory/post-opening-balances", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get existing garrafones
    const garrafones = await client.query(`
      SELECT COUNT(*) as count, SUM(unit_cost) as total_value
      FROM water_tanks
      WHERE unit_cost > 0
    `);
    
    const garrafonValue = parseFloat(garrafones.rows[0].total_value || 0);
    const garrafonCount = parseInt(garrafones.rows[0].count || 0);
    
    // Get existing water in storage
    const water = await client.query(`
      SELECT SUM(current_liters * unit_cost_per_liter) as total_value, SUM(current_liters) as total_liters
      FROM water_storage
      WHERE current_liters > 0
    `);
    
    const waterValue = parseFloat(water.rows[0].total_value || 0);
    const waterLiters = parseFloat(water.rows[0].total_liters || 0);
    
    const totalInventoryValue = garrafonValue + waterValue;
    
    if (totalInventoryValue === 0) {
      return res.json({ message: "No inventory to post", totalValue: 0 });
    }
    
    // Create opening balance journal entries
    const inventoryAccount = '1104'; // Almacén/Garrafones
    const waterAccount = '1105'; // Agua en Tanques
    const capitalAccount = '3000'; // Utilidades Retenidas (Retained Earnings)
    
    // Debit: Inventory Assets (Garrafones)
    if (garrafonValue > 0) {
      const garrafonEntry = await client.query(`
        INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, created_by)
        VALUES (CURRENT_DATE, $1, $2, $3, 0, 'opening_balance', $4)
        RETURNING id
      `, [`Saldo inicial - ${garrafonCount} garrafones`, inventoryAccount, garrafonValue, req.user.id]);
      
      // Record movement
      await client.query(`
        INSERT INTO inventory_movements (
          movement_type, category, item_description, quantity, total_cost,
          to_location, account_code, journal_entry_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        'opening_balance', 'garrafones', `Saldo inicial - ${garrafonCount} garrafones`,
        garrafonCount, garrafonValue, 'warehouse', inventoryAccount, garrafonEntry.rows[0].id, req.user.id
      ]);
    }
    
    // Debit: Water Inventory (Main Tanks)
    if (waterValue > 0) {
      const waterEntry = await client.query(`
        INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, created_by)
        VALUES (CURRENT_DATE, $1, $2, $3, 0, 'opening_balance', $4)
        RETURNING id
      `, [`Saldo inicial - ${waterLiters}L agua`, waterAccount, waterValue, req.user.id]);
      
      // Record movement
      await client.query(`
        INSERT INTO inventory_movements (
          movement_type, category, item_description, quantity, unit_cost, total_cost,
          to_location, account_code, journal_entry_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        'opening_balance', 'water_raw', `Saldo inicial - ${waterLiters}L`,
        waterLiters, waterValue / waterLiters, waterValue, 'main_tank',
        waterAccount, waterEntry.rows[0].id, req.user.id
      ]);
    }
    
    // Credit: Capital/Retained Earnings (balancing entry)
    await client.query(`
      INSERT INTO journal_entries (date, description, account_code, debit, credit, source_type, created_by)
      VALUES (CURRENT_DATE, $1, $2, 0, $3, 'opening_balance', $4)
    `, [`Saldo inicial - Inventario`, capitalAccount, totalInventoryValue, req.user.id]);
    
    await client.query('COMMIT');
    
    console.log(`✅ Opening balances posted: Garrafones $${garrafonValue}, Water $${waterValue}, Total $${totalInventoryValue}`);
    res.json({
      message: "Opening balances posted successfully",
      garrafones: { count: garrafonCount, value: garrafonValue },
      water: { liters: waterLiters, value: waterValue },
      total_value: totalInventoryValue
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error posting opening balances:", err);
    res.status(500).json({ message: "Error posting opening balances", error: err.message });
  } finally {
    client.release();
  }
});

// Get inventory movements history
app.get("/inventory/movements", authenticateToken, async (req, res) => {
  try {
    const { category, movement_type, start_date, end_date, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        im.*,
        je.debit,
        je.credit,
        c.name as account_name
      FROM inventory_movements im
      LEFT JOIN journal_entries je ON im.journal_entry_id = je.id
      LEFT JOIN chart_of_accounts c ON im.account_code = c.code
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (category) {
      paramCount++;
      query += ` AND im.category = $${paramCount}`;
      params.push(category);
    }
    
    if (movement_type) {
      paramCount++;
      query += ` AND im.movement_type = $${paramCount}`;
      params.push(movement_type);
    }
    
    if (start_date) {
      paramCount++;
      query += ` AND im.created_at >= $${paramCount}`;
      params.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      query += ` AND im.created_at <= $${paramCount}`;
      params.push(end_date);
    }
    
    paramCount++;
    query += ` ORDER BY im.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching inventory movements:", err);
    res.status(500).json({ message: "Error fetching inventory movements" });
  }
});

// ==============================================================================
// START SERVER
// ==============================================================================

// Start the server after all routes are registered
start();