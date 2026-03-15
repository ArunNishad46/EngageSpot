const { transactionalEmailsApi, SibApiV3Sdk } = require('../config/brevo');

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.textContent = text || html.replace(/<[^>]*>/g, '');
    sendSmtpEmail.sender = {
      name: process.env.EMAIL_FROM_NAME,
      email: process.env.EMAIL_FROM
    };
    sendSmtpEmail.to = [{ email: to }];
    
    const result = await transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
    
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send email');
  }
};

const sendOTPEmail = async (email, otp, type = '2fa') => {
  const subjects = {
    '2fa': 'Your Two-Factor Authentication Code',
    'verify': 'Verify Your Email Address',
    'reset': 'Password Reset Code'
  };
  
  const titles = {
    '2fa': 'Two-Factor Authentication',
    'verify': 'Email Verification',
    'reset': 'Password Reset'
  };
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${titles[type]}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">EngageSpot</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1f2937; margin-top: 0;">${titles[type]}</h2>
        
        <p style="color: #4b5563; margin-bottom: 25px;">
          ${type === '2fa' ? 'Your two-factor authentication code is:' : 
            type === 'verify' ? 'Your email verification code is:' : 
            'Your password reset code is:'}
        </p>
        
        <div style="background: #fff; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 25px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea;">${otp}</span>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
          This code will expire in ${type === 'reset' ? '15' : '10'} minutes.
        </p>
        
        <p style="color: #6b7280; font-size: 14px;">
          If you didn't request this code, please ignore this email or contact support if you have concerns.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          This is an automated message from EngageSpot. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: email,
    subject: subjects[type],
    html
  });
};

const sendWelcomeEmail = async (email, name) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to EngageSpot</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0 0 10px 0; font-size: 28px;">EngageSpot</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Welcome aboard! 🎉</p>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1f2937; margin-top: 0;">Hi ${name || 'there'}! 👋</h2>
        
        <p style="color: #4b5563; font-size: 16px;">
          Thank you for joining <strong>EngageSpot</strong>! We're thrilled to have you on board.
        </p>
        
        <p style="color: #4b5563; font-size: 15px;">
          Your account has been successfully created. Here's what you can do next:
        </p>
        
        <div style="margin: 25px 0;">
          <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
            <div style="background: #667eea; color: white; border-radius: 50%; width: 28px; height: 28px; text-align: center; line-height: 28px; font-size: 14px; font-weight: bold; margin-right: 12px; flex-shrink: 0;">1</div>
            <div>
              <strong style="color: #1f2937;">Complete Your Profile</strong>
              <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">Add your details to personalize your experience.</p>
            </div>
          </div>
          
          <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
            <div style="background: #667eea; color: white; border-radius: 50%; width: 28px; height: 28px; text-align: center; line-height: 28px; font-size: 14px; font-weight: bold; margin-right: 12px; flex-shrink: 0;">2</div>
            <div>
              <strong style="color: #1f2937;">Enable Two-Factor Authentication</strong>
              <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">Secure your account with an extra layer of protection.</p>
            </div>
          </div>
          
          <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
            <div style="background: #667eea; color: white; border-radius: 50%; width: 28px; height: 28px; text-align: center; line-height: 28px; font-size: 14px; font-weight: bold; margin-right: 12px; flex-shrink: 0;">3</div>
            <div>
              <strong style="color: #1f2937;">Explore the Dashboard</strong>
              <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">Discover all the features available to you.</p>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
            Get Started
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          If you have any questions, feel free to reach out to our support team. We're here to help!
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          This is an automated message from EngageSpot. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to EngageSpot! 🎉',
    html
  });
};

module.exports = { sendEmail, sendOTPEmail, sendWelcomeEmail };