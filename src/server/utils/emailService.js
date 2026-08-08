const nodemailer = require('nodemailer');

const sendRealOtpEmail = async (toEmail, otpCode) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.log(`[EMAIL NOTICE] EMAIL_USER or EMAIL_PASS not configured in .env. Generated OTP "${otpCode}" for ${toEmail}.`);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    const mailOptions = {
      from: `"Enterprise Carpool Security" <${emailUser}>`,
      to: toEmail,
      subject: `🔒 ${otpCode} is your Carpool Account Verification Code`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; background: #FAF7F2; padding: 30px; border-radius: 16px; border: 1px solid #E8E1D3;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="display: inline-block; background: #053B22; color: #58D68D; padding: 12px 18px; border-radius: 14px; font-weight: 800; font-size: 1.2rem;">
              🚗 Enterprise Carpool
            </div>
          </div>
          <h2 style="color: #11281A; font-size: 1.4rem; text-align: center; margin-bottom: 8px;">Verify Your Email Address</h2>
          <p style="color: #5D7063; font-size: 0.9rem; text-align: center; line-height: 1.5; margin-bottom: 24px;">
            Thank you for registering on Enterprise Carpool. Use the 6-digit verification code below to complete your account creation.
          </p>
          <div style="background: #FFFFFF; border: 2px solid #0D6E42; border-radius: 14px; padding: 18px; text-align: center; margin-bottom: 24px; box-shadow: 0 4px 15px rgba(13, 110, 66, 0.1);">
            <div style="font-size: 0.8rem; color: #5D7063; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; font-weight: 700;">Verification Code</div>
            <div style="font-size: 2.2rem; font-weight: 800; color: #0D6E42; letter-spacing: 8px;">${otpCode}</div>
            <div style="font-size: 0.75rem; color: #8E9F93; margin-top: 6px;">Expires in 5 minutes</div>
          </div>
          <p style="color: #8E9F93; font-size: 0.78rem; text-align: center; line-height: 1.4;">
            If you did not request this email, please ignore it. Your account security is protected.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SUCCESS] Real Gmail OTP "${otpCode}" delivered to: ${toEmail}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send Gmail OTP to ${toEmail}:`, err.message);
    return false;
  }
};

module.exports = { sendRealOtpEmail };
