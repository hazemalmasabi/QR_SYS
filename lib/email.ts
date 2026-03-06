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

import ar from '../messages/ar.json'
import en from '../messages/en.json'
import fr from '../messages/fr.json'

const dicts: Record<string, any> = { ar, en, fr }

function getTranslations(lang: string) {
  // Fallback to english if the requested language dictionary doesn't exist
  return dicts[lang] || dicts['en']
}

export function getVerificationEmailSubject(lang: string = 'ar'): string {
  const t = getTranslations(lang).email.verify
  return t.subject
}

export function getPasswordResetEmailSubject(lang: string = 'ar'): string {
  const t = getTranslations(lang).email.reset
  return t.subject
}

export function getVerificationEmailHtml(name: string, verifyUrl: string, lang: string = 'ar'): string {
  const t = getTranslations(lang).email.verify
  const isAr = lang === 'ar' || lang === 'ur' || lang === 'fa' // basic RTL check, though ideally we'd pass dir
  // Let's use the central registry for direction if possible
  // Since email is a pure function and Node might not like importing from languages if it has client code,
  // we can use a quick robust check.
  const dir = (lang === 'ar') ? 'rtl' : 'ltr'

  return `
<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
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
<body dir="${dir}" style="direction: ${dir}; text-align: ${dir === 'rtl' ? 'right' : 'left'};">
  <div class="wrapper" dir="${dir}">
    <div class="container" style="text-align: ${dir === 'rtl' ? 'right' : 'left'};">
      <div class="header">
        <h1>${t.appName}</h1>
      </div>
      <div class="content">
        <h2 style="color: #111827; font-size: 20px; margin-top: 0; margin-bottom: 24px;">${t.title}</h2>
        <p>${t.hello.replace('{name}', name)}</p>
        <p>${t.desc}</p>
        <div class="btn-container">
          <a href="${verifyUrl}" class="button">${t.btn}</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">${t.note}</p>
        <p style="font-size: 14px; color: #6b7280;">${t.ignore}</p>
      </div>
      <div class="footer" style="text-align: center;">
        <p>&copy; ${new Date().getFullYear()} ${t.copyright}</p>
      </div>
    </div>
  </div>
</body>
</html>`
}

export function getPasswordResetEmailHtml(name: string, resetUrl: string, lang: string = 'ar'): string {
  const t = getTranslations(lang).email.reset
  const dir = (lang === 'ar') ? 'rtl' : 'ltr'

  return `
<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
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
<body dir="${dir}" style="direction: ${dir}; text-align: ${dir === 'rtl' ? 'right' : 'left'};">
  <div class="wrapper" dir="${dir}">
    <div class="container" style="text-align: ${dir === 'rtl' ? 'right' : 'left'};">
      <div class="header">
        <h1>${t.appName}</h1>
      </div>
      <div class="content">
        <h2 style="color: #111827; font-size: 20px; margin-top: 0; margin-bottom: 24px;">${t.title}</h2>
        <p>${t.hello.replace('{name}', name)}</p>
        <p>${t.desc}</p>
        <div class="btn-container">
          <a href="${resetUrl}" class="button">${t.btn}</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">${t.note}</p>
        <p style="font-size: 14px; color: #6b7280;">${t.ignore}</p>
      </div>
      <div class="footer" style="text-align: center;">
        <p>&copy; ${new Date().getFullYear()} ${t.copyright}</p>
      </div>
    </div>
  </div>
</body>
</html>`
}
