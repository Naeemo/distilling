import { getMagicLinkEmailConfig } from '@/lib/auth-provider-config';

type MagicLinkEmailPayload = {
  email: string;
  url: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderMagicLinkEmail({ email, url }: MagicLinkEmailPayload) {
  const safeEmail = escapeHtml(email);
  const safeURL = escapeHtml(url);

  return {
    subject: '登录你的 InfoDigest 账户',
    text: [
      '点击下面的链接登录 InfoDigest：',
      url,
      '',
      '如果这不是你的操作，可以忽略这封邮件。',
    ].join('\n'),
    html: `
      <div style="font-family: Manrope, ui-sans-serif, system-ui, sans-serif; background: #f3efe6; padding: 32px 16px; color: #111827;">
        <div style="max-width: 560px; margin: 0 auto; background: rgba(255,255,255,0.96); border: 1px solid rgba(15,23,42,0.08); border-radius: 28px; overflow: hidden; box-shadow: 0 24px 80px rgba(15,23,42,0.12);">
          <div style="padding: 32px 32px 12px; background: linear-gradient(135deg, #f3efe6 0%, #efe8da 44%, #dbe7fb 100%);">
            <p style="margin: 0; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: #2f56d3; font-weight: 700;">InfoDigest</p>
            <h1 style="margin: 16px 0 0; font-size: 30px; line-height: 1.15; color: #111827;">继续你的信息提纯工作流</h1>
          </div>
          <div style="padding: 24px 32px 32px;">
            <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7;">
              你正在使用 <strong>${safeEmail}</strong> 登录 InfoDigest。点击下面的按钮即可完成登录，不需要密码。
            </p>
            <a href="${safeURL}" style="display: inline-block; margin-top: 8px; padding: 14px 20px; border-radius: 16px; background: #2f56d3; color: #ffffff; font-weight: 700; text-decoration: none;">
              打开登录链接
            </a>
            <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.7; color: #4b5563;">
              如果按钮无法点击，可以复制下面的链接到浏览器中打开：
            </p>
            <p style="margin: 12px 0 0; word-break: break-all; font-size: 13px; line-height: 1.7; color: #374151;">
              <a href="${safeURL}" style="color: #2f56d3; text-decoration: none;">${safeURL}</a>
            </p>
            <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.7; color: #6b7280;">
              如果这不是你的操作，可以直接忽略这封邮件。
            </p>
          </div>
        </div>
      </div>
    `,
  };
}

export async function sendMagicLinkEmail({
  email,
  url,
}: MagicLinkEmailPayload) {
  const config = getMagicLinkEmailConfig();

  if (!config.isConfigured) {
    if (config.allowConsoleFallback) {
      console.info(`[auth] Magic link for ${email}: ${url}`);
      return;
    }

    throw new Error(
      'Magic link email is not configured. Set RESEND_API_KEY and AUTH_EMAIL_FROM.',
    );
  }

  const emailContent = renderMagicLinkEmail({ email, url });
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.authEmailFrom,
      to: [email],
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to send magic link email (${response.status}): ${errorText}`,
    );
  }
}
