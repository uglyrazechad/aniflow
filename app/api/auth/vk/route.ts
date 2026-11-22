import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const clientId = process.env.VK_ID_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json({ error: 'ВКонтакте OAuth не настроен' }, { status: 500 });
  }

  const redirectUri =
    process.env.VK_ID_REDIRECT_URI ?? `${new URL(request.url).origin}/api/auth/vk/callback`;

  const url = new URL('https://oauth.vk.com/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('display', 'page');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('v', '5.131');

  return NextResponse.redirect(url);
}
