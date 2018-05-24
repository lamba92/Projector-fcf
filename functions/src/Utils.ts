export function encodeEmail(s: string): string{
    return encodeURIComponent(s).replace('.', '%2E');
}