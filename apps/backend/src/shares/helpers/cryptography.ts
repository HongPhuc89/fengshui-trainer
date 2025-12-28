import bcrypt from 'bcrypt';
import crypto from 'crypto';

export async function hashString(data: string): Promise<string> {
  const salt = await bcrypt.genSalt();
  return bcrypt.hash(data, salt);
}

export async function isHashEqual(data: string, hash: string): Promise<boolean> {
  return bcrypt.compare(data, hash);
}

export function hashStringSHA(data: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(data).digest('hex');
}
