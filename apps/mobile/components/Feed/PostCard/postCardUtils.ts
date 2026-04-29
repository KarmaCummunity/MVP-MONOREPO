import type { TFunction } from 'i18next';
import type { FeedItem } from '../../../types/feed';

export function isTranslationKey(str: string | undefined | null): boolean {
    if (!str) return false;
    return (
        (str.includes('.') || str.includes(':')) &&
        (str.startsWith('post.') ||
            str.startsWith('post:') ||
            str.startsWith('donations.') ||
            str.startsWith('donations:') ||
            str.startsWith('common.') ||
            str.startsWith('common:'))
    );
}

export function normalizeTranslationKey(key: string): string {
    return key.replace(/donations:/g, 'donations.').replace(/post:/g, 'post.').replace(/common:/g, 'common.');
}

export function resolveItemDisplayTitle(item: FeedItem, t: TFunction): string {
    if (
        !item.title ||
        item.title.trim() === '' ||
        item.title === 'donations.categories.items.title' ||
        item.title === 'donations:categories.items.title'
    ) {
        return t('donations.categories.items.title');
    }
    if (item.title === 'post.noTitle') {
        return t('post.noTitle');
    }
    if (isTranslationKey(item.title)) {
        return t(normalizeTranslationKey(item.title));
    }
    return item.title;
}

/** Body line under the title for item/donation cards (Hebrew copy matches legacy cards). */
export function buildItemCardDescription(
    item: FeedItem,
    t: TFunction,
    cardKind: 'donation' | 'item',
    isDelivered: boolean
): string {
    if (!item.title && !item.description) return '';

    const titlePart =
        item.title && item.title.trim() !== ''
            ? isTranslationKey(item.title)
                ? t(normalizeTranslationKey(item.title))
                : item.title
            : '';
    const descPart = item.description && item.description.trim() !== '' ? item.description : '';

    if (isDelivered) {
        if (titlePart && descPart) {
            return `פריט ${titlePart} שנמסר - ${descPart}`;
        }
        if (titlePart) {
            return `פריט ${titlePart} שנמסר`;
        }
        return descPart;
    }

    if (cardKind === 'donation') {
        if (titlePart && descPart) {
            return `תרומה של ${titlePart} - ${descPart}`;
        }
        if (titlePart) {
            return `תרומה של ${titlePart}`;
        }
        return descPart;
    }

    if (titlePart && descPart) {
        return `בפריט ${titlePart} למסירה - ${descPart}`;
    }
    if (titlePart) {
        return `בפריט ${titlePart} למסירה`;
    }
    return descPart;
}
