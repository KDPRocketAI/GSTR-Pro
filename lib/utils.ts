import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    }).format(amount);
}

export function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function validateGSTIN(gstin: string): boolean {
    if (!gstin || gstin.length !== 15) return false;
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(gstin)) return false;

    // Checksum validation
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const values = gstin.split('').map((c) => {
        const idx = chars.indexOf(c.toUpperCase());
        return idx === -1 ? parseInt(c, 10) : idx;
    });

    let sum = 0;
    for (let i = 0; i < 14; i++) {
        let val = values[i];
        if (i % 2 !== 0) val *= 2;
        sum += Math.floor(val / 36) + (val % 36);
    }
    const checkDigit = (36 - (sum % 36)) % 36;
    return chars[checkDigit] === gstin[14];
}

export function generateId(): string {
    return crypto.randomUUID();
}

export function getStateFromGSTIN(gstin: string): string {
    return gstin.substring(0, 2);
}
