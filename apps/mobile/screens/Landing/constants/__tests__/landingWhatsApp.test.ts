import {
  WHATSAPP_CONTACT,
  WHATSAPP_DEFAULT_MESSAGE,
  WHATSAPP_URL,
  buildWhatsAppDirectUrl,
} from '../index';

describe('buildWhatsAppDirectUrl', () => {
  it('returns base wa.me URL without message', () => {
    expect(buildWhatsAppDirectUrl()).toBe(`https://wa.me/${WHATSAPP_CONTACT}`);
    expect(buildWhatsAppDirectUrl('')).toBe(`https://wa.me/${WHATSAPP_CONTACT}`);
  });

  it('adds URL-encoded text query for Hebrew pre-filled message', () => {
    const url = buildWhatsAppDirectUrl(WHATSAPP_DEFAULT_MESSAGE);
    expect(url).toContain(`https://wa.me/${WHATSAPP_CONTACT}?text=`);
    expect(decodeURIComponent(url.split('text=')[1])).toBe(WHATSAPP_DEFAULT_MESSAGE);
  });

  it('WHATSAPP_URL matches build with default message', () => {
    expect(WHATSAPP_URL).toBe(buildWhatsAppDirectUrl(WHATSAPP_DEFAULT_MESSAGE));
  });
});
