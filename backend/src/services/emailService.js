const nodemailer = require('nodemailer');
const env = require('../config/env');

// Check if email is configured
const isEmailConfigured = () => {
  return (
    env.email.host &&
    env.email.host !== 'smtp.example.com' &&
    env.email.user &&
    env.email.user !== 'no-reply@example.com' &&
    env.email.pass &&
    env.email.pass !== 'password'
  );
};

const queueEmail = async ({ to, subject, html }) => {
  // Skip email if not configured
  if (!isEmailConfigured()) {
    console.warn('⚠️  Email not configured. Skipping email sending.');
    return;
  }

  if (!to) {
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: env.email.secure,
      auth: {
        user: env.email.user,
        pass: env.email.pass,
      },
    });

    await transporter.sendMail({
      from: `Ethio Tech Hub <${env.email.user}>`,
      to,
      subject,
      html,
    });

    console.log(`✉️  Email sent to ${to}`);
  } catch (error) {
    // Log error but don't throw - email failure shouldn't break the app
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    
    // Provide helpful error messages
    if (error.code === 'EHOSTUNREACH' || error.code === 'ENOTFOUND') {
      console.error('   → Check your EMAIL_HOST and network connection.');
    } else if (error.responseCode === 535) {
      console.error('   → Authentication failed. Check EMAIL_USER and EMAIL_PASS.');
    }
  }
};

module.exports = {
  queueEmail,
};


