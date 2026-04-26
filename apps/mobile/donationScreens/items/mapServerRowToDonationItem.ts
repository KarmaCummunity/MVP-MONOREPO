import type { DonationItem } from './itemsScreen.types';

/** Maps dedicated-items API/SQLite row to DonationItem. */
export function mapServerRowToDonationItem(item: Record<string, unknown>): DonationItem {
  const loc = item.location && typeof item.location === 'object' ? (item.location as Record<string, string>) : null;
  return {
    id: String(item.id),
    ownerId: String(item.owner_id ?? item.ownerId ?? ''),
    title: String(item.title ?? ''),
    description: item.description as string | undefined,
    category: item.category as DonationItem['category'],
    condition: item.condition as DonationItem['condition'],
    city: (item.city as string) || loc?.city || undefined,
    address: (item.address as string) || loc?.address || undefined,
    coordinates: (item.coordinates as string) || undefined,
    price: item.price as number | undefined,
    image_base64: item.image_base64 as string | undefined,
    rating: item.rating as number | undefined,
    timestamp: String(item.created_at ?? item.timestamp ?? ''),
    tags: item.tags as string | undefined,
    qty: (item.quantity ?? item.qty) as number | undefined,
    delivery_method: item.delivery_method as string | undefined,
    status: item.status as string | undefined,
    isDeleted: Boolean(item.is_deleted || item.isDeleted),
    deletedAt: (item.deleted_at ?? item.deletedAt) as string | undefined,
  };
}
