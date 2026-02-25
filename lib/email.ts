import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM || 'Hotel System'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@caresupply.sa'}>`,
      to,
      subject,
      html,
    })
    return true
  } catch (error) {
    console.error('Email sending failed:', error)
    return false
  }
}

export function getVerificationEmailHtml(name: string, verifyUrl: string, lang: string = 'ar'): string {
  const isAr = lang === 'ar'
  return `
<!DOCTYPE html>
<html dir="${isAr ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Inter', 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; color: #1f2937; }
    .wrapper { padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; border-top: 4px solid #2563eb; }
    .header { padding: 30px; text-align: center; border-bottom: 1px solid #f3f4f6; }
    .header h1 { margin: 0; color: #111827; font-size: 24px; font-weight: 600; }
    .content { padding: 40px 30px; line-height: 1.6; }
    .content p { margin: 0 0 16px; color: #4b5563; }
    .btn-container { text-align: center; margin: 30px 0; }
    .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; }
    .footer { padding: 20px 30px; text-align: center; background-color: #f9fafb; color: #6b7280; font-size: 13px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body dir="${isAr ? 'rtl' : 'ltr'}" style="direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'};">
  <div class="wrapper" dir="${isAr ? 'rtl' : 'ltr'}">
    <div class="container" style="text-align: ${isAr ? 'right' : 'left'};">
      <div class="header">
        <h1>${isAr ? 'نظام إدارة الخدمات الفندقية' : 'Hotel Services Management System'}</h1>
      </div>
      <div class="content">
        <h2 style="color: #111827; font-size: 20px; margin-top: 0; margin-bottom: 24px;">${isAr ? 'تأكيد حسابك' : 'Verify Your Account'}</h2>
        <p>${isAr ? `مرحباً <strong>${name}</strong>،` : `Hello <strong>${name}</strong>,`}</p>
        <p>${isAr ? 'شكراً لانضمامك واستخدام نظامنا. يرجى النقر على الزر أدناه لتأكيد عنوان بريدك الإلكتروني والبدء في إدارة فندقك:' : 'Thank you for joining our system. Please click the button below to verify your email address and start managing your hotel:'}</p>
        <div class="btn-container">
          <a href="${verifyUrl}" class="button">${isAr ? 'تأكيد الحساب' : 'Verify Account'}</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">${isAr ? 'ملاحظة: هذا الرابط صالح لمدة 24 ساعة فقط.' : 'Note: This link is valid for 24 hours only.'}</p>
        <p style="font-size: 14px; color: #6b7280;">${isAr ? 'إذا لم تقم بإنشاء هذا الحساب، يمكنك تجاهل هذه الرسالة بأمان.' : 'If you did not create this account, you can safely ignore this email.'}</p>
      </div>
      <div class="footer" style="text-align: center;">
        <p>&copy; ${new Date().getFullYear()} ${isAr ? 'نظام إدارة الخدمات الفندقية. جميع الحقوق محفوظة.' : 'Hotel Services Management System. All rights reserved.'}</p>
      </div>
    </div>
  </div>
</body>
</html>`
}

export function getPasswordResetEmailHtml(name: string, resetUrl: string, lang: string = 'ar'): string {
  const isAr = lang === 'ar'
  return `
<!DOCTYPE html>
<html dir="${isAr ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Inter', 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; color: #1f2937; }
    .wrapper { padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; border-top: 4px solid #2563eb; }
    .header { padding: 30px; text-align: center; border-bottom: 1px solid #f3f4f6; }
    .header h1 { margin: 0; color: #111827; font-size: 24px; font-weight: 600; }
    .content { padding: 40px 30px; line-height: 1.6; }
    .content p { margin: 0 0 16px; color: #4b5563; }
    .btn-container { text-align: center; margin: 30px 0; }
    .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; }
    .footer { padding: 20px 30px; text-align: center; background-color: #f9fafb; color: #6b7280; font-size: 13px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body dir="${isAr ? 'rtl' : 'ltr'}" style="direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'};">
  <div class="wrapper" dir="${isAr ? 'rtl' : 'ltr'}">
    <div class="container" style="text-align: ${isAr ? 'right' : 'left'};">
      <div class="header">
        <h1>${isAr ? 'نظام إدارة الخدمات الفندقية' : 'Hotel Services Management System'}</h1>
      </div>
      <div class="content">
        <h2 style="color: #111827; font-size: 20px; margin-top: 0; margin-bottom: 24px;">${isAr ? 'إعادة تعيين كلمة المرور' : 'Password Reset Request'}</h2>
        <p>${isAr ? `مرحباً <strong>${name}</strong>،` : `Hello <strong>${name}</strong>,`}</p>
        <p>${isAr ? 'لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في النظام. يمكنك القيام بذلك عن طريق النقر على الزر أدناه:' : 'We received a request to reset your password. You can do this by clicking the button below:'}</p>
        <div class="btn-container">
          <a href="${resetUrl}" class="button">${isAr ? 'تغيير كلمة المرور' : 'Reset Password'}</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">${isAr ? 'هذا الرابط صالح لمدة ساعة واحدة فقط.' : 'This link is valid for 1 hour only.'}</p>
        <p style="font-size: 14px; color: #6b7280;">${isAr ? 'إذا لم تقم بطلب إعادة التعيين، يرجى تجاهل هذه الرسالة، وستبقى كلمة المرور الحالية بدون تغيير.' : 'If you did not request a password reset, please ignore this email and your password will remain unchanged.'}</p>
      </div>
      <div class="footer" style="text-align: center;">
        <p>&copy; ${new Date().getFullYear()} ${isAr ? 'نظام إدارة الخدمات الفندقية. جميع الحقوق محفوظة.' : 'Hotel Services Management System. All rights reserved.'}</p>
      </div>
    </div>
  </div>
</body>
</html>`
}
