import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const clientId = process.env.YANDEX_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json({ error: 'Яндекс OAuth не настроен' }, { status: 500 });
  }

  const redirectUri =
    process.env.YANDEX_REDIRECT_URI ?? `${new URL(request.url).origin}/api/auth/yandex/callback`;

  const url = new URL('https://oauth.yandex.ru/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);

  return NextResponse.redirect(url);
}
