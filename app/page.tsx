import { verifySession } from '@/lib/licensing';
import Activate from './activate';
import Studio from './studio';
export const dynamic = 'force-dynamic';
export default async function Home() { return await verifySession() ? <Studio/> : <Activate/>; }
